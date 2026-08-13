# Sueños Contest System

Adds private, reusable contest pages and a complete admin workflow. Contest URLs are intentionally omitted from the primary navigation and sitemap.

## Required deployment work
1. Apply `migrations/20260728_contest_system.sql` to the existing Supabase project.
2. Add `SUPABASE_SERVICE_ROLE_KEY` to Netlify as a secret scoped to Functions/runtime.
3. Confirm `TURNSTILE_SECRET_KEY`, `HOTLINE_ADMIN_PASSWORD` and `HOTLINE_ADMIN_SECRET` remain configured.
4. Deploy the complete package.

## Routes
- `/en-ca/contests/` private index, `noindex,nofollow`
- `/en-ca/contests/[slug]/` contest page, `noindex,nofollow`
- `/admin/` Contests tab

## Artwork specs
- Desktop hero: 2400 × 1350 px, JPG/PNG/WebP, maximum 12 MB.
- Mobile hero: 1080 × 1920 px, JPG/PNG/WebP, maximum 12 MB.
- Keep critical text and faces inside the central 80%; focal point is adjustable in admin.
- Do not place functional buttons in the artwork.

## Security
Entries and winner records are only accessed through authenticated server functions using the existing admin token. The public endpoint validates dates, confirmations, Turnstile, a honeypot and duplicate email constraints. Winner selection uses Node `crypto.randomInt`. Full IP addresses are not stored.
