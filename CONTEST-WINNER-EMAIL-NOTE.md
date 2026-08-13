# Contest winner email and multi-draw update

- Admin may choose how many potential winners to select in each secure draw.
- Draws cannot exceed the contest's configured winner count or the number of remaining eligible entries.
- Previously selected entrants are excluded from future draws.
- Winner history now shows entrant contact details and email delivery status.
- Admin may compose and send a potential-winner email using the existing Resend configuration.
- Supported merge fields: {{first_name}}, {{contest_name}}, {{prize_name}}.
- Successful email delivery changes winner status to Contacted and records the Resend message ID, subject, message, time and attempt count.
- Failed delivery attempts are also recorded.
- Database migration `20260728_contest_winner_email.sql` has been applied to the Suenos CRM project.
