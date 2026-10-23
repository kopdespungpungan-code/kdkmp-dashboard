-- =====================================================================
-- CEK DATA SUBSIDI & DUPLIKAT PRODUK
-- Jalankan di Supabase SQL Editor SETELAH supabase/subsidi.sql dan
-- supabase/subsidi_per_item.sql.
-- Script ini hanya SELECT; tidak mengubah/menghapus data.
--
-- Tujuan:
--   1. Memastikan semua barang subsidi sudah ditandai.
--   2. Menemukan kandidat barang subsidi yang belum ditandai.
--   3. Menemukan produk ganda (nama/SKU) dan baris nota ganda.
--   4. Memastikan aturan 1 KK = 1 nota subsidi per minggu tidak dilanggar,
--      baik untuk KK bulk maupun KK per barang.
-- =====================================================================

-- Pastikan kolom/tabel sudah ada supaya pesan errornya jelas.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'products' and column_name = 'subsidi'
  ) then
    raise exception 'Kolom products.subsidi belum ada. Jalankan supabase/subsidi.sql dulu.';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'sale_items' and column_name = 'no_kk'
  ) or to_regclass('public.sale_kk') is null then
    raise exception 'Fitur KK bulk/per barang belum ada. Jalankan supabase/subsidi_per_item.sql dulu.';
  end if;
end $$;

-- =====================================================================
-- 0. STATUS CEPAT
--    nama_produk_ganda, sku_ganda, baris_nota_ganda, dan
--    pelanggaran_kk_mingguan harus 0.
--    kandidat_belum_ditandai boleh >0; periksa detail di bagian 4.
-- =====================================================================
with kandidat as (
  select 1
  from products
  where not subsidi
    and (
      item ilike '%pupuk%'
      or item ilike '%npk%'
      or item ilike '%urea%'
      or item ilike '%lpg%'
      or item ilike '%elpiji%'
      or item ilike '%gas 3%'
      or item ilike '%sphp%'
      or item ilike '%minyak kita%'
      or item ilike '%minyakita%'
      or item ilike '%subsidi%'
    )
),
nama_ganda as (
  select 1
  from products
  group by lower(regexp_replace(btrim(item), '[[:space:]]+', ' ', 'g'))
  having count(*) > 1
),
sku_ganda as (
  select 1 from products group by sku having count(*) > 1
),
baris_ganda as (
  select 1 from sale_items group by sale_id, product_id having count(*) > 1
),
pemakaian_kk as (
  -- sale_kk adalah sumber utama (mencakup bulk dan per barang).
  select no_kk, tanggal from sale_kk
  union all
  -- Nota lama yang belum punya baris sale_kk (mis. backfill terlewat).
  select s.no_kk, s.tanggal
  from sales s
  where s.subsidi = true
    and s.no_kk is not null
    and not exists (
      select 1 from sale_kk k where k.sale_id = s.id and k.no_kk = s.no_kk
    )
),
kk_ganda as (
  select 1
  from pemakaian_kk
  group by no_kk, date_trunc('week', (tanggal at time zone 'Asia/Jakarta'))::date
  having count(*) > 1
)
select
  (select count(*) from kandidat) as kandidat_belum_ditandai,
  (select count(*) from nama_ganda) as nama_produk_ganda,
  (select count(*) from sku_ganda) as sku_ganda,
  (select count(*) from baris_ganda) as baris_nota_ganda,
  (select count(*) from kk_ganda) as pelanggaran_kk_mingguan;

-- =====================================================================
-- 1. RINGKASAN
-- =====================================================================
select
  count(*) as total_produk,
  count(*) filter (where subsidi) as produk_subsidi,
  count(*) filter (where not subsidi) as produk_non_subsidi,
  count(*) filter (where not aktif) as produk_nonaktif
from products;

