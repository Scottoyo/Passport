# National Passport — architecture

This document is the design this codebase implements: the data model,
location hierarchy, permission model, routes, and admin workflows for one
national Passport site on one domain, backed by one fresh Supabase project.
It also lists the decisions still open before payments are real or before
any existing Orlando/AMI setup could be treated as this platform.

## Core rule, restated

A Passport is scoped to exactly one **Passport Area (region)**, not a
whole state. It is purchased for that region and works at every active,
participating business in it — but nowhere else, not even another region
in the same state. A customer covering multiple regions buys multiple
Passports. States and Subareas still organize **discovery** (what shows up
when you browse) and **administration** (who can edit what), but the
region boundary is the **redemption** boundary: `passports.passport_area_id`
(and `passport_products.passport_area_id`, since each region prices and
sizes its own product line) are hard columns, and `redemptions: staff
insert` in `0003_rls.sql`/`0023_area_scoped_passports.sql` checks that a
passport's `passport_area_id` matches the offer's business's area before
allowing a redemption. `state_id` still exists on both tables (a region
always belongs to exactly one state, trigger-enforced) and keeps
state-manager RLS, admin-scope filtering, and dashboard metrics working —
it's a valid rollup, just no longer the redemption boundary itself.

This is the second pivot of this rule. The first (`0008_state_scoped_passports.sql`)
moved it from one nationwide Passport to one per state, for the same
reason this one moves it from state to region: a more granular purchase
boundary drives more Passport sales (a multi-region trip means multiple
purchases). Each pivot was a deliberate product decision made explicitly,
not something this scaffold defaulted to.

## Data model

```
states
  └─ passport_areas (state_id)
       └─ subareas (passport_area_id)
       └─ businesses (passport_area_id, subarea_id?)
            └─ offers (business_id)

passport_products (passport_area_id, state_id)  -- each region prices/sizes its own product(s); state_id must match the area's
  └─ passports (owner_user_id, passport_product_id, passport_area_id, state_id)  -- both must match the product's
       └─ passport_members (passport_id)
       └─ redemptions (passport_id, offer_id, redeemed_member_id?)  -- RLS checks passport.passport_area_id = business's area

profiles (id = auth.users.id)
national_admins (user_id)             -- global access, granted not self-served
area_assignments (user_id, passport_area_id, can_*)   -- capability grants
local_staff (user_id, passport_area_id, business_id?) -- redemption-only grants
marketing_requests (passport_area_id, requested_by)
categories                            -- national taxonomy (Restaurants, etc.)
```

Full DDL: `supabase/migrations/0001_schema.sql`. Auth sync trigger:
`0002_auth_triggers.sql`. RLS: `0003_rls.sql`, `0004_staff_lookup.sql`.

Key modeling decisions:

- **A business belongs to exactly one Passport Area** (`passport_area_id`,
  `not null`), optionally one Subarea within it. That's the unit managers
  are assigned to and the unit permissions are scoped by — it is *not* a
  redemption boundary. Any customer's Passport works at any active
  business regardless of which area(s) they've browsed or which area, if
  any, they're personally closest to.
- **Every content table** (`states`, `passport_areas`, `subareas`,
  `businesses`, `offers`) shares one `content_status` enum:
  `draft → active ⇄ paused → archived`, plus a `launched_at` timestamp. This
  is what "save as draft / preview / launch / pause / relaunch" runs on —
  one lifecycle pattern reused everywhere instead of a bespoke one per
  entity.
- **Permissions are capability columns on `area_assignments`**
  (`can_view_metrics`, `can_manage_businesses`, `can_manage_offers`,
  `can_manage_subareas`, `can_submit_marketing_requests`,
  `can_manage_staff`), one row per (user, area). A manager assigned to two
  areas gets two rows and can hold different capabilities in each. National
  admins bypass this table entirely (see below) — they are not "assigned"
  to every area, they're a separate, smaller, more privileged set.
- **`local_staff` is deliberately separate from `area_assignments`.** Local
  staff (e.g. a cashier who checks Passports at one restaurant) need to
  create `redemptions` and look up the offers at their business — nothing
  else. Modeling them as a stripped-down assignment rather than reusing
  manager capabilities keeps their blast radius small by construction, not
  by convention.
