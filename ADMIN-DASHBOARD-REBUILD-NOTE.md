# Sueños Website Admin Dashboard Rebuild

Updated 2026-08-07.

This build replaces the original Hotline-centric admin shell with a website operations dashboard while preserving the existing tool IDs, APIs, contest logic, campaign overlays, cocktail editor, Hotline editor and analytics tools.

## Navigation

- Dashboard
- Promotions: Contests, Campaigns & Overlays
- Website content: Cocktails, Don Terry Hotline
- Reporting: Analytics
- Archive: Contest Archive

Navigation is controlled by `assets/js/admin-dashboard-20260807.js`, loaded after the existing admin modules. It uses shell-level event delegation so one tool cannot disable navigation for the rest of Admin.

## Contest behaviour

Opening Contests from the main Admin navigation returns to the campaign list. Managing a contest then opens the dedicated contest workspace. Retail masters and retailer pages retain the context labels from the Contest Workspace V2 build.

## Files added

- `assets/css/admin-dashboard-20260807.css`
- `assets/js/admin-dashboard-20260807.js`
- `ADMIN-DASHBOARD-REBUILD-NOTE.md`

No database migration is required for this Admin-shell update.
