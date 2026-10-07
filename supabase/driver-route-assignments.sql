-- KABBURE — migración de asignación de rutas para conductores
-- Ejecutar una sola vez en Supabase > SQL Editor.
-- El conductor se vincula a la ruta completa, no a la dirección A o B.

begin;

-- 1. Agregar la relación correcta a la ruta principal.
alter table public.driver_route_assignments
  add column if not exists route_id uuid;

-- 2. Conservar asignaciones existentes trasladándolas desde route_path_id.
update public.driver_route_assignments assignment
set route_id = route_path.route_id
from public.route_paths route_path
where assignment.route_id is null
  and assignment.route_path_id = route_path.id;

-- 3. Asegurar que toda asignación apunte a una ruta completa.
alter table public.driver_route_assignments
  alter column route_id set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'driver_route_assignments_route_id_fkey'
  ) then
    alter table public.driver_route_assignments
      add constraint driver_route_assignments_route_id_fkey
      foreign key (route_id) references public.routes(id);
  end if;
end $$;

-- 4. Eliminar la relación anterior con una dirección individual.
alter table public.driver_route_assignments
  drop constraint if exists driver_route_assignments_driver_user_id_route_path_id_started_at_key;
alter table public.driver_route_assignments
  drop column if exists route_path_id;

-- 5. Definir el periodo elegido por el conductor.
alter table public.driver_route_assignments
  add column if not exists period_type text not null default 'indefinite';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'driver_route_assignments_period_type_check'
  ) then
    alter table public.driver_route_assignments
      add constraint driver_route_assignments_period_type_check
      check (period_type in ('daily', 'weekly', 'monthly', 'indefinite'));
  end if;
end $$;

-- started_at y ended_at representan la vigencia de la relación.
-- daily: 1 día; weekly: 7 días; monthly: 1 mes; indefinite: ended_at nulo.

-- 6. Si existieran varias activas por conductor, conserva la más reciente.
with ranked_active as (
  select id,
         row_number() over (partition by driver_user_id order by started_at desc, created_at desc) as position
  from public.driver_route_assignments
  where status = 'active'
)
update public.driver_route_assignments assignment
set status = 'ended', ended_at = coalesce(ended_at, now())
from ranked_active
where assignment.id = ranked_active.id
  and ranked_active.position > 1;

create unique index if not exists driver_one_active_route_idx
  on public.driver_route_assignments(driver_user_id)
  where status = 'active';

create index if not exists driver_route_assignments_route_idx
  on public.driver_route_assignments(route_id, status);

alter table public.driver_route_assignments disable row level security;
grant select, insert, update, delete on public.driver_route_assignments to anon, authenticated;

comment on table public.driver_route_assignments is 'Relación temporal entre un conductor y una ruta completa de Kabbure.';
comment on column public.driver_route_assignments.period_type is 'Vigencia elegida: daily, weekly, monthly o indefinite.';
comment on column public.driver_route_assignments.route_id is 'Ruta completa; no representa individualmente las direcciones A o B.';

commit;
