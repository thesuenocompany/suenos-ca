# Campaign Overlays

The `/admin/` area now includes a reusable Campaign Overlays manager.

## Artwork specifications

### Desktop hero
- 2400 × 1350 pixels
- 16:9 aspect ratio
- JPG, PNG or WebP
- RGB / sRGB colour profile
- Maximum 12 MB
- Keep important text and logos at least 120 px from every edge
- Do not include website buttons in the artwork

### Mobile hero
- 1080 × 1920 pixels
- 9:16 aspect ratio
- JPG, PNG or WebP
- RGB / sRGB colour profile
- Maximum 12 MB
- Keep important text and logos at least 90 px from every edge
- Leave the bottom 260 px relatively quiet because the website places CTA buttons below the artwork

### Partner logo
- PNG or WebP with transparent background preferred
- Approximately 1200 px wide
- Maximum 12 MB
- Avoid large empty transparent margins

## Campaign behaviour

- Off: saved but not public
- On now: public immediately
- Scheduled: public only between the saved start and end times
- Priority: the highest-priority active campaign is displayed if schedules overlap
- Preview: available to authenticated administrators even when the campaign is off

Uploaded artwork is stored in Netlify Blobs. No source-code deployment is required to add or update future campaign artwork after this system is installed.
