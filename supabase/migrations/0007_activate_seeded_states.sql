-- The 50 seeded states (0006) should be usable everywhere immediately —
-- both in admin reporting/filters and on the public map — rather than
-- requiring a manual "Launch" click per state.
update states set status = 'active', launched_at = coalesce(launched_at, now())
where status = 'draft';
