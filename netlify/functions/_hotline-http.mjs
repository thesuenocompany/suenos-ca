export const jsonResponse = (status, body, extraHeaders = {}) => new Response(JSON.stringify(body), {
  status,
  headers: {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    ...extraHeaders,
  },
});

export const originAllowed = request => {
  const requestOrigin = request.headers.get("origin");
  if (!requestOrigin) return true;
  const functionOrigin = new URL(request.url).origin.replace(/\/$/, "");
  const configured = [
    process.env.URL,
    process.env.DEPLOY_PRIME_URL,
    process.env.DEPLOY_URL,
    process.env.HOTLINE_ALLOWED_ORIGINS,
    "https://suenos.ca",
    "https://www.suenos.ca",
  ]
    .filter(Boolean)
    .flatMap(value => String(value).split(","))
    .map(value => value.trim().replace(/\/$/, ""))
    .filter(Boolean);
  return new Set([functionOrigin, ...configured]).has(requestOrigin.replace(/\/$/, ""));
};

export const cleanString = (value, max = 500) => String(value ?? "").trim().slice(0, max);

const cleanResponses = (source, key, fallbackAdvice = []) => {
  const list = Array.isArray(source?.[key]) ? source[key] : fallbackAdvice;
  return list.map(item => cleanString(item, 350)).filter(Boolean).slice(0, 100);
};

export const validateHotlineContent = input => {
  const output = {};
  for (const lang of ["en", "es"]) {
    const source = input?.[lang];
    if (!source || typeof source !== "object") throw new Error(`Missing ${lang} content.`);
    const oldAdvice = Array.isArray(source.advice) ? source.advice : [];
    const welcomeMessages = cleanResponses(source, "welcomeMessages", []);
    const responses1 = cleanResponses(source, "responses1", oldAdvice);
    const responses2 = cleanResponses(source, "responses2", oldAdvice);
    const responses3 = cleanResponses(source, "responses3", oldAdvice);
    if (!responses1.length || !responses2.length || !responses3.length) throw new Error(`${lang} needs at least one response in each option.`);
    output[lang] = {
      title: cleanString(source.title, 100),
      kicker: cleanString(source.kicker, 120),
      subtitle: cleanString(source.subtitle, 180),
      intro: cleanString(source.intro, 500),
      prompt1: cleanString(source.prompt1, 220),
      prompt2: cleanString(source.prompt2, 220),
      prompt3: cleanString(source.prompt3, 220),
      adviceLabel: cleanString(source.adviceLabel, 100),
      callLabel: cleanString(source.callLabel, 100),
      callNote: cleanString(source.callNote, 160),
      nextLabel: cleanString(source.nextLabel, 100),
      welcomeLabel: cleanString(source.welcomeLabel, 120),
      welcomeMessages,
      responses1,
      responses2,
      responses3,
    };
  }
  return output;
};
