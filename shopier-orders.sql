-- ============================================================
--  Muslihan Tekstil - Shopier siparis entegrasyonu
--  Supabase -> SQL Editor'da BIR KEZ calistir.
-- ============================================================

-- Siparise kaynak + Shopier siparis kimligi (tekrari onlemek icin)
alter table public.orders add column if not exists kaynak text default 'manuel';
alter table public.orders add column if not exists shopier_id text;

-- Ayni Shopier siparisi iki kez gelirse kopya olusmasin
create unique index if not exists orders_shopier_id_uniq
  on public.orders(shopier_id) where shopier_id is not null;

notify pgrst, 'reload schema';
