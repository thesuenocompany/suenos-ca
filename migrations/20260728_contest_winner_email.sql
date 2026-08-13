alter table public.contest_winner_selections
  add column if not exists contact_email_sent_at timestamptz,
  add column if not exists contact_email_subject text,
  add column if not exists contact_email_message text,
  add column if not exists contact_email_resend_id text,
  add column if not exists contact_email_error text,
  add column if not exists contact_attempts integer not null default 0;
