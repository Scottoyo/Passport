-- Three-tier branding (National -> State -> Region), extending the
-- existing per-region branding (0045) with a new state tier and a new
-- national tier, plus a new `manage_branding` capability so region/state
-- managers can be delegated branding control within their own scope
-- instead of it staying national-admin-only forever.

-- ----------------------------------------------------------------------------
-- 1. New capability column, defaulting to false so no existing manager
--    gains branding access automatically (same shape as manage_leads, 0046).
-- ----------------------------------------------------------------------------

alter table area_assignments add column can_manage_branding boolean not null default false;
alter table state_assignments add column can_manage_branding boolean not null default false;

-- ----------------------------------------------------------------------------
-- 2. Extend has_area_capability / has_state_capability with the new
--    capability (current bodies per 0046, one branch added to each).
-- ----------------------------------------------------------------------------

create or replace function has_area_capability(uid uuid, area_id uuid, capability text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from area_assignments aa
    where aa.user_id = uid
      and aa.passport_area_id = area_id
      and (
        (capability = 'view_metrics' and aa.can_view_metrics)
        or (capability = 'manage_businesses' and aa.can_manage_businesses)
        or (capability = 'manage_offers' and aa.can_manage_offers)
        or (capability = 'manage_subareas' and aa.can_manage_subareas)
        or (capability = 'submit_marketing_requests' and aa.can_submit_marketing_requests)
        or (capability = 'manage_staff' and aa.can_manage_staff)
        or (capability = 'manage_leads' and aa.can_manage_leads)
        or (capability = 'manage_branding' and aa.can_manage_branding)
      )
  ) or exists (
    select 1
    from state_assignments sa
    join passport_areas pa on pa.id = area_id
    where sa.user_id = uid
      and sa.state_id = pa.state_id
      and (
        (capability = 'view_metrics' and sa.can_view_metrics)
        or (capability = 'manage_businesses' and sa.can_manage_businesses)
        or (capability = 'manage_offers' and sa.can_manage_offers)
        or (capability = 'manage_subareas' and sa.can_manage_subareas)
        or (capability = 'submit_marketing_requests' and sa.can_submit_marketing_requests)
        or (capability = 'manage_staff' and sa.can_manage_staff)
        or (capability = 'manage_leads' and sa.can_manage_leads)
        or (capability = 'manage_branding' and sa.can_manage_branding)
      )
  );
$$;

create or replace function has_state_capability(uid uuid, target_state_id uuid, capability text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from state_assignments sa
    where sa.user_id = uid
      and sa.state_id = target_state_id
      and (
        (capability = 'view_metrics' and sa.can_view_metrics)
        or (capability = 'manage_businesses' and sa.can_manage_businesses)
        or (capability = 'manage_offers' and sa.can_manage_offers)
        or (capability = 'manage_subareas' and sa.can_manage_subareas)
        or (capability = 'submit_marketing_requests' and sa.can_submit_marketing_requests)
        or (capability = 'manage_staff' and sa.can_manage_staff)
        or (capability = 'manage_leads' and sa.can_manage_leads)
        or (capability = 'manage_branding' and sa.can_manage_branding)
      )
  );
$$;

-- ----------------------------------------------------------------------------
-- 3. area_assignments' own write/update policies gate a state manager
--    granting a capability to someone else behind already having it
--    themselves (one ceiling check per capability, 0014/0046) - extend
--    both with the new column.
-- ----------------------------------------------------------------------------

drop policy "area_assignments: admin write" on area_assignments;
create policy "area_assignments: admin write" on area_assignments
  for insert with check (
    is_national_admin(auth.uid())
    or exists (
      select 1 from state_assignments sa
      where sa.user_id = auth.uid()
        and sa.state_id = area_state_id(passport_area_id)
        and (not can_view_metrics or sa.can_view_metrics)
        and (not can_manage_businesses or sa.can_manage_businesses)
        and (not can_manage_offers or sa.can_manage_offers)
        and (not can_manage_subareas or sa.can_manage_subareas)
        and (not can_submit_marketing_requests or sa.can_submit_marketing_requests)
        and (not can_manage_staff or sa.can_manage_staff)
        and (not can_manage_leads or sa.can_manage_leads)
        and (not can_manage_branding or sa.can_manage_branding)
    )
  );

