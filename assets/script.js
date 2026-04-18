/* ============================================================
   Seria Ay - shared runtime
   ============================================================ */

// ----- Admin auth (client-side) -----
// Default super-admin (change these in your files if you wish)
const DEFAULT_ADMIN = { username: "admin", password: "seriaay2026", role: "super" };

function getAdmins() {
  try {
    const raw = localStorage.getItem("sa_admins");
    if (raw) return JSON.parse(raw);
  } catch (e) { }
  const seed = [DEFAULT_ADMIN];
  localStorage.setItem("sa_admins", JSON.stringify(seed));
  return seed;
}
function saveAdmins(list) { localStorage.setItem("sa_admins", JSON.stringify(list)); }
function currentUser() { try { return JSON.parse(sessionStorage.getItem("sa_user") || "null") } catch (e) { return null } }
function isLoggedIn() { return !!currentUser(); }

// Data overlay (edits via admin panel are stored and override window.SA)
// Now supports Firebase cloud sync so edits appear on ALL devices
async function applyOverlay() {
  // Try Firebase first (cloud — visible to everyone)
  if (window.SA_FIREBASE_URL) {
    try {
      const res = await fetch(window.SA_FIREBASE_URL + '/overlay.json');
      const obj = await res.json();
      if (obj && typeof obj === 'object') {
        Object.assign(window.SA, obj);
        // Cache locally for offline fallback
        localStorage.setItem("sa_data_overlay", JSON.stringify(obj));
        return;
      }
    } catch (e) {
      console.warn("Firebase load failed, falling back to localStorage", e);
    }
  }
  // Fallback to localStorage (only visible on this device)
  try {
    const ov = localStorage.getItem("sa_data_overlay");
    if (ov) {
      const obj = JSON.parse(ov);
      Object.assign(window.SA, obj);
    }
  } catch (e) { console.warn("overlay err", e); }
}

// ---- Helpers ----
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
function teamName(code) { return (window.SA.teams[code] || { name: code }).name; }
function crest(code) { return `<span class="crest">${(code || "?").slice(0, 3)}</span>`; }

// ---- Shared UI: header, footer, admin ----
function renderHeader(active) {
  const natMode = localStorage.getItem("sa_mode") === "national";
  document.body.classList.toggle("national-mode", natMode);
  const links = natMode
    ? [
      { href: "national.html#home", label: "ماڵەوە" },
      { href: "national.html#fixtures", label: "یارییەکان" },
      { href: "national.html#news", label: "هەواڵ" },
      { href: "national.html#squad", label: "یاریزانان" },
      { href: "national.html#records", label: "ڕێکۆردەکان" }
    ]
    : [
      { href: "index.html", label: "ماڵەوە", id: "home" },
      { href: "fixtures.html", label: "یارییەکان", id: "fixtures" },
      { href: "news.html", label: "هەواڵ", id: "news" },
      { href: "history.html", label: "ڕێکۆردەکانی مێژوو", id: "history" },
      { href: "season.html", label: "وەرزی ئێستا", id: "season" },
      { href: "contact.html", label: "پەیوەندی", id: "contact" }
    ];
  const nat = natMode ? "سێریا ئەی" : "هەڵبژاردەی نیشتمانی";
  const toggleIcon = natMode ? "⚽" : "🇮🇹";
  const header = `
    <header class="topbar">
      <div class="nav">
        <a href="index.html" class="brand">
          <img src="assets/img/seriaa.jpeg" alt="logo">
          <div>
            <div class="title">${window.SA.meta.siteName}</div>
            <div class="sub">${window.SA.meta.tagline}</div>
          </div>
        </a>
        <button class="nav-burger" id="nav-burger" aria-label="menu">☰</button>
        <nav class="menu" id="main-menu">
          ${links.map(l => `<a href="${l.href}" ${active === l.id ? 'class="active"' : ''}>${l.label}</a>`).join("")}
          <button class="nat-toggle nat-toggle-mobile" id="nat-toggle-m">${toggleIcon} ${nat}</button>
        </nav>
        <button class="nat-toggle nat-toggle-desktop" id="nat-toggle">${toggleIcon} ${nat}</button>
      </div>
    </header>`;
  document.body.insertAdjacentHTML("afterbegin", header);
  const burger = $("#nav-burger");
  const menu = $("#main-menu");
  burger.addEventListener("click", () => menu.classList.toggle("open"));
  const toggleMode = () => {
    const nm = localStorage.getItem("sa_mode") === "national";
    localStorage.setItem("sa_mode", nm ? "club" : "national");
    if (nm) location.href = "index.html";
    else location.href = "national.html";
  };
  $("#nat-toggle").addEventListener("click", toggleMode);
  const mt = $("#nat-toggle-m"); if (mt) mt.addEventListener("click", toggleMode);
}

