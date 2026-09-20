#!/usr/bin/env node
// زر الشهر: ينتج شهراً كاملاً من الصور والنصوص، ويكتب خطة يلتقطها topup.mjs
// يوماً بيوم ويضعها في Buffer. يستأنف من حيث توقف، فلا شيء يضيع.

import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { loadEnv } from './lib/env.mjs';
import { withBrowser, shoot, photoHash, hammingDistance, SIZES } from './lib/render.mjs';
import { buildPostHTML } from './lib/design.mjs';
import { buildPost, ROTATION } from './lib/compose.mjs';
import { monthSlots, targetMonth } from './lib/schedule.mjs';
import { pool, download, photoQuality, qualityReject } from './lib/photos.mjs';
import { hasVisibleText, heroGuard, accounts } from './lib/cloudflare.mjs';
import { ROOT, POSTS, loadJson, loadHistory, saveHistory, loadPlan, savePlan, findIncompleteMonth } from './lib/store.mjs';

const HASH_MIN_DISTANCE = 10;      // أقل من هذا = صورتان متشابهتان
const force = process.argv.includes('--force');
const dry = process.argv.includes('--dry-run');
const limitArg = process.argv.find(a => a.startsWith('--limit='));
const limit = limitArg ? Number(limitArg.split('=')[1]) : Infinity;

await loadEnv();
const brand = await loadJson('brand.json');
const data = {
  destinations: await loadJson('data/destinations.json'),
  visas: await loadJson('data/visas.json'),
  copyAr: await loadJson('data/copy.ar.json'),
  visaQueries: (await loadJson('data/queries.json')).visas
};
const POST_HOUR = brand.schedule.postHour;

let { year, month, key: monthKey } = targetMonth();
if (!process.env.MONTH) {
  const pending = await findIncompleteMonth();
  if (pending) {
    ({ year, month, key: monthKey } = pending);
    console.log(`نكمل ${monthKey}: ${pending.done}/${pending.days} منشوراً جاهزاً.`);
  } else {
    const now = new Date();
    const curKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    const remaining = monthSlots(now.getUTCFullYear(), now.getUTCMonth() + 1, POST_HOUR)
      .filter(s => new Date(s.dueAt).getTime() > Date.now()).length;
    if (remaining >= 3 && !(await loadPlan(curKey))) {
      year = now.getUTCFullYear(); month = now.getUTCMonth() + 1; monthKey = curKey;
      console.log(`بقي ${remaining} يوماً من هذا الشهر — نملأ ${monthKey} أولاً.`);
    }
  }
}

// الأيام التي مضت لا تُنتَج: Buffer لا يجدول في الماضي، وإنتاجها إهدار خالص.
const allSlots = monthSlots(year, month, POST_HOUR);
const slots = allSlots.filter(s => new Date(s.dueAt).getTime() > Date.now() + 20 * 60 * 1000);
if (slots.length < allSlots.length) console.log(`تخطّينا ${allSlots.length - slots.length} يوماً مضى من ${monthKey}.`);
const existing = await loadPlan(monthKey);
if (existing && existing.posts.length >= slots.length && !force) {
  console.log(`${monthKey} مكتمل (${existing.posts.length} منشوراً). لا شيء لعمله — مرّر --force لإعادة بنائه.`);
  process.exit(0);
}

const done = force ? new Map() : new Map((existing?.posts ?? []).map(p => [p.day, p]));
if (done.size) console.log(`استئناف: ${done.size} منشوراً مرسوماً سابقاً.`);

const history = await loadHistory();
history.photoIds ??= {};

// تشغيلات ملغاة تترك معرّفات صور محجوزة بلا منشور، فتجفّ المجموعات بلا سبب.
// نحرّر كل معرّف لا تشير إليه خطة قائمة.
{
  const { listPlans: lp, loadPlan: rp } = await import('./lib/store.mjs');
  const alive = new Set();
  for (const key of await lp()) for (const post of (await rp(key))?.posts ?? [])
    for (const id of post.photoIds ?? []) alive.add(String(id));
  const before = Object.keys(history.photoIds).length;
  if (alive.size) {
    for (const id of Object.keys(history.photoIds)) if (!alive.has(id)) delete history.photoIds[id];
    const freed = before - Object.keys(history.photoIds).length;
    if (freed) console.log(`حرّرنا ${freed} صورة محجوزة بلا منشور.`);
  }
}

console.log(`خطة ${monthKey}: ${slots.length} منشوراً، الساعة ${String(POST_HOUR).padStart(2, '0')}:00 بتوقيت بغداد.`);

