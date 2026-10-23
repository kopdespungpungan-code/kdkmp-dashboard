-- =====================================================================
-- PENGATURAN APLIKASI (jalankan SEKALI di Supabase SQL Editor)
-- Menyimpan konfigurasi OCR yang bisa diubah dari menu Pengaturan.
-- =====================================================================

create table if not exists public.app_settings (
  id smallint primary key default 1,
  ocr_base_url text,
  ocr_api_key text,
  ocr_model text,
  ocr_reasoning text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  constraint app_settings_single_row check (id = 1)
);

-- Aman untuk database yang tabelnya sudah dibuat sebagian.
alter table public.app_settings add column if not exists ocr_base_url text;
alter table public.app_settings add column if not exists ocr_api_key text;
alter table public.app_settings add column if not exists ocr_model text;
alter table public.app_settings add column if not exists ocr_reasoning text;
alter table public.app_settings add column if not exists updated_at timestamptz not null default now();
alter table public.app_settings add column if not exists updated_by uuid references auth.users(id) on delete set null;

insert into public.app_settings (id) values (1)
on conflict (id) do nothing;

create or replace function public.touch_app_settings()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_app_settings on public.app_settings;
create trigger trg_touch_app_settings
before update on public.app_settings
for each row execute function public.touch_app_settings();

alter table public.app_settings enable row level security;

drop policy if exists "app_settings_select" on public.app_settings;
create policy "app_settings_select" on public.app_settings
  for select to authenticated using (true);

drop policy if exists "app_settings_insert" on public.app_settings;
create policy "app_settings_insert" on public.app_settings
  for insert to authenticated with check (true);

drop policy if exists "app_settings_update" on public.app_settings;
create policy "app_settings_update" on public.app_settings
  for update to authenticated using (true) with check (true);

drop policy if exists "app_settings_delete" on public.app_settings;
create policy "app_settings_delete" on public.app_settings
  for delete to authenticated using (true);

revoke all on public.app_settings from anon, public;
grant select, insert, update, delete on public.app_settings to authenticated;

notify pgrst, 'reload schema';
