-- =====================================================================
-- PEMETAAN PRODUK -> GONDOLA / LOKASI (jalankan di Supabase SQL Editor)
--
-- Tanpa tabel ini, halaman SO Gondola menampilkan SEMUA produk aktif
-- untuk gondola apa pun. Tabel ini mengikat satu produk ke satu
-- gondola (1-60) atau lokasi (untuk Lia), beserta tingkat raknya.
--
-- Sumber data awal: sheet petugas di "DATABASE POS KDKMP PUNGPUNGAN.xlsx"
-- (impor otomatis lewat scripts/import_pemetaan_so.py).
-- =====================================================================

create table if not exists product_gondola (
  id bigserial primary key,
  produk_id bigint not null references products(id) on delete cascade,
  gondola_no integer,                       -- null bila memakai lokasi (mis. Lia)
  lokasi text not null default '',          -- hanya diisi bila gondola_no null
  tingkat integer not null default 1,
  -- gondola_no bila ada, 0 bila memakai lokasi.
  -- Dipakai sebagai kunci upsert (PostgREST tidak bisa onConflict ke expression).
  gondola_key integer generated always as (coalesce(gondola_no, 0)) stored,
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
-- Kolom `lokasi` di tabel di-alias menjadi `gondola_lokasi` supaya seragam
-- dengan tabel so_gondola dan dipakai apa adanya oleh halaman SO Gondola.
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
