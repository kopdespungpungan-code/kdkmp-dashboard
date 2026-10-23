-- =====================================================================
-- DOKUMENTASI & STB STOK
-- Jalankan sekali di Supabase SQL Editor.
--
-- Isi:
--   1. Kolom stock_log.dokumentasi_path dan stock_log.stb_path
--   2. Bucket Storage "stok" (private, maks 4 MB)
--   3. Policy upload/baca/hapus untuk user login
--
-- Catatan:
-- - Bucket dibuat PRIVATE. Riwayat stok membuat signed URL 1 hari untuk
--   membuka dokumentasi/STB, jadi file tidak bisa diakses publik.
-- - Semua user yang login boleh upload/hapus, sama seperti akses stok.
-- =====================================================================

alter table public.stock_log add column if not exists dokumentasi_path text;
alter table public.stock_log add column if not exists stb_path text;

-- ---------------------------------------------------------------------
-- Bucket Storage
-- 4 MB agar aman terhadap batas body request Vercel (4,5 MB).
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'stok',
  'stok',
  false,
  4194304,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Hanya user login yang boleh membaca/membuat signed URL.
drop policy if exists "stok_dokumen_select" on storage.objects;
create policy "stok_dokumen_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'stok');

drop policy if exists "stok_dokumen_insert" on storage.objects;
create policy "stok_dokumen_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'stok');

drop policy if exists "stok_dokumen_update" on storage.objects;
create policy "stok_dokumen_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'stok')
  with check (bucket_id = 'stok');

drop policy if exists "stok_dokumen_delete" on storage.objects;
create policy "stok_dokumen_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'stok');

notify pgrst, 'reload schema';
