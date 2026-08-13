import { getStore } from "@netlify/blobs";

const STORE_NAME = "suenos-cocktail-images";
const KEY_PATTERN = /^cocktail-[a-f0-9-]+\.(?:jpg|png|webp)$/i;

export default async (request, context) => {
  if (request.method !== "GET" && request.method !== "HEAD") return new Response("Method not allowed.", { status: 405 });
  const key = String(context.params?.key || "");
  if (!KEY_PATTERN.test(key)) return new Response("Not found.", { status: 404 });

  try {
    const store = getStore(STORE_NAME);
    const entry = await store.getWithMetadata(key, { type: "arrayBuffer", consistency: "strong" });
    if (!entry) return new Response("Not found.", { status: 404 });
    const headers = {
      "content-type": entry.metadata?.contentType || "application/octet-stream",
      "cache-control": "public, max-age=31536000, immutable",
      "x-content-type-options": "nosniff",
    };
    return new Response(request.method === "HEAD" ? null : entry.data, { status: 200, headers });
  } catch (error) {
    console.error("Unable to read cocktail image.", error);
    return new Response("Image unavailable.", { status: 500 });
  }
};

export const config = { path: "/api/cocktail-images/:key" };
