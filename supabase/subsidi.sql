-- =====================================================================
-- FITUR SUBSIDI PENJUALAN
-- Jalankan di Supabase SQL Editor setelah dashboard.sql.
-- Lanjutkan dengan supabase/subsidi_per_item.sql untuk opsi KK bulk
-- atau KK berbeda per barang.
-- Script ini boleh dijalankan ulang. Bagian auto-tanda akan menerapkan ulang
-- pola, jadi periksa kembali centang manual setelah menjalankannya.
--
-- Aturan: 1 KK hanya boleh 1 transaksi subsidi per minggu
-- (Senin-Minggu, zona waktu Asia/Jakarta).
--
-- Barang subsidi ditandai per produk (kolom products.subsidi) dan bisa
-- diubah dari halaman Produk -> Edit produk.
-- =====================================================================

-- 1. Tandai produk
alter table products add column if not exists subsidi boolean not null default false;

-- 2. Data KK pada nota
alter table sales add column if not exists no_kk text;
alter table sales add column if not exists subsidi boolean not null default false;

-- 3. Snapshot status subsidi per baris nota (aman bila flag produk berubah)
alter table sale_items add column if not exists subsidi boolean not null default false;

-- 4. Tandai otomatis produk yang disebut sebagai barang subsidi.
--    Pola dibuat spesifik supaya produk lain tidak ikut tertandai.
--    Varian LPG ("Gas 3 Kg", "Elpiji") juga ditandai.
--    Bisa dikoreksi manual lewat halaman edit produk.
update products
set subsidi = true
where subsidi = false
  and (
    item ilike '%npk%'
    or item ilike '%urea%'
    or item ilike '%lpg%'
    or item ilike '%elpiji%'
    or item ilike '%gas 3%'
    or item ilike '%sphp%'
    or item ilike '%minyak kita%'
    or item ilike '%minyakita%'
  );

-- Opsional: bila SEMUA pupuk di toko adalah pupuk subsidi (termasuk ZA,
-- SP-36, Phonska, dan sejenisnya), buka komentar baris berikut. Setelah itu
-- periksa Produk -> filter Subsidi dan hapus centang pupuk non-subsidi.
-- update products
-- set subsidi = true
-- where subsidi = false and item ilike '%pupuk%';

-- 5. Validasi bentuk nomor KK.
--    Kewajiban KK untuk barang subsidi dijaga per baris nota di
--    sale_items oleh supabase/subsidi_per_item.sql. Constraint lama di
--    sales dihapus karena nota dengan KK per barang boleh punya
--    sales.no_kk null.
alter table sales drop constraint if exists sales_no_kk_format;
alter table sales
  add constraint sales_no_kk_format
  check (no_kk is null or no_kk ~ '^[0-9]{16}$');

alter table sales drop constraint if exists sales_subsidi_wajib_kk;

-- 6. Pencegahan bentrok: 1 KK = 1 nota subsidi per minggu (Senin-Minggu WIB).
--    Index unik ini juga menangani balapan (race) saat dua kasir menyimpan
--    bersamaan.
create index if not exists idx_sales_no_kk on sales (no_kk) where no_kk is not null;

create unique index if not exists uq_sales_subsidi_kk_minggu
  on sales (
    no_kk,
    (date_trunc('week', (tanggal at time zone 'Asia/Jakarta'))::date)
  )
  where subsidi = true and no_kk is not null;

-- 7. Tambahkan info subsidi pada daftar nota (dipakai halaman Penjualan)
drop view if exists v_total_invoice;
create view v_total_invoice with (security_invoker = true) as
select
  s.id,
  s.invoice_no,
  s.tanggal,
  s.kasir,
  sum(si.qty_pcs) as pcs,
  sum(si.qty_pcs * si.harga) as total,
  s.subsidi,
  s.no_kk
from sales s
join sale_items si on si.sale_id = s.id
group by s.id;

-- 8. Cegah produk ganda: nama sama (abaikan huruf besar/kecil dan spasi
--    berlebih) untuk produk yang masih aktif. Produk nonaktif boleh
--    menyimpan nama lama.
--    Bila sudah ada duplikat, index TIDAK dibuat dan SQL Editor menampilkan
--    NOTICE. Jalankan supabase/cek_subsidi.sql untuk melihat daftarnya,
--    rapikan namanya, lalu jalankan ulang blok ini.
do $$
begin
  if exists (
    select 1
    from products
    where aktif
    group by lower(regexp_replace(btrim(item), '[[:space:]]+', ' ', 'g'))
    having count(*) > 1
  ) then
    raise notice 'Produk aktif dengan nama ganda ditemukan. Index unik nama belum dibuat. Jalankan supabase/cek_subsidi.sql.';
  else
    create unique index if not exists uq_products_item_normal
      on products (lower(regexp_replace(btrim(item), '[[:space:]]+', ' ', 'g')))
      where aktif;
  end if;
end $$;
