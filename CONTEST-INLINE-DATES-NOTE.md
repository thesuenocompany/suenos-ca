# Contest card inline date editing

- Contest cards use a wider three-zone layout: page, schedule, entries.
- Start and end date/time are editable directly on every active contest card.
- Save Dates updates only `start_at` and `close_at` for that contest.
- Existing draw-date validation is preserved. If the new closing date would move past the draw date, Admin asks the user to update the draw date in Manage first.
- Archived contests show dates read-only.
- Updated timestamp is demoted to a small footer line to avoid card overlap.
