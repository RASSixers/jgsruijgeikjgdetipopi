const SCHEDULE_BASE =
  "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/phi/schedule";
const INJURIES_URL =
  "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/injuries";
const SUMMARY_URL =
  "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary";
const SCOREBOARD_URL =
  "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard";
const NATIONAL = /NBC|ESPN|ABC|TNT|MAX|PRIME|AMZN|AMAZON|PEACOCK|NBA TV|NBATV/i;

let refreshTimer = null;
let pbpTimer = null;
let pbpInflight = false;
let lastScoreboardCheck = 0;
let lastGoodSummary = null;
let lastGoodEventId = null;
let pbpQuarterFilter = "all"; // "all" | 1 | 2 | 3 | 4 | 5+ for OT
let lastDisplayedScoreKey = "";
let lastPlaysFingerprint = "";
let injuryByAbbr = {};
let featuredEvent = null;
let allEventsCache = [];
let activeFilter = "all";

function get(obj, path, fallback) {
  const value = String(path).split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
  return value == null ? fallback : value;
}
function badgeFor(statusName, state) {
  const name = String(statusName || "");
  const st = String(state || "").toLowerCase();
  if (name === "STATUS_FINAL" || st === "post") return "badge final";
  if (isLive(name, st)) return "badge live";
  return "badge upcoming";
}
/** ESPN uses STATUS_IN_PROGRESS / state "in" — accept all common live signals */
function isLive(statusName, state) {
  const name = String(statusName || "").toUpperCase();
  const st = String(state || "").toLowerCase();
  if (st === "in") return true;
  if (name === "STATUS_IN_PROGRESS" || name === "STATUS_LIVE" || name === "STATUS_HALFTIME") return true;
  if (name.includes("PROGRESS") || name.includes("HALFTIME") || name.includes("LIVE")) return true;
  return false;
}
function formatGameClock(status, periodFallback) {
  const period = get(status, "period", periodFallback) || "";
  const clock = get(status, "displayClock", "") || "";
  const shortDetail = get(status, "type.shortDetail", "") || get(status, "type.detail", "");
  const name = String(get(status, "type.name", "")).toUpperCase();
  // Halftime
  if (name.includes("HALFTIME") || /half/i.test(shortDetail)) return "Halftime";
  // OT
  if (period && Number(period) > 4) {
    const ot = Number(period) - 4;
    return clock ? `OT${ot} · ${clock}` : `OT${ot}`;
  }
  if (period && clock) return `Q${period} · ${clock}`;
  if (period) return `Q${period}`;
  if (clock) return clock;
  // Clean ESPN shortDetail like "8:14 - 1st" → "Q1 · 8:14"
  const m = String(shortDetail).match(/^(\d+:\d+)\s*[-–]\s*(\d+)(st|nd|rd|th)?/i);
  if (m) return `Q${m[2]} · ${m[1]}`;
  return shortDetail || "Live";
}
function formatPlayClock(p) {
  const n = get(p, "period.number", "");
  const clock = get(p, "clock.displayValue", "") || "";
  if (n && Number(n) > 4) {
    const ot = Number(n) - 4;
    return clock ? `OT${ot} ${clock}` : `OT${ot}`;
  }
  if (n && clock) return `Q${n} ${clock}`;
  if (n) return `Q${n}`;
  const label = get(p, "period.displayValue", "");
  return (label + " " + clock).trim() || "—";
}
function eventIsLive(event) {
  if (!event) return false;
  const name = get(event, "competitions.0.status.type.name", "");
  const state = get(event, "competitions.0.status.type.state", "");
  return isLive(name, state);
}
function getBroadcast(competition) {
  const broadcasts = get(competition, "broadcasts", []) || [];
  const names = broadcasts
    .map(b => get(b, "media.shortName", "") || get(b, "shortName", ""))
    .filter(Boolean);
  return [...new Set(names)].join(" / ") || "TBD";
}
function eventType(event) {
  return Number(get(event, "seasonType.type", 0));
}
function oppOf(event) {
  const comps = get(event, "competitions.0.competitors", []) || [];
  return comps.find(c => get(c, "team.abbreviation", "") !== "PHI") || null;
}
function sixersOf(event) {
  const comps = get(event, "competitions.0.competitors", []) || [];
  return comps.find(c => get(c, "team.abbreviation", "") === "PHI") || null;
}
function markBackToBacks(events) {
  const sorted = events.slice().sort((a, b) => new Date(a.date) - new Date(b.date));
  sorted.forEach((event, i) => {
    const prev = sorted[i - 1];
    const next = sorted[i + 1];
    const t = new Date(event.date).getTime();
    const nearPrev = prev && Math.abs(t - new Date(prev.date).getTime()) <= 40 * 60 * 60 * 1000;
    const nearNext = next && Math.abs(new Date(next.date).getTime() - t) <= 40 * 60 * 60 * 1000;
    event._b2b = !!(nearPrev || nearNext);
  });
  return events;
}
function seriesLine(allEvents, event) {
  const abbr = get(oppOf(event), "team.abbreviation", "");
  const name = get(oppOf(event), "team.shortDisplayName", abbr || "this opponent");
  if (!abbr) return "Series history unavailable.";
  const finished = allEvents.filter(e =>
    get(e, "competitions.0.status.type.name", "") === "STATUS_FINAL" &&
    eventType(e) === 2 &&
    get(oppOf(e), "team.abbreviation", "") === abbr
  );
  const wins = finished.filter(e => get(sixersOf(e), "winner", false)).length;
  if (!finished.length) return `No regular-season games vs ${name} yet this year.`;
  return `Sixers are ${wins}-${finished.length - wins} vs ${name} this year.`;
}
function statusClass(status) {
  const s = String(status || "").toLowerCase();
  if (s.includes("out")) return "out";
  if (s.includes("doubt")) return "doubtful";
  if (s.includes("question")) return "questionable";
  if (s.includes("prob")) return "probable";
  return "";
}
function parseTeamInjuries(teamBlock) {
  return (get(teamBlock, "injuries", []) || []).map(inj => ({
    name: get(inj, "athlete.displayName", "Player"),
    status: inj.status || get(inj, "type.description", "—"),
    detail: get(inj, "details.type", "") || get(inj, "details.detail", "") || "—"
  }));
}
async function fetchEvents(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.events) ? data.events : [];
  } catch (err) {
    return [];
  }
}
async function fetchInjuryMap() {
  try {
    const res = await fetch(INJURIES_URL);
    if (!res.ok) return {};
    const data = await res.json();
    const map = {};
    (data.injuries || []).forEach(team => {
      const abbr = get(team, "team.abbreviation", "") ||
        (/76ers|philadelphia/i.test(team.displayName || "") ? "PHI" : "");
      if (abbr) map[abbr] = parseTeamInjuries(team);
    });
    return map;
  } catch (err) {
    return {};
  }
}
function mergeEvents(groups) {
  const map = new Map();
  groups.flat().forEach(event => {
    if (event && event.id) map.set(String(event.id), event);
  });
  return markBackToBacks([...map.values()].sort((a, b) => new Date(a.date) - new Date(b.date)));
}
function pickFeatured(events) {
  const live = events.find(e => eventIsLive(e));
  if (live) return live;
  // Prefer soonest upcoming (pre)
  const upcoming = events
    .filter(e => get(e, "competitions.0.status.type.state", "") === "pre")
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  return upcoming[0] || null;
}
function passesFilter(event) {
  const statusName = get(event, "competitions.0.status.type.name", "");
  const state = get(event, "competitions.0.status.type.state", "");
  const home = get(sixersOf(event), "homeAway", "") === "home";
  const stream = getBroadcast(get(event, "competitions.0", {}));
  if (activeFilter === "remaining") return state !== "post" && statusName !== "STATUS_FINAL";
  if (activeFilter === "home") return home;
  if (activeFilter === "away") return !home;
  if (activeFilter === "b2b") return !!event._b2b;
  if (activeFilter === "national") return NATIONAL.test(stream);
  return true;
}
function renderUpcomingBoard(event) {
  const board = document.getElementById("live-board");
  const body = document.getElementById("live-body");
  const kicker = document.getElementById("live-kicker");
  const clock = document.getElementById("live-clock");
  if (!board || !body) return;
  board.classList.remove("live");
  kicker.textContent = "Next game";
  if (!event) {
    clock.textContent = "—";
    body.innerHTML = `<p class="live-empty">No upcoming Sixers game listed.</p>`;
    return;
  }
  const sixers = sixersOf(event);
  const opp = oppOf(event);
  const isHome = get(sixers, "homeAway", "") === "home";
  const oppName = get(opp, "team.displayName", "Opponent");
  const oppLogo = get(opp, "team.logos.0.href", "");
  const phiLogo = get(sixers, "team.logos.0.href", "");
  const detail = get(event, "competitions.0.status.type.detail", "") ||
    get(event, "competitions.0.status.type.shortDetail", "TBD");
  const stream = getBroadcast(get(event, "competitions.0", {}));
  clock.textContent = detail;
  body.innerHTML = `
    <div class="live-scoreline">
      <div class="live-team">${isHome
        ? `<img class="live-logo" src="${phiLogo}" alt="76ers"><span>76ers</span>`
        : `<img class="live-logo" src="${oppLogo}" alt=""><span>${oppName}</span>`}</div>
      <div class="live-score">vs</div>
      <div class="live-team away">${isHome
        ? `<span>${oppName}</span><img class="live-logo" src="${oppLogo}" alt="">`
        : `<span>76ers</span><img class="live-logo" src="${phiLogo}" alt="76ers">`}</div>
    </div>
    <p class="live-empty">${isHome ? "vs" : "@"} ${get(opp, "team.shortDisplayName", oppName)} · ${stream}</p>`;
}
function teamLogo(team) {
  if (!team) return "";
  return get(team, "logos.0.href", "") || get(team, "logo", "") || "";
}
function playPeriodNumber(p) {
  let n = Number(get(p, "period.number", 0));
  if (n) return n;
  // Fallback: parse "1st Quarter" / "2nd" / "OT1"
  const label = String(get(p, "period.displayValue", "") || "");
  const ot = label.match(/OT\s*(\d+)/i);
  if (ot) return 4 + Number(ot[1]);
  const q = label.match(/(\d+)(st|nd|rd|th)?/i);
  if (q) return Number(q[1]);
  return 0;
}

