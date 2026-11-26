const STANDINGS_URL = "https://site.api.espn.com/apis/v2/sports/basketball/nba/standings";
const SEASON_COUNT = 10;
const NEXT_SEASON_YEAR = 2027;
const NEXT_SEASON_LABEL = "2026-27";

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

function defaultSeasonList() {
  const list = [];
  for (let i = 0; i < SEASON_COUNT; i++) {
    const year = NEXT_SEASON_YEAR - i;
    list.push({ year, label: year === NEXT_SEASON_YEAR ? NEXT_SEASON_LABEL : seasonLabel(year) });
  }
  return list;
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
  defaultSeasonList().forEach((s) => byYear.set(s.year, s.label));
  (seasonsFromApi || []).forEach((s) => {
    if (!s || !s.year) return;
    byYear.set(s.year, s.displayName || seasonLabel(s.year));
  });
  byYear.set(NEXT_SEASON_YEAR, NEXT_SEASON_LABEL);

  return Array.from(byYear.keys())
    .sort((a, b) => b - a)
    .slice(0, SEASON_COUNT)
    .map((year) => ({ year, label: byYear.get(year) || seasonLabel(year) }));
}

function populateSeasonSelect(selectedYear) {
  const select = document.getElementById("season-select");
  if (!select) return;
  if (!availableSeasons.length) availableSeasons = defaultSeasonList();
  select.innerHTML = availableSeasons
    .map((s) => `<option value="${s.year}"${s.year === selectedYear ? " selected" : ""}>${s.label}</option>`)
    .join("");
}

function setGraphicSeason(label) {
  const el = document.getElementById("social-season-label");
  if (el) el.textContent = label;
}

function getStat(entry, name) {
  const list = (entry && entry.stats) || [];
  const hit = list.find((s) => s && s.name === name);
  const v = hit && hit.value;
  return v == null ? 0 : Number(v) || 0;
}

function fetchWithTimeout(url, options, ms) {
  const opts = options || {};
  const timeout = ms || 12000;
  const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = setTimeout(() => {
    try { if (ctrl) ctrl.abort(); } catch (e) {}
  }, timeout);
  return fetch(url, ctrl ? Object.assign({}, opts, { signal: ctrl.signal }) : opts)
    .finally(() => clearTimeout(timer));
}

