-- Sueños reusable contest system. Safe additive migration.
create extension if not exists pgcrypto;

create table if not exists public.contests (
  id uuid primary key default gen_random_uuid(),
  internal_name text not null,
  public_name text not null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  status text not null default 'draft' check (status in ('draft','published','archived')),
  featured boolean not null default false,
  show_before_start boolean not null default false,
  eyebrow text,
  headline text,
  intro_copy text,
  description_html text,
  desktop_hero_url text,
  mobile_hero_url text,
  hero_alt text,
  hero_object_position text not null default '50% 50%',
  prize_title text,
  prize_description text,
  prize_value numeric(12,2),
  winner_count integer not null default 1 check (winner_count > 0),
  included_items text,
  excluded_items text,
  redemption_restrictions text,
  prize_expiry text,
  prize_image_urls jsonb not null default '[]'::jsonb,
  start_at timestamptz not null,
  close_at timestamptz not null,
  draw_at timestamptz,
  timezone text not null default 'America/Vancouver',
  minimum_age integer not null default 19,
  eligible_provinces text[] not null default array['BC']::text[],
  eligible_regions text[] not null default '{}'::text[],
  excluded_people text,
  entry_limit integer not null default 1,
  phone_enabled boolean not null default false,
  phone_required boolean not null default false,
  city_required boolean not null default true,
  postal_required boolean not null default true,
  province_required boolean not null default true,
  custom_question_enabled boolean not null default false,
  custom_question_label text,
  custom_question_type text default 'short' check (custom_question_type in ('short','dropdown','multiple_choice')),
  custom_question_options jsonb not null default '[]'::jsonb,
  marketing_enabled boolean not null default true,
  marketing_consent_text text not null default 'Yes, I’d like to receive occasional emails from Sueños Artisan Tequila about products, events and promotions. I can unsubscribe at any time.',
  marketing_consent_version text not null default '1.0',
  abbreviated_rules text,
  full_rules_html text,
  external_rules_url text,
  rules_pdf_url text,
  rules_version text not null default '1.0',
  confirmation_heading text not null default 'You’re in. Paradise may be calling.',
  confirmation_message text,
  confirmation_cta_label text,
  confirmation_cta_url text,
  publish_winner boolean not null default false,
  published_winner_name text,
  published_winner_city text,
  homepage_promotion_enabled boolean not null default false,
  homepage_promotion_headline text,
  homepage_promotion_image text,
  homepage_promotion_cta text,
  homepage_promotion_start_at timestamptz,
  homepage_promotion_end_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contest_dates_valid check (close_at > start_at),
  constraint contest_draw_valid check (draw_at is null or draw_at >= close_at)
);

create table if not exists public.contest_entries (
  id uuid primary key default gen_random_uuid(),
  contest_id uuid not null references public.contests(id) on delete restrict,
  first_name text not null,
  last_name text not null,
  email text not null,
  normalized_email text not null,
  phone text,
  city text,
  postal_code text,
  province text,
  age_confirmed boolean not null,
  rules_confirmed boolean not null,
  rules_version text not null,
  marketing_consent boolean not null default false,
  marketing_consent_at timestamptz,
  marketing_consent_text text,
  marketing_consent_version text,
  custom_response text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  referrer text,
  anti_abuse_result text,
  ip_hash text,
  status text not null default 'valid' check (status in ('valid','disqualified','test')),
  disqualification_reason text,
  disqualified_at timestamptz,
  created_at timestamptz not null default now(),
  unique(contest_id, normalized_email)
);

create table if not exists public.contest_winner_selections (
  id uuid primary key default gen_random_uuid(),
  contest_id uuid not null references public.contests(id) on delete restrict,
  entry_id uuid not null references public.contest_entries(id) on delete restrict,
  winner_position integer not null,
  selected_at timestamptz not null default now(),
  selected_by text not null,
  eligible_pool_size integer not null,
  selection_method text not null default 'node_crypto_randomInt_v1',
  winner_status text not null default 'potential_winner' check (winner_status in ('potential_winner','contacted','confirmed','declined','unreachable','disqualified')),
  audit_notes text,
  replacement_reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.contest_audit_log (
  id uuid primary key default gen_random_uuid(),
  contest_id uuid references public.contests(id) on delete restrict,
  action text not null,
  actor text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists contest_entries_contest_created_idx on public.contest_entries(contest_id, created_at desc);
create index if not exists contest_entries_status_idx on public.contest_entries(contest_id, status);
create index if not exists contest_winners_contest_idx on public.contest_winner_selections(contest_id, selected_at desc);

alter table public.contests enable row level security;
alter table public.contest_entries enable row level security;
alter table public.contest_winner_selections enable row level security;
alter table public.contest_audit_log enable row level security;

revoke all on public.contests from anon, authenticated;
revoke all on public.contest_entries from anon, authenticated;
revoke all on public.contest_winner_selections from anon, authenticated;
revoke all on public.contest_audit_log from anon, authenticated;
