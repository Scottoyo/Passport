-- Promo codes (new discount-code concept) plus the dollar-value plumbing
-- referral tracking needs: a revenue snapshot per passport purchase and a
-- payout rate/status per referrer. Checkout stays a placeholder (no real
-- payment processor - see startPlaceholderPassport) so nothing here moves
-- real money; it's an internal ledger of what would be owed/paid, same as
-- the existing "Revenue generated: $0.00" placeholders it replaces.

create type promo_discount_type as enum ('percent_off', 'amount_off');
create type promo_code_status as enum ('active', 'inactive');

create table promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_type promo_discount_type not null,
  discount_value integer not null,
  scope_state_id uuid references states(id) on delete cascade,
  scope_area_id uuid references passport_areas(id) on delete cascade,
  status promo_code_status not null default 'active',
  max_uses integer,
  times_used integer not null default 0,
  expires_at timestamptz,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index promo_codes_scope_state_idx on promo_codes(scope_state_id);
create index promo_codes_scope_area_idx on promo_codes(scope_area_id);

create trigger promo_codes_set_updated_at
  before update on promo_codes
  for each row execute function set_updated_at();

alter table promo_codes enable row level security;

-- Same has_area_capability/has_state_capability OR-widening idiom as
-- marketing_requests (0032), plus one extra rule: a nationwide code (both
-- scope columns null) is national-admin-only, never visible/writable by a
-- state or region manager.
create policy "promo_codes: read by managers" on promo_codes
  for select using (
    is_national_admin(auth.uid())
    or (scope_area_id is not null and has_area_capability(auth.uid(), scope_area_id, 'view_metrics'))
    or (scope_area_id is null and scope_state_id is not null and has_state_capability(auth.uid(), scope_state_id, 'view_metrics'))
  );

create policy "promo_codes: write by managers" on promo_codes
  for insert with check (
    is_national_admin(auth.uid())
    or (scope_area_id is not null and has_area_capability(auth.uid(), scope_area_id, 'manage_offers'))
    or (scope_area_id is null and scope_state_id is not null and has_state_capability(auth.uid(), scope_state_id, 'manage_offers'))
  );

create policy "promo_codes: update by managers" on promo_codes
  for update using (
    is_national_admin(auth.uid())
    or (scope_area_id is not null and has_area_capability(auth.uid(), scope_area_id, 'manage_offers'))
    or (scope_area_id is null and scope_state_id is not null and has_state_capability(auth.uid(), scope_state_id, 'manage_offers'))
  ) with check (
    is_national_admin(auth.uid())
    or (scope_area_id is not null and has_area_capability(auth.uid(), scope_area_id, 'manage_offers'))
    or (scope_area_id is null and scope_state_id is not null and has_state_capability(auth.uid(), scope_state_id, 'manage_offers'))
  );

create policy "promo_codes: delete by managers" on promo_codes
  for delete using (
    is_national_admin(auth.uid())
    or (scope_area_id is not null and has_area_capability(auth.uid(), scope_area_id, 'manage_offers'))
    or (scope_area_id is null and scope_state_id is not null and has_state_capability(auth.uid(), scope_state_id, 'manage_offers'))
  );

-- security definer: checkout validates through this RPC instead of reading
-- promo_codes directly, so an ordinary customer session never sees the
-- table's contents (discount amounts, other regions' codes) - mirrors
-- resolve_profile_referral_code's exact idiom (0037). Increments times_used
-- atomically in the same statement to avoid a max-uses race between two
-- concurrent checkouts.
create function validate_promo_code(code text, area_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_normalized text;
  v_code promo_codes%rowtype;
  v_state_id uuid;
begin
  v_normalized := lower(trim(code));
  select state_id into v_state_id from passport_areas where id = area_id;

  select * into v_code
  from promo_codes
  where lower(promo_codes.code) = v_normalized
    and status = 'active'
    and (expires_at is null or expires_at > now())
    and (max_uses is null or times_used < max_uses)
    and (
      (scope_state_id is null and scope_area_id is null)
      or (scope_area_id = area_id)
      or (scope_area_id is null and scope_state_id = v_state_id)
    )
  for update;

  if v_code.id is null then
    return jsonb_build_object('success', false, 'error', 'That promo code is not valid for this Passport.');
  end if;

  update promo_codes set times_used = times_used + 1 where id = v_code.id;

  return jsonb_build_object(
    'success', true,
    'promo_code_id', v_code.id,
    'discount_type', v_code.discount_type,
    'discount_value', v_code.discount_value
  );
end;
$$;

revoke all on function validate_promo_code(text, uuid) from public;
grant execute on function validate_promo_code(text, uuid) to authenticated;

-- Revenue/payout snapshots on the purchase itself, not derived live from
-- promo_codes/profiles/businesses, so a later rate or price change never
-- rewrites historical reporting.
alter table passports
  add column amount_paid_cents integer not null default 0,
  add column promo_code_id uuid references promo_codes(id) on delete set null,
  add column discount_cents integer not null default 0,
  add column referral_payout_cents integer not null default 0,
  add column referral_payout_paid_at timestamptz;

-- Admin-settable payout rate and a referral-specific suspend flag, separate
-- from the existing account-level profiles.suspended_at so suspending a
-- referral code never touches account access.
alter table profiles
  add column referral_payout_rate_cents integer not null default 0,
  add column referral_suspended_at timestamptz;

alter table businesses
  add column referral_payout_rate_cents integer not null default 0,
  add column referral_suspended_at timestamptz;