- **`national_admins` is its own table**, not a boolean on `profiles`. A
  user can never grant themselves national-admin (RLS only allows an
  existing national admin to write that table, and a fresh Supabase project
  has zero rows in it — see "Bootstrapping" below). Auditable, not
  self-service, on purpose.

## Location hierarchy and routes

`State → Passport Area → Subarea → Businesses/Offers`, all created and
edited by admins, never hard-coded. Public routes (App Router, `src/app/`):

| Route | Purpose |
|---|---|
| `/` | Marketing homepage: what the Passport is, benefits, how it works, plus a list **and** interactive highlighted map of every active state (`#states`) — a state/region with no live perks yet prompts a "notify me" signup instead of linking through |
| `/states` | Redirects to `/#states` |
| `/[state]` | A state's active Passport Areas |
| `/[state]/[area]` | An area's Subareas, businesses, offers |
| `/[state]/[area]/[subarea]` | A Subarea's businesses |
| `/[state]/[area]/businesses/[business]` | Business profile + its offers |
| `/passport` | Region-first picker (links into `/[state]/[area]/passport`) |
| `/[state]/[area]/passport` | That region's Passport product explainer + purchase |
| `/account` | Signed-in customer's Passport(s) |
| `/admin/...` | Admin portal (below) |

`/florida/orlando` from the brief is realized as `/[state]/[area]`, but it's
a pattern, not a hard-coded page: every segment resolves against the
database (`getStateBySlug`, `getAreaBySlug`, ... in `src/lib/queries.ts`),
so a new state or area launched in the admin portal is live at its URL with
no deploy. This is the "reusable, database-driven page template" the brief
asks for — one `page.tsx` per hierarchy level, not one per place.

## Permissions and RLS

Four tiers, enforced in Postgres, not just hidden in the UI:

1. **National admins** (`national_admins` table) — full read/write on every
   table, every status, every area.
2. **Managers/franchisees** (`area_assignments` rows) — read/write scoped to
   the specific Passport Area(s) they're assigned to, filtered further by
   which capability columns are `true` on that row.
3. **Local staff** (`local_staff` rows) — can read businesses/offers at
   their business and insert `redemptions` there. Nothing else.
4. **Customers** — read active/public content; read and insert only their
   own `passports`/`passport_members`; read their own `redemptions`.

