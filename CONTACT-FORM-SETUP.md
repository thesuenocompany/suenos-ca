# Sueños contact form server function

The English and Spanish contact forms POST to `/api/contact`. The endpoint is a Netlify Function at `netlify/functions/send-contact.mjs` and sends accepted enquiries to `sales@suenos.ca` through Resend.

## Required one-time setup

1. Create or use a Resend account.
2. Add and verify the `suenos.ca` sending domain in Resend.
3. Open the existing Sueños widget in Cloudflare Turnstile. The contact form uses the same public site key already used by the trade form: `0x4AAAAAAD9MP21ca7C8BGsS`. Copy that widget's secret key.
4. In the Netlify site dashboard, add these environment variables with Functions access:

   - `RESEND_API_KEY`: the Resend API key.
   - `CONTACT_FROM_EMAIL`: a verified sender, for example `Sueños Website <website@suenos.ca>`.
   - `CONTACT_TO_EMAIL`: `sales@suenos.ca` (optional because the function defaults to this address).
   - `CONTACT_ALLOWED_ORIGINS`: `https://suenos.ca,https://www.suenos.ca` (optional extra allowlist; both production hostnames are already accepted automatically).
   - `TURNSTILE_SECRET_KEY`: the private secret for the existing Sueños Turnstile widget. `CONTACT_TURNSTILE_SECRET_KEY` may be used instead when you want a contact-form-specific secret.
   - `TURNSTILE_ALLOWED_HOSTNAMES`: optional comma-separated extra hostnames for an approved preview domain. Production already allows `suenos.ca` and `www.suenos.ca`.

5. Deploy the entire website folder to Netlify. Do not upload only the HTML and assets folders because Netlify also needs `netlify.toml` and `netlify/functions/`.
6. Submit a real test message from both language versions. Confirm delivery and test the Reply button in the received email.
7. Submit the sample SEO solicitation in the anti-spam test section below. The browser should show success, but no email should arrive.

Never place the Turnstile secret or Resend API key in HTML, JavaScript, `netlify.toml`, or any file committed to the site package.

## Anti-spam behaviour

- Cloudflare Turnstile runs on both contact pages and is verified server-side on every accepted submission.
- The existing hidden honeypot quietly discards basic form bots.
- A three-second completion-time signal helps identify scripted submissions without blocking a legitimate message by itself.
- A weighted content filter suppresses recurring SEO, rankings, backlinks, lead-generation and web-services solicitations. It uses combinations of phrases rather than blocking a single ordinary word.
- High-confidence spam receives the same visible success response as a real submission, but Resend is never called.
- Netlify rate-limits `/api/contact` to five requests per IP address per hour. Requests over the limit receive HTTP 429.
- Suppressed submissions are logged only with the score and reason labels, not the submitted name, email or message.

## Anti-spam test

This example should be silently discarded after deployment:

```text
Hi,

I checked your website and found a few SEO improvements that can help increase your Google rankings and generate more quality leads.

I can share a quick SEO proposal with pricing and a strategy tailored for your business growth.

Let me know if you're interested.
```

A normal consumer, retailer, restaurant, media or event enquiry should pass after completing Turnstile.

## Normal form behaviour

- The visitor stays on the website.
- The submit button displays a sending state.
- Successful accepted enquiries are emailed to `sales@suenos.ca`.
- Replying to the delivered message addresses the visitor directly.
- Validation runs in both the browser and server function.
- GA4 records `contact_form_submit` after the endpoint returns success and `contact_form_error` after a failed attempt.

## Important

Email delivery and Turnstile verification will not work until their private environment variables are configured in Netlify. The site package contains only the public Turnstile site key.
