-- Tedarik rolüne Çek/Senet görme + ekleme + güncelleme yetkisi verir.
-- Supabase > SQL Editor'da bu dosyayı çalıştırın (yalnızca bir kez).
-- Silme yetkisi yine sadece yöneticidedir.

drop policy if exists sel on cheques;
drop policy if exists ins on cheques;
drop policy if exists upd on cheques;
drop policy if exists del on cheques;

create policy sel on cheques for select to authenticated
  using (public.user_role() in ('admin','editor','tedarik'));
create policy ins on cheques for insert to authenticated
  with check (public.user_role() in ('admin','editor','tedarik'));
create policy upd on cheques for update to authenticated
  using (public.user_role() in ('admin','editor','tedarik'));
create policy del on cheques for delete to authenticated
  using (public.user_role() = 'admin');
