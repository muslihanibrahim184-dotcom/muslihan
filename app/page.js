"use client";
import { useEffect, useState } from "react";
import { supabase, supabaseReady } from "@/lib/supabase";
import Login from "@/components/Login";
import App from "@/components/App";

export default function Home() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabaseReady) { setLoading(false); return; }
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!supabaseReady) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center" style={{ color: "#16161D" }}>
        <div className="max-w-md">
          <h1 className="text-xl font-semibold mb-2">Kurulum gerekli</h1>
          <p className="text-sm" style={{ color: "#5C5B66" }}>
            Lütfen <code>.env.local</code> içine <b>NEXT_PUBLIC_SUPABASE_URL</b> ve <b>NEXT_PUBLIC_SUPABASE_ANON_KEY</b> değerlerini ekleyin (Vercel'de Environment Variables).
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#16161D", borderTopColor: "transparent" }} />
      </div>
    );
  }

  return session ? <App session={session} /> : <Login />;
}
