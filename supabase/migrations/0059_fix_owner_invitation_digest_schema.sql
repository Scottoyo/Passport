-- Fixes a bug in 0058: pgcrypto's digest()/encode() live in the `extensions`
-- schema on this Supabase project (pre-installed there, not by 0001's
-- `create extension if not exists pgcrypto` - that was a no-op since it
-- already existed), but both new RPCs set `search_path = public`, so the
-- unqualified digest() call failed with "function digest(text, unknown)
-- does not exist". Schema-qualifies the call instead of widening the
-- search_path, so nothing else these functions touch becomes ambiguous.

create or replace function get_business_invitation_preview(raw_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_hash text := encode(extensions.digest(raw_token, 'sha256'), 'hex');
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

create or replace function claim_business_ownership(raw_token text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_hash text := encode(extensions.digest(raw_token, 'sha256'), 'hex');
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
