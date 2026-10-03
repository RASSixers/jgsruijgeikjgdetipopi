#!/usr/bin/env node
/**
 * Fully automatic Pick'em grader (runs on GitHub Actions / any Node host).
 * - Pulls ESPN scoreboard + box scores (public, no API key)
 * - Grades Auto-Slate questions (meta.grade) into Firestore correctAnswers
 * - Optionally scores picks for that date
 *
 * Secrets:
 *   FIREBASE_SERVICE_ACCOUNT = full JSON of a Firebase service account
 *   FIREBASE_PROJECT_ID      = optional if present in the JSON
 */

import admin from 'firebase-admin';

const PROJECT =
  process.env.FIREBASE_PROJECT_ID ||
  (process.env.FIREBASE_SERVICE_ACCOUNT
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT).project_id
    : null);

function initFirebase() {
  if (admin.apps.length) return admin.firestore();
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error('Missing FIREBASE_SERVICE_ACCOUNT env (JSON string)');
  const cred = JSON.parse(raw);
  admin.initializeApp({
    credential: admin.credential.cert(cred),
    projectId: PROJECT || cred.project_id
  });
  return admin.firestore();
}

function todayISO(offsetDays = 0) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  // Use America/New_York calendar date
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(d);
  const get = (t) => parts.find((p) => p.type === t)?.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function yyyymmdd(iso) {
  return String(iso || '').replace(/-/g, '');
}

function norm(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}
function teamMatch(a, b) {
  const na = norm(a),
    nb = norm(b);
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'SixersHoops-AutoGrade/1.0' }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.json();
}

async function fetchFinals(dateISO) {
  const url = `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${yyyymmdd(dateISO)}`;
  const data = await fetchJson(url);
  const finals = [];
  const inProgress = [];
  for (const ev of data.events || []) {
    const comp = (ev.competitions && ev.competitions[0]) || {};
    const status = (comp.status && comp.status.type) || {};
    const state = (status.state || '').toLowerCase();
    const completed = status.completed === true || state === 'post';
    const competitors = comp.competitors || [];
    const home = competitors.find((c) => c.homeAway === 'home') || {};
    const away = competitors.find((c) => c.homeAway === 'away') || {};
    const homeScore = parseFloat(home.score);
    const awayScore = parseFloat(away.score);
    const periodCount = (comp.status && comp.status.period) || 0;
    const detail = (status.detail || status.description || '').toLowerCase();
    const overtime = periodCount > 4 || detail.includes('ot') || detail.includes('overtime');
    const row = {
      eventId: ev.id,
      homeName: (home.team && (home.team.displayName || home.team.name)) || '',
      awayName: (away.team && (away.team.displayName || away.team.name)) || '',
      homeAbbr: (home.team && home.team.abbreviation) || '',
      awayAbbr: (away.team && away.team.abbreviation) || '',
      homeScore,
      awayScore,
      winner:
        homeScore > awayScore
          ? (home.team && (home.team.displayName || home.team.name)) || ''
          : (away.team && (away.team.displayName || away.team.name)) || '',
      margin: Math.abs(homeScore - awayScore),
      total: homeScore + awayScore,
      overtime: !!overtime,
      state
    };
    if (completed && !isNaN(homeScore) && !isNaN(awayScore)) finals.push(row);
    else if (state === 'in' || state === 'live') inProgress.push(row);
  }
  return { finals, inProgress };
}

