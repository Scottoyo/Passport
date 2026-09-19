-- ============================================================================
-- Categories become state-scoped, like regions/businesses/passport products
-- already are, instead of one shared national taxonomy. A state manager
-- (manage_businesses capability, same as tagging businesses with a
-- category in the first place) can now manage their own state's list;
-- national admins can manage any state's.
-- ============================================================================

alter table categories add column state_id uuid references states (id);

-- Backfill: every existing category is currently used only by Florida
-- businesses.
update categories
set state_id = (select id from states where slug = 'florida')
where state_id is null;

alter table categories alter column state_id set not null;
create index categories_state_id_idx on categories (state_id);

-- Category names/slugs were globally unique; now they only need to be
-- unique within a state (two states can each have their own "Restaurants").
alter table categories drop constraint categories_name_key;
alter table categories drop constraint categories_slug_key;
alter table categories add constraint categories_state_id_name_key unique (state_id, name);
alter table categories add constraint categories_state_id_slug_key unique (state_id, slug);

-- Keeps a business's category honest against its own state — same
-- reasoning and style as validate_business_subarea() in 0001_schema.sql.
create or replace function validate_business_category()
returns trigger
language plpgsql
as $$
begin
  if new.category_id is not null and not exists (
    select 1
    from categories c
    join passport_areas pa on pa.state_id = c.state_id
    where c.id = new.category_id and pa.id = new.passport_area_id
  ) then
    raise exception 'category % does not belong to this business''s state', new.category_id;
  end if;
  return new;
end;
$$;

create trigger businesses_validate_category
  before insert or update on businesses
  for each row execute function validate_business_category();

-- Write access: national admin, or a state manager with manage_businesses
-- for that category's state (the same capability that lets them tag
-- businesses with a category in the first place).
drop policy "categories: admin write" on categories;
drop policy "categories: admin update" on categories;
drop policy "categories: admin delete" on categories;

create policy "categories: manager write" on categories
  for insert with check (
    is_national_admin(auth.uid())
    or has_state_capability(auth.uid(), state_id, 'manage_businesses')
  );

create policy "categories: manager update" on categories
  for update using (
    is_national_admin(auth.uid())
    or has_state_capability(auth.uid(), state_id, 'manage_businesses')
  ) with check (
    is_national_admin(auth.uid())
    or has_state_capability(auth.uid(), state_id, 'manage_businesses')
  );

create policy "categories: manager delete" on categories
  for delete using (
    is_national_admin(auth.uid())
    or has_state_capability(auth.uid(), state_id, 'manage_businesses')
  );
