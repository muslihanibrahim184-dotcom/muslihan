import { supabase as sb } from "./supabase";

export const todayISO = () => new Date().toISOString().slice(0, 10);

// --- Rol -------------------------------------------------------------
export async function getMyRole() {
  const { data: u } = await sb.auth.getUser();
  if (!u?.user) return null;
  const { data } = await sb.from("profiles").select("role").eq("id", u.user.id).single();
  return data?.role || "tedarik";
}
export async function loadProfiles() {
  const { data } = await sb.from("profiles").select("*").order("created_at");
  return data || [];
}
export const setRole = (id, role) => sb.from("profiles").update({ role }).eq("id", id).throwOnError();

// --- Tüm veriyi yükle (role göre erişilebilenler) --------------------
export async function loadAll() {
  const q = (t, order) => sb.from(t).select("*").order(order || "created_at", { ascending: true });
  const safe = async (p) => { try { const r = await p; return r.error ? [] : (r.data || []); } catch { return []; } };
  const [products, customers, suppliers, sales, collections, supplierMov, cash, cheques] = await Promise.all([
    safe(q("products", "ad")), safe(q("customers", "ad")), safe(q("suppliers", "ad")),
    safe(q("sales", "tarih")), safe(q("collections")), safe(q("supplier_movements")),
    safe(q("cash_entries")), safe(q("cheques")),
  ]);
  return { products, customers, suppliers, sales, collections, supplierMov, cash, cheques };
}

const addCash = (aciklama, tip, amount, sale_id = null) =>
  sb.from("cash_entries").insert({ aciklama, tip, amount, sale_id, tarih: todayISO() });

// --- Ürünler ----------------------------------------------------------
export const addProduct = (p) => sb.from("products").insert(p).throwOnError();
export const updateProduct = (id, patch) => sb.from("products").update(patch).eq("id", id).throwOnError();
export const deleteProduct = (id) => sb.from("products").delete().eq("id", id).throwOnError();

// --- Müşteriler -------------------------------------------------------
export async function addCustomer(c){ const { data, error } = await sb.from("customers").insert(c).select().single(); if(error) throw error; return data; }
export const updateCustomer = (id, patch) => sb.from("customers").update(patch).eq("id", id).throwOnError();
export const deleteCustomer = (id) => sb.from("customers").delete().eq("id", id).throwOnError();
export async function collectFromCustomer(customer, tutar) {
  await sb.from("collections").insert({ musteri_id: customer.id, tutar, tarih: todayISO() }).throwOnError();
  await sb.from("customers").update({ bakiye: Number(customer.bakiye) - tutar }).eq("id", customer.id).throwOnError();
  await addCash(`Tahsilat: ${customer.ad}`, "giris", tutar).throwOnError();
}

// --- Kumaşçı / Tedarikçi ---------------------------------------------
export const addSupplier = (s) => sb.from("suppliers").insert(s).throwOnError();
export const deleteSupplier = (id) => sb.from("suppliers").delete().eq("id", id).throwOnError();
export async function supplierPurchase(supplier, aciklama, tutar, odeme) {
  if (odeme === "veresiye") {
    await sb.from("supplier_movements").insert({ supplier_id: supplier.id, aciklama: aciklama || "Mal girişi (veresiye)", tutar, tip: "borç", tarih: todayISO() }).throwOnError();
    await sb.from("suppliers").update({ bakiye: Number(supplier.bakiye) + tutar }).eq("id", supplier.id).throwOnError();
  } else {
    await sb.from("supplier_movements").insert({ supplier_id: supplier.id, aciklama: aciklama || "Mal girişi (peşin)", tutar, tip: "peşin", tarih: todayISO() }).throwOnError();
    await addCash(`Peşin alım: ${supplier.ad}`, "cikis", tutar).throwOnError();
  }
}
export async function supplierPay(supplier, tutar) {
  await sb.from("supplier_movements").insert({ supplier_id: supplier.id, aciklama: "Ödeme", tutar, tip: "ödeme", tarih: todayISO() }).throwOnError();
  await sb.from("suppliers").update({ bakiye: Number(supplier.bakiye) - tutar }).eq("id", supplier.id).throwOnError();
  await addCash(`Ödeme: ${supplier.ad}`, "cikis", tutar).throwOnError();
}

// --- Satış ------------------------------------------------------------
export async function recordSale({ urun, adet, musteri, odeme }) {
  const tutar = adet * Number(urun.satis), maliyet = adet * Number(urun.giris), kar = tutar - maliyet;
  const { data: sale, error } = await sb.from("sales").insert({
    tarih: todayISO(), urun_id: urun.id, urun_ad: urun.ad, adet, birim_fiyat: Number(urun.satis),
    maliyet, tutar, kar, musteri_id: musteri ? musteri.id : null, musteri_ad: musteri ? musteri.ad : "Peşin", odeme,
  }).select().single();
  if (error) throw error;
  await sb.from("products").update({ stok: Number(urun.stok) - adet }).eq("id", urun.id).throwOnError();
  if (odeme === "veresiye" && musteri) {
    await sb.from("customers").update({ bakiye: Number(musteri.bakiye) + tutar }).eq("id", musteri.id).throwOnError();
  } else {
    await addCash(`Peşin satış: ${urun.ad}`, "giris", tutar, sale.id).throwOnError();
  }
  return sale;
}
export async function deleteSale(sale, products, customers) {
  const urun = products.find((p) => p.id === sale.urun_id);
  if (urun) await sb.from("products").update({ stok: Number(urun.stok) + Number(sale.adet) }).eq("id", urun.id).throwOnError();
  if (sale.odeme === "veresiye" && sale.musteri_id) {
    const m = customers.find((c) => c.id === sale.musteri_id);
    if (m) await sb.from("customers").update({ bakiye: Number(m.bakiye) - Number(sale.tutar) }).eq("id", m.id).throwOnError();
  } else {
    await sb.from("cash_entries").delete().eq("sale_id", sale.id).throwOnError();
  }
  await sb.from("sales").delete().eq("id", sale.id).throwOnError();
}

// --- Çek / Senet ------------------------------------------------------
export const addCheque = (c) => sb.from("cheques").insert(c).throwOnError();
export const deleteCheque = (id) => sb.from("cheques").delete().eq("id", id).throwOnError();
export async function setChequeStatus(cek, durum) {
  const patch = { durum };
  if (!cek.islendi && durum === "Tahsil Edildi" && cek.tip === "alinan") { await addCash(`Çek tahsilatı: ${cek.kisi}`, "giris", Number(cek.tutar)).throwOnError(); patch.islendi = true; }
  if (!cek.islendi && durum === "Ödendi" && cek.tip === "verilen") { await addCash(`Çek ödemesi: ${cek.kisi}`, "cikis", Number(cek.tutar)).throwOnError(); patch.islendi = true; }
  await sb.from("cheques").update(patch).eq("id", cek.id).throwOnError();
}
