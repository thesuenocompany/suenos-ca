-- Retail contest print-PDF designer.
-- Stores the source PDF and a normalized QR placement rectangle.

alter table public.contests
  add column if not exists retail_print_pdf_url text,
  add column if not exists retail_print_pdf_name text,
  add column if not exists retail_print_page integer not null default 1,
  add column if not exists retail_print_qr_box jsonb,
  add column if not exists retail_print_updated_at timestamptz;

comment on column public.contests.retail_print_pdf_url is
  'Uploaded or static print-ready PDF template used for retailer QR poster generation.';
comment on column public.contests.retail_print_pdf_name is
  'Original display name for the retail print PDF template.';
comment on column public.contests.retail_print_page is
  'One-based page number receiving the generated retailer QR code.';
comment on column public.contests.retail_print_qr_box is
  'Normalized top-left QR placement rectangle: x, y, width and height between 0 and 1.';
