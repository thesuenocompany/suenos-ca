(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const money = (v) =>
    new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
      maximumFractionDigits: 0,
    }).format(Number(v) || 0);
  let cfg = null;
  let calendarMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1,
  );
  const esc = (s) =>
    String(s ?? "").replace(
      /[&<>"']/g,
      (m) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[m],
    );
  function track(name, extra = {}) {
    window.gtag?.("event", name, { ...extra, page_location: location.href });
    fetch("/api/analytics-diagnostics", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        path: location.pathname,
        title: document.title,
        utm_source:
          new URLSearchParams(location.search).get("utm_source") || "",
        utm_medium:
          new URLSearchParams(location.search).get("utm_medium") || "",
        utm_campaign:
          new URLSearchParams(location.search).get("utm_campaign") || "",
        utm_content:
          new URLSearchParams(location.search).get("utm_content") || "",
        event: name,
        device: matchMedia("(max-width:720px)").matches ? "mobile" : "desktop",
        language: "en-CA",
      }),
      keepalive: true,
    }).catch(() => {});
  }
  function seasonFor(date) {
    if (!date) return null;
    const d = new Date(date + "T12:00:00");
    const md = (d.getMonth() + 1) * 100 + d.getDate();
    const key =
      md >= 625 && md <= 815
        ? "peak"
        : (md >= 607 && md <= 624) || (md >= 816 && md <= 905)
          ? "mid"
          : "low";
    return cfg.seasons.find((s) => s.key === key) || null;
  }
  const iso = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const rangeFor = (date) =>
    (cfg.availability?.ranges || []).find(
      (r) => date >= r.start && date <= r.end,
    ) || null;
  function tripAvailable(start, nights) {
    if (!start) return true;
    const d = new Date(`${start}T12:00:00`);
    for (let i = 0; i < Number(nights); i++) {
      const day = new Date(d);
      day.setDate(d.getDate() + i);
      if (rangeFor(iso(day))) return false;
    }
    return true;
  }
  function renderCalendar() {
    const grid = $("[data-hb-cal-grid]"),
      title = $("[data-hb-cal-title]");
    if (!grid || !cfg) return;
    title.textContent = calendarMonth.toLocaleDateString("en-CA", {
      month: "long",
      year: "numeric",
    });
    const year = calendarMonth.getFullYear(),
      month = calendarMonth.getMonth(),
      first = new Date(year, month, 1),
      days = new Date(year, month + 1, 0).getDate(),
      today = iso(new Date());
    const cells = Array.from(
      { length: first.getDay() },
      () => '<span class="hb-cal-empty"></span>',
    );
    for (let n = 1; n <= days; n++) {
      const d = new Date(year, month, n),
        key = iso(d),
        r = rangeFor(key),
        past = key < today,
        cls = r
          ? r.status === "hold"
            ? "hold"
            : "unavailable"
          : past
            ? "past"
            : "available",
        label = r
          ? cfg.availability?.statusLabels?.[r.status] || "Unavailable"
          : past
            ? "Past"
            : "Available";
      cells.push(
        `<button type="button" class="hb-cal-day ${cls}" data-hb-date="${key}" ${r || past ? "disabled" : ""} aria-label="${key}: ${esc(label)}"><span>${n}</span>${r ? `<small>${esc(label)}</small>` : ""}</button>`,
      );
    }
    grid.innerHTML = cells.join("");
  }
  function render() {
    document.title = cfg.seoTitle;
    const desc = $('meta[name="description"]');
    if (desc) desc.content = cfg.seoDescription;
    const og = $('meta[property="og:image"]');
    if (og && cfg.ogImage)
      og.content = new URL(cfg.ogImage, location.origin).href;
    $("[data-hb-eyebrow]").textContent = cfg.eyebrow;
    $("[data-hb-headline]").innerHTML = cfg.headline
      .split("\n")
      .map((x) => `<span>${esc(x)}</span>`)
      .join("");
    $("[data-hb-intro]").textContent = cfg.intro;
    $("[data-hb-primary]").textContent = cfg.primaryCta;
    $("[data-hb-secondary]").textContent = cfg.secondaryCta;
    $$("[data-hb-copy]").forEach((el) => {
      const key = el.dataset.hbCopy;
      if (cfg.sectionCopy?.[key]) {
        if (key === "finalHeading")
          el.innerHTML = esc(cfg.sectionCopy[key]).replace(/\n/g, "<br>");
        else el.textContent = cfg.sectionCopy[key];
      }
    });
    const hero = $("[data-hb-hero-media]");
    hero.innerHTML = cfg.heroImage
      ? `<picture>${cfg.heroMobileImage ? `<source media="(max-width:720px)" srcset="${esc(cfg.heroMobileImage)}">` : ""}<img src="${esc(cfg.heroImage)}" alt="${esc(cfg.boatName)} on Shuswap Lake"></picture>`
      : '<div class="hb-hero-placeholder" aria-hidden="true"></div>';
    const o = cfg.occupancy;
    $("[data-hb-facts]").innerHTML = [
      [`Up to ${o.max}`, "guests"],
      [o.privateStaterooms, "private staterooms"],
      [o.bathrooms, "full bathrooms"],
      ["8-person", "hot tub"],
      ["Waterslide", "out back"],
      [`${Number(o.sqft).toLocaleString()} sq. ft.`, "floating resort"],
    ]
      .map(([a, b]) => `<div><strong>${a}</strong><span>${b}</span></div>`)
      .join("");
    const gallery = $("[data-hb-gallery]");
    const imgs = (cfg.gallery || []).filter(Boolean).slice(0, 5);
    gallery.innerHTML = (imgs.length ? imgs : ["", "", ""])
      .map(
        (src, i) =>
          `<figure>${src ? `<img src="${esc(src)}" alt="${esc(cfg.boatName)} gallery photo ${i + 1}" loading="lazy">` : `<div class="hb-gallery-placeholder">Approved houseboat photography can be uploaded in Admin.</div>`}</figure>`,
      )
      .join("");
    $("[data-hb-sleep]").innerHTML = cfg.sleeping
      .map(
        (x) =>
          `<article class="hb-sleep-card"><h3>${esc(x.title)}</h3><p>${esc(x.detail)}</p></article>`,
      )
      .join("");
    $("[data-hb-sleep-summary]").innerHTML =
      `<div><strong>${o.fixedBeds}</strong><span>sleep in fixed beds</span></div><div><strong>${o.max}</strong><span>maximum overnight occupancy</span></div><div><strong>${o.privateStaterooms}</strong><span>private staterooms</span></div>`;
    $("[data-hb-amenities]").innerHTML = Object.entries(cfg.amenities)
      .map(
        ([name, items]) =>
          `<section class="hb-amenity-group"><h3>${esc(name)}</h3><ul>${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul></section>`,
      )
      .join("");
    const visible = cfg.seasons.filter((s) => s.status !== "hidden");
    $("[data-hb-pricing]").innerHTML = visible
      .map(
        (s) =>
          `<tr><td><span class="hb-season-name">${esc(s.name)}</span><span class="hb-season-dates">${esc(s.dates)}</span><span class="hb-price-status ${esc(s.status)}">${s.status === "starting" ? "Starting from" : s.status === "sold_out" ? "Sold out" : s.status === "call" ? "Call for availability" : "Current"}</span></td>${["3", "4", "7"].map((n) => `<td>${s.status === "sold_out" ? "—" : money(s.rates[n])}</td>`).join("")}</tr>`,
      )
      .join("");
    $("[data-hb-costs]").innerHTML = cfg.additionalCosts
      .map(
        (x) =>
          `<article class="hb-cost-card"><h4>${esc(x.label)}</h4><p>${esc(x.value)}</p></article>`,
      )
      .join("");
    $("[data-hb-faq]").innerHTML = cfg.faqs
      .map(
        (x) =>
          `<details><summary>${esc(x.q)}</summary><p>${esc(x.a)}</p></details>`,
      )
      .join("");
    renderCalendar();
    updateValue();
    updateSummary();
  }
  function updateValue() {
    const season = $("#hb-value-season")?.value || "peak",
      nights = $("#hb-value-nights")?.value || "3",
      guests = Math.min(
        22,
        Math.max(1, Number($("#hb-value-guests")?.value) || 22),
      ),
      s = cfg?.seasons.find((x) => x.key === season);
    if (!s) return;
    const base = Number(s.rates[nights]) || 0;
    $("[data-hb-base]").textContent = money(base);
    $("[data-hb-per-person]").textContent = money(base / guests);
    $("[data-hb-per-night]").textContent = money(
      base / guests / Number(nights),
    );
    $("[data-hb-value-copy]").textContent =
      `${s.name} · ${nights} nights · ${guests} guests`;
  }
  function updateSummary() {
    const form = $("#hb-trip-form");
    if (!form || !cfg) return;
    const fd = new FormData(form),
      adults = Number(fd.get("adults") || 0),
      group = adults,
      date = String(fd.get("preferredDeparture") || ""),
      nights = Number(fd.get("tripLength") || 3),
      season = seasonFor(date),
      rate = season?.rates?.[String(nights)] || 0,
      available = tripAvailable(date, nights);
    $("[data-hb-summary]").innerHTML =
      `<h3>Your trip so far</h3><p><strong>${date || "Choose a departure date"}</strong> · ${nights} nights · ${group || 0} guests · ${Number(fd.get("privateRoomsNeeded") || 0)} private rooms requested</p>${date && !available ? '<p class="hb-date-warning">Those dates overlap an unavailable day. Choose another departure date or select flexible dates.</p>' : rate ? `<p>Published base rental example: <strong>${money(rate)}</strong>. Taxes, fees, fuel and pump-out are additional.</p>` : "<p>Choose a date to see the current base rental example.</p>"}`;
  }
  function dateLabel(value) {
    if (!value) return "";
    return new Date(`${value}T12:00:00`).toLocaleDateString("en-CA", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }
  function departureDate(start, nights) {
    const d = new Date(`${start}T12:00:00`);
    d.setDate(d.getDate() + Number(nights));
    return iso(d);
  }
  function resetDateCheck() {
    const details = $("[data-hb-details]");
    if (details) details.hidden = true;
    const result = $("[data-hb-availability-result]");
    if (result) {
      result.className = "hb-availability-result";
      result.innerHTML =
        "<p>Click <strong>Check these dates</strong> to see availability and pricing.</p>";
    }
  }
  function checkDates() {
    const date = $("#hb-check-date")?.value || "",
      nights = Number($("#hb-check-length")?.value || 3),
      result = $("[data-hb-availability-result]"),
      details = $("[data-hb-details]");
    if (!date) {
      result.className = "hb-availability-result is-unavailable";
      result.innerHTML =
        "<h3>CHOOSE A DEPARTURE DATE</h3><p>Pick an available day from the calendar or enter one above.</p>";
      details.hidden = true;
      return;
    }
    const available = tripAvailable(date, nights),
      season = seasonFor(date),
      rate = Number(season?.rates?.[String(nights)] || 0),
      checkout = departureDate(date, nights);
    if (!available) {
      result.className = "hb-availability-result is-unavailable";
      result.innerHTML = `<h3>THOSE DATES AREN’T OPEN.</h3><p>${esc(dateLabel(date))} through ${esc(dateLabel(checkout))} overlaps a booked, held or unavailable date.</p><strong>Try another green date. We won’t make you fill out a thing.</strong>`;
      details.hidden = true;
      track("houseboat_dates_unavailable", { departure: date, nights });
      return;
    }
    result.className = "hb-availability-result is-available";
    result.innerHTML = `<div class="hb-result-stamp">AVAILABLE</div><h3>THE BOAT IS OPEN.</h3><p><strong>${esc(dateLabel(date))}</strong> to <strong>${esc(dateLabel(checkout))}</strong> · ${nights} nights</p>${rate ? `<p class="hb-result-price">Estimated base rental: <strong>${money(rate)}</strong></p>` : ""}<p class="hb-disclaimer">Taxes and additional trip costs are not included. Dates remain available until a hold or booking is confirmed.</p><button class="hb-btn hb-btn--primary" type="button" data-hb-continue>CONTINUE WITH THESE DATES</button>`;
    $("#hb-date").value = date;
    $("#hb-length").value = String(nights);
    const selected = $("[data-hb-selected-dates]");
    if (selected)
      selected.innerHTML = `<span>YOUR DATES</span><strong>${esc(dateLabel(date))} → ${esc(dateLabel(checkout))}</strong><button type="button" data-hb-change-dates>Change dates</button>`;
    updateSummary();
    track("houseboat_dates_available", {
      departure: date,
      nights,
      base_rate: rate,
    });
  }
  async function submit(form) {
    const status = $("[data-hb-form-status]"),
      button = form.querySelector("button[type=submit]"),
      fd = new FormData(form),
      payload = Object.fromEntries(fd.entries());
    payload.flexibleDates = fd.get("flexibleDates") === "yes";
    const adults = Number(payload.adults);
    if (adults > 22) {
      status.className = "hb-form-status error";
      status.textContent = "Maximum overnight occupancy is 22 guests.";
      return;
    }
    if (
      !tripAvailable(payload.preferredDeparture, payload.tripLength) &&
      !payload.flexibleDates
    ) {
      status.className = "hb-form-status error";
      status.textContent =
        "Those dates are unavailable. Choose another date or tell us your dates are flexible.";
      return;
    }
    const p = new URLSearchParams(location.search);
    Object.assign(payload, {
      utmSource: p.get("utm_source"),
      utmMedium: p.get("utm_medium"),
      utmCampaign: p.get("utm_campaign"),
      utmContent: p.get("utm_content"),
      referrer: document.referrer,
    });
    button.disabled = true;
    button.textContent = "CHECKING…";
    status.className = "hb-form-status";
    status.textContent = "Saving your trip details…";
    try {
      const r = await fetch("/api/houseboat-inquiry", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw Error(d.message || "Could not submit inquiry.");
      track("houseboat_form_complete", {
        trip_length: payload.tripLength,
        group_size: adults,
      });
      sessionStorage.removeItem("suenos-houseboat-form-v1");
      form.innerHTML = `<div class="hb-form-status success"><h2>WE’VE GOT YOUR TRIP DETAILS.</h2><p>${esc(d.message || "We’ll confirm availability, exact pricing and the next booking step.")}</p><a class="hb-btn hb-btn--primary" href="#top">BACK TO PARADISE</a></div>`;
    } catch (e) {
      status.className = "hb-form-status error";
      status.textContent = e.message;
      button.disabled = false;
      button.textContent = "CHECK MY DATES";
    }
  }
  async function init() {
    try {
      const r = await fetch("/api/houseboat-content", { cache: "no-store" }),
        d = await r.json();
      cfg = d.config;
      render();
    } catch {
      console.error("Houseboat content unavailable");
      return;
    }
    const form = $("#hb-trip-form");
    const saved = sessionStorage.getItem("suenos-houseboat-form-v1");
    if (saved && form) {
      try {
        const o = JSON.parse(saved);
        Object.entries(o).forEach(([k, v]) => {
          const el = form.elements[k];
          if (el) el.value = v;
        });
      } catch {}
      updateSummary();
    }
    form?.addEventListener("input", () => {
      const data = Object.fromEntries(new FormData(form).entries());
      sessionStorage.setItem("suenos-houseboat-form-v1", JSON.stringify(data));
      updateSummary();
    });
    form?.addEventListener("submit", (e) => {
      e.preventDefault();
      submit(form);
    });
    $("#hb-check-availability")?.addEventListener("click", checkDates);
    $("#hb-check-date")?.addEventListener("change", resetDateCheck);
    $("#hb-check-length")?.addEventListener("change", resetDateCheck);
    $("[data-hb-availability-result]")?.addEventListener("click", (e) => {
      if (!e.target.closest("[data-hb-continue]")) return;
      const details = $("[data-hb-details]");
      details.hidden = false;
      details.scrollIntoView({ behavior: "smooth", block: "start" });
      track("houseboat_details_revealed");
    });
    $("[data-hb-details]")?.addEventListener("click", (e) => {
      if (!e.target.closest("[data-hb-change-dates]")) return;
      resetDateCheck();
      $("#hb-check-date").scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });
    $("[data-hb-cal-prev]")?.addEventListener("click", () => {
      calendarMonth = new Date(
        calendarMonth.getFullYear(),
        calendarMonth.getMonth() - 1,
        1,
      );
      renderCalendar();
    });
    $("[data-hb-cal-next]")?.addEventListener("click", () => {
      calendarMonth = new Date(
        calendarMonth.getFullYear(),
        calendarMonth.getMonth() + 1,
        1,
      );
      renderCalendar();
    });
    $("[data-hb-cal-grid]")?.addEventListener("click", (e) => {
      const b = e.target.closest("[data-hb-date]");
      if (!b || b.disabled) return;
      const input = $("#hb-date");
      const checker = $("#hb-check-date");
      checker.value = b.dataset.hbDate;
      resetDateCheck();
      checker.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    $$("#hb-value-season,#hb-value-nights,#hb-value-guests").forEach((el) =>
      el.addEventListener("input", updateValue),
    );
    $$("[data-hb-track]").forEach((a) =>
      a.addEventListener("click", () =>
        track(a.dataset.hbTrack || "houseboat_cta_click", {
          label: a.textContent.trim(),
        }),
      ),
    );
    form?.addEventListener("focusin", () => {
      if (!form.dataset.started) {
        form.dataset.started = "1";
        track("houseboat_form_start");
      }
    });
  }
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", init);
  else init();
})();
