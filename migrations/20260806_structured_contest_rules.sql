alter table public.contests
  add column if not exists rules_template_enabled boolean not null default true,
  add column if not exists rules_config jsonb not null default '{}'::jsonb;

comment on column public.contests.rules_template_enabled is 'Uses the locked Sueños generic contest-rules template when true.';
comment on column public.contests.rules_config is 'Structured variable selections used to generate the official rules.';
