# Traffic Diagnostics

The admin now includes a Traffic Diagnostics tab. It records first-party page landings through `/api/analytics-diagnostics` and stores privacy-conscious event records in Netlify Blobs.

Tracked fields include page path, UTM source/medium/campaign/content, presence of `fbclid`, referring host, analytics-consent state, whether GA4 was initialized and queued, active campaign overlay ID, device class, language, and coarse Netlify location. It does not store raw IP addresses, names, email addresses or full postal codes.

GA4 now uses an explicit `page_view` event immediately after configuration with `send_page_view:false`, avoiding duplicate automatic and manual page views. Meta-tagged visits also queue a `meta_ad_landing` event in GA4.

The first-party total measures pages that actually loaded enough JavaScript to contact the site endpoint. It will normally be lower than Meta Link Clicks and should be compared primarily with Meta Landing Page Views.
