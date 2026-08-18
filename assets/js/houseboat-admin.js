(() => {
  const TOKEN_KEY = "suenos-hotline-admin-token-v3";
  const token = () => sessionStorage.getItem(TOKEN_KEY) || "";
  const $ = (id) => document.getElementById(id);
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
  let cfg = null;
  const req = async (url, options = {}) => {
    const r = await fetch(url, {
      ...options,
      headers: {
        authorization: `Bearer ${token()}`,
        ...(options.body instanceof FormData
          ? {}
          : { "content-type": "application/json" }),
        ...(options.headers || {}),
      },
      cache: "no-store",
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw Error(d.message || "Request failed.");
    return d;
  };
  const setStatus = (msg, type = "") => {
    const el = $("houseboat-admin-status");
    if (!el) return;
    el.textContent = msg;
    el.className = `houseboat-admin-status ${type}`;
  };
  const parseLines = (id) =>
    ($(id)?.value || "")
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);
  function fill(c) {
    cfg = c;
    $("hb-admin-name").value = c.boatName || "";
    Object.entries(c.sectionCopy || {}).forEach(([k, v]) => {
      const el = $(`hb-admin-copy-${k}`);
      if (el) el.value = v || "";
    });
    $("hb-admin-eyebrow").value = c.eyebrow || "";
    $("hb-admin-headline").value = c.headline || "";
    $("hb-admin-intro").value = c.intro || "";
    $("hb-admin-primary").value = c.primaryCta || "";
    $("hb-admin-secondary").value = c.secondaryCta || "";
    $("hb-admin-hero").value = c.heroImage || "";
    $("hb-admin-mobile").value = c.heroMobileImage || "";
    $("hb-admin-og").value = c.ogImage || "";
    $("hb-admin-destination").value = c.formDestination || "";
    $("hb-admin-seo-title").value = c.seoTitle || "";
    $("hb-admin-seo-description").value = c.seoDescription || "";
    $("hb-admin-max").value = c.occupancy?.max || 22;
    $("hb-admin-fixed").value = c.occupancy?.fixedBeds || 18;
    $("hb-admin-staterooms").value = c.occupancy?.privateStaterooms || 5;
    $("hb-admin-bathrooms").value = c.occupancy?.bathrooms || 2;
    $("hb-admin-sqft").value = c.occupancy?.sqft || 2200;
    $("hb-admin-length").value = c.occupancy?.lengthFt || 70;
    $("hb-admin-width").value = c.occupancy?.widthFt || 16;
    $("hb-admin-sleep").value = (c.sleeping || [])
      .map((x) => `${x.title} | ${x.detail}`)
      .join("\n");
    $("hb-admin-costs").value = (c.additionalCosts || [])
      .map((x) => `${x.label} | ${x.value}`)
      .join("\n");
    $("hb-admin-faqs").value = (c.faqs || [])
      .map((x) => `${x.q} | ${x.a}`)
      .join("\n");
    $("hb-admin-amenities").value = Object.entries(c.amenities || {})
      .map(([k, v]) => `${k}: ${v.join("; ")}`)
      .join("\n");
    $("hb-admin-statuses").value = (c.bookingStatuses || []).join("\n");
    $("hb-admin-packages").value = (c.packages || [])
      .map((x) => (typeof x === "string" ? x : JSON.stringify(x)))
      .join("\n");
    const p = $("hb-admin-pricing");
    p.innerHTML = (c.seasons || [])
      .map(
        (s, i) =>
          `<div class="houseboat-admin-season" data-season="${i}"><div class="admin-field"><label>Season</label><input data-k="name" value="${esc(s.name)}"></div><div class="admin-field"><label>Dates</label><input data-k="dates" value="${esc(s.dates)}"></div><div class="admin-field"><label>Status</label><select data-k="status"><option value="current" ${s.status === "current" ? "selected" : ""}>Current</option><option value="starting" ${s.status === "starting" ? "selected" : ""}>Starting from</option><option value="sold_out" ${s.status === "sold_out" ? "selected" : ""}>Sold out</option><option value="call" ${s.status === "call" ? "selected" : ""}>Call for availability</option><option value="hidden" ${s.status === "hidden" ? "selected" : ""}>Hidden</option></select></div>${["3", "4", "7"].map((n) => `<div class="admin-field"><label>${n} nights</label><input type="number" data-rate="${n}" value="${Number(s.rates?.[n] || 0)}"></div>`).join("")}</div>`,
      )
      .join("");
    renderImages();
    renderCalendarRanges();
  }
  function renderImages() {
    const set = (id, url) => {
      $(id).innerHTML = url
        ? `<img src="${esc(url)}" alt="Preview">`
        : "No image uploaded yet";
    };
    set("hb-admin-hero-preview", cfg.heroImage);
    set("hb-admin-mobile-preview", cfg.heroMobileImage);
    set("hb-admin-og-preview", cfg.ogImage);
    const g = $("hb-admin-gallery");
    g.innerHTML = Array.from(
      { length: 6 },
      (_, i) =>
        `<div><div class="houseboat-admin-image-preview">${cfg.gallery?.[i] ? `<img src="${esc(cfg.gallery[i])}" alt="Gallery ${i + 1}">` : `Gallery ${i + 1}`}</div><input type="file" accept="image/jpeg,image/png,image/webp" data-gallery-file="${i}"><button type="button" class="admin-btn admin-btn-secondary" data-gallery-upload="${i}">${cfg.gallery?.[i] ? "Replace" : "Upload"}</button></div>`,
    ).join("");
  }
  function collect() {
    const c = structuredClone(cfg || {});
    c.sectionCopy = c.sectionCopy || {};
    [
      "experienceHeading",
      "experienceIntro",
      "sleepingHeading",
      "sleepingIntro",
      "amenitiesHeading",
      "pricingHeading",
      "pricingIntro",
      "formHeading",
      "formIntro",
      "finalHeading",
      "finalIntro",
    ].forEach((k) => {
      const el = $(`hb-admin-copy-${k}`);
      if (el) c.sectionCopy[k] = el.value.trim();
    });
    Object.assign(c, {
      boatName: $("hb-admin-name").value.trim(),
      eyebrow: $("hb-admin-eyebrow").value.trim(),
      headline: $("hb-admin-headline").value.trim(),
      intro: $("hb-admin-intro").value.trim(),
      primaryCta: $("hb-admin-primary").value.trim(),
      secondaryCta: $("hb-admin-secondary").value.trim(),
      heroImage: $("hb-admin-hero").value.trim(),
      heroMobileImage: $("hb-admin-mobile").value.trim(),
      ogImage: $("hb-admin-og").value.trim(),
      formDestination: $("hb-admin-destination").value.trim(),
      seoTitle: $("hb-admin-seo-title").value.trim(),
      seoDescription: $("hb-admin-seo-description").value.trim(),
    });
    c.occupancy = {
      max: Number($("hb-admin-max").value) || 22,
      fixedBeds: Number($("hb-admin-fixed").value) || 18,
      privateStaterooms: Number($("hb-admin-staterooms").value) || 5,
      bathrooms: Number($("hb-admin-bathrooms").value) || 2,
      sqft: Number($("hb-admin-sqft").value) || 2200,
      lengthFt: Number($("hb-admin-length").value) || 70,
      widthFt: Number($("hb-admin-width").value) || 16,
    };
    c.sleeping = parseLines("hb-admin-sleep").map((x) => {
      const [title, ...rest] = x.split("|");
      return { title: title.trim(), detail: rest.join("|").trim() };
    });
    c.additionalCosts = parseLines("hb-admin-costs").map((x) => {
      const [label, ...rest] = x.split("|");
      return { label: label.trim(), value: rest.join("|").trim() };
    });
    c.faqs = parseLines("hb-admin-faqs").map((x) => {
      const [q, ...rest] = x.split("|");
      return { q: q.trim(), a: rest.join("|").trim() };
    });
    c.amenities = {};
    parseLines("hb-admin-amenities").forEach((x) => {
      const [name, ...rest] = x.split(":");
      if (name)
        c.amenities[name.trim()] = rest
          .join(":")
          .split(";")
          .map((v) => v.trim())
          .filter(Boolean);
    });
    c.bookingStatuses = parseLines("hb-admin-statuses");
    c.packages = parseLines("hb-admin-packages");
    c.availability = c.availability || { ranges: [] };
    c.seasons = [...document.querySelectorAll("[data-season]")].map(
      (row, i) => ({
        key: cfg.seasons?.[i]?.key || `season-${i + 1}`,
        name: row.querySelector('[data-k="name"]').value.trim(),
        dates: row.querySelector('[data-k="dates"]').value.trim(),
        status: row.querySelector('[data-k="status"]').value,
        rates: Object.fromEntries(
          [...row.querySelectorAll("[data-rate]")].map((el) => [
            el.dataset.rate,
            Number(el.value) || 0,
          ]),
        ),
      }),
    );
    return c;
  }
  function renderCalendarRanges() {
    const wrap = $("hb-admin-calendar-ranges");
    if (!wrap || !cfg) return;
    const labels = {
      booked: "Booked",
      hold: "On hold",
      blocked: "Unavailable",
      maintenance: "Maintenance",
    };
    const ranges = [...(cfg.availability?.ranges || [])].sort((a, b) =>
      a.start.localeCompare(b.start),
    );
    wrap.innerHTML =
      ranges
        .map(
          (r) =>
            `<article class="houseboat-calendar-range"><div><strong>${esc(r.start)} → ${esc(r.end)}</strong><span class="houseboat-calendar-chip ${esc(r.status)}">${labels[r.status] || "Unavailable"}</span><small>${esc(r.note || "No internal note")}</small></div><button type="button" class="admin-btn admin-btn-secondary" data-calendar-remove="${esc(r.id)}">Remove</button></article>`,
        )
        .join("") ||
      "<p>No unavailable dates have been added. The calendar is currently open.</p>";
  }
  async function load() {
    try {
      setStatus("Loading…");
      const d = await req("/api/houseboat-content", {
        headers: { authorization: `Bearer ${token()}` },
      });
      fill(d.config);
      setStatus("Houseboat content loaded.", "success");
      await loadInquiries();
    } catch (e) {
      setStatus(e.message, "error");
    }
  }
  async function save() {
    try {
      setStatus("Saving…");
      const d = await req("/api/houseboat-content", {
        method: "POST",
        body: JSON.stringify({ config: collect() }),
      });
      fill(d.config);
      setStatus("Saved.", "success");
    } catch (e) {
      setStatus(e.message, "error");
    }
  }
  async function upload(file, kind) {
    if (!file) throw Error("Choose an image first.");
    const fd = new FormData();
    fd.append("file", file);
    fd.append("kind", kind);
    return req("/api/houseboat-assets", { method: "POST", body: fd });
  }
  async function loadInquiries() {
    const d = await req("/api/houseboat-admin?action=list");
    const wrap = $("houseboat-inquiry-list");
    wrap.innerHTML =
      (d.inquiries || [])
        .map(
          (x) =>
            `<article class="houseboat-inquiry-row"><div><strong>${esc(x.first_name)} ${esc(x.last_name)}</strong><small>${esc(x.email)} · ${esc(x.phone || "No phone")}</small></div><div><strong>${esc(x.preferred_departure || "—")}</strong><small>${x.trip_length} nights · ${Number(x.adults || 0) + Number(x.children || 0)} guests</small></div><div><strong>${esc(x.trip_type || "Trip")}</strong><small>${x.private_rooms_needed} private rooms</small></div><div><strong>${x.estimated_booking_value ? new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(x.estimated_booking_value) : "—"}</strong><small>base estimate</small></div><div><select data-inquiry-status="${x.id}">${(cfg.bookingStatuses || []).map((s) => `<option ${s === x.status ? "selected" : ""}>${esc(s)}</option>`).join("")}</select><textarea placeholder="Internal notes" data-inquiry-notes="${x.id}">${esc(x.internal_notes || "")}</textarea></div><button type="button" class="admin-btn admin-btn-secondary" data-inquiry-save="${x.id}">Save</button></article>`,
        )
        .join("") || "<p>No houseboat inquiries yet.</p>";
  }
  document.addEventListener("click", async (e) => {
    if (e.target.id === "houseboat-admin-save") return save();
    if (e.target.id === "hb-admin-cal-add") {
      const start = $("hb-admin-cal-start").value,
        end = $("hb-admin-cal-end").value || start;
      if (!start || !end || end < start)
        return setStatus("Choose a valid start and end date.", "error");
      cfg.availability = cfg.availability || { ranges: [] };
      cfg.availability.ranges = cfg.availability.ranges || [];
      cfg.availability.ranges.push({
        id: `range-${Date.now()}`,
        start,
        end,
        status: $("hb-admin-cal-status").value,
        note: $("hb-admin-cal-note").value.trim(),
      });
      $("hb-admin-cal-start").value = "";
      $("hb-admin-cal-end").value = "";
      $("hb-admin-cal-note").value = "";
      renderCalendarRanges();
      setStatus(
        "Date range added. Click Save changes to publish it.",
        "success",
      );
      return;
    }
    const removeRange = e.target.closest("[data-calendar-remove]");
    if (removeRange) {
      cfg.availability.ranges = (cfg.availability?.ranges || []).filter(
        (r) => r.id !== removeRange.dataset.calendarRemove,
      );
      renderCalendarRanges();
      setStatus(
        "Date range removed. Click Save changes to publish it.",
        "success",
      );
      return;
    }
    if (e.target.matches("[data-houseboat-tab]")) {
      document
        .querySelectorAll("[data-houseboat-tab]")
        .forEach((b) => b.classList.toggle("is-active", b === e.target));
      document
        .querySelectorAll("[data-houseboat-pane]")
        .forEach(
          (p) =>
            (p.hidden =
              p.dataset.houseboatPane !== e.target.dataset.houseboatTab),
        );
      return;
    }
    const up = e.target.closest("[data-houseboat-upload]");
    if (up) {
      try {
        up.disabled = true;
        up.textContent = "Uploading…";
        const type = up.dataset.houseboatUpload,
          file = $(`hb-admin-${type}-file`).files[0],
          d = await upload(file, type);
        cfg[
          `${type === "mobile" ? "heroMobileImage" : type === "hero" ? "heroImage" : "ogImage"}`
        ] = d.url;
        fill(cfg);
        setStatus("Image uploaded. Save content to publish it.", "success");
      } catch (err) {
        setStatus(err.message, "error");
      } finally {
        up.disabled = false;
        up.textContent = "Upload";
      }
    }
    const gu = e.target.closest("[data-gallery-upload]");
    if (gu) {
      const i = Number(gu.dataset.galleryUpload),
        file = document.querySelector(`[data-gallery-file="${i}"]`)?.files?.[0];
      try {
        gu.disabled = true;
        gu.textContent = "Uploading…";
        const d = await upload(file, `gallery-${i + 1}`);
        cfg.gallery = Array.isArray(cfg.gallery) ? cfg.gallery : [];
        cfg.gallery[i] = d.url;
        renderImages();
        setStatus(
          "Gallery image uploaded. Save content to publish it.",
          "success",
        );
      } catch (err) {
        setStatus(err.message, "error");
      } finally {
        gu.disabled = false;
        gu.textContent = "Upload";
      }
    }
    const saveInquiry = e.target.closest("[data-inquiry-save]");
    if (saveInquiry) {
      const id = saveInquiry.dataset.inquirySave;
      try {
        saveInquiry.disabled = true;
        saveInquiry.textContent = "Saving…";
        await req("/api/houseboat-admin?action=update", {
          method: "POST",
          body: JSON.stringify({
            id,
            status: document.querySelector(`[data-inquiry-status="${id}"]`)
              .value,
            internalNotes: document.querySelector(
              `[data-inquiry-notes="${id}"]`,
            ).value,
          }),
        });
        saveInquiry.textContent = "Saved";
        setTimeout(() => {
          saveInquiry.textContent = "Save";
          saveInquiry.disabled = false;
        }, 800);
      } catch (err) {
        saveInquiry.disabled = false;
        saveInquiry.textContent = "Save";
        setStatus(err.message, "error");
      }
    }
  });
  document.addEventListener("click", (e) => {
    if (e.target.dataset.adminTab === "houseboat") setTimeout(load, 50);
  });
  if (
    token() &&
    $("admin-section-houseboat") &&
    !$("admin-section-houseboat").hidden
  )
    load();
})();
