import { getStore } from "@netlify/blobs";
import { cocktailDefaults } from "./_cocktail-defaults.mjs";
import { getBearerToken, verifyAdminToken } from "./_hotline-auth.mjs";
import { jsonResponse, originAllowed } from "./_hotline-http.mjs";
import { validateCocktailRecipes } from "./_cocktail-http.mjs";

const STORE_NAME = "suenos-content";
const KEY = "cocktail-recipes-v1";

const readRecipes = async () => {
  const store = getStore(STORE_NAME);
  const saved = await store.get(KEY, { type: "json", consistency: "strong" });
  if (!saved?.content?.recipes) return { content: cocktailDefaults, updatedAt: null, source: "defaults" };
  try {
    return { ...saved, content: validateCocktailRecipes(saved.content) };
  } catch (error) {
    console.error("Saved cocktail content is invalid; using defaults.", error);
    return { content: cocktailDefaults, updatedAt: null, source: "defaults-invalid-saved-data" };
  }
};

export default async request => {
  if (!originAllowed(request)) return jsonResponse(403, { ok: false, message: "Origin not allowed." });

  const secret = process.env.HOTLINE_ADMIN_SECRET;

  if (request.method === "GET") {
    const adminRequest = verifyAdminToken(getBearerToken(request), secret);
    try {
      const record = await readRecipes();
      const content = adminRequest ? record.content : {
        ...record.content,
        recipes: record.content.recipes.filter(recipe => recipe.published !== false),
      };
      return jsonResponse(200, { ok: true, ...record, content }, {
        "cache-control": adminRequest ? "no-store" : "public, max-age=15, stale-while-revalidate=60",
      });
    } catch (error) {
      console.error("Unable to read cocktail recipes.", error);
      return jsonResponse(200, { ok: true, content: cocktailDefaults, updatedAt: null, source: "defaults-fallback" });
    }
  }

  if (!verifyAdminToken(getBearerToken(request), secret)) {
    return jsonResponse(401, { ok: false, message: "Your admin session has expired. Please log in again." });
  }

  const store = getStore(STORE_NAME);

  if (request.method === "PUT") {
    let body;
    try { body = await request.json(); } catch { return jsonResponse(400, { ok: false, message: "Invalid JSON." }); }
    let content;
    try { content = validateCocktailRecipes(body?.content ?? body); }
    catch (error) { return jsonResponse(400, { ok: false, message: error.message || "Invalid recipe content." }); }

    const record = { content, updatedAt: new Date().toISOString(), source: "admin" };
    try {
      await store.setJSON(KEY, record);
      return jsonResponse(200, { ok: true, ...record });
    } catch (error) {
      console.error("Unable to save cocktail recipes.", error);
      return jsonResponse(500, { ok: false, message: "The cocktail recipes could not be saved." });
    }
  }

  if (request.method === "DELETE") {
    try {
      await store.delete(KEY);
      return jsonResponse(200, { ok: true, content: cocktailDefaults, updatedAt: null, source: "defaults" });
    } catch (error) {
      console.error("Unable to reset cocktail recipes.", error);
      return jsonResponse(500, { ok: false, message: "The cocktail recipes could not be reset." });
    }
  }

  return jsonResponse(405, { ok: false, message: "Method not allowed." });
};

export const config = { path: "/api/cocktail-recipes" };
