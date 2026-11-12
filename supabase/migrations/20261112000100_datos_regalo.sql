-- Datos bancarios para la mesa de regalos (una sola fila, editable desde el dashboard).

create table if not exists public.datos_regalo (
  id          int primary key default 1 check (id = 1),
  banco       text,
  titular     text,
  clabe       text check (clabe is null or clabe ~ '^[0-9]{18}$'),
  updated_at  timestamptz not null default now()
);

insert into public.datos_regalo (id) values (1) on conflict (id) do nothing;

alter table public.datos_regalo enable row level security;

drop policy if exists "admins gestionan datos_regalo" on public.datos_regalo;
create policy "admins gestionan datos_regalo" on public.datos_regalo
  for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

-- Lectura pública solo de lo necesario para la invitación
create or replace function public.get_datos_regalo()
returns table (banco text, titular text, clabe text)
language sql stable security definer set search_path = public
as $$
  select d.banco, d.titular, d.clabe from public.datos_regalo d where d.id = 1;
$$;

revoke all on function public.get_datos_regalo() from public;
grant execute on function public.get_datos_regalo() to anon, authenticated;
