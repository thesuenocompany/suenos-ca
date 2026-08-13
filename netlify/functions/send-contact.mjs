import { randomUUID } from "node:crypto";

const MAX_BODY_BYTES = 16_000;
const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const TURNSTILE_ACTION = "contact";
const MIN_COMPLETION_MS = 3_000;
const SPAM_THRESHOLD = 6;

const jsonResponse = (status, body) => new Response(JSON.stringify(body), {
  status,
  headers: {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  },
});

const clean = (value, maxLength) => String(value ?? "").trim().slice(0, maxLength);

const escapeHtml = (value) => clean(value, 10_000)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && !/[\r\n]/.test(value);

const normalizedText = (value) => clean(value, 10_000)
  .toLowerCase()
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9@.]+/g, " ")
  .replace(/\s+/g, " ")
  .trim();

async function parseBody(request) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_BODY_BYTES) throw new Error("BODY_TOO_LARGE");

  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return request.json();

  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) throw new Error("BODY_TOO_LARGE");
  return Object.fromEntries(new URLSearchParams(raw));
}

const silentSuccess = () => jsonResponse(200, {
  ok: true,
  message: "Thanks. Your message has been sent to Sueños.",
});

function scoreSpamSubmission({ name, email, company, message, language, pageUrl, formStartedAt }) {
  const combined = normalizedText(`${name} ${email} ${company} ${message}`);
  const reasons = [];
  let score = 0;

  const add = (points, reason) => {
    score += points;
    reasons.push(reason);
  };

  const has = pattern => pattern.test(combined);
  const messageText = normalizedText(message);

  if (/\b(i checked|we checked|checked|reviewed|analysed|analyzed|audited) (your|the) (website|site)\b/.test(messageText)) add(3, "website-audit-pitch");
  if (/\b(seo|search engine optimization|search optimisation)\b/.test(combined)) add(2, "seo-language");
  if (/\b(google rankings?|rankings? on google|rank higher|first page of google|page one of google)\b/.test(combined)) add(3, "ranking-pitch");
  if (/\b(quality leads?|qualified leads?|generate more leads?|lead generation)\b/.test(combined)) add(2, "lead-generation-pitch");
  if (/\b(seo proposal|proposal with pricing|free seo audit|complimentary audit|website audit report)\b/.test(combined)) add(3, "proposal-pitch");
  if (/\b(backlinks?|guest posts?|domain authority|link building|organic traffic)\b/.test(combined)) add(3, "link-building-pitch");
  if (/\b(web design services?|website redesign|digital marketing services?|social media marketing services?)\b/.test(combined)) add(2, "agency-solicitation");
  if (/\b(let me know if (you are|youre|you re) interested|are you interested|shall i send|can i send)\b/.test(combined)) add(1, "cold-outreach-close");
  if (/\b(grow your business|business growth|increase your sales|increase your traffic)\b/.test(combined)) add(1, "growth-pitch");

  const urlMatches = message.match(/(?:https?:\/\/|www\.)\S+/gi) || [];
  if (urlMatches.length >= 2) add(2, "multiple-links");
  else if (urlMatches.length === 1 && has(/\bseo\b|\bbacklinks?\b|\bweb design\b/)) add(1, "solicitation-link");

  const startedAt = Number(formStartedAt);
  if (Number.isFinite(startedAt) && startedAt > 0) {
    const elapsed = Date.now() - startedAt;
    if (elapsed >= 0 && elapsed < MIN_COMPLETION_MS) add(3, "completed-too-quickly");
    if (elapsed < -60_000 || elapsed > 24 * 60 * 60 * 1000) add(1, "invalid-form-time");
  } else {
    add(1, "missing-form-time");
  }

  if (!language || language === "unknown") add(1, "missing-language");
  if (!pageUrl) add(1, "missing-page-url");

  return { score, reasons };
}

