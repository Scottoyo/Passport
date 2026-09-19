-- ============================================================================
-- Passport holder management: real first/last name, per-passport travel
-- dates, admin edit access to holder profiles, suspend/soft-delete, and
-- business favoriting.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Name split: first_name/last_name become the source of truth; full_name
-- becomes a generated column so every existing read site keeps working.
-- ----------------------------------------------------------------------------

alter table profiles add column first_name text;
alter table profiles add column last_name text;

update profiles
set
  first_name = nullif(split_part(full_name, ' ', 1), ''),
  last_name = nullif(trim(substring(full_name from length(split_part(full_name, ' ', 1)) + 1)), '')
where full_name is not null;

alter table profiles drop column full_name;
alter table profiles add column full_name text
  generated always as (trim(both ' ' from coalesce(first_name, '') || ' ' || coalesce(last_name, ''))) stored;

create or replace function handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, first_name, last_name)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- New holder fields
-- ----------------------------------------------------------------------------

alter table profiles add column age_range text;
alter table profiles add column suspended_at timestamptz;
alter table profiles add column deleted_at timestamptz;

alter table passports add column travel_start_date date;
alter table passports add column travel_end_date date;

-- ----------------------------------------------------------------------------
-- profiles: let a national admin, or a state manager for a state where this
-- person holds a passport, update their profile. Previously only self-update
-- existed, so admins could not edit a holder's profile at all.
-- ----------------------------------------------------------------------------

create policy "profiles: manager update for their passport holders" on profiles
  for update using (
    is_national_admin(auth.uid())
    or exists (
      select 1 from passports p
      where p.owner_user_id = profiles.id
        and has_state_capability(auth.uid(), p.state_id, 'view_metrics')
    )
  )
  with check (
    is_national_admin(auth.uid())
    or exists (
      select 1 from passports p
      where p.owner_user_id = profiles.id
        and has_state_capability(auth.uid(), p.state_id, 'view_metrics')
    )
  );

-- suspended_at/deleted_at are national-admin-only regardless of which policy
-- let the UPDATE through (self-update included — a user can't un-suspend
-- themselves this way either).
create or replace function guard_profile_admin_fields()
returns trigger
language plpgsql
as $$
begin
  if (new.suspended_at is distinct from old.suspended_at or new.deleted_at is distinct from old.deleted_at)
     and not is_national_admin(auth.uid()) then
    raise exception 'only a national admin may change suspended_at/deleted_at';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_admin_fields
  before update on profiles
  for each row execute function guard_profile_admin_fields();

-- ----------------------------------------------------------------------------
-- passports: widen update access to state managers (status, dates, travel
-- dates); state_id/passport_product_id reassignment stays national-admin-only.
-- ----------------------------------------------------------------------------

drop policy "passports: admin update" on passports;

create policy "passports: admin update" on passports
  for update using (
    is_national_admin(auth.uid())
    or has_state_capability(auth.uid(), state_id, 'view_metrics')
  )
  with check (
    is_national_admin(auth.uid())
    or has_state_capability(auth.uid(), state_id, 'view_metrics')
  );

create or replace function guard_passport_admin_fields()
returns trigger
language plpgsql
as $$
begin
  if (new.state_id is distinct from old.state_id or new.passport_product_id is distinct from old.passport_product_id)
     and not is_national_admin(auth.uid()) then
    raise exception 'only a national admin may reassign a passport''s state/product';
  end if;
  return new;
end;
$$;

create trigger passports_guard_admin_fields
  before update on passports
  for each row execute function guard_passport_admin_fields();

-- ----------------------------------------------------------------------------
-- Business favorites
-- ----------------------------------------------------------------------------

create table business_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  business_id uuid not null references businesses (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, business_id)
);

create index business_favorites_user_id_idx on business_favorites (user_id);
create index business_favorites_business_id_idx on business_favorites (business_id);

alter table business_favorites enable row level security;

create policy "business_favorites: owner manage" on business_favorites
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "business_favorites: admin read" on business_favorites
  for select using (
    is_national_admin(auth.uid())
    or has_state_capability(auth.uid(), business_state_id(business_id), 'view_metrics')
  );
