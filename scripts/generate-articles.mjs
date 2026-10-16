// scripts/generate-articles.mjs
//
// Pulls every article out of Firestore (public REST read) and writes a real,
// static HTML file for each one at:   article/<slug>/index.html
//
// Why: GitHub Pages can't serve /article/<slug> as a real page on its own, and
// the old 404.html routing trick returns an HTTP 404 status, which search
// engines respect over the page content -- so those pages never get indexed.
// A real file on disk returns a real 200, with the title/description/OG tags
// and article content already in the HTML (no JS execution required to see
// them). We still load the same site JS at the bottom so the page hydrates
// with the freshest Firestore data for real visitors (e.g. if you edit an
// article after this script last ran).
//
// Run with: node scripts/generate-articles.mjs
// Requires Node 18+ (built-in fetch).

import { mkdir, writeFile, readdir, rm } from 'node:fs/promises';
import path from 'node:path';

const PROJECT_ID = 'pickem-1e12b';
const API_KEY = 'AIzaSyBzMlBV5gbZZlg_eTwNWrRDrhx-_ATIPS0'; // public web API key, safe to embed
const COLLECTION = 'editorial_articles';
const SITE_URL = 'https://sixershoops.com';
const OUT_ROOT = path.resolve('article');

const CATEGORY_COLORS = { 'Player Grades': '#1e7d46', 'Analysis': '#006BB6', 'Opinion': '#b06b00', 'Preview': '#ED174C', 'Recap': '#475569', 'News': '#0077cc' };
const GRADE_COLORS = { 'A+': '#1a6b3c', 'A': '#1e7d46', 'A-': '#2d8f56', 'B+': '#006BB6', 'B': '#0077cc', 'B-': '#2a85d0', 'C+': '#b06b00', 'C': '#c27800', 'D+': '#b83232', 'D': '#a02828', 'F': '#7a1a1a', 'INC': '#6b21a8' };

function escapeHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// --- Firestore REST -> plain JS object -----------------------------------

function fromFirestoreValue(v) {
  if (v == null) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return parseInt(v.integerValue, 10);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('nullValue' in v) return null;
  if ('timestampValue' in v) return v.timestampValue; // ISO string
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(fromFirestoreValue);
  if ('mapValue' in v) return fromFirestoreFields(v.mapValue.fields || {});
  return null;
}

function fromFirestoreFields(fields) {
  const out = {};
  for (const [k, v] of Object.entries(fields || {})) out[k] = fromFirestoreValue(v);
  return out;
}