function buildPbpFilters(plays, status, isFinal) {
  const period = Number(get(status, "period", 0)) || 0;
  const maxQ = isFinal ? Math.max(4, ...plays.map(playPeriodNumber), period) : Math.max(period, 1);
  const available = [];
  available.push({ id: "all", label: "All" });
  for (let q = 1; q <= Math.min(4, maxQ); q++) {
    available.push({ id: String(q), label: "Q" + q });
  }
  // OT filters only after OT starts or postgame with OT plays
  const hasOt = plays.some(p => playPeriodNumber(p) > 4) || period > 4;
  if (hasOt) {
    const otMax = Math.max(period, ...plays.map(playPeriodNumber));
    for (let ot = 5; ot <= otMax; ot++) {
      available.push({ id: String(ot), label: "OT" + (ot - 4) });
    }
  }
  return available;
}

function renderLiveBoard(summary, event) {
  const board = document.getElementById("live-board");
  const body = document.getElementById("live-body");
  const kicker = document.getElementById("live-kicker");
  const clockEl = document.getElementById("live-clock");
  if (!board || !body) return;
  board.classList.add("live");

  const status = get(summary, "header.competitions.0.status", {}) ||
    get(event, "competitions.0.status", {}) || {};
  const state = String(get(status, "type.state", "")).toLowerCase();
  const isFinal = state === "post" || String(get(status, "type.name", "")).includes("FINAL");
  if (kicker) kicker.textContent = isFinal ? "Final" : "Live";
  if (clockEl) clockEl.textContent = isFinal
    ? (get(status, "type.shortDetail", "Final") || "Final")
    : formatGameClock(status);

  const comps = get(summary, "header.competitions.0.competitors", []) ||
    get(event, "competitions.0.competitors", []) || [];
  const home = comps.find(c => c.homeAway === "home") || comps[0] || {};
  const away = comps.find(c => c.homeAway === "away") || comps[1] || {};
  const awayScore = String(get(away, "score", "0"));
  const homeScore = String(get(home, "score", "0"));
  const awayAbbr = get(away, "team.abbreviation", get(away, "team.shortDisplayName", "AWAY"));
  const homeAbbr = get(home, "team.abbreviation", get(home, "team.shortDisplayName", "HOME"));
  const scoreKey = awayAbbr + awayScore + "-" + homeAbbr + homeScore;

  // Detect score bumps for animation
  let awayBump = 0;
  let homeBump = 0;
  if (lastDisplayedScoreKey && lastDisplayedScoreKey !== scoreKey) {
    try {
      const prev = lastDisplayedScoreKey.match(/(\D+)(\d+)-(\D+)(\d+)/);
      if (prev) {
        const prevAway = Number(prev[2]);
        const prevHome = Number(prev[4]);
        const dAway = Number(awayScore) - prevAway;
        const dHome = Number(homeScore) - prevHome;
        if (dAway > 0 && dAway <= 4) awayBump = dAway;
        if (dHome > 0 && dHome <= 4) homeBump = dHome;
      }
    } catch (_) {}
  }
  lastDisplayedScoreKey = scoreKey;

  let plays = [];
  const raw = get(summary, "plays", null);
  if (Array.isArray(raw) && raw.length) plays = raw.slice();
  plays = plays.slice().reverse(); // newest first

  const filters = buildPbpFilters(plays, status, isFinal);
  // Clamp filter if not available yet
  if (pbpQuarterFilter !== "all" && !filters.some(f => f.id === String(pbpQuarterFilter))) {
    pbpQuarterFilter = "all";
  }

  const filtered = pbpQuarterFilter === "all"
    ? plays
    : plays.filter(p => {
        const pn = playPeriodNumber(p);
        const want = Number(pbpQuarterFilter);
        return pn === want;
      });

  const fingerprint = scoreKey + "|" + pbpQuarterFilter + "|" + filtered.length + "|" +
    (filtered[0] && (filtered[0].id || filtered[0].text) || "");

  // Preserve scroll if only scores changed slightly and list structure same length+top
  const listEl = body.querySelector(".pbp-list");
  const prevScroll = listEl ? listEl.scrollTop : 0;
  const sameList = fingerprint === lastPlaysFingerprint && listEl;

  const filterHtml = `<div class="pbp-filters" role="tablist" aria-label="Filter by period">
    ${filters.map(f => {
      const on = String(pbpQuarterFilter) === String(f.id);
      return `<button type="button" role="tab" class="pbp-filter-btn${on ? " on" : ""}" data-pbp-q="${f.id}" aria-selected="${on ? "true" : "false"}">${f.label}</button>`;
    }).join("")}
  </div>`;

  const playHtml = filtered.length
    ? `<ul class="pbp-list">${filtered.map(p => {
        const clock = formatPlayClock(p);
        const text = get(p, "text", "") || get(p, "description", "") || "—";
        const sc = (get(p, "awayScore", "") !== "" && get(p, "homeScore", "") !== "")
          ? `${get(p, "awayScore", "")}–${get(p, "homeScore", "")}`
          : "";
        return `<li class="${p.scoringPlay ? "score" : ""}">
          <span class="pbp-clock">${clock}</span>
          <span class="pbp-text">${text}</span>
          <span class="pbp-score">${sc}</span>
        </li>`;
      }).join("")}</ul>`
    : `<p class="live-empty">${plays.length ? "No plays in this period yet." : "Play-by-play will appear as the game progresses…"}</p>`;

  body.innerHTML = `
    <div class="live-scoreline">
      <div class="live-team">
        <img class="live-logo" src="${teamLogo(away.team)}" alt="" onerror="this.style.display='none'">
        <span>${awayAbbr}</span>
        ${awayBump ? `<span class="score-bump ${awayAbbr === "PHI" ? "phi" : "opp"}" aria-hidden="true">+${awayBump}</span>` : ""}
      </div>
      <div class="live-score">${awayScore}–${homeScore}</div>
      <div class="live-team away">
        ${homeBump ? `<span class="score-bump ${homeAbbr === "PHI" ? "phi" : "opp"}" aria-hidden="true">+${homeBump}</span>` : ""}
        <span>${homeAbbr}</span>
        <img class="live-logo" src="${teamLogo(home.team)}" alt="" onerror="this.style.display='none'">
      </div>
    </div>
    <div class="pbp-head-row">
      <div class="pbp-head">Play-by-play</div>
      ${filterHtml}
    </div>
    ${playHtml}`;

  lastPlaysFingerprint = fingerprint;

  // Restore scroll so list doesn't jump to top on every poll
  const newList = body.querySelector(".pbp-list");
  if (newList && prevScroll > 0) {
    newList.scrollTop = prevScroll;
  }

  // Remove bump nodes after animation
  body.querySelectorAll(".score-bump").forEach(el => {
    el.addEventListener("animationend", () => el.remove(), { once: true });
    setTimeout(() => el.remove(), 1200);
  });
}

