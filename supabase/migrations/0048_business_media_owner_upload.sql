-- ============================================================================
-- The business-media storage bucket's RLS (0027) only ever let a national
-- admin or an area/state manager write objects - the business owner/staff
-- self-service path added later in 0032 (businesses: owner/staff update,
-- gated by created_by = auth.uid() or is_area_staff()) was never carried
-- over to storage.objects. The portal's own profile editor already calls
-- the same logo/cover/gallery upload actions a manager uses (gated
-- app-side by requireCapability(), which does allow the owner/staff path),
-- but the underlying Supabase Storage write would still be rejected by RLS
-- for anyone who isn't also an area/state manager. These three additive
-- policies close that gap using the exact same ownership check 0032
-- already established for the businesses table itself, rather than
-- inventing a new one.
-- ============================================================================

create policy "business-media: owner/staff insert" on storage.objects
  for insert with check (
    bucket_id = 'business-media'
    and exists (
      select 1 from businesses b
      where b.id = (split_part(name, '/', 1))::uuid
        and (b.created_by = auth.uid() or is_area_staff(auth.uid(), b.id))
    )
  );

create policy "business-media: owner/staff update" on storage.objects
  for update using (
    bucket_id = 'business-media'
    and exists (
      select 1 from businesses b
      where b.id = (split_part(name, '/', 1))::uuid
        and (b.created_by = auth.uid() or is_area_staff(auth.uid(), b.id))
    )
  );

create policy "business-media: owner/staff delete" on storage.objects
  for delete using (
    bucket_id = 'business-media'
    and exists (
      select 1 from businesses b
      where b.id = (split_part(name, '/', 1))::uuid
        and (b.created_by = auth.uid() or is_area_staff(auth.uid(), b.id))
    )
  );
