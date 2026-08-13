# Retail Receipt Bonus Entries

Added August 7, 2026.

## Admin controls
Retail contests now support:
- Receipt bonus entries on/off per retail contest
- Bonus entries per detected Sueños item
- Maximum bonus entries per receipt
- Public upload instructions
- AI auto-approve confidence threshold
- Equivalent no-purchase bonus-entry method

## Public flow
An entrant completes the normal no-purchase entry form. If receipt bonuses are enabled, they may optionally upload a full JPG, PNG or WebP receipt. The base contest entry is saved independently from receipt approval.

## Receipt review
The receipt image is normalized and stored privately. The system hashes the normalized image and, when AI credentials are configured, extracts the receipt/invoice number, retailer, date, total, Sueños quantity, matched lines and confidence.

High-confidence complete receipts with eligible Sueños items are auto-approved. Lower-confidence receipts are held for manual review. Receipts with no detected Sueños purchase, a confidently incomplete receipt image, or a clearly out-of-period date are rejected.

## Duplicate safeguards
Duplicate prevention operates across the master retail campaign so the same receipt cannot be used at multiple retailer sub-pages. It checks:
- Exact normalized-image SHA-256 hash
- AI-extracted receipt/invoice fingerprint including receipt number and receipt metadata
- Database unique indexes to prevent concurrent duplicate approvals

Duplicate attempts remain base entries but receive no receipt bonus entries.

## Admin review
Contest Entries includes receipt status, detected Sueños quantity, approved/pending bonus entries, receipt number, secure receipt viewer, Approve and Reject controls.

## Winner draws
Winner selection is weighted. Every valid entrant has one base ticket plus each approved bonus entry. Once an entrant is selected, all of that entrant's tickets are removed before another winner is drawn.

## AI configuration
Set `CONTEST_RECEIPT_OPENAI_API_KEY` in Netlify to enable automatic AI receipt reading. `OPENAI_API_KEY` is used as a fallback. If neither is configured, uploads are preserved and sent to manual review instead of failing.

Optional model override: `CONTEST_RECEIPT_OPENAI_MODEL`. The build defaults to `gpt-4.1-mini`.

## Rules
When receipt bonuses are enabled, generated Official Rules no longer claim that purchase can never affect odds. Instead, they explain receipt-based bonus entries and require an equivalent no-purchase bonus-entry method. The abbreviated rules also surface this condition.
