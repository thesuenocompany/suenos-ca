alter table public.contests add column if not exists receipt_bonus_allowed_items jsonb not null default '[]'::jsonb;

alter table public.contests drop constraint if exists contests_receipt_bonus_allowed_items_array;
alter table public.contests add constraint contests_receipt_bonus_allowed_items_array
  check (jsonb_typeof(receipt_bonus_allowed_items) = 'array');

comment on column public.contests.receipt_bonus_allowed_items is
  'Retailer-specific receipt item aliases/menu items that count as Sueños purchases for bonus entry verification.';
