-- Data fix: Tampa and Siesta Key ended up with comma-separated,
-- keyword-list-style taglines ("Riverwalk, breweries, and Gulf-coast fun")
-- that were never deliberately written by an admin — clearing them so
-- regions only carry copy someone actually chose to enter.
update passport_areas
set tagline = null
where slug in ('tampa', 'siesta-key')
  and state_id = (select id from states where slug = 'florida');
