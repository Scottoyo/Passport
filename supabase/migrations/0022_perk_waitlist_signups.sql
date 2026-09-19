-- "Notify me" signups from the homepage map/list for a state that has no
-- live perks yet (no active offer at an active business in an active
-- region) — public insert only, no read access beyond national admins.
create table perk_waitlist_signups (
  id uuid primary key default gen_random_uuid(),
  state_id uuid not null references states (id) on delete cascade,
  first_name text not null,
  last_name text not null,
  email text not null,
  created_at timestamptz not null default now()
);

create index perk_waitlist_signups_state_id_idx on perk_waitlist_signups (state_id);

alter table perk_waitlist_signups enable row level security;

create policy "perk_waitlist_signups: public insert" on perk_waitlist_signups
  for insert with check (true);

create policy "perk_waitlist_signups: admin read" on perk_waitlist_signups
  for select using (is_national_admin(auth.uid()));
