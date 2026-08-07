-- ============================================================
--  Muslihan Tekstil - Urun Fotografi
--  Supabase -> SQL Editor'da BIR KEZ calistir.
-- ============================================================

-- 1) Urune foto alani (fotografin adresi burada tutulur)
alter table public.products add column if not exists foto text default '';

-- 2) Fotograflarin saklanacagi kova (herkese acik okuma)
insert into storage.buckets (id, name, public)
values ('urun-foto', 'urun-foto', true)
on conflict (id) do update set public = true;

-- 3) Kova yetkileri
drop policy if exists urun_foto_oku on storage.objects;
drop policy if exists urun_foto_yaz on storage.objects;
drop policy if exists urun_foto_guncelle on storage.objects;
drop policy if exists urun_foto_sil on storage.objects;

create policy urun_foto_oku on storage.objects
  for select using (bucket_id = 'urun-foto');
create policy urun_foto_yaz on storage.objects
  for insert to authenticated with check (bucket_id = 'urun-foto');
create policy urun_foto_guncelle on storage.objects
  for update to authenticated using (bucket_id = 'urun-foto');
create policy urun_foto_sil on storage.objects
  for delete to authenticated using (bucket_id = 'urun-foto');

-- 4) Sema onbellegini tazele
notify pgrst, 'reload schema';
