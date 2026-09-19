-- ============================================================================
-- Passport holder dashboard: profile/passport fields for photo + referral
-- codes + notification prefs, a new region_events feed (nothing like it
-- exists yet — triggers fire when a business/offer becomes publicly live),
-- and the storage bucket for passport photos.
-- ============================================================================

alter table profiles
  add column address_line1 text,
  add column city text,
  add column state_code text,
  add column postal_code text,
  add column notification_preferences jsonb not null default '{"achievement_unlocked":true,"admin_announcement":true,"new_achievement_available":true,"new_business_added":true,"new_promotion_added":true}',
  add column notifications_last_read_at timestamptz,
  add column referral_code text unique;

alter table passports
  add column photo_url text,
  add column referred_by_profile_id uuid references profiles(id);

-- ----------------------------------------------------------------------------
-- region_events — a passport holder's "New business added" / "New promotion
-- added" feed, scoped to their passport's region.
-- ----------------------------------------------------------------------------

create type region_event_type as enum ('new_business', 'new_offer');

create table region_events (
  id uuid primary key default gen_random_uuid(),
  passport_area_id uuid not null references passport_areas(id) on delete cascade,
  event_type region_event_type not null,
  business_id uuid references businesses(id) on delete cascade,
  offer_id uuid references offers(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index region_events_area_id_idx on region_events(passport_area_id);

alter table region_events enable row level security;

create policy "region_events: read by passport holders in area" on region_events
  for select using (
    is_national_admin(auth.uid())
    or exists (
      select 1 from passports p
      where p.owner_user_id = auth.uid() and p.passport_area_id = region_events.passport_area_id
    )
  );

-- security definer: this trigger fires as part of an ordinary authenticated
-- user's insert/update on businesses (a manager, or a self-registering
-- owner) — region_events has RLS enabled with only a read policy, so
-- without definer privileges this insert would be rejected for every real
-- app session, not just admins.
create function notify_business_activated()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'active' and new.approval_status = 'approved'
     and (TG_OP = 'INSERT' or old.status is distinct from new.status or old.approval_status is distinct from new.approval_status)
  then
    insert into region_events (passport_area_id, event_type, business_id)
    values (new.passport_area_id, 'new_business', new.id);
  end if;
  return new;
end;
$$;

create trigger businesses_notify_activated
  after insert or update on businesses
  for each row execute function notify_business_activated();

create function notify_offer_activated()
returns trigger
security definer
set search_path = public
language plpgsql
as $$
begin
  if new.status = 'active' and (TG_OP = 'INSERT' or old.status is distinct from new.status) then
    insert into region_events (passport_area_id, event_type, business_id, offer_id)
    select b.passport_area_id, 'new_offer', new.business_id, new.id
    from businesses b
    where b.id = new.business_id;
  end if;
  return new;
end;
$$;

create trigger offers_notify_activated
  after insert or update on offers
  for each row execute function notify_offer_activated();

-- ----------------------------------------------------------------------------
-- Referral RPC for passport holders, mirroring set_business_referral_code
-- exactly (0032_business_portal.sql).
-- ----------------------------------------------------------------------------

create function set_profile_referral_code(code text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_normalized text;
begin
  v_normalized := lower(trim(code));
  if v_normalized !~ '^[a-z0-9-]{4,20}$' then
    return jsonb_build_object('success', false, 'error', 'Referral codes must be 4-20 characters: letters, numbers, and hyphens only.');
  end if;

  begin
    update profiles set referral_code = v_normalized where id = auth.uid();
  exception when unique_violation then
    return jsonb_build_object('success', false, 'error', 'That referral code is already taken.');
  end;

  return jsonb_build_object('success', true, 'code', v_normalized);
end;
$$;

revoke all on function set_profile_referral_code(text) from public;
grant execute on function set_profile_referral_code(text) to authenticated;

-- ----------------------------------------------------------------------------
-- Storage: passport photos, same shape as business-media (0027).
-- ----------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('passport-photos', 'passport-photos', true)
on conflict (id) do nothing;

create policy "passport-photos: public read" on storage.objects
  for select using (bucket_id = 'passport-photos');

create policy "passport-photos: owner insert" on storage.objects
  for insert with check (
    bucket_id = 'passport-photos'
    and exists (
      select 1 from passports p
      where p.id = (split_part(name, '/', 1))::uuid and p.owner_user_id = auth.uid()
    )
  );

create policy "passport-photos: owner update" on storage.objects
  for update using (
    bucket_id = 'passport-photos'
    and exists (
      select 1 from passports p
      where p.id = (split_part(name, '/', 1))::uuid and p.owner_user_id = auth.uid()
    )
  );

create policy "passport-photos: owner delete" on storage.objects
  for delete using (
    bucket_id = 'passport-photos'
    and exists (
      select 1 from passports p
      where p.id = (split_part(name, '/', 1))::uuid and p.owner_user_id = auth.uid()
    )
  );
