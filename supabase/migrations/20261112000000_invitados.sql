-- Migración inicial: invitados, admins y funciones de confirmación (RSVP).

create extension if not exists pgcrypto;

-- Invitados ------------------------------------------------------------
create table if not exists public.invitados (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  nombre        text not null,
  telefono      text,
  grupo         text,
  pases         int  not null default 1 check (pases >= 1),
  notas         text,
  estado        text not null default 'pendiente'
                check (estado in ('pendiente', 'confirmado', 'no_asiste')),
  asistentes    int,
  mensaje       text,
  respondido_at timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Correos con acceso al dashboard ---------------------------------------
create table if not exists public.admins (
  email text primary key
);

alter table public.invitados enable row level security;
alter table public.admins    enable row level security;

create or replace function public.es_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.admins
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

drop policy if exists "admins gestionan invitados" on public.invitados;
create policy "admins gestionan invitados" on public.invitados
  for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

drop policy if exists "admins se ven" on public.admins;
create policy "admins se ven" on public.admins
  for select to authenticated
  using (public.es_admin());

-- Funciones públicas que usa la invitación -------------------------------
-- El público no puede leer la tabla: solo consulta su propia invitación
-- por slug y registra su respuesta.

create or replace function public.get_invitado(p_slug text)
returns table (nombre text, pases int, estado text, asistentes int)
language sql stable security definer set search_path = public
as $$
  select i.nombre, i.pases, i.estado, i.asistentes
  from public.invitados i
  where i.slug = lower(trim(p_slug));
$$;

create or replace function public.responder_invitacion(
  p_slug text,
  p_asiste boolean,
  p_asistentes int default null,
  p_mensaje text default null
)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  v public.invitados;
begin
  select * into v from public.invitados
  where slug = lower(trim(p_slug))
  for update;

  if not found then
    raise exception 'Invitación no encontrada';
  end if;

  update public.invitados set
    estado        = case when p_asiste then 'confirmado' else 'no_asiste' end,
    asistentes    = case when p_asiste
                      then greatest(1, least(coalesce(p_asistentes, v.pases), v.pases))
                      else 0 end,
    mensaje       = left(nullif(trim(coalesce(p_mensaje, '')), ''), 500),
    respondido_at = now(),
    updated_at    = now()
  where id = v.id;

  return case when p_asiste then 'confirmado' else 'no_asiste' end;
end;
$$;

revoke all on function public.get_invitado(text) from public;
revoke all on function public.responder_invitacion(text, boolean, int, text) from public;
grant execute on function public.get_invitado(text) to anon, authenticated;
grant execute on function public.responder_invitacion(text, boolean, int, text) to anon, authenticated;
grant execute on function public.es_admin() to authenticated;

-- Actualizaciones en tiempo real para el dashboard
do $$
begin
  alter publication supabase_realtime add table public.invitados;
exception when duplicate_object then null;
end $$;

-- IMPORTANTE: agrega aquí el correo con el que entrarás al dashboard
-- (debe existir también en Authentication > Users).
-- insert into public.admins (email) values ('tu-correo@ejemplo.com');
