-- passports/profiles read+update policies only ever checked
-- has_state_capability, never has_area_capability, even though
-- passports.passport_area_id has existed since 0023 and has_area_capability
-- (0011) already internally covers state managers too. Pure OR additions —
-- widens area managers in without touching anyone else's access.

drop policy "passports: owner read" on passports;

create policy "passports: owner read" on passports
  for select using (
    owner_user_id = auth.uid()
    or is_national_admin(auth.uid())
    or exists (
      select 1 from local_staff ls where ls.user_id = auth.uid()
    )
    or has_state_capability(auth.uid(), state_id, 'view_metrics')
    or has_area_capability(auth.uid(), passport_area_id, 'view_metrics')
  );

drop policy "passports: admin update" on passports;

create policy "passports: admin update" on passports
  for update using (
    is_national_admin(auth.uid())
    or has_state_capability(auth.uid(), state_id, 'view_metrics')
    or has_area_capability(auth.uid(), passport_area_id, 'view_metrics')
  )
  with check (
    is_national_admin(auth.uid())
    or has_state_capability(auth.uid(), state_id, 'view_metrics')
    or has_area_capability(auth.uid(), passport_area_id, 'view_metrics')
  );

create or replace function guard_passport_admin_fields()
returns trigger
language plpgsql
as $$
begin
  if (
    new.state_id is distinct from old.state_id
    or new.passport_product_id is distinct from old.passport_product_id
    or new.passport_area_id is distinct from old.passport_area_id
  )
  and not is_national_admin(auth.uid()) then
    raise exception 'only a national admin may reassign a passport''s state/region/product';
  end if;

  if (
    new.status is distinct from old.status
    or new.expires_at is distinct from old.expires_at
    or new.purchased_at is distinct from old.purchased_at
    or new.payment_reference is distinct from old.payment_reference
  )
  and not is_national_admin(auth.uid())
  and not has_state_capability(auth.uid(), old.state_id, 'view_metrics')
  and not has_area_capability(auth.uid(), old.passport_area_id, 'view_metrics') then
    raise exception 'only an admin may change this passport''s status, dates, or payment info';
  end if;

  return new;
end;
$$;

drop policy "profiles: manager read for their passport holders" on profiles;

create policy "profiles: manager read for their passport holders" on profiles
  for select using (
    exists (
      select 1 from passports p
      where p.owner_user_id = profiles.id
        and (
          has_state_capability(auth.uid(), p.state_id, 'view_metrics')
          or has_area_capability(auth.uid(), p.passport_area_id, 'view_metrics')
        )
    )
  );

drop policy "profiles: manager update for their passport holders" on profiles;

create policy "profiles: manager update for their passport holders" on profiles
  for update using (
    is_national_admin(auth.uid())
    or exists (
      select 1 from passports p
      where p.owner_user_id = profiles.id
        and (
          has_state_capability(auth.uid(), p.state_id, 'view_metrics')
          or has_area_capability(auth.uid(), p.passport_area_id, 'view_metrics')
        )
    )
  )
  with check (
    is_national_admin(auth.uid())
    or exists (
      select 1 from passports p
      where p.owner_user_id = profiles.id
        and (
          has_state_capability(auth.uid(), p.state_id, 'view_metrics')
          or has_area_capability(auth.uid(), p.passport_area_id, 'view_metrics')
        )
    )
  );

drop policy "business_favorites: admin read" on business_favorites;

create policy "business_favorites: admin read" on business_favorites
  for select using (
    is_national_admin(auth.uid())
    or has_state_capability(auth.uid(), business_state_id(business_id), 'view_metrics')
    or has_area_capability(auth.uid(), business_area_id(business_id), 'view_metrics')
  );
