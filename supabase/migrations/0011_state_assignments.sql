-- A manager tier between region (area_assignments) and national
-- (national_admins): a state-level manager gets the same six capabilities
-- across every Passport Area in one state, current and future.

create table state_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  state_id uuid not null references states (id) on delete cascade,
  can_view_metrics boolean not null default true,
  can_manage_businesses boolean not null default false,
  can_manage_offers boolean not null default false,
  can_manage_subareas boolean not null default false,
  can_submit_marketing_requests boolean not null default false,
  can_manage_staff boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references profiles (id),
  unique (user_id, state_id)
);

create index state_assignments_user_id_idx on state_assignments (user_id);
create index state_assignments_state_id_idx on state_assignments (state_id);

create trigger state_assignments_set_updated_at
  before update on state_assignments
  for each row execute function set_updated_at();

alter table state_assignments enable row level security;

create policy "state_assignments: self or admin read" on state_assignments
  for select using (user_id = auth.uid() or is_national_admin(auth.uid()));

create policy "state_assignments: admin write" on state_assignments
  for insert with check (is_national_admin(auth.uid()));

create policy "state_assignments: admin update" on state_assignments
  for update using (is_national_admin(auth.uid())) with check (is_national_admin(auth.uid()));

create policy "state_assignments: admin delete" on state_assignments
  for delete using (is_national_admin(auth.uid()));

-- The actual leverage point: every RLS policy on businesses, offers,
-- subareas, local_staff, and marketing_requests already calls this one
-- function, so widening it here gives state-level managers correct,
-- enforced access everywhere without touching those six policy sets. Pure
-- OR addition — can't regress an existing region manager's access.
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
      )
  );
$$;
