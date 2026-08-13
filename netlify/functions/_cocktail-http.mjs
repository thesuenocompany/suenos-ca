import { cleanString } from "./_hotline-http.mjs";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const cleanList = (value, maxItems, maxLength) => {
  if (!Array.isArray(value)) return [];
  return value.map(item => cleanString(item, maxLength)).filter(Boolean).slice(0, maxItems);
};

const cleanImage = value => {
  const image = cleanString(value, 700);
  if (!image) return "";
  if (image.startsWith("/assets/images/") || image.startsWith("/api/cocktail-images/") || /^https:\/\//i.test(image)) return image;
  throw new Error("Recipe images must use an uploaded image, an existing /assets/images/ file, or an https URL.");
};

const cleanHref = value => {
  const href = cleanString(value, 500);
  if (!href) return "";
  if (href.startsWith("/") || /^https:\/\//i.test(href)) return href;
  throw new Error("Extra action links must start with / or https://.");
};

const validateLocale = (source, lang, slug) => {
  if (!source || typeof source !== "object") throw new Error(`${slug} is missing ${lang} content.`);
  const name = cleanString(source.name, 100);
  const intro = cleanString(source.intro, 700);
  const ingredients = cleanList(source.ingredients, 40, 300);
  const steps = cleanList(source.steps, 30, 700);
  if (!name) throw new Error(`${slug} needs a ${lang} recipe name.`);
  if (!intro) throw new Error(`${name} needs a ${lang} introduction.`);
  if (!ingredients.length) throw new Error(`${name} needs at least one ${lang} ingredient.`);
  if (!steps.length) throw new Error(`${name} needs at least one ${lang} preparation step.`);

  const lastReviewed = cleanString(source.lastReviewed, 10);
  if (lastReviewed && !DATE_PATTERN.test(lastReviewed)) throw new Error(`${name} has an invalid review date.`);

  return {
    name,
    cardSummary: cleanString(source.cardSummary, 220) || intro,
    cardEyebrow: cleanString(source.cardEyebrow, 60),
    cardExtraLabel: cleanString(source.cardExtraLabel, 80),
    pageTitle: cleanString(source.pageTitle, 160) || `${name} | Sueños Tequila`,
    metaDescription: cleanString(source.metaDescription, 300) || intro,
    eyebrow: cleanString(source.eyebrow, 80) || (lang === "es" ? "Cóctel de Tequila" : "Tequila Cocktail"),
    tagline: cleanString(source.tagline, 260),
    intro,
    glassware: cleanString(source.glassware, 120),
    difficulty: cleanString(source.difficulty, 80),
    time: cleanString(source.time, 80),
    garnish: cleanString(source.garnish, 160),
    serves: cleanString(source.serves, 80) || (lang === "es" ? "1 cóctel" : "1 cocktail"),
    ingredients,
    steps,
    tip: cleanString(source.tip, 400),
    imageAlt: cleanString(source.imageAlt, 160) || name,
    lastReviewed: lastReviewed || new Date().toISOString().slice(0, 10),
    extraActionLabel: cleanString(source.extraActionLabel, 120),
    extraActionHref: cleanHref(source.extraActionHref),
  };
};

export const validateCocktailRecipes = input => {
  const recipes = Array.isArray(input?.recipes) ? input.recipes : Array.isArray(input) ? input : null;
  if (!recipes) throw new Error("Recipes must be provided as a list.");
  if (recipes.length > 60) throw new Error("A maximum of 60 cocktail recipes is supported.");

  const seen = new Set();
  const output = recipes.map((source, index) => {
    if (!source || typeof source !== "object") throw new Error(`Recipe ${index + 1} is invalid.`);
    const slug = cleanString(source.slug, 80).toLowerCase();
    if (!SLUG_PATTERN.test(slug)) throw new Error(`Recipe ${index + 1} needs a lowercase URL slug using letters, numbers and hyphens.`);
    if (seen.has(slug)) throw new Error(`The recipe slug “${slug}” is duplicated.`);
    seen.add(slug);
    const image = cleanImage(source.image);
    if (!image) throw new Error(`${slug} needs a cocktail image.`);

    return {
      slug,
      published: source.published !== false,
      system: source.system === true,
      order: index,
      image,
      en: validateLocale(source.en, "en", slug),
      es: validateLocale(source.es, "es", slug),
    };
  });

  return { version: 1, recipes: output };
};
