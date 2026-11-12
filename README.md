# Invitación boda civil · Mariana & Diego

- `invitacion-boda-mariana-diego (3).html`: la invitación original. No se edita; al desplegar solo se le agregan dos scripts.
- `web/rsvp.js`: al presionar "Confirmar asistencia" desde la liga del invitado, lo registra como confirmado y datos bancarios en "Mesa de regalos".
- `web/dashboard/`: dashboard de invitados (`/dashboard/`).
- `supabase/migrations/`: esquema de la base de datos.
- `.github/workflows/`: despliegue a GitHub Pages y migraciones a Supabase.

## Configuración (una sola vez)

1. **Supabase**: crea un proyecto y aplica las migraciones de `supabase/migrations/` (con el workflow o con la CLI, ver abajo).
2. **Secrets en GitHub** (Settings > Secrets and variables > Actions): `SUPABASE_URL` y `SUPABASE_ANON_KEY` (Project Settings > API).
   Opcional, en *Variables*: `SITE_URL` si usas dominio propio.
3. **GitHub Pages**: Settings > Pages > Build and deployment > Source: **GitHub Actions**. Sin esto el workflow falla en `configure-pages`.
4. Haz merge a `main` (o ejecuta el workflow "Desplegar invitación" a mano desde la pestaña Actions).

El dashboard no tiene login: cualquiera con su URL puede ver y editar la lista. No la compartas.

## Uso

- Dashboard: `https://<usuario>.github.io/boda_civil_diego/dashboard/`
- Link de cada invitado: `https://<usuario>.github.io/boda_civil_diego/juan-perez`
- Excel: descarga la plantilla y llena la columna `Nombre del invitado` (opcionales: `Teléfono`, `Pases`, `Grupo`, `Notas`). Volver a cargar el mismo archivo actualiza a los invitados sin perder sus confirmaciones.
- "Mesa de regalos" en el dashboard guarda banco, titular y CLABE, que se muestran en la invitación.

## Migraciones

Automáticas: agrega los secrets `SUPABASE_PROJECT_ID`, `SUPABASE_DB_PASSWORD` y `SUPABASE_ACCESS_TOKEN`. Si no existen, el workflow se omite sin fallar.

Manuales, con la CLI:

```bash
supabase link --project-ref <ref>
supabase db push
```
