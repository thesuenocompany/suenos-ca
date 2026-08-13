-- Retail receipt bonus entries with AI-assisted review and duplicate protection.

alter table public.contests
  add column if not exists receipt_bonus_enabled boolean not null default false,
  add column if not exists receipt_bonus_per_item integer not null default 1,
  add column if not exists receipt_bonus_max_per_receipt integer not null default 10,
  add column if not exists receipt_bonus_help_text text,
  add column if not exists receipt_bonus_auto_approve_confidence numeric(4,3) not null default 0.85,
  add column if not exists receipt_bonus_no_purchase_method text;

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
  asset_size bigint,
  image_hash text not null,
  receipt_fingerprint text,
  receipt_number text,
  retailer_name text,
  purchase_date date,
  total_amount numeric(12,2),
  suenos_quantity integer not null default 0,
  bonus_entries_requested integer not null default 0,
  bonus_entries_awarded integer not null default 0,
  status text not null default 'pending' check (status in ('pending','approved','rejected','duplicate')),
  duplicate_of_receipt_id uuid references public.contest_receipt_claims(id) on delete set null,
  ai_provider text,
  ai_model text,
  ai_confidence numeric(4,3),
  parsed_payload jsonb not null default '{}'::jsonb,
  moderation_notes text,
  rejection_reason text,
  reviewed_at timestamptz,
  reviewed_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists contest_receipt_claims_contest_idx
  on public.contest_receipt_claims(contest_id, created_at desc);
create index if not exists contest_receipt_claims_entry_idx
  on public.contest_receipt_claims(entry_id, created_at desc);
create index if not exists contest_receipt_claims_status_idx
  on public.contest_receipt_claims(contest_id, status, created_at desc);
create unique index if not exists contest_receipt_claims_scope_image_unique
  on public.contest_receipt_claims(receipt_scope_id, image_hash);
create unique index if not exists contest_receipt_claims_scope_fingerprint_unique
  on public.contest_receipt_claims(receipt_scope_id, receipt_fingerprint)
  where receipt_fingerprint is not null;

alter table public.contest_receipt_claims enable row level security;
revoke all on public.contest_receipt_claims from anon, authenticated;

comment on column public.contests.receipt_bonus_auto_approve_confidence is
  'Minimum AI confidence required for automatic receipt approval. Full receipt visibility and a detected Sueños purchase are also required.';
comment on column public.contests.receipt_bonus_no_purchase_method is
  'Equivalent no-purchase method for earning receipt-style bonus entries, to be reflected in contest rules.';
comment on table public.contest_receipt_claims is
  'Receipt submissions for retail contest bonus entries, including AI extraction, manual review and duplicate fingerprints.';

-- Allow duplicate attempts to be recorded while still preventing two non-duplicate claims
-- from using the same receipt/image within the same retail campaign.
drop index if exists public.contest_receipt_claims_scope_image_unique;
drop index if exists public.contest_receipt_claims_scope_fingerprint_unique;
create unique index if not exists contest_receipt_claims_scope_image_unique
  on public.contest_receipt_claims(receipt_scope_id, image_hash)
  where status <> 'duplicate';
create unique index if not exists contest_receipt_claims_scope_fingerprint_unique
  on public.contest_receipt_claims(receipt_scope_id, receipt_fingerprint)
  where receipt_fingerprint is not null and status <> 'duplicate';
