-- =====================================================================
-- SUBSIDI: KK BULK ATAU KK PER BARANG
-- Jalankan di Supabase SQL Editor SETELAH supabase/subsidi.sql.
-- Script ini boleh dijalankan ulang.
--
-- Tujuan:
--   - Nota subsidi bisa memakai satu KK untuk semua barang (bulk),
--     atau KK berbeda untuk tiap barang.
--   - Setiap barang subsidi wajib punya KK 16 digit.
--   - KK tetap tidak boleh dipakai dua kali dalam minggu yang sama
--     (Senin-Minggu WIB), termasuk campuran nota bulk dan per barang.
-- =====================================================================

-- 1. KK pada tiap baris nota.
alter table sale_items add column if not exists no_kk text;

-- Nota lama (bulk) dipindahkan KK-nya ke tiap baris subsidi.
update sale_items si
set no_kk = s.no_kk
from sales s
where si.sale_id = s.id
  and si.subsidi = true
  and si.no_kk is null
  and s.no_kk is not null;

alter table sale_items drop constraint if exists sale_items_no_kk_format;
alter table sale_items
  add constraint sale_items_no_kk_format
  check (no_kk is null or no_kk ~ '^[0-9]{16}$') not valid;

alter table sale_items drop constraint if exists sale_items_subsidi_wajib_kk;
alter table sale_items
  add constraint sale_items_subsidi_wajib_kk
  check ((not subsidi) or (no_kk is not null)) not valid;

create index if not exists idx_sale_items_no_kk
  on sale_items (no_kk)
  where no_kk is not null;

-- Nota per barang boleh punya sales.no_kk null; kewajiban KK dijaga di
-- sale_items. Nota bulk tetap menyimpan KK di sales.no_kk.
alter table sales drop constraint if exists sales_subsidi_wajib_kk;

-- 2. Satu baris per KK per nota. Tabel ini menjadi sumber pengecekan
--    mingguan yang mencakup mode bulk maupun per barang.
create table if not exists sale_kk (
  id        bigint generated always as identity primary key,
  sale_id   bigint not null references sales(id) on delete cascade,
  no_kk     text not null,
  tanggal   timestamptz not null default now()
);

alter table sale_kk drop constraint if exists sale_kk_no_kk_format;
alter table sale_kk
  add constraint sale_kk_no_kk_format
  check (no_kk ~ '^[0-9]{16}$') not valid;

create index if not exists idx_sale_kk_sale on sale_kk (sale_id);

-- Index unik ini yang mencegah KK dipakai dua kali dalam minggu yang sama.
-- Jika ada data lama yang sudah bentrok, baris duplikat dilewati saat
-- backfill; periksa lewat supabase/cek_subsidi.sql.
create unique index if not exists uq_sale_kk_minggu
  on sale_kk (
    no_kk,
    (date_trunc('week', (tanggal at time zone 'Asia/Jakarta'))::date)
  );

alter table sale_kk enable row level security;
drop policy if exists "auth_all_sale_kk" on sale_kk;
create policy "auth_all_sale_kk" on sale_kk
  for all to authenticated using (true) with check (true);

revoke all on sale_kk from anon, public;
grant select, insert, update, delete on sale_kk to authenticated;
grant usage, select on sequence sale_kk_id_seq to authenticated;

-- Backfill nota lama.
insert into sale_kk (sale_id, no_kk, tanggal)
select s.id, s.no_kk, s.tanggal
from sales s
where s.subsidi = true and s.no_kk is not null
on conflict do nothing;

insert into sale_kk (sale_id, no_kk, tanggal)
select distinct si.sale_id, si.no_kk, s.tanggal
from sale_items si
join sales s on s.id = si.sale_id
where si.subsidi = true and si.no_kk is not null
on conflict do nothing;

-- Supaya PostgREST/Supabase langsung mengenali tabel baru.
notify pgrst, 'reload schema';
