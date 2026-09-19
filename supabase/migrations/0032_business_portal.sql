-- ============================================================================
-- Business self-service portal: lets a business's owner (businesses.created_by)
-- or staff (a local_staff row) sign in and manage their own business, without
-- any area/state capability grant. Every new policy below is additive
-- (Postgres ORs multiple permissive policies for the same command together),
-- so every existing manager/admin policy is untouched.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- businesses — owner/staff can read and update their own row. A guard
-- trigger keeps the privileged fields (status/approval/featured/region/
-- redemption code) manager-or-admin-only, mirroring guard_passport_admin_fields
-- (0018/0020/0023) — an owner/staff caller who can already edit a business
-- outright shouldn't also be able to self-approve, self-feature, reassign
-- their own region, or regenerate their own redemption code (the portal's
-- own copy tells them to contact an administrator for that).
-- ----------------------------------------------------------------------------

create policy "businesses: owner/staff read" on businesses
  for select using (created_by = auth.uid() or is_area_staff(auth.uid(), id));

create policy "businesses: owner/staff update" on businesses
  for update using (
    created_by = auth.uid() or is_area_staff(auth.uid(), id)
  ) with check (
    created_by = auth.uid() or is_area_staff(auth.uid(), id)
  );

create or replace function guard_business_owner_fields()
returns trigger
language plpgsql
as $$
begin
  if (
    new.status is distinct from old.status
    or new.approval_status is distinct from old.approval_status
    or new.featured is distinct from old.featured
    or new.passport_area_id is distinct from old.passport_area_id
    or new.reviewed_by is distinct from old.reviewed_by
    or new.reviewed_at is distinct from old.reviewed_at
    or new.redemption_code is distinct from old.redemption_code
    or new.redemption_code_updated_at is distinct from old.redemption_code_updated_at
    or new.redemption_failed_attempts is distinct from old.redemption_failed_attempts
    or new.redemption_locked_at is distinct from old.redemption_locked_at
  )
  and not is_national_admin(auth.uid())
  and not has_area_capability(auth.uid(), old.passport_area_id, 'manage_businesses')
  and not has_state_capability(auth.uid(), area_state_id(old.passport_area_id), 'manage_businesses')
  then
    raise exception 'only a manager or admin may change this business''s status, approval, featured flag, region, or redemption code';
  end if;

  return new;
end;
$$;

create trigger businesses_guard_owner_fields
  before update on businesses
  for each row execute function guard_business_owner_fields();

-- ----------------------------------------------------------------------------
-- offers — owner/staff can create, read, and update offers on their own
-- business, same shape as the businesses policies above.
-- ----------------------------------------------------------------------------

create policy "offers: owner/staff select" on offers
  for select using (
    exists (
      select 1 from businesses b
      where b.id = offers.business_id and (b.created_by = auth.uid() or is_area_staff(auth.uid(), b.id))
    )
  );

create policy "offers: owner/staff insert" on offers
  for insert with check (
    exists (
      select 1 from businesses b
      where b.id = offers.business_id and (b.created_by = auth.uid() or is_area_staff(auth.uid(), b.id))
    )
  );

create policy "offers: owner/staff update" on offers
  for update using (
    exists (
      select 1 from businesses b
      where b.id = offers.business_id and (b.created_by = auth.uid() or is_area_staff(auth.uid(), b.id))
    )
  ) with check (
    exists (
      select 1 from businesses b
      where b.id = offers.business_id and (b.created_by = auth.uid() or is_area_staff(auth.uid(), b.id))
    )
  );

-- ----------------------------------------------------------------------------
-- local_staff — the "Business Users" roster is owner-only (not staff), so a
-- staff member can't remove the owner or other staff. Additive to the
-- existing "local_staff: read" policy, which already lets a staff row read
-- itself but never the whole roster.
-- ----------------------------------------------------------------------------

create policy "local_staff: owner read" on local_staff
  for select using (
    exists (select 1 from businesses b where b.id = local_staff.business_id and b.created_by = auth.uid())
  );

create policy "local_staff: owner write" on local_staff
  for insert with check (
    exists (select 1 from businesses b where b.id = local_staff.business_id and b.created_by = auth.uid())
  );

create policy "local_staff: owner delete" on local_staff
  for delete using (
    exists (select 1 from businesses b where b.id = local_staff.business_id and b.created_by = auth.uid())
  );

