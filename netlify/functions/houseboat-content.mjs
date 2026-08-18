import { DEFAULT_HOUSEBOAT_CONFIG } from "./_houseboat-defaults.mjs";
import { jsonResponse, originAllowed } from "./_hotline-http.mjs";
import { getBearerToken, verifyAdminToken } from "./_hotline-auth.mjs";

const base = () =>
  String(
    process.env.SUPABASE_URL || "https://dowfjjthshbbgnvwxzjv.supabase.co",
  ).replace(/\/$/, "");
const key = () => process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const headers = (extra = {}) => ({
  apikey: key(),
  authorization: `Bearer ${key()}`,
  "content-type": "application/json",
  ...extra,
});
async function sb(path, options = {}) {
  const r = await fetch(`${base()}/rest/v1/${path}`, {
    ...options,
    headers: headers(options.headers),
  });
  const text = await r.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!r.ok)
    throw Object.assign(
      new Error(data?.message || "Database request failed."),
      { status: r.status },
    );
  return data;
}
const merge = (baseValue, override) => {
  if (Array.isArray(baseValue))
    return Array.isArray(override) ? override : baseValue;
  if (baseValue && typeof baseValue === "object") {
    const out = { ...baseValue };
    if (override && typeof override === "object")
      for (const [k, v] of Object.entries(override))
        out[k] = k in baseValue ? merge(baseValue[k], v) : v;
    return out;
  }
  return override === undefined ? baseValue : override;
};
const cleanConfig = (value) => {
  const cfg = value && typeof value === "object" ? value : {};
  const merged = merge(DEFAULT_HOUSEBOAT_CONFIG, cfg);
  const legacyHero = "/assets/images/houseboat/CC3_exterior2.jpg";
  const legacyMobile =
    "/assets/images/houseboat/B1CD4BD7-CC0A-41FE-BD82-16D883966978.jpg";
  if (merged.heroImage === legacyHero)
    merged.heroImage = DEFAULT_HOUSEBOAT_CONFIG.heroImage;
  if (merged.heroMobileImage === legacyMobile)
    merged.heroMobileImage = DEFAULT_HOUSEBOAT_CONFIG.heroMobileImage;
  if (merged.ogImage === legacyHero)
    merged.ogImage = DEFAULT_HOUSEBOAT_CONFIG.ogImage;
  const legacyFormIntro =
    "Send us the basics. We’ll confirm availability, current pricing and the right next step. This is an inquiry, not a reservation.";
  if (merged.sectionCopy?.formIntro === legacyFormIntro)
    merged.sectionCopy.formIntro =
      DEFAULT_HOUSEBOAT_CONFIG.sectionCopy.formIntro;
  const legacyExperienceIntro =
    "Breakfast in the galley. Kids disappearing down the waterslide. Eight people solving nothing in the hot tub. Sunset upstairs. Then everyone gets to stay instead of splitting into six hotel rooms.";
  if (merged.sectionCopy?.experienceIntro === legacyExperienceIntro)
    merged.sectionCopy.experienceIntro =
      DEFAULT_HOUSEBOAT_CONFIG.sectionCopy.experienceIntro;
  if (!merged.heroImage) merged.heroImage = DEFAULT_HOUSEBOAT_CONFIG.heroImage;
  if (!merged.heroMobileImage)
    merged.heroMobileImage = DEFAULT_HOUSEBOAT_CONFIG.heroMobileImage;
  if (!merged.ogImage) merged.ogImage = DEFAULT_HOUSEBOAT_CONFIG.ogImage;
  if (!Array.isArray(merged.gallery) || !merged.gallery.filter(Boolean).length)
    merged.gallery = DEFAULT_HOUSEBOAT_CONFIG.gallery;
  merged.occupancy.max = Math.min(
    22,
    Math.max(1, Number(merged.occupancy.max) || 22),
  );
  merged.occupancy.privateStaterooms = Math.min(
    5,
    Math.max(0, Number(merged.occupancy.privateStaterooms) || 5),
  );
  merged.seasons = (merged.seasons || []).slice(0, 12).map((s) => ({
    ...s,
    status: ["current", "starting", "sold_out", "call", "hidden"].includes(
      s.status,
    )
      ? s.status
      : "current",
  }));
  merged.availability =
    merged.availability && typeof merged.availability === "object"
      ? merged.availability
      : { ranges: [] };
  merged.availability.ranges = (
    Array.isArray(merged.availability.ranges) ? merged.availability.ranges : []
  )
    .slice(0, 500)
    .map((r, i) => ({
      id: String(r.id || `range-${i + 1}`).slice(0, 80),
      start: String(r.start || "").slice(0, 10),
      end: String(r.end || r.start || "").slice(0, 10),
      status: ["booked", "hold", "blocked", "maintenance"].includes(r.status)
        ? r.status
        : "blocked",
      note: String(r.note || "")
        .trim()
        .slice(0, 300),
    }))
    .filter(
      (r) =>
        /^\d{4}-\d{2}-\d{2}$/.test(r.start) &&
        /^\d{4}-\d{2}-\d{2}$/.test(r.end) &&
        r.end >= r.start,
    );
  return merged;
};

export default async (request) => {
  if (!originAllowed(request))
    return jsonResponse(403, { ok: false, message: "Origin not allowed." });
  const admin = verifyAdminToken(
    getBearerToken(request),
    process.env.HOTLINE_ADMIN_SECRET,
  );
  try {
    if (request.method === "GET") {
      const row = (
        await sb(
          "houseboat_content?id=eq.houseboat&select=config,updated_at&limit=1",
        ).catch(() => [])
      )?.[0];
      return jsonResponse(200, {
        ok: true,
        config: cleanConfig(row?.config || {}),
        updatedAt: row?.updated_at || null,
      });
    }
    if (request.method === "POST") {
      if (!admin)
        return jsonResponse(401, {
          ok: false,
          message: "Admin session expired.",
        });
      const body = await request.json().catch(() => ({}));
      const config = cleanConfig(body.config || body);
      config.updatedAt = new Date().toISOString();
      const saved = await sb("houseboat_content?on_conflict=id", {
        method: "POST",
        headers: {
          Prefer: "resolution=merge-duplicates,return=representation",
        },
        body: JSON.stringify({
          id: "houseboat",
          config,
          updated_at: new Date().toISOString(),
        }),
      });
      return jsonResponse(200, {
        ok: true,
        config: cleanConfig(saved?.[0]?.config || config),
      });
    }
    return jsonResponse(405, { ok: false, message: "Method not allowed." });
  } catch (error) {
    console.error("houseboat-content", error);
    return jsonResponse(error.status || 500, {
      ok: false,
      message: "Houseboat content could not be loaded.",
    });
  }
};
export const config = { path: "/api/houseboat-content" };
