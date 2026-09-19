-- ============================================================================
-- Example seed data for local development.
--
-- This is intentionally generic — not Anna Maria Island / AMI Passport data.
-- It demonstrates the hierarchy with two independent states so it's obvious
-- the platform isn't hard-coded to one region.
-- ============================================================================

insert into categories (name, slug, sort_order) values
  ('Restaurants', 'restaurants', 1),
  ('Attractions', 'attractions', 2),
  ('Shopping', 'shopping', 3),
  ('Experiences', 'experiences', 4)
on conflict (slug) do nothing;

insert into passport_products (name, description, price_cents, currency, duration_days, status)
values (
  'National Passport',
  'One Passport, valid nationwide at every participating business for a full year.',
  4900,
  'USD',
  365,
  'active'
);

with fl as (
  insert into states (name, slug, abbreviation, status, intro_copy, launched_at)
  values ('Florida', 'florida', 'FL', 'active', 'Discover Passport savings across Florida.', now())
  returning id
),
tx as (
  insert into states (name, slug, abbreviation, status, intro_copy, launched_at)
  values ('Texas', 'texas', 'TX', 'active', 'Discover Passport savings across Texas.', now())
  returning id
),
orlando as (
  insert into passport_areas (state_id, name, slug, status, tagline, description, launched_at)
  select id, 'Orlando', 'orlando', 'active',
    'Theme parks, dining, and more',
    'The Orlando Passport Area covers the greater Orlando metro.',
    now()
  from fl
  returning id
),
austin as (
  insert into passport_areas (state_id, name, slug, status, tagline, description, launched_at)
  select id, 'Austin', 'austin', 'active',
    'Live music, food, and local shops',
    'The Austin Passport Area covers greater Austin.',
    now()
  from tx
  returning id
),
intl_drive as (
  insert into subareas (passport_area_id, name, slug, status, description, launched_at)
  select id, 'International Drive', 'international-drive', 'active',
    'The heart of Orlando''s tourist corridor.', now()
  from orlando
  returning id
)
insert into businesses (
  passport_area_id, subarea_id, category_id, name, slug, status,
  description, city, state_code, launched_at
)
select
  orlando.id,
  intl_drive.id,
  (select id from categories where slug = 'restaurants'),
  'Example Grill & Tap',
  'example-grill-and-tap',
  'active',
  'A sample restaurant listing to demonstrate the business/offer model.',
  'Orlando',
  'FL',
  now()
from orlando, intl_drive;

insert into businesses (
  passport_area_id, category_id, name, slug, status, description, city, state_code, launched_at
)
select
  id,
  (select id from categories where slug = 'experiences'),
  'Example Live Music Hall',
  'example-live-music-hall',
  'active',
  'A sample attraction listing to demonstrate the business/offer model.',
  'Austin',
  'TX',
  now()
from passport_areas where slug = 'austin';

insert into offers (business_id, title, description, discount_type, discount_value, redemptions_per_passport, status, launched_at)
select id, '20% off your bill', 'Show your Passport for 20% off food and non-alcoholic drinks.', 'percent_off', 20, 1, 'active', now()
from businesses where slug = 'example-grill-and-tap';

insert into offers (business_id, title, description, discount_type, discount_value, redemptions_per_passport, status, launched_at)
select id, 'Free appetizer with entree purchase', 'One free appetizer per Passport with any entree purchase.', 'freebie', null, 1, 'active', now()
from businesses where slug = 'example-live-music-hall';
