# National Passport

One nationwide Passport, one website. States, Passport Areas, and Subareas
organize discovery and admin permissions — they never limit where a
Passport is valid. See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for
the full design (data model, routes, permissions, admin workflows, and the
decisions still open before this takes real payments).

## Stack

Next.js 16 (App Router) + Supabase (Postgres/Auth/RLS) + Tailwind CSS v4 +
TypeScript.

## Setup

1. Create a **fresh** Supabase project (not an existing Orlando/AMI one —
   see the architecture doc's open decisions).
2. Copy `.env.example` to `.env.local` and fill in your project's URL and
   anon key. `SUPABASE_SERVICE_ROLE_KEY` is only needed for the admin
   bootstrap script below, never for running the app.
3. Apply the schema, in order, via the Supabase SQL editor or CLI:
   - `supabase/migrations/0001_schema.sql`
   - `supabase/migrations/0002_auth_triggers.sql`
   - `supabase/migrations/0003_rls.sql`
   - `supabase/migrations/0004_staff_lookup.sql`

   With the [Supabase CLI](https://supabase.com/docs/guides/cli) linked to
   your project: `npx supabase db push`.
4. Optionally load example data (generic, not AMI/Anna Maria Island data —
   two independent states so the hierarchy is obviously not hard-coded to
   one place): `npx supabase db execute -f supabase/seed.sql`.
5. Install dependencies and run the app:

   ```
   npm install
   npm run dev
   ```
6. Sign in once at `/sign-in` with the email you want to be the first
   national admin, then grant it:

   ```
   SUPABASE_SERVICE_ROLE_KEY=... NEXT_PUBLIC_SUPABASE_URL=... \
     npm run admin:grant -- you@example.com
   ```

   From there, use `/admin/locations` to create states and Passport Areas,
   and `/admin/areas/[areaId]` (linked from there) to assign managers and
   franchisees with per-capability access (view metrics, manage businesses,
   manage offers, manage subareas, submit marketing requests, manage local
   staff).

## Project layout

```
src/app/                    routes (national, state/area/subarea, admin)
src/components/             shared UI (map, cards, status badges, forms)
src/lib/supabase/           browser + server Supabase clients
src/lib/queries.ts          public read queries (state/area/subarea/business/offer)
src/lib/permissions.ts      current-user + capability helpers (UX only — see below)
src/proxy.ts                Next 16's middleware.ts equivalent; redirects signed-out /admin visitors
supabase/migrations/        schema + RLS, applied in filename order
supabase/seed.sql           example (non-AMI) location/business/offer data
scripts/grant-national-admin.mjs  one-off first-admin bootstrap
docs/ARCHITECTURE.md        full design + open decisions
```

**Authorization lives in Postgres Row Level Security**
(`supabase/migrations/0003_rls.sql`, `0004_staff_lookup.sql`), not in the
UI. `src/lib/permissions.ts` and `src/proxy.ts` exist for UX (rendering the
right admin sections, redirecting signed-out visitors) — every read and
write still goes through RLS regardless of what those checks decide.

## Commands

- `npm run dev` — start the dev server
- `npm run build` / `npm run start` — production build/serve
- `npm run lint` — ESLint
- `npm run admin:grant -- <email>` — bootstrap the first national admin
