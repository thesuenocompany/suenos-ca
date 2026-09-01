import { randomUUID } from "node:crypto";

const MAX_BODY_BYTES = 4_000;
const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const TURNSTILE_ACTION = "where-next";

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

async function parseBody(request) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_BODY_BYTES) throw new Error("BODY_TOO_LARGE");

  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return request.json();

  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) throw new Error("BODY_TOO_LARGE");
  return Object.fromEntries(new URLSearchParams(raw));
}

async function verifyTurnstile({ token, secret, remoteIp, allowedHostnames }) {
  if (!secret) {
    console.error("Where-next function is missing TURNSTILE_SECRET_KEY.");
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
    const hostnameAllowed = allowedHostnames.has(String(result.hostname || "").toLowerCase());
    const actionAllowed = result.action === TURNSTILE_ACTION;

    return {
      success: response.ok && result.success === true && hostnameAllowed && actionAllowed,
      configurationError: false,
      errorCodes,
      hostnameAllowed,
      actionAllowed,
    };
  } catch (error) {
    console.error("Where-next Turnstile validation request failed.", error?.name || error);
    return {
      success: false,
      configurationError: false,
      errorCodes: [error?.name === "AbortError" ? "validation-timeout" : "internal-error"],
    };
  } finally {
    clearTimeout(timeout);
  }
}

export default async (request, context = {}) => {
  if (request.method !== "POST") {
    return jsonResponse(405, { ok: false, message: "Method not allowed." });
  }

  const env = key => Netlify.env.get(key);
  const requestOrigin = request.headers.get("origin");
  const functionOrigin = new URL(request.url).origin;
  const configuredOrigins = [
    env("CONTACT_ALLOWED_ORIGIN"),
    env("CONTACT_ALLOWED_ORIGINS"),
    env("URL"),
    env("DEPLOY_PRIME_URL"),
    env("DEPLOY_URL"),
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
    return jsonResponse(status, { ok: false, message: "The suggestion could not be read." });
  }

  // Honeypot submissions appear successful but never result in an email.
  if (clean(data.website, 200)) {
    console.info("Where-next submission suppressed.", { reason: "honeypot" });
    return jsonResponse(200, { ok: true, message: "Thanks. It’s on the list." });
  }

  const locationName = clean(data.location_name, 180);
  const city = clean(data.city, 120);
  const source = clean(data.source, 120) || "Where-next page";
  const pageUrl = clean(data.pageUrl, 500);
  const turnstileToken = clean(data["cf-turnstile-response"], 2_048);

  const errors = {};
  if (locationName.length < 2) errors.location_name = "Please enter the location name.";
  if (city.length < 2) errors.city = "Please enter the city.";

  if (Object.keys(errors).length) {
    return jsonResponse(400, { ok: false, message: "Please add the location name and city.", errors });
  }

  if (!turnstileToken) {
    return jsonResponse(400, {
      ok: false,
      message: "Please complete the spam-protection check and try again.",
      errors: { turnstile: "Verification is required." },
    });
  }

  const turnstileSecret = env("CONTACT_TURNSTILE_SECRET_KEY") || env("TURNSTILE_SECRET_KEY");
  const allowedTurnstileHostnames = new Set([
    "suenos.ca",
    "www.suenos.ca",
    ...String(env("TURNSTILE_ALLOWED_HOSTNAMES") || "")
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
    console.warn("Where-next Turnstile validation failed.", {
      errorCodes: turnstileResult.errorCodes,
      hostnameAllowed: turnstileResult.hostnameAllowed,
      actionAllowed: turnstileResult.actionAllowed,
    });

    if (turnstileResult.configurationError) {
      return jsonResponse(500, { ok: false, message: "The suggestion service is not configured yet." });
    }

    return jsonResponse(400, {
      ok: false,
      message: "The spam-protection check expired or could not be verified. Please try again.",
      errors: { turnstile: "Verification failed." },
    });
  }

  const apiKey = env("RESEND_API_KEY");
  const toEmail = env("CONTACT_TO_EMAIL") || "sales@suenos.ca";
  const fromEmail = env("CONTACT_FROM_EMAIL");

  if (!apiKey || !fromEmail) {
    console.error("Where-next function is missing RESEND_API_KEY or CONTACT_FROM_EMAIL.");
    return jsonResponse(500, { ok: false, message: "The suggestion service is not configured yet." });
  }

  const safeLocationName = escapeHtml(locationName);
  const safeCity = escapeHtml(city);
  const safeSource = escapeHtml(source);
  const safePageUrl = escapeHtml(pageUrl || "Not provided");
  const text = [
    "New Sueños location request",
    "",
    `Location: ${locationName}`,
    `City: ${city}`,
    `Source: ${source}`,
    `Page: ${pageUrl || "Not provided"}`,
  ].join("\n");
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.55;color:#171717;max-width:680px;margin:auto">
      <div style="background:#111313;padding:22px 26px;border-bottom:6px solid #00cbd6">
        <h1 style="margin:0;color:#fff7e5;font-size:24px">New Sueños location request</h1>
      </div>
      <div style="padding:24px 26px;background:#fff7e5">
        <p><strong>Location:</strong> ${safeLocationName}</p>
        <p><strong>City:</strong> ${safeCity}</p>
        <p><strong>Source:</strong> ${safeSource}</p>
        <p><strong>Page:</strong> ${safePageUrl}</p>
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
        subject: `Sueños request: ${locationName} — ${city}`,
        text,
        html,
        tags: [{ name: "source", value: "where-next" }],
      }),
    });

    const responseBody = await resendResponse.json().catch(() => ({}));
    if (!resendResponse.ok) {
      console.error("Resend rejected the where-next email.", resendResponse.status, responseBody);
      return jsonResponse(502, { ok: false, message: "Your suggestion could not be sent. Please try again." });
    }

    return jsonResponse(200, { ok: true, message: "Thanks. It’s on the list." });
  } catch (error) {
    console.error("Where-next email delivery failed.", error);
    return jsonResponse(502, { ok: false, message: "Your suggestion could not be sent. Please try again." });
  }
};

export const config = {
  path: "/api/where-next",
  rateLimit: {
    action: "rate_limit",
    aggregateBy: "ip",
    windowSize: 3_600,
    windowLimit: 5,
  },
};
