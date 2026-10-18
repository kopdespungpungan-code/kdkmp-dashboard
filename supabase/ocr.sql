-- =====================================================================
-- FITUR IMPOR STRUK (OCR) - jalankan SEKALI di Supabase SQL Editor
-- =====================================================================

-- 1. Catat asal nota (nama file struk) untuk audit
alter table sales add column if not exists sumber text;

-- 2. Trigger penjualan: boleh dilewati saat impor struk lama
--    (kalau stok di sistem sudah memperhitungkan penjualan itu)
create or replace function fn_sale() returns trigger as $$
begin
  if coalesce(current_setting('app.skip_stok', true), '') <> '1' then
    update products set stok_toko = stok_toko - new.qty_pcs where id = new.product_id;
  end if;
  return new;
end $$ language plpgsql;

-- 3. Simpan satu nota + semua itemnya secara atomik (gagal satu = batal semua)
--    p = {invoice_no, tanggal, kasir, sumber, items:[{product_id, qty, harga}]}
create or replace function import_nota(p jsonb, kurangi_stok boolean default true)
returns bigint
language plpgsql
security invoker
as $$
declare
  v_id bigint;
  it   jsonb;
begin
  if jsonb_array_length(coalesce(p->'items', '[]'::jsonb)) = 0 then
    raise exception 'Nota tidak punya barang';
  end if;

  if not kurangi_stok then
    perform set_config('app.skip_stok', '1', true);   -- berlaku hanya di transaksi ini
  end if;

  insert into sales (invoice_no, tanggal, kasir, sumber)
  values (p->>'invoice_no',
          (p->>'tanggal')::timestamptz,
          nullif(p->>'kasir', ''),
          nullif(p->>'sumber', ''))
  returning id into v_id;

  for it in select * from jsonb_array_elements(p->'items') loop
    insert into sale_items (sale_id, product_id, qty_pcs, harga)
    values (v_id, (it->>'product_id')::bigint, (it->>'qty')::int, (it->>'harga')::numeric);
  end loop;

  return v_id;
end $$;

notify pgrst, 'reload schema';
