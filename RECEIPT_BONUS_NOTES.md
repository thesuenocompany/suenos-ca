# Receipt bonus entry feature

This build adds a receipt-based bonus entry flow for retail contests.

## What it does
- Optional receipt upload on retail contest pages.
- Admin controls to enable/disable receipt bonus entries and set:
  - bonus entries per Sueños item
  - max bonus entries per receipt
  - public instruction text
- Uploads and normalizes receipt images through `/api/contest-entry-receipt`.
- Uses AI receipt review in `/api/contests` when `OPENAI_API_KEY` or `CONTEST_RECEIPT_OPENAI_API_KEY` is present.
- Detects duplicate receipts using both image hash and a receipt fingerprint.
- Auto-approves high-confidence receipts; lower-confidence receipts stay pending.
- Adds admin approval / rejection controls in the Entries table.
- Uses `bonus_entries_awarded` in the winner draw weighting.

## Environment variables
Required for DB and existing contest functionality:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `HOTLINE_ADMIN_SECRET`
- `TURNSTILE_SECRET_KEY` (or the alternate contest/contact turnstile envs already used)

Optional but recommended for AI receipt review:
- `OPENAI_API_KEY` or `CONTEST_RECEIPT_OPENAI_API_KEY`
- `CONTEST_RECEIPT_OPENAI_MODEL` (defaults to `gpt-4.1-mini`)

## Database
Run the migration:
- `migrations/20260807_contest_receipt_bonus.sql`

## Notes
- This build currently accepts JPG, PNG, and WebP receipt uploads.
- If AI is not configured or returns low confidence, receipts remain pending for manual review.
