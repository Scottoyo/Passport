-- Business owner contact fields + secure ownership invitation/transfer.
-- "Business owner" contact info (name/phone/contact email) is display data,
-- independent of businesses.created_by, the actual access-control column.
--
-- Closes an existing gap: created_by could previously be changed by any
-- owner/staff caller via a plain UPDATE ("businesses: owner/staff update",
-- 0032, has no column-level restriction) - now it can ONLY change via
-- claim_business_ownership below, even for a national admin issuing a raw
-- UPDATE.

alter table businesses
  add column owner_first_name text,
  add column owner_last_name text,
  add column owner_phone text,
  add column owner_contact_email text;

create type owner_invitation_status as enum ('pending', 'accepted', 'expired', 'revoked');

create table business_owner_invitations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  email text not null,
  token_hash text not null unique,
  status owner_invitation_status not null default 'pending',
  invited_by uuid references profiles (id),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

create index business_owner_invitations_business_id_idx on business_owner_invitations (business_id);

-- At most one pending invite per business - inviteBusinessOwner always
-- revokes any existing pending row first, but this is the real DB
-- guarantee, not just app-level discipline.
create unique index business_owner_invitations_one_pending_idx
  on business_owner_invitations (business_id) where status = 'pending';

alter table business_owner_invitations enable row level security;

-- Owner AND admin can see who's been invited (the portal shows a "transfer
-- pending" notice to the current owner) - staff cannot.
create policy "business_owner_invitations: admin or owner read" on business_owner_invitations
  for select using (
    is_national_admin(auth.uid())
    or exists (
      select 1 from businesses b
      where b.id = business_owner_invitations.business_id
        and (
          has_area_capability(auth.uid(), b.passport_area_id, 'manage_businesses')
          or has_state_capability(auth.uid(), area_state_id(b.passport_area_id), 'manage_businesses')
          or b.created_by = auth.uid()
        )
    )
  );

-- Only admin can create/revoke invitations - an owner editing their own
-- contact email must never be able to grant login access to anyone, and
-- only an admin may initiate a transfer.
create policy "business_owner_invitations: admin write" on business_owner_invitations
  for insert with check (
    is_national_admin(auth.uid())
    or exists (
      select 1 from businesses b
      where b.id = business_owner_invitations.business_id
        and (has_area_capability(auth.uid(), b.passport_area_id, 'manage_businesses')
          or has_state_capability(auth.uid(), area_state_id(b.passport_area_id), 'manage_businesses'))
    )
  );

create policy "business_owner_invitations: admin update" on business_owner_invitations
  for update using (
    is_national_admin(auth.uid())
    or exists (
      select 1 from businesses b
      where b.id = business_owner_invitations.business_id
        and (has_area_capability(auth.uid(), b.passport_area_id, 'manage_businesses')
          or has_state_capability(auth.uid(), area_state_id(b.passport_area_id), 'manage_businesses'))
    )
  ) with check (
    is_national_admin(auth.uid())
    or exists (
      select 1 from businesses b
      where b.id = business_owner_invitations.business_id
        and (has_area_capability(auth.uid(), b.passport_area_id, 'manage_businesses')
          or has_state_capability(auth.uid(), area_state_id(b.passport_area_id), 'manage_businesses'))
    )
  );
-- No delete policy - revoke is a status update, preserving the audit trail
-- (matches the append-only email_log convention).

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

  -- Closes the existing gap: created_by can now ONLY change via
  -- claim_business_ownership below, which sets this transaction-local flag
  -- right before its own UPDATE. Not spoofable from a client (not a
  -- function argument - only plpgsql can set it).
  if new.created_by is distinct from old.created_by
     and coalesce(current_setting('app.bypass_owner_transfer_guard', true), '') <> 'on'
  then
    raise exception 'business ownership can only be changed by accepting an ownership invitation';
  end if;

  -- Owner contact fields: the current owner or an admin, never staff.
  if (
    new.owner_first_name is distinct from old.owner_first_name
    or new.owner_last_name is distinct from old.owner_last_name
    or new.owner_phone is distinct from old.owner_phone
    or new.owner_contact_email is distinct from old.owner_contact_email
  )
  and old.created_by is distinct from auth.uid()
  and not is_national_admin(auth.uid())
  and not has_area_capability(auth.uid(), old.passport_area_id, 'manage_businesses')
  and not has_state_capability(auth.uid(), area_state_id(old.passport_area_id), 'manage_businesses')
  then
    raise exception 'only this business''s owner or a manager/admin may change the business owner contact fields';
  end if;

  return new;
