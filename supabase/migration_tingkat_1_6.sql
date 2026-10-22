-- =====================================================================
-- MIGRASI: tingkat 1-6 dan boleh kosong (jalankan di Supabase SQL Editor)
--
-- Jalankan SETELAH supabase/product_gondola.sql.
-- Aman dijalankan berulang kali (idempoten).
--
-- Kenapa perlu:
--  * Data Excel sebenarnya sudah memakai tingkat 6, tetapi aplikasi hanya
--    menyediakan pilihan 1-5, sehingga tingkat 6 tidak bisa dipilih/dilihat.
--  * Tingkat boleh dikosongkan (null) bila barang belum diketahui raknya,
--    alih-alih dipaksa menjadi tingkat 1.
-- =====================================================================

-- 1. Tingkat boleh kosong
alter table product_gondola alter column tingkat drop not null;
alter table product_gondola alter column tingkat drop default;

-- 2. Batasi nilai tingkat ke 1-6, atau kosong
alter table product_gondola drop constraint if exists product_gondola_tingkat;
alter table product_gondola
  add constraint product_gondola_tingkat
  check (tingkat is null or (tingkat between 1 and 6));

-- 3. Jaga keunikan saat tingkat kosong.
--    Indeks unik biasa menganggap NULL berbeda satu sama lain, sehingga
--    produk yang sama bisa terpetakan berkali-kali tanpa tingkat.
--    Indeks parsial di bawah menutup celah itu.
create unique index if not exists idx_product_gondola_uniq_tanpa_tingkat
  on product_gondola (produk_id, gondola_key)
  where tingkat is null;

-- 4. Muat ulang cache skema PostgREST agar Supabase langsung melihat perubahan
notify pgrst, 'reload schema';

-- =====================================================================
-- PEMERIKSAAN (lihat hasilnya di tab hasil)
-- =====================================================================
select tingkat, count(*) as jumlah_baris
from product_gondola
group by tingkat
order by tingkat nulls last;
