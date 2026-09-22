-- The national homepage's map/list is meant to show every state (all 50),
-- with a not-yet-launched ("draft") state opening a "Coming Soon" waitlist
-- signup on click instead of navigating - but the public read policy
-- (0003, widened in 0047) only ever exposed 'active' states to a signed-out
-- visitor, so a draft state was invisible on the map entirely rather than
-- clickable-with-a-different-behavior. Widening to also include 'draft'
-- is safe: this table holds no sensitive data (name/slug/abbreviation),
-- and a draft state's own admin/branding fields stay gated by the
-- separate "states: admin update" policy regardless of what can be read.
drop policy "states: public read active" on states;
create policy "states: public read active" on states
  for select using (
    status in ('active', 'draft')
    or is_national_admin(auth.uid())
    or is_state_manager(auth.uid(), id)
  );
