alter table public.contests
  add column if not exists retail_social_creatives jsonb not null default '[]'::jsonb;

comment on column public.contests.retail_social_creatives is
  'Master retail campaign social creative definitions. Up to four uploaded base images, each with a normalized retailer-brand placement rectangle.';
