-- Same gap already found and fixed for business referrals (0033): a
-- passport holder's own session can't read passports.owner_user_id it
-- doesn't own, even ones referred by them — passports RLS only allows
-- owner_user_id = auth.uid(). Fixing this proactively for the sibling
-- profile-referral feature rather than waiting to rediscover it via testing.

create function count_profile_referrals(target_profile_id uuid)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int
  from passports p
  where p.referred_by_profile_id = target_profile_id
    and target_profile_id = auth.uid();
$$;

revoke all on function count_profile_referrals(uuid) from public;
grant execute on function count_profile_referrals(uuid) to authenticated;
