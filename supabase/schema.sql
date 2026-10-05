-- KABBURE — esquema mínimo inicial
-- Ejecutar en Supabase > SQL Editor > New query.
-- Este script elimina primero el esquema anterior de Kabbure y crea solo lo necesario.
-- No crea una tabla de administradores: el único administrador se valida por ADMIN_USER_ID en el servidor.

create extension if not exists pgcrypto;

-- Limpiar el esquema anterior de Kabbure sin tocar auth.users.
drop view if exists public.published_route_paths cascade;
drop trigger if exists on_auth_user_created_kabbure on auth.users;
drop function if exists public.handle_new_kabbure_user() cascade;
drop table if exists public.driver_route_assignments cascade;
drop table if exists public.drivers cascade;
drop table if exists public.route_paths cascade;
drop table if exists public.routes cascade;
drop table if exists public.cities cascade;
drop table if exists public.countries cascade;
drop table if exists public.profiles cascade;

-- 1. Usuarios comunes de Kabbure.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text,
  country_code char(2),
  phone text,
  cargo text not null default 'usuario' check (cargo in ('usuario', 'conductor', 'organizacion')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Catálogo territorial.
create table public.countries (
  code char(2) primary key,
  name text not null unique,
  dial_code text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.cities (
  id uuid primary key default gen_random_uuid(),
  country_code char(2) not null references public.countries(code),
  name text not null,
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (country_code, name)
);

-- 3. Catálogo de rutas administradas por Kabbure.
create table public.routes (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references public.cities(id),
  public_code text not null,
  display_name text not null,
  description text,
  status text not null default 'draft' check (status in ('draft', 'pending_review', 'approved', 'published', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (city_id, public_code, display_name)
);

-- 4. Dos recorridos fijos por ruta: A y B.
-- La dirección se expresa con origen y destino, no con ida/vuelta.
create table public.route_paths (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references public.routes(id) on delete cascade,
  path_code char(1) not null check (path_code in ('A', 'B')),
  origin_name text not null,
  destination_name text not null,
  geometry jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'pending_review', 'approved', 'published', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (route_id, path_code)
);

-- 5. Datos específicos del conductor.
create table public.drivers (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  verification_status text not null default 'pending' check (verification_status in ('pending', 'approved', 'rejected', 'suspended')),
  driver_status text not null default 'inactive' check (driver_status in ('inactive', 'active', 'paused')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 6. Historial renovable de rutas elegidas por el conductor.
create table public.driver_route_assignments (
  id uuid primary key default gen_random_uuid(),
  driver_user_id uuid not null references public.drivers(user_id) on delete cascade,
  route_path_id uuid not null references public.route_paths(id),
  status text not null default 'active' check (status in ('active', 'paused', 'ended')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  unique (driver_user_id, route_path_id, started_at)
);

create index cities_country_idx on public.cities(country_code);
create index routes_city_status_idx on public.routes(city_id, status);
create index route_paths_route_status_idx on public.route_paths(route_id, status);
create index assignments_driver_status_idx on public.driver_route_assignments(driver_user_id, status);

-- Vista pública para que el mapa solo lea rutas publicadas.
create or replace view public.published_route_paths as
select
  r.id as route_id,
  r.public_code,
  r.display_name,
  r.description,
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

-- Crear profile para cada cuenta de Auth.
-- Si el registro llega con cargo=conductor, también crea drivers.
create or replace function public.handle_new_kabbure_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  profile_cargo text := coalesce(new.raw_user_meta_data ->> 'cargo', 'usuario');
begin
  if profile_cargo not in ('usuario', 'conductor', 'organizacion') then
    profile_cargo := 'usuario';
  end if;

  insert into public.profiles (id, full_name, email, country_code, phone, cargo)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', 'Usuario Kabbure'),
    new.email,
    nullif(new.raw_user_meta_data ->> 'country_code', ''),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    profile_cargo
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    email = excluded.email,
    country_code = excluded.country_code,
    phone = excluded.phone,
    cargo = excluded.cargo,
    updated_at = now();

  if profile_cargo = 'conductor' then
    insert into public.drivers (user_id)
    values (new.id)
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created_kabbure
after insert on auth.users
for each row execute procedure public.handle_new_kabbure_user();

grant select on public.published_route_paths to anon, authenticated;
