import { getStore } from "@netlify/blobs";
import { randomUUID } from "node:crypto";
import { getBearerToken, verifyAdminToken } from "./_hotline-auth.mjs";
import { jsonResponse, originAllowed } from "./_hotline-http.mjs";
import { campaignDefaults } from "./_campaign-defaults.mjs";

const STORE_NAME = "suenos-content";
const KEY = "campaign-overlays";
const OLD_KEY = "sunfest-overlay";
const text = (value, max = 500) => String(value ?? "").trim().slice(0, max);
const colour = value => /^#[0-9a-f]{6}$/i.test(String(value || "")) ? String(value) : "";
const slug = value => text(value, 80).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const list = (value, maxItems = 100, itemMax = 80) => {
  const source = Array.isArray(value) ? value : String(value ?? "").split(/[\n,]+/);
  return [...new Set(source.map(item => text(item, itemMax)).filter(Boolean))].slice(0, maxItems);
};
const normalize = value => String(value ?? "").trim().toLocaleLowerCase("en-CA").replace(/\s+/g, " ");
const normalizePostal = value => String(value ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");

function validateMarket(input = {}) {
  return {
    id: slug(input.id || input.name) || `market-${randomUUID().slice(0, 8)}`,
    name: text(input.name, 100) || "Untitled Market",
    countries: list(input.countries, 20, 60),
    provinces: list(input.provinces, 40, 80),
    cities: list(input.cities, 100, 100),
    postalPrefixes: list(input.postalPrefixes, 100, 12).map(normalizePostal).filter(Boolean)
  };
}

function validateOverlay(input = {}) {
  const fallback = campaignDefaults.overlays[0];
  const mode = ["off", "manual", "scheduled"].includes(input.mode) ? input.mode : "off";
  const targetingMode = ["everyone", "markets", "custom"].includes(input.targeting?.mode) ? input.targeting.mode : "everyone";
  const id = slug(input.id) || `campaign-${randomUUID().slice(0, 8)}`;
  const output = {
    id,
    name: text(input.name, 100) || "Untitled Campaign",
    mode,
    priority: Math.max(0, Math.min(9999, Number(input.priority) || 0)),
    startAt: text(input.startAt, 40),
    endAt: text(input.endAt, 40),
    linkUrl: text(input.linkUrl, 500),
    targeting: {
      mode: targetingMode,
      marketIds: list(input.targeting?.marketIds, 50, 80).map(slug).filter(Boolean),
      countries: list(input.targeting?.countries, 20, 60),
      provinces: list(input.targeting?.provinces, 40, 80),
      cities: list(input.targeting?.cities, 100, 100),
      postalPrefixes: list(input.targeting?.postalPrefixes, 100, 12).map(normalizePostal).filter(Boolean)
    },
    assets: {
      partnerLogo: text(input.assets?.partnerLogo, 500),
      heroDesktop: text(input.assets?.heroDesktop, 500),
      heroMobile: text(input.assets?.heroMobile, 500)
    },
    theme: {
      barBackground: colour(input.theme?.barBackground) || fallback.theme.barBackground,
      barText: colour(input.theme?.barText) || fallback.theme.barText,
      primaryButton: colour(input.theme?.primaryButton) || fallback.theme.primaryButton,
      primaryButtonText: colour(input.theme?.primaryButtonText) || fallback.theme.primaryButtonText
    },
    en: {}, es: {}
  };
  for (const lang of ["en", "es"]) {
    const source = input[lang] || {};
    output[lang] = {
      announcement: text(source.announcement, 180),
      eyebrow: text(source.eyebrow, 120),
      headline: text(source.headline, 160),
      body: text(source.body, 420),
      primaryLabel: text(source.primaryLabel, 70),
      secondaryLabel: text(source.secondaryLabel, 70)
    };
  }
  if (!/^https:\/\//i.test(output.linkUrl)) throw new Error(`${output.name}: destination link must use https://.`);
  if (mode === "scheduled" && (!Date.parse(output.startAt) || !Date.parse(output.endAt) || Date.parse(output.endAt) <= Date.parse(output.startAt))) {
    throw new Error(`${output.name}: scheduled mode requires a valid start and end time.`);
  }
  if (!output.assets.heroDesktop || !output.assets.heroMobile) throw new Error(`${output.name}: desktop and mobile hero artwork are required.`);
  if (targetingMode === "markets" && !output.targeting.marketIds.length) throw new Error(`${output.name}: select at least one named market.`);
  if (targetingMode === "custom" && ![output.targeting.countries, output.targeting.provinces, output.targeting.cities, output.targeting.postalPrefixes].some(items => items.length)) {
    throw new Error(`${output.name}: add at least one custom location.`);
  }
  return output;
}

const isActive = overlay => {
  if (overlay.mode === "manual") return true;
  if (overlay.mode !== "scheduled") return false;
  const now = Date.now();
  return now >= Date.parse(overlay.startAt) && now < Date.parse(overlay.endAt);
};

function geoFromContext(context = {}) {
  const geo = context.geo || {};
  return {
    countryCode: text(geo.country?.code, 8),
    countryName: text(geo.country?.name, 80),
    provinceCode: text(geo.subdivision?.code, 20),
    provinceName: text(geo.subdivision?.name, 80),
    city: text(geo.city, 100),
    postalCode: text(geo.postalCode, 20),
    timezone: text(geo.timezone, 80)
  };
}

function criterionMatches(values, candidates) {
  if (!values.length) return false;
  const normalizedCandidates = candidates.map(normalize).filter(Boolean);
  return values.some(value => normalizedCandidates.includes(normalize(value)));
}

function locationGroupMatches(group = {}, geo = {}) {
  const checks = [];
  if (group.countries?.length) checks.push(criterionMatches(group.countries, [geo.countryCode, geo.countryName]));
  if (group.provinces?.length) checks.push(criterionMatches(group.provinces, [geo.provinceCode, geo.provinceName]));
  if (group.cities?.length) checks.push(criterionMatches(group.cities, [geo.city]));
  if (group.postalPrefixes?.length) {
    const postal = normalizePostal(geo.postalCode);
    checks.push(Boolean(postal) && group.postalPrefixes.some(prefix => postal.startsWith(normalizePostal(prefix))));
  }
  return checks.length ? checks.some(Boolean) : false;
}

function overlayMatches(overlay, markets, geo) {
  const targeting = overlay.targeting || { mode: "everyone" };
  if (targeting.mode === "everyone") return true;
  if (targeting.mode === "markets") {
    return (targeting.marketIds || []).some(id => {
      const market = markets.find(item => item.id === id);
      return market ? locationGroupMatches(market, geo) : false;
    });
  }
  return locationGroupMatches(targeting, geo);
}

const selectActive = (overlays, markets, geo) => overlays
  .filter(isActive)
  .filter(overlay => overlayMatches(overlay, markets, geo))
  .sort((a, b) => b.priority - a.priority)[0] || null;

async function readRecord() {
  const store = getStore(STORE_NAME, { consistency: "strong" });
  const saved = await store.get(KEY, { type: "json" });
  if (saved?.overlays) {
    return {
      version: 2,
      markets: Array.isArray(saved.markets) ? saved.markets.map(validateMarket) : structuredClone(campaignDefaults.markets),
      overlays: saved.overlays.map(item => validateOverlay({ ...item, targeting: item.targeting || { mode: "everyone" } })),
      updatedAt: saved.updatedAt || null,
      source: saved.source || "saved"
    };
  }
  const legacy = await store.get(OLD_KEY, { type: "json" });
  if (legacy?.config) {
    const base = structuredClone(campaignDefaults.overlays[0]);
    const c = legacy.config;
    base.mode = c.mode || "off";
    base.startAt = c.startAt || base.startAt;
    base.endAt = c.endAt || base.endAt;
    base.linkUrl = c.linkUrl || base.linkUrl;
    base.assets.partnerLogo = c.logo || base.assets.partnerLogo;
    base.en = { ...base.en, ...(c.en || {}) };
    base.es = { ...base.es, ...(c.es || {}) };
    return { version: 2, markets: structuredClone(campaignDefaults.markets), overlays: [base], updatedAt: legacy.updatedAt || null, source: "legacy-migration" };
  }
  return { ...structuredClone(campaignDefaults), updatedAt: null, source: "defaults" };
}

export default async (request, context) => {
  if (!originAllowed(request)) return jsonResponse(403, { ok: false, message: "Origin not allowed." });
  const authorized = verifyAdminToken(getBearerToken(request), process.env.HOTLINE_ADMIN_SECRET);
  const geo = geoFromContext(context);

  if (request.method === "GET") {
    try {
      const record = await readRecord();
      const activeOverlay = selectActive(record.overlays || [], record.markets || [], geo);
      if (authorized) return jsonResponse(200, { ok: true, ...record, activeOverlay, detectedLocation: geo }, { "cache-control": "no-store" });
      return jsonResponse(200, { ok: true, active: Boolean(activeOverlay), overlay: activeOverlay }, { "cache-control": "private, no-store" });
    } catch (error) {
      console.error(error);
      return jsonResponse(200, { ok: true, active: false, overlay: null }, { "cache-control": "private, no-store" });
    }
  }

  if (!authorized) return jsonResponse(401, { ok: false, message: "Your admin session has expired. Please log in again." });
  const store = getStore(STORE_NAME, { consistency: "strong" });

  if (request.method === "PUT") {
    let body;
    try { body = await request.json(); } catch { return jsonResponse(400, { ok: false, message: "Invalid JSON." }); }
    try {
      const markets = Array.isArray(body?.markets) ? body.markets.map(validateMarket) : [];
      const marketIds = new Set();
      for (const market of markets) {
        if (marketIds.has(market.id)) throw new Error(`Duplicate market ID: ${market.id}`);
        marketIds.add(market.id);
      }
      const overlays = Array.isArray(body?.overlays) ? body.overlays.map(validateOverlay) : [];
      const ids = new Set();
      for (const overlay of overlays) {
        if (ids.has(overlay.id)) throw new Error(`Duplicate campaign ID: ${overlay.id}`);
        ids.add(overlay.id);
        for (const marketId of overlay.targeting.marketIds || []) {
          if (!marketIds.has(marketId)) throw new Error(`${overlay.name}: named market “${marketId}” does not exist.`);
        }
      }
      const record = { version: 2, markets, overlays, updatedAt: new Date().toISOString(), source: "admin" };
      await store.setJSON(KEY, record);
      return jsonResponse(200, { ok: true, ...record, activeOverlay: selectActive(overlays, markets, geo), detectedLocation: geo });
    } catch (error) {
      return jsonResponse(400, { ok: false, message: error.message || "Invalid campaign settings." });
    }
  }

  if (request.method === "DELETE") {
    await store.delete(KEY);
    return jsonResponse(200, { ok: true, ...structuredClone(campaignDefaults), updatedAt: null, source: "defaults", activeOverlay: null, detectedLocation: geo });
  }

  return jsonResponse(405, { ok: false, message: "Method not allowed." }, { allow: "GET, PUT, DELETE" });
};

export const config = { path: "/api/campaign-overlays" };
