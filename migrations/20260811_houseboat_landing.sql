create table if not exists public.houseboat_content (
  id text primary key default 'houseboat' check (id = 'houseboat'),
  config jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.houseboat_inquiries (
  id uuid primary key default gen_random_uuid(),
  preferred_departure date,
  flexible_dates boolean not null default false,
  trip_length integer not null check (trip_length in (3,4,7)),
  adults integer not null default 1 check (adults >= 0),
  children integer not null default 0 check (children >= 0),
  private_rooms_needed integer not null default 1 check (private_rooms_needed between 0 and 5),
  trip_type text,
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text,
  questions text,
  status text not null default 'New',
  internal_notes text,
  estimated_booking_value numeric(12,2),
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  referrer text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint houseboat_group_size check (adults + children between 1 and 22)
);

create index if not exists houseboat_inquiries_created_idx on public.houseboat_inquiries(created_at desc);
create index if not exists houseboat_inquiries_status_idx on public.houseboat_inquiries(status, created_at desc);

alter table public.houseboat_content enable row level security;
alter table public.houseboat_inquiries enable row level security;
revoke all on public.houseboat_content from anon, authenticated;
revoke all on public.houseboat_inquiries from anon, authenticated;
