Sueños website build

This revision rebuilds the hero as a full-width, bright Mexican beach composition inspired by early-2000s beach advertising.

Key points:
- Full-width bright beach background
- Exact uploaded Sueños bottle image preserved at its natural proportions
- Image-based headline, banner and button assets
- Responsive desktop and mobile hero layouts
- CRM-connected locator iframe uses https://suenos-locator.netlify.app with geolocation enabled

Open index.html or use the included Mac/Windows launcher.

Hero beach photography source:
- Simon Spring, Unsplash photo BJ-FvNGCfEY, used under the Unsplash License.


Updated: integrated the improved art-directed desktop hero artwork into the actual site build.


Updated: cocktail cards now link to complete English and Spanish recipe pages for the Sueños Margarita, Paloma del Sueño and Tequila Old Fashioned.


Updated the How It’s Made section with a full-width Sueños-style illustrated process poster in English and Spanish, plus dedicated mobile artwork.

Refined the process summary section and replaced the repeated How It's Made step images with six distinct, on-brand visuals.

Removed the process poster image band from How It's Made and updated the English cocktails page to list all available cocktails.

Recipe printing now uses a white page with black text, simplified metadata, and print-friendly spacing.

Removed the redundant external locator search row and added a styled branded header above the embedded live map on home and locator pages.


## Google Analytics 4
Google Analytics 4 uses advanced Google Consent Mode v2 on every content page with measurement ID `G-WX9XT6TEYG`. The base Google tag always loads. First-time visitors begin with denied storage and can still generate consent-aware cookieless measurement; returning visitors begin with their saved consent state before GA4 configuration runs. Meta Pixel loads only after advertising consent. Custom events include age gate confirmations, recipe views, print recipe clicks, find-a-bottle clicks, language changes, contact form submissions, newsletter signups, trade leads, outbound clicks and retailer locator views. Interactions inside the embedded locator iframe require separate analytics inside the locator application.

Mailchimp integration: The Sueños Society signup uses the existing Mailchimp audience action (u=54180635caa88c03ba452c3bc, id=db7e420555, f_id=00f530e3f0) with bilingual branded signup UI.


## Contact form server function
The bilingual contact form now submits to `/api/contact`, a Netlify Function that delivers enquiries to `sales@suenos.ca` through Resend. See `CONTACT-FORM-SETUP.md` for the required environment variables and deployment test.


## Contact form origin handling
The Netlify function accepts same-origin submissions automatically and recognizes both `https://suenos.ca` and `https://www.suenos.ca`. Optional extra origins can be supplied with the comma-separated `CONTACT_ALLOWED_ORIGINS` environment variable.
## Legacy redirects

`/find-suenos` permanently redirects to `/en-ca/find-a-bottle/`. The redirect is configured in `netlify.toml`, `_redirects`, and a static fallback page.



## Don Terry Hotline Admin

The shared admin uses Netlify Functions and Netlify Blobs. See `NETLIFY-HOTLINE-SETUP.md` before deploying.

## Cocktail recipe administration

The authenticated `/admin/` page also manages the bilingual cocktail recipe collection. Recipe records and uploaded cocktail images are stored in Netlify Blobs and use the existing `HOTLINE_ADMIN_PASSWORD` and `HOTLINE_ADMIN_SECRET` credentials. No additional environment variables are required.

Existing static recipe URLs remain in place. New recipe slugs are served through non-forced Netlify rewrites, so physical pages continue to take priority. Public cocktail pages fetch live recipe content from `/api/cocktail-recipes`, and published recipes are included in `/cocktail-sitemap.xml`.

See `COCKTAIL-ADMIN-NOTE.md` for the editor workflow and reset behaviour.

## Contact-form spam protection

The English and Spanish contact forms use a honeypot, completion-time signal, weighted solicitation filter, Cloudflare Turnstile server verification and Netlify per-IP rate limiting. Before deployment, set `TURNSTILE_SECRET_KEY` in Netlify using the private secret for the existing Sueños Turnstile widget. See `CONTACT-FORM-SETUP.md` for the complete setup and test procedure.

## Sunfest Overlay

`/admin/` includes a Sunfest Overlay tab with manual on/off, scheduled activation, bilingual messaging and private preview. See `SUNFEST-OVERLAY-NOTE.md`.

### Sunfest overlay activation fix
The overlay activation menu is now the single source of truth. Preview works across tabs without relying on browser session-storage cloning.

## Campaign Overlays

The admin now manages multiple reusable campaign overlays rather than a single Sunfest-only overlay. Campaigns support uploaded desktop/mobile hero artwork, partner logos, scheduling, priority, bilingual copy, theme colours and private preview. See `CAMPAIGN-OVERLAYS-NOTE.md` for artwork specifications.

## Regional campaign targeting

The Campaign Overlays admin now includes a reusable Named Markets library and campaign targeting by everyone, multiple named markets, or custom country/province/city/postal-prefix lists. Regional selection uses Netlify request geolocation. See `REGIONAL-CAMPAIGN-TARGETING-NOTE.md`.
