-- =====================================================================
-- Muslihan Tekstil Mağaza — Veritabanı Şeması (roller dahil)
-- Supabase > SQL Editor'da bu dosyanın TAMAMINI çalıştırın.
-- Tablo zaten varsa "alter ... add column if not exists" satırları
-- eksik kolonları güvenle ekler.
-- =====================================================================

-- ÜRÜNLER --------------------------------------------------------------
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  ad text not null, kod text default '—', kategori text default 'Genel',
  stok numeric not null default 0, birim text default 'adet',
  giris numeric not null default 0, satis numeric not null default 0,
  min_stok numeric not null default 0, created_at timestamptz default now()
);

-- MÜŞTERİLER (iletişim bilgileri dahil) -------------------------------
create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  ad text not null,
  telefon text default '', adres text default '', vergi_no text default '', notu text default '',
  bakiye numeric not null default 0,   -- + : müşteri borçlu (sizin alacağınız)
  created_at timestamptz default now()
);
alter table customers add column if not exists telefon text default '';
alter table customers add column if not exists adres text default '';
alter table customers add column if not exists vergi_no text default '';
alter table customers add column if not exists notu text default '';

-- KUMAŞÇILAR / TEDARİKÇİLER (grup + tür) ------------------------------
create table if not exists suppliers (
  id uuid primary key default gen_random_uuid(),
  ad text not null,
  grup text default 'tedarikci',       -- 'kumasci' | 'tedarikci'
  tur text default 'Kumaşçı',           -- Kumaşçı, Lastikçi, Kordoncu, Etiketçi...
  bakiye numeric not null default 0,    -- + : siz borçlusunuz (vereceğiniz)
  created_at timestamptz default now()
);
alter table suppliers add column if not exists grup text default 'tedarikci';
alter table suppliers add column if not exists tur text default 'Kumaşçı';

-- SATIŞLAR -------------------------------------------------------------
create table if not exists sales (
  id uuid primary key default gen_random_uuid(),
  tarih date not null default current_date,
  urun_id uuid references products(id) on delete set null, urun_ad text,
  adet numeric not null, birim_fiyat numeric not null,
  maliyet numeric not null, tutar numeric not null, kar numeric not null,
  musteri_id uuid references customers(id) on delete set null,
  musteri_ad text default 'Peşin', odeme text not null default 'peşin',
  created_at timestamptz default now()
);

-- TAHSİLATLAR ----------------------------------------------------------
create table if not exists collections (
  id uuid primary key default gen_random_uuid(),
  musteri_id uuid references customers(id) on delete cascade,
  tarih date not null default current_date, tutar numeric not null,
  created_at timestamptz default now()
);

-- KUMAŞÇI/TEDARİKÇİ HAREKETLERİ ---------------------------------------
create table if not exists supplier_movements (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid references suppliers(id) on delete cascade,
  tarih date not null default current_date, aciklama text,
  tutar numeric not null, tip text not null,   -- 'borç' | 'ödeme' | 'peşin'
  created_at timestamptz default now()
);

-- KASA -----------------------------------------------------------------
create table if not exists cash_entries (
  id uuid primary key default gen_random_uuid(),
  tarih date not null default current_date, aciklama text,
  tip text not null, amount numeric not null,  -- 'giris' | 'cikis'
  sale_id uuid references sales(id) on delete set null,
  created_at timestamptz default now()
);

-- ÇEK / SENET ----------------------------------------------------------
create table if not exists cheques (
  id uuid primary key default gen_random_uuid(),
  tip text not null, tur text not null default 'Çek',
  kisi text not null, banka text default '—',
  tutar numeric not null, vade date not null,
  durum text not null, notu text default '', islendi boolean not null default false,
  created_at timestamptz default now()
);

-- =====================================================================
-- ROLLER / KULLANICI PROFİLLERİ
--   admin    : her şey (silme + rol yönetimi dahil)
--   editor   : her şeyi görür, ekler/düzenler, SİLEMEZ
--   tedarik  : sadece kumaşçı/tedarikçi; müşteri, satış, kasa GÖREMEZ
-- =====================================================================
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  ad text default '',
  role text not null default 'tedarik' check (role in ('admin','editor','tedarik')),
  created_at timestamptz default now()
);

