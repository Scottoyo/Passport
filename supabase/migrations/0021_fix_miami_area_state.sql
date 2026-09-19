-- Data fix: the "Miami" Passport Area was created under Alaska (test
-- scaffolding error) instead of Florida, where the actual city is.
update passport_areas
set state_id = (select id from states where slug = 'florida')
where name = 'Miami'
  and state_id = (select id from states where slug = 'alaska');
