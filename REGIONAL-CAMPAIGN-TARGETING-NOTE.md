# Regional Campaign Targeting

Campaign Overlays can target visitors by reusable named market or by custom location rules.

## Named markets

A named market is a reusable geographic group. It can contain multiple countries, provinces, cities and postal-code prefixes. Examples include Cowichan Valley, Vancouver Island, Sea to Sky, Calgary and Edmonton.

Values may be entered as comma-separated lists or one item per line. Location categories use OR matching: a visitor qualifies when any configured country, province, city or postal prefix matches.

## Campaign targeting modes

- Everyone: the campaign is eligible for every visitor.
- Named markets: select one or more saved markets. A match in any selected market qualifies.
- Custom locations: enter multiple countries, provinces, cities and postal-code prefixes directly on that campaign.

When several eligible campaigns are active, the campaign with the highest priority appears.

## Geolocation

The campaign endpoint uses Netlify request geolocation. No browser location prompt or third-party geolocation API is used. Province-level targeting is generally more dependable than exact city targeting. VPNs, mobile carriers and corporate networks can occasionally report a nearby or incorrect city.

## Postal-code prefixes

Spaces and punctuation are ignored. Prefixes may be broad Canadian FSAs such as `V0R` or longer prefixes where useful.
