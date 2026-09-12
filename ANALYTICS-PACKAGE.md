# Sueños website analytics

Implementation: 12 September 2026. Existing website admin > Analytics, or `/admin/#analytics`.

## Reports

Overview, current/previous calendar periods, daily trend, traffic channels, sources/mediums, campaign/creative attribution, page performance, session entry pages, countries/regions/cities, devices/browsers/languages, returning sessions, active time, actions and ordered session funnels. Individual tables and the complete report export as CSV. Campaign links generates UTM URLs and QR SVGs with the existing QR library.

## Measurement

- Existing Netlify Blobs `analytics-diagnostics` history remains readable. No migration or replacement of Supabase/CRM infrastructure.
- `/api/analytics-diagnostics` collects bounded, validated event batches. Existing single-page payloads remain accepted. `/api/analytics-report` returns reports only after the existing signed admin token is validated.
- Production stores persist across deployments. Other contexts use deploy-scoped stores to isolate test records.
- New records exclude form answers, raw IP addresses, raw click IDs and URL query strings. Location comes from Netlify, never from form fields. Event names and metadata are allowlisted. Known bots and admin routes are excluded; collection is rate-limited.
- Existing anonymous page-load diagnostics continue. Random visitor and session identifiers and interaction collection begin only after analytics consent. Withdrawal clears identifiers and unsent identified events. Existing GA4 and Meta consent behaviour is preserved.
- Sessions expire after 30 minutes of inactivity; browser IDs expire after 365 days. IDs describe browsers, not identified people.
- Session attribution uses the first observed source/medium/campaign/content until session expiry. Untagged social is explicitly unclassified. No inference of paid spend from Facebook referrers.
- Engagement: 10+ active seconds, 2+ page views, or a key action. Action rate: distinct sessions with at least one key action / observed consented sessions. Key actions: Find a Bottle click, accepted contact/trade/houseboat inquiry, Where Next request, accepted contest entry.
- New event, session and visitor history starts at deployment. Old diagnostics contribute only the fields actually present. Differences versus GA4 are expected.
- Society signup is an attempt because the cross-origin Mailchimp form does not report confirmed subscription status. Locator-internal searches/directions, retail sales, ad spend and Search Console data are not connected.
- Reports cover up to 90 days plus an equal previous period, with a selectable Canadian time zone. Today is partial. Tables show up to 100 groups; recent activity shows 50 records. Requests read at most 6,000 stored batches with an explicit partial-coverage warning. Reports do not fabricate missing metrics.
- Data remains in the existing private server-side store. This change does not delete historical records or alter the existing retention policy.

## Verification

Validated aggregation, deduplication, session denominators, period comparisons, Pacific midnight boundaries, filters, empty data, privacy sanitisation, auth/input gates, tracker consent activation/withdrawal, UI navigation/error states, UTM link validation and JavaScript syntax. All 51 public pages with the shared app load exactly one tracker before app.js. Local Netlify browser preview encountered an environment DNS restriction while loading the existing Edge Function runtime; it was not disabled or removed to run tests.

No account credentials, test data or test authentication changes are included in the production source.
