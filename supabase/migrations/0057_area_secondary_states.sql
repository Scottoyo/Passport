-- Lets a published region appear on more than one state's public page while
-- keeping exactly one primary state relationship (passport_areas.state_id)
-- and one region record - no duplicated region/businesses/offers/subareas.
-- A row here means "also list this region on this OTHER state's page,
-- linking back to its one canonical URL under its own primary state."
-- National-admin-only to view or change, both at the UI layer (gated by
-- currentUser.isNationalAdmin) and here at the RLS layer, which is the
-- actual security boundary.

create table passport_area_secondary_states (
  id uuid primary key default gen_random_uuid(),
  passport_area_id uuid not null references passport_areas (id) on delete cascade,
  state_id uuid not null references states (id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid references profiles (id),
  unique (passport_area_id, state_id)
);

create index passport_area_secondary_states_area_id_idx on passport_area_secondary_states (passport_area_id);
create index passport_area_secondary_states_state_id_idx on passport_area_secondary_states (state_id);

-- A CHECK constraint can't contain a subquery, so "the secondary state
-- can't be the region's own primary state" is enforced here instead - same
-- pattern as validate_business_subarea() (0001_schema.sql).
create or replace function validate_area_secondary_state()
returns trigger
language plpgsql
as $$
begin
  if new.state_id = (select state_id from passport_areas where id = new.passport_area_id) then
    raise exception 'state % cannot be a secondary state for passport area % - it is already that area''s primary state', new.state_id, new.passport_area_id;
  end if;
  return new;
end;
$$;

create trigger passport_area_secondary_states_validate
  before insert or update on passport_area_secondary_states
  for each row execute function validate_area_secondary_state();

alter table passport_area_secondary_states enable row level security;

-- Public/unprivileged read: only rows that are already meant to be fully
-- public (area active + its primary state active + the secondary state
-- active). National admins see every row regardless of status, matching how
-- they already see draft/paused areas/states elsewhere. Deliberately NOT
-- extended to area/state managers of the region's primary area/state -
-- requirement is "only a national admin can view or change it," so a local
-- admin gets no more read access to this table than an anonymous visitor.
create policy "passport_area_secondary_states: read" on passport_area_secondary_states
  for select using (
    is_national_admin(auth.uid())
    or (
      exists (
        select 1 from passport_areas pa
        join states primary_s on primary_s.id = pa.state_id
        where pa.id = passport_area_secondary_states.passport_area_id
          and pa.status = 'active'
          and primary_s.status = 'active'
      )
      and exists (
        select 1 from states secondary_s
        where secondary_s.id = passport_area_secondary_states.state_id
          and secondary_s.status = 'active'
      )
    )
  );

-- Write: national-admin-only, no delegation to state/area managers - this is
-- the actual security boundary a crafted direct request can't get around.
create policy "passport_area_secondary_states: admin write" on passport_area_secondary_states
  for insert with check (is_national_admin(auth.uid()));

create policy "passport_area_secondary_states: admin update" on passport_area_secondary_states
  for update using (is_national_admin(auth.uid())) with check (is_national_admin(auth.uid()));

create policy "passport_area_secondary_states: admin delete" on passport_area_secondary_states
  for delete using (is_national_admin(auth.uid()));
