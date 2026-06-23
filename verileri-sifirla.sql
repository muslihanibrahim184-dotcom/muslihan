-- ============================================================
-- TÜM MAĞAZA VERİLERİNİ SİLER — sıfırdan gerçek veri girmek için.
-- Kullanıcılar ve roller (profiles) KORUNUR.
-- Kasa, satış, çek, müşteri, ürün, tedarikçi vb. TAMAMEN silinir.
--
-- DİKKAT: Geri alınamaz!
-- Mutlaka DOĞRU Muslihan projesinde çalıştırın
-- (ürün/müşteri/satış tablolarının olduğu proje).
-- ============================================================

truncate table
  public.sales,
  public.collections,
  public.cash_entries,
  public.cheques,
  public.supplier_movements,
  public.suppliers,
  public.customers,
  public.products
restart identity cascade;