Every table has RLS enabled and policies keyed off two `security definer`
helper functions, `is_national_admin(uid)` and
`has_area_capability(uid, area_id, capability)`
(`supabase/migrations/0003_rls.sql`). The app layer
(`src/lib/permissions.ts`) calls the same logic to decide what UI to render
and fails fast with a clear error — but it is explicitly **not** the
security boundary. `src/proxy.ts` (Next 16's renamed `middleware.ts`) only
redirects signed-out visitors away from `/admin` for UX; it does not gate
by role, because role/area checks need the database round-trip that RLS
already does correctly on every single query. Hiding a link or filtering a
URL parameter is never treated as access control anywhere in this codebase.

### Bootstrapping the first national admin

There is intentionally no "make me an admin" button. Run, once, after
someone has signed in at least once:

```
SUPABASE_SERVICE_ROLE_KEY=... NEXT_PUBLIC_SUPABASE_URL=... \
  npm run admin:grant -- someone@example.com
```

This is the one place the service-role key (which bypasses RLS) is meant to
be used, and it's a local script, never app runtime code.

## Admin workflows

- **National admins** (`/admin/locations`) create states and Passport
  Areas, and move each between `draft → active ⇄ paused`. A `draft` or
  `paused` state/area is invisible on public routes (RLS) but still
  editable by the people who can see it — this is the "save as draft and
  preview" loop. There's no separate "preview" URL: a national admin's own
  RLS grants let them view their own draft area at its real public URL
  already (`passport_areas: public read active` policy includes `... or
  is_national_admin(...)`), so what they preview is exactly what customers
  will see once launched.
- **Managers/franchisees** (`/admin/areas/[areaId]`) get a workspace scoped
  to one area, with sections that only render if the corresponding
  capability is granted: Subareas, Businesses (offers are managed from a
  business's own page), Local staff, Marketing requests. A manager with
  only `can_view_metrics` sees a read-only shell; a franchisee with
  `can_manage_businesses` + `can_manage_offers` can add a business and its
  offers but can't touch Subareas or staff unless those capabilities are
  also granted.
- **Marketing requests** are the one thing managers can't do directly —
  they submit a request (`/admin/areas/[areaId]`, "Marketing requests"
  section) and a national admin triages it (`/admin/marketing-requests`)
  with a status (`submitted → in_review → approved/declined → completed`)
  and notes.

## Customer experience

Homepage explains the Passport and its per-state pricing, and includes a
`#states` section pairing a searchable list with an SVG US map
(`@svg-maps/usa`) that highlights only states with an active row in the
database — adding a state in the admin portal is what lights it up here.
State → area → subarea → business mirrors
amipassport.com's browse pattern (state-of-the-art for this category: browse
a metro's participating businesses, open a business profile, see its
offer(s), redeem in person), generalized to work across many
states/areas instead of one island, and without reusing any of its
branding, imagery, copy, or AMI-specific rules (e.g. "one calendar
year" was AMI's own product design choice, not something this schema
hard-codes — `passport_products.duration_days` is configurable per
product instead).

## Open decisions before this goes further

These are called out explicitly rather than silently decided by what got
built first:

1. **Payment processor.** `/[state]/[area]/passport`'s "Get my Passport"
   button (reached by picking a region from `/passport`) currently creates
   a `passports` row with `payment_reference =
   'PLACEHOLDER-NO-PAYMENT-PROCESSOR'` and no charge (`src/app/passport/actions.ts`).
   This exists so the rest of the product — RLS on `passports`, the account
   dashboard, redemption flow — could be built and exercised end-to-end.
   **It must not ship to real customers as-is.** Needs: a processor decision
   (Stripe is the default assumption but isn't chosen here), webhook-driven
   `passports` creation instead of a client-triggered insert, and a real
   `payment_reference`/receipt trail.
2. **Multiple Passport products/pricing tiers — resolved as per-region.**
   `passport_products.passport_area_id` means each region prices and sizes
   its own product line independently; a region can still have more than
   one product (e.g. individual vs. family) and the UI shows the cheapest
   active one for that region. Renewals/subscriptions vs. a fixed
   `duration_days` remains open.
3. **Redemption UX for local staff.** `redemptions` and the `is_area_staff`
   RLS check exist, but there's no scanning/lookup UI yet (e.g. a QR code on
   the customer's Passport, a staff-facing "look up this Passport" screen).
   Right now staff would need direct Supabase access to log a redemption.
4. **Existing Orlando/AMI data or code is not assumed to be reusable.**
   Nothing in this Supabase project or codebase was copied from an existing
   Orlando/AMI system — this is a fresh project per the brief. If an
   existing Orlando/AMI dataset should become the seed data for Florida's
   Orlando Passport Area, that's a deliberate migration decision (mapping
   their businesses/offers into `businesses`/`offers` under a real
   `passport_areas` row), not something this scaffold performs.
5. **Business ↔ multiple areas.** A business currently belongs to exactly
   one `passport_area_id`. A business that straddles two adjacent Passport
   Areas (or should be discoverable from both) isn't representable yet;
   whether that's a real need or an edge case worth ignoring is open.
6. **Marketing-request fulfillment.** The workflow tracks status and notes
   but doesn't yet define what "approved" triggers (a national admin
   manually building a campaign page? a separate content system?).
7. **Map data licensing/attribution.** `@svg-maps/usa` supplies the US map
   path data; confirm its license is acceptable for the final production
   site before shipping (it's MIT-licensed at the time of writing, but this
   wasn't the place to make that a load-bearing legal decision).
8. **Search/geo discovery.** Category filtering exists in the schema
   (`categories`, `businesses.category_id`) but state/area/subarea pages
   don't yet expose category filters, radius search, or lat/lng-based "near
   me" — `businesses.latitude`/`longitude` are captured but unused by any
   query yet.

## Stack

Next.js 16 (App Router, `src/` layout) + Supabase (Postgres, Auth, RLS) +
Tailwind CSS v4 + TypeScript. `@supabase/ssr` for session-aware
server/browser clients. No other backend — Supabase is the only server-side
datastore. See `.env.example` for the two-variable (+ one server-only)
configuration needed to point this app at a Supabase project.
