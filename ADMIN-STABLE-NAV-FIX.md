# Sueños Admin stable navigation fix

Replaced the runtime dashboard DOM rebuild with a static admin shell.

Key changes:
- Sidebar and all admin workspaces are present in HTML from initial page load.
- Admin navigation no longer reparents/moves sections after authentication.
- Dashboard navigation uses a small show/hide router only.
- Hidden workspaces and hidden contest action bars are explicitly non-interactive.
- Dashboard logic no longer creates full-layout structures dynamically.
- Login remains isolated from authenticated admin content.
- Existing contest, retail, QR/poster, receipt bonus, campaign, cocktail, Hotline and analytics tools are retained.
