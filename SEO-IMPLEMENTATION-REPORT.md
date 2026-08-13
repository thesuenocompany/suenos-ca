# Sueños Tequila SEO & AI Discoverability Implementation Report

Last reviewed: 2026-07-21

## Executive summary
The static bilingual site has been upgraded so its important brand, product, founder, recipe and retailer-locator information is present in crawlable HTML. The implementation preserves the established visual direction while adding the technical signals needed by conventional search engines and AI-assisted discovery tools.

## Baseline score
**Before implementation: 42/100.** The site had crawlable static HTML and useful recipe content, but lacked canonicals, hreflang, structured data, sitemaps, robots rules, complete metadata and visible homepage entity definition.

## Post-implementation score
**After implementation: 82/100.** Core technical and entity foundations are now present. The score is not higher because distillery/NOM documentation, static retailer records, Search Console/Bing verification, field Core Web Vitals and third-party authority signals require external access or additional verified source material.

## P0 and P1 changes completed
- Added descriptive titles and meta descriptions to every public English and Spanish page.
- Added self-referencing canonical tags and reciprocal `hreflang` links with `x-default`.
- Added Open Graph and social-sharing metadata.
- Added valid JSON-LD graphs for Organization, Brand, founder, WebSite, WebPage, BreadcrumbList, Product and individual Recipe pages.
- Added a visible, answer-first homepage entity section in both languages.
- Added a centralized verified facts file at `data/brand-facts.json`.
- Added `robots.txt`, `sitemap.xml` and `image-sitemap.xml`.
- Explicitly allowed OAI-SearchBot, ChatGPT-User, PerplexityBot and Perplexity-User. No GPTBot-specific preference was added.
- Added FAQ and responsible-enjoyment pages in both languages.
- Strengthened product, founder, production and where-to-buy content without inventing distillery, NOM, additive, award, pricing or availability claims.
- Added recipe authorship, serving quantity, responsible-enjoyment language and Recipe schema.
- Added image dimensions, loading hints, decoding hints and high-priority loading for hero images.
- Converted six large text graphics to WebP: story-heading-panel.webp, cocktails-heading-panel.webp, hero-kicker.webp, story-heading-panel-es.webp, cocktails-heading-panel-es.webp, hero-kicker-es.webp.
- Replaced the non-functional demo contact form with an email-builder form that opens a message addressed to `sales@suenos.ca`.
- Added FAQ and responsible-enjoyment links throughout the footer.

## Current automated test results
```json
{
  "pages": 36,
  "missing_title": 0,
  "missing_description": 0,
  "missing_canonical": 0,
  "missing_hreflang": 0,
  "h1_issues": 0,
  "missing_jsonld": 0,
  "missing_img_dimensions": 0,
  "missing_img_alt": 0,
  "broken_internal_links": []
}
```

## Verified source-of-truth facts used
- Primary entity: Sueños Tequila.
- Alternate spelling: Suenos Tequila.
- Founder: Gord Erickson.
- Canadian-owned and rooted in British Columbia.
- Current expression: Sueños Blanco.
- Made in Jalisco, México.
- 100% Blue Weber agave.
- 40% ABV, 750 mL.

## Facts deliberately not published
The codebase did not verify the distillery, NOM, exact equipment, aging details, additive-free status, awards, pricing or province-wide inventory. These remain blank in the source-of-truth file rather than being guessed.

## Page-intent map
- Homepage: Sueños Tequila, Canadian-owned tequila, brand definition.
- Our Tequila: Sueños Blanco, 100% Blue Weber agave, Jalisco origin.
- Our Story: Sueños founder Gord Erickson, Canadian and British Columbia roots.
- How It’s Made: visible tequila-production overview tied to Sueños Blanco.
- Cocktails hub: tequila cocktail recipes using Sueños Blanco.
- Recipe pages: one specific cocktail intent per page.
- Where to Buy: retailer-locator searches and inventory guidance.
- FAQ: concise factual brand answers for customers, journalists and answer engines.
- Responsible Enjoyment: legal-age and safe-enjoyment information.
- Contact: sales and general inquiries.

## Remaining P1 work
1. Verify and publish the distillery, NOM, production documentation and any supportable aging or additive claims.
2. Export current retailer data from the CRM into crawlable, regularly reviewed location records. The iframe itself does not provide indexable retailer copy on the main domain.
3. Connect and verify Google Search Console and Bing Webmaster Tools, then submit the sitemap.
4. Run live Lighthouse and field Core Web Vitals testing after deployment. Local static-file testing cannot reproduce CDN, server, device and network conditions.
5. Add a privacy/cookie implementation after legal review of GA4, Meta Pixel and Mailchimp consent requirements.
6. Develop original educational pages only when they can include expert-reviewed information, interviews, production documentation or other Sueños-specific value.

## Suggested 12-month content roadmap
1. Verified Sueños Blanco production dossier and distillery interview.
2. Gord Erickson founder profile with original interview and photography.
3. Blanco vs. reposado guide reviewed by a tequila production expert.
4. How to taste tequila with a bartender or production-partner reviewer.
5. British Columbia retailer guide generated from current CRM data.
6. Alberta availability page only after current inventory is verified.
7. Seasonal Sueños cocktail collections with original recipes and photography.
8. Bartender and restaurant collaboration profiles.
9. Event recaps with original images, participating partners and useful visitor information.
10. Tequila FAQ expansion based on Search Console and retailer questions.

## Deployment checklist
- Upload the contents of the `suenos-site-more-cocktails` folder to the web root.
- Confirm the canonical production hostname is `https://www.suenos.ca`.
- Configure a permanent server-side redirect from the root URL to `/en-ca/` if the host supports it; the package retains the existing fallback redirect page.
- Confirm `/robots.txt`, `/sitemap.xml` and `/image-sitemap.xml` return HTTP 200.
- Submit `/sitemap.xml` to Google Search Console and Bing Webmaster Tools.
- Test one English and one Spanish page in a schema validator.
- Test GA4 Realtime, Meta Test Events, Mailchimp signup and contact email-builder.
- Confirm the age gate does not remove or defer the underlying page HTML.
- Run a live broken-link crawl and Lighthouse test after deployment.
