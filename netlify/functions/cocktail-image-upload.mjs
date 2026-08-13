import { randomUUID } from "node:crypto";
import { getStore } from "@netlify/blobs";
import { getBearerToken, verifyAdminToken } from "./_hotline-auth.mjs";
import { jsonResponse, originAllowed } from "./_hotline-http.mjs";

const STORE_NAME = "suenos-cocktail-images";
const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

export default async request => {
  if (request.method !== "POST") return jsonResponse(405, { ok: false, message: "Method not allowed." });
  if (!originAllowed(request)) return jsonResponse(403, { ok: false, message: "Origin not allowed." });
  if (!verifyAdminToken(getBearerToken(request), process.env.HOTLINE_ADMIN_SECRET)) {
    return jsonResponse(401, { ok: false, message: "Your admin session has expired. Please log in again." });
  }

  let form;
  try { form = await request.formData(); } catch { return jsonResponse(400, { ok: false, message: "The image upload was invalid." }); }
  const file = form.get("file");
  if (!file || typeof file.arrayBuffer !== "function" || typeof file.size !== "number") return jsonResponse(400, { ok: false, message: "Choose an image to upload." });
  const extension = TYPES.get(file.type);
  if (!extension) return jsonResponse(400, { ok: false, message: "Use a JPG, PNG or WebP image." });
  if (!file.size || file.size > MAX_BYTES) return jsonResponse(400, { ok: false, message: "Images must be smaller than 5 MB." });

  const key = `cocktail-${randomUUID()}.${extension}`;
  try {
    const store = getStore(STORE_NAME);
    await store.set(key, file, { metadata: { contentType: file.type, originalName: String(file.name || "cocktail-image").slice(0, 180), uploadedAt: new Date().toISOString() } });
    return jsonResponse(201, { ok: true, key, url: `/api/cocktail-images/${key}` });
  } catch (error) {
    console.error("Unable to upload cocktail image.", error);
    return jsonResponse(500, { ok: false, message: "The image could not be uploaded." });
  }
};

export const config = { path: "/api/cocktail-images", method: "POST" };
