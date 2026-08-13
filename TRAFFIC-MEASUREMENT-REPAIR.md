# Sueños Traffic Measurement Repair

Status: updated verification build. Not deployed.


## July 27, 2026 verification update

The bootstrap now reads the saved analytics and advertising preferences before issuing the default consent command and before GA4 configuration. This fixes a remaining timing issue for returning visitors: a visitor who had already accepted analytics was previously initialized as denied on every new page, then updated only after the deferred application script ran. That could split or reduce normal cookie-based session measurement.

Current behavior:

- No saved choice: GA4 loads immediately with denied storage and a 500 ms consent-update wait, allowing consent-aware cookieless measurement without setting analytics cookies.
- Analytics accepted previously: the page starts with `analytics_storage: granted` before GA4 configuration, so the existing GA cookie can be read immediately.
- Advertising accepted previously: the Google advertising consent signals start granted, while Meta Pixel remains controlled separately by the application and loads only after its stored permission is read.
- Rejected preferences: denied storage is applied before GA4 configuration and analytics or Meta cookies are removed by the shared consent module.
- Both current and legacy local-storage keys are supported independently, including recovery when one stored value is malformed.

Validation completed for this update:

- Node syntax checks passed for all JavaScript and Netlify Function files.
- Bootstrap command-order tests passed for new visitors, full consent, analytics-only consent, rejection, legacy preference migration, malformed storage and duplicate initialization.
- All public English and Spanish HTML pages still include exactly one consent bootstrap in the document head before the deferred shared application script.
- Static route, local-asset, canonical, hreflang and JSON-LD checks passed.

## Cause

The cookie-consent module loaded and configured GA4 only after analytics consent was granted. Visitors who rejected or ignored the banner never loaded the Google tag, so GA4 received no consent-aware cookieless measurement. Meta Pixel followed a similarly consent-gated load pattern, which is retained for advertising privacy but now has explicit one-time PageView protection.

## New initialization order

1. `assets/js/consent-bootstrap.js` runs in the document head on every English and Spanish content page.
2. It defines `dataLayer`/`gtag`, sets all Consent Mode v2 defaults to denied with `wait_for_update: 500`, queues `js` and a single GA4 `config`, then loads the Google tag.
3. `assets/js/app.js` reads `Suenos-cookie-consent-v1`, with migration support for the previous lowercase key.
4. Stored or newly selected preferences issue consent updates only. GA4 is never configured a second time.
5. Meta Pixel remains unloaded until advertising consent is granted. Its PageView is guarded so it fires once per page.
6. The age gate displays before the consent banner on a first visit. The banner appears after age confirmation.

## Redirect

`_redirects` now starts with `/  /en-ca/  301!`. The root `index.html` meta refresh was removed and replaced with a non-redirect fallback link and canonical reference to `/en-ca/`.

## Tests completed

- JavaScript syntax checks passed for `consent-bootstrap.js`, `app.js`, and `trade.js`.
- 39/39 Chromium browser-harness checks passed for denied defaults, stored choices, legacy-key migration, age-gate ordering, English/Spanish interfaces, analytics-only, advertising-only, reject-all, Accept All, and duplicate GA/Meta page-view prevention.
- All 45 English and Spanish content pages contain exactly one bootstrap include in the head, before the deferred shared application script.
- Sitemap, image sitemap, robots.txt, canonical URLs, hreflang links, robots metadata, and one-H1 page structure remain unchanged.
- `_redirects` contains one non-looping forced 301 rule for `/` and `netlify.toml` contains no conflicting root rule.

The build environment cannot resolve Google or Meta domains, so live beacon delivery, GA DebugView, Tag Assistant, cookie creation by the downloaded Google library, and the deployed HTTP 301 response require a Netlify preview verification.

## Deployment verification

1. Deploy this package to a Netlify preview, not production.
2. In a fresh private window, use Tag Assistant to confirm the default consent command precedes GA4 configuration and the Google tag loads before a choice is made.
3. Reject non-essential cookies and confirm no `_ga`, `_gid`, `_gat`, `_fbp`, or `_fbc` cookies are created.
4. Confirm consent-aware GA requests continue under denied storage, then grant analytics and confirm storage changes to granted without a second page_view.
5. Grant advertising and confirm one Meta PageView. Reopen and resave preferences and confirm the count remains one.
6. Test existing Contact, Lead, newsletter, age-gate, recipe, locator, language-switch and trade events under the appropriate consent states.
7. Run `curl -I https://<preview-domain>/` and confirm a 301 response with `Location: /en-ca/`.

## Files created or modified

- Modified: `README.md`
- Modified: `_redirects`
- Modified: `assets/js/app.js`
- Created: `assets/js/consent-bootstrap.js`
- Modified: `assets/js/trade.js`
- Modified: `en-ca/cocktails/cantarito/index.html`
- Modified: `en-ca/cocktails/don-terry/index.html`
- Modified: `en-ca/cocktails/el-diablo/index.html`
- Modified: `en-ca/cocktails/index.html`
- Modified: `en-ca/cocktails/jalisco-haze/index.html`
- Modified: `en-ca/cocktails/matador/index.html`
- Modified: `en-ca/cocktails/mexican-mule/index.html`
- Modified: `en-ca/cocktails/paloma-del-sueno/index.html`
- Modified: `en-ca/cocktails/ranch-water/index.html`
- Modified: `en-ca/cocktails/suenos-margarita/index.html`
- Modified: `en-ca/cocktails/tequila-old-fashioned/index.html`
- Modified: `en-ca/cocktails/tequila-sunrise/index.html`
- Modified: `en-ca/contact/index.html`
- Modified: `en-ca/don-terry-hotline/index.html`
- Modified: `en-ca/faq/index.html`
- Modified: `en-ca/find-a-bottle/index.html`
- Modified: `en-ca/how-its-made/index.html`
- Modified: `en-ca/index.html`
- Modified: `en-ca/our-story/index.html`
- Modified: `en-ca/our-tequila/index.html`
- Modified: `en-ca/privacy-policy/index.html`
- Modified: `en-ca/responsible-enjoyment/index.html`
- Modified: `en-ca/trade/index.html`
- Modified: `es-mx/cocteles/cantarito/index.html`
- Modified: `es-mx/cocteles/don-terry/index.html`
- Modified: `es-mx/cocteles/el-diablo/index.html`
- Modified: `es-mx/cocteles/index.html`
- Modified: `es-mx/cocteles/jalisco-haze/index.html`
- Modified: `es-mx/cocteles/matador/index.html`
- Modified: `es-mx/cocteles/mexican-mule/index.html`
- Modified: `es-mx/cocteles/paloma-del-sueno/index.html`
- Modified: `es-mx/cocteles/ranch-water/index.html`
- Modified: `es-mx/cocteles/suenos-margarita/index.html`
- Modified: `es-mx/cocteles/tequila-old-fashioned/index.html`
- Modified: `es-mx/cocteles/tequila-sunrise/index.html`
- Modified: `es-mx/como-se-hace/index.html`
- Modified: `es-mx/consumo-responsable/index.html`
- Modified: `es-mx/contacto/index.html`
- Modified: `es-mx/encuentra-una-botella/index.html`
- Modified: `es-mx/index.html`
- Modified: `es-mx/linea-don-terry/index.html`
- Modified: `es-mx/nuestra-historia/index.html`
- Modified: `es-mx/nuestro-tequila/index.html`
- Modified: `es-mx/politica-de-privacidad/index.html`
- Modified: `es-mx/preguntas-frecuentes/index.html`
- Modified: `index.html`