function renderFooter() {
  document.body.insertAdjacentHTML("beforeend", `
    <footer>
      <div><strong>${window.SA.meta.siteName}</strong></div>
      <small>© 2026 سێریا ئەی کوردی — هەموو مافەکانی پارێزراون</small>
    </footer>
    <button class="admin-fab" id="admin-fab" title="پاڵپشت">🔐</button>
    ${isLoggedIn() ? '<button id="sync-fab" title="هاوکاتکردن بۆ کلاود" style="position:fixed;bottom:20px;left:80px;z-index:999;width:48px;height:48px;border-radius:50%;background:#1a8917;color:#fff;border:none;font-size:20px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.3)">☁</button>' : ''}
    <div class="modal-back" id="admin-modal">
      <div class="modal">
        <div class="modal-head">
          <h3 id="admin-title">چوونەژوورەوەی ئەدمین</h3>
          <button class="modal-close" id="admin-close">×</button>
        </div>
        <div class="modal-body" id="admin-body"></div>
      </div>
    </div>
  `);
  $("#admin-fab").addEventListener("click", openAdmin);
  const syncFab = $("#sync-fab");
  if (syncFab) {
    syncFab.addEventListener("click", () => {
      if (!window.SA_FIREBASE_URL) { alert("Firebase not configured!"); return; }
      syncFab.textContent = "⏳";
      syncFab.style.background = "#666";
      const ov = JSON.parse(localStorage.getItem("sa_data_overlay") || "{}");
      ["news","fixtures","table","topScorers","topAssists","records","seasons","national","contact","teams"].forEach(key => {
        if (window.SA[key] !== undefined) ov[key] = window.SA[key];
      });
      if (ov.news && Array.isArray(ov.news)) {
        ov.news.forEach((n, i) => { if (!n.id) n.id = "n" + Date.now() + i; });
      }
      localStorage.setItem("sa_data_overlay", JSON.stringify(ov));
      fetch(window.SA_FIREBASE_URL + '/overlay.json', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ov)
      }).then(r => {
        if (r.ok) {
          syncFab.textContent = "✅";
          syncFab.style.background = "#1a8917";
          setTimeout(() => { syncFab.textContent = "☁"; }, 2000);
        } else {
          syncFab.textContent = "❌";
          syncFab.style.background = "#c0392b";
          alert("Sync failed: " + r.status);
        }
      }).catch(e => {
        syncFab.textContent = "❌";
        syncFab.style.background = "#c0392b";
        alert("Sync failed: " + e.message);
      });
    });
  }
  $("#admin-close").addEventListener("click", closeAdmin);
  $("#admin-modal").addEventListener("click", (e) => { if (e.target.id === "admin-modal") closeAdmin(); });
}

function openAdmin() {
  const modal = $("#admin-modal");
  modal.classList.add("show");
  if (isLoggedIn()) renderAdminPanel();
  else renderLogin();
}
function closeAdmin() { $("#admin-modal").classList.remove("show"); }