-- =====================================================================
-- 2. LIMA KATEGORI SUBSIDI: BERAPA YANG ADA & BERAPA YANG DITANDAI
--    Kalau "ditandai" < "jumlah", ada item yang terlewat.
-- =====================================================================
select *
from (
  select
    'Pupuk NPK' as kategori,
    count(*) filter (where item ilike '%npk%') as jumlah,
    count(*) filter (where item ilike '%npk%' and subsidi) as ditandai
  from products
  union all
  select
    'Pupuk Urea',
    count(*) filter (where item ilike '%urea%'),
    count(*) filter (where item ilike '%urea%' and subsidi)
  from products
  union all
  select
    'LPG / Gas 3 kg',
    count(*) filter (where item ilike '%lpg%' or item ilike '%elpiji%' or item ilike '%gas 3%'),
    count(*) filter (where (item ilike '%lpg%' or item ilike '%elpiji%' or item ilike '%gas 3%') and subsidi)
  from products
  union all
  select
    'SPHP',
    count(*) filter (where item ilike '%sphp%'),
    count(*) filter (where item ilike '%sphp%' and subsidi)
  from products
  union all
  select
    'Minyak Kita',
    count(*) filter (where item ilike '%minyak kita%' or item ilike '%minyakita%'),
    count(*) filter (where (item ilike '%minyak kita%' or item ilike '%minyakita%') and subsidi)
  from products
) x
order by kategori;

-- =====================================================================
-- 3. PRODUK YANG SUDAH DITANDAI SUBSIDI
-- =====================================================================
select sku, item, supplier, aktif
from products
where subsidi
order by item;

-- =====================================================================
-- 4. KANDIDAT SUBSIDI YANG BELUM DITANDAI
--    Periksa daftar ini. Centang "Barang subsidi" lewat halaman edit
--    produk bila memang subsidi.
-- =====================================================================
select sku, item, supplier, aktif
from products
where not subsidi
  and (
    item ilike '%pupuk%'
    or item ilike '%npk%'
    or item ilike '%urea%'
    or item ilike '%lpg%'
    or item ilike '%elpiji%'
    or item ilike '%gas 3%'
    or item ilike '%sphp%'
    or item ilike '%minyak kita%'
    or item ilike '%minyakita%'
    or item ilike '%subsidi%'
  )
order by item;

-- =====================================================================
-- 5. PRODUK DITANDAI SUBSIDI TAPI NAMANYA TIDAK COCOK POLA
--    Bisa jadi penandaan manual yang benar, bisa juga salah tanda.
-- =====================================================================
select sku, item, supplier, aktif
from products
where subsidi
  and not (
    item ilike '%pupuk%'
    or item ilike '%npk%'
    or item ilike '%urea%'
    or item ilike '%lpg%'
    or item ilike '%elpiji%'
    or item ilike '%gas 3%'
    or item ilike '%sphp%'
    or item ilike '%minyak kita%'
    or item ilike '%minyakita%'
    or item ilike '%subsidi%'
  )
order by item;

-- =====================================================================
-- 6. DUPLIKAT NAMA PRODUK (huruf kecil + spasi dirapikan)
--    Ini yang paling mungkin "item ganda".
-- =====================================================================
select
  lower(regexp_replace(btrim(item), '[[:space:]]+', ' ', 'g')) as nama_normal,
  count(*) as jumlah,
  count(*) filter (where aktif) as jumlah_aktif,
  array_agg(sku order by sku) as daftar_sku,
  array_agg(item order by sku) as daftar_nama,
  array_agg(aktif order by sku) as daftar_aktif
from products
group by 1
having count(*) > 1
order by jumlah_aktif desc, jumlah desc, nama_normal;

-- =====================================================================
-- 7. DUPLIKAT NAMA YANG LEBIH AGRESIF
--    Mengabaikan spasi, tanda baca, dan huruf besar/kecil.
--    Contoh: "Gas LPG 3 KG" vs "Gas LPG 3Kg".
-- =====================================================================
select
  lower(regexp_replace(item, '[^a-zA-Z0-9]+', '', 'g')) as nama_rapat,
  count(*) as jumlah,
  count(*) filter (where aktif) as jumlah_aktif,
  array_agg(sku order by sku) as daftar_sku,
  array_agg(item order by sku) as daftar_nama,
  array_agg(aktif order by sku) as daftar_aktif
