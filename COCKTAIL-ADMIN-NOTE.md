# Cocktail Recipe Admin

The existing `/admin/` login now manages both Don Terry Hotline content and cocktail recipes.

## What the recipe manager can do

- Edit the English and Spanish versions of every recipe.
- Add a new bilingual recipe.
- Upload a JPG, PNG or WebP cocktail image up to 5 MB.
- Reorder recipes on the cocktail collection pages.
- Hide a recipe without deleting it.
- Remove a recipe from the live recipe collection.
- Export the current recipe data as JSON.
- Reset the recipe collection to the original deployed recipes.

Existing recipe URL slugs are locked in the editor to prevent accidental broken links. New recipes receive matching URLs in both language structures:

- `/en-ca/cocktails/recipe-slug/`
- `/es-mx/cocteles/recipe-slug/`

Recipe content and uploaded images are stored in site-wide Netlify Blobs, so they persist across normal deployments. The same `HOTLINE_ADMIN_PASSWORD` and `HOTLINE_ADMIN_SECRET` environment variables protect both admin sections. No additional environment variables are required.

The dynamic cocktail sitemap is available at `/cocktail-sitemap.xml` and is listed in `robots.txt`. It updates from the live recipe data without requiring another deployment.

## Publishing workflow

1. Open `/admin/` and log in.
2. Select **Cocktail Recipes**.
3. Edit, add, reorder, hide or remove recipes.
4. Apply changes in the recipe editor.
5. Select **Save Recipes Live**.

Changes are served through the recipe API. Public pages retain their deployed HTML as a fallback if the API is temporarily unavailable.

## Removal and image handling

Hidden and removed recipes are omitted from the public recipe feed, collection pages and dynamic cocktail sitemap. An existing physical recipe URL displays an unavailable message and is changed to `noindex,follow` after the live recipe data loads.

Removing a recipe does not automatically delete an uploaded image, because the same image may be reused by another recipe. Uploaded image files can remain in Netlify Blobs without appearing anywhere on the public site.
