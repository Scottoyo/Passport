-- A business owner can submit their own business via the public
-- "Register a Business" form without any prior manager/admin grant. Safe
-- to widen this way because created_by is only ever set by our own server
-- action to the caller's own auth.uid() (never attacker-controlled to
-- impersonate someone else), and the existing
-- set_business_approval_on_insert trigger (0010) already forces every
-- non-national-admin insert — this one included — into 'pending_review',
-- so self-registration can't bypass approval.

drop policy "businesses: managed write" on businesses;

create policy "businesses: managed write" on businesses
  for insert with check (
    is_national_admin(auth.uid())
    or has_area_capability(auth.uid(), passport_area_id, 'manage_businesses')
    or created_by = auth.uid()
  );