function renderLogin() {
  $("#admin-title").textContent = "چوونەژوورەوەی ئەدمین";
  $("#admin-body").innerHTML = `
    <p style="color:var(--muted);margin:0 0 12px">تکایە ناوی بەکارهێنەر و وشەی نهێنی بنووسە:</p>
    <form id="login-form">
      <div style="margin-bottom:10px">
        <label style="font-weight:700">ناوی بەکارهێنەر</label>
        <input name="username" required style="width:100%;padding:10px;border:1px solid var(--line);border-radius:8px;margin-top:4px;direction:ltr;text-align:left">
      </div>
      <div style="margin-bottom:14px">
        <label style="font-weight:700">وشەی نهێنی</label>
        <input name="password" type="password" required style="width:100%;padding:10px;border:1px solid var(--line);border-radius:8px;margin-top:4px;direction:ltr;text-align:left">
      </div>
      <button class="btn" type="submit">چوونەژوورەوە</button>
      <div id="login-err" style="color:#c0392b;margin-top:10px;font-size:13px"></div>
    </form>
    <hr style="margin:18px 0;border:none;border-top:1px solid var(--line)">
    <details style="font-size:13px;color:var(--muted)">
      <summary style="cursor:pointer;font-weight:700;color:var(--ink)">زانیاری بنەڕەت (default)</summary>
      <div style="margin-top:8px">ناو: <code>admin</code><br>وشەی نهێنی: <code>seriaay2026</code><br>
      (دوای چوونەژوورەوە دەتوانیت ئەدمینی نوێ زیاد بکەیت و وشەی نهێنی بگۆڕیت.)</div>
    </details>
  `;
  $("#login-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const u = fd.get("username"), p = fd.get("password");
    const admin = getAdmins().find(a => a.username === u && a.password === p);
    if (!admin) { $("#login-err").textContent = "ناو یان وشەی نهێنی هەڵەیە."; return; }
    sessionStorage.setItem("sa_user", JSON.stringify({ username: admin.username, role: admin.role }));
    renderAdminPanel();
  });
}

