#!/usr/bin/env node
// كل القوالب بنصوص النظام الجديد — للاختيار بالرقم. بلا طلبات شبكة.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { withBrowser, shoot, SIZES } from '../src/lib/render.mjs';
import { LAYOUTS } from '../src/lib/design.mjs';
import { HEADLINES, SUBS, BENEFITS, SERVICES, STAMPS, LABELS, fill, fillPair } from '../src/lib/copy.mjs';
import { ROOT } from '../src/lib/store.mjs';

const b64 = async (rel) => (await readFile(path.join(ROOT, rel))).toString('base64');
const OUT = path.join(ROOT, 'out', 'gallery16');
await mkdir(OUT, { recursive: true });

const A = await b64('out/pick-ist/04-39554307.jpg');
const A2 = await b64('out/pick-ist/02-37850264.jpg');
const A3 = await b64('out/pick-ist/05-29512484.jpg');
const I = await b64('out/pick-ist/05-10661861.jpg');
const I2 = await b64('out/pick-ist/08-34186766.jpg');
const I3 = await b64('out/pick-ist/03-37651645.jpg');
const K  = await b64('out/pick-ank/04-29752278.jpg');   // أنقرة — أنيتكابير، مدينة داخلية بلا بحر
const K2 = await b64('out/pick-ank/02-34393148.jpg');

const V = { from: 'بغداد', to: 'إسطنبول' };
const VA = { from: 'بغداد', to: 'أنطاليا' };
const site = 'somados.com';
const b = (v, extra = {}) => ({ site, from: v.from, to: v.to, benefits: BENEFITS, label: LABELS[0], ...extra });

