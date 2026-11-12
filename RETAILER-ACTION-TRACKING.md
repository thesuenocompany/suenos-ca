# Retailer-action tracking

The owned `/locator/` embedded by `/en-ca/find-a-bottle/` now emits `retailer_action` to the parent site's existing GA4 tag `G-WX9XT6TEYG`, only after explicit analytics consent.

- `action`: `website`, `call`, or `directions`.
- `retailer_id`: existing public locator account ID.
- `venue_type`: `retail` or `hospitality`; bar/restaurant interactions are not bottle-retailer sales.
- `locator_path`: `/locator/`.
- No names, phone numbers, full destination URLs, user coordinates, search terms or form fields are included.
- No event fires at load, popup selection or filtering. Same action/account clicks within one second are deduplicated; later intentional clicks remain interactions.
- The parent tag preserves its page/session attribution and consent settings. Standalone `/locator/`, cross-origin embeds, and the historical external Netlify locator do not emit this event.
- Existing first-party map analytics are unchanged. This change does not designate any GA4 key event, install Ads conversion tracking or infer purchases.

## Verification
`node --test tests/locator/*.test.mjs` tests payload limits, consent denial/revocation, origin and tag guards, deduplication and all three actions. `npm run build` validates the explicit public manifest and output. Full suites currently have one pre-existing output-parity test mismatch: the calculator build appends robots exclusions after investor baseline verification. Do not change investor or calculator behaviour as part of this task.

Before bidding to conversions, verify reception in GA4 and use a retailer action conversion that filters `venue_type=retail`; report actions as intent, not confirmed purchases.
