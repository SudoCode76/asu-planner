# Supabase data model plan

## MCP status on 2026-05-30

- Supabase MCP connection works.
- Project URL: `https://rlrmrfpcyeydrfkjsfwe.supabase.co`
- Public schema tables: none.
- Migrations: none.
- Security advisor: no lints.
- Performance advisor: no lints.
- Publishable key exists and is active. Store it in `.env.local`, not in source code.

## Auth model

Supabase Auth owns identity. Application tables should reference `auth.users`.

Recommended application tables:

- `profiles`: one row per auth user for display name, avatar, and timestamps.
- `fiber_link_designs`: saved link designs and calculated outputs.
- `fiber_link_report_exports`: optional table for generated report metadata.

## Enums

Use Postgres enums or constrained text. Enums are better for status-like values once names are stable.

```text
link_status: viable, critical, non_viable
cable_type: asu, adss, other
fiber_type: single_mode, multi_mode
wavelength_nm: 1310, 1550
```

## `profiles`

```text
id uuid primary key references auth.users(id) on delete cascade
full_name text
avatar_url text
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

RLS:

- Authenticated users can select their own profile.
- Authenticated users can insert/update their own profile.

## `fiber_link_designs`

Store inputs and outputs together. Historical reports should not change if future formulas/defaults change.

```text
id uuid primary key default gen_random_uuid()
user_id uuid not null references auth.users(id) on delete cascade
name text not null
description text
origin_name text
destination_name text
point_a_lat double precision not null
point_a_lng double precision not null
point_b_lat double precision not null
point_b_lng double precision not null
map_distance_km numeric(12, 4) not null
real_distance_km numeric(12, 4) not null
cable_type text not null
fiber_strands integer not null
wavelength_nm integer not null
fiber_type text not null
transmitter_power_dbm numeric(8, 3) not null
receiver_sensitivity_dbm numeric(8, 3) not null
attenuation_db_per_km numeric(8, 4) not null
splice_count integer not null
splice_loss_db numeric(8, 4) not null
connector_count integer not null
connector_loss_db numeric(8, 4) not null
safety_margin_db numeric(8, 3) not null
fiber_loss_db numeric(10, 4) not null
total_splice_loss_db numeric(10, 4) not null
total_connector_loss_db numeric(10, 4) not null
total_loss_db numeric(10, 4) not null
optical_budget_db numeric(10, 4) not null
final_margin_db numeric(10, 4) not null
status text not null
recommendations jsonb not null default '[]'::jsonb
calculation_version integer not null default 1
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

RLS:

- Authenticated users can select only rows where `(select auth.uid()) = user_id`.
- Authenticated users can insert only rows where `(select auth.uid()) = user_id`.
- Authenticated users can update/delete only rows where `(select auth.uid()) = user_id`.

Indexes:

- `(user_id, created_at desc)`
- `(user_id, status)`
- Optional text search index for `name` after the first real search implementation.

## `fiber_link_report_exports` optional

Use only if reports are persisted as files or export events.

```text
id uuid primary key default gen_random_uuid()
user_id uuid not null references auth.users(id) on delete cascade
design_id uuid not null references fiber_link_designs(id) on delete cascade
storage_path text
format text not null default 'pdf'
created_at timestamptz not null default now()
```

RLS mirrors ownership through `user_id`.

## Server-side calculation rule

Client-side calculation is acceptable for instant feedback, but saved rows must be recalculated server-side before insert/update. This prevents tampered values and keeps status trustworthy.

## Migration approach

- Use MCP `execute_sql` for exploration only.
- When the schema is ready, create a proper migration in the repo and apply it.
- After schema changes, run Supabase MCP security and performance advisors.
