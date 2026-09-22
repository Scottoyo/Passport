-- ============================================================================
-- Replaces businesses.gallery_image_urls (a bare text[] of public URLs) with
-- a real business_media table, so each gallery image can carry its own alt
-- text and a persisted display order, and so deletion can remove the exact
-- Storage object (storage_path) instead of matching by URL string.
--
-- Authorization intentionally reuses the existing helper functions
-- (is_national_admin, has_area_capability, has_state_capability,
-- business_area_id, business_state_id, is_area_staff) rather than inventing
-- new logic - this mirrors the same actor set already enforced on
-- `businesses` itself (0029 managed update + 0032 owner/staff update) and on
-- the business-media Storage bucket (0027/0048/0049). The bucket's RLS
-- already covers the "{businessId}/gallery/..." path this table's rows
-- point at, so no storage.objects policy changes are needed here.
-- ============================================================================

create table business_media (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses (id) on delete cascade,
  storage_path text not null,
  url text not null,
  alt_text text,
  display_order int not null default 0,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

create index business_media_business_id_idx on business_media (business_id, display_order);

alter table business_media enable row level security;

create policy "business_media: public read" on business_media
  for select using (
    exists (
      select 1 from businesses b
      where b.id = business_media.business_id
        and (
          b.status = 'active'
          or is_national_admin(auth.uid())
          or has_area_capability(auth.uid(), b.passport_area_id, 'manage_businesses')
          or has_area_capability(auth.uid(), b.passport_area_id, 'view_metrics')
          or has_state_capability(auth.uid(), area_state_id(b.passport_area_id), 'view_metrics')
          or has_state_capability(auth.uid(), area_state_id(b.passport_area_id), 'manage_businesses')
          or is_area_staff(auth.uid(), b.id)
          or b.created_by = auth.uid()
        )
    )
  );

create policy "business_media: manager write" on business_media
  for all using (
    is_national_admin(auth.uid())
    or has_area_capability(auth.uid(), business_area_id(business_media.business_id), 'manage_businesses')
    or has_state_capability(auth.uid(), business_state_id(business_media.business_id), 'manage_businesses')
  ) with check (
    is_national_admin(auth.uid())
    or has_area_capability(auth.uid(), business_area_id(business_media.business_id), 'manage_businesses')
    or has_state_capability(auth.uid(), business_state_id(business_media.business_id), 'manage_businesses')
  );

create policy "business_media: owner/staff write" on business_media
  for all using (
    exists (
      select 1 from businesses b
      where b.id = business_media.business_id
        and (b.created_by = auth.uid() or is_area_staff(auth.uid(), b.id))
    )
  ) with check (
    exists (
      select 1 from businesses b
      where b.id = business_media.business_id
        and (b.created_by = auth.uid() or is_area_staff(auth.uid(), b.id))
    )
  );

-- One-time migration of existing gallery URLs into the new table, preserving
-- array order as display_order. Every existing URL came from
-- uploadBusinessMedia's getPublicUrl() call, so the fixed
-- ".../business-media/<path>" prefix is safe to strip back out.
insert into business_media (business_id, storage_path, url, display_order, created_by)
select
  b.id,
  regexp_replace(g.url, '^.*/business-media/', ''),
  g.url,
  g.ord - 1,
  b.created_by
from businesses b, unnest(b.gallery_image_urls) with ordinality as g (url, ord)
where array_length(b.gallery_image_urls, 1) > 0;

alter table businesses drop column gallery_image_urls;
