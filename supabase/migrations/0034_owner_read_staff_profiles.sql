-- Bug found via live testing: the portal's Business Users page showed
-- "Unknown" for every staff member's email when viewed by the business
-- owner. 0003_rls.sql already has "profiles: readable by area manager for
-- their staff" for exactly this purpose (an area manager reading the email
-- of someone they added to local_staff), but it's gated on
-- has_area_capability(..., 'manage_staff') — a plain business owner has no
-- area capability, so it never covered them. Same shape, scoped to
-- ownership instead.

create policy "profiles: readable by business owner for their staff" on profiles
  for select using (
    exists (
      select 1 from local_staff ls
      join businesses b on b.id = ls.business_id
      where ls.user_id = profiles.id and b.created_by = auth.uid()
    )
  );
