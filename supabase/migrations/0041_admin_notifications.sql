-- Admin-facing notification feed: the manager equivalent of region_events
-- (0035_passport_holder_dashboard.sql), but for the two things a manager
-- actually needs to act on - a business landing in pending_review, and a
-- business submitting a marketing request. Same shape, same idiom: a
-- trigger-populated event table, security-definer triggers so an ordinary
-- authenticated session's insert/update can still populate it, and a
-- last-read timestamp on profiles to compute unread counts.

create type admin_notification_type as enum ('business_pending_review', 'marketing_request_submitted');

create table admin_notifications (
  id uuid primary key default gen_random_uuid(),
  passport_area_id uuid not null references passport_areas(id) on delete cascade,
  notification_type admin_notification_type not null,
  business_id uuid references businesses(id) on delete cascade,
  marketing_request_id uuid references marketing_requests(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index admin_notifications_area_id_idx on admin_notifications(passport_area_id);

alter table admin_notifications enable row level security;

-- has_area_capability already ORs area_assignments and state_assignments
-- (via a join through passport_areas, see 0011_state_assignments.sql), so
-- this one check alone covers region, state, and national managers.
create policy "admin_notifications: read by managers" on admin_notifications
  for select using (
    is_national_admin(auth.uid())
    or has_area_capability(auth.uid(), passport_area_id, 'view_metrics')
  );

-- security definer: these triggers fire as part of an ordinary manager's or
-- self-registering owner's own insert/update - admin_notifications has RLS
-- with only a read policy, so without definer privileges the insert would
-- be rejected for every real app session, not just admins.
create function notify_business_pending_review()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.approval_status = 'pending_review'
     and (TG_OP = 'INSERT' or old.approval_status is distinct from new.approval_status)
  then
    insert into admin_notifications (passport_area_id, notification_type, business_id)
    values (new.passport_area_id, 'business_pending_review', new.id);
  end if;
  return new;
end;
$$;

create trigger businesses_notify_pending_review
  after insert or update on businesses
  for each row execute function notify_business_pending_review();

create function notify_marketing_request_submitted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into admin_notifications (passport_area_id, notification_type, marketing_request_id)
  values (new.passport_area_id, 'marketing_request_submitted', new.id);
  return new;
end;
$$;

create trigger marketing_requests_notify_submitted
  after insert on marketing_requests
  for each row execute function notify_marketing_request_submitted();

-- Separate from notifications_last_read_at (the passport holder's
-- region_events read-tracking column) - these are two different inboxes for
-- what could be the same person.
alter table profiles add column admin_notifications_last_read_at timestamptz;