/** Prefer scoreboard for live PHI game (more reliable status than team schedule) */
async function findLivePhiEvent() {
  try {
    const res = await fetch(SCOREBOARD_URL + "?limit=50");
    if (!res.ok) return null;
    const data = await res.json();
    const events = data.events || [];
    const phiLive = events.find(e => {
      const comps = get(e, "competitions.0.competitors", []) || [];
      const isPhi = comps.some(c => get(c, "team.abbreviation", "") === "PHI");
      return isPhi && eventIsLive(e);
    });
    return phiLive || null;
  } catch (err) {
    console.warn("scoreboard live lookup", err);
    return null;
  }
}

async function fetchSummaryForEvent(eventId) {
  // Primary: site.api summary; fallback: cdn.espn playbyplay package
  const urls = [
    `${SUMMARY_URL}?event=${encodeURIComponent(eventId)}`,
    `https://cdn.espn.com/core/nba/playbyplay?xhr=1&gameId=${encodeURIComponent(eventId)}`
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) continue;
      const data = await res.json();
      // cdn wraps in gamepackageJSON
      if (data && data.gamepackageJSON) {
        const gp = data.gamepackageJSON;
        return {
          plays: gp.plays || [],
          header: gp.header || data.header || {},
          boxscore: gp.boxscore
        };
      }
      if (data && (Array.isArray(data.plays) || data.header)) return data;
    } catch (err) {
      console.warn("summary fetch", url, err);
    }
  }
  return null;
}

