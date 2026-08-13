# Contest social-sharing metadata

Contest detail pages are populated in the browser, but social crawlers generally do not execute that JavaScript. The Netlify Edge Function at `netlify/edge-functions/contest-social-meta.ts` now reads the published contest record and injects contest-specific Open Graph and Twitter metadata into the initial HTML response.

The social image uses the saved desktop hero image, falling back to the mobile hero and then the standard Sueños hero. Image URLs are converted to absolute HTTPS URLs.

After deployment, previously cached shares may need to be refreshed using the relevant platform's sharing debugger or by sharing a URL with a temporary query parameter.
