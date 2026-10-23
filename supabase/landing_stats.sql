-- =====================================================================
-- STATISTIK PUBLIK LANDING PAGE
-- Jalankan di Supabase SQL Editor setelah tabel sales/sale_items/products ada.
--
-- Fungsi ini hanya mengembalikan agregat:
--   - total omzet sejak 1 Mei 2025
--   - jumlah nota
--   - jumlah pcs terjual
--   - 5 produk terlaris
--
-- security definer dipakai supaya landing page publik (anon) bisa membaca
-- angka agregat tanpa membuka akses ke tabel transaksi. Jangan menambahkan
-- kolom sensitif (mis. nama pembeli, KK, atau rincian nota) ke fungsi ini.
-- =====================================================================

create or replace function public.landing_stats()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  with batas as (
    select timestamptz '2025-05-01 00:00:00+07' as mulai
  ),
  penjualan as (
    select
      s.id as sale_id,
      si.product_id,
      si.qty_pcs,
      si.harga
    from public.sales s
    join public.sale_items si on si.sale_id = s.id
    cross join batas b
    where s.tanggal >= b.mulai
  ),
  ringkas as (
    select
      coalesce(sum(qty_pcs * harga), 0)::numeric as total_omzet,
      count(distinct sale_id)::int as total_nota,
      coalesce(sum(qty_pcs), 0)::int as total_pcs
    from penjualan
  ),
  top_produk as (
    select
      p.item,
      coalesce(sum(pn.qty_pcs), 0)::int as pcs,
      coalesce(sum(pn.qty_pcs * pn.harga), 0)::numeric as omzet
    from penjualan pn
    join public.products p on p.id = pn.product_id
    group by p.id, p.item
    order by pcs desc, omzet desc, p.item asc
    limit 5
  )
  select jsonb_build_object(
    'sejak', '2025-05-01',
    'total_omzet', (select total_omzet from ringkas),
    'total_nota', (select total_nota from ringkas),
    'total_pcs', (select total_pcs from ringkas),
    'top_produk', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'item', item,
            'pcs', pcs,
            'omzet', omzet
          )
          order by pcs desc, omzet desc, item asc
        )
        from top_produk
      ),
      '[]'::jsonb
    )
  );
$$;

revoke all on function public.landing_stats() from public;
grant execute on function public.landing_stats() to anon, authenticated;

notify pgrst, 'reload schema';