async function fetchAllArticles() {
  const articles = [];
  let pageToken = null;
  do {
    const url = new URL(`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${COLLECTION}`);
    url.searchParams.set('key', API_KEY);
    url.searchParams.set('pageSize', '300');
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Firestore fetch failed: ${res.status} ${res.statusText} -- ${await res.text()}`);
    }
    const data = await res.json();
    for (const doc of data.documents || []) {
      articles.push(fromFirestoreFields(doc.fields));
    }
    pageToken = data.nextPageToken || null;
  } while (pageToken);
  return articles.filter(a => a.slug);
}

// --- Rendering (mirrors article.html's renderArticle) ---------------------

function tweetEmbedHtml(url) {
  const safeUrl = escapeHtml(url);
  return (
    '<div class="tweet-embed-wrap">' +
      '<blockquote class="twitter-tweet"><a href="' + safeUrl + '"></a></blockquote>' +
      '<noscript><div class="tweet-fallback-card">View this post on <a href="' + safeUrl + '" target="_blank" rel="noopener noreferrer">X / Twitter</a>.</div></noscript>' +
    '</div>'
  );
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function renderArticleBody(a) {
  const color = CATEGORY_COLORS[a.category] || '#006bb6';
  const date = formatDate(a.createdAt);

  let html = '<a href="/" class="article-back">&larr; Back to Sixers Hoops</a>';
  html += '<div class="article-header">';
  html += '<span class="article-tag" style="color:' + color + ';border:1px solid ' + color + '33;background:' + color + '14;">' + escapeHtml(a.category || 'News') + '</span>';
  html += '<h1 class="article-title">' + escapeHtml(a.title) + '</h1>';
  html += '<div class="article-meta"><span>Sixers Hoops Staff</span><span>&middot;</span><span>' + escapeHtml(date) + '</span></div>';
  if (a.excerpt) html += '<p class="article-excerpt">' + escapeHtml(a.excerpt) + '</p>';
  html += '</div>';

  if (a.intro) html += '<div class="article-body"><p>' + escapeHtml(a.intro) + '</p></div>';
  if (a.tweetUrl) html += tweetEmbedHtml(a.tweetUrl);

  const grades = (a.grades || []).filter(g => g.grade && g.grade !== 'DNP');
  if (grades.length) {
    html += '<div class="grades-section"><h2 class="grades-heading">Player Grades</h2>';
    for (const g of grades) {
      const gColor = GRADE_COLORS[g.grade] || '#006bb6';
      html += '<div class="grade-card">';
      html += '<div class="grade-pill" style="background:' + gColor + ';color:#fff;">' + escapeHtml(g.grade) + '</div>';
      html += '<div class="grade-card-body">';
      html += '<h3 class="grade-card-name">' + escapeHtml(g.name) + '</h3>';
      if (g.stats) html += '<p class="grade-card-stats">' + escapeHtml(g.stats) + '</p>';
      if (g.analysis) html += '<p class="grade-card-analysis">' + escapeHtml(g.analysis) + '</p>';
      if (g.tweetUrl) html += '<div class="grade-card-tweet">' + tweetEmbedHtml(g.tweetUrl) + '</div>';
      html += '</div></div>';
    }
    html += '</div>';
  }

  if (a.closing) html += '<div class="article-closing">' + escapeHtml(a.closing) + '</div>';
  return html;
}

function renderPage(a) {
  const desc = escapeHtml(a.excerpt || (a.intro ? a.intro.slice(0, 155) : 'Sixers Hoops \u2014 Philadelphia 76ers news and analysis.'));
  const title = escapeHtml(a.title) + ' \u2014 Sixers Hoops';
  const canonical = SITE_URL + '/article/' + encodeURIComponent(a.slug);
  const needsTwitterWidget = !!(a.tweetUrl || (a.grades || []).some(g => g.tweetUrl));

  return `<!doctype html>
<html lang="en">
<head>
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8046070602394287"
     crossorigin="anonymous"></script>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title>
<meta name="description" content="${desc}" />
<meta property="og:title" content="${title}" />
<meta property="og:description" content="${desc}" />
<meta property="og:url" content="${canonical}" />
<meta property="og:type" content="article" />
<meta name="twitter:card" content="summary" />
<meta name="twitter:title" content="${title}" />
<meta name="twitter:description" content="${desc}" />
<link rel="canonical" href="${canonical}" />
<link rel="icon" href="/favicon.ico" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Lexend:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
<link rel="stylesheet" href="/navbar-styles.css" />
<style>
  :root { --navy:#001a57; --sixers-blue:#006bb6; --sixers-red:#ed174c; --cream:#ffffff; --ink:#0d0f1a; --mid:#64748b; --border-light:#e4e8f0; --card-bg:#ffffff; }
  *,*::before,*::after{box-sizing:border-box;}
  html,body{margin:0;padding:0;}
  body{background:var(--cream);color:var(--ink);font-family:"Lexend",system-ui,-apple-system,BlinkMacSystemFont,sans-serif;min-height:100vh;-webkit-font-smoothing:antialiased;margin-top:64px;}
  a{color:inherit;}
  .article-wrap{max-width:760px;margin:0 auto;padding:2.5rem 2rem 5rem;}
  .article-back{display:inline-flex;align-items:center;gap:0.4rem;font-size:0.85rem;font-weight:600;color:var(--sixers-blue);text-decoration:none;margin-bottom:1.75rem;}
  .article-back:hover{text-decoration:underline;}
  .article-header{text-align:center;margin-bottom:2rem;}
  .article-tag{display:inline-flex;font-size:0.7rem;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;padding:4px 11px;border-radius:999px;margin-bottom:1rem;}
  .article-title{font-size:clamp(1.8rem,4.5vw,2.6rem);font-weight:700;letter-spacing:-0.02em;line-height:1.15;margin:0 0 0.75rem;}
  .article-meta{display:flex;gap:0.5rem;font-size:0.85rem;color:var(--mid);justify-content:center;}
  .article-excerpt{font-size:1.1rem;line-height:1.6;color:var(--mid);margin:1.5rem 0 0;font-weight:500;}
  .article-body p{font-size:1.05rem;line-height:1.75;color:var(--ink);margin:0 0 1.5rem;white-space:pre-wrap;}
  .tweet-embed-wrap{margin:1.25rem 0;background:#f8fafc;border:1px solid var(--border-light);border-radius:14px;padding:1rem 1.25rem 0.5rem;overflow:hidden;}
  .tweet-embed-wrap .twitter-tweet{margin:0 auto !important;}
  .tweet-fallback-card{font-size:0.85rem;color:var(--mid);}
  .tweet-fallback-card a{color:var(--sixers-blue);font-weight:600;text-decoration:none;}
  .tweet-fallback-card a:hover{text-decoration:underline;}
  .grades-section{margin:2.5rem 0;}
  .grades-heading{font-size:1.3rem;font-weight:700;margin:0 0 1.25rem;}
  .grade-card{border:1px solid var(--border-light);border-radius:12px;padding:1.1rem 1.25rem;margin-bottom:1rem;display:flex;gap:1rem;align-items:flex-start;}
  .grade-pill{flex-shrink:0;width:48px;height:48px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:1.1rem;}
  .grade-card-body{flex:1;min-width:0;}
  .grade-card-name{font-size:1rem;font-weight:700;margin:0 0 0.2rem;}
  .grade-card-stats{font-size:0.82rem;color:var(--mid);margin:0 0 0.5rem;}
  .grade-card-analysis{font-size:0.92rem;line-height:1.55;color:var(--ink);margin:0;}
  .grade-card-tweet{margin-top:0.85rem;}
  .article-closing{font-size:1.05rem;line-height:1.75;color:var(--ink);margin-top:2rem;padding-top:1.75rem;border-top:1px solid var(--border-light);white-space:pre-wrap;}
  @media (max-width:600px){.article-wrap{padding:1.75rem 1.1rem 3.5rem;}.grade-card{flex-direction:column;}}
</style>
</head>
<body>
<main>
  <div class="article-wrap" id="article-root">
${renderArticleBody(a)}
  </div>
</main>
<script src="/nav.js"></script>
${needsTwitterWidget ? '<script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>' : ''}
</body>
</html>
`;
}

// --- Sitemap ----------------------------------------------------------------

function renderSitemap(articles) {
  const urls = [
    `  <url><loc>${SITE_URL}/</loc><changefreq>hourly</changefreq><priority>1.0</priority></url>`,
    ...articles.map(a => {
      const lastmod = a.createdAt ? new Date(a.createdAt).toISOString().slice(0, 10) : '';
      return `  <url><loc>${SITE_URL}/article/${encodeURIComponent(a.slug)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}<changefreq>weekly</changefreq><priority>0.8</priority></url>`;
    })
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

// --- Main -------------------------------------------------------------------

async function main() {
  console.log('Fetching articles from Firestore...');
  const articles = await fetchAllArticles();
  console.log(`Found ${articles.length} article(s).`);

  // Clean out old generated article folders so removed/renamed slugs don't
  // leave stale static pages behind, then regenerate from scratch.
  await rm(OUT_ROOT, { recursive: true, force: true });
  await mkdir(OUT_ROOT, { recursive: true });

  for (const a of articles) {
    const dir = path.join(OUT_ROOT, a.slug);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, 'index.html'), renderPage(a), 'utf8');
    console.log(`  wrote article/${a.slug}/index.html`);
  }

  await writeFile(path.resolve('sitemap.xml'), renderSitemap(articles), 'utf8');
  console.log('wrote sitemap.xml');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
