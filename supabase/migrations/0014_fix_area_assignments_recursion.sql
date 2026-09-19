-- 0013's area_assignments policies inlined `join passport_areas`, which
-- re-triggers passport_areas' own RLS (which itself queries
-- area_assignments) — Postgres infinite recursion (42P17). Fixed the same
-- way business_area_id()/is_area_staff() already avoid this: a
-- security-definer helper's internal query bypasses RLS instead of
-- re-entering it.

create or replace function area_state_id(target_area_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select state_id from passport_areas where id = target_area_id;
$$;

create or replace function is_state_manager(uid uuid, target_state_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from state_assignments sa
    where sa.user_id = uid and sa.state_id = target_state_id
  );
$$;

drop policy "area_assignments: self or admin read" on area_assignments;
create policy "area_assignments: self or admin read" on area_assignments
  for select using (
    user_id = auth.uid()
    or is_national_admin(auth.uid())
    or is_state_manager(auth.uid(), area_state_id(passport_area_id))
  );

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
    )
  );

drop policy "area_assignments: admin delete" on area_assignments;
create policy "area_assignments: admin delete" on area_assignments
  for delete using (
    is_national_admin(auth.uid())
    or is_state_manager(auth.uid(), area_state_id(passport_area_id))
  );
