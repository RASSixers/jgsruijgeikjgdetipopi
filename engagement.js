/**
 * Sixers Hoops engagement helpers
 * - Pick streaks + visit streaks (Firestore users/{uid})
 * - Shareable weekly leaderboard cards (canvas)
 * - On This Day Sixers history
 */
(function (global) {
  'use strict';

  function todayISO() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  function yesterdayISO() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  function daysBetween(a, b) {
    const da = new Date(a + 'T12:00:00');
    const db = new Date(b + 'T12:00:00');
    return Math.round((db - da) / 86400000);
  }

  /**
   * Update pick streak after a successful daily submission.
   * Rules: consecutive calendar days with at least one pick submission.
   */
  async function updatePickStreak(db, uid, pickDate) {
    if (!db || !uid || !pickDate) return null;
    const ref = db.collection('users').doc(uid);
    const snap = await ref.get();
    const data = snap.exists ? snap.data() : {};
    const last = data.lastPickDate || null;
    let streak = Number(data.pickStreak) || 0;
    let best = Number(data.bestPickStreak) || 0;

    if (last === pickDate) {
      // already counted this day
    } else if (last && daysBetween(last, pickDate) === 1) {
      streak += 1;
    } else {
      streak = 1;
    }
    if (streak > best) best = streak;

    const payload = {
      lastPickDate: pickDate,
      pickStreak: streak,
      bestPickStreak: best,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    if (snap.exists) await ref.set(payload, { merge: true });
    else await ref.set(payload, { merge: true });

    return { pickStreak: streak, bestPickStreak: best };
  }

  /**
   * Update site-visit / login streak (once per calendar day).
   */
  async function updateVisitStreak(db, uid) {
    if (!db || !uid) return null;
    const today = todayISO();
    const ref = db.collection('users').doc(uid);
    const snap = await ref.get();
    const data = snap.exists ? snap.data() : {};
    const last = data.lastVisitDate || null;
    if (last === today) {
      return {
        visitStreak: Number(data.visitStreak) || 1,
        bestVisitStreak: Number(data.bestVisitStreak) || 1
      };
    }
    let streak = Number(data.visitStreak) || 0;
    let best = Number(data.bestVisitStreak) || 0;
    if (last && daysBetween(last, today) === 1) streak += 1;
    else streak = 1;
    if (streak > best) best = streak;

    await ref.set({
      lastVisitDate: today,
      visitStreak: streak,
      bestVisitStreak: best,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    return { visitStreak: streak, bestVisitStreak: best };
  }

  function streakBadgeLabel(n) {
    n = Number(n) || 0;
    if (n >= 30) return '🔥 ' + n + '-day legend';
    if (n >= 14) return '🔥 ' + n + '-day heater';
    if (n >= 7) return '🔥 ' + n + '-day streak';
    if (n >= 3) return '🔥 ' + n + '-day streak';
    if (n >= 1) return '🔥 Day ' + n;
    return '';
  }

  /**
   * Draw a shareable weekly leaderboard card to a canvas and trigger download/share.
   * rows: [{ rank, username, correct, total, accuracy }]
   */
  function buildWeeklyShareCard(opts) {
    const rows = (opts && opts.rows) || [];
    const weekLabel = (opts && opts.weekLabel) || 'Weekly Leaderboard';
    const site = (opts && opts.site) || 'Sixers Hoops Pick\'em';
    const W = 720;
    const rowH = 44;
    const headerH = 120;
    const footerH = 56;
    const topN = Math.min(rows.length, 10);
    const H = headerH + topN * rowH + footerH + 24;

    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    // Background
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, '#0b0f1a');
    grad.addColorStop(1, '#001a57');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Accent bar
    ctx.fillStyle = '#006BB6';
    ctx.fillRect(0, 0, W, 6);
    ctx.fillStyle = '#ED174C';
    ctx.fillRect(0, 6, W, 3);

    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px system-ui, -apple-system, sans-serif';
    ctx.fillText(site, 32, 48);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 16px system-ui, -apple-system, sans-serif';
    ctx.fillText(weekLabel, 32, 78);
    ctx.fillStyle = '#4da8ff';
    ctx.font = '600 13px system-ui, -apple-system, sans-serif';
    ctx.fillText('Top ' + topN + ' · sixershoops.com/pickem', 32, 102);

    // Rows
    for (let i = 0; i < topN; i++) {
      const r = rows[i];
      const y = headerH + i * rowH;
      if (i % 2 === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.04)';
        ctx.fillRect(24, y, W - 48, rowH);
      }
      // Rank
      ctx.fillStyle = i === 0 ? '#c9a84c' : i === 1 ? '#94a3b8' : i === 2 ? '#b45309' : '#e2e8f0';
      ctx.font = 'bold 18px system-ui, sans-serif';
      ctx.fillText('#' + (r.rank || i + 1), 40, y + 28);
      // Name
      ctx.fillStyle = '#f8fafc';
      ctx.font = '600 16px system-ui, sans-serif';
      const name = String(r.username || 'Player').substring(0, 18);
      ctx.fillText(name, 100, y + 28);
      // Score
      ctx.fillStyle = '#4ade80';
      ctx.font = 'bold 16px system-ui, sans-serif';
      const scoreTxt = (r.correct != null ? r.correct : '-') + '/' + (r.total != null ? r.total : '-');
      ctx.fillText(scoreTxt, W - 200, y + 28);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 14px system-ui, sans-serif';
      const acc = r.accuracy != null ? r.accuracy + '%' : '';
      ctx.fillText(acc, W - 100, y + 28);
    }

    // Footer
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(0, H - footerH, W, footerH);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 13px system-ui, sans-serif';
    ctx.fillText('Make your picks · Compete with Sixers fans', 32, H - 22);

    return canvas;
  }

  async function shareWeeklyCard(opts) {
    const canvas = buildWeeklyShareCard(opts);
    const fileName = 'sixershoops-week-' + String((opts && opts.weekLabel) || 'lb').replace(/\s+/g, '-').toLowerCase() + '.png';

    return new Promise(function (resolve) {
      canvas.toBlob(async function (blob) {
        if (!blob) {
          resolve({ ok: false, error: 'Could not create image' });
          return;
        }
        try {
          if (navigator.share && navigator.canShare) {
            const file = new File([blob], fileName, { type: 'image/png' });
            if (navigator.canShare({ files: [file] })) {
              await navigator.share({
                files: [file],
                title: 'Sixers Hoops Weekly Leaderboard',
                text: (opts && opts.weekLabel) || 'Weekly Pick\'em leaderboard'
              });
              resolve({ ok: true, shared: true });
              return;
            }
          }
        } catch (e) {
          // fall through to download
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
        resolve({ ok: true, downloaded: true });
      }, 'image/png');
    });
  }

  /**
   * Curated Sixers "On this day" moments keyed by MM-DD.
   * Keep entries short for feed cards.
   */
  const ON_THIS_DAY = {
    '01-15': { year: 1965, title: 'Wilt arrives in Philly', text: 'The Warriors trade Wilt Chamberlain to the 76ers in one of the biggest deals in NBA history.' },
    '01-17': { year: 1977, title: 'Dr. J era rising', text: 'Julius Erving continues to redefine the game in Philadelphia after his arrival from the ABA.' },
    '02-11': { year: 2001, title: 'Iverson All-Star MVP', text: 'Allen Iverson earns All-Star Game MVP as the East edges the West in Washington.' },
    '03-02': { year: 1962, title: 'Wilt\'s 100-point night', text: 'While still with the Warriors, Wilt Chamberlain scores 100 points in Hershey — a record forever tied to Philly basketball lore.' },
    '04-05': { year: 1967, title: 'Chamberlain board monster', text: 'Wilt Chamberlain hauls in 41 rebounds — an NBA record that still stands.' },
    '04-16': { year: 1970, title: 'Playoff basketball in Philly', text: 'The Sixers\' postseason history is filled with nights that defined eras — from Wilt to AI to Embiid.' },
    '04-24': { year: 1967, title: '1967 NBA Champions', text: 'The 76ers defeat the Warriors to win the NBA championship, ending Boston\'s dynasty run.' },
    '05-07': { year: 1983, title: 'Fo-Fo-Fo run begins', text: 'Moses Malone\'s Sixers begin a dominant playoff path that ends with a Finals sweep.' },
    '05-31': { year: 1983, title: '1983 NBA Champions', text: 'Philadelphia sweeps the Lakers for the title. Malone is Finals MVP.' },
    '06-06': { year: 2001, title: 'Iverson steps over Tyronn Lue', text: 'Game 1 of the Finals — AI drops 48 and the step-over becomes an all-time Sixers moment.' },
    '06-15': { year: 2001, title: 'Finals battle ends', text: 'The Lakers close out the 2001 Finals; Iverson\'s run still defines a generation of Sixers fans.' },
    '06-26': { year: 2014, title: 'The Process draft years', text: 'Philadelphia\'s draft-night pivots reshape the franchise for the Embiid era.' },
    '08-06': { year: 1963, title: 'Nationals become the 76ers', text: 'The franchise renames to the 76ers, honoring 1776 and a new home in Philadelphia.' },
    '09-15': { year: 1982, title: 'Moses Malone acquired', text: 'Houston trades Moses Malone to Philly. He delivers a title the following season.' },
    '09-23': { year: 2016, title: 'Training complex opens', text: 'The Sixers open their modern training facility — a symbol of the franchise\'s rebuild era.' },
    '10-09': { year: 1996, title: 'Iverson drafted No. 1', text: 'Allen Iverson is selected first overall — the start of a cultural and basketball revolution in Philly.' },
    '10-22': { year: 1976, title: 'Dr. J\'s NBA debut season', text: 'Julius Erving\'s first NBA season in Philadelphia begins a new era of high-flying basketball.' },
    '11-01': { year: 1996, title: 'AI\'s rookie season tip', text: 'Allen Iverson begins his legendary Sixers career that would include an MVP and a Finals run.' },
    '12-03': { year: 1965, title: 'Franchise tragedy in Boston', text: 'Co-owner Ike Richman suffers a fatal heart attack courtside at Boston Garden.' },
    '12-13': { year: 2008, title: 'Cheeks dismissed', text: 'After a slow start, Maurice Cheeks is fired; Tony DiLeo takes over as interim coach.' }
  };

  function getOnThisDay(dateObj) {
    const d = dateObj || new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const key = mm + '-' + dd;
    const entry = ON_THIS_DAY[key];
    if (entry) return Object.assign({ key: key, mmdd: key }, entry);
    // Fallback rotating generic card so the module always has something to show
    const generics = [
      { year: '—', title: 'Sixers history runs deep', text: 'From Syracuse to Philly, from Wilt to AI to today — every day is a chance to add a new chapter.' },
      { year: '1776', title: 'Named for independence', text: 'The 76ers name honors the year the Declaration of Independence was signed in Philadelphia.' },
      { year: '1967 & 1983', title: 'Championship DNA', text: 'Title teams led by Wilt and later Moses + Dr. J still set the standard for Sixers basketball.' }
    ];
    const idx = (d.getDate() + d.getMonth()) % generics.length;
    return Object.assign({ key: key, mmdd: key }, generics[idx]);
  }

  function renderOnThisDayCard(container) {
    if (!container) return;
    const entry = getOnThisDay(new Date());
    container.innerHTML =
      '<div class="otd-card">' +
        '<div class="otd-eyebrow">On this day · ' + entry.mmdd.replace('-', '/') + '</div>' +
        '<h3 class="otd-title">' + escapeHtml(entry.title) + (entry.year && entry.year !== '—' ? ' <span class="otd-year">(' + entry.year + ')</span>' : '') + '</h3>' +
        '<p class="otd-text">' + escapeHtml(entry.text) + '</p>' +
        '<a class="otd-link" href="/pickem">Make today\'s picks →</a>' +
      '</div>';
  }

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  global.SixersEngagement = {
    todayISO: todayISO,
    updatePickStreak: updatePickStreak,
    updateVisitStreak: updateVisitStreak,
    streakBadgeLabel: streakBadgeLabel,
    shareWeeklyCard: shareWeeklyCard,
    buildWeeklyShareCard: buildWeeklyShareCard,
    getOnThisDay: getOnThisDay,
    renderOnThisDayCard: renderOnThisDayCard,
    ON_THIS_DAY: ON_THIS_DAY
  };
})(typeof window !== 'undefined' ? window : globalThis);