async function refreshPlayByPlay() {
  if (pbpInflight) return;
  pbpInflight = true;
  try {
    let event = featuredEvent;
    const now = Date.now();
    // Scoreboard only occasionally; don't block PBP on it
    if (now - lastScoreboardCheck > 10000) {
      lastScoreboardCheck = now;
      findLivePhiEvent().then(liveFromBoard => {
        if (liveFromBoard) featuredEvent = liveFromBoard;
      }).catch(() => {});
    }

    if (!event) {
      renderUpcomingBoard(null);
      return;
    }

    if (!eventIsLive(event)) {
      // Final games: still show full PBP once if we have it
      if (lastGoodSummary && lastGoodEventId === String(event.id)) {
        renderLiveBoard(lastGoodSummary, event);
        const k = document.getElementById("live-kicker");
        if (k) k.textContent = "Final";
        return;
      }
      renderUpcomingBoard(event);
      return;
    }

    const summary = await fetchSummaryForEvent(event.id);
    if (summary && Array.isArray(summary.plays) && summary.plays.length) {
      lastGoodSummary = summary;
      lastGoodEventId = String(event.id);
      renderLiveBoard(summary, event);
    } else if (summary && summary.header) {
      // Got scores but no plays this tick — keep prior PBP if same game
      if (lastGoodSummary && lastGoodEventId === String(event.id) && (lastGoodSummary.plays || []).length) {
        const merged = Object.assign({}, summary, { plays: lastGoodSummary.plays });
        // Prefer newer header scores
        renderLiveBoard(merged, event);
      } else {
        lastGoodSummary = summary;
        lastGoodEventId = String(event.id);
        renderLiveBoard(summary, event);
      }
    } else if (lastGoodSummary && lastGoodEventId === String(event.id)) {
      // Network blip — do not wipe PBP
      renderLiveBoard(lastGoodSummary, event);
    } else {
      renderLiveBoard({ header: { competitions: event.competitions || [] } }, event);
    }
  } finally {
    pbpInflight = false;
  }
}

