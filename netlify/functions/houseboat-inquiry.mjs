import { jsonResponse, originAllowed } from "./_hotline-http.mjs";
import { DEFAULT_HOUSEBOAT_CONFIG } from "./_houseboat-defaults.mjs";
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
const clean = (v, n = 1000) =>
  String(v ?? "")
    .trim()
    .slice(0, n);
const money = (n) =>
  new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(Number(n) || 0);
const estimate = (cfg, date, length) => {
  const d = date ? new Date(`${date}T12:00:00`) : null;
  if (!d || Number.isNaN(d.getTime())) return null;
  const md = (d.getMonth() + 1) * 100 + d.getDate();
  let key = "low";
  if (md >= 625 && md <= 815) key = "peak";
  else if ((md >= 607 && md <= 624) || (md >= 816 && md <= 905)) key = "mid";
  const season = (cfg.seasons || []).find((s) => s.key === key);
  return season?.rates?.[String(length)] ?? null;
};
const tripAvailable = (cfg, start, nights) => {
  const d = new Date(`${start}T12:00:00`);
  for (let i = 0; i < Number(nights); i++) {
    const day = new Date(d);
    day.setDate(d.getDate() + i);
    const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
    if (
      (cfg.availability?.ranges || []).some(
        (r) => key >= r.start && key <= r.end,
      )
    )
      return false;
  }
  return true;
};
export default async (request) => {
  if (request.method !== "POST")
    return jsonResponse(405, { ok: false, message: "Method not allowed." });
  if (!originAllowed(request))
    return jsonResponse(403, { ok: false, message: "Origin not allowed." });
  try {
    const body = await request.json().catch(() => ({}));
    if (clean(body.website, 100)) return jsonResponse(202, { ok: true });
    const adults = Math.max(0, Number(body.adults) || 0),
      children = Math.max(0, Number(body.children) || 0),
      group = adults + children;
    const length = Number(body.tripLength),
      rooms = Number(body.privateRoomsNeeded) || 0;
    if (
      !clean(body.firstName, 80) ||
      !clean(body.lastName, 80) ||
      !/^\S+@\S+\.\S+$/.test(clean(body.email, 254)) ||
      !body.preferredDeparture ||
      ![3, 4, 7].includes(length) ||
      group < 1 ||
      group > 22 ||
      rooms < 0 ||
      rooms > 5
    )
      return jsonResponse(400, {
        ok: false,
        message: "Please check the required trip and contact details.",
      });
    const cfgRow = (
      await sb("houseboat_content?id=eq.houseboat&select=config&limit=1").catch(
        () => [],
      )
    )?.[0];
    const cfg = { ...DEFAULT_HOUSEBOAT_CONFIG, ...(cfgRow?.config || {}) };
    if (
      !Boolean(body.flexibleDates) &&
      !tripAvailable(cfg, body.preferredDeparture, length)
    )
      return jsonResponse(409, {
        ok: false,
        message:
          "Those dates are no longer available. Please choose another date or tell us your dates are flexible.",
      });
    const estimated = estimate(cfg, body.preferredDeparture, length);
    const record = {
      preferred_departure: body.preferredDeparture,
      flexible_dates: Boolean(body.flexibleDates),
      trip_length: length,
      adults,
      children,
      private_rooms_needed: rooms,
      trip_type: clean(body.tripType, 120),
      first_name: clean(body.firstName, 80),
      last_name: clean(body.lastName, 80),
      email: clean(body.email, 254).toLowerCase(),
      phone: clean(body.phone, 60),
      questions: clean(body.questions, 3000),
      status: "New",
      estimated_booking_value: estimated,
      utm_source: clean(body.utmSource, 120),
      utm_medium: clean(body.utmMedium, 120),
      utm_campaign: clean(body.utmCampaign, 160),
      utm_content: clean(body.utmContent, 160),
      referrer: clean(body.referrer, 500),
    };
    const created = (
      await sb("houseboat_inquiries", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(record),
      })
    )?.[0];
    const apiKey = process.env.RESEND_API_KEY;
    const destination = clean(cfg.formDestination || "sales@suenos.ca", 254);
    if (apiKey && destination) {
      const subject = `Houseboat inquiry · ${record.preferred_departure} · ${group} guests`;
      const text = `New Sueños Houseboat inquiry\n\n${record.first_name} ${record.last_name}\n${record.email}\n${record.phone || "No phone"}\n\nDeparture: ${record.preferred_departure}\nFlexible: ${record.flexible_dates ? "Yes" : "No"}\nTrip: ${length} nights\nGuests: ${group}\nPrivate rooms needed: ${rooms}\nType: ${record.trip_type || "Not specified"}\nEstimated base charter: ${estimated ? money(estimated) : "Not calculated"}\n\nQuestions:\n${record.questions || "None"}\n`;
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          from:
            process.env.CONTACT_FROM_EMAIL ||
            "Sueños Website <sales@suenos.ca>",
          to: [destination],
          reply_to: record.email,
          subject,
          text,
        }),
      }).catch(() => {});
    }
    return jsonResponse(201, {
      ok: true,
      id: created?.id,
      estimatedBase: estimated,
      message:
        "WE’VE GOT YOUR TRIP DETAILS. We’ll confirm availability, exact pricing and the next booking step. Submitting this form does not reserve the boat.",
    });
  } catch (error) {
    console.error("houseboat-inquiry", error);
    return jsonResponse(500, {
      ok: false,
      message: "We could not save your trip details. Please try again.",
    });
  }
};
export const config = { path: "/api/houseboat-inquiry" };
