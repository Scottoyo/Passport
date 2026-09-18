-- 0018 added a state-manager UPDATE policy on profiles scoped to their
-- passport holders, but no matching SELECT policy — profiles' existing read
-- policies only cover self, national admins, and staff-specific grants, so a
-- state manager could update a holder's profile (per 0018) without ever
-- being able to see it, and getPassportsWithHolders()/the holder detail page
-- would silently render "Unknown holder" for every customer in their state.

create policy "profiles: manager read for their passport holders" on profiles
  for select using (
    exists (
      select 1 from passports p
      where p.owner_user_id = profiles.id
        and has_state_capability(auth.uid(), p.state_id, 'view_metrics')
    )
  );
