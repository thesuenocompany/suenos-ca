alter table public.contests
  add column if not exists retail_print_poster_url text,
  add column if not exists retail_print_poster_name text,
  add column if not exists retail_print_width_in numeric(8,2) not null default 8.00,
  add column if not exists retail_print_height_in numeric(8,2) not null default 12.00,
  add column if not exists retail_print_qr_box jsonb,
  add column if not exists retail_print_updated_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'contests_retail_print_width_check'
  ) then
    alter table public.contests add constraint contests_retail_print_width_check
      check (retail_print_width_in between 1 and 60);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'contests_retail_print_height_check'
  ) then
    alter table public.contests add constraint contests_retail_print_height_check
      check (retail_print_height_in between 1 and 60);
  end if;
end $$;

comment on column public.contests.retail_print_poster_url is
  'Master retail contest JPG poster used to generate retailer-specific print PDFs.';
comment on column public.contests.retail_print_poster_name is
  'Original display name of the master retail contest poster JPG.';
comment on column public.contests.retail_print_width_in is
  'Physical PDF page width in inches for the generated retailer poster.';
comment on column public.contests.retail_print_height_in is
  'Physical PDF page height in inches for the generated retailer poster.';
comment on column public.contests.retail_print_qr_box is
  'Normalized top-left QR placement rectangle: x, y, width and height between 0 and 1.';
