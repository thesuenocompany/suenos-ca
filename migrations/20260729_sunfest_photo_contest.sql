-- Sueños Sunfest photo contest extension. Safe additive migration.
alter table public.contests
  add column if not exists layout_style text not null default 'standard',
  add column if not exists photo_entries_enabled boolean not null default false,
  add column if not exists written_entries_enabled boolean not null default false,
  add column if not exists festival_start_at timestamptz,
  add column if not exists festival_end_at timestamptz,
  add column if not exists event_location text,
  add column if not exists privacy_contact_name text,
  add column if not exists privacy_contact_email text,
  add column if not exists legal_sponsor_name text,
  add column if not exists legal_sponsor_address text,
  add column if not exists platform_disclaimer text,
  add column if not exists photo_rights_text text,
  add column if not exists photo_rights_version text not null default '1.0',
  add column if not exists alcohol_excluded boolean not null default true,
  add column if not exists prize_image_url text,
  add column if not exists gallery_heading text not null default 'SUNFEST MEMORIES',
  add column if not exists gallery_subheading text not null default 'From our amazing community';

alter table public.contest_entries
  add column if not exists entry_type text not null default 'standard',
  add column if not exists memory_text text,
  add column if not exists photo_asset_key text,
  add column if not exists photo_mime text,
  add column if not exists photo_size integer,
  add column if not exists photo_rights_confirmed boolean not null default false,
  add column if not exists photo_rights_version text,
  add column if not exists public_display_name text,
  add column if not exists public_caption text,
  add column if not exists public_alt_text text,
  add column if not exists gallery_group text not null default 'festival-favourites',
  add column if not exists gallery_status text not null default 'pending',
  add column if not exists moderation_note text,
  add column if not exists moderated_at timestamptz,
  add column if not exists moderated_by text;

create index if not exists contest_entries_gallery_idx
  on public.contest_entries(contest_id, gallery_status, created_at desc);
