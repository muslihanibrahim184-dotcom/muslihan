-- ============================================================
--  Muslihan Tekstil - Cek/Senet Fotografi
--  Supabase -> SQL Editor'da BIR KEZ calistir.
--  Not: Fotograflar mevcut 'urun-foto' kovasinda saklanir,
--  bu yuzden ayri bir depo kurmaya gerek yoktur. (urun-foto.sql
--  daha once calistirilmadiysa once onu calistirin.)
-- ============================================================

alter table public.cheques add column if not exists foto text default '';

notify pgrst, 'reload schema';
