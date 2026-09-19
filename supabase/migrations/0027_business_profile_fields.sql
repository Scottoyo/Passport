-- ============================================================================
-- Rich business profiles: contact/social/hours/media fields, a standalone
-- redemption-code field (no verification screen yet — see
-- docs/ARCHITECTURE.md "Redemption UX for local staff"), and real file
-- uploads (first use of Supabase Storage in this app).
-- ============================================================================

alter table businesses
  add column email text,
  add column facebook_url text,
  add column instagram_url text,
  add column tiktok_url text,
  add column youtube_url text,
  add column twitter_url text,
  add column linkedin_url text,
  add column short_description text,
  add column logo_url text,
  add column gallery_image_urls text[] not null default '{}',
  add column business_hours jsonb,
  add column weather_permitting boolean not null default false,
  add column call_for_appointment boolean not null default false,
  add column redemption_code text,
  add column redemption_code_updated_at timestamptz,
  add column redemption_failed_attempts int not null default 0,
  add column redemption_locked_at timestamptz;

alter table offers
  add column redemption_instructions text;

-- null redemptions_per_passport now means "unlimited".
alter table offers alter column redemptions_per_passport drop not null;
alter table offers drop constraint offers_redemptions_per_passport_check;
alter table offers add constraint offers_redemptions_per_passport_check
  check (redemptions_per_passport is null or redemptions_per_passport > 0);

-- ----------------------------------------------------------------------------
-- Storage: a public bucket for business logos/covers/galleries. Object paths
-- are always "{businessId}/...", which the write policies parse to reuse
-- the exact same capability checks businesses/offers already enforce.
-- ----------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('business-media', 'business-media', true)
on conflict (id) do nothing;

create policy "business-media: public read" on storage.objects
  for select using (bucket_id = 'business-media');

create policy "business-media: manager insert" on storage.objects
  for insert with check (
    bucket_id = 'business-media'
    and (
      is_national_admin(auth.uid())
      or has_area_capability(auth.uid(), business_area_id((split_part(name, '/', 1))::uuid), 'manage_businesses')
      or has_state_capability(auth.uid(), business_state_id((split_part(name, '/', 1))::uuid), 'manage_businesses')
    )
  );

create policy "business-media: manager update" on storage.objects
  for update using (
    bucket_id = 'business-media'
    and (
      is_national_admin(auth.uid())
      or has_area_capability(auth.uid(), business_area_id((split_part(name, '/', 1))::uuid), 'manage_businesses')
      or has_state_capability(auth.uid(), business_state_id((split_part(name, '/', 1))::uuid), 'manage_businesses')
    )
  );

create policy "business-media: manager delete" on storage.objects
  for delete using (
    bucket_id = 'business-media'
    and (
      is_national_admin(auth.uid())
      or has_area_capability(auth.uid(), business_area_id((split_part(name, '/', 1))::uuid), 'manage_businesses')
      or has_state_capability(auth.uid(), business_state_id((split_part(name, '/', 1))::uuid), 'manage_businesses')
    )
  );
