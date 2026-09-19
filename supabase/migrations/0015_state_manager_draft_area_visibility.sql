-- A state manager can create regions (0013) but a new region defaults to
-- 'draft', and the existing SELECT policy only granted draft-visibility to
-- an *area*-assigned manager for their own specific area — a state
-- manager had no path to see a draft region in their own state at all,
-- including one they just created themselves.

drop policy "passport_areas: public read active" on passport_areas;

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
    or is_state_manager(auth.uid(), state_id)
  );
