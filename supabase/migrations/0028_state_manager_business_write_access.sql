-- Same gap as 0026, on the write side this time. businesses/offers/
-- local_staff insert+update (+local_staff delete) only ever checked
-- has_area_capability — a pure state manager (state_assignments only, no
-- area_assignments row of their own) could reach /admin/businesses/new,
-- the new business-profile editor, and the Business Users section (all of
-- which this migration's app changes newly expose to that persona), but
-- every write would be silently rejected by RLS. Widened with the same
-- has_state_capability(..., area_state_id/business_state_id(...), ...)
-- fallback 0026 already used for reads.

drop policy "businesses: managed write" on businesses;

create policy "businesses: managed write" on businesses
  for insert with check (
    is_national_admin(auth.uid())
    or has_area_capability(auth.uid(), passport_area_id, 'manage_businesses')
    or has_state_capability(auth.uid(), area_state_id(passport_area_id), 'manage_businesses')
    or created_by = auth.uid()
  );

drop policy "businesses: managed update" on businesses;

create policy "businesses: managed update" on businesses
  for update using (
    is_national_admin(auth.uid())
    or (
      (
        has_area_capability(auth.uid(), passport_area_id, 'manage_businesses')
        or has_state_capability(auth.uid(), area_state_id(passport_area_id), 'manage_businesses')
      )
      and approval_status = 'approved'
    )
  ) with check (
    is_national_admin(auth.uid())
    or (
      (
        has_area_capability(auth.uid(), passport_area_id, 'manage_businesses')
        or has_state_capability(auth.uid(), area_state_id(passport_area_id), 'manage_businesses')
      )
      and approval_status = 'approved'
    )
  );

drop policy "offers: managed write" on offers;

create policy "offers: managed write" on offers
  for insert with check (
    is_national_admin(auth.uid())
    or has_area_capability(auth.uid(), business_area_id(business_id), 'manage_offers')
    or has_state_capability(auth.uid(), business_state_id(business_id), 'manage_offers')
  );

drop policy "offers: managed update" on offers;

create policy "offers: managed update" on offers
  for update using (
    is_national_admin(auth.uid())
    or has_area_capability(auth.uid(), business_area_id(business_id), 'manage_offers')
    or has_state_capability(auth.uid(), business_state_id(business_id), 'manage_offers')
  ) with check (
    is_national_admin(auth.uid())
    or has_area_capability(auth.uid(), business_area_id(business_id), 'manage_offers')
    or has_state_capability(auth.uid(), business_state_id(business_id), 'manage_offers')
  );

drop policy "local_staff: managed write" on local_staff;

create policy "local_staff: managed write" on local_staff
  for insert with check (
    is_national_admin(auth.uid())
    or has_area_capability(auth.uid(), passport_area_id, 'manage_staff')
    or has_state_capability(auth.uid(), area_state_id(passport_area_id), 'manage_staff')
  );

drop policy "local_staff: managed update" on local_staff;

create policy "local_staff: managed update" on local_staff
  for update using (
    is_national_admin(auth.uid())
    or has_area_capability(auth.uid(), passport_area_id, 'manage_staff')
    or has_state_capability(auth.uid(), area_state_id(passport_area_id), 'manage_staff')
  ) with check (
    is_national_admin(auth.uid())
    or has_area_capability(auth.uid(), passport_area_id, 'manage_staff')
    or has_state_capability(auth.uid(), area_state_id(passport_area_id), 'manage_staff')
  );

drop policy "local_staff: managed delete" on local_staff;

create policy "local_staff: managed delete" on local_staff
  for delete using (
    is_national_admin(auth.uid())
    or has_area_capability(auth.uid(), passport_area_id, 'manage_staff')
    or has_state_capability(auth.uid(), area_state_id(passport_area_id), 'manage_staff')
  );
