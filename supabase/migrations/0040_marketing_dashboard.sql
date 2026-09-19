-- Marketing requests become a real dashboard: promote "service type" and
-- "scheduled dates" out of the free-text details blob into real columns,
-- and add a 'live' status between approved and completed so the admin
-- dashboard can show pending / approved & scheduled / live / completed
-- buckets per service category.

alter type marketing_request_status add value 'live' after 'approved';

create type marketing_service_type as enum (
  'featured_business',
  'email_marketing',
  'sms_marketing',
  'sponsored_promotion',
  'social_media_post',
  'custom_campaign'
);

-- Nullable: existing rows predate this column and have no reliable type to
-- infer from their free-text details, so they stay untyped rather than
-- guessed at.
alter table marketing_requests add column service_type marketing_service_type;
alter table marketing_requests add column start_date date;
alter table marketing_requests add column end_date date;

