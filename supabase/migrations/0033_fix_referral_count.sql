-- Bug found via live testing: the portal's Referrals page counted
-- `passports where referred_by_business_id = this business` using the
-- owner's own session — but `passports` RLS only lets a user read their
-- OWN passports (owner_user_id = auth.uid()), not other customers'
-- passports referred by their business. The count silently returned 0
-- even though attribution was correctly stored. A narrow security definer
-- count, mirroring find_profile_id_for_staff (0004_staff_lookup.sql),
-- fixes it without widening passports SELECT more broadly.

create or replace function count_business_referrals(target_business_id uuid)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int
  from passports p
  where p.referred_by_business_id = target_business_id
    and exists (
      select 1 from businesses b
      where b.id = target_business_id and (b.created_by = auth.uid() or is_area_staff(auth.uid(), b.id))
    );
$$;

revoke all on function count_business_referrals(uuid) from public;
grant execute on function count_business_referrals(uuid) to authenticated;
