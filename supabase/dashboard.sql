-- =====================================================================
-- VIEW UNTUK DASHBOARD (jalankan SEKALI di Supabase SQL Editor,
-- setelah kdkmp_retail_simple.sql dan seed)
-- security_invoker = true: view mengikuti RLS user yang login
-- (tanpa ini, view bisa dibaca siapa pun yang punya anon key).
-- =====================================================================

drop view if exists v_penjualan, v_total_invoice, v_perlu_perhatian, v_omzet_harian, v_terlaris_30hari, v_ringkasan_stok;

create view v_penjualan with (security_invoker = true) as
select si.id, s.id as sale_id, s.invoice_no, s.tanggal, s.kasir, p.item, p.gramasi,
       si.qty_pcs, si.harga, si.qty_pcs * si.harga as subtotal, si.keterangan
from sale_items si
join sales s on s.id = si.sale_id
join products p on p.id = si.product_id;

create view v_total_invoice with (security_invoker = true) as
select s.id, s.invoice_no, s.tanggal, s.kasir,
       sum(si.qty_pcs) as pcs, sum(si.qty_pcs * si.harga) as total
from sales s
join sale_items si on si.sale_id = s.id
group by s.id;

create view v_omzet_harian with (security_invoker = true) as
select (s.tanggal at time zone 'Asia/Jakarta')::date as tanggal,
       count(distinct s.id) as nota,
       sum(si.qty_pcs) as pcs,
       sum(si.qty_pcs * si.harga) as omzet
from sales s
join sale_items si on si.sale_id = s.id
group by 1;

create view v_terlaris_30hari with (security_invoker = true) as
select p.id, p.item, sum(si.qty_pcs) as pcs, sum(si.qty_pcs * si.harga) as omzet
from sale_items si
join sales s on s.id = si.sale_id
join products p on p.id = si.product_id
where s.tanggal >= now() - interval '30 days'
group by p.id, p.item
order by pcs desc
limit 10;

create view v_perlu_perhatian with (security_invoker = true) as
select id, sku, item, gramasi, stok_toko, stok_gudang,
       stok_toko + stok_gudang as stok_total, stok_min, expired_terdekat, foto_url
from products
where aktif
  and (stok_toko + stok_gudang <= coalesce(stok_min, 0)
       or expired_terdekat <= current_date + 60);

create view v_ringkasan_stok with (security_invoker = true) as
select count(*) filter (where aktif) as jenis_produk,
       coalesce(sum(stok_toko + stok_gudang) filter (where aktif), 0) as total_stok,
       count(*) filter (where aktif and stok_toko + stok_gudang between 1 and coalesce(stok_min, 0)) as menipis,
       count(*) filter (where aktif and stok_toko + stok_gudang <= 0) as habis,
       count(*) filter (where aktif and expired_terdekat <= current_date + 60) as hampir_expired
from products;

-- view lama dari skema simpel (v_retur, dll.) tidak dipakai dashboard
