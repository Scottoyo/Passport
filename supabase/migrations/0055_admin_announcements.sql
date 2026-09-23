-- Admin Announcements: admins broadcast a message to passport holders and
-- business owners/staff in their scope (national / state / region - same
-- 3-tier shape as promo_codes, 0042). In-app only (bell +
-- /account/notifications), no email. Also finishes wiring the notification
-- preferences that Settings already exposed but nothing produced events
-- for (see queries.ts / notification-bell.tsx changes alongside this
-- migration), and drops the "new_achievement_available" preference, which
-- has no sensible trigger without a whole admin-manageable achievement
-- catalog (out of scope).

-- ----------------------------------------------------------------------------
-- 1. New capability, same shape as manage_leads/manage_branding (0046/0047).
-- ----------------------------------------------------------------------------

alter table area_assignments add column can_manage_announcements boolean not null default false;
alter table state_assignments add column can_manage_announcements boolean not null default false;

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
        or (capability = 'manage_announcements' and aa.can_manage_announcements)
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
        or (capability = 'manage_announcements' and sa.can_manage_announcements)
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
        or (capability = 'manage_announcements' and sa.can_manage_announcements)
      )
  );
$$;

-- area_assignments' own write/update policies gate a state manager granting
-- a capability to someone else behind already having it themselves (one
-- ceiling check per capability, 0014/0047) - extend both with the new
-- column so a manager without can_manage_announcements can't grant it.

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
        and (not can_manage_announcements or sa.can_manage_announcements)
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
        and (not can_manage_announcements or sa.can_manage_announcements)
    )
  );

-- ----------------------------------------------------------------------------
-- 2. Recipient-visibility helper - security definer/stable so it can be
--    called from admin_announcements' own RLS policy without re-entering
--    passports/businesses/local_staff's own RLS (same idiom as
--    area_state_id, 0014).
-- ----------------------------------------------------------------------------

create function is_area_recipient(uid uuid, target_area_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from passports p
    where p.owner_user_id = uid and p.passport_area_id = target_area_id
  ) or exists (
    select 1 from businesses b
    where b.passport_area_id = target_area_id
      and (
        b.created_by = uid
        or exists (
          select 1 from local_staff ls
          where ls.business_id = b.id and ls.user_id = uid
        )
      )
  );
$$;

-- ----------------------------------------------------------------------------
-- 3. admin_announcements table. Immutable broadcasts - no update/delete
--    policy, matching region_events/admin_notifications' own append-only
--    shape (no edit/retract UI was requested).
-- ----------------------------------------------------------------------------

create table admin_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  scope_state_id uuid references states(id) on delete cascade,
  scope_area_id uuid references passport_areas(id) on delete cascade,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create index admin_announcements_scope_state_idx on admin_announcements(scope_state_id);
create index admin_announcements_scope_area_idx on admin_announcements(scope_area_id);

alter table admin_announcements enable row level security;

-- One combined SELECT policy (this codebase never splits one command
-- across multiple permissive policies on the same table) with two
-- conceptually distinct audiences ORed together:
--  (a) managers with manage_announcements in this scope or above, reading
--      the composer's own history of past announcements;
--  (b) ordinary recipients (passport holders, business owners/staff) in the
--      announcement's scope, reading it for their notification feed.
-- A national broadcast (both scope columns null) is readable by any signed
-- in user - auth.uid() is not null is required so an anonymous request
-- never matches this branch.
create policy "admin_announcements: read" on admin_announcements
  for select using (
    is_national_admin(auth.uid())
    or (scope_area_id is not null and has_area_capability(auth.uid(), scope_area_id, 'manage_announcements'))
    or (scope_area_id is null and scope_state_id is not null and has_state_capability(auth.uid(), scope_state_id, 'manage_announcements'))
    or (scope_state_id is null and scope_area_id is null and auth.uid() is not null)
    or (scope_area_id is not null and is_area_recipient(auth.uid(), scope_area_id))
    or (
      scope_area_id is null and scope_state_id is not null
      and exists (
        select 1 from passport_areas pa
        where pa.state_id = admin_announcements.scope_state_id
          and is_area_recipient(auth.uid(), pa.id)
      )
    )
  );

create policy "admin_announcements: write by managers" on admin_announcements
  for insert with check (
    is_national_admin(auth.uid())
    or (scope_area_id is not null and has_area_capability(auth.uid(), scope_area_id, 'manage_announcements'))
    or (scope_area_id is null and scope_state_id is not null and has_state_capability(auth.uid(), scope_state_id, 'manage_announcements'))
  );

-- ----------------------------------------------------------------------------
-- 4. Preference cleanup: drop new_achievement_available going forward, and
--    backfill existing rows.
-- ----------------------------------------------------------------------------

alter table profiles
  alter column notification_preferences
  set default '{"achievement_unlocked":true,"admin_announcement":true,"new_business_added":true,"new_promotion_added":true}';

update profiles
set notification_preferences = notification_preferences - 'new_achievement_available'
where notification_preferences ? 'new_achievement_available';
