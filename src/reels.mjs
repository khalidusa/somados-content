#!/usr/bin/env node
// ريلز الشهر: صورة الوجهة نفسها تتحرك ١٠ ثوانٍ بموسيقى حرّة.
// يعمل منفصلاً عن خط الصور فلا يُعطّل أحدهما الآخر.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { loadEnv } from './lib/env.mjs';
import { withBrowser } from './lib/render.mjs';
import { reel as reelHTML } from './lib/design.mjs';
import { renderReel, musicTracks, REEL } from './lib/video.mjs';
import { buildPost } from './lib/compose.mjs';
import { monthSlots, targetMonth } from './lib/schedule.mjs';
import { pool, download, photoQuality, qualityReject } from './lib/photos.mjs';
import { photoHash, hammingDistance } from './lib/render.mjs';
import { ROOT, POSTS, loadJson, loadHistory, saveHistory, loadPlan, savePlan, findIncompleteMonth } from './lib/store.mjs';

await loadEnv();
const brand = await loadJson('brand.json');
const data = {
  destinations: await loadJson('data/destinations.json'),
  visas: await loadJson('data/visas.json'),
  copyAr: await loadJson('data/copy.ar.json'),
  visaQueries: (await loadJson('data/queries.json')).visas
};
const REEL_HOUR = Number(process.env.REEL_HOUR || brand.schedule.reelHour);
const force = process.argv.includes('--force');
const limitArg = process.argv.find(a => a.startsWith('--limit='));
const limit = limitArg ? Number(limitArg.split('=')[1]) : Infinity;

let { year, month, key: baseKey } = targetMonth();
if (!process.env.MONTH) {
  const pending = await findIncompleteMonth('-reels');
  if (pending) { ({ year, month } = pending); baseKey = pending.key.replace('-reels', ''); }
  else {
    const now = new Date();
    const curKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
    const remaining = monthSlots(now.getUTCFullYear(), now.getUTCMonth() + 1, REEL_HOUR).filter(s => new Date(s.dueAt).getTime() > Date.now()).length;
    if (remaining >= 3 && !(await loadPlan(`${curKey}-reels`))) { year = now.getUTCFullYear(); month = now.getUTCMonth() + 1; baseKey = curKey; }
  }
}

const planKey = `${baseKey}-reels`;
const allSlots = monthSlots(year, month, REEL_HOUR);
const slots = allSlots.filter(s => new Date(s.dueAt).getTime() > Date.now() + 20 * 60 * 1000);
const existing = await loadPlan(planKey);
if (existing && existing.posts.length >= slots.length && !force) {
  console.log(`${planKey} مكتمل (${existing.posts.length} ريلاً). لا شيء لعمله.`);
  process.exit(0);
}

const tracks = await musicTracks();
if (!tracks.length) { console.error('لا موسيقى في assets/music'); process.exit(1); }
console.log(`${tracks.length} مقطع موسيقى صالح · ${slots.length} ريلاً الساعة ${REEL_HOUR}:00 بغداد`);

const done = force ? new Map() : new Map((existing?.posts ?? []).map(p => [p.day, p]));
const history = await loadHistory();
history.photoIds ??= {};

// نعيد استخدام صور خطة الصور نفسها بإزاحة: نفس اليوم لا يُعرض مرتين،
// ولا نستهلك بحثاً جديداً بلا داعٍ.
const imagePlan = await loadPlan(baseKey);
const reusable = (imagePlan?.posts ?? []).filter(p => p.layout === 'destination' && p.images?.photos?.length === 1);

const outDir = path.join(POSTS, planKey);
await mkdir(outDir, { recursive: true });
const workDir = path.join(ROOT, '.tmp-reel');
await mkdir(workDir, { recursive: true });

const results = [...done.values()];
const todo = slots.filter(s => !done.has(s.day)).slice(0, limit);
const poolCache = new Map();

await withBrowser(async (page) => {
  for (const [i, slot] of todo.entries()) {
    const dayId = String(slot.day).padStart(2, '0');
    const post = buildPost({ monthKey: planKey, slot, index: i, typeIndex: i, type: 'destination', brand, data, salt: 'reel' });

    // الصورة: من خطة الصور بإزاحة، وإلا بحث جديد
    let photoB64 = null, photoRel = null, credit = null;
    const borrow = reusable[(slot.day + 7) % (reusable.length || 1)];
    if (borrow && borrow.day !== slot.day) {
      photoB64 = (await readFile(path.join(ROOT, borrow.images.photos[0]))).toString('base64');
      photoRel = borrow.images.photos[0];
      post.copy.to = borrow.copy.to; post.copy.latin = borrow.copy.latin;
      post.copy.from = borrow.copy.from;
      post.captions = borrow.captions;
      post.headlineKey = borrow.copy.to + '|reel|' + slot.day;
    } else {
      const q = post.queries[0];
      if (!poolCache.has(q)) poolCache.set(q, await pool([q]));
      for (const cand of poolCache.get(q)) {
        if (history.photoIds[cand.id]) continue;
        const b64 = await download(cand).catch(() => null);
        if (!b64) continue;
        if (qualityReject(await photoQuality(page, b64))) continue;
        const h = await photoHash(page, b64);
        if (history.hashes.find(p => hammingDistance(p.hash, h) < 10)) continue;
        photoB64 = b64; credit = cand.photographer;
        photoRel = `posts/${planKey}/day${dayId}-photo.jpg`;
        await writeFile(path.join(ROOT, photoRel), Buffer.from(b64, 'base64'));
        history.photoIds[cand.id] = `${planKey}/day${dayId}`;
        history.hashes.push({ hash: h, ref: `${planKey}/day${dayId}` });
        break;
      }
    }
    if (!photoB64) { console.warn(`  اليوم ${dayId}: لا صورة صالحة — نتخطّاه`); continue; }

    const copy = {
      kicker: `من ${post.copy.from} إلى ${post.copy.to}`,
      to: post.copy.to, latin: post.copy.latin,
      badges: post.copy.badges, site: post.copy.site, whatsapp: post.copy.whatsapp
    };
    const html = await reelHTML({ photo: photoB64, copy, duration: REEL.duration });

    const relVideo = `posts/${planKey}/day${dayId}.mp4`;
    const relCover = `posts/${planKey}/day${dayId}-cover.jpg`;
    const track = tracks[(slot.day + 3) % tracks.length];
    await renderReel(page, {
      html, musicFile: track,
      outPath: path.join(ROOT, relVideo),
      coverPath: path.join(ROOT, relCover),
      workDir
    });

    results.push({
      day: slot.day, dueAt: slot.dueAt, localLabel: slot.localLabel, kind: 'reel',
      layout: 'reel', video: relVideo, cover: relCover, photo: photoRel, music: track,
      credit, copy, hashtags: post.hashtags, captions: post.captions
    });
    console.log(`  ${slot.localLabel}  ريل ${copy.to}  · ${track.slice(0, 28)}`);

    results.sort((a, b) => a.day - b.day);
    await savePlan(planKey, { month: planKey, timezone: brand.schedule.timezone, postTime: `${String(REEL_HOUR).padStart(2, '0')}:00`, generatedAt: new Date().toISOString(), posts: results });
    await saveHistory(history);
  }
});

await savePlan(planKey, { month: planKey, timezone: brand.schedule.timezone, postTime: `${String(REEL_HOUR).padStart(2, '0')}:00`, generatedAt: new Date().toISOString(), posts: results.sort((a, b) => a.day - b.day) });
await saveHistory(history);
console.log(`\nتم: ${results.length}/${slots.length} ريلاً في posts/${planKey}/`);
