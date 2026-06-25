-- ============================================================
-- Çek/Senet'i tedarik rolüne açar.
-- Supabase > SQL Editor'da TAMAMINI seçip Run'a basın.
-- Veri silinmez; sadece çek tablosunun yetki kuralları güncellenir.
-- NOT: Mevcut user_role() fonksiyonuna DOKUNULMAZ (zaten çalışıyor).
-- ============================================================

alter table public.cheques enable row level security;

drop policy if exists sel on public.cheques;
drop policy if exists ins on public.cheques;
drop policy if exists upd on public.cheques;
drop policy if exists del on public.cheques;

create policy sel on public.cheques for select to authenticated
  using (public.user_role() in ('admin','editor','tedarik'));

create policy ins on public.cheques for insert to authenticated
  with check (public.user_role() in ('admin','editor','tedarik'));

create policy upd on public.cheques for update to authenticated
  using (public.user_role() in ('admin','editor','tedarik'));

create policy del on public.cheques for delete to authenticated
  using (public.user_role() = 'admin');
