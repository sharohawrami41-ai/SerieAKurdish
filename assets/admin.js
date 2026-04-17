/* ============================================================
   Seria Ay - in-page admin CRUD editor
   Works on all pages. Visible only when admin is logged in.
   Saves edits to localStorage overlay -> applies on next load.
   ============================================================ */

(function () {
  // ---------- Schemas ----------
  // Each schema describes the fields of an editable item type.
  const TEAM_CODES = () => Object.keys(window.SA.teams || {});
  const teamOptions = () => TEAM_CODES().map(c => ({ value: c, label: (window.SA.teams[c]?.name || c) + " (" + c + ")" }));

  const SCHEMAS = {
    news: {
      label: "هەواڵ",
      path: ["news"],
      idField: "id",
      fields: [
        { key: "title", label: "سەردێر", type: "text", required: true },
        { key: "category", label: "جۆر", type: "text" },
        { key: "image", label: "بەستەری وێنە (URL)", type: "text" },
        { key: "date", label: "بەروار", type: "text" },
        { key: "excerpt", label: "پوختە", type: "textarea" },
        { key: "body", label: "ناوەڕۆک", type: "textarea" }
      ],
      newItem: () => ({ id: "n" + Date.now(), title: "", category: "", image: "", date: "", excerpt: "", body: "" })
    },

    scorer: {
      label: "گۆڵکار",
      path: ["topScorers"],
      idField: null, // index based
      fields: [
        { key: "name", label: "ناوی یاریزان", type: "text", required: true },
        { key: "team", label: "تیم", type: "select", optionsFn: teamOptions, required: true },
        { key: "goals", label: "گۆڵ", type: "number", required: true },
        { key: "assists", label: "ئەسیست", type: "number" }
      ],
      newItem: () => ({ name: "", team: "INT", goals: 0, assists: 0 })
    },

    assist: {
      label: "ئەسیست",
      path: ["topAssists"],
      idField: null,
      fields: [
        { key: "name", label: "ناوی یاریزان", type: "text", required: true },
        { key: "team", label: "تیم", type: "select", optionsFn: teamOptions, required: true },
        { key: "assists", label: "ئەسیست", type: "number", required: true }
      ],
      newItem: () => ({ name: "", team: "INT", assists: 0 })
    },

    tableRow: {
      label: "ڕیزبەندی",
      path: ["table"],
      idField: null,
      fields: [
        { key: "team", label: "تیم", type: "select", optionsFn: teamOptions, required: true },
        { key: "p", label: "یاری", type: "number", required: true },
        { key: "w", label: "بردنەوە", type: "number", required: true },
        { key: "d", label: "یەکسانی", type: "number", required: true },
        { key: "l", label: "دۆڕان", type: "number", required: true },
        { key: "gf", label: "گۆڵی بزوێنراو", type: "number", required: true },
        { key: "ga", label: "گۆڵی لێکراو", type: "number", required: true },
        { key: "pts", label: "خاڵ", type: "number", required: true }
      ],
      newItem: () => ({ team: "INT", p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 })
    },

    alltimeRecord: {
      label: "ڕێکۆردی مێژوویی",
      path: ["records", "allTime"],
      idField: null,
      fields: [
        { key: "label", label: "ناوی ڕێکۆرد", type: "text", required: true },
        { key: "value", label: "بەها", type: "text", required: true },
        { key: "name", label: "ناوی خاوەن ڕێکۆرد", type: "text", required: true },
        { key: "years", label: "ساڵەکان", type: "text" }
      ],
      newItem: () => ({ label: "", value: "", name: "", years: "" })
    },

    uniqueRecord: {
      label: "ڕێکۆردی تایبەت",
      path: ["records", "unique"],
      idField: null,
      fields: [
        { key: "label", label: "ناوی ڕێکۆرد", type: "text", required: true },
        { key: "value", label: "بەها", type: "text", required: true },
        { key: "name", label: "خاوەن / کۆنتێکست", type: "text", required: true },
        { key: "year", label: "ساڵ", type: "text" }
      ],
      newItem: () => ({ label: "", value: "", name: "", year: "" })
    },

    fixtureWeek: {
      label: "هەفتە",
      path: null, // special: nested under fixtures[]
      idField: null,
      fields: [
        { key: "week", label: "ژمارەی هەفتە", type: "number", required: true },
        { key: "dateRange", label: "ماوەی بەروار (وەک 2026-03-21 → 2026-03-23)", type: "text" }
      ],
      newItem: () => ({ week: 1, dateRange: "" })
    },

    fixtureMatch: {
      label: "یاری",
      path: null, // handled specially (nested under weeks)
      idField: "id",
      fields: [
        { key: "week", label: "هەفتە (ژمارە)", type: "number", required: true, _meta: true },
        { key: "home", label: "تیمی ماڵەوە", type: "select", optionsFn: teamOptions, required: true },
        { key: "away", label: "تیمی میوان", type: "select", optionsFn: teamOptions, required: true },
        { key: "date", label: "بەروار", type: "text" },
        { key: "time", label: "کات", type: "text" },
        { key: "venue", label: "شوێن", type: "text" },
        { key: "status", label: "دۆخ", type: "select", options: [{ value: "upcoming", label: "داهاتوو" }, { value: "finished", label: "تەواوبوو" }] },
        { key: "scoreH", label: "گۆڵی ماڵەوە (تۆمار)", type: "number" },
        { key: "scoreA", label: "گۆڵی میوان (تۆمار)", type: "number" },
        { key: "events", label: "ڕووداوەکان (هەر یەکێک لە دێڕێک)", type: "textarea" },
        { key: "lineupHome", label: "ریزبەندی ماڵەوە (هەر یاریزان لە دێڕێک)", type: "textarea" },
        { key: "lineupAway", label: "ریزبەندی میوان (هەر یاریزان لە دێڕێک)", type: "textarea" }
      ],
      newItem: () => ({ id: "m" + Date.now(), week: 1, home: "INT", away: "MIL", date: "", time: "", venue: "", status: "upcoming", scoreH: "", scoreA: "", events: "", lineupHome: "", lineupAway: "" })
    },

    season: {
      label: "وەرز",
      path: ["seasons"], // object keyed by id
      idField: "id",
      fields: [
        { key: "id", label: "ناسێنەر (وەک 2025-26)", type: "text", required: true },
        { key: "champion", label: "پاڵەوان", type: "text", required: true },
        { key: "status", label: "دۆخ", type: "select", options: [{ value: "current", label: "ئێستا" }, { value: "past", label: "پێشوو" }] },
        { key: "scorerName", label: " گۆڵکار (ناو)", type: "text" },
        { key: "scorerGoals", label: "گۆڵەکانی", type: "number" },
        { key: "assistName", label: "ئەسیستکار (ناو)", type: "text" },
        { key: "assistAssists", label: "ئەسیستەکانی", type: "number" },
        { key: "mostAppsName", label: "زۆرترین بەشداری (ناو)", type: "text" },
        { key: "mostAppsApps", label: "بەشدارییەکان", type: "number" },
        { key: "notable", label: "تێبینی", type: "textarea" }
      ],
      newItem: () => ({ id: "", champion: "", status: "past", scorerName: "", scorerGoals: 0, assistName: "", assistAssists: 0, mostAppsName: "", mostAppsApps: 0, notable: "" })
    },

    // National team sub-schemas
    ntSquad: {
      label: "یاریزانی هەڵبژاردە",
      path: ["national", "squad"],
      idField: null,
      fields: [
        { key: "no", label: "ژمارە", type: "number" },
        { key: "name", label: "ناو", type: "text", required: true },
        { key: "pos", label: "پۆست", type: "text", required: true },
        { key: "club", label: "یانە", type: "text" }
      ],
      newItem: () => ({ no: 0, name: "", pos: "هێرشبەر", club: "" })
    },

    ntFixture: {
      label: "یاری نیشتمانی",
      path: ["national", "fixtures"],
      idField: "id",
      fields: [
        { key: "home", label: "تیمی ماڵەوە", type: "text", required: true },
        { key: "homeCode", label: "کورتکراوەی ماڵەوە", type: "text" },
        { key: "away", label: "تیمی میوان", type: "text", required: true },
        { key: "awayCode", label: "کورتکراوەی میوان ", type: "text" },
        { key: "date", label: "بەروار", type: "text" },
        { key: "time", label: "کات", type: "text" },
        { key: "comp", label: "پێشبڕکێ", type: "text" },
        { key: "status", label: "دۆخ", type: "select", options: [{ value: "upcoming", label: "داهاتوو" }, { value: "finished", label: "تەواوبوو" }] },
        { key: "scoreH", label: "گۆڵی ماڵەوە", type: "number" },
        { key: "scoreA", label: "گۆڵی میوان", type: "number" }
      ],
      newItem: () => ({ id: "nt" + Date.now(), home: "ئیتاڵیا", homeCode: "ITA", away: "", awayCode: "", date: "", time: "", comp: "", status: "upcoming", scoreH: "", scoreA: "" })
    },

    ntNews: {
      label: "هەواڵی هەڵبژاردە",
      path: ["national", "news"],
      idField: "id",
      fields: [
        { key: "title", label: "سەردێر", type: "text", required: true },
        { key: "image", label: "بەستەری وێنە", type: "text" },
        { key: "date", label: "بەروار", type: "text" },
        { key: "excerpt", label: "پوختە", type: "textarea" },
        { key: "body", label: "ناوەڕۆک", type: "textarea" }
      ],
      newItem: () => ({ id: "ntn" + Date.now(), title: "", image: "", date: "", excerpt: "", body: "" })
    },

    ntRecord: {
      label: "ڕێکۆردی هەڵبژاردە",
      path: ["national", "records"],
      idField: null,
      fields: [
        { key: "label", label: "ناو", type: "text", required: true },
        { key: "value", label: "بەها", type: "text", required: true },
        { key: "name", label: "خاوەن", type: "text" }
      ],
      newItem: () => ({ label: "", value: "", name: "" })
    },

    ntTrophy: {
      label: "نازناو",
      path: ["national", "championships"],
      idField: null,
      fields: [
        { key: "title", label: "ناو", type: "text", required: true },
        { key: "year", label: "ساڵ", type: "text", required: true }
      ],
      newItem: () => ({ title: "", year: "" })
    }
  };

  // ---------- Overlay helpers ----------
  function loadOverlay() {
    try { return JSON.parse(localStorage.getItem("sa_data_overlay") || "{}"); } catch (e) { return {}; }
  }
  function saveOverlay(ov) {
    localStorage.setItem("sa_data_overlay", JSON.stringify(ov));
    // Also save to Firebase cloud so ALL devices see the change
    if (window.SA_FIREBASE_URL) {
      fetch(window.SA_FIREBASE_URL + '/overlay.json', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ov)
      }).catch(e => console.warn("Firebase save failed", e));
    }
  }
  // Persist a top-level key of SA into the overlay
  function persistTopKey(key) {
    const ov = loadOverlay();
    ov[key] = window.SA[key];
    saveOverlay(ov);
  }

  // ---------- Apply form values to a schema item ----------
  function formToItem(schemaKey, fd) {
    const s = SCHEMAS[schemaKey];
    const item = {};
    s.fields.forEach(f => {
      let v = fd.get(f.key);
      if (f._meta) return; // meta-only fields (eg. week)
      if (f.type === "number") v = v === "" || v == null ? "" : Number(v);
      item[f.key] = v == null ? "" : v;
    });
    return item;
  }

  // ---------- Special transform: fixtureMatch form <-> data ----------
  function matchFromForm(fd) {
    const scoreH = fd.get("scoreH"), scoreA = fd.get("scoreA");
    const events = (fd.get("events") || "").split("\n").map(x => x.trim()).filter(Boolean);
    const lH = (fd.get("lineupHome") || "").split("\n").map(x => x.trim()).filter(Boolean);
    const lA = (fd.get("lineupAway") || "").split("\n").map(x => x.trim()).filter(Boolean);
    const m = {
      id: fd.get("id") || "m" + Date.now(),
      home: fd.get("home"), away: fd.get("away"),
      date: fd.get("date") || "", time: fd.get("time") || "", venue: fd.get("venue") || "",
      status: fd.get("status") || "upcoming",
      events, lineups: { home: lH, away: lA }
    };
    if (scoreH !== "" && scoreA !== "") m.score = [Number(scoreH), Number(scoreA)];
    return m;
  }
  function matchToForm(m) {
    return {
      id: m.id, home: m.home, away: m.away, date: m.date || "", time: m.time || "", venue: m.venue || "",
      status: m.status || "upcoming",
      scoreH: m.score ? m.score[0] : "", scoreA: m.score ? m.score[1] : "",
      events: (m.events || []).join("\n"),
      lineupHome: (m.lineups?.home || []).join("\n"),
      lineupAway: (m.lineups?.away || []).join("\n")
    };
  }

  // ---------- Season schema transform ----------
  function seasonFromForm(fd) {
    return {
      id: fd.get("id"),
      champion: fd.get("champion"),
      status: fd.get("status"),
      topScorer: { name: fd.get("scorerName") || "", goals: Number(fd.get("scorerGoals") || 0) },
      topAssist: { name: fd.get("assistName") || "", assists: Number(fd.get("assistAssists") || 0) },
      mostApps: { name: fd.get("mostAppsName") || "", apps: Number(fd.get("mostAppsApps") || 0) },
      notable: fd.get("notable") || ""
    };
  }
  function seasonToForm(id, s) {
    return {
      id, champion: s.champion, status: s.status,
      scorerName: s.topScorer?.name || "", scorerGoals: s.topScorer?.goals || 0,
      assistName: s.topAssist?.name || "", assistAssists: s.topAssist?.assists || 0,
      mostAppsName: s.mostApps?.name || "", mostAppsApps: s.mostApps?.apps || 0,
      notable: s.notable || ""
    };
  }

  // ---------- Build an HTML form ----------
  function buildForm(schemaKey, values) {
    const s = SCHEMAS[schemaKey];
    values = values || {};
    const rows = s.fields.map(f => {
      const v = values[f.key] ?? "";
      const lbl = `<label style="font-weight:700;display:block;margin-top:10px">${f.label}${f.required ? ' <span style="color:#c0392b">*</span>' : ''}</label>`;
      let input;
      const base = `name="${f.key}" ${f.required ? 'required' : ''} style="width:100%;padding:10px;border:1px solid var(--line);border-radius:8px;margin-top:4px;direction:rtl;text-align:right"`;
      if (f.type === "textarea") {
        input = `<textarea ${base} rows="4">${escapeHtml(v)}</textarea>`;
      } else if (f.type === "select") {
        const opts = (f.optionsFn ? f.optionsFn() : f.options) || [];
        input = `<select ${base}>${opts.map(o => `<option value="${o.value}" ${String(v) === String(o.value) ? 'selected' : ''}>${o.label}</option>`).join("")}</select>`;
      } else {
        input = `<input type="${f.type}" ${base} value="${escapeHtml(v)}">`;
      }
      return lbl + input;
    }).join("");
    return `<form id="crud-form">${rows}
      <div style="margin-top:16px;display:flex;gap:8px">
        <button class="btn" type="submit">پاشەکەوت</button>
        <button class="btn ghost" type="button" id="crud-cancel">پاشگەزبوونەوە</button>
      </div>
      <div id="crud-msg" style="margin-top:8px;color:#c0392b;font-size:13px"></div>
    </form>`;
  }
  function escapeHtml(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

  // ---------- Open create/edit dialog ----------
  function openEditor(schemaKey, opts) {
    opts = opts || {};
    const s = SCHEMAS[schemaKey];
    let values = {};
    if (opts.mode === "edit" && opts.item) {
      if (schemaKey === "fixtureMatch") values = matchToForm(opts.item);
      else if (schemaKey === "season") values = seasonToForm(opts.seasonId, opts.item);
      else values = { ...opts.item };
    } else {
      values = s.newItem();
    }
    if (schemaKey === "fixtureMatch" && opts.week) values.week = opts.week;

    let html = buildForm(schemaKey, values);
    // For new fixture, include hidden id field; for new season, include id (already in schema)
    if (schemaKey === "fixtureMatch") {
      html = html.replace('<form id="crud-form">', `<form id="crud-form"><input type="hidden" name="id" value="${escapeHtml(values.id || '')}">`);
    }

    window.SAApp.openGenericModal((opts.mode === "edit" ? "دەستکاری " : "زیادکردنی ") + s.label, html);
    const form = document.getElementById("crud-form");
    document.getElementById("crud-cancel").addEventListener("click", () => document.getElementById("gen-modal").classList.remove("show"));
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      try {
        handleSave(schemaKey, fd, opts);
        document.getElementById("gen-modal").classList.remove("show");
        location.reload();
      } catch (err) {
        document.getElementById("crud-msg").textContent = err.message;
      }
    });
  }

  function handleSave(schemaKey, fd, opts) {
    const s = SCHEMAS[schemaKey];

    // Fixture week: nested edit
    if (schemaKey === "fixtureWeek") {
      const newWeek = Number(fd.get("week") || 0);
      const newRange = fd.get("dateRange") || "";
      const weeks = window.SA.fixtures || [];
      if (opts.mode === "edit") {
        const targetOldWeek = opts.oldWeek != null ? opts.oldWeek : newWeek;
        const w = weeks.find(x => x.week === targetOldWeek);
        if (!w) throw new Error("هەفتە نەدۆزرایەوە");
        w.week = newWeek;
        w.dateRange = newRange;
        weeks.sort((a,b) => a.week - b.week);
      } else {
        weeks.push({ week: newWeek, dateRange: newRange, matches: [] });
        weeks.sort((a,b) => a.week - b.week);
      }
      window.SA.fixtures = weeks;
      persistTopKey("fixtures");
      return;
    }

    // Fixture match: nested edit
    if (schemaKey === "fixtureMatch") {
      const match = matchFromForm(fd);
      const wk = Number(fd.get("week") || opts.week || 1);
      const weeks = window.SA.fixtures || [];
      let week = weeks.find(w => w.week === wk);
      if (!week) { week = { week: wk, dateRange: "", matches: [] }; weeks.push(week); weeks.sort((a, b) => a.week - b.week); }
      if (opts.mode === "edit") {
        for (const w of weeks) {
          const idx = w.matches.findIndex(m => m.id === match.id);
          if (idx >= 0) { w.matches.splice(idx, 1); break; }
        }
      }
      week.matches.push(match);
      window.SA.fixtures = weeks;
      persistTopKey("fixtures");
      return;
    }

    // Season: object keyed by id
    if (schemaKey === "season") {
      const season = seasonFromForm(fd);
      const id = season.id;
      if (!id) throw new Error("ناسێنەری وەرز داواکراوە");
      delete season.id;
      if (!window.SA.seasons) window.SA.seasons = {};
      if (opts.mode === "edit" && opts.seasonId && opts.seasonId !== id) delete window.SA.seasons[opts.seasonId];
      window.SA.seasons[id] = season;
      persistTopKey("seasons");
      return;
    }

    // Generic array path
    const item = formToItem(schemaKey, fd);
    // Navigate to the array
    const path = s.path; // eg ["records","allTime"] or ["national","squad"]
    const topKey = path[0];
    // Ensure top key exists in SA and is a copy we can mutate
    if (!window.SA[topKey]) window.SA[topKey] = (path.length === 1) ? [] : {};
    let arr = window.SA;
    for (let i = 0; i < path.length; i++) { arr = arr[path[i]]; }
    if (!Array.isArray(arr)) throw new Error("ڕێچکەی داتا هەڵەیە");

    if (opts.mode === "edit") {
      if (s.idField) {
        const idx = arr.findIndex(x => x[s.idField] === item[s.idField] || x[s.idField] === opts.item[s.idField]);
        if (idx >= 0) arr[idx] = item;
      } else if (opts.index != null) {
        arr[opts.index] = item;
      }
    } else {
      arr.push(item);
    }
    persistTopKey(topKey);
  }

  // ---------- Delete ----------
  function confirmDelete(msg, onYes) {
    window.SAApp.openGenericModal("دڵنیاکردنەوە", `
      <p>${msg}</p>
      <div style="display:flex;gap:8px;margin-top:14px">
        <button class="btn" id="del-yes" style="background:#c0392b">بەڵێ، بیسڕەوە</button>
        <button class="btn ghost" id="del-no">نەخێر</button>
      </div>`);
    document.getElementById("del-no").addEventListener("click", () => document.getElementById("gen-modal").classList.remove("show"));
    document.getElementById("del-yes").addEventListener("click", () => { onYes(); document.getElementById("gen-modal").classList.remove("show"); location.reload(); });
  }

  function deleteItem(schemaKey, opts) {
    const s = SCHEMAS[schemaKey];

    if (schemaKey === "fixtureWeek") {
      confirmDelete("دڵنیایت لە سڕینەوەی ئەم هەفتەیە و هەموو یاریەکانی؟", () => {
        const weeks = window.SA.fixtures || [];
        const idx = weeks.findIndex(w => w.week === opts.week);
        if (idx >= 0) weeks.splice(idx, 1);
        persistTopKey("fixtures");
      });
      return;
    }

    if (schemaKey === "fixtureMatch") {
      confirmDelete("دڵنیایت لە سڕینەوەی ئەم یاریە؟", () => {
        const weeks = window.SA.fixtures || [];
        for (const w of weeks) {
          const idx = w.matches.findIndex(m => m.id === opts.id);
          if (idx >= 0) { w.matches.splice(idx, 1); break; }
        }
        persistTopKey("fixtures");
      });
      return;
    }

    if (schemaKey === "season") {
      confirmDelete("دڵنیایت لە سڕینەوەی ئەم وەرزە؟", () => {
        delete window.SA.seasons[opts.seasonId];
        persistTopKey("seasons");
      });
      return;
    }

    confirmDelete("دڵنیایت لە سڕینەوەی ئەم بابەتە؟", () => {
      const path = s.path;
      let arr = window.SA;
      for (let i = 0; i < path.length; i++) { arr = arr[path[i]]; }
      if (s.idField) {
        const idx = arr.findIndex(x => x[s.idField] === opts.id);
        if (idx >= 0) arr.splice(idx, 1);
      } else if (opts.index != null) {
        arr.splice(opts.index, 1);
      }
      persistTopKey(path[0]);
    });
  }

  // ---------- Public: button HTML for edit/delete ----------
  function itemButtons(schemaKey, opts) {
    if (!window.SA_isAdmin) return "";
    const e = JSON.stringify({ schemaKey, opts }).replace(/"/g, '&quot;');
    return `<span class="adm-btns" data-adm="${e}" style="display:inline-flex;gap:4px;margin-inline-start:8px">
      <button class="adm-edit" title="دەستکاری" style="background:#1a237e;color:#fff;border:none;border-radius:6px;width:28px;height:28px;cursor:pointer">✎</button>
      <button class="adm-del"  title="سڕینەوە"  style="background:#c0392b;color:#fff;border:none;border-radius:6px;width:28px;height:28px;cursor:pointer">🗑</button>
    </span>`;
  }

  function addButton(schemaKey, opts) {
    if (!window.SA_isAdmin) return "";
    const label = SCHEMAS[schemaKey]?.label || "نوێ";
    const e = JSON.stringify({ schemaKey, opts: opts || {} }).replace(/"/g, '&quot;');
    return `<button class="btn adm-add" data-add="${e}" style="background:#1a237e">+ ${label}ی نوێ</button>`;
  }

  // ---------- Wire up clicks (event delegation) ----------
  function wire() {
    document.addEventListener("click", (e) => {
      const addBtn = e.target.closest(".adm-add");
      if (addBtn) {
        const cfg = JSON.parse(addBtn.dataset.add);
        openEditor(cfg.schemaKey, { mode: "new", ...(cfg.opts || {}) });
        e.stopPropagation();
        return;
      }
      const editBtn = e.target.closest(".adm-edit");
      const delBtn = e.target.closest(".adm-del");
      if (editBtn || delBtn) {
        e.stopPropagation();
        const wrap = (editBtn || delBtn).closest(".adm-btns");
        const cfg = JSON.parse(wrap.dataset.adm);
        const s = SCHEMAS[cfg.schemaKey];

        // Locate the actual item from the current data
        let item, opts = { ...cfg.opts };
        if (cfg.schemaKey === "fixtureMatch") {
          for (const w of (window.SA.fixtures || [])) {
            const m = w.matches.find(x => x.id === opts.id);
            if (m) { item = m; opts.week = w.week; break; }
          }
        } else if (cfg.schemaKey === "fixtureWeek") {
          const w = (window.SA.fixtures || []).find(x => x.week === opts.week);
          if (w) { item = { week: w.week, dateRange: w.dateRange || "" }; opts.oldWeek = w.week; }
        } else if (cfg.schemaKey === "season") {
          item = window.SA.seasons[opts.seasonId];
        } else {
          const path = s.path;
          let arr = window.SA;
          for (let i = 0; i < path.length; i++) { arr = arr[path[i]]; }
          if (s.idField) item = arr.find(x => x[s.idField] === opts.id);
          else item = arr[opts.index];
        }

        if (editBtn) openEditor(cfg.schemaKey, { mode: "edit", item, ...opts });
        else deleteItem(cfg.schemaKey, { ...opts });
      }
    }, true);
  }

  // ---------- Expose ----------
  window.SAAdmin = { itemButtons, addButton, openEditor, deleteItem, SCHEMAS };

  // ---------- Init flag (synchronous) ----------
  try { window.SA_isAdmin = !!JSON.parse(sessionStorage.getItem("sa_user") || "null"); } catch (e) { window.SA_isAdmin = false; }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", wire);
  else wire();
})();
