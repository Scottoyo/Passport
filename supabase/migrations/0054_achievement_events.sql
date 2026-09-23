-- Achievement notifications: a passport holder's "Achievement Unlocked"
-- feed. Unlike region_events, there's no live "did this just change" signal
-- on a read - getAchievementProgress (src/lib/queries.ts) computes
-- achievement state live on every call from redemptions/business_favorites
-- counts, with no persisted "unlocked" flag anywhere. This table is that
-- persisted signal, populated by triggers on the two tables that feed those
-- counts. Thresholds here (1/10/5/5) MUST stay in sync with
-- ACHIEVEMENT_CATALOG in src/lib/queries.ts by hand - there is no single
-- source of truth without making the achievement catalog DB-driven, which
-- is explicitly out of scope for this change.

create table achievement_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  achievement_key text not null,
  created_at timestamptz not null default now(),
  unique (user_id, achievement_key)
);

create index achievement_events_user_id_idx on achievement_events(user_id);

alter table achievement_events enable row level security;

create policy "achievement_events: read by owner" on achievement_events
  for select using (user_id = auth.uid());

-- No insert policy - only the security-definer triggers below ever write
-- this table, same idiom as region_events/admin_notifications.

-- security definer: fires as part of an ordinary passport holder's own
-- redeem_offer() call (0031) - achievement_events has RLS with only a read
-- policy, so without definer privileges this insert would be rejected.
create function notify_achievement_progress()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_redemption_count integer;
  v_unique_business_count integer;
begin
  select owner_user_id into v_user_id from passports where id = new.passport_id;
  if v_user_id is null then
    return new;
  end if;

  select count(*) into v_redemption_count
  from redemptions r
  join passports p on p.id = r.passport_id
  where p.owner_user_id = v_user_id;

  -- Thresholds must match ACHIEVEMENT_CATALOG in src/lib/queries.ts.
  if v_redemption_count >= 1 then
    insert into achievement_events (user_id, achievement_key)
    values (v_user_id, 'first_redemption')
    on conflict do nothing;
  end if;

  if v_redemption_count >= 10 then
    insert into achievement_events (user_id, achievement_key)
    values (v_user_id, 'super_saver')
    on conflict do nothing;
  end if;

  select count(distinct o.business_id) into v_unique_business_count
  from redemptions r
  join passports p on p.id = r.passport_id
  join offers o on o.id = r.offer_id
  where p.owner_user_id = v_user_id;

  if v_unique_business_count >= 5 then
    insert into achievement_events (user_id, achievement_key)
    values (v_user_id, 'explorer')
    on conflict do nothing;
  end if;

  return new;
end;
$$;

create trigger redemptions_notify_achievement
  after insert on redemptions
  for each row execute function notify_achievement_progress();

-- security definer: fires as part of an ordinary passport holder's own
-- toggleFavorite() insert (src/app/[state]/[area]/businesses/[business]/actions.ts).
create function notify_favorite_achievement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  select count(*) into v_count from business_favorites where user_id = new.user_id;

  -- Threshold must match ACHIEVEMENT_CATALOG in src/lib/queries.ts.
  if v_count >= 5 then
    insert into achievement_events (user_id, achievement_key)
    values (new.user_id, 'local_favorite')
    on conflict do nothing;
  end if;

  return new;
end;
$$;

create trigger business_favorites_notify_achievement
  after insert on business_favorites
  for each row execute function notify_favorite_achievement();

-- One-time backfill for users who already crossed a threshold before this
-- feature shipped - without this they'd never get the achievement_unlocked
-- event unless they happen to redeem/favorite again after cutover, even
-- though the Achievements page already shows them as having unlocked it.
insert into achievement_events (user_id, achievement_key)
select p.owner_user_id, 'first_redemption'
from passports p join redemptions r on r.passport_id = p.id
group by p.owner_user_id having count(*) >= 1
on conflict do nothing;

insert into achievement_events (user_id, achievement_key)
select p.owner_user_id, 'super_saver'
from passports p join redemptions r on r.passport_id = p.id
group by p.owner_user_id having count(*) >= 10
on conflict do nothing;

insert into achievement_events (user_id, achievement_key)
select p.owner_user_id, 'explorer'
from passports p
join redemptions r on r.passport_id = p.id
join offers o on o.id = r.offer_id
group by p.owner_user_id having count(distinct o.business_id) >= 5
on conflict do nothing;

insert into achievement_events (user_id, achievement_key)
select user_id, 'local_favorite'
from business_favorites
group by user_id having count(*) >= 5
on conflict do nothing;
