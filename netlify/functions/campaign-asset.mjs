import { getStore } from "@netlify/blobs";

export default async request => {
  const url = new URL(request.url);
  const key = decodeURIComponent(url.pathname.replace(/^\/api\/campaign-assets\//, ""));
  if (!key) return new Response("Not found", { status: 404 });
  const store = getStore("suenos-campaign-assets");
  const result = await store.getWithMetadata(key, { type: "arrayBuffer" });
  if (!result?.data) return new Response("Not found", { status: 404 });
  return new Response(result.data, { status: 200, headers: { "content-type": result.metadata?.contentType || "application/octet-stream", "cache-control": "public, max-age=31536000, immutable" } });
};

export const config = { path: "/api/campaign-assets/*" };
