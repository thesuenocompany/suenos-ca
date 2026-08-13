# Sueños Website Admin redesign

This build consolidates the admin presentation into one shared system while preserving the existing API/database/public-site behaviour.

## Operational areas
- Overview: Dashboard, Analytics
- Content: Cocktails, Don Terry Hotline
- Marketing: Campaigns & Overlays, Contests, Contest Archive

## Key changes
- One shared dark admin design system and responsive shell.
- Quieter grouped navigation and consistent page hierarchy.
- Consistent form, upload, button, status, table and feedback states.
- Contest editor reorganized around Setup, Retailers, Page, Prize, Schedule, Entry options, Rules & confirmation, Review.
- Retailer child pages suppress shared campaign editor tabs and keep retailer-specific controls/materials in the Retailers section.
- Social creative placement canvas explicitly supports click-drag placement and no longer relies on a polling loop.
- Obsolete overlapping contest presentation layers removed from the admin page.
- Existing IDs, APIs, authentication, routes and stored data preserved.

No database migration is included in this UI refactor.
