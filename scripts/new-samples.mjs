#!/usr/bin/env node
// نموذجان بالهوية الجديدة من صور منزّلة سابقاً — بلا أي طلب شبكة.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { withBrowser, shoot, SIZES } from '../src/lib/render.mjs';
import { destination, boarding, ticket, windowSeat } from '../src/lib/design.mjs';
import { ROOT } from '../src/lib/store.mjs';

const b64 = async (rel) => (await readFile(path.join(ROOT, rel))).toString('base64');
const OUT = path.join(ROOT, 'out', 'new');
await mkdir(OUT, { recursive: true });

const site = 'somados.com';

const samples = [
  ['n1-destination', destination, {
    size: SIZES.feed, photo: await b64('out/pick-ist/04-39554307.jpg'),
    copy: {
      label: 'عروض اليوم', from: 'بغداد', to: 'أنطاليا', site, plane: 'plane-cut-14.png',
      headline: ['سافر', 'بأنسب سعر'], benefits: ['عروض يومية', 'أسعار مخفّضة', 'أفضل خطوط الطيران'],
      photo2: await b64('out/pick-ist/02-37850264.jpg'),
      sub: 'رحلات مباشرة بين بغداد وأنطاليا.'
    }
  }],
  ['n2-boarding', boarding, {
    size: SIZES.feed, photo: await b64('out/pick-ist/05-10661861.jpg'),
    copy: {
      label: 'مسار اليوم', from: 'بغداد', to: 'إسطنبول', fromCode: 'BGW', toCode: 'IST',
      site, plane: 'plane-cut-15.png',
      headline: ['احجز رحلتك', 'الآن'], benefits: ['عروض يومية', 'أسعار مخفّضة', 'أفضل خطوط الطيران'],
      sub: 'أرخص عروض الطيران بين بغداد وإسطنبول.'
    }
  }],
  ['n3-ticket', ticket, {
    size: SIZES.feed, photo: await b64('out/pick-ist/05-29512484.jpg'),
    copy: {
      label: 'وجهة اليوم', from: 'بغداد', to: 'أنطاليا', toCode: 'AYT', site, plane: 'plane-cut-15.png',
      stamp: 'رحلة<br>مباشرة', headline: ['عروض', 'أنطاليا'],
      benefits: ['عروض يومية', 'أسعار مخفّضة', 'أفضل خطوط الطيران']
    }
  }],
  ['n4-window', windowSeat, {
    size: SIZES.feed, photo: await b64('out/pick-ist/08-34186766.jpg'),
    copy: {
      label: 'من نافذتك', from: 'بغداد', to: 'إسطنبول', site, plane: 'plane-cut-15.png',
      headline: ['وجهتك القادمة', 'إسطنبول'],
      benefits: ['عروض يومية', 'أسعار مخفّضة', 'أفضل خطوط الطيران']
    }
  }]
];

await withBrowser(async (page) => {
  for (const [name, fn, args] of samples) {
    const html = await fn(args);
    const { buf, fit } = await shoot(page, html, SIZES.feed);
    await writeFile(path.join(OUT, name + '.jpg'), buf);
    console.log(`${fit.ok ? '✓' : '✗'} ${name}` + (fit.problems?.length ? '\n    ' + fit.problems.join('\n    ') : ''));
  }
});
