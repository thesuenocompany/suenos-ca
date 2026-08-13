-- Retail contest division: retailer-specific contest pages, regional age validation,
-- address collection and anonymous underage-block reporting.

alter table public.contests
  add column if not exists retail_parent_id uuid references public.contests(id) on delete set null,
  add column if not exists retail_is_master boolean not null default false,
  add column if not exists retailer_name text,
  add column if not exists retailer_code text,
  add column if not exists retailer_logo_url text,
  add column if not exists retailer_display_address text,
  add column if not exists retail_require_address boolean not null default true,
  add column if not exists age_requirement_mode text not null default 'fixed';

alter table public.contests
  drop constraint if exists contests_contest_type_check;

alter table public.contests
  add constraint contests_contest_type_check
  check (contest_type in ('standard','photo_scrapbook','retail'));

alter table public.contests
  drop constraint if exists contests_age_requirement_mode_check;

alter table public.contests
  add constraint contests_age_requirement_mode_check
  check (age_requirement_mode in ('fixed','regional'));

create index if not exists contests_retail_parent_idx
  on public.contests(retail_parent_id, updated_at desc);

create unique index if not exists contests_retailer_code_unique_idx
  on public.contests(retail_parent_id, lower(retailer_code))
  where retail_parent_id is not null and retailer_code is not null;

alter table public.contest_entries
  add column if not exists address_line1 text,
  add column if not exists address_line2 text,
  add column if not exists legal_age_required integer;

create table if not exists public.contest_age_blocks (
  id uuid primary key default gen_random_uuid(),
  contest_id uuid not null references public.contests(id) on delete cascade,
  province text,
  required_age integer not null,
  created_at timestamptz not null default now()
);

create index if not exists contest_age_blocks_contest_created_idx
  on public.contest_age_blocks(contest_id, created_at desc);

alter table public.contest_age_blocks enable row level security;
revoke all on public.contest_age_blocks from anon, authenticated;

comment on column public.contests.retail_parent_id is
  'For retailer-specific contest pages, references the master retail campaign.';
comment on column public.contests.retail_is_master is
  'Marks a reusable retail campaign template that is not intended as a public entry page.';
comment on column public.contests.age_requirement_mode is
  'fixed uses minimum_age; regional uses the legal drinking age for the entrant province or territory.';
comment on table public.contest_age_blocks is
  'Anonymous counts of blocked underage contest attempts. No name, email, phone, address or birthdate is stored.';
