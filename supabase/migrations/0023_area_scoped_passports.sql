-- ============================================================================
-- Second pivot: a Passport is scoped to exactly one Passport Area (region),
-- not a whole state. 0008_state_scoped_passports.sql made the state the
-- redemption boundary; this makes the region the boundary instead, for the
-- same reason 0008 gave — a more granular purchase boundary means more
-- purchases (a multi-region trip within one state now needs a Passport per
-- region, not one statewide Passport). state_id stays on both tables (a
-- region always belongs to exactly one state, so it's still a valid,
-- trigger-enforced rollup used by state-manager RLS, admin-scope
-- filtering, and dashboard metrics) — passport_area_id is the new, real
-- boundary layered on top.
-- ============================================================================

alter table passport_products add column passport_area_id uuid references passport_areas (id);
alter table passports add column passport_area_id uuid references passport_areas (id);

-- Backfill: the only real data is the "Florida Passport" product and any
-- passports bought against it — Orlando is the only region with live
-- businesses/offers, so that's where this belongs. Renamed for copy
-- accuracy now that a product is region-specific.
update passport_products
set
  passport_area_id = (select id from passport_areas where slug = 'orlando' and state_id = (select id from states where slug = 'florida')),
  name = 'Orlando Passport'
where state_id = (select id from states where slug = 'florida')
  and passport_area_id is null;

update passports p
set passport_area_id = pp.passport_area_id
from passport_products pp
where p.passport_product_id = pp.id
  and p.passport_area_id is null;

alter table passport_products alter column passport_area_id set not null;
alter table passports alter column passport_area_id set not null;

create index passport_products_passport_area_id_idx on passport_products (passport_area_id);
create index passports_passport_area_id_idx on passports (passport_area_id);

-- Keeps a product's state_id honest against its own area — same reasoning
-- and style as validate_business_subarea() in 0001_schema.sql.
create or replace function validate_passport_product_area()
returns trigger
language plpgsql
as $$
begin
  if new.state_id <> (select state_id from passport_areas where id = new.passport_area_id) then
    raise exception 'passport product state_id % does not match its area''s state_id', new.state_id;
  end if;
  return new;
end;
$$;

create trigger passport_products_validate_area
  before insert or update on passport_products
  for each row execute function validate_passport_product_area();

-- Extend the existing state-consistency check (0008) to also keep a
-- passport's passport_area_id honest against its own product's area.
create or replace function validate_passport_state()
returns trigger
language plpgsql
as $$
begin
  if new.state_id <> (select state_id from passport_products where id = new.passport_product_id) then
    raise exception 'passport state_id % does not match its product''s state_id', new.state_id;
  end if;
  if new.passport_area_id <> (select passport_area_id from passport_products where id = new.passport_product_id) then
    raise exception 'passport passport_area_id % does not match its product''s passport_area_id', new.passport_area_id;
  end if;
  return new;
end;
$$;

-- Extend the admin-only reassignment guard (0020) to cover passport_area_id
-- alongside state_id/passport_product_id.
create or replace function guard_passport_admin_fields()
returns trigger
language plpgsql
as $$
begin
  if (
    new.state_id is distinct from old.state_id
    or new.passport_product_id is distinct from old.passport_product_id
    or new.passport_area_id is distinct from old.passport_area_id
  )
  and not is_national_admin(auth.uid()) then
    raise exception 'only a national admin may reassign a passport''s state/region/product';
  end if;

  if (
    new.status is distinct from old.status
    or new.expires_at is distinct from old.expires_at
    or new.purchased_at is distinct from old.purchased_at
    or new.payment_reference is distinct from old.payment_reference
  )
  and not is_national_admin(auth.uid())
  and not has_state_capability(auth.uid(), old.state_id, 'view_metrics') then
    raise exception 'only an admin may change this passport''s status, dates, or payment info';
  end if;

  return new;
end;
$$;

-- Redemption boundary moves from state to region: a staff-initiated
-- redemption now requires the passport's region to match the business's
-- region, not just its state.
drop policy "redemptions: staff insert" on redemptions;

create policy "redemptions: staff insert" on redemptions
  for insert with check (
    is_national_admin(auth.uid())
    or (
      is_area_staff(auth.uid(), (select business_id from offers where id = offer_id))
      and exists (
        select 1 from passports p
        where p.id = passport_id
          and p.passport_area_id = business_area_id((select business_id from offers where id = offer_id))
      )
    )
  );
