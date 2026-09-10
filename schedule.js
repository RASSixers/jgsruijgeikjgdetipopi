const SCHEDULE_BASE =
  "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/phi/schedule";

const SEASON_SECTIONS = [
  { type: 1, title: "Preseason", empty: "No preseason games listed yet." },
  { type: 2, title: "Regular Season", empty: "Regular season schedule is not available yet." },
  { type: 3, title: "Playoffs", empty: "Playoff schedule will appear here when available." }
];

function get(obj, path, fallback = "") {
  return path.split(".").reduce((o, k) => (o && o[k] != null ? o[k] : undefined), obj) ?? fallback;
}

function badgeFor(statusName) {
  if (statusName === "STATUS_FINAL") return "badge final";
  if (statusName === "STATUS_IN_PROGRESS" || statusName === "STATUS_LIVE") return "badge live";
  return "badge upcoming";
}

function getBroadcast(competition) {
  const broadcasts = competition.broadcasts || [];
  const names = broadcasts
    .map(b => get(b, "media.shortName") || get(b, "names.0") || get(b, "shortName"))
    .filter(Boolean);

  const unique = [...new Set(names)];
  return unique.length ? unique.join(" / ") : "TBD";
}

function seasonYearFromEvents(events) {
  const year = get(events[0], "season.year");
  return year || new Date().getFullYear() + (new Date().getMonth() >= 9 ? 1 : 0);
}

async function fetchSeasonType(seasonYear, seasonType) {
  const url = `${SCHEDULE_BASE}?season=${seasonYear}&seasontype=${seasonType}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
  const data = await res.json();
  return data.events || [];
}

function updateSnapshot(allEvents) {
  let wins = 0;
  let losses = 0;
  let played = 0;
  let next = null;

  const sorted = [...allEvents].sort((a, b) => new Date(a.date) - new Date(b.date));

  for (const event of sorted) {
    const comp = event.competitions && event.competitions[0];
    if (!comp) continue;

    const sixers = (comp.competitors || []).find(c => get(c, "team.abbreviation") === "PHI");
    const opp = (comp.competitors || []).find(c => get(c, "team.abbreviation") !== "PHI");
    const statusName = get(comp, "status.type.name");
    const state = get(comp, "status.type.state");
    const seasonType = event.seasonType && event.seasonType.type;

    if (statusName === "STATUS_FINAL" && seasonType === 2) {
      played += 1;
      if (sixers && sixers.winner) wins += 1;
      else losses += 1;
    }

    if (!next && (statusName === "STATUS_IN_PROGRESS" || statusName === "STATUS_LIVE")) {
      next = { sixers, opp, comp, live: true };
    } else if (!next && state === "pre") {
      next = { sixers, opp, comp, live: false };
    }
  }

  const recordEl = document.getElementById("stat-record");
  const playedEl = document.getElementById("stat-played");
  const pctEl = document.getElementById("stat-pct");
  const nextEl = document.getElementById("stat-next");
  const nextDateEl = document.getElementById("stat-next-date");

  if (recordEl) recordEl.textContent = `${wins}-${losses}`;
  if (playedEl) playedEl.textContent = String(played);
  if (pctEl) {
    pctEl.textContent = played ? (wins / played).toFixed(3).replace(/^0/, "") : "—.---";
  }

  if (nextEl && nextDateEl) {
    if (next) {
      const oppName =
        get(next.opp, "team.shortDisplayName") ||
        get(next.opp, "team.displayName", "TBD");
      const isHome = get(next.sixers, "homeAway") === "home";
      nextEl.textContent = next.live
        ? `LIVE ${isHome ? "vs" : "@"} ${oppName}`
        : `${isHome ? "vs" : "@"} ${oppName}`;
      nextDateEl.textContent = get(next.comp, "status.type.shortDetail", "TBD");
    } else {
      nextEl.textContent = "TBD";
      nextDateEl.textContent = "No upcoming game";
    }
  }
}

function renderGameRow(event) {
  const date = new Date(event.date);
  const dateStr = date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric"
  });
  const timeStr = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit"
  });

  const competition = (event.competitions && event.competitions[0]) || {};
  const competitors = competition.competitors || [];
  const sixers = competitors.find(c => get(c, "team.abbreviation") === "PHI");
  const opponent = competitors.find(c => get(c, "team.abbreviation") !== "PHI");

  const isHome = get(sixers, "homeAway") === "home";
  const opponentName =
    get(opponent, "team.shortDisplayName") ||
    get(opponent, "team.displayName", "TBD");
  const opponentLogo = get(opponent, "team.logos.0.href", "");
  const venueName = get(competition, "venue.fullName");
  const venueCity = get(competition, "venue.address.city");
  const venue = venueName
    ? (venueCity ? `${venueName}, ${venueCity}` : venueName)
    : "TBD";

  const statusType = get(competition, "status.type.name", "STATUS_SCHEDULED");
  const statusText =
    get(competition, "status.type.shortDetail") ||
    get(competition, "status.type.description", "Scheduled");

  let resultHtml = timeStr;
  const sixersScore = get(sixers, "score.displayValue", null);
  const oppScore = get(opponent, "score.displayValue", null);

  if (statusType === "STATUS_FINAL" && sixersScore != null && oppScore != null) {
    const won = !!(sixers && sixers.winner);
    resultHtml = `<span class="score-cell ${won ? "win-result" : "loss-result"}">${won ? "W" : "L"} ${sixersScore}–${oppScore}</span>`;
  } else if (
    (statusType === "STATUS_IN_PROGRESS" || statusType === "STATUS_LIVE") &&
    sixersScore != null
  ) {
    resultHtml = `<strong class="score-cell">${sixersScore}–${oppScore ?? ""}</strong>`;
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
      </td>
      <td>${resultHtml}</td>
      <td>${venue}</td>
      <td><span class="${badgeFor(statusType)}">${statusText}</span></td>
      <td class="stream-cell">${getBroadcast(competition)}</td>
    </tr>`;
}

