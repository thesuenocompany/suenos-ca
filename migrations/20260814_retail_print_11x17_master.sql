-- Adds a second master-controlled retail contest poster format.
-- Retailer child pages resolve these fields from their retail master at runtime.

alter table public.contests
  add column if not exists retail_print_11x17_poster_url text,
  add column if not exists retail_print_11x17_poster_name text,
  add column if not exists retail_print_11x17_qr_box jsonb,
  add column if not exists retail_print_11x17_updated_at timestamptz;

comment on column public.contests.retail_print_11x17_poster_url is
  'Master retail contest 11 x 17 JPG poster used to generate retailer-specific print PDFs.';
comment on column public.contests.retail_print_11x17_poster_name is
  'Original display name of the master retail contest 11 x 17 poster JPG.';
comment on column public.contests.retail_print_11x17_qr_box is
  'Normalized top-left QR placement rectangle for the 11 x 17 poster: x, y, width and height between 0 and 1.';