function clearPbpTimer() {
  if (pbpTimer) {
    clearTimeout(pbpTimer);
    clearInterval(pbpTimer);
    pbpTimer = null;
  }
}

function setLivePolling(event) {
  clearPbpTimer();
  featuredEvent = event;
  lastScoreboardCheck = 0;
  if (!event || String(event.id) !== lastGoodEventId) {
    pbpQuarterFilter = "all";
    lastDisplayedScoreKey = "";
    lastPlaysFingerprint = "";
  }

  const tick = async () => {
    await refreshPlayByPlay();
    const live = eventIsLive(featuredEvent);
    // 1s while live — as fast as useful; ESPN still caches responses briefly
    pbpTimer = setTimeout(tick, live ? 500 : 60000);
  };
  tick();
}

function setRefreshCadence(events) {
  const live = (events || []).some(event => eventIsLive(event));
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(getSixersSchedule, live ? 30000 : 300000);
}
function updateSnapshot(events) {
  let wins = 0, losses = 0, played = 0, next = null;
  events.forEach(event => {
    const statusName = get(event, "competitions.0.status.type.name", "");
    const state = get(event, "competitions.0.status.type.state", "");
    const sixers = sixersOf(event);
    const opp = oppOf(event);
    if (statusName === "STATUS_FINAL" && eventType(event) === 2) {
      played += 1;
      if (get(sixers, "winner", false)) wins += 1;
      else losses += 1;
    }
    if (!next && isLive(statusName, get(event, "competitions.0.status.type.state", ""))) next = { sixers, opp, event, live: true };
    else if (!next && state === "pre") next = { sixers, opp, event, live: false };
  });
  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };
  setText("stat-record", `${wins}-${losses}`);
  setText("stat-played", String(played));
  setText("stat-pct", played ? (wins / played).toFixed(3).replace(/^0/, "") : "—.---");
  if (next) {
    const oppName = get(next.opp, "team.shortDisplayName", "") || get(next.opp, "team.displayName", "TBD");
    const isHome = get(next.sixers, "homeAway", "") === "home";
    setText("stat-next", `${next.live ? "LIVE " : ""}${isHome ? "vs" : "@"} ${oppName}`);
    setText("stat-next-date", get(next.event, "competitions.0.status.type.shortDetail", "TBD"));
  } else {
    setText("stat-next", "TBD");
    setText("stat-next-date", "No upcoming game");
  }
}
function injuryBlock(title, items) {
  if (!items || !items.length) {
    return `<p class="inj-title">${title}</p><p class="inj-empty">No injuries listed.</p>`;
  }
  return `<p class="inj-title">${title}</p>
    <ul class="inj-list">${items.map(item => `
      <li>
        <span class="inj-name">${item.name}</span>
        <span class="inj-status ${statusClass(item.status)}">${item.status}</span>
        <span>${item.detail}</span>
      </li>`).join("")}</ul>`;
}
function renderGameRow(event, allEvents) {
  const date = new Date(event.date);
  const dateStr = isNaN(date) ? "TBD" : date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const timeStr = isNaN(date) ? "" : date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const sixers = sixersOf(event);
  const opponent = oppOf(event);
  const isHome = get(sixers, "homeAway", "") === "home";
  const opponentName = get(opponent, "team.shortDisplayName", "") || get(opponent, "team.displayName", "TBD");
  const oppAbbr = get(opponent, "team.abbreviation", "");
  const opponentLogo = get(opponent, "team.logos.0.href", "");
  const venueName = get(event, "competitions.0.venue.fullName", "");
  const venueCity = get(event, "competitions.0.venue.address.city", "");
  const venue = venueName ? (venueCity ? `${venueName}, ${venueCity}` : venueName) : "TBD";
  const statusType = get(event, "competitions.0.status.type.name", "STATUS_SCHEDULED");
  const statusText = get(event, "competitions.0.status.type.shortDetail", "") ||
    get(event, "competitions.0.status.type.description", "Scheduled");
  let resultHtml = timeStr || "TBD";
  const state = get(event, "competitions.0.status.type.state", "");
  const sixersScore = get(sixers, "score.displayValue", null) ?? get(sixers, "score", null);
  const oppScore = get(opponent, "score.displayValue", null) ?? get(opponent, "score", null);
  if ((statusType === "STATUS_FINAL" || state === "post") && sixersScore != null && oppScore != null) {
    const won = !!get(sixers, "winner", false) || Number(sixersScore) > Number(oppScore);
    resultHtml = `<span class="${won ? "win-result" : "loss-result"}">${won ? "W" : "L"} ${sixersScore}–${oppScore}</span>`;
  } else if (isLive(statusType, state) && sixersScore != null) {
    resultHtml = `<strong>LIVE ${sixersScore}–${oppScore ?? ""}</strong>`;
  }

  return `
    <tr class="game-row" tabindex="0">
      <td class="date-cell">${dateStr}</td>
      <td>
        <div class="game-info">
          <span>${isHome ? "vs" : "@"}</span>
          ${opponentLogo ? `<img src="${opponentLogo}" alt="${opponentName}" class="opponent-logo">` : ""}
          <span>${opponentName}</span>
          ${event._b2b ? `<span class="b2b-tag">B2B</span>` : ""}
        </div>
      </td>
      <td>${resultHtml}</td>
      <td>${venue}</td>
      <td><span class="${badgeFor(statusType)}">${statusText}</span></td>
      <td class="stream-cell">${getBroadcast(get(event, "competitions.0", {}))}</td>
    </tr>
    <tr class="game-detail-row">
      <td colspan="6">
        <div class="game-detail">
          <p class="series-inline">${seriesLine(allEvents, event)}${event._b2b ? " · Back-to-back set." : ""}</p>
          ${injuryBlock("76ers injuries", injuryByAbbr.PHI || [])}
          ${injuryBlock(`${opponentName} injuries`, injuryByAbbr[oppAbbr] || [])}
        </div>
      </td>
    </tr>`;
}
function bindRowToggles(root) {
  root.querySelectorAll(".game-row").forEach(row => {
    const toggle = () => {
      root.querySelectorAll(".game-row.open").forEach(open => {
        if (open !== row) open.classList.remove("open");
      });
      row.classList.toggle("open");
    };
    row.addEventListener("click", toggle);
    row.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); }
    });
  });
}
function renderSection(title, events, emptyText, allEvents) {
  const shown = events.filter(passesFilter);
  if (!shown.length) {
    return `<section class="season-block"><div class="season-heading">${title}</div><p class="empty-note">${emptyText}</p></section>`;
  }
  const months = {};
  shown.forEach(event => {
    const date = new Date(event.date);
    const key = isNaN(date) ? "Upcoming" : date.toLocaleString("en-US", { month: "long", year: "numeric" });
    (months[key] ||= []).push(event);
  });
  let html = `<section class="season-block"><div class="season-heading">${title}</div>`;
  Object.keys(months).forEach(month => {
    html += `<div class="month-section">
      <div class="month-header"><h2 class="month-title">${month}</h2></div>
      <div class="table-responsive"><table>
        <thead><tr><th>Date</th><th>Opponent</th><th>Result/Time</th><th>Venue</th><th>Status</th><th>Stream</th></tr></thead>
        <tbody>${months[month].map(event => renderGameRow(event, allEvents)).join("")}</tbody>
      </table></div></div>`;
  });
  return html + `</section>`;
}
function paintLog() {
  const container = document.getElementById("schedule");
  if (!container || !allEventsCache.length) return;
  container.innerHTML = [
    renderSection("Preseason", allEventsCache.filter(e => eventType(e) === 1), "No matching preseason games.", allEventsCache),
    renderSection("Regular Season", allEventsCache.filter(e => eventType(e) === 2 || ![1, 2, 3].includes(eventType(e))), "No matching regular-season games.", allEventsCache),
    renderSection("Playoffs", allEventsCache.filter(e => eventType(e) === 3), "No matching playoff games.", allEventsCache)
  ].join("");
  bindRowToggles(container);
}
function bindFilters() {
  const bar = document.getElementById("filter-bar");
  if (!bar) return;
  bar.addEventListener("click", e => {
    const btn = e.target.closest("[data-filter]");
    if (!btn) return;
    activeFilter = btn.dataset.filter;
    bar.querySelectorAll(".filter-btn").forEach(b => b.classList.toggle("on", b === btn));
    paintLog();
  });
}
async function getSixersSchedule() {
  const container = document.getElementById("schedule");
  if (!container) return;
  try {
    const probe = await fetchEvents(SCHEDULE_BASE);
    const year = probe[0] ? get(probe[0], "season.year", 2027) : 2027;
    const [pre, regular, playoffs, injuries] = await Promise.all([
      fetchEvents(`${SCHEDULE_BASE}?season=${year}&seasontype=1`),
      fetchEvents(`${SCHEDULE_BASE}?season=${year}&seasontype=2`),
      fetchEvents(`${SCHEDULE_BASE}?season=${year}&seasontype=3`),
      fetchInjuryMap()
    ]);
    injuryByAbbr = injuries;
    allEventsCache = mergeEvents([probe, pre, regular, playoffs]);
    if (!allEventsCache.length) {
      container.innerHTML = "<p class='empty-note'>No schedule data available right now.</p>";
      return;
    }
    updateSnapshot(allEventsCache);
    let featured = pickFeatured(allEventsCache);
    try {
      const livePhi = await findLivePhiEvent();
      if (livePhi) featured = livePhi;
    } catch (_) {}
    setLivePolling(featured);
    paintLog();
    setRefreshCadence(allEventsCache);
  } catch (err) {
    container.innerHTML = `<p class="empty-note">Error loading schedule. ${err.message}</p>`;
  }
}
document.addEventListener("DOMContentLoaded", () => {
  bindFilters();
  // Quarter filters for play-by-play (event delegation)
  document.addEventListener("click", e => {
    const btn = e.target.closest("[data-pbp-q]");
    if (!btn) return;
    pbpQuarterFilter = btn.getAttribute("data-pbp-q") || "all";
    if (lastGoodSummary && featuredEvent) {
      renderLiveBoard(lastGoodSummary, featuredEvent);
    }
  });
  getSixersSchedule();
});
