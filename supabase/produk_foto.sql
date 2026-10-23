-- =====================================================================
-- FOTO PRODUK
-- Jalankan sekali di Supabase SQL Editor.
--
-- Isi:
--   1. Kolom products.foto_url
--   2. Bucket Storage "produk" (public) + policy upload untuk user login
--   3. View v_perlu_perhatian ditambah foto_url
--
-- Catatan:
-- - Foto disimpan di Supabase Storage, bukan di tabel products.
-- - Bucket dibuat public agar <img> bisa memuat foto tanpa signed URL.
-- - Semua user yang login boleh upload/ganti/hapus foto produk, sama
--   seperti user yang login boleh mengedit produk. Belum ada role admin.
-- =====================================================================

alter table public.products add column if not exists foto_url text;

-- ---------------------------------------------------------------------
-- Bucket Storage
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'produk',
  'produk',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Baca publik (bucket public sebenarnya sudah bisa dibaca, policy ini
-- membuatnya eksplisit dan aman bila setting bucket diubah).
drop policy if exists "produk_foto_select" on storage.objects;
create policy "produk_foto_select" on storage.objects
  for select using (bucket_id = 'produk');

-- Hanya user login yang boleh mengunggah/mengganti/menghapus.
drop policy if exists "produk_foto_insert" on storage.objects;
create policy "produk_foto_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'produk');

drop policy if exists "produk_foto_update" on storage.objects;
create policy "produk_foto_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'produk')
  with check (bucket_id = 'produk');

drop policy if exists "produk_foto_delete" on storage.objects;
create policy "produk_foto_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'produk');

-- ---------------------------------------------------------------------
-- View "perlu perhatian" perlu ikut membawa foto agar thumbnail muncul
-- saat filter Produk > Perlu perhatian dipakai.
-- Kolom baru ditambahkan di akhir agar CREATE OR REPLACE VIEW aman.
-- ---------------------------------------------------------------------
create or replace view v_perlu_perhatian with (security_invoker = true) as
select id, sku, item, gramasi, stok_toko, stok_gudang,
       stok_toko + stok_gudang as stok_total, stok_min, expired_terdekat, foto_url
from products
where aktif
  and (stok_toko + stok_gudang <= coalesce(stok_min, 0)
       or expired_terdekat <= current_date + 60);

notify pgrst, 'reload schema';