drop policy "area_assignments: admin update" on area_assignments;
create policy "area_assignments: admin update" on area_assignments
  for update using (
    is_national_admin(auth.uid())
    or is_state_manager(auth.uid(), area_state_id(passport_area_id))
  ) with check (
    is_national_admin(auth.uid())
    or exists (
      select 1 from state_assignments sa
      where sa.user_id = auth.uid()
        and sa.state_id = area_state_id(passport_area_id)
        and (not can_view_metrics or sa.can_view_metrics)
        and (not can_manage_businesses or sa.can_manage_businesses)
        and (not can_manage_offers or sa.can_manage_offers)
        and (not can_manage_subareas or sa.can_manage_subareas)
        and (not can_submit_marketing_requests or sa.can_submit_marketing_requests)
        and (not can_manage_staff or sa.can_manage_staff)
        and (not can_manage_leads or sa.can_manage_leads)
        and (not can_manage_branding or sa.can_manage_branding)
    )
  );

-- ----------------------------------------------------------------------------
-- 4. Region branding gets 4 new nullable columns (existing 3 from 0045
--    untouched, purely additive).
-- ----------------------------------------------------------------------------

alter table passport_areas
  add column brand_accent_color text,
  add column brand_text_color text,
  add column brand_background_color text,
  add column brand_hero_overlay text;

-- Widen passport_areas' update policy (0013) so a manager with the new
-- manage_branding capability can edit branding without needing
-- manage_subareas too - pure OR addition, never narrows anything.
drop policy "passport_areas: admin update" on passport_areas;
create policy "passport_areas: admin update" on passport_areas
  for update using (
    is_national_admin(auth.uid())
    or has_state_capability(auth.uid(), state_id, 'manage_subareas')
    or has_area_capability(auth.uid(), id, 'manage_branding')
    or has_state_capability(auth.uid(), state_id, 'manage_branding')
  ) with check (
    is_national_admin(auth.uid())
    or has_state_capability(auth.uid(), state_id, 'manage_subareas')
    or has_area_capability(auth.uid(), id, 'manage_branding')
    or has_state_capability(auth.uid(), state_id, 'manage_branding')
  );

-- ----------------------------------------------------------------------------
-- 5. State branding - fully greenfield columns (states.hero_image_url
--    already exists from 0001, reused rather than duplicated).
-- ----------------------------------------------------------------------------

alter table states
  add column brand_primary_color text,
  add column brand_secondary_color text,
  add column brand_accent_color text,
  add column brand_text_color text,
  add column brand_background_color text,
  add column brand_hero_overlay text,
  add column brand_logo_url text;

-- states' read policy (0003) only ever let a national admin see a
-- non-active state - a state manager could never read their own state row
-- if it were draft/paused. Widen it the same way passport_areas already
-- lets an assigned manager read their own area regardless of status.
drop policy "states: public read active" on states;
create policy "states: public read active" on states
  for select using (
    status = 'active'
    or is_national_admin(auth.uid())
    or is_state_manager(auth.uid(), id)
  );

-- states' update policy (0003) was national-admin-only, since no
-- state-level write path had ever existed. Add the new capability as a
-- pure OR addition - a state manager can now update their own state row
-- only if granted manage_branding (RLS can't be column-precise here, same
-- coarse-grained tradeoff passport_areas' own update policy already
-- accepts; the admin form only ever submits branding fields).
drop policy "states: admin update" on states;
create policy "states: admin update" on states
  for update using (
    is_national_admin(auth.uid())
    or has_state_capability(auth.uid(), id, 'manage_branding')
  ) with check (
    is_national_admin(auth.uid())
    or has_state_capability(auth.uid(), id, 'manage_branding')
  );

-- ----------------------------------------------------------------------------
-- 6. National branding - a true singleton row (fixed id, enforced by a
--    check constraint so there is never any ambiguity about which row is
--    "the" national branding).
-- ----------------------------------------------------------------------------

create table national_branding (
  id uuid primary key default '00000000-0000-0000-0000-000000000001'
    check (id = '00000000-0000-0000-0000-000000000001'),
  brand_primary_color text,
  brand_secondary_color text,
  brand_accent_color text,
  brand_text_color text,
  brand_background_color text,
  brand_hero_overlay text,
  brand_logo_url text,
  hero_image_url text,
  updated_at timestamptz not null default now()
);

