# Sunfest Overlay

The Sunfest partnership graphics package is controlled from `/admin/` using the existing Sueños admin password.

## Controls

- Off: overlay never appears.
- On now: overlay appears while `Allow the overlay to appear publicly` is checked.
- Use schedule: overlay appears only between the saved start and end times.
- Preview Homepage: opens a private preview while the current admin session is active.
- Reset and Turn Off: restores the supplied default messaging and disables the overlay.

The default schedule is July 25, 2026 at noon through August 3, 2026 at midnight, Vancouver time. The public festival dates shown are July 30–August 2, 2026.

The overlay uses the supplied Sunfest Country Music Festival logo at `assets/images/sunfest-country-music-festival-logo.png`. The Sueños logo and permanent site assets are not modified.

Overlay content is stored in the existing `suenos-content` Netlify Blobs store under the `sunfest-overlay` key. It uses the existing `HOTLINE_ADMIN_PASSWORD` and `HOTLINE_ADMIN_SECRET` environment variables. No new environment variables are required.

## Activation reliability fix — 2026-07-28

- Activation now uses one control: Off, On now, or Use schedule.
- Selecting On now and saving activates the public overlay immediately.
- Preview authentication is passed in a URL fragment and removed after load, avoiding inconsistent sessionStorage copying between tabs.
- Preview displays a visible error if settings cannot be loaded.
