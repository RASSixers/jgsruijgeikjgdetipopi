const SCHEDULE_BASE =
  "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/phi/schedule";
const INJURIES_URL =
  "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/injuries";
const SUMMARY_URL =
  "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary";

let refreshTimer = null;
let pbpTimer = null;
let injuryByAbbr = {};
let featuredEvent = null;

function get(obj, path, fallback) {
  const value = String(path).split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
  return value == null ? fallback : value;
}
function badgeFor(statusName) {
  if (statusName === "STATUS_FINAL") return "badge final";
  if (statusName === "STATUS_IN_PROGRESS" || statusName === "STATUS_LIVE") return "badge live";
  return "badge upcoming";
}
function isLive(statusName) {
  return statusName === "STATUS_IN_PROGRESS" || statusName === "STATUS_LIVE";
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
  return [...map.values()].sort((a, b) => new Date(a.date) - new Date(b.date));
}
function pickFeatured(events) {
  const live = events.find(e => isLive(get(e, "competitions.0.status.type.name", "")));
  if (live) return live;
  return events.find(e => get(e, "competitions.0.status.type.state", "") === "pre") || null;
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
function renderLiveBoard(summary, event) {
  const board = document.getElementById("live-board");
  const body = document.getElementById("live-body");
  const kicker = document.getElementById("live-kicker");
  const clockEl = document.getElementById("live-clock");
  if (!board || !body) return;
  board.classList.add("live");
  kicker.textContent = "Live";
  const comps = get(summary, "header.competitions.0.competitors", []) ||
    get(event, "competitions.0.competitors", []) || [];
  const home = comps.find(c => c.homeAway === "home") || comps[0];
  const away = comps.find(c => c.homeAway === "away") || comps[1];
  const homeScore = get(home, "score", "0");
  const awayScore = get(away, "score", "0");
  const period = get(summary, "header.competitions.0.status.period", get(event, "competitions.0.status.period", ""));
  const displayClock = get(summary, "header.competitions.0.status.displayClock",
    get(event, "competitions.0.status.displayClock", ""));
  const shortDetail = get(summary, "header.competitions.0.status.type.shortDetail",
    get(event, "competitions.0.status.type.shortDetail", "Live"));
  clockEl.textContent = period ? `Q${period} ${displayClock || ""}`.trim() : shortDetail;
  const plays = (get(summary, "plays", []) || []).slice().reverse().slice(0, 10);
  const playHtml = plays.length
    ? `<ul class="pbp-list">${plays.map(p => `
        <li class="${p.scoringPlay ? "score" : ""}">
          <span class="pbp-clock">${get(p, "period.displayValue", "")} ${get(p, "clock.displayValue", "")}</span>
          <span>${get(p, "text", "")}</span>
          <span class="pbp-score">${get(p, "awayScore", "")}–${get(p, "homeScore", "")}</span>
        </li>`).join("")}</ul>`
    : `<p class="live-empty">Waiting for play-by-play…</p>`;
  body.innerHTML = `
    <div class="live-scoreline">
      <div class="live-team">
        <img class="live-logo" src="${get(away, "team.logos.0.href", get(away, "team.logo", ""))}" alt="">
        <span>${get(away, "team.abbreviation", "AWAY")}</span>
      </div>
      <div class="live-score">${awayScore}–${homeScore}</div>
      <div class="live-team away">
        <span>${get(home, "team.abbreviation", "HOME")}</span>
        <img class="live-logo" src="${get(home, "team.logos.0.href", get(home, "team.logo", ""))}" alt="">
      </div>
    </div>
    ${playHtml}`;
}
async function refreshPlayByPlay() {
  if (!featuredEvent) return;
  const statusName = get(featuredEvent, "competitions.0.status.type.name", "");
  if (!isLive(statusName)) {
    renderUpcomingBoard(featuredEvent);
    return;
  }
  try {
    const res = await fetch(`${SUMMARY_URL}?event=${featuredEvent.id}`);
    if (!res.ok) throw new Error("summary failed");
    const summary = await res.json();
    renderLiveBoard(summary, featuredEvent);
  } catch (err) {
    renderLiveBoard({}, featuredEvent);
  }
}
function setLivePolling(event) {
  if (pbpTimer) clearInterval(pbpTimer);
  featuredEvent = event;
  refreshPlayByPlay();
  const live = event && isLive(get(event, "competitions.0.status.type.name", ""));
  pbpTimer = setInterval(refreshPlayByPlay, live ? 12000 : 120000);
}
function setRefreshCadence(events) {
  const live = events.some(event => isLive(get(event, "competitions.0.status.type.name", "")));
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(getSixersSchedule, live ? 45000 : 300000);
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
    if (!next && isLive(statusName)) next = { sixers, opp, event, live: true };
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
  const sixersScore = get(sixers, "score.displayValue", null);
  const oppScore = get(opponent, "score.displayValue", null);
  if (statusType === "STATUS_FINAL" && sixersScore != null && oppScore != null) {
    const won = !!get(sixers, "winner", false);
    resultHtml = `<span class="${won ? "win-result" : "loss-result"}">${won ? "W" : "L"} ${sixersScore}–${oppScore}</span>`;
  } else if (isLive(statusType) && sixersScore != null) {
    resultHtml = `<strong>${sixersScore}–${oppScore ?? ""}</strong>`;
  }
  return `
    <tr class="game-row" tabindex="0">
      <td class="date-cell">${dateStr}</td>
      <td>
        <div class="game-info">
          <span>${isHome ? "vs" : "@"}</span>
          ${opponentLogo ? `<img src="${opponentLogo}" alt="${opponentName}" class="opponent-logo">` : ""}
          <span>${opponentName}</span>
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
          <p class="series-inline">${seriesLine(allEvents, event)}</p>
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
  if (!events.length) {
    return `<section class="season-block"><div class="season-heading">${title}</div><p class="empty-note">${emptyText}</p></section>`;
  }
  const months = {};
  events.forEach(event => {
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
    const allEvents = mergeEvents([probe, pre, regular, playoffs]);
    if (!allEvents.length) {
      container.innerHTML = "<p class='empty-note'>No schedule data available right now.</p>";
      return;
    }
    updateSnapshot(allEvents);
    setLivePolling(pickFeatured(allEvents));
    container.innerHTML = [
      renderSection("Preseason", allEvents.filter(e => eventType(e) === 1), "No preseason games listed yet.", allEvents),
      renderSection("Regular Season", allEvents.filter(e => eventType(e) === 2 || ![1, 2, 3].includes(eventType(e))), "Regular season schedule is not available yet.", allEvents),
      renderSection("Playoffs", allEvents.filter(e => eventType(e) === 3), "Playoff schedule will appear here when available.", allEvents)
    ].join("");
    bindRowToggles(container);
    setRefreshCadence(allEvents);
  } catch (err) {
    container.innerHTML = `<p class="empty-note">Error loading schedule. ${err.message}</p>`;
  }
}
document.addEventListener("DOMContentLoaded", getSixersSchedule);
