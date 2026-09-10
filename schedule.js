const ESPN_URL =
  "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/phi/schedule";

function get(obj, path, fallback = "") {
  return path.split(".").reduce((o, k) => (o && o[k] != null ? o[k] : undefined), obj) ?? fallback;
}

function badgeFor(statusName) {
  if (statusName === "STATUS_FINAL") return "badge final";
  if (statusName === "STATUS_IN_PROGRESS" || statusName === "STATUS_LIVE") return "badge live";
  return "badge upcoming";
}

function updateSnapshot(events) {
  let wins = 0;
  let losses = 0;
  let played = 0;
  let next = null;

  for (const event of events) {
    const comp = event.competitions && event.competitions[0];
    if (!comp) continue;

    const sixers = (comp.competitors || []).find(c => get(c, "team.abbreviation") === "PHI");
    const opp = (comp.competitors || []).find(c => get(c, "team.abbreviation") !== "PHI");
    const statusName = get(comp, "status.type.name");
    const state = get(comp, "status.type.state");
    const seasonType = event.seasonType && event.seasonType.type; // 2 = regular season

    if (statusName === "STATUS_FINAL") {
      if (seasonType === 2) {
        played += 1;
        if (sixers && sixers.winner) wins += 1;
        else losses += 1;
      }
    } else if (!next && (statusName === "STATUS_IN_PROGRESS" || statusName === "STATUS_LIVE")) {
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

async function getSixersSchedule() {
  const container = document.getElementById("schedule");
  if (!container) return;

  try {
    const res = await fetch(ESPN_URL);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();

    const events = data.events || [];
    if (events.length === 0) {
      container.innerHTML =
        "<p style='text-align:center; padding: 2rem;'>No schedule data available right now.</p>";
      return;
    }

    updateSnapshot(events);

    const months = {};
    events.forEach(event => {
      const date = new Date(event.date);
      const monthYear = date.toLocaleString("en-US", { month: "long", year: "numeric" });
      if (!months[monthYear]) months[monthYear] = [];
      months[monthYear].push(event);
    });

    let html = "";
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
                </tr>
              </thead>
              <tbody>`;

      months[month].forEach(event => {
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

        html += `
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
          </tr>`;
      });

      html += `
              </tbody>
            </table>
          </div>
        </div>`;
    }

    container.innerHTML = html;
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
