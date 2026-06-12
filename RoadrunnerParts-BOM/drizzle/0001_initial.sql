create extension if not exists pgcrypto;

create table if not exists machines (
  id uuid primary key default gen_random_uuid(),
  machine_id text not null unique,
  brand text not null,
  model text not null,
  serial text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists bom_rows (
  id uuid primary key default gen_random_uuid(),
  machine_id text not null references machines(machine_id) on delete cascade,
  part_number text not null,
  diagram_id text not null default '',
  description text not null default '',
  encompass_price text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists price_lookup_audit (
  id uuid primary key default gen_random_uuid(),
  machine_id text not null,
  part_number text not null,
  attempted_source text not null,
  found_price text,
  success text not null,
  created_at timestamptz not null default now()
);
