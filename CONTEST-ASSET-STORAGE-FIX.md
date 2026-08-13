# Contest asset storage fix

Contest uploads now use the global Netlify Blobs store `contest-assets` with strong consistency.
This prevents uploaded hero images and rule PDFs from disappearing after a new site deploy.

Existing images uploaded into a prior deploy-scoped store must be uploaded once more after this version is deployed.
