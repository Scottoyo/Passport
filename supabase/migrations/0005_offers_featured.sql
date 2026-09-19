alter table offers add column featured boolean not null default false;

create index offers_featured_idx on offers(featured) where featured;
