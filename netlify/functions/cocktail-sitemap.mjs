import { getStore } from "@netlify/blobs";
import { cocktailDefaults } from "./_cocktail-defaults.mjs";
import { validateCocktailRecipes } from "./_cocktail-http.mjs";

const STORE_NAME = "suenos-content";
const KEY = "cocktail-recipes-v1";
const SITE = "https://www.suenos.ca";
const xml = value => String(value ?? "").replace(/[<>&'\"]/g, char => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[char]));
const absolute = value => /^https:\/\//i.test(value) ? value : `${SITE}${value.startsWith("/") ? "" : "/"}${value}`;

const readRecipes = async () => {
  try {
    const store = getStore(STORE_NAME);
    const saved = await store.get(KEY, { type: "json", consistency: "strong" });
    return saved?.content?.recipes ? validateCocktailRecipes(saved.content) : cocktailDefaults;
  } catch (error) {
    console.error("Unable to read cocktail recipes for sitemap.", error);
    return cocktailDefaults;
  }
};

export default async request => {
  if (request.method !== "GET" && request.method !== "HEAD") return new Response("Method not allowed.", { status: 405 });
  const content = await readRecipes();
  const entries = content.recipes.filter(recipe => recipe.published !== false).flatMap(recipe => {
    const lastmod = recipe.en.lastReviewed || recipe.es.lastReviewed || new Date().toISOString().slice(0, 10);
    const image = absolute(recipe.image);
    return [
      { lang: "en-CA", otherLang: "es-MX", loc: `${SITE}/en-ca/cocktails/${recipe.slug}/`, other: `${SITE}/es-mx/cocteles/${recipe.slug}/`, title: recipe.en.name, lastmod, image },
      { lang: "es-MX", otherLang: "en-CA", loc: `${SITE}/es-mx/cocteles/${recipe.slug}/`, other: `${SITE}/en-ca/cocktails/${recipe.slug}/`, title: recipe.es.name, lastmod, image },
    ];
  });
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${entries.map(entry => `  <url>\n    <loc>${xml(entry.loc)}</loc>\n    <lastmod>${xml(entry.lastmod)}</lastmod>\n    <xhtml:link rel="alternate" hreflang="${entry.lang}" href="${xml(entry.loc)}"/>\n    <xhtml:link rel="alternate" hreflang="${entry.otherLang}" href="${xml(entry.other)}"/>\n    <xhtml:link rel="alternate" hreflang="x-default" href="${xml(entry.lang === "en-CA" ? entry.loc : entry.other)}"/>\n    <image:image><image:loc>${xml(entry.image)}</image:loc><image:title>${xml(entry.title)}</image:title></image:image>\n  </url>`).join("\n")}\n</urlset>\n`;
  return new Response(request.method === "HEAD" ? null : body, { status: 200, headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=60, stale-while-revalidate=300", "x-content-type-options": "nosniff" } });
};

export const config = { path: "/cocktail-sitemap.xml" };
