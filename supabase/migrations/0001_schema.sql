-- ============================================================================
-- National Passport — core schema
--
-- One nationwide Passport product. States, Passport Areas, and Subareas exist
-- to organize discovery, content, and admin permissions — never to scope
-- what a Passport is valid for. Any active Passport works at any active,
-- participating business nationwide.
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- Shared lifecycle status for anything an admin can draft / launch / pause.
-- ----------------------------------------------------------------------------
create type content_status as enum ('draft', 'active', 'paused', 'archived');

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- People
-- ----------------------------------------------------------------------------

-- One row per authenticated user (customers, national admins, managers, staff).
-- Row is created by a trigger on auth.users (see 0002_auth_triggers.sql).
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on profiles
  for each row execute function set_updated_at();

-- National admins have unrestricted access to every state, area, subarea,
-- business, offer, and report. Membership here is intentionally a separate
-- table (not a boolean on profiles) so granting it is a privileged, auditable
-- action rather than something a user could ever flip on themselves.
create table national_admins (
  user_id uuid primary key references profiles (id) on delete cascade,
  granted_by uuid references profiles (id),
  granted_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- Location hierarchy: State -> Passport Area -> Subarea
-- ----------------------------------------------------------------------------

create table states (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  abbreviation char(2) not null unique,
  status content_status not null default 'draft',
  intro_copy text,
  hero_image_url text,
  launched_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger states_set_updated_at
  before update on states
  for each row execute function set_updated_at();

-- A Passport Area is a metro/region within a state that customers discover
-- and that local managers/franchisees are assigned to (e.g. Orlando in
-- Florida). It never gates Passport validity — it is a discovery + admin
-- scoping unit only.
create table passport_areas (
  id uuid primary key default gen_random_uuid(),
  state_id uuid not null references states (id) on delete cascade,
  name text not null,
  slug text not null,
  status content_status not null default 'draft',
  tagline text,
  description text,
  hero_image_url text,
  launched_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (state_id, slug)
);

create index passport_areas_state_id_idx on passport_areas (state_id);

create trigger passport_areas_set_updated_at
  before update on passport_areas
  for each row execute function set_updated_at();

-- A Subarea is an optional smaller neighborhood/district inside a Passport
-- Area used for finer-grained discovery (e.g. "International Drive" inside
-- Orlando). Purely organizational, like Passport Areas.
create table subareas (
  id uuid primary key default gen_random_uuid(),
  passport_area_id uuid not null references passport_areas (id) on delete cascade,
  name text not null,
  slug text not null,
  status content_status not null default 'draft',
  description text,
  hero_image_url text,
  launched_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (passport_area_id, slug)
);

create index subareas_passport_area_id_idx on subareas (passport_area_id);

create trigger subareas_set_updated_at
  before update on subareas
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- Businesses and offers
-- ----------------------------------------------------------------------------

create table categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  sort_order int not null default 0
);

-- A business always belongs to exactly one Passport Area (its home turf for
-- admin/permission purposes) and may optionally be placed in a Subarea for
-- discovery. It is NOT scoped to that area for redemption: any customer
-- with a Passport can redeem its offers regardless of which area they
-- bought their Passport "through" (there is no such thing — one Passport).
create table businesses (
  id uuid primary key default gen_random_uuid(),
  passport_area_id uuid not null references passport_areas (id) on delete cascade,
  subarea_id uuid references subareas (id) on delete set null,
  category_id uuid references categories (id),
  name text not null,
  slug text not null,
  status content_status not null default 'draft',
  description text,
  address_line1 text,
  address_line2 text,
  city text,
  state_code char(2),
  postal_code text,
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  phone text,
  website_url text,
  hero_image_url text,
  launched_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references profiles (id),
  unique (passport_area_id, slug)
);

create index businesses_passport_area_id_idx on businesses (passport_area_id);
create index businesses_subarea_id_idx on businesses (subarea_id);
create index businesses_category_id_idx on businesses (category_id);

create trigger businesses_set_updated_at
  before update on businesses
  for each row execute function set_updated_at();

-- A CHECK constraint can't contain a subquery, so the "subarea must belong
-- to this business's own area" rule is enforced here instead.
create or replace function validate_business_subarea()
returns trigger
language plpgsql
as $$
begin
  if new.subarea_id is not null and not exists (
    select 1 from subareas s
    where s.id = new.subarea_id and s.passport_area_id = new.passport_area_id
  ) then
    raise exception 'subarea % does not belong to passport area %', new.subarea_id, new.passport_area_id;
  end if;
  return new;
end;
$$;

create trigger businesses_validate_subarea
  before insert or update on businesses
  for each row execute function validate_business_subarea();

create type discount_type as enum ('percent_off', 'amount_off', 'bogo', 'freebie', 'other');

create table offers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  title text not null,
  description text,
  terms text,
  discount_type discount_type not null default 'other',
  discount_value numeric(10, 2),
  redemptions_per_passport int not null default 1 check (redemptions_per_passport > 0),
  status content_status not null default 'draft',
  starts_at timestamptz,
  ends_at timestamptz,
  launched_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references profiles (id)
);

