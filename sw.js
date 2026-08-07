"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { ShoppingCart, Loader2 } from "lucide-react";

const C = { paper: "#FAF8F3", surface: "#FFFFFF", ink: "#16161D", inkSoft: "#5C5B66", hair: "#E8E2D6", gelir: "#18794E", gider: "#B42318", gold: "#9C7A2E" };

export default function Login() {
  const [email, setEmail] = useState("");
  const [sifre, setSifre] = useState("");
  const [hata, setHata] = useState("");
  const [yukleniyor, setYukleniyor] = useState(false);

  const girisYap = async () => {
    setHata(""); setYukleniyor(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password: sifre });
      if (error) throw error;
    } catch (e) {
      setHata(e.message || "Giriş yapılamadı");
    } finally {
      setYukleniyor(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-5" style={{ background: C.paper, color: C.ink }}>
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl mb-3" style={{ background: C.ink }}>
            <ShoppingCart size={26} color={C.paper} />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ fontFamily: "Georgia, serif" }}>Muslihan Tekstil</h1>
          <p className="text-sm" style={{ color: C.inkSoft }}>Mağaza takip sistemi</p>
        </div>

        <div className="rounded-2xl border p-6 shadow-sm" style={{ background: C.surface, borderColor: C.hair }}>
          <label className="block text-xs font-medium mb-1.5" style={{ color: C.inkSoft }}>E-posta</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email"
            className="w-full mb-3 rounded-lg px-3 py-2.5 text-sm outline-none" style={{ border: `1px solid ${C.hair}`, background: C.paper }} />
          <label className="block text-xs font-medium mb-1.5" style={{ color: C.inkSoft }}>Şifre</label>
          <input value={sifre} onChange={(e) => setSifre(e.target.value)} type="password" autoComplete="current-password"
            onKeyDown={(e) => e.key === "Enter" && girisYap()}
            className="w-full mb-4 rounded-lg px-3 py-2.5 text-sm outline-none" style={{ border: `1px solid ${C.hair}`, background: C.paper }} />

          {hata && <p className="text-sm mb-3" style={{ color: C.gider }}>{hata}</p>}

          <button onClick={girisYap} disabled={yukleniyor || !email || !sifre}
            className="w-full flex items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold text-white disabled:opacity-50" style={{ background: C.ink }}>
            {yukleniyor && <Loader2 size={16} className="animate-spin" />}
            Giriş Yap
          </button>
        </div>
      </div>
    </div>
  );
}