// ── ١. تركيبة فريدة لكل يوم ──────────────────────────────────────────
// المنشورات المرسومة سابقاً تدخل الحساب أيضاً: بدونها كان الاستئناف يعيد
// العنوان نفسه لأن الذاكرة تبدأ فارغة في كل تشغيل.
const usedThisMonth = new Set([...done.values()].map(p => p.headlineKey ?? (p.copy?.headline ?? []).join(' ')));
const recentHeadlines = [...done.values()]
  .sort((a, b) => a.day - b.day).slice(-8)
  .map(p => (p.copy?.headline ?? []).join(' '));
const planned = slots.map((slot, i) => {
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = buildPost({ monthKey, slot, index: i, brand, data, salt: attempt ? String(attempt) : '' });
    const usedHeadline = history.headlines[candidate.headlineKey];
    const recent = usedHeadline && (Date.now() - new Date(usedHeadline).getTime()) < 1000 * 60 * 60 * 24 * 120;
    const plain = candidate.copy.headline.join(' ');
    const dupe = usedThisMonth.has(candidate.headlineKey) || recentHeadlines.includes(plain);
    const keep = (c) => {
      usedThisMonth.add(c.headlineKey);
      recentHeadlines.push(c.copy.headline.join(' '));
      if (recentHeadlines.length > 8) recentHeadlines.shift();
      return c;
    };
    if (!history.combos[candidate.comboId] && !recent && !dupe) return keep(candidate);
    if (attempt === 9) return keep(candidate);
  }
});

if (dry) {
  for (const p of planned) console.log(`  ${p.localLabel}  ${p.layout.padEnd(11)} ${String(p.photosNeeded)}📷  "${p.headlineKey}"`);
  process.exit(0);
}

// ── ٢. الصور: بحث، رفض المكرر، ثم الرسم ─────────────────────────────
const outDir = path.join(POSTS, monthKey);
await mkdir(outDir, { recursive: true });

// الحارس يقرأ الصورة بنموذج رؤية على Cloudflare. مع حساب واحد الحصة تضيق،
// فيُفعَّل تلقائياً عند وجود حسابين فأكثر، أو يدوياً بـPHOTO_TEXT_GUARD=1.
const TEXT_GUARD = process.env.PHOTO_TEXT_GUARD === '1'
  || (process.env.PHOTO_TEXT_GUARD !== '0' && accounts().length >= 2);
if (TEXT_GUARD) console.log('حارس النص داخل الصور: مفعّل');

const poolCache = new Map();
// أنقرة مدينة داخلية بلا بحر: صورة ساحلية تحت اسمها خطأ يراه الزبون فوراً.
// حين يحمل القالب اسم المدينة فوق صورتها، نقبل فقط صورة يذكر وصفها المكان،
// وإن لم توجد ننتقل إلى صور "الرحلة" (طائرة، سحاب، مطار) لا إلى مدينة أخرى.
const JOURNEY_FALLBACK = ['airplane wing above clouds', 'airport terminal window sunlight', 'airplane window clouds day'];

async function photosFor(queries, dayId, page, { strict = false } = {}) {
  const chosen = [];
  for (const q of queries) {
    if (!poolCache.has(q)) poolCache.set(q, await pool([q]));
    // الصور التي يذكر وصفها اسم المكان أولاً: صورة مطر على زجاج نافذة
    // اجتازت كل فحوص الجودة ولم تكن إعلان إسطنبول بأي معنى.
    // ثلاث محاولات مرتّبة: المطابق أولاً، ثم صور الرحلة، ثم أي صورة تعبر الجودة.
    // اليوم لا يُتخطّى إلا إذا سقطت الثلاث — والتخطّي يعني فجوة في التقويم.
    const all = poolCache.get(q);
    const tiers = [all.filter(c => c.relevant)];
    const alt = JOURNEY_FALLBACK[chosen.length % JOURNEY_FALLBACK.length];
    if (!poolCache.has(alt)) poolCache.set(alt, await pool([alt]));
    tiers.push(poolCache.get(alt));
    // في الوضع الصارم لا نقبل صورة لا يذكر وصفها المكان: عنوان "تذكرتك إلى
    // البصرة" فوق برج غلطة خطأ أفدح من صورة طائرة محايدة.
    if (!strict) tiers.push(all);

    let taken = null;
    for (const [tierIndex, candidates] of tiers.entries()) {
      if (taken) break;
      // الحلقة تصل هنا فقط إذا لم تنجح الطبقة السابقة (taken يكسر الحلقة)
      if (tierIndex === 1) console.log(`  اليوم ${dayId}: لا صورة مطابقة صالحة لـ"${q}" — نستبدلها بصورة رحلة`);
      for (const cand of candidates) {
        if (history.photoIds[cand.id]) continue;
        if (chosen.some(c => c.id === cand.id)) continue;
        let b64;
        try { b64 = await download(cand); } catch (e) { console.warn(`  تعذّر التنزيل (${e.message})`); continue; }
        const bad = qualityReject(await photoQuality(page, b64), { sky: tierIndex === 1 });
        if (bad) { console.log(`  اليوم ${dayId}: ${bad} — نأخذ غيرها`); continue; }
        if (TEXT_GUARD && chosen.length === 0) {       // البطل فقط: الصور الثانوية صغيرة ولا تُقرأ
          const seen = await heroGuard(b64);
          if (!seen.checked) { console.warn(`  اليوم ${dayId}: تعذّر فحص الصورة بالرؤية — نرفضها احتياطاً`); continue; }
          if (seen.reject) { console.log(`  اليوم ${dayId}: ${seen.why} — نأخذ غيرها`); continue; }
        }
        const h = await photoHash(page, b64);
        const clash = history.hashes.find(prev => hammingDistance(prev.hash, h) < HASH_MIN_DISTANCE);
        if (clash) { console.log(`  اليوم ${dayId}: صورة تشبه ${clash.ref} — نأخذ غيرها`); continue; }
        taken = { ...cand, b64, hash: h, tier: tierIndex };
        break;
      }
    }
    if (!taken) return null;
    chosen.push(taken);
  }
  return chosen;
}