create index offers_business_id_idx on offers (business_id);
create index offers_status_idx on offers (status);

create trigger offers_set_updated_at
  before update on offers
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- The nationwide Passport product and ownership
-- ----------------------------------------------------------------------------

-- Defines what "buying a Passport" currently means (price, validity window,
-- how many members it covers). Not tied to any state/area — there is one
-- nationwide product line. Payment processing itself is an open decision;
-- see docs/ARCHITECTURE.md.
create table passport_products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price_cents int not null check (price_cents >= 0),
  currency char(3) not null default 'USD',
  duration_days int not null default 365,
  max_members int not null default 1 check (max_members > 0),
  status content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger passport_products_set_updated_at
  before update on passport_products
  for each row execute function set_updated_at();

create type passport_status as enum ('active', 'expired', 'revoked');

-- One purchased Passport per customer. Valid nationwide for its lifetime —
-- there is intentionally no area_id / state_id on this table.
create table passports (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references profiles (id),
  passport_product_id uuid not null references passport_products (id),
  status passport_status not null default 'active',
  purchased_at timestamptz not null default now(),
  expires_at timestamptz not null,
  payment_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index passports_owner_user_id_idx on passports (owner_user_id);

create trigger passports_set_updated_at
  before update on passports
  for each row execute function set_updated_at();

-- A Passport can cover more than one person (mirrors the common "good for
-- up to N people" pattern). Each member can be checked in at redemption.
create table passport_members (
  id uuid primary key default gen_random_uuid(),
  passport_id uuid not null references passports (id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now()
);

create index passport_members_passport_id_idx on passport_members (passport_id);

create table redemptions (
  id uuid primary key default gen_random_uuid(),
  passport_id uuid not null references passports (id),
  offer_id uuid not null references offers (id),
  redeemed_member_id uuid references passport_members (id),
  redeemed_by_staff_id uuid references profiles (id),
  redeemed_at timestamptz not null default now()
);

create index redemptions_passport_id_idx on redemptions (passport_id);
create index redemptions_offer_id_idx on redemptions (offer_id);

-- ----------------------------------------------------------------------------
-- Area-scoped permissions for managers / franchisees
-- ----------------------------------------------------------------------------

-- A manager/franchisee is granted access to one row per Passport Area they
-- run, with capabilities split out individually (spec: "Permissions may be
-- separated by capability"). Only national admins may write this table.
create table area_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  passport_area_id uuid not null references passport_areas (id) on delete cascade,
  can_view_metrics boolean not null default true,
  can_manage_businesses boolean not null default false,
  can_manage_offers boolean not null default false,
  can_manage_subareas boolean not null default false,
  can_submit_marketing_requests boolean not null default false,
  can_manage_staff boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references profiles (id),
  unique (user_id, passport_area_id)
);

create index area_assignments_user_id_idx on area_assignments (user_id);
create index area_assignments_passport_area_id_idx on area_assignments (passport_area_id);

create trigger area_assignments_set_updated_at
  before update on area_assignments
  for each row execute function set_updated_at();

-- Local staff (e.g. front-of-house at a participating business) who can
-- redeem offers in person, granted by a manager with can_manage_staff for
-- that area. Optionally scoped to a single business within the area.
create table local_staff (
  id uuid primary key default gen_random_uuid(),
  passport_area_id uuid not null references passport_areas (id) on delete cascade,
  business_id uuid references businesses (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  added_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  unique (passport_area_id, user_id, business_id)
);

create index local_staff_passport_area_id_idx on local_staff (passport_area_id);
create index local_staff_user_id_idx on local_staff (user_id);

-- Managers submit requests (campaigns, featured placement, etc.) up to
-- national admins rather than acting on national-level marketing directly.
create type marketing_request_status as enum ('submitted', 'in_review', 'approved', 'declined', 'completed');

create table marketing_requests (
  id uuid primary key default gen_random_uuid(),
  passport_area_id uuid not null references passport_areas (id) on delete cascade,
  requested_by uuid not null references profiles (id),
  title text not null,
  details text,
  status marketing_request_status not null default 'submitted',
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index marketing_requests_passport_area_id_idx on marketing_requests (passport_area_id);

create trigger marketing_requests_set_updated_at
  before update on marketing_requests
  for each row execute function set_updated_at();
