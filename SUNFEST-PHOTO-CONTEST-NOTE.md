# Sunfest Photo Contest

The existing contest system now supports a `sunfest_scrapbook` layout with moderated photo and equal written-memory entries.

## Admin setup

In `/admin/` open Contests and select:

- Page layout: Sunfest scrapbook/photo album
- Enable photo entries
- Enable equal written-memory entries
- Upload hero and prize images
- Set event location and separate festival dates
- Confirm eligibility, prize ARV, legal sponsor, privacy contact, platform disclaimer and Official Rules before publishing

## Moderation

Open the contest Entries screen. Photo entries remain `pending` until an administrator uses **Moderate** and changes the gallery status to `approved`. Public gallery responses never include email addresses, legal names, storage keys or original filenames.

## Image handling

Photo uploads are validated server-side, rotated according to orientation, resized to a maximum 2400px bounding box, converted to WebP and re-encoded with Sharp. Re-encoding removes original EXIF and location metadata. Raw approved files are served only after the database confirms the entry is approved.
