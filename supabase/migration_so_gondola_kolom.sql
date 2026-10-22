-- =====================================================================
-- MIGRASI: lengkapi kolom so_gondola (aman, tidak menghapus data)
-- Jalankan di Supabase SQL Editor hanya jika aplikasi menampilkan pesan
-- "Catatan belum tersimpan karena kolom keterangan belum ada".
--
-- Aplikasi TIDAK lagi bergantung pada kolom ini untuk menyimpan SO,
-- jadi migrasi ini opsional. Tanpa migrasi, SO tetap tersimpan dan
-- hanya kolom Catatan yang tidak ikut tersimpan.
-- =====================================================================

-- 1. Kolom catatan SO (dipakai isian "Catatan" di halaman SO Gondola)
alter table so_gondola add column if not exists keterangan text;

-- 2. Kunci wilayah + tingkat.
--    Text (bukan integer) supaya lokasi Lia tidak saling bertabrakan,
--    karena Lia memakai nama lokasi dan gondola_no-nya null.
alter table so_gondola add column if not exists gondola_key text
  generated always as (
    case
      when gondola_no is null then 'L:' || gondola_lokasi
      else 'G:' || gondola_no::text
    end
  ) stored;

-- 3. Satu baris per tanggal + petugas + wilayah + tingkat + produk.
--    Kalau perintah ini gagal karena ada data ganda, bersihkan dulu:
--      select tanggal, petugas, gondola_key, tingkat, produk_id, count(*)
--      from so_gondola group by 1,2,3,4,5 having count(*) > 1;
create unique index if not exists idx_so_gondola_uniq
  on so_gondola (tanggal, petugas, gondola_key, tingkat, produk_id);

notify pgrst, 'reload schema';
