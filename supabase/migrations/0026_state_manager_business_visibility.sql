-- "businesses: public read active" only ever checked has_area_capability
-- (a direct area_assignments row) for non-active visibility — a pure state
-- manager (state_assignments only, no area_assignments row of their own)
-- could see the same draft/pending businesses page as an area manager
-- everywhere else in this app, but not here: this policy silently limited
-- them to status = 'active', same as a public visitor. Widened to also
-- accept a state-level view_metrics capability, mirroring the area-level
-- check right above it. area_state_id() is the existing helper from
-- 0014_fix_area_assignments_recursion.sql.

drop policy "businesses: public read active" on businesses;

create policy "businesses: public read active" on businesses
  for select using (
    status = 'active'
    or is_national_admin(auth.uid())
    or has_area_capability(auth.uid(), passport_area_id, 'manage_businesses')
    or has_area_capability(auth.uid(), passport_area_id, 'view_metrics')
    or has_state_capability(auth.uid(), area_state_id(passport_area_id), 'view_metrics')
    or is_area_staff(auth.uid(), id)
  );
