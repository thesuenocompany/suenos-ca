import { createAdminToken, passwordMatches } from "./_hotline-auth.mjs";
import { jsonResponse, originAllowed } from "./_hotline-http.mjs";

export default async request => {
  if (request.method !== "POST") return jsonResponse(405, { ok: false, message: "Method not allowed." });
  if (!originAllowed(request)) return jsonResponse(403, { ok: false, message: "Origin not allowed." });

  const configuredPassword = process.env.HOTLINE_ADMIN_PASSWORD;
  const secret = process.env.HOTLINE_ADMIN_SECRET;
  if (!configuredPassword || !secret || secret.length < 24) {
    console.error("HOTLINE_ADMIN_PASSWORD or HOTLINE_ADMIN_SECRET is not configured.");
    return jsonResponse(503, { ok: false, message: "The admin service is not configured yet." });
  }

  let data;
  try { data = await request.json(); } catch { return jsonResponse(400, { ok: false, message: "Invalid request." }); }
  const provided = String(data?.password ?? "").slice(0, 200);
  if (!passwordMatches(provided, configuredPassword)) {
    await new Promise(resolve => setTimeout(resolve, 350));
    return jsonResponse(401, { ok: false, message: "Incorrect password." });
  }

  return jsonResponse(200, { ok: true, token: createAdminToken(secret), expiresIn: 28800 });
};

export const config = { path: "/api/hotline-auth" };
