-- ============================================================================
-- Narrow lookup used by "add local staff by email" in the admin portal.
--
-- profiles RLS only lets a user read their own row (or a national admin read
-- any row) — an area manager adding staff needs to resolve an email to a
-- user id without being granted general read access to every profile in the
-- system. This function does exactly that one lookup, gated on the caller
-- actually holding manage_staff for the area they're adding to, and returns
-- only the id (never other profile fields).
-- ============================================================================

create or replace function find_profile_id_for_staff(area_id uuid, lookup_email text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.id
  from profiles p
  where p.email = lookup_email
    and (is_national_admin(auth.uid()) or has_area_capability(auth.uid(), area_id, 'manage_staff'))
  limit 1;
$$;

revoke all on function find_profile_id_for_staff(uuid, text) from public;
grant execute on function find_profile_id_for_staff(uuid, text) to authenticated;
