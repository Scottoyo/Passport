-- ============================================================================
-- Transactional-email log: the single record of every automated email this
-- app has attempted to send (passport-holder welcome, business welcome,
-- contact-form notification - password reset is handled entirely by
-- Supabase Auth's own built-in flow and never touches this table).
--
-- idempotency_key is unique and IS the dedup mechanism - callers insert
-- first and treat a unique-violation as "already sent, no-op" rather than
-- checking then inserting (check-then-insert has a race under concurrent
-- calls, e.g. a double-click). No `_sent` flag column is added to
-- `passports`/`businesses` for this - this table is the one source of truth.
--
-- Written only by the service-role client (src/lib/supabase/admin.ts) from
-- the server-only email module - no anon/authenticated RLS policy exists,
-- so no ordinary request can insert, update, or read a row.
-- ============================================================================

create type email_type as enum ('passport_welcome', 'business_welcome', 'contact_notification');
create type email_delivery_status as enum ('pending', 'sent', 'failed');

create table email_log (
  id uuid primary key default gen_random_uuid(),
  email_type email_type not null,
  recipient text not null,
  related_user_id uuid references profiles (id) on delete set null,
  related_business_id uuid references businesses (id) on delete set null,
  related_passport_id uuid references passports (id) on delete set null,
  related_region_id uuid references passport_areas (id) on delete set null,
  provider_message_id text,
  idempotency_key text not null,
  delivery_status email_delivery_status not null default 'pending',
  attempt_count integer not null default 0,
  failure_reason text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (idempotency_key)
);

create index email_log_recipient_idx on email_log (recipient);
create index email_log_type_idx on email_log (email_type);

create trigger email_log_set_updated_at
  before update on email_log
  for each row execute function set_updated_at();

alter table email_log enable row level security;

-- No anon/authenticated policy at all - service role bypasses RLS entirely,
-- same as every other service-role write in this app. National admins get
-- read access for future debugging/resend tooling (no such UI exists yet).
create policy "email_log: national admin read" on email_log
  for select using (is_national_admin(auth.uid()));
