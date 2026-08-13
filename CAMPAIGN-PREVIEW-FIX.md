# Campaign overlay preview fix

Preview now uses the exact overlay draft selected in Admin, including unsaved edits and overlays whose mode is Off.

The old preview behavior could fall back to the first saved overlay when the requested campaign ID was not found. This caused the disabled Sunfest overlay to appear while previewing a new campaign. That fallback has been removed.

Preview drafts are stored locally for up to 30 minutes and are available only in the same browser. Public visitors are unaffected.
