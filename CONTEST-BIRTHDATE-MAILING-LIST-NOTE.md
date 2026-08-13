# Contest birthdate and Sueños Society integration

- Adds a required date-of-birth field to photo contest entries.
- Validates the configured minimum age on both the page and the server.
- Stores the birthdate in `contest_entries.birth_date`.
- Displays the birthdate in the contest entries table and photo moderation dashboard.
- Includes birthdate in contest CSV exports.
- When the optional marketing-consent box is checked and the contest entry succeeds, the browser submits the same email and birthdate to the existing Sueños Society Mailchimp form using its current list, birthday field and GDPR consent field.
- A contest entry is never dependent on marketing consent or mailing-list signup.
