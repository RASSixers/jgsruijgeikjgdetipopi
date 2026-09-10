const SCHEDULE_BASE =
  "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/phi/schedule";
const INJURIES_URLS = [
  "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/phi/injuries",
  "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/injuries"
];

const NATIONAL_TV = new Set([
  "NBC", "ESPN", "ESPN2", "ABC", "TNT", "AMAZON", "PRIME", "PRIME VIDEO", "PEACOCK", "NBA TV"
]);

const STATE = {
  events: [],
  seasonYear: 2027,
  injuries: [],
  tab: "2",
  view: "all",
  tv: "all",
  mode: "list",
  nextId: null,
  countdownTimer: null,
  refreshTimer: null
};

function get(obj, path, fallback = "") {
  return path.split(".").reduce((o, k) => (o && o[k] != null ? o[k] : undefined), obj) ?? fallback;
}

function qs() {
  return new URLSearchParams(location.search);
}

function writeUrl(extraHash) {
  const p = new URLSearchParams();
  if (STATE.tab !== "2") p.set("tab", STATE.tab);
  if (STATE.view !== "all") p.set("view", STATE.view);
  if (STATE.tv !== "all") p.set("tv", STATE.tv);
  if (STATE.mode !== "list") p.set("mode", STATE.mode);
  const theme = document.documentElement.getAttribute("data-theme");
  if (theme) p.set("theme", theme);
  const query = p.toString();
  const hash = extraHash || location.hash;
  history.replaceState(null, "", `${location.pathname}${query ? "?" + query : ""}${hash || ""}`);
}

function initTheme() {
  const fromUrl = qs().get("theme");
  const saved = localStorage.getItem("sh-theme");
  const theme = fromUrl || saved || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  setTheme(theme, false);
}

function setTheme(theme, persist = true) {
  document.documentElement.setAttribute("data-theme", theme);
  if (persist) localStorage.setItem("sh-theme", theme);
  const btn = document.getElementById("theme-toggle");
  if (btn) btn.textContent = theme === "dark" ? "Light mode" : "Dark mode";
}

function badgeFor(statusName) {
  if (statusName === "STATUS_FINAL") return "badge final";
  if (statusName === "STATUS_IN_PROGRESS" || statusName === "STATUS_LIVE") return "badge live";
  return "badge upcoming";
}

function broadcastNames(comp) {
  const broadcasts = comp.broadcasts || [];
  return [...new Set(broadcasts.map(b =>
    get(b, "media.shortName") || get(b, "names.0") || get(b, "shortName")
  ).filter(Boolean))];
}

function isNational(names) {
  return names.some(n => NATIONAL_TV.has(String(n).toUpperCase()));
}

function networkClass(name) {
  const key = String(name).toUpperCase().replace(/\s+/g, "");
  if (key.includes("NBC") && !key.includes("NBCS")) return "net-nbc";
  if (key.includes("ESPN")) return "net-espn";
  if (key.includes("ABC")) return "net-abc";
  if (key.includes("AMAZON") || key.includes("PRIME")) return "net-amazon";
  if (key.includes("TNT")) return "net-tnt";
  if (key.includes("PEACOCK")) return "net-peacock";
  return "net-local";
}

function recordOf(competitor) {
  const recs = competitor && competitor.records;
  if (Array.isArray(recs) && recs.length) {
    const overall = recs.find(r => /overall/i.test(r.type || r.name || "")) || recs[0];
    return overall.summary || overall.displayValue || "";
  }
  return get(competitor, "record.displayValue", "");
}

function gamecast(event) {
  const links = [...(event.links || []), ...get(event, "competitions.0.links", [])];
  const hit = links.find(l => (l.rel || []).includes("summary") && !(l.rel || []).includes("app"));
  return hit ? hit.href : "";
}

function ticketUrl(event) {
  const tickets = get(event, "competitions.0.tickets", []);
  const link = tickets[0] && tickets[0].links && tickets[0].links[0];
  return link ? link.href : "";
}

