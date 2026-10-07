-- KABBURE — tablas de importación y revisión administrativa de rutas
-- Ejecutar después de supabase/schema.sql en Supabase > SQL Editor.
-- Las rutas importadas permanecen pendientes hasta que el administrador las apruebe.

-- 1. Cada archivo o carga recibida desde /admin/rutas.
create table if not exists public.route_imports (
  id uuid primary key default gen_random_uuid(),
  imported_by uuid references auth.users(id) on delete set null,
  file_name text not null,
  file_format text not null check (file_format in ('json', 'geojson')),
  source_type text not null default 'pública' check (source_type = 'pública'),
  import_status text not null default 'pending_review' check (import_status in ('pending_review', 'processing', 'completed', 'rejected', 'cancelled')),
  country_code char(2),
  city_name text,
  total_routes integer not null default 0 check (total_routes >= 0),
  total_paths integer not null default 0 check (total_paths >= 0),
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Rutas recibidas dentro de una importación, todavía no publicadas.
create table if not exists public.route_import_items (
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null references public.route_imports(id) on delete cascade,
  public_code text not null,
  display_name text not null,
  country_code char(2),
  city_name text,
  source_type text not null default 'pública' check (source_type = 'pública'),
  review_status text not null default 'pending_review' check (review_status in ('pending_review', 'approved', 'rejected', 'archived')),
  review_notes text,
  final_route_id uuid references public.routes(id) on delete set null,
  import_reference jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (import_id, public_code)
);

-- 3. Los dos recorridos editables de cada ruta importada.
create table if not exists public.route_import_paths (
  id uuid primary key default gen_random_uuid(),
  import_item_id uuid not null references public.route_import_items(id) on delete cascade,
  path_code char(1) not null check (path_code in ('A', 'B')),
  origin_name text,
  destination_name text,
  geometry jsonb not null default '{"type":"LineString","coordinates":[]}'::jsonb,
  review_status text not null default 'pending_review' check (review_status in ('pending_review', 'approved', 'rejected', 'archived')),
  final_path_id uuid references public.route_paths(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (import_item_id, path_code)
);

create index if not exists route_imports_status_idx
  on public.route_imports(import_status, created_at desc);

create index if not exists route_imports_location_idx
  on public.route_imports(country_code, city_name);

create index if not exists route_import_items_review_idx
  on public.route_import_items(review_status, import_id);

create index if not exists route_import_items_code_idx
  on public.route_import_items(public_code);

create index if not exists route_import_paths_review_idx
  on public.route_import_paths(review_status, import_item_id);

-- Sin RLS en esta fase, de acuerdo con la arquitectura inicial de Kabbure.
-- Estas sentencias también corrigen tablas creadas previamente con RLS activado.
alter table public.route_imports disable row level security;
alter table public.route_import_items disable row level security;
alter table public.route_import_paths disable row level security;

-- El panel valida el UUID administrador antes de permitir la operación.
grant select, insert, update, delete on public.route_imports to anon, authenticated;
grant select, insert, update, delete on public.route_import_items to anon, authenticated;
grant select, insert, update, delete on public.route_import_paths to anon, authenticated;

comment on table public.route_imports is 'Cargas recibidas desde el panel administrativo antes de aprobar rutas.';
comment on table public.route_import_items is 'Rutas importadas en estado de revisión, con nomenclatura RK.';
comment on table public.route_import_paths is 'Recorridos A y B editables de una ruta importada.';
comment on column public.route_import_items.source_type is 'Clasificación funcional visible: pública.';
comment on column public.route_import_items.import_reference is 'Referencia técnica opcional, no visible como fuente funcional.';
