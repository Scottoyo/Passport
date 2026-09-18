-- State managers can now create/edit regions within their own state, and
-- assign region-level managers there (capped to capabilities they
-- themselves hold). National admins are unaffected.

-- ----------------------------------------------------------------------------
-- passport_areas — a state manager with 'manage_subareas' (the state-level
-- analog of what that capability already means at the area level: creating
-- the next level down in the hierarchy) can create/edit regions in their
-- own state. State lifecycle itself (rename, launch/pause the state) stays
-- national-admin-only — untouched here.
-- ----------------------------------------------------------------------------

drop policy "passport_areas: admin write" on passport_areas;
create policy "passport_areas: admin write" on passport_areas
  for insert with check (
    is_national_admin(auth.uid())
    or has_state_capability(auth.uid(), state_id, 'manage_subareas')
  );

drop policy "passport_areas: admin update" on passport_areas;
create policy "passport_areas: admin update" on passport_areas
  for update using (
    is_national_admin(auth.uid())
    or has_state_capability(auth.uid(), state_id, 'manage_subareas')
  ) with check (
    is_national_admin(auth.uid())
    or has_state_capability(auth.uid(), state_id, 'manage_subareas')
  );

-- ----------------------------------------------------------------------------
-- area_assignments — a state manager can now read/write the region-manager
-- roster for areas in their own state. insert/update additionally require
-- every capability being granted to be one the state manager holds
-- themselves ("can't grant more than you have"); delete doesn't grant
-- anything, so no ceiling check is needed there.
-- ----------------------------------------------------------------------------

drop policy "area_assignments: self or admin read" on area_assignments;
create policy "area_assignments: self or admin read" on area_assignments
  for select using (
    user_id = auth.uid()
    or is_national_admin(auth.uid())
    or exists (
      select 1 from state_assignments sa
      join passport_areas pa on pa.id = passport_area_id
      where sa.user_id = auth.uid() and sa.state_id = pa.state_id
    )
  );

drop policy "area_assignments: admin write" on area_assignments;
create policy "area_assignments: admin write" on area_assignments
  for insert with check (
    is_national_admin(auth.uid())
    or exists (
      select 1 from state_assignments sa
      join passport_areas pa on pa.id = passport_area_id
      where sa.user_id = auth.uid()
        and sa.state_id = pa.state_id
        and (not can_view_metrics or sa.can_view_metrics)
        and (not can_manage_businesses or sa.can_manage_businesses)
        and (not can_manage_offers or sa.can_manage_offers)
        and (not can_manage_subareas or sa.can_manage_subareas)
        and (not can_submit_marketing_requests or sa.can_submit_marketing_requests)
        and (not can_manage_staff or sa.can_manage_staff)
    )
  );

drop policy "area_assignments: admin update" on area_assignments;
create policy "area_assignments: admin update" on area_assignments
  for update using (
    is_national_admin(auth.uid())
    or exists (
      select 1 from state_assignments sa
      join passport_areas pa on pa.id = passport_area_id
      where sa.user_id = auth.uid() and sa.state_id = pa.state_id
    )
  ) with check (
    is_national_admin(auth.uid())
    or exists (
      select 1 from state_assignments sa
      join passport_areas pa on pa.id = passport_area_id
      where sa.user_id = auth.uid()
        and sa.state_id = pa.state_id
        and (not can_view_metrics or sa.can_view_metrics)
        and (not can_manage_businesses or sa.can_manage_businesses)
        and (not can_manage_offers or sa.can_manage_offers)
        and (not can_manage_subareas or sa.can_manage_subareas)
        and (not can_submit_marketing_requests or sa.can_submit_marketing_requests)
        and (not can_manage_staff or sa.can_manage_staff)
    )
  );

drop policy "area_assignments: admin delete" on area_assignments;
create policy "area_assignments: admin delete" on area_assignments
  for delete using (
    is_national_admin(auth.uid())
    or exists (
      select 1 from state_assignments sa
      join passport_areas pa on pa.id = passport_area_id
      where sa.user_id = auth.uid() and sa.state_id = pa.state_id
    )
  );

-- ----------------------------------------------------------------------------
-- Profile lookup for a state manager assigning a region manager by email —
-- mirrors find_profile_id_for_staff (0004_staff_lookup.sql): a narrow,
-- security-definer lookup instead of widening profiles SELECT access.
-- ----------------------------------------------------------------------------

create or replace function find_profile_id_for_area_manager(target_state_id uuid, lookup_email text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  result uuid;
begin
  if not (
    is_national_admin(auth.uid())
    or exists (
      select 1 from state_assignments sa
      where sa.user_id = auth.uid() and sa.state_id = target_state_id
    )
  ) then
    return null;
  end if;

  select id into result from profiles where email = lookup_email;
  return result;
end;
$$;

revoke all on function find_profile_id_for_area_manager(uuid, text) from public;
grant execute on function find_profile_id_for_area_manager(uuid, text) to authenticated;
