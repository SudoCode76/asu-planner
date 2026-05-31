create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'link_status') then
    create type public.link_status as enum ('viable', 'critical', 'non_viable');
  end if;
  if not exists (select 1 from pg_type where typname = 'cable_type') then
    create type public.cable_type as enum ('asu', 'adss', 'other');
  end if;
  if not exists (select 1 from pg_type where typname = 'fiber_type') then
    create type public.fiber_type as enum ('single_mode', 'multi_mode');
  end if;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.fiber_link_designs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) >= 2),
  description text,
  origin_name text,
  destination_name text,
  point_a_lat double precision not null check (point_a_lat between -90 and 90),
  point_a_lng double precision not null check (point_a_lng between -180 and 180),
  point_b_lat double precision not null check (point_b_lat between -90 and 90),
  point_b_lng double precision not null check (point_b_lng between -180 and 180),
  map_distance_km numeric(12, 4) not null check (map_distance_km >= 0),
  real_distance_km numeric(12, 4) not null check (real_distance_km >= 0),
  cable_type public.cable_type not null,
  fiber_strands integer not null check (fiber_strands > 0),
  wavelength_nm integer not null check (wavelength_nm in (1310, 1550)),
  fiber_type public.fiber_type not null,
  transmitter_power_dbm numeric(8, 3) not null,
  receiver_sensitivity_dbm numeric(8, 3) not null,
  attenuation_db_per_km numeric(8, 4) not null check (attenuation_db_per_km >= 0),
  splice_count integer not null check (splice_count >= 0),
  splice_loss_db numeric(8, 4) not null check (splice_loss_db >= 0),
  connector_count integer not null check (connector_count >= 0),
  connector_loss_db numeric(8, 4) not null check (connector_loss_db >= 0),
  safety_margin_db numeric(8, 3) not null check (safety_margin_db >= 0),
  fiber_loss_db numeric(10, 4) not null check (fiber_loss_db >= 0),
  total_splice_loss_db numeric(10, 4) not null check (total_splice_loss_db >= 0),
  total_connector_loss_db numeric(10, 4) not null check (total_connector_loss_db >= 0),
  total_loss_db numeric(10, 4) not null check (total_loss_db >= 0),
  optical_budget_db numeric(10, 4) not null,
  final_margin_db numeric(10, 4) not null,
  status public.link_status not null,
  recommendations jsonb not null default '[]'::jsonb check (jsonb_typeof(recommendations) = 'array'),
  calculation_version integer not null default 1 check (calculation_version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_updated_at_idx on public.profiles (updated_at desc);
create index if not exists fiber_link_designs_user_created_idx on public.fiber_link_designs (user_id, created_at desc);
create index if not exists fiber_link_designs_user_status_idx on public.fiber_link_designs (user_id, status);
create index if not exists fiber_link_designs_user_name_idx on public.fiber_link_designs (user_id, lower(name));

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists fiber_link_designs_set_updated_at on public.fiber_link_designs;
create trigger fiber_link_designs_set_updated_at
before update on public.fiber_link_designs
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function public.handle_new_user_profile() from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute function public.handle_new_user_profile();

alter table public.profiles enable row level security;
alter table public.fiber_link_designs enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
for select to authenticated using ((select auth.uid()) = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
for insert to authenticated with check ((select auth.uid()) = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists "fiber_link_designs_select_own" on public.fiber_link_designs;
create policy "fiber_link_designs_select_own" on public.fiber_link_designs
for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "fiber_link_designs_insert_own" on public.fiber_link_designs;
create policy "fiber_link_designs_insert_own" on public.fiber_link_designs
for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "fiber_link_designs_update_own" on public.fiber_link_designs;
create policy "fiber_link_designs_update_own" on public.fiber_link_designs
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "fiber_link_designs_delete_own" on public.fiber_link_designs;
create policy "fiber_link_designs_delete_own" on public.fiber_link_designs
for delete to authenticated using ((select auth.uid()) = user_id);
