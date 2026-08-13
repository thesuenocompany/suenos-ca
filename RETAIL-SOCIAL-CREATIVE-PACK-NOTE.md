# Retail social creative pack

Added 2026-08-08.

Retail master campaigns can upload up to four finished social media graphics. For each image, Admin can draw a normalized retailer-brand placement rectangle directly on the artwork preview. Retailer sub-contests inherit the master artwork and placement definitions.

When a retailer-specific social file is generated:
- if the retailer has an uploaded logo, the exact uploaded logo asset is fitted proportionally inside the placement rectangle without cropping, recolouring, redrawing or distortion;
- if the retailer has no logo, the retailer name is rendered in ALL CAPS in a bold sans-serif font, automatically choosing black or white based on the local artwork brightness and adding a subtle contrasting edge for readability;
- the source creative is otherwise unchanged.

Retailer pages provide individual PNG downloads for each configured creative and a single ZIP containing all configured files.

The database column `contests.retail_social_creatives` stores the master definitions. Retailer children do not copy the artwork definitions and resolve them from their master campaign.
