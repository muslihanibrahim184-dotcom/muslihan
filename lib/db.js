import { supabase as sb } from "./supabase";

export const todayISO = () => new Date().toISOString().slice(0, 10);

// --- Rol -------------------------------------------------------------
export async function getMyRole() {
  const { data: u } = await sb.auth.getUser();
  if (!u?.user) return null;
  const { data } = await sb.from("profiles").select("*").eq("id", u.user.id).single();
  return data?.role ?? data?.rol ?? "tedarik";
}
export async function loadProfiles() {
  const { data } = await sb.from("profiles").select("*").order("created_at");
  return (data || []).map((p) => ({ ...p, role: p.role ?? p.rol }));
}
export async function setRole(id, role) {
  let r = await sb.from("profiles").update({ role }).eq("id", id);
  if (r.error) r = await sb.from("profiles").update({ rol: role }).eq("id", id);
  if (r.error) throw r.error;
}

// --- Tüm veriyi yükle (role göre erişilebilenler) --------------------
export async function loadAll() {
  const q = (t, order) => sb.from(t).select("*").order(order || "created_at", { ascending: true });
  const safe = async (p) => { try { const r = await p; return r.error ? [] : (r.data || []); } catch { return []; } };
  const [products, customers, suppliers, sales, collections, supplierMov, cash, cheques, orders] = await Promise.all([
    safe(q("products", "ad")), safe(q("customers", "ad")), safe(q("suppliers", "ad")),
    safe(q("sales", "tarih")), safe(q("collections")), safe(q("supplier_movements")),
    safe(q("cash_entries")), safe(q("cheques")), safe(q("orders", "tarih")),
  ]);
  return { products, customers, suppliers, sales, collections, supplierMov, cash, cheques, orders };
}

const addCash = (aciklama, tip, amount, sale_id = null, tarih = null) =>
  sb.from("cash_entries").insert({ aciklama, tip, amount, sale_id, tarih: tarih || todayISO() });

// --- Ürünler ----------------------------------------------------------
export const addProduct = (p) => sb.from("products").insert(p).throwOnError();
export const updateProduct = (id, patch) => sb.from("products").update(patch).eq("id", id).throwOnError();
export const deleteProduct = (id) => sb.from("products").delete().eq("id", id).throwOnError();

// --- Müşteriler -------------------------------------------------------
export async function addCustomer(c){ const { data, error } = await sb.from("customers").insert(c).select().single(); if(error) throw error; return data; }
export const updateCustomer = (id, patch) => sb.from("customers").update(patch).eq("id", id).throwOnError();
export const deleteCustomer = (id) => sb.from("customers").delete().eq("id", id).throwOnError();
export async function collectFromCustomer(customer, tutar, tarih) {
  const t = tarih || todayISO();
  await sb.from("collections").insert({ musteri_id: customer.id, tutar, tarih: t }).throwOnError();
  await sb.from("customers").update({ bakiye: Number(customer.bakiye) - tutar }).eq("id", customer.id).throwOnError();
  await addCash(`Tahsilat: ${customer.ad}`, "giris", tutar, null, t).throwOnError();
}