async function fetchBox(eventId) {
  if (!eventId) return null;
  try {
    const sum = await fetchJson(
      `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=${eventId}`
    );
    const out = { home: {}, away: {}, halfHome: 0, halfAway: 0, q1Home: 0, q1Away: 0, hasDD: false };
    const box = sum.boxscore || {};
    (box.teams || []).forEach((t) => {
      const side = t.homeAway === 'home' ? 'home' : 'away';
      const stats = {};
      (t.statistics || []).forEach((s) => {
        const name = (s.name || s.displayName || '').toLowerCase();
        const val = parseFloat(s.displayValue != null ? s.displayValue : s.value);
        if (name.includes('rebound')) stats.reb = val;
        if (name.includes('assist')) stats.ast = val;
        if (name.includes('turnover')) stats.to = val;
        if (name.includes('fieldgoalpct') || name.includes('field goal pct') || (s.abbreviation || '').toLowerCase() === 'fg%')
          stats.fgPct = val;
        if (name.includes('steal')) stats.stl = val;
        if (name.includes('block')) stats.blk = val;
      });
      const linescores = t.linescores || [];
      let half = 0;
      linescores.slice(0, 2).forEach((ls) => {
        half += parseFloat(ls.value || ls.displayValue || 0) || 0;
      });
      const q1 = linescores[0] ? parseFloat(linescores[0].value || linescores[0].displayValue || 0) || 0 : 0;
      if (side === 'home') {
        out.halfHome = half;
        out.q1Home = q1;
      } else {
        out.halfAway = half;
        out.q1Away = q1;
      }
      out[side] = stats;
    });
    // double-double from athletes
    (box.players || []).forEach((teamBlock) => {
      (teamBlock.statistics || []).forEach((sg) => {
        (sg.athletes || []).forEach((ath) => {
          const stats = ath.stats || [];
          // ESPN athlete stats are often display strings in order — try categories
          const cats = (sg.names || sg.keys || []).map((x) => String(x).toLowerCase());
          let pts = 0,
            reb = 0,
            ast = 0,
            stl = 0,
            blk = 0;
          if (cats.length && stats.length) {
            cats.forEach((c, i) => {
              const v = parseFloat(stats[i]) || 0;
              if (c.includes('pts') || c === 'points') pts = v;
              if (c.includes('reb')) reb = v;
              if (c.includes('ast') || c.includes('assist')) ast = v;
              if (c.includes('stl') || c.includes('steal')) stl = v;
              if (c.includes('blk') || c.includes('block')) blk = v;
            });
          }
          const doubles = [pts, reb, ast, stl, blk].filter((n) => n >= 10).length;
          if (doubles >= 2) out.hasDD = true;
        });
      });
    });
    return out;
  } catch {
    return null;
  }
}

function findFinal(finals, meta) {
  if (!meta) return null;
  if (meta.eventId) {
    const byId = finals.find((f) => String(f.eventId) === String(meta.eventId));
    if (byId) return byId;
  }
  return (
    finals.find(
      (f) =>
        (teamMatch(f.homeName, meta.home) && teamMatch(f.awayName, meta.away)) ||
        (teamMatch(f.homeName, meta.away) && teamMatch(f.awayName, meta.home)) ||
        (teamMatch(f.homeAbbr, meta.homeAbbr) && teamMatch(f.awayAbbr, meta.awayAbbr))
    ) || null
  );
}

function gradeItem(item, idx, finals, boxes) {
  const meta = item.meta || {};
  const grade = meta.grade;
  if (!grade) return null;
  const f = findFinal(finals, meta);
  if (!f) return null;
  const opts = Array.isArray(item.options) ? item.options.map(String) : String(item.options || '').split(',').map((s) => s.trim());
  let correct = null;
  const box = boxes[f.eventId];

  if (grade === 'winner') {
    correct = opts.find((o) => teamMatch(o, f.winner)) || f.winner;
  } else if (grade === 'total') {
    const line = meta.line != null ? Number(meta.line) : 220.5;
    correct = f.total > line ? 'Over' : 'Under';
  } else if (grade === 'margin_ge') {
    const m = meta.margin != null ? Number(meta.margin) : 10;
    correct = f.margin >= m ? 'Yes' : 'No';
  } else if (grade === 'both_score_ge') {
    const p = meta.points != null ? Number(meta.points) : 110;
    correct = f.homeScore >= p && f.awayScore >= p ? 'Yes' : 'No';
  } else if (grade === 'either_score_ge') {
    const p = meta.points != null ? Number(meta.points) : 120;
    correct = f.homeScore >= p || f.awayScore >= p ? 'Yes' : 'No';
  } else if (grade === 'overtime') {
    correct = f.overtime ? 'Yes' : 'No';
  } else if (grade === 'halftime_leader' && box) {
    if (box.halfHome === box.halfAway) correct = null;
    else {
      const lead = box.halfHome > box.halfAway ? f.homeName : f.awayName;
      correct = opts.find((o) => teamMatch(o, lead)) || lead;
    }
  } else if (grade === 'q1_leader' && box) {
    if (box.q1Home === box.q1Away) correct = null;
    else {
      const lead = box.q1Home > box.q1Away ? f.homeName : f.awayName;
      correct = opts.find((o) => teamMatch(o, lead)) || lead;
    }
  } else if (grade === 'higher_half' && box) {
    const first = (box.halfHome || 0) + (box.halfAway || 0);
    const second = (f.total || 0) - first;
    if (first === second) correct = null;
    else correct = first > second ? '1st half' : '2nd half';
  } else if (grade === 'double_double' && box) {
    correct = box.hasDD ? 'Yes' : 'No';
  } else if (grade === 'fg50' && box) {
    const h = box.home.fgPct || 0,
      a = box.away.fgPct || 0;
    const hh = h > 1 ? h : h * 100;
    const aa = a > 1 ? a : a * 100;
    correct = hh >= 50 || aa >= 50 ? 'Yes' : 'No';
  } else if (grade === 'higher_fg' && box) {
    const h = box.home.fgPct || 0,
      a = box.away.fgPct || 0;
    const hh = h > 1 ? h : h * 100;
    const aa = a > 1 ? a : a * 100;
    if (hh === aa) correct = null;
    else {
      const lead = hh > aa ? f.homeName : f.awayName;
      correct = opts.find((o) => teamMatch(o, lead)) || lead;
    }
  } else if (['more_rebounds', 'more_assists', 'more_turnovers', 'more_steals', 'more_blocks'].includes(grade) && box) {
    const key =
      grade === 'more_rebounds'
        ? 'reb'
        : grade === 'more_assists'
          ? 'ast'
          : grade === 'more_steals'
            ? 'stl'
            : grade === 'more_blocks'
              ? 'blk'
              : 'to';
    const hv = box.home[key] || 0,
      av = box.away[key] || 0;
    if (hv === av) correct = null;
    else {
      const lead = hv > av ? f.homeName : f.awayName;
      correct = opts.find((o) => teamMatch(o, lead)) || lead;
    }
  }

  if (correct == null || correct === '') return null;
  return {
    questionId: idx,
    correctAnswer: correct,
    question: item.question || '',
    auto: true
  };
}