function mapsUrl(comp, isHome) {
  const name = get(comp, "venue.fullName");
  const city = get(comp, "venue.address.city");
  const state = get(comp, "venue.address.state");
  if (!name) return "";
  const q = encodeURIComponent([name, city, state].filter(Boolean).join(", "));
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

function parseEvent(raw) {
  const comp = (raw.competitions && raw.competitions[0]) || {};
  const competitors = comp.competitors || [];
  const sixers = competitors.find(c => get(c, "team.abbreviation") === "PHI");
  const opponent = competitors.find(c => get(c, "team.abbreviation") !== "PHI");
  const statusName = get(comp, "status.type.name", "STATUS_SCHEDULED");
  const state = get(comp, "status.type.state", "pre");
  const names = broadcastNames(comp);
  const date = new Date(raw.date);
  return {
    raw,
    id: raw.id,
    date,
    monthKey: date.toLocaleString("en-US", { month: "long", year: "numeric" }),
    monthId: `month-${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
    seasonType: Number(get(raw, "seasonType.type", 2)),
    seasonLabel: get(raw, "seasonType.name", "Regular Season"),
    isHome: get(sixers, "homeAway") === "home",
    sixers,
    opponent,
    oppAbbr: get(opponent, "team.abbreviation", ""),
    oppName: get(opponent, "team.shortDisplayName") || get(opponent, "team.displayName", "TBD"),
    oppLogo: get(opponent, "team.logos.0.href", ""),
    oppRecord: recordOf(opponent),
    statusName,
    state,
    statusText: get(comp, "status.type.shortDetail") || get(comp, "status.type.description", "Scheduled"),
    sixersScore: get(sixers, "score.displayValue", null),
    oppScore: get(opponent, "score.displayValue", null),
    won: !!(sixers && sixers.winner),
    venueName: get(comp, "venue.fullName", "TBD"),
    venueCity: get(comp, "venue.address.city", ""),
    broadcasts: names,
    national: isNational(names),
    gamecast: gamecast(raw),
    tickets: ticketUrl(raw),
    maps: mapsUrl(comp),
    flags: []
  };
}

function addLoadFlags(events) {
  const sorted = [...events].sort((a, b) => a.date - b.date);
  for (let i = 0; i < sorted.length; i++) {
    const cur = sorted[i];
    const prev = sorted[i - 1];
    const next = sorted[i + 1];
    cur.flags = [];
    if (prev) {
      const diff = (cur.date - prev.date) / 36e5;
      if (diff <= 30) cur.flags.push("B2B");
    }
    if (prev && next) {
      const span = (next.date - prev.date) / 36e5;
      if (span <= 78) cur.flags.push("3-in-4");
    }
  }
  return events;
}

function seriesLine(all, event) {
  const vs = all.filter(g =>
    g.oppAbbr === event.oppAbbr &&
    g.statusName === "STATUS_FINAL" &&
    g.seasonType === 2
  );
  const wins = vs.filter(g => g.won).length;
  const losses = vs.length - wins;
  if (!vs.length) return `No regular-season games vs ${event.oppName} yet this year.`;
  return `Sixers are ${wins}-${losses} vs ${event.oppName} this season.`;
}

async function fetchSeasonType(year, type) {
  const res = await fetch(`${SCHEDULE_BASE}?season=${year}&seasontype=${type}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.events || [];
}

async function fetchInjuries() {
  for (const url of INJURIES_URLS) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      const rows = [];
      const groups = data.injuries || data.items || [];
      if (Array.isArray(data)) {
        data.forEach(team => {
          if (get(team, "team.abbreviation") === "PHI") {
            (team.injuries || []).forEach(inj => rows.push(inj));
          }
        });
      }
      groups.forEach(item => {
        const teamAbbr = get(item, "team.abbreviation") || get(item, "athlete.team.abbreviation");
        if (!teamAbbr || teamAbbr === "PHI") rows.push(item);
      });
      if (data.team && data.team.injuries) data.team.injuries.forEach(inj => rows.push(inj));
      if (rows.length) return rows;
    } catch (e) {}
  }
  return [];
}

