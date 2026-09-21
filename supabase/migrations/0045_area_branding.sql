-- Per-region visual branding (colors + logo), starting with Orlando as the
-- pilot. All nullable - a region with none set falls back to the app's
-- current default look untouched (see src/app/globals.css's --brand-*
-- CSS variables and src/app/layout.tsx's resolveBrandArea).

alter table passport_areas
  add column brand_primary_color text,
  add column brand_secondary_color text,
  add column brand_logo_url text;