from products
group by 1
having count(*) > 1
order by jumlah_aktif desc, jumlah desc, nama_rapat;

-- =====================================================================
-- 8. DUPLIKAT SKU (harusnya tidak pernah ada karena SKU unik)
-- =====================================================================
select sku, count(*) as jumlah, array_agg(item order by item) as daftar_nama
from products
group by sku
having count(*) > 1
order by jumlah desc, sku;

-- =====================================================================
-- 9. NAMA PRODUK DENGAN SPASI BERLEBIH / SPASI DI UJUNG
--    Sering menjadi sumber duplikat tersembunyi.
-- =====================================================================
select sku, item, length(item) as panjang
from products
where item <> btrim(item) or item ~ '[[:space:]]{2,}'
order by item;

-- =====================================================================
-- 10. BARIS NOTA GANDA (produk yang sama muncul >1 kali di satu nota)
--     Penjualan baru sudah menggabungkan baris; ini untuk data lama.
-- =====================================================================
select
  si.sale_id,
  s.invoice_no,
  si.product_id,
  p.item,
  count(*) as jumlah_baris,
  sum(si.qty_pcs) as total_qty
from sale_items si
join sales s on s.id = si.sale_id
join products p on p.id = si.product_id
group by si.sale_id, s.invoice_no, si.product_id, p.item
having count(*) > 1
order by jumlah_baris desc, s.invoice_no;

-- =====================================================================
-- 11. PELANGGARAN 1 KK = 1 NOTA SUBSIDI PER MINGGU
--     Harus kosong. Mencakup KK bulk dan KK per barang. Kalau ada isinya,
--     berarti ada data lama yang masuk sebelum index unik dibuat.
-- =====================================================================
with pemakaian as (
  select sale_id, no_kk, tanggal from sale_kk
  union all
  select s.id, s.no_kk, s.tanggal
  from sales s
  where s.subsidi = true
    and s.no_kk is not null
    and not exists (
      select 1 from sale_kk k where k.sale_id = s.id and k.no_kk = s.no_kk
    )
),
ganda as (
  select
    no_kk,
    date_trunc('week', (tanggal at time zone 'Asia/Jakarta'))::date as minggu_mulai
  from pemakaian
  group by no_kk, 2
  having count(distinct sale_id) > 1
)
select
  g.no_kk,
  g.minggu_mulai,
  count(distinct p.sale_id) as jumlah_nota,
  array_agg(distinct s.invoice_no order by s.invoice_no) as daftar_nota
from ganda g
join pemakaian p
  on p.no_kk = g.no_kk
 and date_trunc('week', (p.tanggal at time zone 'Asia/Jakarta'))::date = g.minggu_mulai
join sales s on s.id = p.sale_id
group by g.no_kk, g.minggu_mulai
order by g.minggu_mulai desc, g.no_kk;

-- =====================================================================
-- 12. BARIS SUBSIDI TANPA KK / KK TIDAK 16 DIGIT
--     Harus kosong. Constraint database juga menolak data baru.
-- =====================================================================
select
  si.id,
  s.invoice_no,
  s.tanggal,
  p.item,
  si.no_kk
from sale_items si
join sales s on s.id = si.sale_id
join products p on p.id = si.product_id
where si.subsidi = true
  and (si.no_kk is null or si.no_kk !~ '^[0-9]{16}$')
order by s.tanggal desc, s.invoice_no, si.id;

-- =====================================================================
-- 13. KK BARIS NOTA YANG TIDAK TERCATAT DI SALE_KK
--     Harus kosong. Menandakan backfill/migrasi belum lengkap.
-- =====================================================================
select
  si.sale_id,
  s.invoice_no,
  p.item,
  si.no_kk
from sale_items si
join sales s on s.id = si.sale_id
join products p on p.id = si.product_id
where si.subsidi = true
  and si.no_kk is not null
  and not exists (
    select 1 from sale_kk k where k.sale_id = si.sale_id and k.no_kk = si.no_kk
  )
order by s.tanggal desc, s.invoice_no, p.item;