function isPreseasonBlank(seasonYear, data) {
  const conferences = data?.children || [];
  if (!conferences.length) return true;
  return !conferences.some((conf) =>
    (conf.standings?.entries || []).some((t) => {
      const wins = Number(t.stats?.find((s) => s.name === "wins")?.value) || 0;
      const losses = Number(t.stats?.find((s) => s.name === "losses")?.value) || 0;
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
  const entries = [...((conf && conf.standings && conf.standings.entries) || [])];
  entries.sort((a, b) => getStat(b, "winPercent") - getStat(a, "winPercent"));
  return entries.map((t) => {
    const stats = {};
    ((t && t.stats) || []).forEach((s) => {
      if (!s) return;
      if (s.name) stats[s.name] = s;
      if (s.type) stats[s.type] = s;
    });
    const streakValue = (stats.streak && stats.streak.displayValue) || "-";
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
    const team = (t && t.team) || { abbreviation: "?", displayName: "Team" };
    return {
      team: team,
      wins: (stats.wins && stats.wins.displayValue) || "0",
      losses: (stats.losses && stats.losses.displayValue) || "0",
      pct: (stats.winPercent && stats.winPercent.displayValue) || ".000",
      gb: (stats.gamesBehind && stats.gamesBehind.displayValue) || "-",
      home: (stats.Home && stats.Home.displayValue) || (stats.home && (stats.home.summary || stats.home.displayValue)) || "-",
      away: (stats.Road && stats.Road.displayValue) || (stats.road && (stats.road.summary || stats.road.displayValue)) || "-",
      l10: (stats.lasttengames && stats.lasttengames.summary) || (stats.lastTenGames && stats.lastTenGames.summary) || (stats.l10 && stats.l10.summary) || "-",
      streakValue: streakValue,
      streakClass: streakClass,
      socialStreakClass: socialStreakClass
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
                <th>Team</th><th>W-L</th><th>PCT</th><th>GB</th>
                <th>HOME</th><th>AWAY</th><th>L10</th><th>STRK</th>
              </tr>
            </thead>
            <tbody>`;

    const confKey = conf.name.toLowerCase().includes("east") ? "east" : "west";
    socialHtml += `
      <div class="social-conference" data-conf="${confKey}">
        <h2 class="social-conf-title">${conf.name}</h2>
        <table class="social-table">
          <colgroup>
            <col class="col-team"/>
            <col class="col-wl"/>
            <col class="col-pct"/>
            <col class="col-l10"/>
            <col class="col-strk"/>
          </colgroup>
          <thead>
            <tr>
              <th>Team</th>
              <th>W-L</th>
              <th>PCT</th>
              <th>L10</th>
              <th>STRK</th>
            </tr>
          </thead>
          <tbody>`;

    conf.rows.forEach((row, idx) => {
      const isSixers = row.team.abbreviation === "PHI";
      const wl = String(row.wins) + "–" + String(row.losses);
      html += `
        <tr class="${isSixers ? "sixers-highlight" : ""}">
          <td>
            <div class="team-info">
              <span class="rank">${idx + 1}</span>
              <span>${row.team.displayName}</span>
            </div>
          </td>
          <td><span class="wl-score">${wl}</span></td>
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
            <div class="social-team">
              <span class="social-team-rank">${idx + 1}</span>
              <span class="social-team-name">${row.team.displayName}</span>
            </div>
          </td>
          <td class="social-wl">${wl}</td>
          <td>${row.pct}</td>
          <td>${row.l10}</td>
          <td class="${row.socialStreakClass}">${row.streakValue}</td>
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
}

async function hydrateSeasonDropdown(selectedYear) {
  availableSeasons = defaultSeasonList();
  populateSeasonSelect(selectedYear || NEXT_SEASON_YEAR);
  try {
    const res = await fetchWithTimeout(STANDINGS_URL, { cache: "no-store" }, 10000);
    if (!res.ok) return;
    const data = await res.json();
    availableSeasons = buildSeasonOptions(data.seasons || []);
    populateSeasonSelect(selectedYear || NEXT_SEASON_YEAR);
  } catch (err) {
    console.error("Season list error:", err);
  }
}

async function getNBAStandings(seasonYear) {
  const container = document.getElementById("standings");
  if (!container) return;

  const year = seasonYear || currentSeasonYear || NEXT_SEASON_YEAR;
  currentSeasonYear = year;
  if (!availableSeasons.length) availableSeasons = defaultSeasonList();
  const label = (availableSeasons.find((s) => s.year === year) || {}).label || seasonLabel(year);
  setGraphicSeason(label);
  populateSeasonSelect(year);

  container.innerHTML = `
    <div class="loader">
      <div class="loader-spinner"></div>
      <p>Loading standings for ${label}…</p>
    </div>`;

  try {
    let res = await fetchWithTimeout(`${STANDINGS_URL}?season=${year}`, { cache: "no-store" }, 12000);
    if (!res.ok) {
      // Fallback: current season endpoint without season param
      res = await fetchWithTimeout(STANDINGS_URL, { cache: "no-store" }, 12000);
    }
    if (!res.ok) throw new Error("HTTP error! status: " + res.status);
    const data = await res.json();

    availableSeasons = buildSeasonOptions(data.seasons || availableSeasons);
    populateSeasonSelect(year);

    const resolvedLabel = (availableSeasons.find((s) => s.year === year) || {}).label
      || (data.season && data.season.displayName)
      || label;
    setGraphicSeason(resolvedLabel);

    const conferences = (data.children || []).map((conf) => ({
      name: conf.name || "Conference",
      rows: rowsFromApiConference(conf)
    })).filter((c) => c.rows && c.rows.length);

    if (!conferences.length || isPreseasonBlank(year, data)) {
      // If API returned teams with records, still try to render them
      const anyRows = (data.children || []).some((c) => ((c.standings && c.standings.entries) || []).length);
      if (anyRows) {
        renderTables((data.children || []).map((conf) => ({
          name: conf.name || "Conference",
          rows: rowsFromApiConference(conf)
        })));
        return;
      }
      renderPreseasonBoard(resolvedLabel);
      return;
    }

    renderTables(conferences);
  } catch (err) {
    console.error("Standings Load Error:", err);
    container.innerHTML = `
      <div style="text-align:center;padding:3rem;">
        <p style="color:#dc2626;font-weight:700;margin-bottom:1rem;">Error loading standings.</p>
        <p style="font-size:0.9rem;color:var(--mid,#64748b);">${(err && err.message) ? err.message : "Network error"}</p>
        <button type="button" id="standings-retry" class="export-btn" style="margin-top:1.5rem;">Try Again</button>
      </div>`;
    const retry = document.getElementById("standings-retry");
    if (retry) retry.addEventListener("click", function () { getNBAStandings(year); });
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

/* —— Emirates NBA Cup (2026-27 group stage) —— */
const NBA_CUP_GROUPS = [
  { id: "east-a", conf: "East", name: "East Group A", teams: ["DET", "TOR", "ORL", "MIL", "BKN"] },
  { id: "east-b", conf: "East", name: "East Group B", teams: ["NYK", "CLE", "PHI", "MIA", "IND"] },
  { id: "east-c", conf: "East", name: "East Group C", teams: ["BOS", "ATL", "WAS", "CHI", "CHA"] },
  { id: "west-a", conf: "West", name: "West Group A", teams: ["DAL", "DEN", "PHX", "HOU", "UTA"] },
  { id: "west-b", conf: "West", name: "West Group B", teams: ["MIN", "OKC", "MEM", "LAC", "NOP"] },
  { id: "west-c", conf: "West", name: "West Group C", teams: ["SAS", "LAL", "POR", "GSW", "SAC"] }
];

const TEAM_NAMES = {};
EAST_TEAMS.forEach((t) => { TEAM_NAMES[t.abbreviation] = t.displayName; });
WEST_TEAMS.forEach((t) => { TEAM_NAMES[t.abbreviation] = t.displayName; });
TEAM_NAMES.NY = "New York Knicks";
TEAM_NAMES.GS = "Golden State Warriors";
TEAM_NAMES.SA = "San Antonio Spurs";
TEAM_NAMES.NO = "New Orleans Pelicans";
TEAM_NAMES.WSH = "Washington Wizards";
TEAM_NAMES.UTAH = "Utah Jazz";

function normalizeAbbr(a) {
  const x = String(a || "").toUpperCase();
  if (x === "NY") return "NYK";
  if (x === "GS") return "GSW";
  if (x === "SA") return "SAS";
  if (x === "NO") return "NOP";
  if (x === "WSH") return "WAS";
  if (x === "UTAH") return "UTA";
  return x;
}

function cupDateList() {
  // 2026 group-play windows (Fridays + Thanksgiving Cup nights)
  return [
    "20261030", "20261106", "20261113", "20261120",
    "20261124", "20261125", "20261127"
  ];
}

async function fetchCupScoreboard(dateStr) {
  const url = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=" + dateStr + "&limit=100";
  const res = await fetchWithTimeout(url, { cache: "no-store" }, 10000);
  if (!res.ok) throw new Error("scoreboard " + res.status);
  return res.json();
}

function isCupGroupGame(event) {
  const comps = event.competitions || [];
  const c0 = comps[0] || {};
  const notes = c0.notes || event.notes || [];
  const text = notes.map((n) => n.headline || n.text || "").join(" ").toLowerCase();
  return text.includes("nba cup") || text.includes("in-season tournament") || text.includes("emirates");
}

function applyCupGame(records, event) {
  if (!isCupGroupGame(event)) return;
  const c0 = (event.competitions || [])[0] || {};
  const competitors = c0.competitors || [];
  if (competitors.length < 2) return;
  const status = (c0.status || {}).type || {};
  const state = String(status.state || "").toLowerCase();
  const completed = state === "post" || status.completed === true;
  if (!completed) return;

  const sides = competitors.map((c) => ({
    abbr: normalizeAbbr(c.team?.abbreviation),
    score: Number(c.score),
    homeAway: c.homeAway
  }));
  if (sides.some((s) => !s.abbr || Number.isNaN(s.score))) return;

  const [a, b] = sides;
  if (!records[a.abbr] || !records[b.abbr]) return; // only track group teams

  records[a.abbr].pf += a.score;
  records[a.abbr].pa += b.score;
  records[b.abbr].pf += b.score;
  records[b.abbr].pa += a.score;

  if (a.score > b.score) {
    records[a.abbr].w += 1;
    records[b.abbr].l += 1;
  } else if (b.score > a.score) {
    records[b.abbr].w += 1;
    records[a.abbr].l += 1;
  }
}

function sortCupRows(rows) {
  return rows.slice().sort((a, b) => {
    if (b.w !== a.w) return b.w - a.w;
    if (b.diff !== a.diff) return b.diff - a.diff;
    if (b.pf !== a.pf) return b.pf - a.pf;
    return a.name.localeCompare(b.name);
  });
}

function buildCupGroupRows(group, records) {
  const rows = group.teams.map((abbr) => {
    const r = records[abbr] || { w: 0, l: 0, pf: 0, pa: 0 };
    const gp = r.w + r.l;
    const pct = gp ? (r.w / gp) : 0;
    const diff = r.pf - r.pa;
    return {
      abbr,
      name: TEAM_NAMES[abbr] || abbr,
      w: r.w,
      l: r.l,
      pct,
      pctStr: gp ? pct.toFixed(3).replace(/^0/, "") : ".000",
      diff,
      diffStr: (diff > 0 ? "+" : "") + String(diff),
      pf: r.pf,
      pa: r.pa
    };
  });
  const sorted = sortCupRows(rows);
  const leader = sorted[0];
  sorted.forEach((row) => {
    if (!leader || leader.w + leader.l === 0) {
      row.gb = "-";
      return;
    }
    const gb = (leader.w - row.w + (row.l - leader.l)) / 2;
    row.gb = gb <= 0 ? "-" : gb.toFixed(1).replace(/\.0$/, "");
  });
  return sorted;
}

function renderCupGroups(groupsData) {
  const root = document.getElementById("nba-cup-groups");
  const note = document.getElementById("nba-cup-note");
  if (!root) return;

  root.innerHTML = groupsData.map((g) => {
    const rowsHtml = g.rows.map((row, idx) => {
      const isPhi = row.abbr === "PHI";
      return `<tr class="${isPhi ? "sixers-highlight" : ""}">
        <td><div class="team-info"><span class="rank">${idx + 1}</span><span>${row.name}</span></div></td>
        <td class="num"><span class="wl-score">${row.w}–${row.l}</span></td>
        <td class="num">${row.pctStr}</td>
        <td class="num">${row.gb}</td>
        <td class="num">${row.diffStr}</td>
      </tr>`;
    }).join("");

    return `<article class="cup-group-card" data-cup-group="${g.id}">
      <div class="cup-group-head">
        <h3 class="cup-group-name">${g.name}</h3>
        <button type="button" class="cup-shot-btn" data-cup-shot="${g.id}">Screenshot</button>
      </div>
      <div class="table-responsive">
        <table>
          <thead><tr>
            <th>Team</th><th class="num">W-L</th>
            <th class="num">PCT</th><th class="num">GB</th><th class="num">DIFF</th>
          </tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    </article>`;
  }).join("");

  if (note) {
    note.textContent = "Group play only · Updated from completed NBA Cup games";
  }

  root.querySelectorAll("[data-cup-shot]").forEach((btn) => {
    btn.addEventListener("click", () => exportCupGroup(btn.getAttribute("data-cup-shot"), btn));
  });
}

const CUP_TIEBREAKER_TEXT =
  "Tiebreakers: (1) Head-to-head among tied teams · (2) Point differential in group play · (3) Points scored in group play · (4) Regular-season record vs common group opponents if needed. Group winners advance; best second-place team in each conference is the wild card.";

function showCupExportModal(canvas, titleText, fileSlug) {
  const modal = document.getElementById("exportModal");
  const preview = document.getElementById("exportPreview");
  const downloadBtn = document.getElementById("downloadBtn");
  const copyBtn = document.getElementById("copyBtn");
  const closeModal = document.getElementById("closeModal");
  const title = document.getElementById("export-title");
  if (!modal || !preview) return;

  if (title) title.textContent = titleText;
  preview.src = canvas.toDataURL("image/png");
  modal.style.display = "flex";

  if (downloadBtn) {
    downloadBtn.onclick = () => {
      const link = document.createElement("a");
      link.download = `nba-cup-${fileSlug}-${new Date().toISOString().split("T")[0]}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
  }
  if (copyBtn) {
    copyBtn.onclick = () => {
      canvas.toBlob((blob) => {
        navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]).then(() => {
          copyBtn.textContent = "Copied!";
          setTimeout(() => { copyBtn.textContent = "Copy to Clipboard"; }, 2000);
        });
      });
    };
  }
  if (closeModal) closeModal.onclick = () => { modal.style.display = "none"; };
}

function prepareCupExportShell(label, multi) {
  const exportContent = document.getElementById("cup-export-content");
  const exportLabel = document.getElementById("cup-export-label");
  const exportTb = document.getElementById("cup-export-tb");
  const shell = document.getElementById("cup-export-container");
  const page = shell && shell.querySelector(".cup-sg-page");
  if (!exportContent || !shell) throw new Error("export shell missing");

  // Hard reset so screenshots never accumulate prior groups
  exportContent.innerHTML = "";
  exportContent.className = multi ? "cup-export-multi" : "";
  if (exportLabel) exportLabel.textContent = label;
  if (exportTb) exportTb.textContent = CUP_TIEBREAKER_TEXT;
  // Wider canvas so full team names fit in 3-group graphics
  if (page) {
    page.style.width = multi ? "1200px" : "760px";
  }
  shell.style.width = multi ? "1200px" : "760px";
  return { exportContent, shell };
}

function cloneCupCard(card) {
  const clone = card.cloneNode(true);
  // Never keep interactive controls or live-page ids that could confuse selectors
  clone.removeAttribute("id");
  clone.querySelectorAll(".cup-shot-btn").forEach((b) => b.remove());
  clone.style.border = "1px solid #e2e8f0";
  clone.style.borderRadius = "16px";
  clone.style.overflow = "visible";
  clone.style.width = "100%";
  clone.style.maxWidth = "100%";
  // Force full team names in the graphic (no ellipsis / clipping)
  clone.querySelectorAll(".team-info span:last-child").forEach((el) => {
    el.style.overflow = "visible";
    el.style.whiteSpace = "normal";
    el.style.textOverflow = "clip";
    el.style.fontSize = "12px";
    el.style.lineHeight = "1.3";
  });
  clone.querySelectorAll("td").forEach((td) => {
    td.style.height = "auto";
    td.style.whiteSpace = "normal";
    td.style.paddingTop = "10px";
    td.style.paddingBottom = "10px";
  });
  return clone;
}

function liveCupCards() {
  // Only cards on the page — never clones inside the export shell
  const root = document.getElementById("nba-cup-groups");
  if (!root) return [];
  return Array.from(root.querySelectorAll(":scope > [data-cup-group]"));
}

async function captureCupShell(shell) {
  // Wait a frame so layout is final after clearing/appending
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  return html2canvas(shell, {
    backgroundColor: "#ffffff",
    scale: 2,
    useCORS: true,
    allowTaint: true,
    logging: false,
    width: shell.offsetWidth || undefined,
    height: shell.scrollHeight || undefined
  });
}

function clearCupExportShell() {
  const exportContent = document.getElementById("cup-export-content");
  if (exportContent) {
    exportContent.innerHTML = "";
    exportContent.className = "";
  }
}

async function exportCupGroup(groupId, btn) {
  if (typeof html2canvas !== "function") return;
  const card = liveCupCards().find((el) => el.getAttribute("data-cup-group") === groupId);
  if (!card) return;

  const original = btn ? btn.textContent : "";
  if (btn) {
    btn.textContent = "…";
    btn.disabled = true;
  }

  try {
    const groupName = card.querySelector(".cup-group-name")?.textContent || "NBA Cup Group";
    const { exportContent, shell } = prepareCupExportShell("Emirates NBA Cup · " + groupName, false);
    exportContent.appendChild(cloneCupCard(card));

    const canvas = await captureCupShell(shell);
    showCupExportModal(canvas, groupName + " graphic", groupId);
  } catch (err) {
    console.error(err);
    alert("Could not create group screenshot. Try again.");
  } finally {
    clearCupExportShell();
    if (btn) {
      btn.textContent = original;
      btn.disabled = false;
    }
  }
}

async function exportCupConference(conf, btn) {
  if (typeof html2canvas !== "function") return;
  const prefix = conf === "West" ? "west-" : "east-";
  const cards = liveCupCards().filter((el) =>
    String(el.getAttribute("data-cup-group") || "").startsWith(prefix)
  );
  if (!cards.length) {
    alert("Cup groups are still loading.");
    return;
  }

  const original = btn ? btn.textContent : "";
  if (btn) {
    btn.textContent = "Generating…";
    btn.disabled = true;
  }

  try {
    const label = "Emirates NBA Cup · " + conf + " Groups";
    const { exportContent, shell } = prepareCupExportShell(label, true);
    cards.forEach((card) => exportContent.appendChild(cloneCupCard(card)));

    const canvas = await captureCupShell(shell);
    showCupExportModal(canvas, conf + " groups graphic", conf.toLowerCase() + "-groups");
  } catch (err) {
    console.error(err);
    alert("Could not create conference Cup graphic. Try again.");
  } finally {
    clearCupExportShell();
    if (btn) {
      btn.textContent = original;
      btn.disabled = false;
    }
  }
}

function bindCupConferenceShots() {
  const eastBtn = document.getElementById("cup-shot-east");
  const westBtn = document.getElementById("cup-shot-west");
  if (eastBtn) eastBtn.onclick = () => exportCupConference("East", eastBtn);
  if (westBtn) westBtn.onclick = () => exportCupConference("West", westBtn);
}

async function loadNbaCupStandings() {
  const root = document.getElementById("nba-cup-groups");
  const note = document.getElementById("nba-cup-note");
  if (!root) return;

  // Seed empty records for all cup teams
  const records = {};
  NBA_CUP_GROUPS.forEach((g) => {
    g.teams.forEach((abbr) => {
      records[abbr] = { w: 0, l: 0, pf: 0, pa: 0 };
    });
  });

  try {
    const dates = cupDateList();
    const results = await Promise.all(
      dates.map((d) => fetchCupScoreboard(d).catch(() => null))
    );
    results.forEach((data) => {
      if (!data || !Array.isArray(data.events)) return;
      data.events.forEach((ev) => applyCupGame(records, ev));
    });

    const groupsData = NBA_CUP_GROUPS.map((g) => ({
      id: g.id,
      name: g.name,
      rows: buildCupGroupRows(g, records)
    }));
    renderCupGroups(groupsData);
  } catch (err) {
    console.error("NBA Cup standings error:", err);
    if (note) note.textContent = "Could not load Cup standings right now.";
    root.innerHTML = `<p style="color:var(--mid);grid-column:1/-1;">Cup standings unavailable.</p>`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  availableSeasons = defaultSeasonList();
  populateSeasonSelect(NEXT_SEASON_YEAR);

  const seasonSelect = document.getElementById("season-select");
  if (seasonSelect) {
    seasonSelect.addEventListener("change", (e) => {
      getNBAStandings(Number(e.target.value));
    });
  }

  // Load standings immediately — do not wait on season-list hydrate
  getNBAStandings(NEXT_SEASON_YEAR);
  loadNbaCupStandings();
  bindCupConferenceShots();
  hydrateSeasonDropdown(NEXT_SEASON_YEAR);

  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(() => {
    const viewing = Number((document.getElementById("season-select") || {}).value || NEXT_SEASON_YEAR);
    getNBAStandings(viewing);
    loadNbaCupStandings();
  }, 300000);
});