const plans = [
  ['01-arch', 'destination', [I2], b(V, { headline: fillPair(HEADLINES.offer[0], V), sub: fill(SUBS.route[0], V), plane: 'plane-c.png', photo2: I3 })],
  ['02-boarding', 'boarding', [I], b(V, { fromCode: 'BGW', toCode: 'IST', label: LABELS[2], headline: fillPair(HEADLINES.offer[1], V), sub: fill(SUBS.route[2], V), plane: 'plane-d.png' })],
  ['03-arches', 'arches', [A, I2, K], b(V, { headline: fillPair(HEADLINES.multi[0], V), sub: SUBS.multi[0], chips: BENEFITS,
      cities: [{ ar: 'أنطاليا', code: 'AYT' }, { ar: 'إسطنبول', code: 'IST' }, { ar: 'أنقرة', code: 'ESB' }] })],
  ['04-fan', 'fan', [A, I2, A3, I3, A2], b(V, { headline: fillPair(HEADLINES.service[0], V), sub: SUBS.service[0], services: SERVICES, plane: 'plane-b.png' })],
  ['05-ticket', 'ticket', [A], b(VA, { label: LABELS[1], toCode: 'AYT', headline: fillPair(HEADLINES.offer[2], VA), stamp: STAMPS[0], plane: 'plane-d.png' })],
  ['06-window', 'windowSeat', [I2], b(V, { label: 'من نافذتك', headline: fillPair(HEADLINES.destination[0], V), plane: 'plane-a.png' })],
  ['07-diagonal', 'diagonal', [A3], b(VA, { headline: fillPair(HEADLINES.destination[2], VA), plane: 'plane-c.png' })],
  ['08-grid', 'grid', [I2, A, I3], b(V, { headline: fillPair(HEADLINES.service[2], V), sub: SUBS.service[0] })],
  ['09-routemap', 'routemap', [I3, A], b({ from: 'إسطنبول', to: 'أنطاليا' }, { headline: fillPair(HEADLINES.destination[3], { from: 'إسطنبول', to: 'أنطاليا' }), plane: 'plane-a.png' })],
  ['10-overlay', 'overlay', [I], b(V, { headline: fillPair(HEADLINES.offer[0], V), plane: 'plane-d.png' })],
  ['11-split', 'split', [A], b(VA, { headline: fillPair(HEADLINES.offer[3], VA), sub: fill(SUBS.route[3], VA), plane: 'plane-a.png' })],
  ['12-panorama', 'panorama', [I2], b(V, { headline: fillPair(HEADLINES.offer[4], V), sub: fill(SUBS.route[1], V), plane: 'plane-c.png' })],
  ['13-polaroids', 'polaroids', [A, I, K], b(V, { headline: fillPair(HEADLINES.multi[2], V), sub: SUBS.multi[2],
      cities: [{ ar: 'أنطاليا' }, { ar: 'إسطنبول' }, { ar: 'أنقرة' }] })],
  ['14-quad', 'quad', [I2, A, K, I3], b(V, { headline: fillPair(HEADLINES.multi[1], V), badge: 'تركيا', badgeSub: 'أربع وجهات' })],
  ['15-wave', 'wave', [A], b(VA, { headline: fillPair(HEADLINES.destination[1], VA), sub: fill(SUBS.route[0], VA), plane: 'plane-d.png' })],
  ['16-passport', 'passport', [I], b(V, { label: 'ختم الدخول', headline: fillPair(HEADLINES.offer[1], V), stamp: STAMPS[1] })],
  ['17-sidebar', 'sidebar', [A], b(VA, { railText: 'عروض الطيران', headline: fillPair(HEADLINES.offer[0], VA), sub: fill(SUBS.route[1], VA), plane: 'plane-a.png' })],
  ['18-bigcircle', 'bigcircle', [I2], b(V, { headline: fillPair(HEADLINES.destination[2], V), sub: fill(SUBS.route[0], V), plane: 'plane-d.png' })],
  ['19-mosaic', 'mosaic', [A, I3, K2], b(V, { headline: fillPair(HEADLINES.multi[1], V), sub: SUBS.multi[1] })],
  ['20-postertype', 'postertype', [I2], b(V, { label: 'وجهة اليوم', headline: fillPair(HEADLINES.offer[1], V), sub: fill(SUBS.route[2], V), plane: 'plane-c.png' })],
  ['21-filmstrip', 'filmstrip', [A, I2, K, I3], b(V, { headline: fillPair(HEADLINES.multi[2], V), sub: SUBS.multi[2] })],
  ['22-board', 'board', [I2], b(V, { headline: fillPair(HEADLINES.offer[1], V),
      rows: [{ city: 'إسطنبول', when: 'يومياً', status: 'متاح' }, { city: 'أنطاليا', when: 'يومياً', status: 'متاح' }, { city: 'أنقرة', when: 'أسبوعياً', status: 'متاح' }] })],
  ['23-stack', 'stack', [A, I2], b(VA, { headline: fillPair(HEADLINES.offer[3], VA), sub: fill(SUBS.route[3], VA) })],
  ['25-glass', 'glass', [A], b(VA, { headline: fillPair(HEADLINES.offer[0], VA), sub: fill(SUBS.route[0], VA), plane: 'plane-d.png' })],
  ['26-prism', 'prism', [I2], b(V, { headline: fillPair(HEADLINES.offer[1], V) })],
  ['27-postcard', 'postcard', [A], b(VA, { label: 'بطاقة من أنطاليا', headline: fillPair(HEADLINES.destination[1], VA), sub: fill(SUBS.route[3], VA), photo2: A3 })],
  ['28-marquee', 'marquee', [I2], b(V, { ribbon: 'عروض يومية', headline: fillPair(HEADLINES.offer[4], V), sub: fill(SUBS.route[1], V) })],
  ['29-topo', 'topo', [K2, A], b({ from: 'أنقرة', to: 'أنطاليا' }, { headline: fillPair(HEADLINES.destination[3], { from: 'أنقرة', to: 'أنطاليا' }), sub: SUBS.multi[0] })],
  ['30-columns', 'columns', [A, I2, K], b(V, { headline: fillPair(HEADLINES.multi[1], V) })],
  ['31-blob', 'blob', [A3], b(VA, { headline: fillPair(HEADLINES.destination[0], VA) })],
  ['32-roundtrip', 'roundtrip', [I], b(V, { fromCode: 'BGW', toCode: 'IST', headline: fillPair(HEADLINES.offer[1], V), sub: fill(SUBS.route[2], V) })],
  ['33-viewfinder', 'viewfinder', [I2], b(V, { label: 'وجهة اليوم', headline: fillPair(HEADLINES.offer[0], V) })],
  ['34-halfdome', 'halfdome', [A], b(VA, { headline: fillPair(HEADLINES.offer[2], VA), sub: fill(SUBS.route[0], VA), plane: 'plane-c.png' })],
  ['24-duo', 'duo', [I3, A], b({ from: 'إسطنبول', to: 'أنطاليا' }, { headline: fillPair(HEADLINES.destination[3], { from: 'إسطنبول', to: 'أنطاليا' }) })]
];

let bad = 0;
await withBrowser(async (page) => {
  for (const [name, layout, photos, copy] of plans) {
    const html = await LAYOUTS[layout]({ size: SIZES.feed, photo: photos[0], photos, copy });
    const { buf, fit } = await shoot(page, html, SIZES.feed);
    await writeFile(path.join(OUT, name + '.jpg'), buf);
    if (fit.ok) console.log(`✓ ${name}`);
    else { bad++; console.log(`✗ ${name}\n    ` + (fit.problems ?? []).join('\n    ')); }
  }
});
console.log(bad ? `\n${bad} يحتاج ضبطاً` : '\nالكل نظيف');
