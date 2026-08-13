# Sueños Retail Contest Division

## What was added

A third contest type, **Retail contest division**, is now available in Sueños Admin.

It uses the existing contest database, secure entry endpoint, winner draw, exports, rules, marketing consent and audit history. Retailer pages are separate contest records connected to one master campaign.

## Recommended workflow

1. Go to **Admin → Contests → New Contest**.
2. Select **Retail contest division**.
3. Leave **This is the master campaign template** checked.
4. Add the campaign name, desktop/mobile hero, prize image, dates, eligible provinces and rules.
5. Save the master campaign as a draft.
6. Enter a retailer name in **Create a retailer page** and click **Create Retailer Page**.
7. Add the retailer logo and display address to the new retailer page.
8. Preview, publish, then download the SVG QR code.

Each retailer page has:

- a unique public URL and tracked QR URL
- its own entry records
- its own winner draw and CSV export
- optional retailer logo and display address
- editable hero, mobile hero, prize and rules
- one-entry-per-email enforcement within that retailer page

## Entry form

Retail entry pages collect:

- first and last name
- email
- phone
- date of birth
- street address and optional unit
- city
- province or territory
- postal code
- Official Rules agreement
- optional Sueños Society marketing consent

When marketing consent is checked, the existing Mailchimp Sueños Society signup receives the email and date of birth after the contest entry succeeds.

## Regional age validation

Retail contests default to **Legal drinking age by province or territory**:

- 18: Alberta, Manitoba and Quebec
- 19: all other Canadian provinces and territories

The browser blocks an ineligible submission and the server independently validates it. The system does not create an entry or store personal details for an underage attempt. Server-detected blocks are counted anonymously by contest and province.

## QR codes

The QR code points to the production retailer page with campaign tracking:

- `utm_source=retailer_qr`
- `utm_medium=offline`
- campaign and retailer identifiers

Admin can preview the code, copy the entry URL, open the page, or download a print-ready SVG.

## Database

Migration applied to Supabase:

- `migrations/20260805_retail_contest_division.sql`

The migration is additive and preserves all existing contest and entry records.
