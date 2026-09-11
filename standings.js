const STANDINGS_URL = "https://site.api.espn.com/apis/v2/sports/basketball/nba/standings";
const SEASON_COUNT = 10;
const NEXT_SEASON_YEAR = 2027;
const NEXT_SEASON_LABEL = "2026-27";
const NEXT_SEASON_TIPOFF = new Date("2026-10-21T00:00:00-04:00");

const EAST_TEAMS = [
  { abbreviation: "ATL", displayName: "Atlanta Hawks" },
  { abbreviation: "BOS", displayName: "Boston Celtics" },
  { abbreviation: "BKN", displayName: "Brooklyn Nets" },
  { abbreviation: "CHA", displayName: "Charlotte Hornets" },
  { abbreviation: "CHI", displayName: "Chicago Bulls" },
  { abbreviation: "CLE", displayName: "Cleveland Cavaliers" },
  { abbreviation: "DET", displayName: "Detroit Pistons" },
  { abbreviation: "IND", displayName: "Indiana Pacers" },
  { abbreviation: "MIA", displayName: "Miami Heat" },
  { abbreviation: "MIL", displayName: "Milwaukee Bucks" },
  { abbreviation: "NYK", displayName: "New York Knicks" },
  { abbreviation: "ORL", displayName: "Orlando Magic" },
  { abbreviation: "PHI", displayName: "Philadelphia 76ers" },
  { abbreviation: "TOR", displayName: "Toronto Raptors" },
  { abbreviation: "WAS", displayName: "Washington Wizards" }
];

const WEST_TEAMS = [
  { abbreviation: "DAL", displayName: "Dallas Mavericks" },
  { abbreviation: "DEN", displayName: "Denver Nuggets" },
  { abbreviation: "GSW", displayName: "Golden State Warriors" },
  { abbreviation: "HOU", displayName: "Houston Rockets" },
  { abbreviation: "LAC", displayName: "LA Clippers" },
  { abbreviation: "LAL", displayName: "Los Angeles Lakers" },
  { abbreviation: "MEM", displayName: "Memphis Grizzlies" },
  { abbreviation: "MIN", displayName: "Minnesota Timberwolves" },
  { abbreviation: "NOP", displayName: "New Orleans Pelicans" },
  { abbreviation: "OKC", displayName: "Oklahoma City Thunder" },
  { abbreviation: "PHX", displayName: "Phoenix Suns" },
  { abbreviation: "POR", displayName: "Portland Trail Blazers" },
  { abbreviation: "SAC", displayName: "Sacramento Kings" },
  { abbreviation: "SAS", displayName: "San Antonio Spurs" },
  { abbreviation: "UTA", displayName: "Utah Jazz" }
];

let currentSeasonYear = NEXT_SEASON_YEAR;
let availableSeasons = [];
let refreshTimer = null;

function seasonLabel(year) {
  return `${year - 1}-${String(year).slice(-2)}`;
}

function padRank(n) {
  return String(n).padStart(2, "0");
}

