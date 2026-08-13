alter table public.contest_entries
  add column if not exists birth_date date;

comment on column public.contest_entries.birth_date is
  'Entrant date of birth used to verify minimum-age eligibility and, when separately consented, populate the Sueños Society mailing-list signup.';
