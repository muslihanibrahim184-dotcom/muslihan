import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Shopier "Otomatik Sipariş Bildirimi (OSB)" karşılama noktası.
// Shopier her yeni siparişte buraya POST atar:
//   - base64 kodlanmış sipariş verisi
//   - HMAC-SHA256 imza (anahtar: OSB şifresi, mesaj: veri + OSB kullanıcı adı)
// Doğrulama başarılıysa sipariş orders tablosuna yazılır ve "success" döner.

function b64Json(v) {
  try { const j = Buffer.from(String(v), "base64").toString("utf8"); const o = JSON.parse(j); return (o && typeof o === "object") ? o : null; }
  catch { return null; }
}
const HEX64 = (v) => /^[0-9a-f]{64}$/i.test(String(v || ""));

// Gelen gövdeden [base64Payload, hash] çiftini olabildiğince esnek çıkar
function ciftBul(raw, ctype) {
  const degerler = [];
  const ekle = (v) => { if (v != null && String(v).length) degerler.push(String(v)); };

  // 1) JSON gövde
  if ((ctype || "").includes("application/json")) {
    try {
      const j = JSON.parse(raw);
      if (Array.isArray(j)) j.forEach((x) => ekle(x && x.value != null ? x.value : x));
      else if (j && typeof j === "object") Object.values(j).forEach((x) => ekle(x && x.value != null ? x.value : x));
    } catch {}
  }
  // 2) form-urlencoded (0[value]=..&1[value]=.. ya da res=..&hash=.. ya da düz)
  if (degerler.length < 2) {
    try {
      const sp = new URLSearchParams(raw);
      for (const [, v] of sp.entries()) ekle(v);
    } catch {}
  }

  // payload = base64→JSON olan; hash = 64 haneli hex olan
  let payload = null, hash = null;
  for (const v of degerler) { if (!payload && b64Json(v)) payload = v; }
  for (const v of degerler) { if (!hash && HEX64(v) && v !== payload) hash = v; }
  return { payload, hash, degerler };
}

function imzaDogru(payload, hash, user, pass) {
  if (!payload || !hash) return false;
  const dene = [payload + user, user + payload, payload]; // önce dokümandaki sıra
  for (const msg of dene) {
    const h = crypto.createHmac("sha256", pass).update(msg).digest("hex");
    if (h.toLowerCase() === String(hash).toLowerCase()) return true;
  }
  return false;
}

export async function GET() {
  // Sağlık kontrolü / URL doğru mu diye tarayıcıdan bakılırsa
  return new Response("Shopier OSB endpoint hazır. Shopier bu adrese POST atmalı.", { status: 200 });
}

export async function POST(req) {
  const USER = process.env.SHOPIER_OSB_USER;
  const PASS = process.env.SHOPIER_OSB_PASS;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;

  if (!USER || !PASS) return new Response("Sunucu yapılandırması eksik: SHOPIER_OSB_USER/PASS tanımlı değil.", { status: 500 });

  const ctype = req.headers.get("content-type") || "";
  const raw = await req.text();
  const { payload, hash } = ciftBul(raw, ctype);

  if (!imzaDogru(payload, hash, USER, PASS)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const o = b64Json(payload) || {};
  const test = o.istest === true || o.istest === "true" || o.istest === 1 || o.istest === "1";

  // Veritabanına yaz (servis anahtarı ile — RLS'i aşar)
  if (url && secret) {
    try {
      const admin = createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } });
      const ad = `${o.buyername || ""} ${o.buyersurname || ""}`.trim() || "Shopier müşteri";
      const aciklama = String(o.productlist || o.productid || (o.productcount ? `${o.productcount} ürün` : "Shopier sipariş")).slice(0, 2000);
      const parcalar = [
        "Shopier" + (test ? " (TEST)" : ""),
        o.orderid ? `sipariş ${o.orderid}` : "",
        o.email || "",
        o.currency && String(o.currency).toUpperCase() !== "TL" && String(o.currency).toUpperCase() !== "TRY" ? `${o.price} ${o.currency}` : "",
        o.customernote ? `not: ${o.customernote}` : "",
      ].filter(Boolean);
      const bugun = new Date().toISOString().slice(0, 10);
      await admin.from("orders").upsert({
        musteri_id: null,
        musteri_ad: ad,
        aciklama,
        toplam: Number(o.price) || 0,
        kapora: 0,
        durum: test ? "Bekliyor" : "Bekliyor",
        notu: parcalar.join(" · "),
        tarih: bugun,
        kaynak: "shopier",
        shopier_id: o.orderid ? String(o.orderid) : null,
      }, { onConflict: "shopier_id", ignoreDuplicates: true });
    } catch (e) {
      // Yazma hatasında bile Shopier'e success dönmek gerekir ki tekrar denesin diye takılmasın;
      // ama imza doğru olduğu için burada sadece logluyoruz.
      console.error("Shopier order insert error:", e?.message || e);
    }
  }

  // Shopier bu yanıtı bekliyor: birebir "success"
  return new Response("success", { status: 200 });
}
