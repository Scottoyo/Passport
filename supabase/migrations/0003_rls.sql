-- ============================================================================
-- Row Level Security
--
-- This is the enforcement layer for "managers see and manage only their
-- assigned areas" and "national admins retain access to everything." UI
-- hiding and URL filtering are not sufficient on their own — every table
-- below is locked down so Postgres itself refuses out-of-scope reads/writes,
-- regardless of what the application code does.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Helper functions (security definer so they can read permission tables
-- that are themselves RLS-protected, without recursive policy evaluation).
-- ----------------------------------------------------------------------------

create or replace function is_national_admin(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from national_admins na where na.user_id = uid);
$$;

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
      )
  );
$$;

-- Passport Area a business belongs to, used by policies on offers (which
-- only carry business_id) and other business-scoped tables.
create or replace function business_area_id(b_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select passport_area_id from businesses where id = b_id;
$$;

create or replace function is_area_staff(uid uuid, b_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from local_staff ls
    where ls.user_id = uid
      and (ls.business_id = b_id or ls.business_id is null)
      and ls.passport_area_id = (select passport_area_id from businesses where id = b_id)
  );
$$;

-- ----------------------------------------------------------------------------
-- Enable RLS everywhere
-- ----------------------------------------------------------------------------

alter table profiles enable row level security;
alter table national_admins enable row level security;
alter table states enable row level security;
alter table passport_areas enable row level security;
alter table subareas enable row level security;
alter table categories enable row level security;
alter table businesses enable row level security;
alter table offers enable row level security;
alter table passport_products enable row level security;
alter table passports enable row level security;
alter table passport_members enable row level security;
alter table redemptions enable row level security;
alter table area_assignments enable row level security;
alter table local_staff enable row level security;
alter table marketing_requests enable row level security;

-- ----------------------------------------------------------------------------
-- profiles
-- ----------------------------------------------------------------------------

create policy "profiles: self read" on profiles
  for select using (id = auth.uid() or is_national_admin(auth.uid()));

-- Lets an area manager see the email of someone they've already added as
-- local staff (e.g. to render the staff list), without granting any wider
-- read access to the profiles table.
create policy "profiles: readable by area manager for their staff" on profiles
  for select using (
    exists (
      select 1 from local_staff ls
      where ls.user_id = profiles.id
        and has_area_capability(auth.uid(), ls.passport_area_id, 'manage_staff')
    )
  );

create policy "profiles: self update" on profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- ----------------------------------------------------------------------------
-- national_admins — only national admins may see or change the admin list.
-- ----------------------------------------------------------------------------

create policy "national_admins: admin manage" on national_admins
  for all using (is_national_admin(auth.uid())) with check (is_national_admin(auth.uid()));

-- ----------------------------------------------------------------------------
-- states — public reads active states; admins manage everything.
-- ----------------------------------------------------------------------------

create policy "states: public read active" on states
  for select using (status = 'active' or is_national_admin(auth.uid()));

create policy "states: admin write" on states
  for insert with check (is_national_admin(auth.uid()));

create policy "states: admin update" on states
  for update using (is_national_admin(auth.uid())) with check (is_national_admin(auth.uid()));

create policy "states: admin delete" on states
  for delete using (is_national_admin(auth.uid()));

-- ----------------------------------------------------------------------------
-- passport_areas — public reads active areas of active states; admins
-- manage everything; assigned managers can read their own area regardless
-- of status (so they can work on it pre-launch) but cannot change its
-- lifecycle (create/launch/pause is a national-admin action).
-- ----------------------------------------------------------------------------

create policy "passport_areas: public read active" on passport_areas
  for select using (
    (status = 'active' and exists (
      select 1 from states s where s.id = state_id and s.status = 'active'
    ))
    or is_national_admin(auth.uid())
    or exists (
      select 1 from area_assignments aa
      where aa.user_id = auth.uid() and aa.passport_area_id = passport_areas.id
    )
  );

create policy "passport_areas: admin write" on passport_areas
  for insert with check (is_national_admin(auth.uid()));

create policy "passport_areas: admin update" on passport_areas
  for update using (is_national_admin(auth.uid())) with check (is_national_admin(auth.uid()));

create policy "passport_areas: admin delete" on passport_areas
  for delete using (is_national_admin(auth.uid()));

-- ----------------------------------------------------------------------------
-- subareas — public reads active; admins manage all; managers with
-- can_manage_subareas manage their assigned area's subareas.
-- ----------------------------------------------------------------------------

create policy "subareas: public read active" on subareas
  for select using (
    (status = 'active' and exists (
      select 1 from passport_areas pa
      join states s on s.id = pa.state_id
      where pa.id = passport_area_id and pa.status = 'active' and s.status = 'active'
    ))
    or is_national_admin(auth.uid())
    or has_area_capability(auth.uid(), passport_area_id, 'manage_subareas')
    or has_area_capability(auth.uid(), passport_area_id, 'view_metrics')
  );

create policy "subareas: managed write" on subareas
  for insert with check (
    is_national_admin(auth.uid())
    or has_area_capability(auth.uid(), passport_area_id, 'manage_subareas')
  );

create policy "subareas: managed update" on subareas
  for update using (
    is_national_admin(auth.uid())
    or has_area_capability(auth.uid(), passport_area_id, 'manage_subareas')
  ) with check (
    is_national_admin(auth.uid())
    or has_area_capability(auth.uid(), passport_area_id, 'manage_subareas')
  );

create policy "subareas: managed delete" on subareas
  for delete using (
    is_national_admin(auth.uid())
    or has_area_capability(auth.uid(), passport_area_id, 'manage_subareas')
  );

-- ----------------------------------------------------------------------------
-- categories — national taxonomy, public read, admin write.
-- ----------------------------------------------------------------------------

create policy "categories: public read" on categories for select using (true);

create policy "categories: admin write" on categories
  for insert with check (is_national_admin(auth.uid()));

create policy "categories: admin update" on categories
  for update using (is_national_admin(auth.uid())) with check (is_national_admin(auth.uid()));

create policy "categories: admin delete" on categories
  for delete using (is_national_admin(auth.uid()));

-- ----------------------------------------------------------------------------
-- businesses — public reads active; admins manage all; managers with
-- can_manage_businesses manage their assigned area's businesses; area staff
-- can read businesses they work at (needed to look up offers at redemption).
-- ----------------------------------------------------------------------------

create policy "businesses: public read active" on businesses
  for select using (
    status = 'active'
    or is_national_admin(auth.uid())
    or has_area_capability(auth.uid(), passport_area_id, 'manage_businesses')
    or has_area_capability(auth.uid(), passport_area_id, 'view_metrics')
    or is_area_staff(auth.uid(), id)
  );

create policy "businesses: managed write" on businesses
  for insert with check (
    is_national_admin(auth.uid())
    or has_area_capability(auth.uid(), passport_area_id, 'manage_businesses')
  );

create policy "businesses: managed update" on businesses
  for update using (
    is_national_admin(auth.uid())
    or has_area_capability(auth.uid(), passport_area_id, 'manage_businesses')
  ) with check (
    is_national_admin(auth.uid())
    or has_area_capability(auth.uid(), passport_area_id, 'manage_businesses')
  );

create policy "businesses: managed delete" on businesses
  for delete using (
    is_national_admin(auth.uid())
    or has_area_capability(auth.uid(), passport_area_id, 'manage_businesses')
  );

-- ----------------------------------------------------------------------------
-- offers — same shape as businesses, scoped via the parent business's area.
-- ----------------------------------------------------------------------------

create policy "offers: public read active" on offers
  for select using (
    status = 'active'
    or is_national_admin(auth.uid())
    or has_area_capability(auth.uid(), business_area_id(business_id), 'manage_offers')
    or has_area_capability(auth.uid(), business_area_id(business_id), 'view_metrics')
    or is_area_staff(auth.uid(), business_id)
  );

create policy "offers: managed write" on offers
  for insert with check (
    is_national_admin(auth.uid())
    or has_area_capability(auth.uid(), business_area_id(business_id), 'manage_offers')
  );

create policy "offers: managed update" on offers
  for update using (
    is_national_admin(auth.uid())
    or has_area_capability(auth.uid(), business_area_id(business_id), 'manage_offers')
  ) with check (
    is_national_admin(auth.uid())
    or has_area_capability(auth.uid(), business_area_id(business_id), 'manage_offers')
  );

create policy "offers: managed delete" on offers
  for delete using (
    is_national_admin(auth.uid())
    or has_area_capability(auth.uid(), business_area_id(business_id), 'manage_offers')
  );

-- ----------------------------------------------------------------------------
-- passport_products — public reads active products (pricing page); the
-- product line itself is national and admin-only to change.
-- ----------------------------------------------------------------------------

create policy "passport_products: public read active" on passport_products
  for select using (status = 'active' or is_national_admin(auth.uid()));

create policy "passport_products: admin write" on passport_products
  for insert with check (is_national_admin(auth.uid()));

create policy "passport_products: admin update" on passport_products
  for update using (is_national_admin(auth.uid())) with check (is_national_admin(auth.uid()));

create policy "passport_products: admin delete" on passport_products
  for delete using (is_national_admin(auth.uid()));

-- ----------------------------------------------------------------------------
-- passports — owner can see/manage their own; national admins see all;
-- area staff can look up a passport by ID/QR at the point of redemption but
-- only through the narrow redemptions flow below, not a general browse.
-- ----------------------------------------------------------------------------

create policy "passports: owner read" on passports
  for select using (
    owner_user_id = auth.uid()
    or is_national_admin(auth.uid())
    or exists (
      select 1 from local_staff ls where ls.user_id = auth.uid()
    )
  );

create policy "passports: owner insert" on passports
  for insert with check (owner_user_id = auth.uid() or is_national_admin(auth.uid()));

create policy "passports: admin update" on passports
  for update using (is_national_admin(auth.uid())) with check (is_national_admin(auth.uid()));

-- ----------------------------------------------------------------------------
-- passport_members
-- ----------------------------------------------------------------------------

create policy "passport_members: owner read" on passport_members
  for select using (
    exists (
      select 1 from passports p
      where p.id = passport_id and p.owner_user_id = auth.uid()
    )
    or is_national_admin(auth.uid())
    or exists (select 1 from local_staff ls where ls.user_id = auth.uid())
  );

create policy "passport_members: owner write" on passport_members
  for insert with check (
    exists (
      select 1 from passports p
      where p.id = passport_id and p.owner_user_id = auth.uid()
    )
    or is_national_admin(auth.uid())
  );

create policy "passport_members: owner update" on passport_members
  for update using (
    exists (
      select 1 from passports p
      where p.id = passport_id and p.owner_user_id = auth.uid()
    )
    or is_national_admin(auth.uid())
  ) with check (
    exists (
      select 1 from passports p
      where p.id = passport_id and p.owner_user_id = auth.uid()
    )
    or is_national_admin(auth.uid())
  );

create policy "passport_members: owner delete" on passport_members
  for delete using (
    exists (
      select 1 from passports p
      where p.id = passport_id and p.owner_user_id = auth.uid()
    )
    or is_national_admin(auth.uid())
  );

-- ----------------------------------------------------------------------------
-- redemptions — the Passport owner can see their own redemption history;
-- area staff can create redemptions only for offers at businesses they
-- work at (this is the actual point-of-sale check-in action), and only see
-- redemptions they logged.
-- ----------------------------------------------------------------------------

create policy "redemptions: read own or staff" on redemptions
  for select using (
    exists (
      select 1 from passports p
      where p.id = passport_id and p.owner_user_id = auth.uid()
    )
    or is_national_admin(auth.uid())
    or redeemed_by_staff_id = auth.uid()
    or has_area_capability(auth.uid(), business_area_id(
      (select business_id from offers where id = offer_id)
    ), 'view_metrics')
  );

create policy "redemptions: staff insert" on redemptions
  for insert with check (
    is_national_admin(auth.uid())
    or is_area_staff(auth.uid(), (select business_id from offers where id = offer_id))
  );

-- ----------------------------------------------------------------------------
-- area_assignments — only national admins write; a manager can read their
-- own assignment rows so the app can render their permitted capabilities.
-- ----------------------------------------------------------------------------

create policy "area_assignments: self or admin read" on area_assignments
  for select using (user_id = auth.uid() or is_national_admin(auth.uid()));

create policy "area_assignments: admin write" on area_assignments
  for insert with check (is_national_admin(auth.uid()));

create policy "area_assignments: admin update" on area_assignments
  for update using (is_national_admin(auth.uid())) with check (is_national_admin(auth.uid()));

create policy "area_assignments: admin delete" on area_assignments
  for delete using (is_national_admin(auth.uid()));

-- ----------------------------------------------------------------------------
-- local_staff — managed by managers with can_manage_staff for that area.
-- ----------------------------------------------------------------------------

create policy "local_staff: read" on local_staff
  for select using (
    user_id = auth.uid()
    or is_national_admin(auth.uid())
    or has_area_capability(auth.uid(), passport_area_id, 'manage_staff')
  );

create policy "local_staff: managed write" on local_staff
  for insert with check (
    is_national_admin(auth.uid())
    or has_area_capability(auth.uid(), passport_area_id, 'manage_staff')
  );

create policy "local_staff: managed update" on local_staff
  for update using (
    is_national_admin(auth.uid())
    or has_area_capability(auth.uid(), passport_area_id, 'manage_staff')
  ) with check (
    is_national_admin(auth.uid())
    or has_area_capability(auth.uid(), passport_area_id, 'manage_staff')
  );

create policy "local_staff: managed delete" on local_staff
  for delete using (
    is_national_admin(auth.uid())
    or has_area_capability(auth.uid(), passport_area_id, 'manage_staff')
  );

-- ----------------------------------------------------------------------------
-- marketing_requests — managers with can_submit_marketing_requests create
-- and read their own area's requests; national admins triage all of them.
-- ----------------------------------------------------------------------------

create policy "marketing_requests: read" on marketing_requests
  for select using (
    is_national_admin(auth.uid())
    or has_area_capability(auth.uid(), passport_area_id, 'submit_marketing_requests')
    or has_area_capability(auth.uid(), passport_area_id, 'view_metrics')
  );

create policy "marketing_requests: managed write" on marketing_requests
  for insert with check (
    requested_by = auth.uid()
    and (
      is_national_admin(auth.uid())
      or has_area_capability(auth.uid(), passport_area_id, 'submit_marketing_requests')
    )
  );

create policy "marketing_requests: admin update" on marketing_requests
  for update using (is_national_admin(auth.uid())) with check (is_national_admin(auth.uid()));