async function gradeDate(db, dateISO) {
  console.log(`[grade] ${dateISO}`);
  const { finals, inProgress } = await fetchFinals(dateISO);
  console.log(`  finals=${finals.length} inProgress=${inProgress.length}`);
  if (!finals.length) {
    console.log('  skip — no final games yet');
    return { ok: false, reason: 'not_final', inProgress: inProgress.length };
  }

  const qSnap = await db.collection('questions').where('date', '==', dateISO).get();
  if (qSnap.empty) {
    console.log('  skip — no questions doc');
    return { ok: false, reason: 'no_questions' };
  }
  const items = qSnap.docs[0].data().items || [];
  const boxes = {};
  for (const f of finals) {
    boxes[f.eventId] = await fetchBox(f.eventId);
  }

  const answers = [];
  let graded = 0,
    skipped = 0;
  items.forEach((item, idx) => {
    const a = gradeItem(item, idx, finals, boxes);
    if (a) {
      answers.push(a);
      graded++;
    } else skipped++;
  });

  if (!graded) {
    console.log('  nothing graded');
    return { ok: false, reason: 'none_graded', skipped };
  }

  const aSnap = await db.collection('correctAnswers').where('date', '==', dateISO).get();
  const byId = {};
  if (!aSnap.empty) {
    (aSnap.docs[0].data().answers || []).forEach((a) => {
      byId[a.questionId] = a;
    });
  }
  answers.forEach((a) => {
    byId[a.questionId] = a;
  });
  const merged = Object.keys(byId).map((k) => byId[k]);
  const payload = {
    date: dateISO,
    answers: merged,
    updatedAt: new Date().toISOString(),
    source: 'github-actions-auto-grade'
  };
  if (!aSnap.empty) await aSnap.docs[0].ref.set(payload, { merge: true });
  else await db.collection('correctAnswers').add(payload);

  console.log(`  success graded=${graded} skipped=${skipped}`);
  return { ok: true, graded, skipped, finals: finals.length };
}

async function main() {
  const db = initFirebase();
  const dates = [todayISO(-1), todayISO(0)];
  const results = [];
  for (const d of dates) {
    try {
      results.push({ date: d, ...(await gradeDate(db, d)) });
    } catch (e) {
      console.error(d, e);
      results.push({ date: d, ok: false, error: String(e.message || e) });
    }
  }
  console.log(JSON.stringify(results, null, 2));
  // Non-zero exit only on hard failures (auth), not "games not final"
  if (results.some((r) => r.error && /Missing FIREBASE|credential|permission/i.test(r.error))) {
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
