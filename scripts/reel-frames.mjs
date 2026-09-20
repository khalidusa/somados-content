#!/usr/bin/env node
// لقطات من كل قالب ريل — للمراجعة قبل أي رندر فيديو.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { withBrowser } from '../src/lib/render.mjs';
import { REELS } from '../src/lib/reel-design.mjs';
import { BENEFITS } from '../src/lib/copy.mjs';
import { ROOT } from '../src/lib/store.mjs';

const b64 = async (rel) => (await readFile(path.join(ROOT, rel))).toString('base64');
const OUT = path.join(ROOT, 'out', 'reels');
await mkdir(OUT, { recursive: true });

const A = await b64('out/pick-ist/04-39554307.jpg');
const I = await b64('out/pick-ist/08-34186766.jpg');
const K = await b64('out/pick-ank/04-29752278.jpg');
const G = await b64('out/pick-ist/05-10661861.jpg');
const site = 'somados.com';
const base = { site, benefits: BENEFITS, label: 'عروض اليوم' };

const plans = [
  ['r1-destination', 'reelDestination', { photo: A, copy: { ...base, from: 'بغداد', to: 'أنطاليا', headline: ['سافر', 'بأنسب سعر'], plane: 'plane-a.png' } }],
  ['r2-pass', 'reelPass', { photo: I, copy: { ...base, label: 'مسار اليوم', from: 'بغداد', to: 'إسطنبول', fromCode: 'BGW', toCode: 'IST', headline: ['احجز رحلتك', 'الآن'], plane: 'plane-d.png' } }],
  ['r3-trio', 'reelTrio', { photos: [G, A, K], copy: { ...base, label: 'وجهات الأسبوع', headline: ['تركيا', 'أقرب مما تظن'], sub: 'من العراق إلى تركيا بمواعيد تناسب يومك.', cities: [{ ar: 'إسطنبول' }, { ar: 'أنطاليا' }, { ar: 'أنقرة' }] } }],
  ['r4-word', 'reelWord', { photo: I, copy: { ...base, from: 'بغداد', to: 'إسطنبول', headline: ['عرض اليوم', 'إلى إسطنبول'], plane: 'plane-c.png' } }]
];

const TIMES = [1.4, 4.2, 8.4];
await withBrowser(async (page) => {
  for (const [name, fn, args] of plans) {
    const html = await REELS[fn](args);
    await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
    await page.goto('about:blank');
    await page.setContent(html, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => new Promise(r => {
      const imgs = [...document.images].filter(i => !i.complete);
      if (!imgs.length) return r();
      let left = imgs.length;
      imgs.forEach(i => { i.onload = i.onerror = () => (--left === 0) && r(); });
    }));
    await page.evaluate(() => window.__seek(9.2));
    const problems = await page.evaluate(() => window.__audit());
    if (problems.length) console.log(`✗ ${name}\n    ` + problems.join('\n    '));
    for (const t of TIMES) {
      await page.evaluate(x => window.__seek(x), t);
      await writeFile(path.join(OUT, `${name}-t${String(t).replace('.', '_')}.jpg`), await page.screenshot({ type: 'jpeg', quality: 88 }));
    }
    if (!problems.length) console.log('✓', name);
  }
});
