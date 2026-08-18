# Sueños Houseboat landing page

Added `/houseboat/` without adding it to public navigation.

## Public page
- Sueños-native hero, experience, sleeping, amenities, audiences, editable pricing, cost-per-person calculator, availability calendar, inquiry form, four-step booking explanation and FAQ.
- CruiseCraft 3 photography has been stored locally and is served from the Sueños site.
- Availability is managed from the Sueños Admin Houseboat calendar.
- Current 2026 base rental rates are editable in Admin.

## Admin
A new Houseboat section manages page content, hero/mobile/OG/gallery assets, rates and their display status, sleeping/amenities/costs/FAQ, availability, SEO and houseboat inquiries.

## Lead storage
`houseboat_inquiries` stores trip details, UTM/source, status, notes and an estimated base charter value. The inquiry endpoint emails the configured destination when RESEND_API_KEY is available.

## Database
Migration `20260811_houseboat_landing.sql` creates `houseboat_content` and `houseboat_inquiries`. It was applied to Supabase project dowfjjthshbbgnvwxzjv during build.

## Image assets still required
Replace or reorder Sueños Houseboat photography in Admin whenever new photos are available.
