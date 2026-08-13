-- Receipt bonus entries for retail contests.
create extension if not exists pgcrypto;

alter table public.contests
  add column if not exists receipt_bonus_enabled boolean not null default false,
  add column if not exists receipt_bonus_per_item integer not null default 1,
  add column if not exists receipt_bonus_max_per_receipt integer not null default 10,
  add column if not exists receipt_bonus_help_text text;

alter table public.contest_entries
  add column if not exists bonus_entries_awarded integer not null default 0,
  add column if not exists bonus_entries_pending integer not null default 0;

create table if not exists public.contest_receipt_claims (
  id uuid primary key default gen_random_uuid(),
  contest_id uuid not null references public.contests(id) on delete cascade,
  receipt_scope_id uuid not null references public.contests(id) on delete cascade,
  entry_id uuid not null references public.contest_entries(id) on delete cascade,
  normalized_email text not null,
  asset_key text not null,
  asset_mime text,
  asset_size integer,
  image_hash text,
  receipt_number text,
  retailer_name text,
  purchase_date date,
  total_amount numeric(12,2),
  suenos_quantity integer not null default 0,
  bonus_entries_requested integer not null default 0,
  bonus_entries_awarded integer not null default 0,
  status text not null default 'pending' check (status in ('pending','approved','rejected','duplicate','error')),
  duplicate_of_receipt_id uuid references public.contest_receipt_claims(id) on delete set null,
  receipt_fingerprint text,
  ai_provider text,
  ai_model text,
  ai_confidence numeric(5,4),
  parsed_payload jsonb not null default '{}'::jsonb,
  moderation_notes text,
  rejection_reason text,
  reviewed_at timestamptz,
  reviewed_by text,
  created_at timestamptz not null default now()
);

create index if not exists contest_receipt_claims_contest_created_idx
  on public.contest_receipt_claims(contest_id, created_at desc);

create index if not exists contest_receipt_claims_entry_idx
  on public.contest_receipt_claims(entry_id, created_at desc);

create index if not exists contest_receipt_claims_scope_hash_idx
  on public.contest_receipt_claims(receipt_scope_id, image_hash);

create index if not exists contest_receipt_claims_scope_fingerprint_idx
  on public.contest_receipt_claims(receipt_scope_id, receipt_fingerprint);

alter table public.contest_receipt_claims enable row level security;
revoke all on public.contest_receipt_claims from anon, authenticated;

comment on table public.contest_receipt_claims is
  'Receipt uploads tied to contest entries for automated or manual bonus-entry review.';
