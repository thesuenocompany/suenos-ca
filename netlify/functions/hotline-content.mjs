import { getStore } from "@netlify/blobs";
import { hotlineDefaults } from "./_hotline-defaults.mjs";
import { getBearerToken, verifyAdminToken } from "./_hotline-auth.mjs";
import { jsonResponse, originAllowed, validateHotlineContent } from "./_hotline-http.mjs";

const STORE_NAME = "suenos-content";
const KEY = "don-terry-hotline";

const readContent = async () => {
  const store = getStore(STORE_NAME);
  const saved = await store.get(KEY, { type: "json", consistency: "strong" });
  if (!saved?.content) return { content: hotlineDefaults, updatedAt: null, source: "defaults" };

  const isLegacy = ["en", "es"].some(lang =>
    !Array.isArray(saved.content?.[lang]?.responses1) ||
    !Array.isArray(saved.content?.[lang]?.responses2) ||
    !Array.isArray(saved.content?.[lang]?.responses3)
  );

  return isLegacy
    ? { content: hotlineDefaults, updatedAt: null, source: "defaults-migrated" }
    : saved;
};

export default async request => {
  if (!originAllowed(request)) return jsonResponse(403, { ok: false, message: "Origin not allowed." });

  if (request.method === "GET") {
    try {
      const record = await readContent();
      return jsonResponse(200, { ok: true, ...record }, { "cache-control": "public, max-age=30, stale-while-revalidate=120" });
    } catch (error) {
      console.error("Unable to read hotline content.", error);
      return jsonResponse(200, { ok: true, content: hotlineDefaults, updatedAt: null, source: "defaults-fallback" });
    }
  }

  const secret = process.env.HOTLINE_ADMIN_SECRET;
  const token = getBearerToken(request);
  if (!verifyAdminToken(token, secret)) return jsonResponse(401, { ok: false, message: "Your admin session has expired. Please log in again." });

  const store = getStore(STORE_NAME);

  if (request.method === "PUT") {
    let body;
    try { body = await request.json(); } catch { return jsonResponse(400, { ok: false, message: "Invalid JSON." }); }
    let content;
    try { content = validateHotlineContent(body?.content ?? body); }
    catch (error) { return jsonResponse(400, { ok: false, message: error.message || "Invalid content." }); }

    const record = { content, updatedAt: new Date().toISOString(), source: "admin" };
    try {
      await store.setJSON(KEY, record);
      return jsonResponse(200, { ok: true, ...record });
    } catch (error) {
      console.error("Unable to save hotline content.", error);
      return jsonResponse(500, { ok: false, message: "The content could not be saved." });
    }
  }

  if (request.method === "DELETE") {
    try {
      await store.delete(KEY);
      return jsonResponse(200, { ok: true, content: hotlineDefaults, updatedAt: null, source: "defaults" });
    } catch (error) {
      console.error("Unable to reset hotline content.", error);
      return jsonResponse(500, { ok: false, message: "The content could not be reset." });
    }
  }

  return jsonResponse(405, { ok: false, message: "Method not allowed." });
};

export const config = { path: "/api/hotline-content" };
