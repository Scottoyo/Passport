-- Caught before it could ship as a bug: "profiles: self read" only lets a
-- user read their OWN profile row — a customer entering someone else's
-- referral code at checkout could never resolve it to a profile id via a
-- plain query. A narrow security definer lookup, mirroring
-- find_profile_id_for_staff's shape, returns only the id for a matching
-- code (never any other profile field) — safe to expose broadly since a
-- referral code is meant to be shared.

create function resolve_profile_referral_code(code text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from profiles where referral_code = lower(trim(code)) limit 1;
$$;

revoke all on function resolve_profile_referral_code(text) from public;
grant execute on function resolve_profile_referral_code(text) to authenticated;
