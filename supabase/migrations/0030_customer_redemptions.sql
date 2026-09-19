-- ============================================================================
-- Customer-initiated redemption: staff key the business's shared 6-digit
-- code into the customer's own device. First thing to actually read/write
-- businesses.redemption_code / redemption_failed_attempts /
-- redemption_locked_at (added in 0027) outside of the admin
-- regenerateRedemptionCode reset, and the only way a plain customer session
-- ever creates a `redemptions` row — RLS on redemptions stays staff/admin
-- only; this security definer function is the sanctioned bypass, exactly
-- like find_profile_id_for_staff (0004_staff_lookup.sql) bypasses profiles
-- RLS for its one narrow lookup.
-- ============================================================================

create or replace function redeem_offer(target_offer_id uuid, submitted_code text)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_business_id uuid;
  v_offer_status content_status;
  v_redemptions_cap int;
  v_area_id uuid;
  v_passport_id uuid;
  v_redemption_code text;
  v_locked_at timestamptz;
  v_failed_attempts int;
  v_existing_count int;
  max_attempts constant int := 5;
begin
  if auth.uid() is null then
    raise exception 'You need to sign in to redeem an offer.';
  end if;

  select o.business_id, o.status, o.redemptions_per_passport
    into v_business_id, v_offer_status, v_redemptions_cap
  from offers o
  where o.id = target_offer_id;

  if v_business_id is null then
    raise exception 'That offer could not be found.';
  end if;

  if v_offer_status <> 'active' then
    raise exception 'This offer is not currently active.';
  end if;

  v_area_id := business_area_id(v_business_id);

  select p.id into v_passport_id
  from passports p
  where p.owner_user_id = auth.uid()
    and p.passport_area_id = v_area_id
    and p.status = 'active'
    and p.expires_at > now()
  order by p.purchased_at desc
  limit 1;

  if v_passport_id is null then
    raise exception 'You need an active Passport for this region to redeem this offer.';
  end if;

  -- Row lock so concurrent attempts against the same business can't race
  -- the failed-attempt increment / lockout check.
  select b.redemption_code, b.redemption_locked_at, b.redemption_failed_attempts
    into v_redemption_code, v_locked_at, v_failed_attempts
  from businesses b
  where b.id = v_business_id
  for update;

  if v_redemption_code is null then
    raise exception 'This business has not set up redemptions yet.';
  end if;

  if v_locked_at is not null then
    raise exception 'Redemptions are locked for this business — ask staff to have a manager regenerate the code.';
  end if;

  if trim(submitted_code) is distinct from v_redemption_code then
    v_failed_attempts := v_failed_attempts + 1;
    update businesses
    set
      redemption_failed_attempts = v_failed_attempts,
      redemption_locked_at = case when v_failed_attempts >= max_attempts then now() else redemption_locked_at end
    where id = v_business_id;
    raise exception 'Incorrect code.';
  end if;

  update businesses set redemption_failed_attempts = 0 where id = v_business_id;

  if v_redemptions_cap is not null then
    select count(*) into v_existing_count
    from redemptions r
    where r.passport_id = v_passport_id and r.offer_id = target_offer_id;

    if v_existing_count >= v_redemptions_cap then
      raise exception 'This offer has already been redeemed the maximum number of times on this Passport.';
    end if;
  end if;

  insert into redemptions (passport_id, offer_id, redeemed_member_id, redeemed_by_staff_id)
  values (v_passport_id, target_offer_id, null, null);
end;
$$;

revoke all on function redeem_offer(uuid, text) from public;
grant execute on function redeem_offer(uuid, text) to authenticated;
