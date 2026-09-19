-- Pivot: a Passport is valid in exactly one state, not nationwide. Each
-- state gets its own passport_products, and passports carries the state it
-- was purchased for. No existing passports/passport_products rows to
-- migrate (test scaffolding only), so these are added as not null directly.

alter table passport_products
  add column state_id uuid not null references states(id) on delete cascade;

create index passport_products_state_id_idx on passport_products (state_id);

alter table passports
  add column state_id uuid not null references states(id);

create index passports_state_id_idx on passports (state_id);

-- Keeps the denormalized passports.state_id honest against its own
-- product's state — same reasoning as validate_business_subarea in
-- 0001_schema.sql (a CHECK constraint can't do a cross-table lookup).
create or replace function validate_passport_state()
returns trigger
language plpgsql
as $$
begin
  if new.state_id <> (select state_id from passport_products where id = new.passport_product_id) then
    raise exception 'passport state_id % does not match its product''s state_id', new.state_id;
  end if;
  return new;
end;
$$;

create trigger passports_validate_state
  before insert or update on passports
  for each row execute function validate_passport_state();

-- Resolves a business to the state it's in, via its Passport Area — same
-- style as business_area_id() in 0003_rls.sql.
create or replace function business_state_id(b_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select pa.state_id
  from businesses b
  join passport_areas pa on pa.id = b.passport_area_id
  where b.id = b_id;
$$;

-- The actual enforcement of "a Passport only works in its own state": a
-- staff-initiated redemption now also requires the passport's state to
-- match the business's state. National admins keep their existing bypass
-- (e.g. for support/testing).
drop policy "redemptions: staff insert" on redemptions;

create policy "redemptions: staff insert" on redemptions
  for insert with check (
    is_national_admin(auth.uid())
    or (
      is_area_staff(auth.uid(), (select business_id from offers where id = offer_id))
      and exists (
        select 1 from passports p
        where p.id = passport_id
          and p.state_id = business_state_id((select business_id from offers where id = offer_id))
      )
    )
  );