/** لكل موقع في القالب: مدينة لها صورة مطابقة فعلاً، وإلا ننتقل لمدينة أخرى. */
async function photosForCities(post, dayId, page) {
  const chosen = [];
  const usedCities = new Set();
  const pool = post.copy.cityPool ?? [];
  const picked = [];
  for (let slot = 0; slot < post.photosNeeded; slot++) {
    let got = null;
    for (const city of pool) {
      if (usedCities.has(city.code)) continue;
      for (const q of city.queries) {
        if (!poolCache.has(q)) poolCache.set(q, await pool2(q));
        const cands = poolCache.get(q).filter(c => c.relevant);
        const taken = await tryCandidates(cands, chosen, dayId, page, false);
        if (taken) { got = { ...taken, city }; break; }
      }
      if (got) break;
    }
    if (!got) return null;
    usedCities.add(got.city.code);
    picked.push({ code: got.city.code, ar: got.city.ar });
    chosen.push(got);
  }
  // الأسماء والعنوان يتبعان الصور التي وُجدت فعلاً، لا التي خُطّط لها
  const before = post.copy.cities ?? [];
  post.copy.cities = picked;
  if (post.photosNeeded === 2 && picked.length === 2) {
    const oldFrom = post.copy.from, oldTo = post.copy.to;
    post.copy.from = picked[0].ar; post.copy.to = picked[1].ar;
    const swap = (t) => String(t).replace(oldFrom, picked[0].ar).replace(oldTo, picked[1].ar);
    post.copy.headline = post.copy.headline.map(swap);
    post.copy.sub = swap(post.copy.sub);
    post.headlineKey = post.copy.headline.join(' ') + ' | ' + picked[0].ar + '→' + picked[1].ar;
  }
  void before;
  return chosen;
}

const pool2 = async (q) => pool([q]);

/** يمرّ على المرشحين ويعيد أول صورة تعبر كل الفحوص. */
async function tryCandidates(candidates, chosen, dayId, page, sky) {
  for (const cand of candidates) {
    if (history.photoIds[cand.id]) continue;
    if (chosen.some(c => c.id === cand.id)) continue;
    let b64;
    try { b64 = await download(cand); } catch { continue; }
    const bad = qualityReject(await photoQuality(page, b64), { sky });
    if (bad) { console.log(`  اليوم ${dayId}: ${bad} — نأخذ غيرها`); continue; }
    if (TEXT_GUARD) {
      const seen = await heroGuard(b64);
      if (!seen.checked) { console.warn(`  اليوم ${dayId}: تعذّر فحص الصورة بالرؤية — نرفضها احتياطاً`); continue; }
      if (seen.reject) { console.log(`  اليوم ${dayId}: ${seen.why} — نأخذ غيرها`); continue; }
    }
    const h = await photoHash(page, b64);
    const clash = history.hashes.find(prev => hammingDistance(prev.hash, h) < HASH_MIN_DISTANCE);
    if (clash) { console.log(`  اليوم ${dayId}: صورة تشبه ${clash.ref} — نأخذ غيرها`); continue; }
    return { ...cand, b64, hash: h, tier: 0 };
  }
  return null;
}

const results = [...done.values()];
const todo = planned.filter(p => !done.has(p.day)).slice(0, limit);

