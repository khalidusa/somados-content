#!/usr/bin/env node
// عشرة قوالب بنفس المحتوى — للاختيار بالرقم. بلا أي طلب شبكة.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { withBrowser, shoot, SIZES } from '../src/lib/render.mjs';
import { LAYOUTS } from '../src/lib/design.mjs';
import { ROOT } from '../src/lib/store.mjs';

const b64 = async (rel) => (await readFile(path.join(ROOT, rel))).toString('base64');
const OUT = path.join(ROOT, 'out', 'ten');
await mkdir(OUT, { recursive: true });

const A = await b64('out/pick-ist/04-39554307.jpg');   // أنطاليا جوية
const A2 = await b64('out/pick-ist/02-37850264.jpg');  // أنطاليا سطوح
const A3 = await b64('out/pick-ist/05-29512484.jpg');  // كيمر
const I = await b64('out/pick-ist/05-10661861.jpg');   // غلطة
const I2 = await b64('out/pick-ist/08-34186766.jpg');  // أفق إسطنبول
const I3 = await b64('out/pick-ist/03-37651645.jpg');  // برج الفتاة

const site = 'somados.com';
const BEN = ['عروض يومية', 'أسعار مخفّضة', 'أفضل خطوط الطيران'];
const base = { site, from: 'بغداد', to: 'إسطنبول', benefits: BEN, label: 'عروض اليوم' };

const plans = [
  ['01-arch',      'destination', [I2], { ...base, headline: ['سافر', 'بأنسب سعر'], sub: 'رحلات مباشرة بين بغداد وإسطنبول.', plane: 'plane-c.png', photo2: I3 }],
  ['02-boarding',  'boarding',    [I],  { ...base, fromCode: 'BGW', toCode: 'IST', headline: ['احجز رحلتك', 'الآن'], sub: 'أرخص عروض الطيران بين بغداد وإسطنبول.', plane: 'plane-d.png', label: 'مسار اليوم' }],
  ['03-arches',    'arches',      [A, I2, A3], { ...base, headline: ['وجهات', 'هذا الأسبوع'], sub: 'من العراق إلى تركيا، بمواعيد تناسب يومك.',
                                                 cities: [{ ar: 'أنطاليا', code: 'AYT' }, { ar: 'إسطنبول', code: 'IST' }, { ar: 'أنقرة', code: 'ESB' }], chips: BEN }],
  ['04-fan',       'fan',         [A, I2, A3, I3, A2], { ...base, headline: ['رحلتك كاملة', 'بترتيب واحد'], sub: 'تذاكر · فنادق · تأشيرات · إقامة تركية',
                                                 services: ['تذاكر', 'فنادق', 'تأشيرات', 'إقامة'], plane: 'plane-b.png' }],
  ['05-ticket',    'ticket',      [A],  { ...base, to: 'أنطاليا', toCode: 'AYT', headline: ['عروض', 'أنطاليا'], stamp: 'رحلة<br>مباشرة', plane: 'plane-d.png', label: 'وجهة اليوم' }],
  ['06-window',    'windowSeat',  [I2], { ...base, headline: ['وجهتك القادمة', 'إسطنبول'], plane: 'plane-a.png', label: 'من نافذتك' }],
  ['07-diagonal',  'diagonal',    [A3], { ...base, to: 'أنطاليا', headline: ['طيران مباشر', 'بلا تعب'], plane: 'plane-c.png' }],
  ['08-grid',      'grid',        [I2, A, I3], { ...base, headline: ['اختر وجهتك', 'ونحن نرتّب'], sub: 'تذاكر وفنادق وتأشيرات في طلب واحد.' }],
  ['09-routemap',  'routemap',    [I3, A],  { ...base, to: 'أنطاليا', headline: ['من بغداد', 'إلى كل تركيا'], plane: 'plane-a.png' }],
  ['10-overlay',   'overlay',     [I],  { ...base, headline: ['سافر', 'بأنسب سعر'], plane: 'plane-d.png' }]
];

let bad = 0;
await withBrowser(async (page) => {
  for (const [name, layout, photos, copy] of plans) {
    const fn = LAYOUTS[layout];
    const html = await fn({ size: SIZES.feed, photo: photos[0], photos, copy });
    const { buf, fit } = await shoot(page, html, SIZES.feed);
    await writeFile(path.join(OUT, name + '.jpg'), buf);
    if (fit.ok) console.log(`✓ ${name}`);
    else { bad++; console.log(`✗ ${name}\n    ` + (fit.problems ?? []).join('\n    ')); }
  }
});
console.log(bad ? `\n${bad} قالباً يحتاج ضبطاً` : '\nالعشرة كلها نظيفة');
