const SCHEDULE_BASE =
  "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/phi/schedule";
const INJURIES_URL =
  "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/injuries";

let refreshTimer = null;

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

async function fetchEvents(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.events) ? data.events : [];
  } catch (err) {
    console.warn("Schedule fetch failed:", url, err);
    return [];
  }
}

async function fetchSixersInjuries() {
  try {
    const res = await fetch(INJURIES_URL);
    if (!res.ok) return [];
    const data = await res.json();
    const teams = data.injuries || [];
    const sixers = teams.find(t => /76ers|philadelphia/i.test(t.displayName || ""));
    return (sixers && sixers.injuries) || [];
  } catch (err) {
    return [];
  }
}

function formatInjuries(items) {
  if (!items.length) return "No injury report posted.";
  return items.slice(0, 5).map(inj => {
    const name = get(inj, "athlete.displayName", "Player");
    const status = inj.status || get(inj, "type.description", "");
    const detail = get(inj, "details.detail", "") || get(inj, "details.type", "");
    const extra = [status, detail].filter(Boolean).join(" · ");
    return extra ? `${name} (${extra})` : name;
  }).join(" · ");
}

function mergeEvents(groups) {
  const map = new Map();
  groups.flat().forEach(event => {
    if (event && event.id) map.set(String(event.id), event);
  });
  return [...map.values()].sort((a, b) => new Date(a.date) - new Date(b.date));
}

function setRefreshCadence(events) {
  const live = events.some(event => isLive(get(event, "competitions.0.status.type.name", "")));
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(getSixersSchedule, live ? 45000 : 300000);
}

function updateSnapshot(events, injuries) {
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

  setText("injury-note", formatInjuries(injuries));
}

function renderGameRow(event, allEvents) {
  const date = new Date(event.date);
  const dateStr = isNaN(date) ? "TBD" : date.toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric"
  });
  const timeStr = isNaN(date) ? "" : date.toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit"
  });

  const sixers = sixersOf(event);
  const opponent = oppOf(event);
  const isHome = get(sixers, "homeAway", "") === "home";
  const opponentName = get(opponent, "team.shortDisplayName", "") || get(opponent, "team.displayName", "TBD");
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
    <tr>
      <td class="date-cell">${dateStr}</td>
      <td>
        <div class="game-info">
          <span>${isHome ? "vs" : "@"}</span>
          ${opponentLogo ? `<img src="${opponentLogo}" alt="${opponentName}" class="opponent-logo">` : ""}
          <span>${opponentName}</span>
        </div>
        <p class="series-line">${seriesLine(allEvents, event)}</p>
      </td>
      <td>${resultHtml}</td>
      <td>${venue}</td>
      <td><span class="${badgeFor(statusType)}">${statusText}</span></td>
      <td class="stream-cell">${getBroadcast(get(event, "competitions.0", {}))}</td>
    </tr>`;
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
    html += `
      <div class="month-section">
        <div class="month-header"><h2 class="month-title">${month}</h2></div>
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Date</th><th>Opponent</th><th>Result/Time</th>
                <th>Venue</th><th>Status</th><th>Stream</th>
              </tr>
            </thead>
            <tbody>${months[month].map(event => renderGameRow(event, allEvents)).join("")}</tbody>
          </table>
        </div>
      </div>`;
  });
  html += `</section>`;
  return html;
}

async function getSixersSchedule() {
  const container = document.getElementById("schedule");
  if (!container) return;

  try {
    const probe = await fetchEvents(SCHEDULE_BASE);
    let year = 2027;
    if (probe[0]) year = get(probe[0], "season.year", 2027);

    const [pre, regular, playoffs, injuries] = await Promise.all([
      fetchEvents(`${SCHEDULE_BASE}?season=${year}&seasontype=1`),
      fetchEvents(`${SCHEDULE_BASE}?season=${year}&seasontype=2`),
      fetchEvents(`${SCHEDULE_BASE}?season=${year}&seasontype=3`),
      fetchSixersInjuries()
    ]);

    const allEvents = mergeEvents([probe, pre, regular, playoffs]);
    if (!allEvents.length) {
      container.innerHTML = "<p class='empty-note'>No schedule data available right now.</p>";
      return;
    }

    const preseason = allEvents.filter(e => eventType(e) === 1);
    const regularSeason = allEvents.filter(e => eventType(e) === 2);
    const postseason = allEvents.filter(e => eventType(e) === 3);
    const leftover = allEvents.filter(e => ![1, 2, 3].includes(eventType(e)));

    updateSnapshot(allEvents, injuries);
    container.innerHTML = [
      renderSection("Preseason", preseason, "No preseason games listed yet.", allEvents),
      renderSection("Regular Season", regularSeason.concat(leftover), "Regular season schedule is not available yet.", allEvents),
      renderSection("Playoffs", postseason, "Playoff schedule will appear here when available.", allEvents)
    ].join("");

    setRefreshCadence(allEvents);
  } catch (err) {
    console.error("Schedule Load Error:", err);
    container.innerHTML = `
      <div style="text-align:center;padding:3rem">
        <p style="color:#dc2626;font-weight:700">Error loading schedule.</p>
        <p style="color:var(--mid)">${err.message}</p>
        <button onclick="getSixersSchedule()" style="margin-top:1.5rem;padding:.6rem 1.2rem;border-radius:8px;border:1px solid var(--sixers-blue);background:#fff;color:var(--sixers-blue);font-weight:600">Try Again</button>
      </div>`;
  }
}

document.addEventListener("DOMContentLoaded", getSixersSchedule);
