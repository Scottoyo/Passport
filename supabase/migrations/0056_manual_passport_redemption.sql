-- Manual (phone-in) passport redemption: a business looks up a customer's
-- passport by its printed number and redeems one of its own offers on their
-- behalf. Reuses redeem_offer's exact eligibility rules (offer active,
-- passport active/unexpired/same region, per-passport redemption cap) but
-- needs its own RPCs since the caller identity is the BUSINESS, not the
-- passport holder - redeem_offer identifies the passport entirely via the
-- holder's own auth.uid(), which doesn't exist in this flow.

create type redemption_method as enum ('code', 'manual_passport_number');

alter table redemptions
  add column redemption_method redemption_method not null default 'code',
  add column holder_authorized_at timestamptz,
  add constraint redemptions_manual_requires_attestation
    check (redemption_method <> 'manual_passport_number' or holder_authorized_at is not null);

-- security definer: reads an arbitrary passport by number, which the
-- caller's own passports RLS would never allow (that only covers the
-- caller's own row) - authorization is inlined below instead, scoped
-- exactly like offers/redemptions RLS (b.created_by or is_area_staff),
-- never the passports table's own broader local_staff branch.
create function lookup_passport_for_manual_redemption(
  target_business_id uuid,
  submitted_passport_number text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_authorized boolean;
  v_area_id uuid;
  v_passport record;
  v_holder_first_name text;
  v_reason text;
begin
  if auth.uid() is null then
    return jsonb_build_object('success', false, 'error', 'You need to sign in.');
  end if;

  select exists (
    select 1 from businesses b
    where b.id = target_business_id
      and (b.created_by = auth.uid() or is_area_staff(auth.uid(), b.id))
  ) into v_authorized;

  if not v_authorized then
    return jsonb_build_object('success', false, 'error', 'You do not have access to this business.');
  end if;

  v_area_id := business_area_id(target_business_id);

  select p.id, p.status, p.expires_at, p.passport_area_id, p.owner_user_id
    into v_passport
  from passports p
  where p.passport_number = regexp_replace(trim(submitted_passport_number), '\s+', '', 'g');

  if v_passport.id is null then
    return jsonb_build_object('success', false, 'error', 'No Passport found with that number.');
  end if;

  select coalesce(pr.first_name, nullif(split_part(pr.full_name, ' ', 1), ''), 'Passport Holder')
    into v_holder_first_name
  from profiles pr where pr.id = v_passport.owner_user_id;

  v_reason := case
    when v_passport.status = 'revoked' then 'revoked'
    when v_passport.status <> 'active' or v_passport.expires_at <= now() then 'expired'
    when v_passport.passport_area_id <> v_area_id then 'wrong_region'
    else null
  end;

  return jsonb_build_object(
    'success', true,
    'passport_id', v_passport.id,
    'status', v_passport.status,
    'holder_first_name', v_holder_first_name,
    'eligible', v_reason is null,
    'ineligible_reason', v_reason
  );
end;
$$;

revoke all on function lookup_passport_for_manual_redemption(uuid, text) from public;
grant execute on function lookup_passport_for_manual_redemption(uuid, text) to authenticated;

create function confirm_manual_redemption(
  target_business_id uuid,
  submitted_passport_number text,
  target_offer_id uuid,
  holder_authorized boolean
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_authorized boolean;
  v_area_id uuid;
  v_offer_business_id uuid;
  v_offer_status content_status;
  v_redemptions_cap int;
  v_passport record;
  v_existing_count int;
begin
  if auth.uid() is null then
    return jsonb_build_object('success', false, 'error', 'You need to sign in.');
  end if;

  select exists (
    select 1 from businesses b
    where b.id = target_business_id
      and (b.created_by = auth.uid() or is_area_staff(auth.uid(), b.id))
  ) into v_authorized;
  if not v_authorized then
    return jsonb_build_object('success', false, 'error', 'You do not have access to this business.');
  end if;

  if holder_authorized is not true then
    return jsonb_build_object('success', false, 'error', 'You must confirm the Passport holder authorized this redemption.');
  end if;

  select o.business_id, o.status, o.redemptions_per_passport
    into v_offer_business_id, v_offer_status, v_redemptions_cap
  from offers o where o.id = target_offer_id;

  if v_offer_business_id is null or v_offer_business_id <> target_business_id then
    return jsonb_build_object('success', false, 'error', 'That offer could not be found.');
  end if;
  if v_offer_status <> 'active' then
    return jsonb_build_object('success', false, 'error', 'This offer is not currently active.');
  end if;

  -- Same lock redeem_offer takes - the only resource both redemption paths
  -- can agree on, so a concurrent self-service redemption for this business
  -- still serializes against this one for the cap check below.
  perform 1 from businesses where id = target_business_id for update;

  v_area_id := business_area_id(target_business_id);

  select p.id, p.status, p.expires_at, p.passport_area_id
    into v_passport
  from passports p
  where p.passport_number = regexp_replace(trim(submitted_passport_number), '\s+', '', 'g');

  if v_passport.id is null then
    return jsonb_build_object('success', false, 'error', 'No Passport found with that number.');
  end if;
  if v_passport.status <> 'active' or v_passport.expires_at <= now() then
    return jsonb_build_object('success', false, 'error', 'This Passport is not currently active.');
  end if;
  if v_passport.passport_area_id <> v_area_id then
    return jsonb_build_object('success', false, 'error', 'This Passport is not valid for this business''s region.');
  end if;

  if v_redemptions_cap is not null then
    select count(*) into v_existing_count
    from redemptions r
    where r.passport_id = v_passport.id and r.offer_id = target_offer_id;
    if v_existing_count >= v_redemptions_cap then
      return jsonb_build_object('success', false, 'error', 'This offer has already been redeemed the maximum number of times on this Passport.');
    end if;
  end if;

  insert into redemptions (passport_id, offer_id, redeemed_member_id, redeemed_by_staff_id, redemption_method, holder_authorized_at)
  values (v_passport.id, target_offer_id, null, auth.uid(), 'manual_passport_number', now());

  return jsonb_build_object('success', true);
end;
$$;

revoke all on function confirm_manual_redemption(uuid, text, uuid, boolean) from public;
grant execute on function confirm_manual_redemption(uuid, text, uuid, boolean) to authenticated;
