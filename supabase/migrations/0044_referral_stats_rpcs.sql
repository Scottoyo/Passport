-- The self-service referral pages (/account/referrals, portal/[id]/referrals)
-- show hardcoded "$0.00 - Payments aren't connected yet" today. Now that
-- passports carry real amount_paid_cents/referral_payout_cents snapshots,
-- these RPCs let a passport holder or business owner see their own referral
-- revenue/payout totals - which live on OTHER people's passport rows (the
-- ones they referred), rows plain RLS never lets them read directly.

create function get_my_referral_stats()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'revenue_cents', coalesce(sum(amount_paid_cents), 0),
    'payout_owed_cents', coalesce(sum(referral_payout_cents) filter (where referral_payout_paid_at is null), 0),
    'payout_paid_cents', coalesce(sum(referral_payout_cents) filter (where referral_payout_paid_at is not null), 0)
  )
  from passports
  where referred_by_profile_id = auth.uid();
$$;

revoke all on function get_my_referral_stats() from public;
grant execute on function get_my_referral_stats() to authenticated;

create function get_business_referral_stats(target_business_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if not (
    exists (select 1 from businesses where id = target_business_id and created_by = auth.uid())
    or exists (
      select 1 from local_staff
      where user_id = auth.uid() and (business_id = target_business_id or business_id is null)
    )
  ) then
    raise exception 'Not authorized';
  end if;

  select jsonb_build_object(
    'revenue_cents', coalesce(sum(amount_paid_cents), 0),
    'payout_owed_cents', coalesce(sum(referral_payout_cents) filter (where referral_payout_paid_at is null), 0),
    'payout_paid_cents', coalesce(sum(referral_payout_cents) filter (where referral_payout_paid_at is not null), 0)
  ) into v_result
  from passports
  where referred_by_business_id = target_business_id;

  return v_result;
end;
$$;

revoke all on function get_business_referral_stats(uuid) from public;
grant execute on function get_business_referral_stats(uuid) to authenticated;
