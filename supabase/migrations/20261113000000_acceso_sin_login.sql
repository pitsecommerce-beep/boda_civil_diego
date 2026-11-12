-- Dashboard sin login: el acceso se hace solo con la anon key.
-- Cualquiera con la anon key (pública en el sitio) puede leer y editar estas tablas.

drop policy if exists "admins gestionan invitados"     on public.invitados;
drop policy if exists "admins gestionan datos_regalo"  on public.datos_regalo;
drop policy if exists "admins se ven"                  on public.admins;
drop function if exists public.es_admin();
drop table if exists public.admins;

drop policy if exists "acceso anon invitados" on public.invitados;
create policy "acceso anon invitados" on public.invitados
  for all to anon, authenticated using (true) with check (true);

drop policy if exists "acceso anon datos_regalo" on public.datos_regalo;
create policy "acceso anon datos_regalo" on public.datos_regalo
  for all to anon, authenticated using (true) with check (true);

grant select, insert, update, delete on public.invitados    to anon, authenticated;
grant select, insert, update, delete on public.datos_regalo to anon, authenticated;