await withBrowser(async (page) => {
  for (const post of todo) {
    const dayId = String(post.day).padStart(2, '0');
    const photos = post.cityLabels
      ? await photosForCities(post, dayId, page)
      : await photosFor(post.queries, dayId, page, { strict: true });
    if (!photos) { console.warn(`  اليوم ${dayId}: لم نجد صوراً كافية — نتخطّاه`); continue; }

    // القوالب التي تطلب صورة ثانية داخل النص (البطاقة البريدية) تأخذها من المجموعة نفسها
    if (post.copy.photo2Needed && photos[1]) post.copy.photo2 = photos[1].b64;
    const html = await buildPostHTML({ layout: post.layout, size: SIZES.feed, photos: photos.map(p => p.b64), copy: post.copy });
    const { buf, fit } = await shoot(page, html, SIZES.feed);
    if (fit && fit.ok === false) {
      const why = (fit.problems ?? []).join(' · ') || 'العنوان أوسع من إطاره';
      console.warn(`  اليوم ${dayId}: تخطيط غير سليم — ${why}`);
    }

    const relFeed = `posts/${monthKey}/day${dayId}-feed.jpg`;
    await writeFile(path.join(ROOT, relFeed), buf);
    const relPhotos = [];
    for (const [i, ph] of photos.entries()) {
      const rel = `posts/${monthKey}/day${dayId}-photo${i ? i + 1 : ''}.jpg`;
      await writeFile(path.join(ROOT, rel), Buffer.from(ph.b64, 'base64'));
      relPhotos.push(rel);
      history.photoIds[ph.id] = `${monthKey}/day${dayId}`;
      history.hashes.push({ hash: ph.hash, ref: `${monthKey}/day${dayId}` });
    }

    history.combos[post.comboId] = monthKey;
    history.headlines[post.headlineKey] = new Date().toISOString();

    results.push({
      day: post.day, dueAt: post.dueAt, localLabel: post.localLabel,
      layout: post.layout, comboId: post.comboId,
      images: { feed: relFeed, photos: relPhotos },
      credit: photos.map(p => p.photographer),
      photoIds: photos.map(p => p.id),
      photoMatch: photos.map(p => (p.tier === 0 ? 'مطابق' : 'صورة رحلة')),
      copy: { ...post.copy, photo2: undefined }, hashtags: post.hashtags, captions: post.captions
    });

    console.log(`  ${post.localLabel}  ${post.layout.padEnd(11)} "${post.headlineKey.slice(0, 52)}"`);

    // نقطة حفظ: عطل في اليوم ٢٦ يجب ألا يضيّع الأيام ٢٥ السابقة
    results.sort((a, b) => a.day - b.day);
    await savePlan(monthKey, { month: monthKey, timezone: brand.schedule.timezone, postTime: `${String(POST_HOUR).padStart(2, '0')}:00`, generatedAt: new Date().toISOString(), posts: results });
    await saveHistory(history);
  }
});

const plan = { month: monthKey, timezone: brand.schedule.timezone, postTime: `${String(POST_HOUR).padStart(2, '0')}:00`, generatedAt: new Date().toISOString(), posts: results.sort((a, b) => a.day - b.day) };
await savePlan(monthKey, plan);
await saveHistory(history);
await writeReview(monthKey, plan);
console.log(`\nتم: ${results.length}/${slots.length} منشوراً في posts/${monthKey}/ — راجعها في posts/${monthKey}/index.html`);

async function writeReview(monthKey, plan) {
  const esc = s => String(s).replace(/[<&]/g, c => (c === '<' ? '&lt;' : '&amp;'));
  const cards = plan.posts.map(p => `
    <figure>
      <img src="day${String(p.day).padStart(2, '0')}-feed.jpg" loading="lazy" alt="">
      <figcaption><b>${p.localLabel}</b> · ${p.type} · ${p.layout}
        <details><summary>كابشن فيسبوك</summary><pre>${esc(p.captions.facebook)}</pre></details>
        <details><summary>كابشن انستقرام</summary><pre>${esc(p.captions.instagram)}</pre></details>
      </figcaption>
    </figure>`).join('');
  const html = `<!doctype html><html dir="rtl" lang="ar"><meta charset="utf-8"><title>سومادوس ${monthKey}</title>
<style>body{font:14px/1.6 system-ui,sans-serif;background:#0b1416;color:#e6f2f2;margin:0;padding:32px}
h1{font-size:22px;margin:0 0 4px}.sub{color:#8fb3b3;margin-bottom:24px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:20px}
figure{margin:0;background:#112022;border:1px solid #1e3234;border-radius:14px;overflow:hidden}
img{width:100%;display:block}figcaption{padding:12px 14px;font-size:12px;color:#9fc4c4}
figcaption b{color:#00c8c8}pre{white-space:pre-wrap;font-size:11px;color:#8fb3b3;background:#0b1416;padding:10px;border-radius:8px}</style>
<h1>سومادوس — ${monthKey}</h1>
<div class="sub">${plan.posts.length} منشوراً · ${plan.postTime} بتوقيت بغداد · بُنيت ${plan.generatedAt.slice(0, 10)}</div>
<div class="grid">${cards}</div>`;
  await writeFile(path.join(POSTS, monthKey, 'index.html'), html);
}
