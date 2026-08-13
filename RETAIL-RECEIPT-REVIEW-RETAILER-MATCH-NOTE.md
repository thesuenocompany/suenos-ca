# Retail receipt verification update

- Receipt bonus claims require a retailer match to the retailer-specific contest page.
- High-confidence wrong-retailer receipts are rejected automatically with a plain-English reason.
- Uncertain retailer matches remain pending for manual review.
- Existing entrants may submit additional unique receipts using the same email. The original base entry is reused rather than creating another free/base entry.
- Duplicate receipt image/fingerprint checks remain campaign-wide.
- Admin shows a flashing red receipt-review alert when pending claims exist, with View, Approve and Reject actions.
- Entrant confirmation explains approved, rejected, duplicate or pending status.
- Automatic AI review requires CONTEST_RECEIPT_OPENAI_API_KEY or OPENAI_API_KEY in Netlify. Without a key, receipts remain pending for manual review.
