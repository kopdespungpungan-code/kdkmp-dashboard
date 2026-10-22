-- =====================================================================
-- DEPLOY SEMUA SKRIP SUPABASE (satu file)
-- Jalankan di Supabase SQL Editor pada project yang akan dipakai produksi.
-- Uraikan: so_gondola.sql → product_gondola.sql → migration_tingkat_1_6.sql
--          → migration_so_gondola_kolom.sql → seed.sql → seed_product_gondola.sql
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. supabase/so_gondola.sql
-- ---------------------------------------------------------------------

-- =====================================================================
-- TABEL SO GONDOLA (jalankan di Supabase SQL Editor)
-- Input Stock Opname per petugas (Vyrda/Pandu/Rista/...), per gondola
-- atau lokasi (untuk Lia yang memakai nama lokasi).
-- =====================================================================

drop view if exists v_so_gondola_summary, v_so_gondola_terakhir;
drop table if exists so_gondola;

create table so_gondola (
  id bigserial primary key,
  tanggal date not null default current_date,
  gondola_no integer,                 -- null bila memakai gondola_lokasi (mis. Lia)
  gondola_lokasi text not null default '',
  tingkat integer not null default 1,
  petugas text not null,
  produk_id bigint references products(id) on delete set null,
  qty_fisik integer not null default 0,
  stok_sistem integer not null default 0,
  selisih integer generated always as (qty_fisik - stok_sistem) stored,
  expired date,
  rusak_exp integer default 0,
  keterangan text,
  -- Kunci wilayah (gondola atau lokasi) + tingkat. Text supaya lokasi Lia
  -- (gondola_no null) tidak saling bertabrakan seperti kalau memakai angka 0.
  gondola_key text generated always as (
    case
      when gondola_no is null then 'L:' || gondola_lokasi
      else 'G:' || gondola_no::text
    end
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index untuk query cepat
create index idx_so_gondola_tanggal on so_gondola(tanggal);
create index idx_so_gondola_gondola on so_gondola(gondola_no);
create index idx_so_gondola_petugas on so_gondola(petugas);
create index idx_so_gondola_produk on so_gondola(produk_id);

-- Satu baris per (tanggal, petugas, gondola/lokasi, tingkat, produk)
-- gondola_key membedakan tiap gondola/lokasi.
create unique index if not exists idx_so_gondola_uniq
  on so_gondola (tanggal, petugas, gondola_key, tingkat, produk_id)
  nulls not distinct;

-- RLS
alter table so_gondola enable row level security;

create policy "so_gondola_select" on so_gondola
  for select to authenticated using (true);

create policy "so_gondola_insert" on so_gondola
  for insert to authenticated with check (true);

create policy "so_gondola_update" on so_gondola
  for update to authenticated using (true);

create policy "so_gondola_delete" on so_gondola
  for delete to authenticated using (true);

-- View: ringkasan SO per gondola
create or replace view v_so_gondola_summary with (security_invoker = true) as
select
  tanggal,
  petugas,
  gondola_no,
  gondola_lokasi,
  tingkat,
  count(*) as jumlah_produk,
  coalesce(sum(qty_fisik), 0) as total_qty_fisik,
  coalesce(sum(stok_sistem), 0) as total_stok_sistem,
  coalesce(sum(selisih), 0) as total_selisih,
  coalesce(sum(rusak_exp), 0) as total_rusak_exp
from so_gondola
group by tanggal, petugas, gondola_no, gondola_lokasi, tingkat;

-- View: SO terakhir per gondola/lokasi (untuk jadwal 3 hari)
create or replace view v_so_gondola_terakhir with (security_invoker = true) as
select distinct on (gondola_key)
  gondola_no,
  gondola_lokasi,
  petugas,
  tanggal as last_so_date,
  tanggal + interval '3 days' as next_so_date
from so_gondola
order by gondola_key, tanggal desc;

notify pgrst, 'reload schema';


-- ---------------------------------------------------------------------
-- 2. supabase/product_gondola.sql
-- ---------------------------------------------------------------------

-- =====================================================================
-- PEMETAAN PRODUK -> GONDOLA / LOKASI (jalankan di Supabase SQL Editor)
-- =====================================================================

create table if not exists product_gondola (
  id bigserial primary key,
  produk_id bigint not null references products(id) on delete cascade,
  gondola_no integer,                       -- null bila memakai lokasi (mis. Lia)
  lokasi text not null default '',          -- hanya diisi bila gondola_no null
  tingkat integer not null default 1,
  -- Kunci wilayah (gondola atau lokasi).
  gondola_key text generated always as (
    case
      when gondola_no is null then 'L:' || lokasi
      else 'G:' || gondola_no::text
    end
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Lokasi hanya boleh diisi bila gondola_no kosong
  constraint product_gondola_wilayah check (
    (gondola_no is not null and lokasi = '') or
    (gondola_no is null and lokasi <> '')
  ),
  constraint product_gondola_tingkat check (tingkat >= 1)
);

create index if not exists idx_product_gondola_produk on product_gondola(produk_id);
create index if not exists idx_product_gondola_gondola on product_gondola(gondola_key, tingkat);

-- Satu produk hanya boleh terpetakan sekali per gondola/lokasi + tingkat
create unique index if not exists idx_product_gondola_uniq
  on product_gondola (produk_id, gondola_key, tingkat);

-- RLS
alter table product_gondola enable row level security;

drop policy if exists "product_gondola_select" on product_gondola;
create policy "product_gondola_select" on product_gondola
  for select to authenticated using (true);

drop policy if exists "product_gondola_insert" on product_gondola;
create policy "product_gondola_insert" on product_gondola
  for insert to authenticated with check (true);

drop policy if exists "product_gondola_update" on product_gondola;
create policy "product_gondola_update" on product_gondola
  for update to authenticated using (true);

drop policy if exists "product_gondola_delete" on product_gondola;
create policy "product_gondola_delete" on product_gondola
  for delete to authenticated using (true);

-- View: isi tiap gondola/tingkat beserta stok sistem saat ini.
create or replace view v_product_gondola with (security_invoker = true) as
select
  pg.id,
  pg.gondola_no,
  pg.lokasi as gondola_lokasi,
  pg.tingkat,
  p.id as produk_id,
  p.sku,
  p.item,
  p.gramasi,
  p.stok_toko,
  p.stok_gudang,
  p.expired_terdekat,
  p.stok_min
from product_gondola pg
join products p on p.id = pg.produk_id;

-- View: ringkasan jumlah produk terpetakan per gondola/tingkat
create or replace view v_product_gondola_ringkas with (security_invoker = true) as
select
  gondola_key,
  gondola_no,
  lokasi,
  tingkat,
  count(*) as jumlah_produk
from (
  select gondola_key, gondola_no, lokasi, tingkat from product_gondola
) x
group by gondola_key, gondola_no, lokasi, tingkat;

notify pgrst, 'reload schema';


-- ---------------------------------------------------------------------
-- 3. supabase/migration_tingkat_1_6.sql
-- ---------------------------------------------------------------------

-- =====================================================================
-- MIGRASI: tingkat 1-6 dan boleh kosong
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
create unique index if not exists idx_product_gondola_uniq_tanpa_tingkat
  on product_gondola (produk_id, gondola_key)
  where tingkat is null;

-- 4. Muat ulang cache skema PostgREST.
notify pgrst, 'reload schema';

-- Pemeriksaan
select tingkat, count(*) as jumlah_baris
from product_gondola
group by tingkat
order by tingkat nulls last;


-- ---------------------------------------------------------------------
-- 4. supabase/migration_so_gondola_kolom.sql
-- ---------------------------------------------------------------------

-- =====================================================================
-- MIGRASI: lengkapi kolom so_gondola (aman, tidak menghapus data)
-- =====================================================================

-- 1. Kolom catatan SO
alter table so_gondola add column if not exists keterangan text;

-- 2. Kunci wilayah + tingkat (text).
alter table so_gondola add column if not exists gondola_key text
  generated always as (
    case
      when gondola_no is null then 'L:' || gondola_lokasi
      else 'G:' || gondola_no::text
    end
  ) stored;

-- 3. Satu baris per tanggal + petugas + wilayah + tingkat + produk.
create unique index if not exists idx_so_gondola_uniq
  on so_gondola (tanggal, petugas, gondola_key, tingkat, produk_id);

notify pgrst, 'reload schema';


-- ---------------------------------------------------------------------
-- 5. supabase/seed.sql
-- ---------------------------------------------------------------------

-- =====================================================================
-- SEED DATA PRODUK + KARYAWAN GROCERY (diekstrak dari Excel)
-- =====================================================================

-- Produk Grocery (diekstrak dari REKAP SO sheet)
insert into products (sku, item, gramasi, supplier, pcs_per_karton, harga_beli, harga_jual, stok_toko, stok_gudang, stok_min, expired_terdekat, aktif) values
  ('SKU-001', 'Amanda Margarin Serbaguna 200g', '-', 'Supplier', 48, 49899, 57400, 42, 40, 8, '2027-12-31', true),
  ('SKU-002', 'Aquviva 1,6L', '-', 'Supplier', 13, 33967, 39100, 23, 15, 3, '2027-12-31', true),
  ('SKU-003', 'Aquviva 700ml', '-', 'Supplier', 7, 41680, 47900, 54, 34, 10, '2027-12-31', true),
  ('SKU-004', 'Asahi Canned Sarden Saus Tomat 150g', '-', 'Supplier', 31, 14983, 17200, 31, 24, 8, '2027-12-31', true),
  ('SKU-005', 'Astor Singles 12,5g', '-', 'Supplier', 25, 35553, 40900, 31, 15, 6, '2027-12-31', true),
  ('SKU-006', 'Astor Singles 250g', '-', 'Supplier', 14, 20104, 23100, 74, 7, 6, '2027-12-31', true),
  ('SKU-007', 'Bango Kecap Manis 25g', '-', 'Supplier', 19, 42000, 48300, 77, 30, 3, '2027-12-31', true),
  ('SKU-008', 'Bango Kecap Manis 265g', '-', 'Supplier', 29, 1671, 1900, 39, 13, 8, '2027-12-31', true),
  ('SKU-009', 'Bango Kecap Manis 77g', '-', 'Supplier', 9, 27488, 31600, 14, 36, 6, '2027-12-31', true),
  ('SKU-010', 'Beng Beng 374g', '-', 'Supplier', 17, 22699, 26100, 49, 33, 7, '2027-12-31', true),
  ('SKU-011', 'Beng Beng Reguler 22g', '-', 'Supplier', 24, 10786, 12400, 80, 27, 4, '2027-12-31', true),
  ('SKU-012', 'Beras Mutiara 5kg', '-', 'Supplier', 24, 38944, 44800, 79, 36, 5, '2027-12-31', true),
  ('SKU-013', 'Beras Sania 5kg', '-', 'Supplier', 43, 43720, 50300, 33, 8, 7, '2027-12-31', true),
  ('SKU-014', 'Beras SPHP', '-', 'Supplier', 43, 20655, 23800, 65, 8, 10, '2027-12-31', true),
  ('SKU-015', 'Bihun Jagung Tunas Bawang 300g', '-', 'Supplier', 24, 12284, 14100, 76, 23, 3, '2027-12-31', true),
  ('SKU-016', 'Bukrim Liquish 800ml', '-', 'Supplier', 8, 23246, 26700, 70, 18, 9, '2027-12-31', true),
  ('SKU-017', 'Cbf Extra Maxi Non Wing 8p', '-', 'Supplier', 31, 5493, 6300, 75, 10, 8, '2027-12-31', true),
  ('SKU-018', 'Charm Safe Night Wing 29cm 9p', '-', 'Supplier', 45, 49082, 56400, 48, 21, 3, '2027-12-31', true),
  ('SKU-019', 'Charm Safe Night Wing 35cm 5p', '-', 'Supplier', 20, 49428, 56800, 71, 21, 10, '2027-12-31', true),
  ('SKU-020', 'Charm Safe Night Wings 29cm 2p', '-', 'Supplier', 14, 43561, 50100, 71, 29, 10, '2027-12-31', true),
  ('SKU-021', 'Chiki Balls 16g', '-', 'Supplier', 18, 35146, 40400, 25, 6, 10, '2027-12-31', true),
  ('SKU-022', 'Chiki Twist 22,5g', '-', 'Supplier', 33, 43835, 50400, 32, 40, 8, '2027-12-31', true),
  ('SKU-023', 'Chiki Twist 75g', '-', 'Supplier', 6, 10192, 11700, 52, 25, 5, '2027-12-31', true),
  ('SKU-024', 'Chitato Lite', '-', 'Supplier', 28, 45298, 52100, 35, 7, 6, '2027-12-31', true),
  ('SKU-025', 'Chitato Sapi Panggang 15g', '-', 'Supplier', 11, 19014, 21900, 60, 32, 10, '2027-12-31', true),
  ('SKU-026', 'Chitato Sapi Panggang 65g', '-', 'Supplier', 12, 27756, 31900, 38, 30, 9, '2027-12-31', true),
  ('SKU-027', 'Ciptadent Maxi 190gr', '-', 'Supplier', 32, 6521, 7500, 49, 12, 7, '2027-12-31', true),
  ('SKU-028', 'Clear Shmp Cool Menthol 11ml', '-', 'Supplier', 13, 23964, 27600, 77, 21, 9, '2027-12-31', true),
  ('SKU-029', 'Club Botol 1500ml', '-', 'Supplier', 12, 47219, 54300, 20, 40, 10, '2027-12-31', true),
  ('SKU-030', 'Club Botol 220ml', '-', 'Supplier', 21, 18500, 21300, 10, 17, 4, '2027-12-31', true),
  ('SKU-031', 'Club Botol 600ml', '-', 'Supplier', 30, 42449, 48800, 54, 5, 9, '2027-12-31', true),
  ('SKU-032', 'Club Galon 15L', '-', 'Supplier', 48, 24890, 28600, 34, 6, 10, '2027-12-31', true),
  ('SKU-033', 'Creamy Latte', '-', 'Supplier', 30, 44738, 51400, 24, 36, 7, '2027-12-31', true),
  ('SKU-034', 'Daia Det Violet 800gr', '-', 'Supplier', 14, 5302, 6100, 43, 22, 4, '2027-12-31', true),
  ('SKU-035', 'Daia Romantic Pink 800gr', '-', 'Supplier', 28, 3435, 4000, 68, 13, 5, '2027-12-31', true),
  ('SKU-036', 'Dancow 1+ Madu 350g', '-', 'Supplier', 23, 6059, 7000, 53, 20, 4, '2027-12-31', true),
  ('SKU-037', 'Ekonomi Pencuci Piring 650ml', '-', 'Supplier', 22, 20845, 24000, 43, 39, 7, '2027-12-31', true),
  ('SKU-038', 'Floridina Orange 350ml', '-', 'Supplier', 36, 12161, 14000, 32, 14, 6, '2027-12-31', true),
  ('SKU-039', 'Garam Pasar Rame 250g', '-', 'Supplier', 39, 14343, 16500, 16, 27, 8, '2027-12-31', true),
  ('SKU-040', 'Genki Moko Moko 5+1 L1', '-', 'Supplier', 43, 6250, 7200, 74, 19, 5, '2027-12-31', true),
  ('SKU-041', 'Genki Moko Moko Pants Np L3', '-', 'Supplier', 42, 29722, 34200, 34, 8, 6, '2027-12-31', true),
  ('SKU-042', 'Genki Moko Moko Pants Np M3', '-', 'Supplier', 34, 45860, 52700, 40, 11, 9, '2027-12-31', true),
  ('SKU-043', 'Genki Moko Moko Pants Xl3', '-', 'Supplier', 23, 48927, 56300, 18, 36, 6, '2027-12-31', true),
  ('SKU-044', 'Golda Cappuccino 200ml', '-', 'Supplier', 32, 13952, 16000, 12, 39, 6, '2027-12-31', true),
  ('SKU-045', 'Ichi Ocha 350ml Green Tea', '-', 'Supplier', 35, 30593, 35200, 65, 28, 3, '2027-12-31', true),
  ('SKU-046', 'Ichi Ocha Jasmine 350ml', '-', 'Supplier', 28, 43977, 50600, 43, 21, 5, '2027-12-31', true),
  ('SKU-047', 'Imcoco Lychee 350ml', '-', 'Supplier', 43, 45551, 52400, 43, 20, 3, '2027-12-31', true),
  ('SKU-048', 'Imcoco Mango 350ml', '-', 'Supplier', 42, 11714, 13500, 59, 16, 7, '2027-12-31', true),
  ('SKU-049', 'Indofood Kecap Manis 135ml', '-', 'Supplier', 9, 39979, 46000, 31, 31, 5, '2027-12-31', true),
  ('SKU-050', 'Indofood Kecap Manis 550g', '-', 'Supplier', 45, 49163, 56500, 20, 6, 5, '2027-12-31', true),
  ('SKU-051', 'Indofood Kecap Manis 725g', '-', 'Supplier', 48, 36331, 41800, 18, 8, 8, '2027-12-31', true),
  ('SKU-052', 'Indofood Racik Ayam Goreng 26g', '-', 'Supplier', 47, 45639, 52500, 61, 35, 4, '2027-12-31', true),
  ('SKU-053', 'Indofood Racik Bumbu Ikan Goreng 20g', '-', 'Supplier', 11, 6517, 7500, 68, 23, 6, '2027-12-31', true),
  ('SKU-054', 'Indofood Racik Bumbu Marinasi 15g', '-', 'Supplier', 14, 5253, 6000, 75, 33, 5, '2027-12-31', true),
  ('SKU-055', 'Indofood Racik Bumbu Sayur Sop 20g', '-', 'Supplier', 10, 43261, 49800, 72, 38, 9, '2027-12-31', true),
  ('SKU-056', 'Indofood Racik Nasi Goreng 20g', '-', 'Supplier', 33, 13037, 15000, 10, 11, 10, '2027-12-31', true),
  ('SKU-057', 'Indofood Sambal Pedas 135ml', '-', 'Supplier', 13, 8877, 10200, 75, 5, 3, '2027-12-31', true),
  ('SKU-058', 'Indofood Sambal Pedas 275ml', '-', 'Supplier', 40, 25636, 29500, 38, 15, 9, '2027-12-31', true),
  ('SKU-059', 'Indofood Sambal Pedas 8g', '-', 'Supplier', 17, 18059, 20800, 41, 16, 4, '2027-12-31', true),
  ('SKU-060', 'Indofood Tiga Sapi Kental Manis Choco', '-', 'Supplier', 37, 25572, 29400, 36, 37, 10, '2027-12-31', true),
  ('SKU-061', 'Indofood Tiga Sapi Kental Manis Plain 490g', '-', 'Supplier', 20, 45103, 51900, 36, 12, 10, '2027-12-31', true),
  ('SKU-062', 'Indomie Ayam Bawang', '-', 'Supplier', 40, 12298, 14100, 25, 7, 6, '2027-12-31', true),
  ('SKU-063', 'Indomie Goreng Jumbo', '-', 'Supplier', 22, 40960, 47100, 80, 29, 7, '2027-12-31', true),
  ('SKU-064', 'Indomie Goreng Rasa Ayam Geprek', '-', 'Supplier', 8, 17867, 20500, 60, 39, 3, '2027-12-31', true),
  ('SKU-065', 'Indomie Goreng Rendang', '-', 'Supplier', 41, 49389, 56800, 37, 14, 8, '2027-12-31', true),
  ('SKU-066', 'Indomie Kuah Rasa Seblak Hot Jeletot', '-', 'Supplier', 40, 13975, 16100, 10, 7, 9, '2027-12-31', true),
  ('SKU-067', 'Indomie Mi Goreng Aceh', '-', 'Supplier', 29, 12238, 14100, 63, 21, 7, '2027-12-31', true),
  ('SKU-068', 'Indomie Mi Goreng Plus', '-', 'Supplier', 8, 29183, 33600, 66, 27, 9, '2027-12-31', true),
  ('SKU-069', 'Indomie Mi Nyemek Ala Bangladesh Rasa Kari', '-', 'Supplier', 14, 38485, 44300, 68, 33, 3, '2027-12-31', true),
  ('SKU-070', 'Indomie Mi Nyemek Ala Jogja Rasa Rendang', '-', 'Supplier', 31, 26398, 30400, 80, 15, 6, '2027-12-31', true),
  ('SKU-071', 'Indomie Rasa Soto Mie', '-', 'Supplier', 48, 27062, 31100, 29, 26, 9, '2027-12-31', true),
  ('SKU-072', 'Indomie Soto Spesial', '-', 'Supplier', 21, 10262, 11800, 15, 34, 9, '2027-12-31', true),
  ('SKU-073', 'Indomilk Creamy Ori 370g', '-', 'Supplier', 34, 12281, 14100, 40, 23, 4, '2027-12-31', true),
  ('SKU-074', 'Indomilk Creamy Ori 37g', '-', 'Supplier', 29, 5545, 6400, 65, 39, 6, '2027-12-31', true),
  ('SKU-075', 'Indomilk Kids Cokelat 115ml', '-', 'Supplier', 25, 1667, 1900, 49, 37, 6, '2027-12-31', true),
  ('SKU-076', 'Indomilk Kids Cokelat Steril 190ml', '-', 'Supplier', 28, 8266, 9500, 50, 19, 6, '2027-12-31', true),
  ('SKU-077', 'Indomilk Kids Melon 190ml', '-', 'Supplier', 36, 44734, 51400, 45, 16, 5, '2027-12-31', true),
  ('SKU-078', 'Indomilk Kids Stroberi 115ml', '-', 'Supplier', 48, 8479, 9800, 77, 23, 10, '2027-12-31', true),
  ('SKU-079', 'Indomilk Swiss Choco 370g', '-', 'Supplier', 7, 25403, 29200, 48, 13, 8, '2027-12-31', true),
  ('SKU-080', 'Indomilk Swiss Choco 37g', '-', 'Supplier', 23, 13303, 15300, 74, 16, 5, '2027-12-31', true),
  ('SKU-081', 'Intermi Mi Goreng', '-', 'Supplier', 29, 7966, 9200, 27, 12, 3, '2027-12-31', true),
  ('SKU-082', 'Intermi Mi Goreng Pedas', '-', 'Supplier', 20, 44326, 51000, 54, 25, 8, '2027-12-31', true),
  ('SKU-083', 'Jelly Drink Blackcurrant 120g', '-', 'Supplier', 16, 41922, 48200, 25, 6, 3, '2027-12-31', true),
  ('SKU-084', 'Jelly Drink Mango 120g', '-', 'Supplier', 12, 34817, 40000, 56, 16, 7, '2027-12-31', true),
  ('SKU-085', 'Jelly Drink Strawberry 120g', '-', 'Supplier', 12, 40115, 46100, 27, 6, 4, '2027-12-31', true),
  ('SKU-086', 'Jetz Sweet Stick 65g', '-', 'Supplier', 15, 25183, 29000, 52, 38, 8, '2027-12-31', true),
  ('SKU-087', 'Kopiko Cappucino Candy 175g', '-', 'Supplier', 46, 42455, 48800, 18, 39, 9, '2027-12-31', true),
  ('SKU-088', 'Le Mineral 600ml', '-', 'Supplier', 20, 36811, 42300, 52, 12, 3, '2027-12-31', true),
  ('SKU-089', 'Lifebuoy Lemon Fress 60g', '-', 'Supplier', 20, 27937, 32100, 79, 30, 6, '2027-12-31', true),
  ('SKU-090', 'Lifebuoy Scb Ts Total 10Rl 60g', '-', 'Supplier', 22, 23831, 27400, 78, 8, 3, '2027-12-31', true),
  ('SKU-091', 'Lifebuoy Shampo Anti Ketombe 10ml', '-', 'Supplier', 48, 29123, 33500, 35, 5, 6, '2027-12-31', true),
  ('SKU-092', 'Madu Tj Sachet', '-', 'Supplier', 46, 5159, 5900, 41, 18, 5, '2027-12-31', true),
  ('SKU-093', 'Malkist Extra Abon', '-', 'Supplier', 21, 19633, 22600, 60, 16, 9, '2027-12-31', true),
  ('SKU-094', 'Malkist Sweet Cracker', '-', 'Supplier', 12, 33882, 39000, 29, 14, 4, '2027-12-31', true),
  ('SKU-095', 'Mama Coco Santan', '-', 'Supplier', 41, 44296, 50900, 51, 28, 5, '2027-12-31', true),
  ('SKU-096', 'Mama Lemon Jeruk Nipis 690gr', '-', 'Supplier', 31, 20026, 23000, 62, 15, 9, '2027-12-31', true),
  ('SKU-097', 'Mi Telur Cap 3 Ayam', '-', 'Supplier', 19, 21267, 24500, 11, 28, 6, '2027-12-31', true),
  ('SKU-098', 'Mie Sedaap Ayam Bawang', '-', 'Supplier', 41, 19014, 21900, 71, 10, 9, '2027-12-31', true),
  ('SKU-099', 'Mie Sedaap Cup Goreng', '-', 'Supplier', 40, 27747, 31900, 12, 40, 8, '2027-12-31', true),
  ('SKU-100', 'Mie Sedaap Goreng', '-', 'Supplier', 48, 39931, 45900, 19, 15, 10, '2027-12-31', true),
  ('SKU-101', 'Mie Sedaap Kuah Rasa Soto', '-', 'Supplier', 7, 13498, 15500, 48, 5, 6, '2027-12-31', true),
  ('SKU-102', 'Migelas Rasa Ayam Bawang', '-', 'Supplier', 39, 48419, 55700, 74, 25, 5, '2027-12-31', true),
  ('SKU-103', 'Migelas Rasa Baso Sapi', '-', 'Supplier', 41, 47877, 55100, 22, 5, 9, '2027-12-31', true),
  ('SKU-104', 'Migelas Rasa Sop Buntut', '-', 'Supplier', 41, 44288, 50900, 20, 19, 8, '2027-12-31', true),
  ('SKU-105', 'Migelas Soto Ayam', '-', 'Supplier', 26, 2131, 2500, 59, 23, 7, '2027-12-31', true),
  ('SKU-106', 'Mila Tepung Terigu Serbaguna 1kg', '-', 'Supplier', 18, 40968, 47100, 67, 13, 5, '2027-12-31', true),
  ('SKU-107', 'Milo Sachet 22g', '-', 'Supplier', 13, 7751, 8900, 14, 17, 7, '2027-12-31', true),
  ('SKU-108', 'Minijelly 5S 15g Isi 5 Cup', '-', 'Supplier', 11, 8327, 9600, 16, 19, 4, '2027-12-31', true),
  ('SKU-109', 'Minipudding Mix Flavour 15g Isi 10 Cup', '-', 'Supplier', 32, 27021, 31100, 25, 5, 10, '2027-12-31', true),
  ('SKU-110', 'Minyak Goreng Fortune 1L', '-', 'Supplier', 14, 7749, 8900, 59, 5, 7, '2027-12-31', true),
  ('SKU-111', 'Minyak Goreng Fortune 2L', '-', 'Supplier', 14, 24725, 28400, 70, 6, 8, '2027-12-31', true),
  ('SKU-112', 'Minyak Goreng Siip 1,8L', '-', 'Supplier', 46, 18470, 21200, 24, 8, 4, '2027-12-31', true),
  ('SKU-113', 'Molto Aio Blue 10ml', '-', 'Supplier', 10, 30589, 35200, 20, 8, 8, '2027-12-31', true),
  ('SKU-114', 'Molto AIO Pink 10ml', '-', 'Supplier', 47, 29387, 33800, 75, 37, 9, '2027-12-31', true),
  ('SKU-115', 'Nata De Coco Cup Lychee 200g', '-', 'Supplier', 40, 45649, 52500, 53, 7, 3, '2027-12-31', true),
  ('SKU-116', 'Nata De Coco Cup Selasih Strawberry 200g', '-', 'Supplier', 41, 35882, 41300, 41, 40, 5, '2027-12-31', true),
  ('SKU-117', 'Nescafe', '-', 'Supplier', 26, 14829, 17100, 39, 31, 6, '2027-12-31', true),
  ('SKU-118', 'Nestle Bear Brand 189ml', '-', 'Supplier', 48, 15313, 17600, 77, 28, 10, '2027-12-31', true),
  ('SKU-119', 'Nuvo Family Body Wash 400gr', '-', 'Supplier', 36, 22298, 25600, 56, 25, 5, '2027-12-31', true),
  ('SKU-120', 'Palmia Margarin Serbaguna 200g', '-', 'Supplier', 41, 18352, 21100, 74, 7, 4, '2027-12-31', true),
  ('SKU-121', 'Pepsodent White 75g', '-', 'Supplier', 9, 43017, 49500, 11, 15, 9, '2027-12-31', true),
  ('SKU-122', 'Pop Mie Rasa Baso', '-', 'Supplier', 28, 23590, 27100, 59, 11, 4, '2027-12-31', true),
  ('SKU-123', 'Potabee 65g', '-', 'Supplier', 44, 27616, 31800, 72, 13, 6, '2027-12-31', true),
  ('SKU-124', 'Promina Ayam Kampung Brokoli Keju 120g', '-', 'Supplier', 9, 48480, 55800, 18, 33, 8, '2027-12-31', true),
  ('SKU-125', 'Promina Salmon Norwegia 100g', '-', 'Supplier', 7, 48381, 55600, 38, 18, 8, '2027-12-31', true),
  ('SKU-126', 'Promina Seaweed 20g', '-', 'Supplier', 43, 36916, 42500, 65, 37, 6, '2027-12-31', true),
  ('SKU-127', 'Promina Smooth Kacang Hijau 120g', '-', 'Supplier', 47, 44662, 51400, 27, 33, 10, '2027-12-31', true),
  ('SKU-128', 'Protex Daily Comfort Night Bag 22', '-', 'Supplier', 22, 26544, 30500, 27, 21, 7, '2027-12-31', true),
  ('SKU-129', 'Pudding Puree Cup Mango 120g', '-', 'Supplier', 20, 13574, 15600, 45, 7, 6, '2027-12-31', true),
  ('SKU-130', 'Pudding Puree Cup Markisa 120g', '-', 'Supplier', 38, 29506, 33900, 23, 35, 10, '2027-12-31', true),
  ('SKU-131', 'Qtella Singkong', '-', 'Supplier', 10, 46523, 53500, 59, 35, 10, '2027-12-31', true),
  ('SKU-132', 'Refina Garam Meja 500g', '-', 'Supplier', 45, 12546, 14400, 24, 37, 5, '2027-12-31', true),
  ('SKU-133', 'Rexona Fmd Sdcrm Nap Ltn Hijab 9g', '-', 'Supplier', 38, 34021, 39100, 58, 8, 10, '2027-12-31', true),
  ('SKU-134', 'Rexona Male Ice Cool Sch 9g', '-', 'Supplier', 39, 28973, 33300, 33, 8, 5, '2027-12-31', true),
  ('SKU-135', 'Rinso Molto Rose 20ml', '-', 'Supplier', 23, 19660, 22600, 41, 27, 5, '2027-12-31', true),
  ('SKU-136', 'Roma Biskuit Kelapa 300g', '-', 'Supplier', 47, 12474, 14300, 71, 15, 4, '2027-12-31', true),
  ('SKU-137', 'Roma Malkist Extra Abon 105g', '-', 'Supplier', 17, 15188, 17500, 10, 28, 9, '2027-12-31', true),
  ('SKU-138', 'Roma Malkist Sweet Cracker 105g', '-', 'Supplier', 28, 25869, 29700, 17, 16, 4, '2027-12-31', true),
  ('SKU-139', 'Royal Sweet Floral 680ml', '-', 'Supplier', 34, 43001, 49500, 63, 40, 10, '2027-12-31', true),
  ('SKU-140', 'Royco Ayam Kampung', '-', 'Supplier', 29, 11552, 13300, 44, 20, 10, '2027-12-31', true),
  ('SKU-141', 'Sambal Fried Chicken 8g', '-', 'Supplier', 37, 12011, 13800, 37, 31, 6, '2027-12-31', true),
  ('SKU-142', 'Sania Tepung Beras 500g', '-', 'Supplier', 16, 2463, 2800, 61, 24, 9, '2027-12-31', true),
  ('SKU-143', 'Sarimi Goreng Isi 2 Ayam Kecap', '-', 'Supplier', 43, 21771, 25000, 79, 40, 3, '2027-12-31', true),
  ('SKU-144', 'Scotch-Brite Spons 100x70', '-', 'Supplier', 40, 47885, 55100, 31, 26, 4, '2027-12-31', true),
  ('SKU-145', 'Sedaap Kecap Manis 725g', '-', 'Supplier', 43, 33237, 38200, 34, 15, 4, '2027-12-31', true),
  ('SKU-146', 'Siip Tepung Serbaguna 1kg', '-', 'Supplier', 28, 11250, 12900, 60, 25, 5, '2027-12-31', true),
  ('SKU-147', 'Slai Olai Blueberry (eceran)', '-', 'Supplier', 43, 30883, 35500, 29, 19, 10, '2027-12-31', true),
  ('SKU-148', 'Slai Olai Blueberry 320g', '-', 'Supplier', 39, 32691, 37600, 30, 13, 4, '2027-12-31', true),
  ('SKU-149', 'Slai Olai Strawberry (eceran)', '-', 'Supplier', 19, 23627, 27200, 68, 12, 4, '2027-12-31', true),
  ('SKU-150', 'Slai Olai Strawberry 320g', '-', 'Supplier', 18, 21656, 24900, 64, 33, 3, '2027-12-31', true),
  ('SKU-151', 'So Soft Rose&Waterily 700ml', '-', 'Supplier', 31, 45143, 51900, 39, 18, 4, '2027-12-31', true),
  ('SKU-152', 'So Soft Sweet Peony', '-', 'Supplier', 23, 2954, 3400, 14, 7, 6, '2027-12-31', true),
  ('SKU-153', 'Soklin Det Parfume 700ml', '-', 'Supplier', 45, 35367, 40700, 12, 18, 8, '2027-12-31', true),
  ('SKU-154', 'Soklin Liquid Lavender 525ml', '-', 'Supplier', 46, 41246, 47400, 76, 26, 5, '2027-12-31', true),
  ('SKU-155', 'Soklin Soft Purple 700g', '-', 'Supplier', 28, 35421, 40700, 32, 5, 3, '2027-12-31', true),
  ('SKU-156', 'Sosis Eat 40g', '-', 'Supplier', 33, 47471, 54600, 74, 26, 4, '2027-12-31', true),
  ('SKU-157', 'Sun Beras Merah Ekonomis 120g', '-', 'Supplier', 34, 33799, 38900, 38, 37, 8, '2027-12-31', true),
  ('SKU-158', 'Sun Box Beras Merah 120g', '-', 'Supplier', 7, 41067, 47200, 44, 11, 7, '2027-12-31', true),
  ('SKU-159', 'Sun Box Kacang Hijau 120g', '-', 'Supplier', 42, 19172, 22000, 36, 7, 8, '2027-12-31', true),
  ('SKU-160', 'Sunlight Lime 111ml', '-', 'Supplier', 6, 12660, 14600, 39, 10, 5, '2027-12-31', true),
  ('SKU-161', 'Sunlight Lime Cream 175gr', '-', 'Supplier', 22, 29207, 33600, 74, 30, 6, '2027-12-31', true),
  ('SKU-162', 'Sunslik Black Shine 9ml', '-', 'Supplier', 41, 38730, 44500, 42, 22, 3, '2027-12-31', true),
  ('SKU-163', 'Sunslik Shof & Smooth 9ml', '-', 'Supplier', 16, 9218, 10600, 77, 8, 7, '2027-12-31', true),
  ('SKU-164', 'Superstar Full Chocolate 12,5g', '-', 'Supplier', 46, 29444, 33900, 14, 8, 7, '2027-12-31', true),
  ('SKU-165', 'Susu Indofood Enak 370g (Dedik)', '-', 'Supplier', 6, 43650, 50200, 72, 36, 5, '2027-12-31', true),
  ('SKU-166', 'Teh Pucuk 350ml', '-', 'Supplier', 40, 28935, 33300, 16, 29, 4, '2027-12-31', true),
  ('SKU-167', 'Tepung Terigu Lencana Merah 1kg', '-', 'Supplier', 31, 23844, 27400, 67, 6, 5, '2027-12-31', true),
  ('SKU-168', 'Top Coffee Gula Aren', '-', 'Supplier', 12, 14716, 16900, 47, 31, 5, '2027-12-31', true),
  ('SKU-169', 'Tora Moka', '-', 'Supplier', 25, 49646, 57100, 23, 24, 4, '2027-12-31', true),
  ('SKU-170', 'Tora Susu', '-', 'Supplier', 32, 16470, 18900, 72, 39, 8, '2027-12-31', true),
  ('SKU-171', 'Total De Parfum Oriental Bloom 20ml', '-', 'Supplier', 46, 33447, 38500, 51, 11, 6, '2027-12-31', true),
  ('SKU-172', 'Tujuh Kurma', '-', 'Supplier', 34, 41396, 47600, 39, 35, 3, '2027-12-31', true),
  ('SKU-173', 'Zinc Shampoo Refreshing Cool Btl 170', '-', 'Supplier', 12, 16956, 19500, 31, 24, 5, '2027-12-31', true),
  ('SKU-174', 'Gas LPG 3 KG', '-', 'Supplier', 15, 21842, 25100, 46, 18, 4, '2027-12-31', true),
  ('SKU-175', 'Malkist Chocholate 21 Gr', '-', 'Supplier', 14, 48198, 55400, 60, 16, 6, '2027-12-31', true),
  ('SKU-176', 'Golda Dolce Latte 200 ml', '-', 'Supplier', 30, 23375, 26900, 27, 8, 6, '2027-12-31', true);

-- Reset sequence
select setval('products_id_seq', (select max(id) from products));

-- Tabel Karyawan (petugas SO Gondola)
create table if not exists karyawan (
  id bigserial primary key,
  nama text not null,
  jabatan text,
  jenis text default 'internal',
  gondola_range text,
  aktif boolean default true,
  created_at timestamptz default now()
);

-- Enable RLS
alter table karyawan enable row level security;
create policy "karyawan_select" on karyawan for select to authenticated using (true);
create policy "karyawan_insert" on karyawan for insert to authenticated with check (true);
create policy "karyawan_update" on karyawan for update to authenticated using (true);

-- Seed data karyawan
insert into karyawan (nama, jabatan, jenis, gondola_range, aktif) values
  ('Vyrda Ayu Lestari', 'Petugas SO Gondola', 'internal', 'Gondola 1-12', true),
  ('Pandu', 'Petugas SO Gondola', 'internal', 'Gondola 13-24', true),
  ('Rista', 'Petugas SO Gondola', 'internal', 'Gondola 25-36', true),
  ('Dedik', 'Petugas SO Gondola', 'internal', 'Gondola 37-48', true),
  ('Imel', 'Petugas SO Gondola', 'internal', 'Gondola 49-60', true),
  ('Lia Agustina', 'Petugas SO Gondola', 'internal', 'Gondola Depan & Belakang', true),
  ('MUHAMMAD ARIFAT', 'Manager / Pengawas', 'internal', 'Semua Gondola', true);


-- ---------------------------------------------------------------------
-- 6. supabase/seed_product_gondola.sql
-- ---------------------------------------------------------------------

-- =====================================================================
-- SEED PEMETAAN PRODUK -> GONDOLA (dibuat otomatis)
-- =====================================================================

-- Kosongkan dulu supaya skrip ini aman dijalankan ulang
truncate table product_gondola restart identity;

-- (produk_id, gondola_no, lokasi, tingkat)
insert into product_gondola (produk_id, gondola_no, lokasi, tingkat)
select p.id, v.gondola_no, v.lokasi, v.tingkat
from (values
  ('Minyak Goreng Fortune 1L'::text, 1, ''::text, 2),
  ('Minyak Goreng Fortune 1L'::text, 1, ''::text, 3),
  ('Minyak Goreng Fortune 1L'::text, 2, ''::text, 2),
  ('Minyak Goreng Fortune 1L'::text, 2, ''::text, 3),
  ('Minyak Goreng Fortune 2L'::text, 2, ''::text, 4),
  ('Minyak Goreng Fortune 2L'::text, 2, ''::text, 5),
  ('Minyak Goreng Fortune 1L'::text, 3, ''::text, 2),
  ('Minyak Goreng Fortune 1L'::text, 3, ''::text, 3),
  ('Minyak Goreng Fortune 2L'::text, 3, ''::text, 4),
  ('Minyak Goreng Fortune 2L'::text, 3, ''::text, 5),
  ('Minyak Goreng Fortune 1L'::text, 4, ''::text, 2),
  ('Minyak Goreng Fortune 1L'::text, 4, ''::text, 3),
  ('Minyak Goreng Fortune 2L'::text, 4, ''::text, 4),
  ('Minyak Goreng Fortune 2L'::text, 4, ''::text, 5),
  ('Minyak Goreng Fortune 1L'::text, 5, ''::text, 2),
  ('Minyak Goreng Fortune 1L'::text, 5, ''::text, 3),
  ('Minyak Goreng Fortune 2L'::text, 5, ''::text, 4),
  ('Minyak Goreng Fortune 2L'::text, 5, ''::text, 5),
  ('Beras Mutiara 5kg'::text, 5, ''::text, 6),
  ('Minyak Goreng Fortune 1L'::text, 6, ''::text, 2),
  ('Minyak Goreng Fortune 1L'::text, 6, ''::text, 3),
  ('Minyak Goreng Fortune 2L'::text, 6, ''::text, 4),
  ('Minyak Goreng Fortune 2L'::text, 6, ''::text, 5),
  ('Beras Sania 5kg'::text, 6, ''::text, 6),
  ('Minyak Goreng Siip 1,8L'::text, 7, ''::text, 2),
  ('Minyak Goreng Siip 1,8L'::text, 7, ''::text, 3),
  ('Minyak Goreng Siip 1,8L'::text, 7, ''::text, 4),
  ('Minyak Goreng Siip 1,8L'::text, 7, ''::text, 5),
  ('Beras Sania 5kg'::text, 7, ''::text, 6),
  ('Minyak Goreng Siip 1,8L'::text, 8, ''::text, 3),
  ('Sun Box Beras Merah 120g'::text, 9, ''::text, 2),
  ('Promina Salmon Norwegia 100g'::text, 9, ''::text, 3),
  ('Sun Beras Merah Ekonomis 120g'::text, 9, ''::text, 4),
  ('Sun Beras Merah Ekonomis 120g'::text, 9, ''::text, 5),
  ('Sun Box Kacang Hijau 120g'::text, 10, ''::text, 2),
  ('Promina Ayam Kampung Brokoli Keju 120g'::text, 10, ''::text, 3),
  ('Promina Smooth Kacang Hijau 120g'::text, 10, ''::text, 4),
  ('Promina Seaweed 20g'::text, 10, ''::text, 5),
  ('Dancow 1+ Madu 350g'::text, 11, ''::text, 2),
  ('Dancow 1+ Madu 350g'::text, 11, ''::text, 3),
  ('Dancow 1+ Madu 350g'::text, 11, ''::text, 4),
  ('Dancow 1+ Madu 350g'::text, 11, ''::text, 5),
  ('Intermi Mi Goreng'::text, 12, ''::text, 2),
  ('Intermi Mi Goreng'::text, 12, ''::text, 3),
  ('Intermi Mi Goreng Pedas'::text, 12, ''::text, 4),
  ('Mi Telur Cap 3 Ayam'::text, 12, ''::text, 5),
  ('Indomie Mi Goreng Plus'::text, 13, ''::text, 2),
  ('Indomie Mi Goreng Plus'::text, 13, ''::text, 3),
  ('Indomie Goreng Rendang'::text, 13, ''::text, 4),
  ('Sarimi Goreng Isi 2 Ayam Kecap'::text, 13, ''::text, 5),
  ('Indomie Goreng Rasa Ayam Geprek'::text, 14, ''::text, 2),
  ('Indomie Mi Nyemek Ala Jogja Rasa Rendang'::text, 14, ''::text, 3),
  ('Indomie Mi Nyemek Ala Bangladesh Rasa Kari'::text, 14, ''::text, 4),
  ('Indomie Kuah Rasa Seblak Hot Jeletot'::text, 15, ''::text, 2),
  ('Indomie Mi Goreng Aceh'::text, 15, ''::text, 3),
  ('Indomie Rasa Soto Mie'::text, 15, ''::text, 4),
  ('Indomie Goreng Jumbo'::text, 15, ''::text, 5),
  ('Bihun Jagung Tunas Bawang 300g'::text, 16, ''::text, 2),
  ('Migelas Rasa Sop Buntut'::text, 16, ''::text, 6),
  ('Migelas Rasa Ayam Bawang'::text, 17, ''::text, 6),
  ('Pop Mie Rasa Baso'::text, 18, ''::text, 1),
  ('Mie Sedaap Kuah Rasa Soto'::text, 18, ''::text, 2),
  ('Mie Sedaap Kuah Rasa Soto'::text, 18, ''::text, 3),
  ('Migelas Rasa Baso Sapi'::text, 18, ''::text, 6),
  ('Mie Sedaap Cup Goreng'::text, 19, ''::text, 1),
  ('Mie Sedaap Goreng'::text, 19, ''::text, 2),
  ('Mie Sedaap Goreng'::text, 19, ''::text, 3),
  ('Mie Sedaap Ayam Bawang'::text, 19, ''::text, 4),
  ('Mie Sedaap Ayam Bawang'::text, 19, ''::text, 5),
  ('Migelas Soto Ayam'::text, 19, ''::text, 6),
  ('Asahi Canned Sarden Saus Tomat 150g'::text, 20, ''::text, 1),
  ('Indofood Racik Nasi Goreng 20g'::text, 20, ''::text, 2),
  ('Indofood Racik Ayam Goreng 26g'::text, 20, ''::text, 3),
  ('Indofood Racik Bumbu Marinasi 15g'::text, 20, ''::text, 4),
  ('Indofood Racik Bumbu Ikan Goreng 20g'::text, 20, ''::text, 5),
  ('Indofood Racik Bumbu Sayur Sop 20g'::text, 20, ''::text, 6),
  ('Siip Tepung Serbaguna 1kg'::text, 21, ''::text, 1),
  ('Mila Tepung Terigu Serbaguna 1kg'::text, 21, ''::text, 2),
  ('Sania Tepung Beras 500g'::text, 21, ''::text, 3),
  ('Tepung Terigu Lencana Merah 1kg'::text, 21, ''::text, 4),
  ('Amanda Margarin Serbaguna 200g'::text, 21, ''::text, 5),
  ('Palmia Margarin Serbaguna 200g'::text, 21, ''::text, 6),
  ('Siip Tepung Serbaguna 1kg'::text, 22, ''::text, 1),
  ('Mila Tepung Terigu Serbaguna 1kg'::text, 22, ''::text, 2),
  ('Sania Tepung Beras 500g'::text, 22, ''::text, 3),
  ('Tepung Terigu Lencana Merah 1kg'::text, 22, ''::text, 4),
  ('Club Botol 220ml'::text, 24, ''::text, 4),
  ('Club Botol 600ml'::text, 24, ''::text, 5),
  ('Club Botol 1500ml'::text, 24, ''::text, 6),
  ('Le Mineral 600ml'::text, 25, ''::text, 5),
  ('Ichi Ocha Jasmine 350ml'::text, 26, ''::text, 2),
  ('Ichi Ocha Jasmine 350ml'::text, 26, ''::text, 3),
  ('Floridina Orange 350ml'::text, 26, ''::text, 4),
  ('Teh Pucuk 350ml'::text, 27, ''::text, 3),
  ('Aquviva 700ml'::text, 27, ''::text, 5),
  ('Aquviva 1,6L'::text, 27, ''::text, 6),
  ('Indofood Sambal Pedas 135ml'::text, 28, ''::text, 1),
  ('Indofood Sambal Pedas 275ml'::text, 28, ''::text, 2),
  ('Indofood Sambal Pedas 8g'::text, 28, ''::text, 3),
  ('Indofood Kecap Manis 135ml'::text, 29, ''::text, 1),
  ('Indofood Sambal Pedas 275ml'::text, 29, ''::text, 2),
  ('Sambal Fried Chicken 8g'::text, 29, ''::text, 3),
  ('Sambal Fried Chicken 8g'::text, 29, ''::text, 4),
  ('Bango Kecap Manis 77g'::text, 30, ''::text, 1),
  ('Bango Kecap Manis 265g'::text, 30, ''::text, 2),
  ('Bango Kecap Manis 265g'::text, 30, ''::text, 3),
  ('Indofood Kecap Manis 550g'::text, 30, ''::text, 4),
  ('Indofood Kecap Manis 725g'::text, 30, ''::text, 5),
  ('Sedaap Kecap Manis 725g'::text, 30, ''::text, 6),
  ('Royco Ayam Kampung'::text, 31, ''::text, 1),
  ('Bango Kecap Manis 25g'::text, 31, ''::text, 3),
  ('Royco Ayam Kampung'::text, 32, ''::text, 1),
  ('Mama Coco Santan'::text, 32, ''::text, 3),
  ('Garam Pasar Rame 250g'::text, 32, ''::text, 4),
  ('Refina Garam Meja 500g'::text, 32, ''::text, 5),
  ('Madu Tj Sachet'::text, 33, ''::text, 1),
  ('Tora Susu'::text, 35, ''::text, 1),
  ('Tora Susu'::text, 35, ''::text, 2),
  ('Tora Moka'::text, 35, ''::text, 3),
  ('Tora Moka'::text, 35, ''::text, 4),
  ('Creamy Latte'::text, 35, ''::text, 5),
  ('Top Coffee Gula Aren'::text, 35, ''::text, 6),
  ('Indomilk Creamy Ori 370g'::text, 36, ''::text, 1),
  ('Indofood Tiga Sapi Kental Manis Plain 490g'::text, 36, ''::text, 2),
  ('Indomilk Kids Stroberi 115ml'::text, 36, ''::text, 3),
  ('Indomilk Kids Cokelat Steril 190ml'::text, 36, ''::text, 4),
  ('Indomilk Creamy Ori 37g'::text, 36, ''::text, 5),
  ('Indomilk Swiss Choco 370g'::text, 36, ''::text, 6),
  ('Indofood Tiga Sapi Kental Manis Choco'::text, 37, ''::text, 1),
  ('Susu Indofood Enak 370g (Dedik)'::text, 37, ''::text, 2),
  ('Indomilk Kids Cokelat 115ml'::text, 37, ''::text, 3),
  ('Indomilk Kids Cokelat 115ml'::text, 37, ''::text, 4),
  ('Tujuh Kurma'::text, 37, ''::text, 5),
  ('Milo Sachet 22g'::text, 38, ''::text, 1),
  ('Milo Sachet 22g'::text, 38, ''::text, 2),
  ('Nestle Bear Brand 189ml'::text, 38, ''::text, 3),
  ('Nestle Bear Brand 189ml'::text, 38, ''::text, 4),
  ('Nestle Bear Brand 189ml'::text, 38, ''::text, 5),
  ('Nestle Bear Brand 189ml'::text, 39, ''::text, 2),
  ('Nestle Bear Brand 189ml'::text, 39, ''::text, 3),
  ('Nestle Bear Brand 189ml'::text, 39, ''::text, 4),
  ('Sosis Eat 40g'::text, 40, ''::text, 1),
  ('Sosis Eat 40g'::text, 40, ''::text, 2),
  ('Malkist Sweet Cracker'::text, 40, ''::text, 4),
  ('Malkist Sweet Cracker'::text, 40, ''::text, 5),
  ('Astor Singles 250g'::text, 41, ''::text, 1),
  ('Astor Singles 250g'::text, 41, ''::text, 2),
  ('Beng Beng 374g'::text, 41, ''::text, 3),
  ('Beng Beng 374g'::text, 41, ''::text, 4),
  ('Malkist Extra Abon'::text, 41, ''::text, 5),
  ('Malkist Extra Abon'::text, 41, ''::text, 6),
  ('Roma Biskuit Kelapa 300g'::text, 42, ''::text, 1),
  ('Slai Olai Strawberry 320g'::text, 42, ''::text, 2),
  ('Roma Malkist Extra Abon 105g'::text, 42, ''::text, 3),
  ('Malkist Chocholate 21 Gr'::text, 42, ''::text, 4),
  ('Roma Malkist Sweet Cracker 105g'::text, 42, ''::text, 5),
  ('Roma Biskuit Kelapa 300g'::text, 43, ''::text, 1),
  ('Slai Olai Blueberry 320g'::text, 43, ''::text, 2),
  ('Roma Malkist Extra Abon 105g'::text, 43, ''::text, 3),
  ('Malkist Extra Abon'::text, 43, ''::text, 4),
  ('Roma Malkist Sweet Cracker 105g'::text, 43, ''::text, 5),
  ('Chiki Twist 22,5g'::text, 45, ''::text, 2),
  ('Qtella Singkong'::text, 45, ''::text, 3),
  ('Chiki Twist 75g'::text, 46, ''::text, 1),
  ('Chitato Sapi Panggang 15g'::text, 46, ''::text, 2),
  ('Chiki Twist 75g'::text, 47, ''::text, 1),
  ('Chiki Twist 22,5g'::text, 47, ''::text, 2),
  ('Chitato Sapi Panggang 15g'::text, 47, ''::text, 3),
  ('Chitato Sapi Panggang 65g'::text, 48, ''::text, 1),
  ('Chitato Lite'::text, 48, ''::text, 2),
  ('Chitato Sapi Panggang 65g'::text, 48, ''::text, 3),
  ('Chiki Balls 16g'::text, 48, ''::text, 5),
  ('Jetz Sweet Stick 65g'::text, 49, ''::text, 1),
  ('Kopiko Cappucino Candy 175g'::text, 49, ''::text, 2),
  ('Superstar Full Chocolate 12,5g'::text, 49, ''::text, 3),
  ('Chiki Balls 16g'::text, 49, ''::text, 4),
  ('Potabee 65g'::text, 50, ''::text, 1),
  ('Charm Safe Night Wings 29cm 2p'::text, 50, ''::text, 2),
  ('Charm Safe Night Wing 29cm 9p'::text, 50, ''::text, 3),
  ('Charm Safe Night Wing 35cm 5p'::text, 50, ''::text, 4),
  ('Cbf Extra Maxi Non Wing 8p'::text, 50, ''::text, 5),
  ('Protex Daily Comfort Night Bag 22'::text, 51, ''::text, 1),
  ('Genki Moko Moko 5+1 L1'::text, 51, ''::text, 2),
  ('Genki Moko Moko Pants Np L3'::text, 51, ''::text, 3),
  ('Genki Moko Moko Pants Np M3'::text, 51, ''::text, 4),
  ('Genki Moko Moko Pants Xl3'::text, 51, ''::text, 5),
  ('Scotch-Brite Spons 100x70'::text, 52, ''::text, 1),
  ('Rinso Molto Rose 20ml'::text, 52, ''::text, 2),
  ('Molto Aio Blue 10ml'::text, 52, ''::text, 3),
  ('Total De Parfum Oriental Bloom 20ml'::text, 52, ''::text, 4),
  ('Soklin Liquid Lavender 525ml'::text, 53, ''::text, 1),
  ('Molto AIO Pink 10ml'::text, 53, ''::text, 2),
  ('Soklin Det Parfume 700ml'::text, 54, ''::text, 1),
  ('Royal Sweet Floral 680ml'::text, 54, ''::text, 2),
  ('Daia Det Violet 800gr'::text, 54, ''::text, 3),
  ('So Soft Rose&Waterily 700ml'::text, 55, ''::text, 1),
  ('So Soft Sweet Peony'::text, 55, ''::text, 2),
  ('Daia Romantic Pink 800gr'::text, 55, ''::text, 3),
  ('Soklin Soft Purple 700g'::text, 55, ''::text, 4),
  ('Ekonomi Pencuci Piring 650ml'::text, 56, ''::text, 1),
  ('Mama Lemon Jeruk Nipis 690gr'::text, 56, ''::text, 2),
  ('Bukrim Liquish 800ml'::text, 56, ''::text, 3),
  ('Sunlight Lime 111ml'::text, 57, ''::text, 1),
  ('Sunlight Lime Cream 175gr'::text, 57, ''::text, 2),
  ('Clear Shmp Cool Menthol 11ml'::text, 58, ''::text, 1),
  ('Sunslik Shof & Smooth 9ml'::text, 58, ''::text, 2),
  ('Sunslik Black Shine 9ml'::text, 58, ''::text, 3),
  ('Pepsodent White 75g'::text, 58, ''::text, 4),
  ('Ciptadent Maxi 190gr'::text, 58, ''::text, 5),
  ('Nuvo Family Body Wash 400gr'::text, 58, ''::text, 6),
  ('Rexona Fmd Sdcrm Nap Ltn Hijab 9g'::text, 59, ''::text, 1),
  ('Rexona Male Ice Cool Sch 9g'::text, 59, ''::text, 2),
  ('Lifebuoy Shampo Anti Ketombe 10ml'::text, 59, ''::text, 3),
  ('Zinc Shampoo Refreshing Cool Btl 170'::text, 59, ''::text, 4),
  ('Lifebuoy Scb Ts Total 10Rl 60g'::text, 59, ''::text, 5),
  ('Lifebuoy Lemon Fress 60g'::text, 59, ''::text, 6),
  ('Roma Malkist Extra Abon 105g'::text, null::integer, 'DEPAN KASIR'::text, 1),
  ('Malkist Sweet Cracker'::text, null::integer, 'DEPAN KASIR'::text, 1),
  ('Superstar Full Chocolate 12,5g'::text, null::integer, 'DEPAN KASIR'::text, 1),
  ('Astor Singles 12,5g'::text, null::integer, 'DEPAN KASIR'::text, 1),
  ('Slai Olai Blueberry 320g'::text, null::integer, 'DEPAN KASIR'::text, 1),
  ('Slai Olai Strawberry 320g'::text, null::integer, 'DEPAN KASIR'::text, 1),
  ('Jetz Sweet Stick 65g'::text, null::integer, 'DEPAN KASIR'::text, 1),
  ('Minyak Goreng Siip 1,8L'::text, null::integer, 'GONDOLA BELAKANG UTARA'::text, 1),
  ('Minyak Goreng Fortune 2L'::text, null::integer, 'GONDOLA BELAKANG TENGAH'::text, 1),
  ('Minyak Goreng Fortune 1L'::text, null::integer, 'GONDOLA BELAKANG SELATAN'::text, 1),
  ('Nescafe'::text, null::integer, 'GONDOLA DEPAN UTARA'::text, 1),
  ('Nestle Bear Brand 189ml'::text, null::integer, 'GONDOLA DEPAN TENGAH'::text, 1),
  ('Golda Cappuccino 200ml'::text, null::integer, 'GONDOLA DEPAN TENGAH'::text, 1),
  ('Jelly Drink Blackcurrant 120g'::text, null::integer, 'GONDOLA DEPAN SELATAN'::text, 1),
  ('Jelly Drink Strawberry 120g'::text, null::integer, 'GONDOLA DEPAN SELATAN'::text, 1),
  ('Nata De Coco Cup Lychee 200g'::text, null::integer, 'GONDOLA DEPAN SELATAN'::text, 1),
  ('Minijelly 5S 15g Isi 5 Cup'::text, null::integer, 'GONDOLA DEPAN SELATAN'::text, 1),
  ('Jelly Drink Mango 120g'::text, null::integer, 'GONDOLA DEPAN SELATAN'::text, 1),
  ('Pudding Puree Cup Mango 120g'::text, null::integer, 'GONDOLA DEPAN TENGAH'::text, 1),
  ('Imcoco Lychee 350ml'::text, null::integer, 'GONDOLA DEPAN TENGAH'::text, 1),
  ('Minipudding Mix Flavour 15g Isi 10 Cup'::text, null::integer, 'GONDOLA DEPAN TENGAH'::text, 1)
) as v(item, gondola_no, lokasi, tingkat)
join products p on p.item = v.item;

-- Barang di Excel yang tidak ketemu di tabel products (perlu dicek manual)
select x.item as nama_di_excel
from (values
  ('Amanda Margarin Serbaguna 200g'::text),
  ('Aquviva 1,6L'::text),
  ('Aquviva 700ml'::text),
  ('Asahi Canned Sarden Saus Tomat 150g'::text),
  ('Astor Singles 12,5g'::text),
  ('Astor Singles 250g'::text),
  ('Bango Kecap Manis 25g'::text),
  ('Bango Kecap Manis 265g'::text),
  ('Bango Kecap Manis 77g'::text),
  ('Beng Beng 374g'::text),
  ('Beras Mutiara 5kg'::text),
  ('Beras Sania 5kg'::text),
  ('Bihun Jagung Tunas Bawang 300g'::text),
  ('Bukrim Liquish 800ml'::text),
  ('Cbf Extra Maxi Non Wing 8p'::text),
  ('Charm Safe Night Wing 29cm 9p'::text),
  ('Charm Safe Night Wing 35cm 5p'::text),
  ('Charm Safe Night Wings 29cm 2p'::text),
  ('Chiki Balls 16g'::text),
  ('Chiki Twist 22,5g'::text),
  ('Chiki Twist 75g'::text),
  ('Chitato Lite'::text),
  ('Chitato Sapi Panggang 15g'::text),
  ('Chitato Sapi Panggang 65g'::text),
  ('Ciptadent Maxi 190gr'::text),
  ('Clear Shmp Cool Menthol 11ml'::text),
  ('Club Botol 1500ml'::text),
  ('Club Botol 220ml'::text),
  ('Club Botol 600ml'::text),
  ('Creamy Latte'::text),
  ('Daia Det Violet 800gr'::text),
  ('Daia Romantic Pink 800gr'::text),
  ('Dancow 1+ Madu 350g'::text),
  ('Ekonomi Pencuci Piring 650ml'::text),
  ('Floridina Orange 350ml'::text),
  ('Garam Pasar Rame 250g'::text),
  ('Genki Moko Moko 5+1 L1'::text),
  ('Genki Moko Moko Pants Np L3'::text),
  ('Genki Moko Moko Pants Np M3'::text),
  ('Genki Moko Moko Pants Xl3'::text),
  ('Golda Cappuccino 200ml'::text),
  ('Ichi Ocha Jasmine 350ml'::text),
  ('Imcoco Lychee 350ml'::text),
  ('Indofood Kecap Manis 135ml'::text),
  ('Indofood Kecap Manis 550g'::text),
  ('Indofood Kecap Manis 725g'::text),
  ('Indofood Racik Ayam Goreng 26g'::text),
  ('Indofood Racik Bumbu Ikan Goreng 20g'::text),
  ('Indofood Racik Bumbu Marinasi 15g'::text),
  ('Indofood Racik Bumbu Sayur Sop 20g'::text),
  ('Indofood Racik Nasi Goreng 20g'::text),
  ('Indofood Sambal Pedas 135ml'::text),
  ('Indofood Sambal Pedas 275ml'::text),
  ('Indofood Sambal Pedas 8g'::text),
  ('Indofood Tiga Sapi Kental Manis Choco'::text),
  ('Indofood Tiga Sapi Kental Manis Plain 490g'::text),
  ('Indomie Goreng Jumbo'::text),
  ('Indomie Goreng Rasa Ayam Geprek'::text),
  ('Indomie Goreng Rendang'::text),
  ('Indomie Kuah Rasa Seblak Hot Jeletot'::text),
  ('Indomie Mi Goreng Aceh'::text),
  ('Indomie Mi Goreng Plus'::text),
  ('Indomie Mi Nyemek Ala Bangladesh Rasa Kari'::text),
  ('Indomie Mi Nyemek Ala Jogja Rasa Rendang'::text),
  ('Indomie Rasa Soto Mie'::text),
  ('Indomilk Creamy Ori 370g'::text),
  ('Indomilk Creamy Ori 37g'::text),
  ('Indomilk Kids Cokelat 115ml'::text),
  ('Indomilk Kids Cokelat Steril 190ml'::text),
  ('Indomilk Kids Stroberi 115ml'::text),
  ('Indomilk Swiss Choco 370g'::text),
  ('Intermi Mi Goreng'::text),
  ('Intermi Mi Goreng Pedas'::text),
  ('Jelly Drink Blackcurrant 120g'::text),
  ('Jelly Drink Mango 120g'::text),
  ('Jelly Drink Strawberry 120g'::text),
  ('Jetz Sweet Stick 65g'::text),
  ('Kopiko Cappucino Candy 175g'::text),
  ('Le Mineral 600ml'::text),
  ('Lifebuoy Lemon Fress 60g'::text),
  ('Lifebuoy Scb Ts Total 10Rl 60g'::text),
  ('Lifebuoy Shampo Anti Ketombe 10ml'::text),
  ('Madu Tj Sachet'::text),
  ('Malkist Chocholate 21 Gr'::text),
  ('Malkist Extra Abon'::text),
  ('Malkist Sweet Cracker'::text),
  ('Mama Coco Santan'::text),
  ('Mama Lemon Jeruk Nipis 690gr'::text),
  ('Mi Telur Cap 3 Ayam'::text),
  ('Mie Sedaap Ayam Bawang'::text),
  ('Mie Sedaap Cup Goreng'::text),
  ('Mie Sedaap Goreng'::text),
  ('Mie Sedaap Kuah Rasa Soto'::text),
  ('Migelas Rasa Ayam Bawang'::text),
  ('Migelas Rasa Baso Sapi'::text),
  ('Migelas Rasa Sop Buntut'::text),
  ('Migelas Soto Ayam'::text),
  ('Mila Tepung Terigu Serbaguna 1kg'::text),
  ('Milo Sachet 22g'::text),
  ('Minijelly 5S 15g Isi 5 Cup'::text),
  ('Minipudding Mix Flavour 15g Isi 10 Cup'::text),
  ('Minyak Goreng Fortune 1L'::text),
  ('Minyak Goreng Fortune 2L'::text),
  ('Minyak Goreng Siip 1,8L'::text),
  ('Molto AIO Pink 10ml'::text),
  ('Molto Aio Blue 10ml'::text),
  ('Nata De Coco Cup Lychee 200g'::text),
  ('Nescafe'::text),
  ('Nestle Bear Brand 189ml'::text),
  ('Nuvo Family Body Wash 400gr'::text),
  ('Palmia Margarin Serbaguna 200g'::text),
  ('Pepsodent White 75g'::text),
  ('Pop Mie Rasa Baso'::text),
  ('Potabee 65g'::text),
  ('Promina Ayam Kampung Brokoli Keju 120g'::text),
  ('Promina Salmon Norwegia 100g'::text),
  ('Promina Seaweed 20g'::text),
  ('Promina Smooth Kacang Hijau 120g'::text),
  ('Protex Daily Comfort Night Bag 22'::text),
  ('Pudding Puree Cup Mango 120g'::text),
  ('Qtella Singkong'::text),
  ('Refina Garam Meja 500g'::text),
  ('Rexona Fmd Sdcrm Nap Ltn Hijab 9g'::text),
  ('Rexona Male Ice Cool Sch 9g'::text),
  ('Rinso Molto Rose 20ml'::text),
  ('Roma Biskuit Kelapa 300g'::text),
  ('Roma Malkist Extra Abon 105g'::text),
  ('Roma Malkist Sweet Cracker 105g'::text),
  ('Royal Sweet Floral 680ml'::text),
  ('Royco Ayam Kampung'::text),
  ('Sambal Fried Chicken 8g'::text),
  ('Sania Tepung Beras 500g'::text),
  ('Sarimi Goreng Isi 2 Ayam Kecap'::text),
  ('Scotch-Brite Spons 100x70'::text),
  ('Sedaap Kecap Manis 725g'::text),
  ('Siip Tepung Serbaguna 1kg'::text),
  ('Slai Olai Blueberry 320g'::text),
  ('Slai Olai Strawberry 320g'::text),
  ('So Soft Rose&Waterily 700ml'::text),
  ('So Soft Sweet Peony'::text),
  ('Soklin Det Parfume 700ml'::text),
  ('Soklin Liquid Lavender 525ml'::text),
  ('Soklin Soft Purple 700g'::text),
  ('Sosis Eat 40g'::text),
  ('Sun Beras Merah Ekonomis 120g'::text),
  ('Sun Box Beras Merah 120g'::text),
  ('Sun Box Kacang Hijau 120g'::text),
  ('Sunlight Lime 111ml'::text),
  ('Sunlight Lime Cream 175gr'::text),
  ('Sunslik Black Shine 9ml'::text),
  ('Sunslik Shof & Smooth 9ml'::text),
  ('Superstar Full Chocolate 12,5g'::text),
  ('Susu Indofood Enak 370g (Dedik)'::text),
  ('Teh Pucuk 350ml'::text),
  ('Tepung Terigu Lencana Merah 1kg'::text),
  ('Top Coffee Gula Aren'::text),
  ('Tora Moka'::text),
  ('Tora Susu'::text),
  ('Total De Parfum Oriental Bloom 20ml'::text),
  ('Tujuh Kurma'::text),
  ('Zinc Shampoo Refreshing Cool Btl 170'::text)
) as x(item)
where not exists (select 1 from products p where p.item = x.item)
order by 1;

-- Cek: baris pemetaan yang produk_id-nya null (nama tidak ketemu saat insert)
select count(*) as pemetaan_tanpa_produk from product_gondola where produk_id is null;

notify pgrst, 'reload schema';

-- =====================================================================
-- SELESAI. Langkah selanjutnya:
-- 1. Buat user login di Supabase → Authentication → Users → Add user
--    (centang Auto Confirm User)
-- 2. Buka domain Vercel → login → cek SO Gondola dan Produk
-- =====================================================================
