-- Two unrelated changes bundled because they landed in the same review pass:
--
-- 1. passport_products never actually enforced max_members anywhere (no
--    trigger/check ever compared it against passport_members) — it was
--    display-only copy on the purchase page. Dropping it outright rather
--    than just hiding the admin field, since a stale default-1 value would
--    otherwise silently show "covers up to 1 person" on every future
--    product.
--
-- 2. Business approval was national-admin-only. Region/state managers with
--    manage_businesses now approve/reject/feature/launch businesses within
--    their own hierarchy, same as they already fully manage every other
--    field on those businesses. "businesses: managed update" previously
--    required approval_status = 'approved' before a capability holder
--    could touch a row at all, which made manager-driven approval
--    impossible (they could never reach the row to approve it). Dropping
--    that precondition for capability holders — is_national_admin already
--    had no such precondition, and a manager who can edit a business
--    outright can trivially approve it via editing anyway, so the gate
--    added no real protection once approval itself is delegated.

alter table passport_products drop column max_members;

drop policy "businesses: managed update" on businesses;

create policy "businesses: managed update" on businesses
  for update using (
    is_national_admin(auth.uid())
    or has_area_capability(auth.uid(), passport_area_id, 'manage_businesses')
    or has_state_capability(auth.uid(), area_state_id(passport_area_id), 'manage_businesses')
  ) with check (
    is_national_admin(auth.uid())
    or has_area_capability(auth.uid(), passport_area_id, 'manage_businesses')
    or has_state_capability(auth.uid(), area_state_id(passport_area_id), 'manage_businesses')
  );
