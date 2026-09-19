-- Checkout needs a referring profile's payout rate and suspension state to
-- snapshot onto the new passport, but a plain select can't see another
-- user's profile row (RLS only allows reading your own) - same reason
-- resolve_profile_referral_code (0037) exists as a security-definer RPC
-- instead of a direct query. This is that same idiom, one step further.
create function get_profile_referral_payout(target_profile_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'payout_rate_cents', coalesce(referral_payout_rate_cents, 0),
    'suspended', referral_suspended_at is not null
  )
  from profiles
  where id = target_profile_id;
$$;

revoke all on function get_profile_referral_payout(uuid) from public;
grant execute on function get_profile_referral_payout(uuid) to authenticated;
