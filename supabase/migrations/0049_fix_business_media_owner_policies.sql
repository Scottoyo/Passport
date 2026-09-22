-- ============================================================================
-- Fixes a column-shadowing bug in 0048's three owner/staff storage
-- policies: `split_part(name, '/', 1)` inside `exists (select 1 from
-- businesses b where ...)` resolved the unqualified `name` to
-- businesses.name (the business's own display name) instead of the
-- intended storage.objects.name (the object's path) - Postgres resolves an
-- unqualified column to the nearest enclosing scope, and the subquery's
-- own FROM businesses introduced a nearer, same-named column. Confirmed
-- live: an upload failed with "invalid input syntax for type uuid:
-- <business name>". Fully qualifying it as storage.objects.name removes
-- the ambiguity.
-- ============================================================================

drop policy "business-media: owner/staff insert" on storage.objects;
drop policy "business-media: owner/staff update" on storage.objects;
drop policy "business-media: owner/staff delete" on storage.objects;

create policy "business-media: owner/staff insert" on storage.objects
  for insert with check (
    bucket_id = 'business-media'
    and exists (
      select 1 from businesses b
      where b.id = (split_part(storage.objects.name, '/', 1))::uuid
        and (b.created_by = auth.uid() or is_area_staff(auth.uid(), b.id))
    )
  );

create policy "business-media: owner/staff update" on storage.objects
  for update using (
    bucket_id = 'business-media'
    and exists (
      select 1 from businesses b
      where b.id = (split_part(storage.objects.name, '/', 1))::uuid
        and (b.created_by = auth.uid() or is_area_staff(auth.uid(), b.id))
    )
  );

create policy "business-media: owner/staff delete" on storage.objects
  for delete using (
    bucket_id = 'business-media'
    and exists (
      select 1 from businesses b
      where b.id = (split_part(storage.objects.name, '/', 1))::uuid
        and (b.created_by = auth.uid() or is_area_staff(auth.uid(), b.id))
    )
  );