// --- Kumaşçı / Tedarikçi ---------------------------------------------
export const addSupplier = (s) => sb.from("suppliers").insert(s).throwOnError();
export const updateSupplier = (id, patch) => sb.from("suppliers").update(patch).eq("id", id).throwOnError();
export const deleteSupplier = (id) => sb.from("suppliers").delete().eq("id", id).throwOnError();
export async function supplierPurchase(supplier, aciklama, tutar, odeme, tarih) {
  const t = tarih || todayISO();
  if (odeme === "veresiye") {
    await sb.from("supplier_movements").insert({ supplier_id: supplier.id, aciklama: aciklama || "Mal girişi (veresiye)", tutar, tip: "borç", tarih: t }).throwOnError();
    await sb.from("suppliers").update({ bakiye: Number(supplier.bakiye) + tutar }).eq("id", supplier.id).throwOnError();
  } else {
    await sb.from("supplier_movements").insert({ supplier_id: supplier.id, aciklama: aciklama || "Mal girişi (peşin)", tutar, tip: "peşin", tarih: t }).throwOnError();
    await addCash(`Peşin alım: ${supplier.ad}`, "cikis", tutar, null, t).throwOnError();
  }
}
export async function supplierPay(supplier, tutar, aciklama, tarih) {
  const t = tarih || todayISO();
  await sb.from("supplier_movements").insert({ supplier_id: supplier.id, aciklama: aciklama || "Ödeme", tutar, tip: "ödeme", tarih: t }).throwOnError();
  await sb.from("suppliers").update({ bakiye: Number(supplier.bakiye) - tutar }).eq("id", supplier.id).throwOnError();
  await addCash(`Ödeme: ${supplier.ad}`, "cikis", tutar, null, t).throwOnError();
}

// --- Satış ------------------------------------------------------------
const HESABA = (odeme) => ["veresiye", "çek", "cek", "senet"].includes(String(odeme || "").toLowerCase());

export async function recordSale({ urun, adet, musteri, odeme, birimFiyat, tarih }) {
  const t = tarih || todayISO();
  const birim = (birimFiyat && Number(birimFiyat) > 0) ? Number(birimFiyat) : Number(urun.satis);
  const tutar = adet * birim, maliyet = adet * Number(urun.giris), kar = tutar - maliyet;
  const { data: sale, error } = await sb.from("sales").insert({
    tarih: t, urun_id: urun.id, urun_ad: urun.ad, adet, birim_fiyat: birim,
    maliyet, tutar, kar, musteri_id: musteri ? musteri.id : null, musteri_ad: musteri ? musteri.ad : "Peşin", odeme,
  }).select().single();
  if (error) throw error;
  await sb.from("products").update({ stok: Number(urun.stok) - adet }).eq("id", urun.id).throwOnError();
  if (HESABA(odeme) && musteri) {
    await sb.from("customers").update({ bakiye: Number(musteri.bakiye) + tutar }).eq("id", musteri.id).throwOnError();
  } else {
    await addCash(`Satış: ${urun.ad}`, "giris", tutar, sale.id, t).throwOnError();
  }
  return sale;
}
// Müşteri iadesi: negatif satış olarak kaydedilir (ciro/kâr otomatik netleşir)
export async function customerReturn({ musteri, urun, adet, tutar, tur, tarih, aciklama }) {
  const t = tarih || todayISO();
  const ad = Math.abs(Number(adet) || 0);
  const tutarN = Math.abs(Number(tutar) || 0);
  const maliyet = urun && ad ? Number(urun.giris) * ad : 0;
  const { data: sale, error } = await sb.from("sales").insert({
    tarih: t, urun_id: urun ? urun.id : null,
    urun_ad: (urun ? `İade: ${urun.ad}` : "İade") + (aciklama ? ` · ${aciklama}` : ""),
    adet: ad ? -ad : 0, birim_fiyat: 0, maliyet: -maliyet, tutar: -tutarN, kar: -(tutarN - maliyet),
    musteri_id: musteri.id, musteri_ad: musteri.ad, odeme: "iade",
  }).select().single();
  if (error) throw error;
  if (urun && ad) await sb.from("products").update({ stok: Number(urun.stok) + ad }).eq("id", urun.id).throwOnError();
  if (tur === "nakit") {
    await addCash(`İade: ${musteri.ad}`, "cikis", tutarN, sale.id, t).throwOnError();
  } else {
    await sb.from("customers").update({ bakiye: Number(musteri.bakiye) - tutarN }).eq("id", musteri.id).throwOnError();
  }
  return sale;
}
export async function deleteSale(sale, products, customers) {
  const urun = products.find((p) => p.id === sale.urun_id);
  if (urun) await sb.from("products").update({ stok: Number(urun.stok) + Number(sale.adet) }).eq("id", urun.id).throwOnError();
  if (HESABA(sale.odeme) && sale.musteri_id) {
    const m = customers.find((c) => c.id === sale.musteri_id);
    if (m) await sb.from("customers").update({ bakiye: Number(m.bakiye) - Number(sale.tutar) }).eq("id", m.id).throwOnError();
  } else {
    await sb.from("cash_entries").delete().eq("sale_id", sale.id).throwOnError();
  }
  await sb.from("sales").delete().eq("id", sale.id).throwOnError();
}

