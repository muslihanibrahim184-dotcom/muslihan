# Muslihan Tekstil Mağaza — Takip Sistemi

Mağaza satış odaklı yönetim paneli: **Satış, Ürünler (giriş/satış fiyatı & kâr), Müşteriler (iletişim + alacak/borç), Kumaşçılar, Tedarikçiler, Çek/Senet** ve Genel Bakış. Üstte canlı **USD/TRY · EUR/TRY** kuru; borç/bakiye değerleri TL + USD/EUR gösterilir.

- **Next.js 14 + Supabase (giriş + veritabanı) + Tailwind**, **PWA**, responsive
- **Rol tabanlı yetkilendirme** (hem arayüzde hem veritabanı RLS'inde)

## Roller
- **Yönetici (admin):** her şeyi yapar — ekler, düzenler, **siler**, kullanıcı rollerini yönetir.
- **Editör (editor):** her şeyi görür, ekler/düzenler ama **silemez**.
- **Tedarik (tedarik):** yalnızca **Kumaşçılar + Tedarikçiler** ekranını görür; müşteri bilgileri, günlük satış ve kasayı **göremez**.

## Kurulum

### 1) Supabase
1. https://supabase.com → yeni proje.
2. **SQL Editor** → `schema.sql` dosyasının tamamını çalıştır (tablolar + roller + RLS).
3. **Authentication > Email** açık olsun; hızlı başlangıç için **"Confirm email"** kapatılabilir.
4. **Project Settings > API** → `Project URL` ve `anon public` anahtarını kopyala.

### 2) Ortam değişkenleri (`.env.local` / Vercel)
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxxx
# Sadece sunucu (admin şifre değiştirme) — ASLA NEXT_PUBLIC yapma:
SUPABASE_SECRET_KEY=sb_secret_xxxx
```

> **SUPABASE_SECRET_KEY**: Supabase > Settings > API Keys > Secret key (sb_secret_...) ya da
> Legacy tab'daki service_role. Yöneticinin başka kullanıcıların şifresini değiştirmesi için
> gerekir. Tarayıcıya gitmez; sadece sunucu API route'unda kullanılır. Vercel'de de aynı
> isimle Environment Variables'a ekleyin.

### 3) İlk kullanıcı + admin yapma
- Uygulamadan "Kayıt ol" ile ya da Supabase panelinden kullanıcı oluştur.
- **Yeni kullanıcılar varsayılan olarak `tedarik` rolündedir.** Kendini admin yapmak için SQL Editor'da:
```sql
update public.profiles set role='admin'
where id = (select id from auth.users where email='SIZIN@EPOSTA.com');
```
- Sonrasında admin, uygulamadaki **Kullanıcılar** sekmesinden diğer kullanıcıların rolünü değiştirebilir.

### 4) Çalıştırma / Dağıtım
```bash
npm install
npm run dev
```
GitHub'a push → Vercel'de repo seç → Environment Variables ekle → Deploy. Telefonda "Ana ekrana ekle" ile PWA kurulur.

## İş mantığı
- **Satış** → stoktan düşer, kâr hesaplanır; peşin ise kasaya, veresiye ise müşteri borcuna yazılır (silinince geri alınır).
- **Tahsilat / Ödeme / Mal girişi** kasayı ve cari bakiyeyi otomatik günceller.
- **Çek/Senet**: Alınan "Tahsil Edildi" → kasa girişi; Verilen "Ödendi" → kasa çıkışı; vadesi geçenler uyarılır.

## Notlar
- Güvenlik veritabanı seviyesinde RLS ile zorlanır; arayüzdeki gizlemeler ek kolaylıktır.
- `tedarik` rolü müşteri/satış/kasa tablolarını **okuyamaz** (RLS engeller), sadece kumaşçı/tedarikçi işler.
