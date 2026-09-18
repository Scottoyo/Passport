-- The "Managers & franchisees" roster joins area_assignments to
-- profiles(email) — now that a state manager can see/manage that roster
-- (0013), they also need to be able to read the email of anyone on it.
-- Mirrors the existing "profiles: readable by area manager for their
-- staff" policy, but for area_assignments instead of local_staff.

create policy "profiles: readable by state manager for their region managers" on profiles
  for select using (
    exists (
      select 1 from area_assignments aa
      where aa.user_id = profiles.id
        and is_state_manager(auth.uid(), area_state_id(aa.passport_area_id))
    )
  );
