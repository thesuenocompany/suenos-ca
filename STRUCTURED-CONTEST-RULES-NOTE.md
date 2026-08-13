# Structured Contest Rules

This build replaces the default free-form Official Rules editor with the locked Sueños Spirits generic contest-rules template supplied on August 6, 2026.

## Admin variables

The Contest Editor now controls:

- eligibility geography
- primary entry method
- no-purchase entry method
- selected-entrant response deadline
- prize delivery method
- submitted-content clauses
- social-media disclaimer

Contest name, start and close times, draw date, prize description, prize value, winner count, included items and excluded items are taken from the existing contest fields.

The generated rules use the fixed Sponsor information:

Sueños Spirits
973 Lakeshore Drive
Salmon Arm, British Columbia
V1E 1E4
sales@suenos.ca

## Public behaviour

The standard, photo-story and retail contest pages show a Full Rules button. The generated rules open in an accessible modal with close and print controls.

## Data

The additive migration `20260806_structured_contest_rules.sql` adds:

- `rules_template_enabled boolean`
- `rules_config jsonb`

Existing contests and entries are preserved. The rules are regenerated whenever a contest is saved with the template enabled.

The supplied wording has been implemented as provided. Final contest rules should still be reviewed by Canadian legal counsel before publication.
