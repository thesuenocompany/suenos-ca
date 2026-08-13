# Sunfest photo submission reliability fix

This package changes the photo contest submission sequence:

1. The selected image uploads immediately in the background.
2. Turnstile runs only after the visitor presses Submit Entry.
3. The fresh token is sent to the server immediately after verification.
4. The widget resets after every failed server response because Turnstile tokens are single-use.
5. Server-side field validation runs before Turnstile verification so invalid fields do not consume the token.
6. Turnstile errors now return a non-sensitive diagnostic code.

Admin moderation remains under Admin > Contests > Entries > Gallery > Moderate.
