-- Bug found via live testing: `raise exception` aborts the entire calling
-- transaction, which silently rolled back the redemption_failed_attempts
-- increment and lockout write that happened right before it in
-- redeem_offer() (0030) — a wrong code never actually got counted.
--
-- Fix: every exit path now returns jsonb ({"success": true} or
-- {"success": false, "error": "..."}) instead of raising, so a write that
-- needs to persist (the failed-attempt increment, the reset-to-0 on a
-- correct code) is never rolled back by the function's own control flow.
-- The Server Action checks `data.success` instead of catching a Postgres
-- error, except for the RPC call itself failing outright (network/auth),
-- which still surfaces via the normal Supabase error path.

-- Postgres won't let `create or replace` change a function's return type
-- (void -> jsonb), so the old signature has to go first.
drop function if exists redeem_offer(uuid, text);

create function redeem_offer(target_offer_id uuid, submitted_code text)
returns jsonb
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
    return jsonb_build_object('success', false, 'error', 'You need to sign in to redeem an offer.');
  end if;

  select o.business_id, o.status, o.redemptions_per_passport
    into v_business_id, v_offer_status, v_redemptions_cap
  from offers o
  where o.id = target_offer_id;

  if v_business_id is null then
    return jsonb_build_object('success', false, 'error', 'That offer could not be found.');
  end if;

  if v_offer_status <> 'active' then
    return jsonb_build_object('success', false, 'error', 'This offer is not currently active.');
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
    return jsonb_build_object('success', false, 'error', 'You need an active Passport for this region to redeem this offer.');
  end if;

  -- Row lock so concurrent attempts against the same business can't race
  -- the failed-attempt increment / lockout check.
  select b.redemption_code, b.redemption_locked_at, b.redemption_failed_attempts
    into v_redemption_code, v_locked_at, v_failed_attempts
  from businesses b
  where b.id = v_business_id
  for update;

  if v_redemption_code is null then
    return jsonb_build_object('success', false, 'error', 'This business has not set up redemptions yet.');
  end if;

  if v_locked_at is not null then
    return jsonb_build_object('success', false, 'error', 'Redemptions are locked for this business — ask staff to have a manager regenerate the code.');
  end if;

  if trim(submitted_code) is distinct from v_redemption_code then
    v_failed_attempts := v_failed_attempts + 1;
    update businesses
    set
      redemption_failed_attempts = v_failed_attempts,
      redemption_locked_at = case when v_failed_attempts >= max_attempts then now() else redemption_locked_at end
    where id = v_business_id;
    return jsonb_build_object('success', false, 'error', 'Incorrect code.');
  end if;

  update businesses set redemption_failed_attempts = 0 where id = v_business_id;

  if v_redemptions_cap is not null then
    select count(*) into v_existing_count
    from redemptions r
    where r.passport_id = v_passport_id and r.offer_id = target_offer_id;

    if v_existing_count >= v_redemptions_cap then
      return jsonb_build_object('success', false, 'error', 'This offer has already been redeemed the maximum number of times on this Passport.');
    end if;
  end if;

  insert into redemptions (passport_id, offer_id, redeemed_member_id, redeemed_by_staff_id)
  values (v_passport_id, target_offer_id, null, null);

  return jsonb_build_object('success', true);
end;
$$;

revoke all on function redeem_offer(uuid, text) from public;
grant execute on function redeem_offer(uuid, text) to authenticated;
