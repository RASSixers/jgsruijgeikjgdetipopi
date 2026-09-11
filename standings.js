const STANDINGS_URL = "https://site.api.espn.com/apis/v2/sports/basketball/nba/standings";
const SEASON_COUNT = 10;
const NEXT_SEASON_YEAR = 2027; // 2026-27
const NEXT_SEASON_LABEL = "2026-27";

let currentSeasonYear = null;
let availableSeasons = [];
let refreshTimer = null;

function seasonLabel(year) {
  return `${year - 1}-${String(year).slice(-2)}`;
}

function buildSeasonOptions(seasonsFromApi) {
  const byYear = new Map();

  (seasonsFromApi || []).forEach((s) => {
    if (!s || !s.year) return;
    byYear.set(s.year, s.displayName || seasonLabel(s.year));
  });

  if (!byYear.has(NEXT_SEASON_YEAR)) {
    byYear.set(NEXT_SEASON_YEAR, NEXT_SEASON_LABEL);
  }

  const years = Array.from(byYear.keys()).sort((a, b) => b - a);
  const latest = years[0];
  const cutoff = latest - (SEASON_COUNT - 1);

  return years
    .filter((y) => y >= cutoff)
    .slice(0, SEASON_COUNT)
    .map((year) => ({ year, label: byYear.get(year) || seasonLabel(year) }));
}

function populateSeasonSelect(selectedYear) {
  const select = document.getElementById("season-select");
  if (!select) return;

  select.innerHTML = availableSeasons
    .map((s) => {
      const sel = s.year === selectedYear ? " selected" : "";
      return `<option value="${s.year}"${sel}>${s.label}</option>`;
    })
    .join("");
}

function setSeasonStatus(text) {
  const el = document.getElementById("season-status");
  if (el) el.textContent = text || "";
}

function getStat(entry, name) {
  return entry.stats.find((s) => s.name === name)?.value || 0;
}

async function getNBAStandings(seasonYear) {
  const container = document.getElementById("standings");
  const socialContainer = document.getElementById("social-export-content");
  const exportDate = document.getElementById("export-date");

  if (!container) return;

  const year = seasonYear || currentSeasonYear;
  const qs = year ? `?season=${year}` : "";
  const url = STANDINGS_URL + qs;

  container.innerHTML = `
    <div class="loader">
      <div class="loader-spinner"></div>
      <p>Loading standings${year ? ` for ${seasonLabel(year)}` : ""}…</p>
    </div>
  `;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();

    const apiSeasons = data.seasons || [];
    const apiCurrentYear = data.season?.year || apiSeasons[0]?.year || NEXT_SEASON_YEAR;

    if (!availableSeasons.length) {
      availableSeasons = buildSeasonOptions(apiSeasons);
    }

    if (!currentSeasonYear) currentSeasonYear = apiCurrentYear;

    const requested = year || currentSeasonYear;
    populateSeasonSelect(requested);

    const label =
      availableSeasons.find((s) => s.year === requested)?.label ||
      data.season?.displayName ||
      seasonLabel(requested);

    const isLiveSeason = requested === currentSeasonYear;
    setSeasonStatus(isLiveSeason ? `${label} · live` : `${label} · final`);

    if (exportDate) {
      const now = new Date();
      exportDate.textContent = `${label} · Updated ${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    }

    const conferences = data.children || [];
    if (conferences.length === 0) {
      container.innerHTML = `
        <p style="text-align:center;padding:2rem;">
          No standings yet for ${label}. ESPN usually publishes tables once preseason or opening night is underway.
        </p>`;
      if (socialContainer) socialContainer.innerHTML = "";
      return;
    }

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
                  <th>Team</th>
                  <th>W</th>
                  <th>L</th>
                  <th>PCT</th>
                  <th>GB</th>
                  <th>HOME</th>
                  <th>AWAY</th>
                  <th>L10</th>
                  <th>STRK</th>
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

      const entries = [...(conf.standings?.entries || [])];
      entries.sort((a, b) => getStat(b, "winPercent") - getStat(a, "winPercent"));

      entries.forEach((t, idx) => {
        const stats = {};
        t.stats.forEach((s) => {
          if (s.name) stats[s.name] = s;
          if (s.type) stats[s.type] = s;
        });

        const isSixers = t.team.abbreviation === "PHI";
        const rowClass = isSixers ? "sixers-highlight" : "";
        const socialRowClass = isSixers ? "social-sixers-row" : "";

        const wins = stats.wins?.displayValue || "-";
        const losses = stats.losses?.displayValue || "-";
        const pct = stats.winPercent?.displayValue || "-";
        const gb = stats.gamesBehind?.displayValue || "-";
        const home = stats.home?.summary || "-";
        const away = stats.road?.summary || "-";
        const l10 = stats.lasttengames?.summary || stats.lastTenGames?.summary || "-";
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

        html += `
          <tr class="${rowClass}">
            <td>
              <div class="team-info">
                <span class="rank">${idx + 1}</span>
                <span>${t.team.displayName}</span>
              </div>
            </td>
            <td>${wins}</td>
            <td>${losses}</td>
            <td class="pct">${pct}</td>
            <td class="gb">${gb}</td>
            <td>${home}</td>
            <td>${away}</td>
            <td>${l10}</td>
            <td><span class="status-badge ${streakClass}">${streakValue}</span></td>
          </tr>`;

        socialHtml += `
          <tr class="${socialRowClass}">
            <td>
              <div class="cell-content">
                <div class="social-team">
                  <span class="social-team-rank">${idx + 1}</span>
                  <span class="social-team-name">${t.team.displayName}</span>
                </div>
              </div>
            </td>
            <td><div class="cell-content">${wins}-${losses}</div></td>
            <td><div class="cell-content">${pct}</div></td>
            <td>
              <div class="cell-content">
                <span class="social-streak-badge ${socialStreakClass}">${streakValue}</span>
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
  } catch (err) {
    console.error("Standings Load Error:", err);
    container.innerHTML = `
      <div style="text-align:center;padding:3rem;">
        <p style="color:red;font-weight:700;margin-bottom:1rem;">Error loading standings.</p>
        <p style="font-size:0.9rem;">${err.message}</p>
        <button type="button" id="standings-retry" class="export-btn" style="margin-top:1.5rem;">Try Again</button>
      </div>`;
    document.getElementById("standings-retry")?.addEventListener("click", () => {
      getNBAStandings(year);
    });
  }
}

