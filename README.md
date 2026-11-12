# Invitación boda civil · Mariana & Diego

- `invitacion-boda-mariana-diego (3).html`: la invitación original. No se edita; al desplegar solo se le agregan dos scripts.
- `web/rsvp.js`: confirmación personalizada y datos bancarios en "Mesa de regalos".
- `web/dashboard/`: dashboard de invitados (`/dashboard/`).
- `supabase/migrations/`: esquema de la base de datos.
- `.github/workflows/`: despliegue a GitHub Pages y migraciones a Supabase.

## Configuración (una sola vez)

1. **Supabase**: crea un proyecto.
2. **Secrets en GitHub** (Settings > Secrets and variables > Actions):
   - `SUPABASE_URL` y `SUPABASE_ANON_KEY` (Project Settings > API).
   - `SUPABASE_PROJECT_ID` (el ref del proyecto), `SUPABASE_DB_PASSWORD` y `SUPABASE_ACCESS_TOKEN` (supabase.com/dashboard/account/tokens).
   - Opcional, en *Variables*: `SITE_URL` si usas dominio propio (ej. `https://mariana-y-diego.com`).
3. **GitHub Pages**: Settings > Pages > Source: **GitHub Actions**.
4. Haz merge a `main`. Se aplican las migraciones y se publica el sitio.
5. **Usuario del dashboard**: en Supabase > Authentication > Users crea tu usuario (correo y contraseña). Desactiva el registro público (Authentication > Sign In / Providers > "Allow new users to sign up"). Luego en el SQL Editor:
   ```sql
   insert into public.admins (email) values ('tu-correo@ejemplo.com');
   ```

## Uso

- Dashboard: `https://<usuario>.github.io/boda_civil_diego/dashboard/`
- Link de cada invitado: `https://<usuario>.github.io/boda_civil_diego/juan-perez`
- Excel: columnas `Nombre`, `Teléfono`, `Pases`, `Grupo`, `Notas`. Volver a cargar el mismo archivo actualiza a los invitados sin perder sus confirmaciones.
- "Mesa de regalos" en el dashboard guarda banco, titular y CLABE, que se muestran en la invitación.

## Migraciones locales (opcional)

```bash
supabase link --project-ref <ref>
supabase db push
```
