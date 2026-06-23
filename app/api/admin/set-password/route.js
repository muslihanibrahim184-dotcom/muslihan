import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Admin, başka bir kullanıcının şifresini değiştirir.
// Secret key SADECE burada (sunucuda) kullanılır; tarayıcıya asla gitmez.
export async function POST(req) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY; // sb_secret_... veya legacy service_role
  if (!url || !secret) {
    return NextResponse.json({ error: "Sunucu yapılandırması eksik: SUPABASE_SECRET_KEY tanımlı değil." }, { status: 500 });
  }

  const token = (req.headers.get("authorization") || "").replace("Bearer ", "").trim();
  if (!token) return NextResponse.json({ error: "Oturum bulunamadı." }, { status: 401 });

  const admin = createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } });

  // 1) Çağıranı doğrula
  const { data: caller, error: cErr } = await admin.auth.getUser(token);
  if (cErr || !caller?.user) return NextResponse.json({ error: "Oturum geçersiz." }, { status: 401 });

  // 2) Çağıran admin mi?
  const { data: prof } = await admin.from("profiles").select("role").eq("id", caller.user.id).single();
  if (prof?.role !== "admin") {
    return NextResponse.json({ error: "Bu işlem için yönetici olmalısınız." }, { status: 403 });
  }

  // 3) Girdileri doğrula
  const { userId, password } = await req.json().catch(() => ({}));
  if (!userId || !password || String(password).length < 6) {
    return NextResponse.json({ error: "Geçerli kullanıcı ve en az 6 haneli şifre gerekli." }, { status: 400 });
  }

  // 4) Şifreyi güncelle
  const { error } = await admin.auth.admin.updateUserById(userId, { password });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
