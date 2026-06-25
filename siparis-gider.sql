-- ============================================================
--  Muslihan Tekstil — Siparişler + Gider eklentisi
--  Supabase → SQL Editor'da BİR KEZ çalıştır.
--  (Not: user_role() fonksiyonuna dokunmuyoruz, mevcut hali kullanılır.)
-- ============================================================

-- 1) SİPARİŞLER tablosu --------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  musteri_id  uuid references public.customers(id) on delete set null,
  musteri_ad  text,
  aciklama    text   not null default '',
  toplam      numeric not null default 0,   -- siparişin toplam tutarı (TL)
  kapora      numeric not null default 0,   -- peşin alınan kapora (TL)
  durum       text   not null default 'Bekliyor',
  notu        text   default '',
  tarih       date   not null default current_date,
  teslim      date,                         -- tahmini teslim tarihi (ops.)
  created_at  timestamptz default now()
);

-- 2) Gider kategorisi (kasadan anlık çıkışlar: benzin, yemek vb.) ----
alter table public.cash_entries add column if not exists kategori text default 'islem';

-- 3) RLS: siparişleri admin + editor + tedarik görebilsin -----
--    (tedarik rolü üretim/temin için siparişleri görmeli)
alter table public.orders enable row level security;
drop policy if exists sel on public.orders;
drop policy if exists ins on public.orders;
drop policy if exists upd on public.orders;
drop policy if exists del on public.orders;
create policy sel on public.orders for select to authenticated using (public.user_role() in ('admin','editor','tedarik'));
create policy ins on public.orders for insert to authenticated with check (public.user_role() in ('admin','editor','tedarik'));
create policy upd on public.orders for update to authenticated using (public.user_role() in ('admin','editor','tedarik'));
create policy del on public.orders for delete to authenticated using (public.user_role() = 'admin');
