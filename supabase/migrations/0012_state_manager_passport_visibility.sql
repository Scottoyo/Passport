-- The "Total passport holders" dashboard metric requires a state-level
-- manager to actually be able to SELECT passports.state_id — the existing
-- "passports: owner read" policy only covered the owner, national admins,
-- and local staff, so this silently returned 0 for every manager
-- regardless of capability. Scoped to state_assignments only (not
-- area_assignments): passports have no area column, so "view metrics" at
-- the area level was never meant to include state-wide passport counts —
-- consistent with the app layer treating that as undefined below the
-- state level (src/lib/admin-queries.ts's getDashboardMetrics).

create or replace function has_state_capability(uid uuid, target_state_id uuid, capability text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from state_assignments sa
    where sa.user_id = uid
      and sa.state_id = target_state_id
      and (
        (capability = 'view_metrics' and sa.can_view_metrics)
        or (capability = 'manage_businesses' and sa.can_manage_businesses)
        or (capability = 'manage_offers' and sa.can_manage_offers)
        or (capability = 'manage_subareas' and sa.can_manage_subareas)
        or (capability = 'submit_marketing_requests' and sa.can_submit_marketing_requests)
        or (capability = 'manage_staff' and sa.can_manage_staff)
      )
  );
$$;

drop policy "passports: owner read" on passports;

create policy "passports: owner read" on passports
  for select using (
    owner_user_id = auth.uid()
    or is_national_admin(auth.uid())
    or exists (
      select 1 from local_staff ls where ls.user_id = auth.uid()
    )
    or has_state_capability(auth.uid(), state_id, 'view_metrics')
  );