-- ----------------------------------------------------------------------------
-- redemptions — owner/staff can read their own business's redemption
-- history (the portal's Dashboard/Redemptions pages).
-- ----------------------------------------------------------------------------

create policy "redemptions: owner/staff read" on redemptions
  for select using (
    exists (
      select 1 from businesses b
      join offers o on o.business_id = b.id
      where o.id = redemptions.offer_id and (b.created_by = auth.uid() or is_area_staff(auth.uid(), b.id))
    )
  );

-- ----------------------------------------------------------------------------
-- marketing_requests — a business can now submit its own requests (not just
-- an area-assigned manager), and review devolves to the same manage_businesses
-- hierarchy migration 0029 already established for business approval
-- ("regional manager" review is exactly that capability).
-- ----------------------------------------------------------------------------

alter table marketing_requests add column business_id uuid references businesses(id) on delete cascade;

drop policy "marketing_requests: read" on marketing_requests;

create policy "marketing_requests: read" on marketing_requests
  for select using (
    is_national_admin(auth.uid())
    or has_area_capability(auth.uid(), passport_area_id, 'submit_marketing_requests')
    or has_area_capability(auth.uid(), passport_area_id, 'view_metrics')
    or has_area_capability(auth.uid(), passport_area_id, 'manage_businesses')
    or has_state_capability(auth.uid(), area_state_id(passport_area_id), 'manage_businesses')
    or (
      business_id is not null
      and exists (
        select 1 from businesses b
        where b.id = business_id and (b.created_by = auth.uid() or is_area_staff(auth.uid(), b.id))
      )
    )
  );

drop policy "marketing_requests: managed write" on marketing_requests;

create policy "marketing_requests: managed write" on marketing_requests
  for insert with check (
    requested_by = auth.uid()
    and (
      is_national_admin(auth.uid())
      or has_area_capability(auth.uid(), passport_area_id, 'submit_marketing_requests')
      or (
        business_id is not null
        and exists (
          select 1 from businesses b
          where b.id = business_id and (b.created_by = auth.uid() or is_area_staff(auth.uid(), b.id))
        )
      )
    )
  );

drop policy "marketing_requests: admin update" on marketing_requests;

create policy "marketing_requests: admin update" on marketing_requests
  for update using (
    is_national_admin(auth.uid())
    or has_area_capability(auth.uid(), passport_area_id, 'manage_businesses')
    or has_state_capability(auth.uid(), area_state_id(passport_area_id), 'manage_businesses')
  ) with check (
    is_national_admin(auth.uid())
    or has_area_capability(auth.uid(), passport_area_id, 'manage_businesses')
    or has_state_capability(auth.uid(), area_state_id(passport_area_id), 'manage_businesses')
  );

-- ----------------------------------------------------------------------------
-- Referral program: a per-business code, and which business (if any)
-- referred a given passport purchase.
-- ----------------------------------------------------------------------------

alter table businesses add column referral_code text unique;
alter table passports add column referred_by_business_id uuid references businesses(id);

-- ----------------------------------------------------------------------------
-- New security definer RPCs, mirroring find_profile_id_for_staff
-- (0004_staff_lookup.sql) exactly in style.
-- ----------------------------------------------------------------------------

create or replace function find_profile_id_for_business_owner(business_id uuid, lookup_email text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.id
  from profiles p
  where p.email = lookup_email
    and exists (
      select 1 from businesses b where b.id = business_id and b.created_by = auth.uid()
    )
  limit 1;
$$;

revoke all on function find_profile_id_for_business_owner(uuid, text) from public;
grant execute on function find_profile_id_for_business_owner(uuid, text) to authenticated;

-- Format/uniqueness validation belongs server-side, not trusted to the
-- client — a plain client-side update would let two businesses race onto
-- the same code with no format check at all.
create or replace function set_business_referral_code(target_business_id uuid, code text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_normalized text;
begin
  if not exists (
    select 1 from businesses b
    where b.id = target_business_id and (b.created_by = auth.uid() or is_area_staff(auth.uid(), b.id))
  ) then
    return jsonb_build_object('success', false, 'error', 'You do not have access to this business.');
  end if;

  v_normalized := lower(trim(code));
  if v_normalized !~ '^[a-z0-9-]{4,20}$' then
    return jsonb_build_object('success', false, 'error', 'Referral codes must be 4-20 characters: letters, numbers, and hyphens only.');
  end if;

  begin
    update businesses set referral_code = v_normalized where id = target_business_id;
  exception when unique_violation then
    return jsonb_build_object('success', false, 'error', 'That referral code is already taken.');
  end;

  return jsonb_build_object('success', true, 'code', v_normalized);
end;
$$;

revoke all on function set_business_referral_code(uuid, text) from public;
grant execute on function set_business_referral_code(uuid, text) to authenticated;
