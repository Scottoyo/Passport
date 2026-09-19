-- Customer-facing "Passport number" was just the passports.id UUID, which
-- is neither a good look nor a good thing to hand a staff member to type.
-- Give every passport a separate, auto-generated 12-digit number instead.

alter table passports add column passport_number text unique;

create function generate_passport_number() returns text
language plpgsql as $$
declare
  v_number text;
begin
  loop
    v_number := lpad(floor(random() * 1000000000000)::bigint::text, 12, '0');
    exit when not exists (select 1 from passports where passport_number = v_number);
  end loop;
  return v_number;
end;
$$;

create function set_passport_number() returns trigger
language plpgsql as $$
begin
  if new.passport_number is null then
    new.passport_number := generate_passport_number();
  end if;
  return new;
end;
$$;

create trigger passports_set_number before insert on passports
  for each row execute function set_passport_number();

update passports set passport_number = generate_passport_number() where passport_number is null;

alter table passports alter column passport_number set not null;