// --- Çek / Senet ------------------------------------------------------
export const addCheque = (c) => sb.from("cheques").insert(c).throwOnError();
export const updateCheque = (id, patch) => sb.from("cheques").update(patch).eq("id", id).throwOnError();
export const deleteCheque = (id) => sb.from("cheques").delete().eq("id", id).throwOnError();
export async function setChequeStatus(cek, durum) {
  const patch = { durum };
  if (!cek.islendi && durum === "Tahsil Edildi" && cek.tip === "alinan") { await addCash(`Çek tahsilatı: ${cek.kisi}`, "giris", Number(cek.tutar)).throwOnError(); patch.islendi = true; }
  if (!cek.islendi && durum === "Ödendi" && cek.tip === "verilen") { await addCash(`Çek ödemesi: ${cek.kisi}`, "cikis", Number(cek.tutar)).throwOnError(); patch.islendi = true; }
  await sb.from("cheques").update(patch).eq("id", cek.id).throwOnError();
}

// --- Siparişler -----------------------------------------------------
const YOK_TABLO = (e) => {
  const m = String(e?.message || "").toLowerCase();
  return m.includes("public.orders") || m.includes("'orders'") || e?.code === "42P01" || e?.code === "PGRST205";
};
export async function addOrder(o) {
  const t = o.tarih || todayISO();
  const { data, error } = await sb.from("orders").insert({
    musteri_id: o.musteri_id || null, musteri_ad: o.musteri_ad || "", aciklama: o.aciklama || "",
    toplam: Number(o.toplam) || 0, kapora: Number(o.kapora) || 0, durum: o.durum || "Bekliyor",
    notu: o.notu || "", tarih: t, teslim: o.teslim || null,
  }).select().single();
  if (error) {
    if (YOK_TABLO(error)) throw new Error("Sipariş tablosu (orders) veritabanında yok. Supabase → SQL Editor'da 'siparis-gider.sql' dosyasını bir kez çalıştırın.");
    throw error;
  }
  if (Number(o.kapora) > 0) {
    await addCash(`Sipariş kaporası: ${(o.musteri_ad || "").trim() || "müşteri"}`, "giris", Number(o.kapora), null, t).throwOnError();
  }
  return data;
}
export const updateOrder = (id, patch) => sb.from("orders").update(patch).eq("id", id).throwOnError();
export const deleteOrder = (id) => sb.from("orders").delete().eq("id", id).throwOnError();

// --- Giderler (kasadan anlık çıkış) ---------------------------------
export async function addExpense({ aciklama, amount, tarih }) {
  const base = { aciklama: aciklama || "Gider", tip: "cikis", amount: Number(amount) || 0, tarih: tarih || todayISO() };
  try {
    await sb.from("cash_entries").insert({ ...base, kategori: "gider" }).throwOnError();
  } catch (e) {
    // 'kategori' kolonu henüz eklenmemişse: açıklamaya etiket koyarak yine de kaydet
    if (String(e?.message || "").toLowerCase().includes("kategori") || e?.code === "PGRST204") {
      await sb.from("cash_entries").insert({ ...base, aciklama: "[Gider] " + base.aciklama }).throwOnError();
    } else { throw e; }
  }
}
export const deleteCashEntry = (id) => sb.from("cash_entries").delete().eq("id", id).throwOnError();
