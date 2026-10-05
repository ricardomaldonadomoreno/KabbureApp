-- KABBURE — esquema inicial internacional
-- Ejecutar en Supabase > SQL Editor > New query.
-- Este esquema no activa RLS. Las escrituras sensibles deben pasar por el servidor de Kabbure.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text,
  country_code char(2),
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now()
);

create table if not exists public.drivers (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  verification_status text not null default 'pending' check (verification_status in ('pending', 'approved', 'rejected', 'suspended')),
  driver_status text not null default 'inactive' check (driver_status in ('inactive', 'active', 'paused')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.countries (
  code char(2) primary key,
  name text not null,
  dial_code text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.cities (
  id uuid primary key default gen_random_uuid(),
  country_code char(2) not null references public.countries(code),
  name text not null,
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (country_code, name)
);

create table if not exists public.route_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  source_type text not null check (source_type in ('manual', 'gtfs', 'geojson', 'kml', 'gpx', 'openstreetmap', 'web_reference', 'other')),
  source_url text,
  license_name text,
  license_url text,
  notes text,
  created_by uuid references public.admin_users(user_id),
  created_at timestamptz not null default now()
);

create table if not exists public.routes (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references public.cities(id),
  public_code text not null,
  display_name text not null,
  description text,
  status text not null default 'draft' check (status in ('draft', 'pending_review', 'approved', 'published', 'inactive', 'rejected')),
  verification_level text not null default 'unverified' check (verification_level in ('unverified', 'referential', 'verified')),
  source_id uuid references public.route_sources(id),
  created_by uuid references public.admin_users(user_id),
  approved_by uuid references public.admin_users(user_id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (city_id, public_code, display_name)
);

-- Cada ruta tiene exactamente dos recorridos fijos: A y B.
-- No se les llama ida/vuelta; el administrador define origen y destino geográficos.
create table if not exists public.route_paths (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references public.routes(id) on delete cascade,
  path_code char(1) not null check (path_code in ('A', 'B')),
  origin_name text not null,
  destination_name text not null,
  geometry jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'pending_review', 'approved', 'published', 'inactive', 'rejected')),
  source_id uuid references public.route_sources(id),
  created_by uuid references public.admin_users(user_id),
  approved_by uuid references public.admin_users(user_id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (route_id, path_code)
);

create table if not exists public.route_stops (
  id uuid primary key default gen_random_uuid(),
  route_path_id uuid not null references public.route_paths(id) on delete cascade,
  stop_order integer not null check (stop_order > 0),
  name text not null,
  latitude numeric(9, 6) not null,
  longitude numeric(9, 6) not null,
  created_at timestamptz not null default now(),
  unique (route_path_id, stop_order)
);

create table if not exists public.route_imports (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.route_sources(id),
  file_name text,
  file_type text,
  imported_by uuid references public.admin_users(user_id),
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  records_found integer not null default 0,
  records_created integer not null default 0,
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.driver_route_assignments (
  id uuid primary key default gen_random_uuid(),
  driver_user_id uuid not null references public.drivers(user_id) on delete cascade,
  route_path_id uuid not null references public.route_paths(id),
  status text not null default 'active' check (status in ('active', 'paused', 'ended')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  unique (driver_user_id, route_path_id)
);

-- Organizaciones: estructura reservada para una fase posterior.
-- No existe ninguna relación de propiedad entre organizaciones y rutas.
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  legal_name text,
  country_code char(2) references public.countries(code),
  city_id uuid references public.cities(id),
  status text not null default 'pending' check (status in ('pending', 'active', 'inactive', 'rejected')),
  created_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  member_role text not null default 'member' check (member_role in ('member', 'manager', 'viewer')),
  status text not null default 'pending' check (status in ('pending', 'active', 'inactive')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create index if not exists cities_country_idx on public.cities(country_code);
create index if not exists routes_city_status_idx on public.routes(city_id, status);
create index if not exists route_paths_route_status_idx on public.route_paths(route_id, status);
create index if not exists route_stops_path_order_idx on public.route_stops(route_path_id, stop_order);
create index if not exists assignments_driver_status_idx on public.driver_route_assignments(driver_user_id, status);

-- Vista pública: solo rutas y recorridos publicados.
-- Las tablas internas no se exponen directamente al cliente público.
create or replace view public.published_route_paths as
select
  r.id as route_id,
  r.public_code,
  r.display_name,
  r.description,
  r.status as route_status,
  rp.id as route_path_id,
  rp.path_code,
  rp.origin_name,
  rp.destination_name,
  rp.geometry,
  c.id as city_id,
  c.name as city_name,
  co.code as country_code,
  co.name as country_name
from public.routes r
join public.route_paths rp on rp.route_id = r.id
join public.cities c on c.id = r.city_id
join public.countries co on co.code = c.country_code
where r.status = 'published'
  and rp.status = 'published'
  and c.is_active = true
  and co.is_active = true;

-- Registro público: Supabase Auth crea el usuario; este trigger crea su perfil.
-- Solo se crea un registro de conductor cuando el metadata role es 'driver'.
create or replace function public.handle_new_kabbure_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, country_code, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', 'Usuario Kabbure'),
    new.email,
    nullif(new.raw_user_meta_data ->> 'country_code', ''),
    nullif(new.raw_user_meta_data ->> 'phone', '')
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    email = excluded.email,
    country_code = excluded.country_code,
    phone = excluded.phone,
    updated_at = now();

  if coalesce(new.raw_user_meta_data ->> 'role', '') = 'driver' then
    insert into public.drivers (user_id)
    values (new.id)
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_kabbure on auth.users;
create trigger on_auth_user_created_kabbure
after insert on auth.users
for each row execute procedure public.handle_new_kabbure_user();

-- Lectura pública únicamente a través de la vista publicada.
grant select on public.published_route_paths to anon, authenticated;
revoke all on public.profiles, public.admin_users, public.drivers, public.route_sources,
  public.routes, public.route_paths, public.route_stops, public.route_imports,
  public.driver_route_assignments, public.organizations, public.organization_members
  from anon, authenticated;

-- El cliente público no escribe directamente en tablas administrativas.
revoke insert, update, delete, truncate on public.countries, public.cities,
  public.routes, public.route_paths, public.route_stops, public.route_sources,
  public.route_imports, public.driver_route_assignments, public.organizations,
  public.organization_members from anon, authenticated;
