create extension if not exists postgis;

alter table public.fiber_link_designs
  add column if not exists route_points jsonb not null default '[]'::jsonb,
  add column if not exists gis_layers jsonb not null default '[]'::jsonb,
  add column if not exists mechanical_profile jsonb not null default '{}'::jsonb,
  add column if not exists route_analysis jsonb not null default '{}'::jsonb;

create table if not exists public.gis_layers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) >= 2),
  description text,
  layer_type text not null check (layer_type in ('geojson', 'kml', 'drawn')),
  data jsonb not null default '{}'::jsonb,
  feature_count integer not null default 0 check (feature_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gis_features (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  layer_id uuid references public.gis_layers(id) on delete cascade,
  name text,
  feature_type text not null default 'feature',
  properties jsonb not null default '{}'::jsonb,
  geometry jsonb not null default '{}'::jsonb,
  geom geometry(Geometry, 4326),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.network_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) >= 2),
  asset_type text not null check (asset_type in ('node', 'pole', 'splice_box', 'client', 'reserve', 'other')),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  geom geometry(Point, 4326) generated always as (st_setsrid(st_makepoint(longitude, latitude), 4326)) stored,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cable_catalog (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  cable_type public.cable_type not null,
  fiber_strands integer not null check (fiber_strands > 0),
  attenuation_1310_db_per_km numeric(8, 4) not null default 0.35,
  attenuation_1550_db_per_km numeric(8, 4) not null default 0.22,
  max_span_m numeric(10, 2) not null default 80,
  cable_weight_n_per_m numeric(10, 4) not null default 0.25,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mechanical_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  max_span_m numeric(10, 2) not null default 80,
  reserve_percent numeric(5, 2) not null default 5,
  cable_weight_n_per_m numeric(10, 4) not null default 0.25,
  installation_tension_n numeric(12, 2) not null default 1200,
  max_tension_n numeric(12, 2) not null default 2500,
  max_sag_percent numeric(5, 2) not null default 3,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.fiber_routes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  design_id uuid references public.fiber_link_designs(id) on delete cascade,
  name text not null,
  route_points jsonb not null default '[]'::jsonb,
  route_analysis jsonb not null default '{}'::jsonb,
  geom geometry(LineString, 4326),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.fiber_route_points (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  route_id uuid not null references public.fiber_routes(id) on delete cascade,
  point_order integer not null check (point_order >= 0),
  point_kind text not null check (point_kind in ('endpoint_a', 'pole', 'splice', 'reserve', 'endpoint_b')),
  label text not null,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  geom geometry(Point, 4326) generated always as (st_setsrid(st_makepoint(longitude, latitude), 4326)) stored,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (route_id, point_order)
);

create table if not exists public.fiber_route_spans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  route_id uuid not null references public.fiber_routes(id) on delete cascade,
  span_order integer not null check (span_order > 0),
  from_label text not null,
  to_label text not null,
  distance_km numeric(12, 4) not null check (distance_km >= 0),
  span_m numeric(12, 2) not null check (span_m >= 0),
  estimated_sag_m numeric(12, 2) not null default 0,
  sag_percent numeric(6, 2) not null default 0,
  warnings jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (route_id, span_order)
);

create index if not exists gis_layers_user_created_idx on public.gis_layers (user_id, created_at desc);
create index if not exists gis_features_user_layer_idx on public.gis_features (user_id, layer_id);
create index if not exists gis_features_geom_idx on public.gis_features using gist (geom);
create index if not exists network_assets_user_type_idx on public.network_assets (user_id, asset_type);
create index if not exists network_assets_geom_idx on public.network_assets using gist (geom);
create index if not exists fiber_routes_user_design_idx on public.fiber_routes (user_id, design_id);
create index if not exists fiber_route_points_route_order_idx on public.fiber_route_points (route_id, point_order);
create index if not exists fiber_route_points_geom_idx on public.fiber_route_points using gist (geom);
create index if not exists fiber_route_spans_route_order_idx on public.fiber_route_spans (route_id, span_order);

drop trigger if exists gis_layers_set_updated_at on public.gis_layers;
create trigger gis_layers_set_updated_at before update on public.gis_layers
for each row execute function public.set_updated_at();

drop trigger if exists gis_features_set_updated_at on public.gis_features;
create trigger gis_features_set_updated_at before update on public.gis_features
for each row execute function public.set_updated_at();

drop trigger if exists network_assets_set_updated_at on public.network_assets;
create trigger network_assets_set_updated_at before update on public.network_assets
for each row execute function public.set_updated_at();

drop trigger if exists cable_catalog_set_updated_at on public.cable_catalog;
create trigger cable_catalog_set_updated_at before update on public.cable_catalog
for each row execute function public.set_updated_at();

drop trigger if exists mechanical_profiles_set_updated_at on public.mechanical_profiles;
create trigger mechanical_profiles_set_updated_at before update on public.mechanical_profiles
for each row execute function public.set_updated_at();

drop trigger if exists fiber_routes_set_updated_at on public.fiber_routes;
create trigger fiber_routes_set_updated_at before update on public.fiber_routes
for each row execute function public.set_updated_at();

drop trigger if exists fiber_route_points_set_updated_at on public.fiber_route_points;
create trigger fiber_route_points_set_updated_at before update on public.fiber_route_points
for each row execute function public.set_updated_at();

drop trigger if exists fiber_route_spans_set_updated_at on public.fiber_route_spans;
create trigger fiber_route_spans_set_updated_at before update on public.fiber_route_spans
for each row execute function public.set_updated_at();

alter table public.gis_layers enable row level security;
alter table public.gis_features enable row level security;
alter table public.network_assets enable row level security;
alter table public.cable_catalog enable row level security;
alter table public.mechanical_profiles enable row level security;
alter table public.fiber_routes enable row level security;
alter table public.fiber_route_points enable row level security;
alter table public.fiber_route_spans enable row level security;

create policy "gis_layers_own_all" on public.gis_layers
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "gis_features_own_all" on public.gis_features
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "network_assets_own_all" on public.network_assets
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "cable_catalog_select_available" on public.cable_catalog
for select to authenticated
using (user_id is null or (select auth.uid()) = user_id);

create policy "cable_catalog_own_write" on public.cable_catalog
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "mechanical_profiles_select_available" on public.mechanical_profiles
for select to authenticated
using (user_id is null or (select auth.uid()) = user_id);

create policy "mechanical_profiles_own_write" on public.mechanical_profiles
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "fiber_routes_own_all" on public.fiber_routes
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "fiber_route_points_own_all" on public.fiber_route_points
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "fiber_route_spans_own_all" on public.fiber_route_spans
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