async function verifyTurnstile({ token, secret, remoteIp, allowedHostnames }) {
  if (!secret) {
    console.error("Contact function is missing TURNSTILE_SECRET_KEY.");
    return { success: false, configurationError: true, errorCodes: ["missing-secret"] };
  }

  if (!token) return { success: false, errorCodes: ["missing-input-response"] };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);

  try {
    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        secret,
        response: token,
        remoteip: remoteIp || undefined,
        idempotency_key: randomUUID(),
      }),
      signal: controller.signal,
    });

    const result = await response.json().catch(() => ({}));
    const errorCodes = Array.isArray(result["error-codes"]) ? result["error-codes"] : [];
    const hostnameAllowed = allowedHostnames.size === 0 || allowedHostnames.has(String(result.hostname || "").toLowerCase());
    const actionAllowed = result.action === TURNSTILE_ACTION;

    return {
      success: response.ok && result.success === true && hostnameAllowed && actionAllowed,
      errorCodes,
      hostname: result.hostname,
      action: result.action,
      hostnameAllowed,
      actionAllowed,
    };
  } catch (error) {
    console.error("Turnstile validation request failed.", error?.name || error);
    return { success: false, errorCodes: [error?.name === "AbortError" ? "validation-timeout" : "internal-error"] };
  } finally {
    clearTimeout(timeout);
  }
}