function shuffle(list) {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildSeasonOptions(seasonsFromApi) {
  const byYear = new Map();
  (seasonsFromApi || []).forEach((s) => {
    if (!s || !s.year) return;
    byYear.set(s.year, s.displayName || seasonLabel(s.year));
  });
  if (!byYear.has(NEXT_SEASON_YEAR)) byYear.set(NEXT_SEASON_YEAR, NEXT_SEASON_LABEL);

  const years = Array.from(byYear.keys()).sort((a, b) => b - a);
  const latest = Math.max(years[0] || NEXT_SEASON_YEAR, NEXT_SEASON_YEAR);
  const cutoff = latest - (SEASON_COUNT - 1);

  return years
    .filter((y) => y >= cutoff)
    .concat(years.includes(NEXT_SEASON_YEAR) ? [] : [NEXT_SEASON_YEAR])
    .filter((y, i, arr) => arr.indexOf(y) === i)
    .sort((a, b) => b - a)
    .slice(0, SEASON_COUNT)
    .map((year) => ({ year, label: byYear.get(year) || seasonLabel(year) }));
}

function populateSeasonSelect(selectedYear) {
  const select = document.getElementById("season-select");
  if (!select) return;
  select.innerHTML = availableSeasons
    .map((s) => `<option value="${s.year}"${s.year === selectedYear ? " selected" : ""}>${s.label}</option>`)
    .join("");
}

function setSeasonStatus(text) {
  const el = document.getElementById("season-status");
  if (el) el.textContent = text || "";
}

function setGraphicSeason(label) {
  const el = document.getElementById("social-season-label");
  if (el) el.textContent = label;
}

function getStat(entry, name) {
  return entry.stats.find((s) => s.name === name)?.value || 0;
}

function isPreseasonBlank(seasonYear, data) {
  if (seasonYear === NEXT_SEASON_YEAR && Date.now() < NEXT_SEASON_TIPOFF.getTime()) return true;
  const conferences = data?.children || [];
  if (!conferences.length) return true;
  return !conferences.some((conf) =>
    (conf.standings?.entries || []).some((t) => {
      const wins = t.stats.find((s) => s.name === "wins")?.value || 0;
      const losses = t.stats.find((s) => s.name === "losses")?.value || 0;
      return wins + losses > 0;
    })
  );
}

function emptyRow(team) {
  return {
    team,
    wins: "0",
    losses: "0",
    pct: ".000",
    gb: "-",
    home: "0-0",
    away: "0-0",
    l10: "-",
    streakValue: "-",
    streakClass: "",
    socialStreakClass: ""
  };
}

function rowsFromApiConference(conf) {
  const entries = [...(conf.standings?.entries || [])];
  entries.sort((a, b) => getStat(b, "winPercent") - getStat(a, "winPercent"));
  return entries.map((t) => {
    const stats = {};
    t.stats.forEach((s) => {
      if (s.name) stats[s.name] = s;
      if (s.type) stats[s.type] = s;
    });
    const streakValue = stats.streak?.displayValue || "-";
    let streakClass = "";
    let socialStreakClass = "";
    if (String(streakValue).startsWith("W")) {
      streakClass = "streak-w";
      socialStreakClass = "social-streak-w";
    }
    if (String(streakValue).startsWith("L")) {
      streakClass = "streak-l";
      socialStreakClass = "social-streak-l";
    }
    return {
      team: t.team,
      wins: stats.wins?.displayValue || "-",
      losses: stats.losses?.displayValue || "-",
      pct: stats.winPercent?.displayValue || "-",
      gb: stats.gamesBehind?.displayValue || "-",
      home: stats.home?.summary || "-",
      away: stats.road?.summary || "-",
      l10: stats.lasttengames?.summary || stats.lastTenGames?.summary || "-",
      streakValue,
      streakClass,
      socialStreakClass
    };
  });
}

function renderTables(conferences) {
  const container = document.getElementById("standings");
  const socialContainer = document.getElementById("social-export-content");
  let html = "";
  let socialHtml = "";

  conferences.forEach((conf) => {
    html += `
      <div class="conference-section">
        <h2 class="conference-title">${conf.name}</h2>
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Team</th><th>W</th><th>L</th><th>PCT</th><th>GB</th>
                <th>HOME</th><th>AWAY</th><th>L10</th><th>STRK</th>
              </tr>
            </thead>
            <tbody>`;

    const confKey = conf.name.toLowerCase().includes("east") ? "east" : "west";
    socialHtml += `
      <div class="social-conference" data-conf="${confKey}">
        <h2 class="social-conf-title">${conf.name}</h2>
        <table class="social-table">
          <thead>
            <tr>
              <th>Team</th>
              <th>W-L</th>
              <th>PCT</th>
              <th>STRK</th>
            </tr>
          </thead>
          <tbody>`;

    conf.rows.forEach((row, idx) => {
      const isSixers = row.team.abbreviation === "PHI";
      html += `
        <tr class="${isSixers ? "sixers-highlight" : ""}">
          <td>
            <div class="team-info">
              <span class="rank">${idx + 1}</span>
              <span>${row.team.displayName}</span>
            </div>
          </td>
          <td>${row.wins}</td>
          <td>${row.losses}</td>
          <td class="pct">${row.pct}</td>
          <td class="gb">${row.gb}</td>
          <td>${row.home}</td>
          <td>${row.away}</td>
          <td>${row.l10}</td>
          <td><span class="status-badge ${row.streakClass}">${row.streakValue}</span></td>
        </tr>`;

      socialHtml += `
        <tr class="${isSixers ? "social-sixers-row" : ""}">
          <td>
            <div class="cell-content">
              <div class="social-team">
                <span class="social-team-rank">${padRank(idx + 1)}</span>
                <span class="social-team-name">${row.team.displayName}</span>
              </div>
            </div>
          </td>
          <td><div class="cell-content">${row.wins}-${row.losses}</div></td>
          <td><div class="cell-content">${row.pct}</div></td>
          <td>
            <div class="cell-content">
              <span class="social-streak-badge ${row.socialStreakClass}">${row.streakValue}</span>
            </div>
          </td>
        </tr>`;
    });

    html += `</tbody></table></div></div>`;
    socialHtml += `</tbody></table></div>`;
  });

  container.innerHTML = html;
  if (socialContainer) socialContainer.innerHTML = socialHtml;
  initExport();
}

function renderPreseasonBoard(label) {
  setGraphicSeason(label);
  renderTables([
    { name: "Eastern Conference", rows: shuffle(EAST_TEAMS).map(emptyRow) },
    { name: "Western Conference", rows: shuffle(WEST_TEAMS).map(emptyRow) }
  ]);
  setSeasonStatus(`${label} · not started`);
}

async function getNBAStandings(seasonYear) {
  const container = document.getElementById("standings");
  if (!container) return;

  const year = seasonYear || currentSeasonYear || NEXT_SEASON_YEAR;
  const label = availableSeasons.find((s) => s.year === year)?.label || seasonLabel(year);
  setGraphicSeason(label);

  if (!availableSeasons.length) {
    availableSeasons = buildSeasonOptions([]);
    populateSeasonSelect(year);
  }

  if (year === NEXT_SEASON_YEAR && Date.now() < NEXT_SEASON_TIPOFF.getTime()) {
    renderPreseasonBoard(label);
    return;
  }

  container.innerHTML = `
    <div class="loader">
      <div class="loader-spinner"></div>
      <p>Loading standings for ${label}…</p>
    </div>`;

  try {
    const res = await fetch(`${STANDINGS_URL}?season=${year}`);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();

    availableSeasons = buildSeasonOptions(data.seasons || []);
    if (!availableSeasons.some((s) => s.year === NEXT_SEASON_YEAR)) {
      availableSeasons.unshift({ year: NEXT_SEASON_YEAR, label: NEXT_SEASON_LABEL });
      availableSeasons = availableSeasons.slice(0, SEASON_COUNT);
    }
    currentSeasonYear = NEXT_SEASON_YEAR;
    populateSeasonSelect(year);

    const resolvedLabel = availableSeasons.find((s) => s.year === year)?.label || data.season?.displayName || label;
    setGraphicSeason(resolvedLabel);

    if (isPreseasonBlank(year, data)) {
      renderPreseasonBoard(resolvedLabel);
      return;
    }

    setSeasonStatus(resolvedLabel);
    renderTables((data.children || []).map((conf) => ({
      name: conf.name,
      rows: rowsFromApiConference(conf)
    })));
  } catch (err) {
    console.error("Standings Load Error:", err);
    if (year === NEXT_SEASON_YEAR) {
      renderPreseasonBoard(label);
      return;
    }
    container.innerHTML = `
      <div style="text-align:center;padding:3rem;">
        <p style="color:red;font-weight:700;margin-bottom:1rem;">Error loading standings.</p>
        <p style="font-size:0.9rem;">${err.message}</p>
        <button type="button" id="standings-retry" class="export-btn" style="margin-top:1.5rem;">Try Again</button>
      </div>`;
    document.getElementById("standings-retry")?.addEventListener("click", () => getNBAStandings(year));
  }
}

function initExport() {
  const exportBtns = document.querySelectorAll("[data-export-mode]");
  const modal = document.getElementById("exportModal");
  const preview = document.getElementById("exportPreview");
  const closeModal = document.getElementById("closeModal");
  const downloadBtn = document.getElementById("downloadBtn");
  const copyBtn = document.getElementById("copyBtn");
  if (!exportBtns.length || !modal || typeof html2canvas !== "function") return;

  exportBtns.forEach((btn) => {
    btn.onclick = async () => {
      const mode = btn.dataset.exportMode;
      const originalText = btn.textContent;
      btn.textContent = "Generating...";
      btn.disabled = true;
      try {
        const grid = document.getElementById("social-export-container");
        const content = document.getElementById("social-export-content");
        const topMeta = document.getElementById("social-top-meta");

        grid.classList.remove("single-conf");
        const eastDiv = content.querySelector('[data-conf="east"]');
        const westDiv = content.querySelector('[data-conf="west"]');

        if (mode === "east") {
          grid.classList.add("single-conf");
          if (eastDiv) eastDiv.style.display = "block";
          if (westDiv) westDiv.style.display = "none";
          if (topMeta) topMeta.textContent = "EASTERN CONFERENCE STANDINGS";
        } else if (mode === "west") {
          grid.classList.add("single-conf");
          if (eastDiv) eastDiv.style.display = "none";
          if (westDiv) westDiv.style.display = "block";
          if (topMeta) topMeta.textContent = "WESTERN CONFERENCE STANDINGS";
        } else {
          if (eastDiv) eastDiv.style.display = "block";
          if (westDiv) westDiv.style.display = "block";
          if (topMeta) topMeta.textContent = "NBA STANDINGS";
        }

        const canvas = await html2canvas(grid, {
          backgroundColor: "#ffffff",
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: false
        });

        preview.src = canvas.toDataURL("image/png");
        modal.style.display = "flex";

        downloadBtn.onclick = () => {
          const link = document.createElement("a");
          link.download = `nba-${mode}-standings-${new Date().toISOString().split("T")[0]}.png`;
          link.href = canvas.toDataURL("image/png");
          link.click();
        };

        copyBtn.onclick = () => {
          canvas.toBlob((blob) => {
            navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]).then(() => {
              copyBtn.textContent = "Copied!";
              setTimeout(() => { copyBtn.textContent = "Copy to Clipboard"; }, 2000);
            });
          });
        };
      } catch (err) {
        console.error("Export Error:", err);
        alert("Failed to generate image. Please try again.");
      } finally {
        btn.textContent = originalText;
        btn.disabled = false;
      }
    };
  });

  closeModal.onclick = () => { modal.style.display = "none"; };
  window.onclick = (event) => { if (event.target == modal) modal.style.display = "none"; };
}

document.addEventListener("DOMContentLoaded", () => {
  availableSeasons = buildSeasonOptions([]);
  populateSeasonSelect(NEXT_SEASON_YEAR);
  document.getElementById("season-select")?.addEventListener("change", (e) => {
    getNBAStandings(Number(e.target.value));
  });
  getNBAStandings(NEXT_SEASON_YEAR);
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(() => {
    const viewing = Number(document.getElementById("season-select")?.value || NEXT_SEASON_YEAR);
    if (viewing !== NEXT_SEASON_YEAR || Date.now() >= NEXT_SEASON_TIPOFF.getTime()) {
      getNBAStandings(viewing);
    }
  }, 300000);
});
