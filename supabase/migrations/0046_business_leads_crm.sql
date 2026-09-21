-- Business Leads CRM: a sales pipeline for prospective businesses being
-- courted to join the Passport, entirely separate from the live
-- `businesses` table (which represents actual, approved directory
-- listings - a CRM lead is never a listing). Scoped by the same
-- national/state/region hierarchy every other admin feature uses, via a
-- new 7th capability (`manage_leads`) alongside the existing six on
-- area_assignments/state_assignments, extended the same way every prior
-- capability was added - not a new, parallel permission system.

-- ----------------------------------------------------------------------------
-- 1. New capability column, defaulting to false so no existing manager
--    gains CRM access automatically.
-- ----------------------------------------------------------------------------

alter table area_assignments add column can_manage_leads boolean not null default false;
alter table state_assignments add column can_manage_leads boolean not null default false;

-- ----------------------------------------------------------------------------
-- 2. Extend has_area_capability / has_state_capability with the new
--    capability (current bodies per 0011/0040, one branch added to each).
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
      )
  );
$$;

-- ----------------------------------------------------------------------------
-- 3. area_assignments' own write/update policies gate a state manager
--    granting a capability to someone else behind already having it
--    themselves (one ceiling check per capability, 0014) - extend both
--    with the new column so can_manage_leads is gated the same way as the
--    other six, not silently ungated.
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
    )
  );

-- ----------------------------------------------------------------------------
-- 4. business_leads
-- ----------------------------------------------------------------------------

create type business_lead_disposition as enum ('lead', 'in_progress', 'closed_won', 'lost');

create table business_leads (
  id uuid primary key default gen_random_uuid(),
  state_id uuid not null references states(id) on delete cascade,
  passport_area_id uuid not null references passport_areas(id) on delete cascade,
  business_name text not null,
  contact_first_name text,
  contact_last_name text,
  phone text,
  email text,
  disposition business_lead_disposition not null default 'lead',
  emailed boolean not null default false,
  called boolean not null default false,
  visited boolean not null default false,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index business_leads_state_id_idx on business_leads(state_id);
create index business_leads_passport_area_id_idx on business_leads(passport_area_id);
create index business_leads_disposition_idx on business_leads(disposition);
create index business_leads_business_name_idx on business_leads(business_name);
create index business_leads_contact_first_name_idx on business_leads(contact_first_name);
create index business_leads_contact_last_name_idx on business_leads(contact_last_name);
create index business_leads_email_idx on business_leads(email);
create index business_leads_created_at_idx on business_leads(created_at desc);
create index business_leads_updated_at_idx on business_leads(updated_at desc);

create trigger business_leads_set_updated_at
  before update on business_leads
  for each row execute function set_updated_at();

alter table business_leads enable row level security;

-- Same three-way OR-widening shape as marketing_requests (0032): national
-- admin, or area-level manage_leads, or state-level manage_leads.
create policy "business_leads: read" on business_leads
  for select using (
    is_national_admin(auth.uid())
    or has_area_capability(auth.uid(), passport_area_id, 'manage_leads')
    or has_state_capability(auth.uid(), state_id, 'manage_leads')
  );

create policy "business_leads: managed write" on business_leads
  for insert with check (
    created_by = auth.uid()
    and (
      is_national_admin(auth.uid())
      or has_area_capability(auth.uid(), passport_area_id, 'manage_leads')
      or has_state_capability(auth.uid(), state_id, 'manage_leads')
    )
  );

create policy "business_leads: managed update" on business_leads
  for update using (
    is_national_admin(auth.uid())
    or has_area_capability(auth.uid(), passport_area_id, 'manage_leads')
    or has_state_capability(auth.uid(), state_id, 'manage_leads')
  ) with check (
    is_national_admin(auth.uid())
    or has_area_capability(auth.uid(), passport_area_id, 'manage_leads')
    or has_state_capability(auth.uid(), state_id, 'manage_leads')
  );

-- No delete policy in this phase - leads are never deleted, only their
-- disposition changes (Closed Won/Lost stay rows, per the "never delete a
-- CRM lead" requirement generalized to no delete path at all yet).

-- ----------------------------------------------------------------------------
-- 5. business_lead_notes - access is derived entirely from the parent
--    lead, not a copy of the same three-way OR, so a note can never be
--    read or written independently of its lead's own authorization.
-- ----------------------------------------------------------------------------

create table business_lead_notes (
  id uuid primary key default gen_random_uuid(),
  business_lead_id uuid not null references business_leads(id) on delete cascade,
  note text not null,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index business_lead_notes_business_lead_id_idx on business_lead_notes(business_lead_id);
create index business_lead_notes_created_at_idx on business_lead_notes(created_at desc);

create trigger business_lead_notes_set_updated_at
  before update on business_lead_notes
  for each row execute function set_updated_at();

alter table business_lead_notes enable row level security;

create policy "business_lead_notes: read via parent lead" on business_lead_notes
  for select using (
    exists (
      select 1 from business_leads bl
      where bl.id = business_lead_id
        and (
          is_national_admin(auth.uid())
          or has_area_capability(auth.uid(), bl.passport_area_id, 'manage_leads')
          or has_state_capability(auth.uid(), bl.state_id, 'manage_leads')
        )
    )
  );

create policy "business_lead_notes: write via parent lead" on business_lead_notes
  for insert with check (
    created_by = auth.uid()
    and exists (
      select 1 from business_leads bl
      where bl.id = business_lead_id
        and (
          is_national_admin(auth.uid())
          or has_area_capability(auth.uid(), bl.passport_area_id, 'manage_leads')
          or has_state_capability(auth.uid(), bl.state_id, 'manage_leads')
        )
    )
  );

-- No update or delete policy - notes are append-only (preserve prior
-- notes; adding a new one must never overwrite an earlier one).