export default async (request, context = {}) => {
  if (request.method !== "POST") {
    return jsonResponse(405, { ok: false, message: "Method not allowed." });
  }

  const requestOrigin = request.headers.get("origin");
  const functionOrigin = new URL(request.url).origin;
  const configuredOrigins = [
    process.env.CONTACT_ALLOWED_ORIGIN,
    process.env.CONTACT_ALLOWED_ORIGINS,
    process.env.URL,
    process.env.DEPLOY_PRIME_URL,
    process.env.DEPLOY_URL,
    "https://suenos.ca",
    "https://www.suenos.ca",
  ]
    .filter(Boolean)
    .flatMap(value => String(value).split(","))
    .map(value => value.trim().replace(/\/$/, ""))
    .filter(Boolean);

  const allowedOrigins = new Set([functionOrigin, ...configuredOrigins]);
  if (requestOrigin && !allowedOrigins.has(requestOrigin.replace(/\/$/, ""))) {
    return jsonResponse(403, { ok: false, message: "Origin not allowed." });
  }

  let data;
  try {
    data = await parseBody(request);
  } catch (error) {
    const status = error?.message === "BODY_TOO_LARGE" ? 413 : 400;
    return jsonResponse(status, { ok: false, message: "The form submission could not be read." });
  }

  // Honeypot: quietly accept automated submissions without sending email.
  if (clean(data.website, 200)) {
    console.info("Contact submission suppressed.", { reasons: ["honeypot"] });
    return silentSuccess();
  }

  const name = clean(data.name, 120);
  const email = clean(data.email, 254).toLowerCase();
  const company = clean(data.company, 180);
  const message = clean(data.message, 5_000);
  const language = clean(data.language, 16) || "unknown";
  const pageUrl = clean(data.pageUrl, 500);
  const formStartedAt = clean(data.formStartedAt, 32);
  const turnstileToken = clean(data["cf-turnstile-response"], 2_048);

  const errors = {};
  if (name.length < 2) errors.name = "Please enter your name.";
  if (!isEmail(email)) errors.email = "Please enter a valid email address.";
  if (message.length < 10) errors.message = "Please enter a message of at least 10 characters.";

  if (Object.keys(errors).length) {
    return jsonResponse(400, { ok: false, message: "Please check the highlighted fields.", errors });
  }

  const spamAssessment = scoreSpamSubmission({
    name,
    email,
    company,
    message,
    language,
    pageUrl,
    formStartedAt,
  });

  if (spamAssessment.score >= SPAM_THRESHOLD) {
    console.info("Contact submission suppressed.", {
      spamScore: spamAssessment.score,
      reasons: spamAssessment.reasons,
    });
    return silentSuccess();
  }

  if (!turnstileToken) {
    return jsonResponse(400, {
      ok: false,
      message: "Please complete the spam-protection check and try again.",
      errors: { turnstile: "Verification is required." },
    });
  }

  const turnstileSecret = process.env.CONTACT_TURNSTILE_SECRET_KEY || process.env.TURNSTILE_SECRET_KEY;
  const allowedTurnstileHostnames = new Set([
    "suenos.ca",
    "www.suenos.ca",
    ...String(process.env.TURNSTILE_ALLOWED_HOSTNAMES || "")
      .split(",")
      .map(value => value.trim().toLowerCase())
      .filter(Boolean),
  ]);

  const turnstileResult = await verifyTurnstile({
    token: turnstileToken,
    secret: turnstileSecret,
    remoteIp: context?.ip,
    allowedHostnames: allowedTurnstileHostnames,
  });

  if (!turnstileResult.success) {
    console.warn("Contact Turnstile validation failed.", {
      errorCodes: turnstileResult.errorCodes,
      hostnameAllowed: turnstileResult.hostnameAllowed,
      actionAllowed: turnstileResult.actionAllowed,
    });

    if (turnstileResult.configurationError) {
      return jsonResponse(500, { ok: false, message: "The contact service is not configured yet." });
    }

    return jsonResponse(400, {
      ok: false,
      message: "The spam-protection check expired or could not be verified. Please try again.",
      errors: { turnstile: "Verification failed." },
    });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.CONTACT_TO_EMAIL || "sales@suenos.ca";
  const fromEmail = process.env.CONTACT_FROM_EMAIL;

  if (!apiKey || !fromEmail) {
    console.error("Contact function is missing RESEND_API_KEY or CONTACT_FROM_EMAIL.");
    return jsonResponse(500, { ok: false, message: "The contact service is not configured yet." });
  }

  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeCompany = escapeHtml(company || "Not provided");
  const safeMessage = escapeHtml(message).replaceAll("\n", "<br>");
  const safeLanguage = escapeHtml(language);
  const safePageUrl = escapeHtml(pageUrl || "Not provided");

  const text = [
    "New Sueños website enquiry",
    "",
    `Name: ${name}`,
    `Email: ${email}`,
    `Company: ${company || "Not provided"}`,
    `Language: ${language}`,
    `Page: ${pageUrl || "Not provided"}`,
    "",
    message,
  ].join("\n");

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.55;color:#171717;max-width:680px;margin:auto">
      <div style="background:#111;padding:22px 26px;border-bottom:6px solid #dd5d23">
        <h1 style="margin:0;color:#f4ead8;font-size:24px">New Sueños website enquiry</h1>
      </div>
      <div style="padding:24px 26px;background:#fffaf0">
        <p><strong>Name:</strong> ${safeName}</p>
        <p><strong>Email:</strong> <a href="mailto:${safeEmail}">${safeEmail}</a></p>
        <p><strong>Company:</strong> ${safeCompany}</p>
        <p><strong>Language:</strong> ${safeLanguage}</p>
        <p><strong>Page:</strong> ${safePageUrl}</p>
        <hr style="border:0;border-top:1px solid #ddd;margin:22px 0">
        <p style="white-space:normal">${safeMessage}</p>
      </div>
    </div>`;

  try {
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [toEmail],
        reply_to: email,
        subject: `Sueños website enquiry from ${name}`,
        text,
        html,
        tags: [{ name: "source", value: "website-contact" }],
      }),
    });

    const responseBody = await resendResponse.json().catch(() => ({}));
    if (!resendResponse.ok) {
      console.error("Resend rejected the contact email.", resendResponse.status, responseBody);
      return jsonResponse(502, { ok: false, message: "Your message could not be sent. Please try again or email sales@suenos.ca." });
    }

    return jsonResponse(200, { ok: true, message: "Thanks. Your message has been sent to Sueños." });
  } catch (error) {
    console.error("Contact email delivery failed.", error);
    return jsonResponse(502, { ok: false, message: "Your message could not be sent. Please try again or email sales@suenos.ca." });
  }
};

export const config = {
  path: "/api/contact",
  rateLimit: {
    action: "rate_limit",
    aggregateBy: "ip",
    windowSize: 3_600,
    windowLimit: 5,
  },
};