-- Yeni kayıt olan kullanıcı için otomatik profil (varsayılan: tedarik)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'tedarik')
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- Geçerli kullanıcının rolünü güvenle döndürür (RLS özyinelemesini önler)
create or replace function public.user_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

-- =====================================================================
-- RLS POLİTİKALARI
-- =====================================================================
alter table products           enable row level security;
alter table customers          enable row level security;
alter table suppliers          enable row level security;
alter table sales              enable row level security;
alter table collections        enable row level security;
alter table supplier_movements enable row level security;
alter table cash_entries       enable row level security;
alter table cheques            enable row level security;
alter table profiles           enable row level security;

-- Yardımcı: bir tabloya rol-tabanlı politikalar uygula
do $$
declare t text;
begin
  -- admin+editor görür/ekler/günceller, admin siler  (müşteri/satış/ürün)
  foreach t in array array['products','customers','sales','collections']
  loop
    execute format('drop policy if exists sel on %I;', t);
    execute format('drop policy if exists ins on %I;', t);
    execute format('drop policy if exists upd on %I;', t);
    execute format('drop policy if exists del on %I;', t);
    execute format($f$create policy sel on %I for select to authenticated using (public.user_role() in ('admin','editor'));$f$, t);
    execute format($f$create policy ins on %I for insert to authenticated with check (public.user_role() in ('admin','editor'));$f$, t);
    execute format($f$create policy upd on %I for update to authenticated using (public.user_role() in ('admin','editor'));$f$, t);
    execute format($f$create policy del on %I for delete to authenticated using (public.user_role() = 'admin');$f$, t);
  end loop;

  -- kumaşçı/tedarikçi + hareketleri + çek/senet: admin+editor+tedarik görür/ekler/günceller, admin siler
  foreach t in array array['suppliers','supplier_movements','cheques']
  loop
    execute format('drop policy if exists sel on %I;', t);
    execute format('drop policy if exists ins on %I;', t);
    execute format('drop policy if exists upd on %I;', t);
    execute format('drop policy if exists del on %I;', t);
    execute format($f$create policy sel on %I for select to authenticated using (public.user_role() in ('admin','editor','tedarik'));$f$, t);
    execute format($f$create policy ins on %I for insert to authenticated with check (public.user_role() in ('admin','editor','tedarik'));$f$, t);
    execute format($f$create policy upd on %I for update to authenticated using (public.user_role() in ('admin','editor','tedarik'));$f$, t);
    execute format($f$create policy del on %I for delete to authenticated using (public.user_role() = 'admin');$f$, t);
  end loop;
end $$;

-- KASA: admin+editor görür; tedarik göremez ama (ödeme yapabilmesi için) ekleyebilir
drop policy if exists sel on cash_entries;
drop policy if exists ins on cash_entries;
drop policy if exists upd on cash_entries;
drop policy if exists del on cash_entries;
create policy sel on cash_entries for select to authenticated using (public.user_role() in ('admin','editor'));
create policy ins on cash_entries for insert to authenticated with check (public.user_role() in ('admin','editor','tedarik'));
create policy upd on cash_entries for update to authenticated using (public.user_role() in ('admin','editor'));
create policy del on cash_entries for delete to authenticated using (public.user_role() = 'admin');

-- PROFILLER: herkes kendi profilini görür; admin hepsini görür ve rolleri değiştirir
drop policy if exists sel on profiles;
drop policy if exists upd on profiles;
create policy sel on profiles for select to authenticated using (id = auth.uid() or public.user_role() = 'admin');
create policy upd on profiles for update to authenticated using (public.user_role() = 'admin') with check (public.user_role() = 'admin');

-- =====================================================================
-- KURULUMDAN SONRA: kendinizi admin yapın (e-postanızı yazın)
--   update public.profiles set role='admin'
--   where id = (select id from auth.users where email='SIZIN@EPOSTA.com');
-- =====================================================================