function injuryNote() {
  if (!STATE.injuries.length) return "No injury report posted.";
  const bits = STATE.injuries.slice(0, 4).map(inj => {
    const name = get(inj, "athlete.displayName") || get(inj, "displayName") || "Player";
    const status = get(inj, "status") || get(inj, "longComment") || get(inj, "shortComment") || "";
    return status ? `${name} (${status})` : name;
  });
  return bits.join(" · ");
}

function filteredEvents() {
  return STATE.events.filter(g => {
    if (String(g.seasonType) !== String(STATE.tab)) return false;
    if (STATE.view === "home" && !g.isHome) return false;
    if (STATE.view === "away" && g.isHome) return false;
    if (STATE.tv === "national" && !g.national) return false;
    if (STATE.tv === "local" && g.national) return false;
    return true;
  });
}

function resultHtml(g) {
  if (g.statusName === "STATUS_FINAL" && g.sixersScore != null && g.oppScore != null) {
    return `<span class="score-cell ${g.won ? "win-result" : "loss-result"}">${g.won ? "W" : "L"} ${g.sixersScore}–${g.oppScore}</span>`;
  }
  if ((g.statusName === "STATUS_IN_PROGRESS" || g.statusName === "STATUS_LIVE") && g.sixersScore != null) {
    return `<strong class="score-cell">${g.sixersScore}–${g.oppScore ?? ""}</strong>`;
  }
  return g.date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function flagHtml(g) {
  return g.flags.map(f => `<span class="flag">${f}</span>`).join("");
}

function networkHtml(g) {
  if (!g.broadcasts.length) return `<span class="net-pill net-local">TBD</span>`;
  return g.broadcasts.map(n => `<span class="net-pill ${networkClass(n)}">${n}</span>`).join("");
}

function icsStamp(date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function downloadIcs(id) {
  const g = STATE.events.find(x => x.id === id);
  if (!g) return;
  const end = new Date(g.date.getTime() + 3 * 36e5);
  const title = `${g.isHome ? "vs" : "@"} ${g.oppName}`;
  const loc = [g.venueName, g.venueCity].filter(Boolean).join(", ");
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SixersHoops//Schedule//EN",
    "BEGIN:VEVENT",
    `UID:${g.id}@sixershoops.com`,
    `DTSTAMP:${icsStamp(new Date())}`,
    `DTSTART:${icsStamp(g.date)}`,
    `DTEND:${icsStamp(end)}`,
    `SUMMARY:76ers ${title}`,
    `LOCATION:${loc}`,
    `DESCRIPTION:Watch on ${g.broadcasts.join(" / ") || "TBD"}`,
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");
  const blob = new Blob([ics], { type: "text/calendar" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `sixers-${g.oppAbbr || "game"}-${g.date.toISOString().slice(0, 10)}.ics`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function updateSnapshot() {
  const regular = STATE.events.filter(g => g.seasonType === 2);
  const finals = regular.filter(g => g.statusName === "STATUS_FINAL");
  const wins = finals.filter(g => g.won).length;
  const losses = finals.length - wins;
  const homeF = finals.filter(g => g.isHome);
  const awayF = finals.filter(g => !g.isHome);
  const last10 = finals.slice(-10);
  let streak = 0;
  let streakKind = "";
  for (let i = finals.length - 1; i >= 0; i--) {
    const kind = finals[i].won ? "W" : "L";
    if (!streakKind) streakKind = kind;
    if (finals[i].won === (streakKind === "W")) streak += 1;
    else break;
  }

  const upcoming = STATE.events
    .filter(g => g.state === "pre" || g.statusName === "STATUS_IN_PROGRESS" || g.statusName === "STATUS_LIVE")
    .sort((a, b) => a.date - b.date)[0];

  STATE.nextId = upcoming ? upcoming.id : null;

  document.getElementById("stat-record").textContent = `${wins}-${losses}`;
  document.getElementById("stat-played").textContent = String(finals.length);
  document.getElementById("stat-pct").textContent = finals.length
    ? (wins / finals.length).toFixed(3).replace(/^0/, "")
    : "—.---";
  document.getElementById("stat-splits").textContent =
    `Home ${homeF.filter(g => g.won).length}-${homeF.length - homeF.filter(g => g.won).length} · Away ${awayF.filter(g => g.won).length}-${awayF.length - awayF.filter(g => g.won).length}`;
  document.getElementById("stat-streak").textContent = streak ? `${streakKind}${streak}` : "--";
  document.getElementById("stat-last10").innerHTML = last10.length
    ? last10.map(g => `<span class="wl ${g.won ? "w" : "l"}">${g.won ? "W" : "L"}</span>`).join("")
    : "—";

  const nextEl = document.getElementById("stat-next");
  const nextDateEl = document.getElementById("stat-next-date");
  const countEl = document.getElementById("stat-countdown");
  const injEl = document.getElementById("injury-note");
  if (upcoming) {
    nextEl.textContent = `${upcoming.statusName.includes("LIVE") || upcoming.statusName.includes("PROGRESS") ? "LIVE " : ""}${upcoming.isHome ? "vs" : "@"} ${upcoming.oppName}`;
    nextDateEl.textContent = upcoming.statusText;
    startCountdown(upcoming.date);
  } else {
    nextEl.textContent = "TBD";
    nextDateEl.textContent = "No upcoming game";
    countEl.textContent = "";
  }
  injEl.textContent = injuryNote();
}

function startCountdown(date) {
  const el = document.getElementById("stat-countdown");
  if (STATE.countdownTimer) clearInterval(STATE.countdownTimer);
  const tick = () => {
    const diff = date - new Date();
    if (diff <= 0) {
      el.textContent = "Game time";
      return;
    }
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    el.textContent = `${d}d ${h}h ${m}m ${s}s`;
  };
  tick();
  STATE.countdownTimer = setInterval(tick, 1000);
}

function renderMonthNav(list) {
  const nav = document.getElementById("month-nav");
  const months = [];
  const seen = new Set();
  list.forEach(g => {
    if (!seen.has(g.monthId)) {
      seen.add(g.monthId);
      months.push({ id: g.monthId, label: g.date.toLocaleString("en-US", { month: "short" }) });
    }
  });
  nav.innerHTML = months.length
    ? months.map(m => `<button type="button" class="chip" data-jump="${m.id}">${m.label}</button>`).join("")
    : "";
}

function rowHtml(g) {
  const venue = g.venueCity ? `${g.venueName}, ${g.venueCity}` : g.venueName;
  return `
    <tr class="${g.id === STATE.nextId ? "next-row" : ""}" id="game-${g.id}">
      <td class="date-cell">${g.date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</td>
      <td>
        <div class="game-info">
          <span>${g.isHome ? "vs" : "@"}</span>
          ${g.oppLogo ? `<img src="${g.oppLogo}" alt="${g.oppName}" class="opponent-logo">` : ""}
          <span>${g.oppName}</span>
          ${g.oppRecord ? `<span class="opp-rec">${g.oppRecord}</span>` : ""}
        </div>
        <div class="row-flags">${flagHtml(g)}</div>
        <p class="series">${seriesLine(STATE.events, g)}</p>
      </td>
      <td>${resultHtml(g)}</td>
      <td>
        ${venue}
        ${g.isHome && g.maps ? `<div><a class="mini-link" href="${g.maps}" target="_blank" rel="noopener">Directions</a></div>` : ""}
      </td>
      <td><span class="${badgeFor(g.statusName)}">${g.statusText}</span></td>
      <td class="stream-cell">${networkHtml(g)}</td>
      <td class="actions-cell">
        <button type="button" class="mini-btn" data-ics="${g.id}">Calendar</button>
        ${g.gamecast ? `<a class="mini-link" href="${g.gamecast}" target="_blank" rel="noopener">Gamecast</a>` : ""}
        ${g.tickets ? `<a class="mini-link" href="${g.tickets}" target="_blank" rel="noopener">Tickets</a>` : ""}
      </td>
    </tr>`;
}

function renderList(list) {
  if (!list.length) {
    return `<p class="empty-note">No games match these filters.</p>`;
  }
  const months = {};
  list.forEach(g => {
    (months[g.monthKey] ||= { id: g.monthId, games: [] }).games.push(g);
  });
  return Object.entries(months).map(([label, block]) => `
    <div class="month-section" id="${block.id}">
      <div class="month-header"><h2 class="month-title">${label}</h2></div>
      <div class="table-responsive">
        <table>
          <thead>
            <tr>
              <th>Date</th><th>Opponent</th><th>Result/Time</th>
              <th>Venue</th><th>Status</th><th>Stream</th><th>Links</th>
            </tr>
          </thead>
          <tbody>${block.games.map(rowHtml).join("")}</tbody>
        </table>
      </div>
    </div>`).join("");
}

function renderGrid(list) {
  if (!list.length) return `<p class="empty-note">No games match these filters.</p>`;
  const months = {};
  list.forEach(g => {
    (months[g.monthKey] ||= { id: g.monthId, games: [] }).games.push(g);
  });
  return Object.entries(months).map(([label, block]) => `
    <div class="month-section" id="${block.id}">
      <div class="month-header"><h2 class="month-title">${label}</h2></div>
      <div class="wall-grid">
        ${block.games.map(g => `
          <article class="wall-card ${g.statusName === "STATUS_FINAL" ? (g.won ? "win" : "loss") : ""} ${g.id === STATE.nextId ? "next-row" : ""}">
            <div class="wall-date">${g.date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
            <div class="wall-opp">${g.isHome ? "vs" : "@"} ${g.oppName}</div>
            <div class="wall-res">${g.statusName === "STATUS_FINAL" && g.sixersScore != null ? `${g.won ? "W" : "L"} ${g.sixersScore}–${g.oppScore}` : g.date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</div>
            <div>${networkHtml(g)}</div>
          </article>`).join("")}
      </div>
    </div>`).join("");
}

function renderSchedule() {
  const list = filteredEvents().sort((a, b) => a.date - b.date);
  renderMonthNav(list);
  const root = document.getElementById("schedule");
  root.innerHTML = STATE.mode === "grid" ? renderGrid(list) : renderList(list);
  syncActiveChips();
  writeUrl();
}

function syncActiveChips() {
  document.querySelectorAll("[data-tab]").forEach(b => b.classList.toggle("active", b.dataset.tab === STATE.tab));
  document.querySelectorAll("[data-view]").forEach(b => b.classList.toggle("active", b.dataset.view === STATE.view));
  document.querySelectorAll("[data-tv]").forEach(b => b.classList.toggle("active", b.dataset.tv === STATE.tv));
  document.querySelectorAll("[data-mode]").forEach(b => b.classList.toggle("active", b.dataset.mode === STATE.mode));
}

function jumpToNext() {
  if (!STATE.nextId) return;
  const nextGame = STATE.events.find(g => g.id === STATE.nextId);
  if (nextGame && String(nextGame.seasonType) !== String(STATE.tab)) {
    STATE.tab = String(nextGame.seasonType);
    renderSchedule();
  }
  const el = document.getElementById(`game-${STATE.nextId}`) || document.getElementById(nextGame ? nextGame.monthId : "");
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("flash");
    setTimeout(() => el.classList.remove("flash"), 1600);
  }
}

function scheduleRefresh() {
  if (STATE.refreshTimer) clearInterval(STATE.refreshTimer);
  const live = STATE.events.some(g => g.statusName === "STATUS_IN_PROGRESS" || g.statusName === "STATUS_LIVE");
  STATE.refreshTimer = setInterval(getSixersSchedule, live ? 45000 : 300000);
}

async function getSixersSchedule() {
  const container = document.getElementById("schedule");
  try {
    const probeRes = await fetch(SCHEDULE_BASE);
    if (!probeRes.ok) throw new Error(`HTTP ${probeRes.status}`);
    const probe = await probeRes.json();
    STATE.seasonYear = get(probe, "season.year") || 2027;

    const [pre, reg, post, prev, injuries] = await Promise.all([
      fetchSeasonType(STATE.seasonYear, 1),
      fetchSeasonType(STATE.seasonYear, 2),
      fetchSeasonType(STATE.seasonYear, 3),
      fetchSeasonType(STATE.seasonYear - 1, 2).catch(() => []),
      fetchInjuries()
    ]);

    const parsed = addLoadFlags([...pre, ...reg, ...post].map(parseEvent));
    const prevParsed = prev.map(parseEvent);
    STATE.events = [...parsed, ...prevParsed.filter(g => g.seasonType === 2 && g.statusName === "STATUS_FINAL")];
    // Keep previous-season finals only for series context, not listing
    STATE.events.forEach(g => { g._list = g.raw.season && Number(g.raw.season.year) === Number(STATE.seasonYear); });
    STATE.events = STATE.events.filter(g => g._list !== false || g.statusName === "STATUS_FINAL");
    // Split: current year list + previous year history only
    const currentIds = new Set([...pre, ...reg, ...post].map(e => e.id));
    STATE.events.forEach(g => { g.current = currentIds.has(g.id); });
    STATE.injuries = injuries;

    // Listing uses current-season games only
    const listed = STATE.events.filter(g => g.current);
    const history = STATE.events.filter(g => !g.current);
    STATE.events = [...listed, ...history];

    updateSnapshot();
    renderSchedule();
    scheduleRefresh();
  } catch (err) {
    console.error(err);
    container.innerHTML = `
      <div style="text-align:center;padding:3rem">
        <p style="color:#dc2626;font-weight:700">Error loading schedule.</p>
        <p style="color:var(--mid)">${err.message}</p>
        <button class="chip" onclick="getSixersSchedule()">Try Again</button>
      </div>`;
  }
}

function bindUi() {
  const params = qs();
  STATE.tab = params.get("tab") || "2";
  STATE.view = params.get("view") || "all";
  STATE.tv = params.get("tv") || "all";
  STATE.mode = params.get("mode") || "list";
  if (location.hash.startsWith("#month-")) {
    setTimeout(() => {
      const el = document.getElementById(location.hash.slice(1));
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }, 600);
  }

  document.getElementById("controls").addEventListener("click", e => {
    const t = e.target.closest("[data-tab],[data-view],[data-tv],[data-mode],[data-jump],#jump-next,#theme-toggle,#copy-link");
    if (!t) return;
    if (t.id === "theme-toggle") {
      setTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark");
      writeUrl();
      return;
    }
    if (t.id === "jump-next") return jumpToNext();
    if (t.id === "copy-link") {
      writeUrl();
      navigator.clipboard.writeText(location.href);
      t.textContent = "Copied";
      setTimeout(() => t.textContent = "Copy link", 1200);
      return;
    }
    if (t.dataset.jump) {
      writeUrl("#" + t.dataset.jump);
      const el = document.getElementById(t.dataset.jump);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (t.dataset.tab) STATE.tab = t.dataset.tab;
    if (t.dataset.view) STATE.view = t.dataset.view;
    if (t.dataset.tv) STATE.tv = t.dataset.tv;
    if (t.dataset.mode) STATE.mode = t.dataset.mode;
    renderSchedule();
  });

  document.getElementById("schedule").addEventListener("click", e => {
    const ics = e.target.closest("[data-ics]");
    if (ics) downloadIcs(ics.dataset.ics);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  bindUi();
  getSixersSchedule();
});