end;
$$;
-- trigger businesses_guard_owner_fields (0032) already points at this
-- function by name - no new CREATE TRIGGER needed.

-- Both RPCs authenticated-only, no anon grant - consistent with every other
-- RPC in this codebase. An unauthenticated visitor on /claim-business sees a
-- generic prompt with no business detail until they sign in or sign up.

create or replace function get_business_invitation_preview(raw_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_hash text := encode(digest(raw_token, 'sha256'), 'hex');
  v_inv record;
begin
  if auth.uid() is null then
    return jsonb_build_object('success', false, 'error', 'You need to sign in.');
  end if;

  select i.id, i.business_id, i.email, i.status, i.expires_at, b.name as business_name
    into v_inv
  from business_owner_invitations i
  join businesses b on b.id = i.business_id
  where i.token_hash = v_hash;

  if v_inv.id is null then
    return jsonb_build_object('success', false, 'error', 'This invitation link is invalid.');
  end if;

  if v_inv.status = 'pending' and v_inv.expires_at <= now() then
    update business_owner_invitations set status = 'expired' where id = v_inv.id;
    v_inv.status := 'expired';
  end if;

  if v_inv.status <> 'pending' then
    return jsonb_build_object(
      'success', false,
      'error', case v_inv.status
        when 'accepted' then 'This invitation has already been accepted.'
        when 'revoked' then 'This invitation has been revoked.'
        else 'This invitation has expired. Ask an admin to send a new one.'
      end
    );
  end if;

  return jsonb_build_object(
    'success', true,
    'business_id', v_inv.business_id,
    'business_name', v_inv.business_name,
    'email', v_inv.email,
    'expires_at', v_inv.expires_at
  );
end;
$$;

revoke all on function get_business_invitation_preview(text) from public;
grant execute on function get_business_invitation_preview(text) to authenticated;

create or replace function claim_business_ownership(raw_token text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_hash text := encode(digest(raw_token, 'sha256'), 'hex');
  v_inv record;
  v_caller_email text;
begin
  if auth.uid() is null then
    return jsonb_build_object('success', false, 'error', 'You need to sign in.');
  end if;

  select i.* into v_inv from business_owner_invitations i where i.token_hash = v_hash for update;

  if v_inv.id is null then
    return jsonb_build_object('success', false, 'error', 'This invitation link is invalid.');
  end if;

  if v_inv.status = 'pending' and v_inv.expires_at <= now() then
    update business_owner_invitations set status = 'expired' where id = v_inv.id;
    v_inv.status := 'expired';
  end if;

  if v_inv.status <> 'pending' then
    return jsonb_build_object(
      'success', false,
      'error', case v_inv.status
        when 'accepted' then 'This invitation has already been accepted.'
        when 'revoked' then 'This invitation has been revoked.'
        else 'This invitation has expired. Ask an admin to send a new one.'
      end
    );
  end if;

  select email into v_caller_email from profiles where id = auth.uid();
  if v_caller_email is null or lower(v_caller_email) <> lower(v_inv.email) then
    return jsonb_build_object(
      'success', false,
      'error', format('This invitation was sent to %s. Sign in with that email address to accept it.', v_inv.email)
    );
  end if;

  perform set_config('app.bypass_owner_transfer_guard', 'on', true);
  update businesses set created_by = auth.uid() where id = v_inv.business_id;

  update business_owner_invitations
  set status = 'accepted', accepted_at = now(), accepted_by = auth.uid()
  where id = v_inv.id;

  return jsonb_build_object('success', true, 'business_id', v_inv.business_id);
end;
$$;

revoke all on function claim_business_ownership(text) from public;
grant execute on function claim_business_ownership(text) to authenticated;

-- Backfill: only rows with a real created_by - never guess an owner.
-- Run with no authenticated caller (a migration, not an app request), so
-- the guard trigger just added above would otherwise reject this same as
-- any other unauthenticated write - disable it for this one statement.
alter table businesses disable trigger businesses_guard_owner_fields;

update businesses b
set owner_first_name = p.first_name,
    owner_last_name = p.last_name,
    owner_contact_email = p.email,
    owner_phone = p.phone
from profiles p
where b.created_by = p.id and b.created_by is not null;

alter table businesses enable trigger businesses_guard_owner_fields;

-- New email type for the invitation email. Safe even though it's used by
-- app code right after this migration - that's a separate transaction.
alter type email_type add value 'business_owner_invitation';
