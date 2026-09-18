-- Businesses now need an explicit national-admin sign-off before a manager
-- can edit or launch them — submitting a business no longer makes it
-- immediately draft-editable.

create type business_approval_status as enum ('pending_review', 'approved', 'rejected');

alter table businesses
  add column approval_status business_approval_status not null default 'pending_review',
  add column reviewed_by uuid references profiles(id),
  add column reviewed_at timestamptz;

create index businesses_approval_status_idx on businesses (approval_status);

-- National admins creating a business directly don't need to review their
-- own submission; anyone else (managers/franchisees) always starts pending,
-- regardless of what their insert payload tries to set.
create or replace function set_business_approval_on_insert()
returns trigger
language plpgsql
as $$
begin
  if is_national_admin(auth.uid()) then
    new.approval_status = 'approved';
    new.reviewed_by = auth.uid();
    new.reviewed_at = now();
  else
    new.approval_status = 'pending_review';
    new.reviewed_by = null;
    new.reviewed_at = null;
  end if;
  return new;
end;
$$;

create trigger businesses_set_approval_on_insert
  before insert on businesses
  for each row execute function set_business_approval_on_insert();

-- The actual enforcement: a manager can only update a business once it's
-- approved. National admins are unrestricted (including performing the
-- approve/reject action itself).
drop policy "businesses: managed update" on businesses;

create policy "businesses: managed update" on businesses
  for update using (
    is_national_admin(auth.uid())
    or (
      has_area_capability(auth.uid(), passport_area_id, 'manage_businesses')
      and approval_status = 'approved'
    )
  ) with check (
    is_national_admin(auth.uid())
    or (
      has_area_capability(auth.uid(), passport_area_id, 'manage_businesses')
      and approval_status = 'approved'
    )
  );
