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
-- gondola_key membedakan tiap gondola/lokasi, sehingga PostgREST bisa
-- melakukan upsert onConflict (dipakai bila diperlukan).
create unique index idx_so_gondola_uniq
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
