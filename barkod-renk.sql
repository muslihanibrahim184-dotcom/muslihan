-- ============================================================
--  Muslihan Tekstil — Barkod/QR + Renk eklentisi
--  Supabase → SQL Editor'da BIR KEZ calistir.
-- ============================================================

-- Urunlere renk alani (QR okutunca gorunecek)
alter table public.products add column if not exists renk text default '';

-- PostgREST sema onbellegini tazele
notify pgrst, 'reload schema';
