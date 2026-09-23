-- ============================================================================
-- Lets a featured listing run for a bounded window (7 days, 30 days, or a
-- custom range) instead of only ever being "on" or "off". `featured` stays
-- the master switch (existing rows with it true and no window keep behaving
-- exactly as before - featured until someone flips it off); the two new
-- nullable columns, when set, additionally gate whether a featured business
-- is currently due to show. No cron/background job needed - the window is
-- enforced entirely by the read-side query (see getBusinessesForArea), the
-- same way the rest of this app relies on RLS/query conditions rather than
-- scheduled jobs.
-- ============================================================================

alter table businesses
  add column featured_starts_at timestamptz,
  add column featured_ends_at timestamptz;
