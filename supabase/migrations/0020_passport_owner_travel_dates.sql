-- 0018's "passports: admin update" policy only covers national admins and
-- state managers — the owner themselves has no update path at all, so the
-- self-service travel-date editing this whole feature is supposed to
-- support (per "regardless of where edited ... reflected on the others")
-- would silently fail via RLS. Grant the owner update access, but use the
-- existing guard trigger to restrict what a plain owner (as opposed to an
-- admin/state-manager) may actually change to just the two travel-date
-- columns — status, expiry, state/product reassignment, purchase/payment
-- info all stay admin-only.

create policy "passports: owner update travel dates" on passports
  for update using (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());

create or replace function guard_passport_admin_fields()
returns trigger
language plpgsql
as $$
begin
  if (new.state_id is distinct from old.state_id or new.passport_product_id is distinct from old.passport_product_id)
     and not is_national_admin(auth.uid()) then
    raise exception 'only a national admin may reassign a passport''s state/product';
  end if;

  if (
    new.status is distinct from old.status
    or new.expires_at is distinct from old.expires_at
    or new.purchased_at is distinct from old.purchased_at
    or new.payment_reference is distinct from old.payment_reference
  )
  and not is_national_admin(auth.uid())
  and not has_state_capability(auth.uid(), old.state_id, 'view_metrics') then
    raise exception 'only an admin may change this passport''s status, dates, or payment info';
  end if;

  return new;
end;
$$;
