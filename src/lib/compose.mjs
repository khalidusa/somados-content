// يحوّل "تركيبة" اليوم إلى كل ما يحتاجه المنشور: القالب، استعلامات الصور،
// النص على الصورة، الكابشن والوسوم. كلها مشتقة من بذرة اليوم، فالإعادة لا تغيّر شيئاً.

import { mulberry32, hashString, pick, shuffle } from './random.mjs';
import { TAGLINES, KICKERS, BADGE_SETS, PASS_META, ARCH_LEADS, FAN_HEADS, FAN_SUBS, VISA_KICKERS, buildHashtags } from './matrix.mjs';

// نصيب كل نوع من الشهر: الوجهة المفردة هي العمود، والبقية تكسر الرتابة.
const TYPE_CYCLE = [
  'destination', 'boarding', 'destination', 'arches',
  'destination', 'visa', 'destination', 'fan',
  'destination', 'boarding', 'destination', 'arches',
  'destination', 'visa', 'boarding'
];

const LAYOUT_OF = { destination: 'destination', boarding: 'boarding', arches: 'arches', fan: 'fan', visa: 'destination' };
export const PHOTOS_NEEDED = { destination: 1, boarding: 1, arches: 3, fan: 5, visa: 1 };

export const typeSequence = (days) => Array.from({ length: days }, (_, i) => TYPE_CYCLE[i % TYPE_CYCLE.length]);

const TR = ['IST', 'ESB', 'AYT', 'SZF'];
const PLANES = ['plane-cut-14.png', 'plane-cut-15.png', null, 'plane-cut-14.png', null, 'plane-cut-15.png'];
const IQ = ['BGW', 'EBL', 'BSR', 'NJF', 'ISU'];

export function buildPost({ monthKey, slot, index, typeIndex = index, type, brand, data, salt = '' }) {
  const rng = mulberry32(hashString(`${monthKey}|${slot.day}|${type}|${salt}`));
  const { destinations, visas, copyAr } = data;
  const b = brand.business;
  const site = b.siteDisplay;
  const layout = LAYOUT_OF[type];

  // ── الوجهة والمسار ───────────────────────────────────────────────
  // نصف الشهر من العراق إلى تركيا، ونصفه بالعكس: جمهورنا على الطرفين.
  const outbound = (index + (salt ? 1 : 0)) % 2 === 0;
  // دوران محدّد لا عشوائي: العشوائية كررت "أنقرة" مرتين في ستة أيام.
  // الدوران يتبع ترتيب النوع لا ترتيب اليوم: مع ترتيب اليوم كانت أيام
  // "الوجهة" كلها زوجية فتتناوب بين مدينتين اثنتين فقط.
  const trCode = TR[typeIndex % TR.length];
  const iqCode = IQ[(typeIndex * 2 + 1) % IQ.length];
  const fromCode = outbound ? iqCode : trCode;
  const toCode = outbound ? trCode : iqCode;
  const from = destinations[fromCode], to = destinations[toCode];

  let queries, copy, captionSeed, cityCode = toCode, visaCountry = null;

  if (type === 'visa') {
    const v = pick(rng, visas);
    visaCountry = v.id;
    cityCode = null;
    queries = data.visaQueries[v.id] ?? ['travel landscape'];
    const pool = copyAr.visa[pick(rng, Object.keys(copyAr.visa))];
    const line = pick(rng, pool);
    const fillVisa = (t) => t
      .replace(/{country}/g, v.country)
      .replace(/{processing}/g, v.processing)
      .replace(/{visaType}/g, v.type);
    captionSeed = { h: fillVisa(line.h), s: fillVisa(line.s) };
    copy = {
      layout, tagline: pick(rng, TAGLINES), kicker: pick(rng, VISA_KICKERS),
      from: 'تأشيرة', to: v.country, latin: '',
      site, badges: pick(rng, BADGE_SETS), whatsapp: b.whatsapp,
      plane: null, noRoute: true, chip: v.badge ? `${v.badge} · متابعة كاملة` : 'متابعة كاملة'
    };
  } else if (type === 'arches') {
    const three = shuffle(rng, outbound ? TR : IQ).slice(0, 3);
    const cities = three.map(c => ({ code: c, ar: destinations[c].ar }));
    cityCode = three[1];
    queries = three.map(c => pick(rng, destinations[c].q));
    const lead = pick(rng, ARCH_LEADS).slice();
    // السطر الأول يجب أن يطابق المدن المعروضة فعلاً، لا الاتجاه المفترض
    if (lead[0] === 'من العراق إلى تركيا') lead[0] = outbound ? 'من العراق إلى تركيا' : 'من تركيا إلى العراق';
    captionSeed = { h: `${lead[0]} — ${cities.map(c => c.ar).join(' · ')}`, s: lead[1] };
    copy = { layout, cities, lead, site, whatsapp: b.whatsapp };
  } else if (type === 'fan') {
    const five = [...shuffle(rng, TR).slice(0, 3), ...shuffle(rng, IQ).slice(0, 2)];
    cityCode = five[0];
    queries = five.map(c => pick(rng, destinations[c].q));
    const head = pick(rng, FAN_HEADS);
    captionSeed = { h: `${head[0]} ${head[1]}`, s: pick(rng, FAN_SUBS) };
    copy = { layout, head, sub: pick(rng, FAN_SUBS), site, whatsapp: b.whatsapp, plane: 'plane-cut-14.png' };
  } else {
    // destination + boarding: نفس المسار، عرضان مختلفان
    queries = [pick(rng, to.q)];
    const family = pick(rng, Object.keys(copyAr.flight));
    const line = pick(rng, copyAr.flight[family]);
    captionSeed = {
      h: line.h.replace('{from}', from.ar).replace('{to}', to.ar),
      s: line.s.replace('{from}', from.ar).replace('{to}', to.ar)
    };
    copy = {
      layout, tagline: pick(rng, TAGLINES), kicker: pick(rng, KICKERS),
      from: from.ar, to: to.ar, latin: to.latin, fromCode, toCode,
      meta: pick(rng, PASS_META), badges: pick(rng, BADGE_SETS), site, whatsapp: b.whatsapp,
      plane: PLANES[index % PLANES.length]
    };
  }

  const hashtags = buildHashtags(rng, copyAr.hashtags, { cityCode, visaCountry, kind: type }, shuffle);
  const captions = buildCaptions({ rng, captionSeed, brand, hashtags, type });
  const comboId = hashString([type, fromCode, toCode, visaCountry, captionSeed.h].join('|')).toString(16);

  return {
    day: slot.day, dueAt: slot.dueAt, localLabel: slot.localLabel,
    type, layout, comboId, queries, photosNeeded: PHOTOS_NEEDED[type],
    copy, hashtags, captions, headlineKey: captionSeed.h
  };
}

function buildCaptions({ rng, captionSeed, brand, hashtags, type }) {
  const b = brand.business;
  const service = pick(rng, brand.services);
  const proof = pick(rng, brand.proofPoints);

  const social = [
    captionSeed.h,
    '',
    captionSeed.s,
    '',
    `✅ ${proof}`,
    type === 'fan' ? `✈️ ${brand.services.map(s => s.name).join(' · ')}` : `✈️ ${service.name} — ${service.blurb}`,
    '',
    `🔗 ${b.siteDisplay}`,
    `📱 واتساب ‎${b.whatsapp}`,
    '',
    hashtags.join(' ')
  ].join('\n').replace(/\n{3,}/g, '\n\n').trim();

  return { social };
}
