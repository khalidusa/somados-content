#!/usr/bin/env node
// يبني منشوراً لكل قالب في الدورة ويرسمه: يكشف أي حقل ناقص قبل التشغيل الحقيقي.
import { writeFile, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { loadEnv } from '../src/lib/env.mjs';
import { withBrowser, shoot, SIZES } from '../src/lib/render.mjs';
import { buildPostHTML } from '../src/lib/design.mjs';
import { buildPost, ROTATION } from '../src/lib/compose.mjs';
import { monthSlots } from '../src/lib/schedule.mjs';
import { ROOT, loadJson } from '../src/lib/store.mjs';

await loadEnv();
const brand = await loadJson('brand.json');
const data = {
  destinations: await loadJson('data/destinations.json'),
  visas: await loadJson('data/visas.json'),
  copyAr: await loadJson('data/copy.ar.json'),
  visaQueries: (await loadJson('data/queries.json')).visas
};
const OUT = path.join(ROOT, 'out', 'rotation');
await mkdir(OUT, { recursive: true });

// صور جاهزة من المخزون — الفحص هنا للتخطيط لا للصور
const stock = [];
for (const f of ['out/pick-ist/04-39554307.jpg','out/pick-ist/08-34186766.jpg','out/pick-ank/04-29752278.jpg',
                 'out/pick-ist/05-29512484.jpg','out/pick-ist/03-37651645.jpg'])
  stock.push((await readFile(path.join(ROOT, f))).toString('base64'));

const slots = monthSlots(2026, 11, 10);
let bad = 0;
await withBrowser(async (page) => {
  for (const [i, layout] of ROTATION.entries()) {
    const post = buildPost({ monthKey: 'check', slot: slots[i], index: i, brand, data });
    const photos = Array.from({ length: post.photosNeeded }, (_, k) => stock[k % stock.length]);
    if (post.copy.photo2Needed) post.copy.photo2 = photos[1] ?? photos[0];
    try {
      const html = await buildPostHTML({ layout: post.layout, size: SIZES.feed, photos, copy: post.copy });
      const { buf, fit } = await shoot(page, html, SIZES.feed);
      await writeFile(path.join(OUT, `${String(i + 1).padStart(2, '0')}-${layout}.jpg`), buf);
      if (fit.ok) console.log(`✓ ${layout}`);
      else { bad++; console.log(`✗ ${layout}: ${(fit.problems ?? []).join(' · ')}`); }
    } catch (e) {
      bad++; console.log(`✗ ${layout}: ${e.message}`);
    }
  }
});
console.log(bad ? `\n${bad} قالباً يحتاج إصلاحاً` : '\nكل قوالب الدورة تعمل بالنص الحقيقي');