function renderAdminPanel() {
  const user = currentUser();
  $("#admin-title").textContent = `پەنەڵی ئەدمین — ${user.username}`;
  const isSuper = user.role === "super";
  const overlay = localStorage.getItem("sa_data_overlay") || "{}";

  $("#admin-body").innerHTML = `
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">
      <button class="btn" data-tab="data">دەستکاری داتا</button>
      ${isSuper ? '<button class="btn ghost" data-tab="admins">بەڕێوەبردنی ئەدمینەکان</button>' : ''}
      <button class="btn ghost" id="logout-btn">دەرچوون</button>
    </div>
    <div id="admin-tab"></div>
  `;

  $$("[data-tab]").forEach(b => b.addEventListener("click", () => showTab(b.dataset.tab)));
  $("#logout-btn").addEventListener("click", () => { sessionStorage.removeItem("sa_user"); renderLogin(); });
  showTab("data");

  function showTab(tab) {
    if (tab === "data") {
      $("#admin-tab").innerHTML = `
        <p style="margin:0 0 10px">بەخێربێیت! ئێستا لە هەر پەڕەیەکدا دەتوانیت دوگمەی <strong>+ نوێ</strong>، <strong>✎</strong> (دەستکاری) و <strong>🗑</strong> (سڕینەوە) بینیت.</p>
        <ul style="margin:0 0 16px;padding-inline-start:18px;line-height:1.9">
          <li>هەواڵ و بابەتەکان → پەڕەی <strong>هەواڵ</strong></li>
          <li>یاری و ریزبەندی هەفتە → پەڕەی <strong>یارییەکان</strong></li>
          <li>ریزبەندی، گۆڵکاران، ئەسیستکاران → پەڕەی <strong>وەرز</strong></li>
          <li>ڕێکۆردە مێژوویی و تایبەتەکان → پەڕەی <strong>ڕێکۆردەکانی مێژوو</strong></li>
          <li>یاریزانان، نازناوەکان → پەڕەی <strong>هەڵبژاردەی نیشتمانی</strong></li>
          <li>زانیاری پەیوەندی → پەڕەی <strong>پەیوەندی</strong></li>
        </ul>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn" id="sync-cloud" style="background:#1a8917">☁ هاوکاتکردن بۆ کلاود</button>
          <button class="btn ghost" id="reset-ov">ڕێکخستنەوە بۆ بنەڕەت</button>
          <button class="btn ghost" id="export-ov">ناردنی داتا وەک JSON</button>
        </div>
        <div id="sync-msg" style="margin-top:8px;font-size:13px"></div>
      `;
      $("#sync-cloud").addEventListener("click", () => {
        if (!window.SA_FIREBASE_URL) { alert("Firebase URL not configured!"); return; }
        const syncMsg = $("#sync-msg");
        syncMsg.innerHTML = '<span style="color:#1a8917">⏳ هاوکاتکردن...</span>';
        // First ensure all current SA data is in the overlay
        const ov = JSON.parse(localStorage.getItem("sa_data_overlay") || "{}");
        // Sync all important keys from current page data
        ["news","fixtures","table","topScorers","topAssists","records","seasons","national","contact","teams"].forEach(key => {
          if (window.SA[key] !== undefined) ov[key] = window.SA[key];
        });
        // Fix any news items missing IDs
        if (ov.news && Array.isArray(ov.news)) {
          ov.news.forEach((n, i) => { if (!n.id) n.id = "n" + Date.now() + i; });
        }
        localStorage.setItem("sa_data_overlay", JSON.stringify(ov));
        fetch(window.SA_FIREBASE_URL + '/overlay.json', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(ov)
        }).then(r => {
          if (r.ok) {
            syncMsg.innerHTML = '<span style="color:#1a8917">✅ هاوکاتکرا! هەموو ئامێرەکان گۆڕانکاریەکان دەبینن.</span>';
          } else {
            syncMsg.innerHTML = '<span style="color:#c0392b">❌ هەڵە: ' + r.status + '</span>';
          }
        }).catch(e => {
          syncMsg.innerHTML = '<span style="color:#c0392b">❌ هەڵە: ' + e.message + '</span>';
        });
      });
      $("#reset-ov").addEventListener("click", () => {
        if (confirm("هەموو گۆڕانکاریەکانت لاببرێن؟")) {
          localStorage.removeItem("sa_data_overlay");
          // Also clear Firebase cloud data
          if (window.SA_FIREBASE_URL) {
            fetch(window.SA_FIREBASE_URL + '/overlay.json', {
              method: 'DELETE'
            }).catch(() => {});
          }
          location.reload();
        }
      });
      $("#export-ov").addEventListener("click", () => {
        const blob = new Blob([JSON.stringify(window.SA, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = "seria-data.json"; a.click();
      });
    } else {
      const admins = getAdmins();
      $("#admin-tab").innerHTML = `
        <p style="color:var(--muted);margin:0 0 10px">زیادکردنی ئەدمینی نوێ یان سڕینەوەی ئەدمینەکان.</p>
        <table class="table" style="margin-bottom:14px">
          <thead><tr><th>ناو</th><th>ڕۆڵ</th><th>کردار</th></tr></thead>
          <tbody>
            ${admins.map((a, i) => `<tr><td>${a.username}</td><td>${a.role}</td>
              <td>${a.role === "super" ? '<span class="chip">سوپەر</span>' : `<button class="btn ghost" data-rm="${i}" style="padding:4px 10px;font-size:12px">سڕینەوە</button>`}</td></tr>`).join("")}
          </tbody>
        </table>
        <h4 style="margin:14px 0 8px">زیادکردنی ئەدمینی نوێ</h4>
        <form id="add-admin">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
            <input name="username" placeholder="ناو" required style="padding:10px;border:1px solid var(--line);border-radius:8px;direction:ltr;text-align:left">
            <input name="password" placeholder="وشەی نهێنی" required style="padding:10px;border:1px solid var(--line);border-radius:8px;direction:ltr;text-align:left">
          </div>
          <select name="role" style="width:100%;padding:10px;margin-top:8px;border:1px solid var(--line);border-radius:8px">
            <option value="editor">دەستکاری (editor)</option>
            <option value="super">سوپەر ئەدمین</option>
          </select>
          <button class="btn" style="margin-top:10px">زیادکردن</button>
          <div id="aa-msg" style="margin-top:10px;font-size:13px"></div>
        </form>
      `;
      $("#add-admin").addEventListener("submit", (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const u = (fd.get("username") || "").trim();
        const p = (fd.get("password") || "").trim();
        const r = fd.get("role");
        if (!u || !p) return;
        const list = getAdmins();
        if (list.find(a => a.username === u)) { $("#aa-msg").innerHTML = '<span style="color:#c0392b">ئەم ناوە هەیە</span>'; return; }
        list.push({ username: u, password: p, role: r });
        saveAdmins(list);
        showTab("admins");
      });
      $$("[data-rm]").forEach(b => b.addEventListener("click", () => {
        const idx = +b.dataset.rm;
        const list = getAdmins();
        list.splice(idx, 1); saveAdmins(list); showTab("admins");
      }));
    }
  }
}

// ---- Generic fixture modal ----
function openFixtureModal(match) {
  const t = window.SA.teams;
  const hasScore = match.score && match.status === "finished";
  const hasLineups = match.lineups && (match.lineups.home.length || match.lineups.away.length);
  const body = `
    <div style="text-align:center;margin-bottom:14px">
      <div style="font-size:14px;color:var(--muted)">${match.comp || "سێریا ئەی"}</div>
      <div style="display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:14px;margin:14px 0">
        <div style="text-align:center"><div style="font-size:22px;font-weight:900">${teamName(match.home) || match.home}</div></div>
        <div style="font-size:36px;font-weight:900;color:var(--ink)">${hasScore ? `${match.score[0]} - ${match.score[1]}` : "vs"}</div>
        <div style="text-align:center"><div style="font-size:22px;font-weight:900">${teamName(match.away) || match.away}</div></div>
      </div>
      <div style="color:var(--muted)">${match.date} — ${match.time || ""} — ${match.venue || ""}</div>
    </div>
    ${match.events && match.events.length ? `
      <h4 style="margin:10px 0 6px">ڕووداوەکان</h4>
      <ul style="margin:0;padding:0;list-style:none">
        ${match.events.map(e => `<li style="padding:6px 10px;background:var(--ink-soft);border-radius:6px;margin-bottom:4px">${e}</li>`).join("")}
      </ul>`: ""}
    ${hasLineups ? `
      <div class="lineup">
        <div>
          <h4>${teamName(match.home) || match.home}</h4>
          <ul>${match.lineups.home.map(p => `<li>${p}</li>`).join("") || '<li>هێشتا ڕانەگەیەنراوە</li>'}</ul>
        </div>
        <div>
          <h4>${teamName(match.away) || match.away}</h4>
          <ul>${match.lineups.away.map(p => `<li>${p}</li>`).join("") || '<li>هێشتا ڕانەگەیەنراوە</li>'}</ul>
        </div>
      </div>`: `<p style="color:var(--muted);text-align:center;margin-top:14px">ڕیزبەندی (lineup) هێشتا ڕانەگەیەنراوە</p>`}
  `;
  openGenericModal(`${teamName(match.home) || match.home} — ${teamName(match.away) || match.away}`, body);
}

function openGenericModal(title, html) {
  let back = $("#gen-modal");
  if (!back) {
    document.body.insertAdjacentHTML("beforeend", `
      <div class="modal-back" id="gen-modal">
        <div class="modal">
          <div class="modal-head"><h3 id="gm-title"></h3><button class="modal-close" id="gm-close">×</button></div>
          <div class="modal-body" id="gm-body"></div>
        </div>
      </div>`);
    back = $("#gen-modal");
    $("#gm-close").addEventListener("click", () => back.classList.remove("show"));
    back.addEventListener("click", (e) => { if (e.target.id === "gen-modal") back.classList.remove("show"); });
  }
  $("#gm-title").textContent = title;
  $("#gm-body").innerHTML = html;
  back.classList.add("show");
}

// ---- Fixture card renderer (clickable) ----
function fixtureCard(m) {
  const hasScore = m.score && m.status === "finished";
  const admBtns = (window.SAAdmin && window.SA_isAdmin) ? window.SAAdmin.itemButtons("fixtureMatch", { id: m.id }) : "";
  return `
    <div class="fixture" data-mid="${m.id}">
      <div class="team home">
        <span>${teamName(m.home) || m.home}</span>
        ${crest(m.home)}
      </div>
      <div class="score ${hasScore ? '' : 'upcoming'}">${hasScore ? `${m.score[0]} - ${m.score[1]}` : `${m.time || ""}<br><small>${m.date || ""}</small>`}</div>
      <div class="team away">
        ${crest(m.away)}
        <span>${teamName(m.away) || m.away}</span>
      </div>
      ${admBtns}
    </div>`;
}
function wireFixtures(root = document) {
  $$(".fixture", root).forEach(el => {
    el.addEventListener("click", () => {
      const mid = el.dataset.mid;
      let all = []; (window.SA.fixtures || []).forEach(w => all = all.concat(w.matches));
      all = all.concat((window.SA.national?.fixtures || []));
      const m = all.find(x => x.id === mid);
      if (m) openFixtureModal(m);
    });
  });
}

// ---- League table renderer ----
function tableHTML() {
  const admin = window.SAAdmin && window.SA_isAdmin;
  // Auto-sort: most points first, then goal difference, then goals scored
  const sorted = [...window.SA.table].sort((a, b) => {
    if (b.pts !== a.pts) return b.pts - a.pts;
    const gdA = a.gf - a.ga, gdB = b.gf - b.ga;
    if (gdB !== gdA) return gdB - gdA;
    return b.gf - a.gf;
  });
  // Update the original array so admin edit indices match
  window.SA.table = sorted;
  const rows = sorted.map((r, i) => {
    const btns = admin ? window.SAAdmin.itemButtons("tableRow", { index: i }) : "";
    return `<tr>
      <td class="pos">${i + 1}</td>
      <td class="team-cell">${teamName(r.team)}</td>
      <td>${r.p}</td><td>${r.w}</td><td>${r.d}</td><td>${r.l}</td>
      <td>${r.gf}</td><td>${r.ga}</td><td>${r.gf - r.ga}</td>
      <td><strong>${r.pts}</strong></td>
      ${admin ? `<td>${btns}</td>` : ""}
    </tr>`;
  }).join("");
  const addBtn = admin ? `<div style="margin-top:10px">${window.SAAdmin.addButton("tableRow")}</div>` : "";
  return `<div class="table-wrap"><table class="table">
    <thead><tr><th>#</th><th>تیم</th><th>یاری</th><th>ب</th><th>یەک</th><th>د</th><th>گب</th><th>گڵ</th><th>فەرق</th><th>خاڵ</th>${admin ? "<th></th>" : ""}</tr></thead>
    <tbody>${rows}</tbody></table></div>${addBtn}`;
}

// ---- News card ----
function newsCard(n, opts) {
  opts = opts || {};
  const schemaKey = opts.national ? "ntNews" : "news";
  const type = opts.national ? "national" : "club";
  const admBtns = (window.SAAdmin && window.SA_isAdmin) ? `<div style="padding:8px 16px;border-top:1px solid var(--line);text-align:end">${window.SAAdmin.itemButtons(schemaKey, { id: n.id })}</div>` : "";
  const link = `news-detail.html?id=${encodeURIComponent(n.id)}&type=${type}`;
  return `
    <article class="card news-card" data-nid="${n.id}" data-nlink="${link}">
      <a href="${link}" style="display:block;color:inherit;text-decoration:none">
        <div class="img" style="background-image:url('${n.image}')"></div>
        <div class="body">
          <span class="chip">${n.category || ""}</span>
          <h3>${n.title}</h3>
          <p class="excerpt">${n.excerpt}</p>
          <div class="date">${n.date}</div>
        </div>
      </a>
      ${admBtns}
    </article>`;
}
function wireNews(root = document) {
  // Cards are already anchor links — nothing extra needed.
  // Keep function for API compatibility.
}

// ---- init helper ----
async function init(active) {
  await applyOverlay();
  renderHeader(active);
  renderFooter();
}

window.SAApp = { init, teamName, crest, tableHTML, fixtureCard, wireFixtures, newsCard, wireNews, openGenericModal, openFixtureModal };