function initExport() {
  const exportBtns = document.querySelectorAll("[data-export-mode]");
  const modal = document.getElementById("exportModal");
  const preview = document.getElementById("exportPreview");
  const closeModal = document.getElementById("closeModal");
  const downloadBtn = document.getElementById("downloadBtn");
  const copyBtn = document.getElementById("copyBtn");

  if (exportBtns.length === 0 || !modal || typeof html2canvas !== "function") return;

  exportBtns.forEach((btn) => {
    btn.onclick = async () => {
      const mode = btn.dataset.exportMode;
      const originalText = btn.textContent;
      btn.textContent = "Generating...";
      btn.disabled = true;

      try {
        const grid = document.getElementById("social-export-container");
        const content = document.getElementById("social-export-content");
        const titleH1 = grid.querySelector(".social-title-box h1");
        const header = grid.querySelector(".social-header");

        content.classList.remove("mode-east", "mode-west");
        header.classList.remove("single-conf-mode");
        const eastDiv = content.querySelector('[data-conf="east"]');
        const westDiv = content.querySelector('[data-conf="west"]');

        if (mode === "east") {
          grid.style.width = "800px";
          content.classList.add("mode-east");
          header.classList.add("single-conf-mode");
          if (eastDiv) eastDiv.style.display = "block";
          if (westDiv) westDiv.style.display = "none";
          titleH1.textContent = "Eastern Conference Standings";
        } else if (mode === "west") {
          grid.style.width = "800px";
          content.classList.add("mode-west");
          header.classList.add("single-conf-mode");
          if (eastDiv) eastDiv.style.display = "none";
          if (westDiv) westDiv.style.display = "block";
          titleH1.textContent = "Western Conference Standings";
        } else {
          grid.style.width = "1200px";
          if (eastDiv) eastDiv.style.display = "block";
          if (westDiv) westDiv.style.display = "block";
          titleH1.textContent = "NBA Standings";
        }

        const canvas = await html2canvas(grid, {
          backgroundColor: "#f8fafc",
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: false,
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
            const item = new ClipboardItem({ "image/png": blob });
            navigator.clipboard.write([item]).then(() => {
              copyBtn.textContent = "Copied!";
              copyBtn.style.background = "#059669";
              setTimeout(() => {
                copyBtn.textContent = "Copy to Clipboard";
                copyBtn.style.background = "";
              }, 2000);
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

  closeModal.onclick = () => {
    modal.style.display = "none";
  };

  window.onclick = (event) => {
    if (event.target == modal) modal.style.display = "none";
  };
}

document.addEventListener("DOMContentLoaded", () => {
  const select = document.getElementById("season-select");
  if (select) {
    select.addEventListener("change", () => {
      getNBAStandings(Number(select.value));
    });
  }

  getNBAStandings();

  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(() => {
    const viewing = Number(document.getElementById("season-select")?.value || currentSeasonYear);
    if (viewing === currentSeasonYear) getNBAStandings(viewing);
  }, 300000);
});