create trigger national_branding_set_updated_at
  before update on national_branding
  for each row execute function set_updated_at();

alter table national_branding enable row level security;

create policy "national_branding: public read" on national_branding
  for select using (true);

create policy "national_branding: admin update" on national_branding
  for update using (is_national_admin(auth.uid())) with check (is_national_admin(auth.uid()));

-- No insert/delete policy - the single row is created once below and is
-- never re-created or removed.

insert into national_branding (
  id, brand_primary_color, brand_secondary_color, brand_accent_color,
  brand_text_color, brand_background_color, brand_hero_overlay, hero_image_url
) values (
  '00000000-0000-0000-0000-000000000001',
  '#061B3A', -- Deep Navy - primary buttons/headings
  '#073564', -- Passport Blue - links/interactive elements
  '#C8943E', -- Metallic Gold - premium accents/borders/icons
  '#071A35', -- main text
  '#FFFFFF', -- main background
  'none',    -- no dark overlay on the hero image
  '/images/branding/national/local-perks-national-hero.webp'
);

-- ----------------------------------------------------------------------------
-- 7. Storage: a public bucket for hero images at all three branding tiers.
--    Object paths are "national/...", "states/{stateId}/...", or
--    "areas/{areaId}/...", which the write policies parse the same way
--    business-media (0027) parses "{businessId}/..." - authorization comes
--    entirely from the path prefix, reusing the exact same capability
--    checks the rest of the app already enforces.
-- ----------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('branding-media', 'branding-media', true)
on conflict (id) do nothing;

create policy "branding-media: public read" on storage.objects
  for select using (bucket_id = 'branding-media');

create policy "branding-media: manager insert" on storage.objects
  for insert with check (
    bucket_id = 'branding-media'
    and (
      (split_part(name, '/', 1) = 'national' and is_national_admin(auth.uid()))
      or (
        split_part(name, '/', 1) = 'states'
        and (
          is_national_admin(auth.uid())
          or has_state_capability(auth.uid(), (split_part(name, '/', 2))::uuid, 'manage_branding')
        )
      )
      or (
        split_part(name, '/', 1) = 'areas'
        and (
          is_national_admin(auth.uid())
          or has_area_capability(auth.uid(), (split_part(name, '/', 2))::uuid, 'manage_branding')
          or has_state_capability(auth.uid(), area_state_id((split_part(name, '/', 2))::uuid), 'manage_branding')
        )
      )
    )
  );

create policy "branding-media: manager update" on storage.objects
  for update using (
    bucket_id = 'branding-media'
    and (
      (split_part(name, '/', 1) = 'national' and is_national_admin(auth.uid()))
      or (
        split_part(name, '/', 1) = 'states'
        and (
          is_national_admin(auth.uid())
          or has_state_capability(auth.uid(), (split_part(name, '/', 2))::uuid, 'manage_branding')
        )
      )
      or (
        split_part(name, '/', 1) = 'areas'
        and (
          is_national_admin(auth.uid())
          or has_area_capability(auth.uid(), (split_part(name, '/', 2))::uuid, 'manage_branding')
          or has_state_capability(auth.uid(), area_state_id((split_part(name, '/', 2))::uuid), 'manage_branding')
        )
      )
    )
  );

create policy "branding-media: manager delete" on storage.objects
  for delete using (
    bucket_id = 'branding-media'
    and (
      (split_part(name, '/', 1) = 'national' and is_national_admin(auth.uid()))
      or (
        split_part(name, '/', 1) = 'states'
        and (
          is_national_admin(auth.uid())
          or has_state_capability(auth.uid(), (split_part(name, '/', 2))::uuid, 'manage_branding')
        )
      )
      or (
        split_part(name, '/', 1) = 'areas'
        and (
          is_national_admin(auth.uid())
          or has_area_capability(auth.uid(), (split_part(name, '/', 2))::uuid, 'manage_branding')
          or has_state_capability(auth.uid(), area_state_id((split_part(name, '/', 2))::uuid), 'manage_branding')
        )
      )
    )
  );