function renderSection(title, events, emptyText) {
  if (!events.length) {
    return `
      <section class="season-block">
        <div class="season-heading">${title}</div>
        <p class="empty-note">${emptyText}</p>
      </section>`;
  }

  const months = {};
  events
    .slice()
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .forEach(event => {
      const date = new Date(event.date);
      const monthYear = date.toLocaleString("en-US", { month: "long", year: "numeric" });
      if (!months[monthYear]) months[monthYear] = [];
      months[monthYear].push(event);
    });

  let html = `<section class="season-block"><div class="season-heading">${title}</div>`;

  for (const month in months) {
    html += `
      <div class="month-section">
        <div class="month-header">
          <h2 class="month-title">${month}</h2>
        </div>
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Opponent</th>
                <th>Result/Time</th>
                <th>Venue</th>
                <th>Status</th>
                <th>Stream</th>
              </tr>
            </thead>
            <tbody>
              ${months[month].map(renderGameRow).join("")}
            </tbody>
          </table>
        </div>
      </div>`;
  }

  html += `</section>`;
  return html;
}

async function getSixersSchedule() {
  const container = document.getElementById("schedule");
  if (!container) return;

  try {
    const probeRes = await fetch(SCHEDULE_BASE);
    if (!probeRes.ok) throw new Error(`HTTP error! status: ${probeRes.status}`);
    const probe = await probeRes.json();
    const seasonYear = get(probe, "season.year") || seasonYearFromEvents(probe.events || []);

    const [pre, regular, playoffs] = await Promise.all([
      fetchSeasonType(seasonYear, 1),
      fetchSeasonType(seasonYear, 2),
      fetchSeasonType(seasonYear, 3)
    ]);

    const byType = { 1: pre, 2: regular, 3: playoffs };
    const allEvents = [...pre, ...regular, ...playoffs];

    if (!allEvents.length) {
      container.innerHTML =
        "<p style='text-align:center; padding: 2rem;'>No schedule data available right now.</p>";
      return;
    }

    updateSnapshot(allEvents);

    container.innerHTML = SEASON_SECTIONS.map(section =>
      renderSection(section.title, byType[section.type], section.empty)
    ).join("");
  } catch (err) {
    console.error("Schedule Load Error:", err);
    container.innerHTML = `
      <div style="text-align:center; padding: 3rem;">
        <p style="color:#dc2626; font-weight:700; margin-bottom: 1rem;">Error loading schedule.</p>
        <p style="color:var(--mid); font-size: 0.9rem;">${err.message}</p>
        <button onclick="getSixersSchedule()" style="margin-top: 1.5rem; padding: 0.6rem 1.2rem; border-radius: 8px; border: 1px solid var(--sixers-blue); background: white; color: var(--sixers-blue); cursor: pointer; font-weight: 600;">Try Again</button>
      </div>
    `;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  getSixersSchedule();
  setInterval(getSixersSchedule, 300000);
});
