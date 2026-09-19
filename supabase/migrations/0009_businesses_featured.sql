alter table businesses add column featured boolean not null default false;

create index businesses_featured_idx on businesses(featured) where featured;
