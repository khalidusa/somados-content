#!/usr/bin/env node
// صفحتا المراجعة — تُولَّدان مع كل بناء (القسم ٩). كل منشور بصورته أو مشغّل فيديو ونصه كاملاً.
const fs = require('fs');
const path = require('path');
const state = require('../src/state');
const { slotsForDate } = require('../src/schedule');

const root = path.join(__dirname, '..');
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const CSS = `
:root{--teal:#00a6a6;--teal-d:#007a7a;--ink:#1D1D1F;--muted:#6E6E73;--bg:#F5F5F7;--card:#fff;--line:rgba(0,0,0,.08);--r:18px}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--ink:#f2f4f4;--muted:#9aa3a3;--bg:#0b1416;--card:#121d1f;--line:rgba(255,255,255,.1)}}
:root[data-theme="dark"]{--ink:#f2f4f4;--muted:#9aa3a3;--bg:#0b1416;--card:#121d1f;--line:rgba(255,255,255,.1)}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg);color:var(--ink);font-family:Tajawal,system-ui,sans-serif;padding:32px 16px 80px}
header{max-width:1180px;margin:0 auto 28px}
h1{font-size:30px;font-weight:800;letter-spacing:-.3px}
.meta{color:var(--muted);margin-top:8px;font-size:15px;line-height:1.7}
nav{margin-top:18px;display:flex;gap:10px;flex-wrap:wrap}
nav a{padding:9px 18px;border-radius:999px;background:var(--card);border:1px solid var(--line);
  color:var(--ink);text-decoration:none;font-weight:700;font-size:14px}
nav a.on{background:var(--teal-d);border-color:var(--teal-d);color:#fff}
.warn{max-width:1180px;margin:0 auto 22px;padding:14px 18px;border-radius:var(--r);
  background:rgba(255,176,0,.12);border:1px solid rgba(255,176,0,.4);font-size:14px;line-height:1.7}
.grid{max-width:1180px;margin:0 auto;display:grid;gap:22px;grid-template-columns:repeat(auto-fill,minmax(300px,1fr))}
.card{background:var(--card);border:1px solid var(--line);border-radius:var(--r);overflow:hidden;display:flex;flex-direction:column}
.card img,.card video{width:100%;display:block;background:#000}
.body{padding:16px 18px 18px;display:flex;flex-direction:column;gap:10px}
.when{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--muted);font-variant-numeric:tabular-nums}
.pill{padding:3px 10px;border-radius:999px;background:rgba(0,166,166,.14);color:var(--teal-d);font-weight:700;font-size:12px}
:root[data-theme="dark"] .pill,@media (prefers-color-scheme:dark){.pill{color:#7fe3e3}}
.h{font-weight:800;font-size:17px;line-height:1.45}
.cap{white-space:pre-wrap;font-size:14px;line-height:1.75;color:var(--muted)}
.tags{font-size:12.5px;color:var(--teal-d);line-height:1.8;word-break:break-word}
.empty{max-width:1180px;margin:60px auto;text-align:center;color:var(--muted)}
@media(max-width:640px){body{padding:20px 16px 60px}h1{font-size:24px}}
`;

function page({ title, active, count, cards, note }) {
  return `<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap" rel="stylesheet">
<style>${CSS}</style></head><body>
<header>
  <h1>مراجعة محتوى سومادوس</h1>
  <p class="meta">${esc(count)} · آخر بناء: ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC</p>
  <nav>
    <a href="index.html" class="${active === 'images' ? 'on' : ''}">الصور · 10:00</a>
    <a href="reels.html" class="${active === 'reels' ? 'on' : ''}">الريلز · 19:00</a>
  </nav>
</header>
${note ? `<div class="warn">${note}</div>` : ''}
${cards.length ? `<div class="grid">${cards.join('')}</div>` : '<p class="empty">لا يوجد محتوى مبني بعد.</p>'}
</body></html>`;
}

function build() {
  const s = state.load();
  const dir = path.join(root, 'content');
  fs.mkdirSync(dir, { recursive: true });

  const imgs = Object.entries(s.images).sort(([a], [b]) => a.localeCompare(b));
  const reels = Object.entries(s.reels).sort(([a], [b]) => a.localeCompare(b));
  const anyPlaceholder = [...imgs, ...reels].some(([, v]) => v.placeholder);
  const note = anyPlaceholder
    ? '⚠️ بعض المحتوى مبني بخلفيات وهمية (placeholder) لاختبار الخط، لا بصور مولّدة. لا تنشره.'
    : '';

  const card = (date, v, kind) => {
    const slot = slotsForDate(date).find(x => x.kind === kind);
    const media = kind === 'image'
      ? `<img src="${esc(path.basename(path.dirname(v.file)))}/${esc(path.basename(v.file))}" loading="lazy" alt="">`
      : `<video src="${esc(path.basename(path.dirname(v.file)))}/${esc(path.basename(v.file))}" controls preload="metadata" playsinline></video>`;
    const who = v.market === 'visa' ? esc(v.subject || '') : esc(v.route || '');
    return `<article class="card">${media}<div class="body">
      <div class="when"><span class="pill">${slot.localISO.slice(11, 16)}</span>
        <span>${esc(date)}</span><span>·</span><span>${esc(v.lang)}</span><span>·</span><span>${who}</span></div>
      <p class="h">${esc(v.headline)}</p>
      <p class="cap">${esc(v.caption || '')}</p>
      <p class="tags">${esc((v.hashtags || []).join(' '))}</p>
    </div></article>`;
  };

  fs.writeFileSync(path.join(dir, 'index.html'), page({
    title: 'مراجعة الصور — سومادوس', active: 'images',
    count: `${imgs.length} صورة`, note,
    cards: imgs.map(([d, v]) => card(d, v, 'image')),
  }));
  fs.writeFileSync(path.join(dir, 'reels.html'), page({
    title: 'مراجعة الريلز — سومادوس', active: 'reels',
    count: `${reels.length} ريل`, note,
    cards: reels.map(([d, v]) => card(d, v, 'reel')),
  }));
  console.log(`✅ صفحتا المراجعة: ${imgs.length} صورة · ${reels.length} ريل`);
}

build();
