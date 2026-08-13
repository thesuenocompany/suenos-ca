import type { Config, Context } from "@netlify/edge-functions";

function esc(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function absoluteUrl(value: string, origin: string): string {
  if (!value) return `${origin}/assets/images/hero-poster-desktop.webp`;
  try {
    return new URL(value, origin).toString();
  } catch {
    return `${origin}/assets/images/hero-poster-desktop.webp`;
  }
}

function stripExistingMeta(html: string): string {
  return html
    .replace(/<meta[^>]+property=["']og:[^>]+>\s*/gi, "")
    .replace(/<meta[^>]+name=["']twitter:[^>]+>\s*/gi, "")
    .replace(/<link[^>]+rel=["']canonical["'][^>]*>\s*/gi, "");
}

export default async (request: Request, context: Context) => {
  const url = new URL(request.url);
  const match = url.pathname.match(/^\/en-ca\/contests\/([^/]+)\/?$/i);
  if (!match || match[1].toLowerCase() === "contest") return context.next();

  const response = await context.next();
  const contentType = response.headers.get("content-type") || "";
  if (!response.ok || !contentType.includes("text/html")) return response;

  const serviceKey = Netlify.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const supabaseUrl = (Netlify.env.get("SUPABASE_URL") || "https://dowfjjthshbbgnvwxzjv.supabase.co").replace(/\/$/, "");
  if (!serviceKey) return response;

  const slug = decodeURIComponent(match[1]).slice(0, 120);
  try {
    const query = new URL(`${supabaseUrl}/rest/v1/contests`);
    query.searchParams.set("slug", `eq.${slug}`);
    query.searchParams.set("status", "eq.published");
    query.searchParams.set("select", "public_name,headline,intro_copy,prize_title,desktop_hero_url,mobile_hero_url,hero_alt");
    query.searchParams.set("limit", "1");

    const contestResponse = await fetch(query, {
      headers: {
        apikey: serviceKey,
        authorization: `Bearer ${serviceKey}`,
      },
    });
    if (!contestResponse.ok) return response;
    const rows = await contestResponse.json();
    const contest = rows?.[0];
    if (!contest) return response;

    const pageUrl = `${url.origin}/en-ca/contests/${encodeURIComponent(slug)}/`;
    const title = contest.public_name
      ? `${contest.public_name} | Sueños Artisan Tequila`
      : "Sueños Contest | Sueños Artisan Tequila";
    const description = contest.intro_copy || contest.headline || contest.prize_title || "Enter for a chance to win from Sueños Artisan Tequila.";
    const image = absoluteUrl(contest.desktop_hero_url || contest.mobile_hero_url, url.origin);
    const alt = contest.hero_alt || contest.public_name || "Sueños contest image";

    let html = stripExistingMeta(await response.text());
    const tags = `
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(pageUrl)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Sueños Artisan Tequila">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(pageUrl)}">
<meta property="og:image" content="${esc(image)}">
<meta property="og:image:secure_url" content="${esc(image)}">
<meta property="og:image:alt" content="${esc(alt)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${esc(image)}">
<meta name="twitter:image:alt" content="${esc(alt)}">`;

    html = html.replace(/<title>.*?<\/title>/is, "");
    html = html.replace("</head>", `${tags}\n</head>`);

    const headers = new Headers(response.headers);
    headers.delete("content-length");
    headers.set("cache-control", "public, max-age=0, must-revalidate");
    return new Response(html, { status: response.status, headers });
  } catch (error) {
    console.error("contest-social-meta", error);
    return response;
  }
};

export const config: Config = {
  path: "/en-ca/contests/*",
};
