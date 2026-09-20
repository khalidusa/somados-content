// يحوّل يوماً في التقويم إلى منشور كامل: القالب، استعلامات الصور، النص على
// الصورة، والكابشن لكل منصة. كله مشتق من بذرة اليوم فالإعادة لا تغيّر شيئاً.

import { mulberry32, hashString, pick, shuffle } from './random.mjs';
import { HEADLINES, SUBS, BENEFITS, SERVICES, STAMPS, LABELS, fill, fillPair } from './copy.mjs';

/** القوالب التي اختارها خالد، مرتّبة كي لا تتجاور الأشكال المتشابهة.
 *  تسعة وعشرون قالباً = شهر كامل بلا تكرار شكل واحد. */
export const ROTATION = [
  'arches', 'glass', 'wave', 'passover', 'mosaic', 'sheet', 'duo', 'postertype', 'glasspanel', 'blob',
  'fan', 'lowerthird', 'polaroids', 'prism', 'halfdome', 'medallion', 'columns', 'banner', 'stack', 'duotone',
  'diagonal', 'inset', 'quad', 'postcard', 'roundtrip', 'glassduo', 'grid', 'viewfinder', 'bigcircle'
];

/** ما يحتاجه كل قالب. cityLabels: اسم مدينة يجلس فوق صورتها — تلك الحالة
 *  تُقصر على الوجهات التركية لأن تغطية الصور للمدن العراقية ضعيفة،
 *  والمدينة العراقية تبقى في شارة المسار كنص. */
const SPEC = {
  arches:     { photos: 3, family: 'multi',       cityLabels: 3 },
  polaroids:  { photos: 3, family: 'multi',       cityLabels: 3 },
  quad:       { photos: 4, family: 'multi',       badge: true },
  duo:        { photos: 2, family: 'destination', cityLabels: 2 },
  mosaic:     { photos: 3, family: 'multi' },
  columns:    { photos: 3, family: 'multi' },
  fan:        { photos: 5, family: 'service',     services: true },
  grid:       { photos: 3, family: 'service' },
  glass:      { photos: 1, family: 'offer',       plane: true },
  glassduo:   { photos: 1, family: 'offer',       plane: true },
  glasspanel: { photos: 1, family: 'offer',       plane: true },
  sheet:      { photos: 1, family: 'offer',       plane: true },
  lowerthird: { photos: 1, family: 'offer',       plane: true },
  banner:     { photos: 1, family: 'offer',       plane: true },
  halfdome:   { photos: 1, family: 'offer',       plane: true },
  diagonal:   { photos: 1, family: 'destination', plane: true },
  wave:       { photos: 1, family: 'destination', plane: true },
  bigcircle:  { photos: 1, family: 'destination', plane: true },
  duotone:    { photos: 1, family: 'offer',       plane: true },
  postertype: { photos: 1, family: 'offer',       plane: true },
  medallion:  { photos: 1, family: 'destination' },
  inset:      { photos: 1, family: 'destination' },
  blob:       { photos: 1, family: 'destination' },
  prism:      { photos: 1, family: 'offer' },
  viewfinder: { photos: 1, family: 'offer' },
  stack:      { photos: 2, family: 'offer' },
  postcard:   { photos: 2, family: 'destination', stamp: true },
  roundtrip:  { photos: 1, family: 'offer',       codes: true },
  passover:   { photos: 1, family: 'offer',       codes: true, plane: true }
};

const TR = ['IST', 'ESB', 'AYT', 'SZF'];
const IQ = ['BGW', 'EBL', 'BSR', 'NJF', 'ISU', 'KIK'];
const PLANES = ['plane-a.png', 'plane-b.png', 'plane-c.png', 'plane-d.png'];

export const photosNeededFor = (layout) => SPEC[layout]?.photos ?? 1;

export function buildPost({ monthKey, slot, index, brand, data, salt = '' }) {
  const layout = ROTATION[index % ROTATION.length];
  const spec = SPEC[layout];
  const rng = mulberry32(hashString(`${monthKey}|${slot.day}|${layout}|${salt}`));
  const { destinations } = data;
  const b = brand.business;
  const site = b.siteDisplay;

  // نصف الشهر من العراق إلى تركيا ونصفه بالعكس: الجمهور على الطرفين
  const outbound = index % 2 === 0;
  const trCode = TR[index % TR.length];
  const iqCode = IQ[(index * 5 + 1) % IQ.length];
  const fromCode = outbound ? iqCode : trCode;
  const toCode = outbound ? trCode : iqCode;
  const from = destinations[fromCode], to = destinations[toCode];

  // المدن أولاً ثم النص: بناء العنوان قبل اختيار المدن كان يُنتج عنواناً
  // يقول "من أربيل إلى أنطاليا" فوق صورتين لمدينتين تركيتين.
  let cities = null, queries = [];
  if (spec.cityLabels) {
    const chosen = shuffle(rng, TR).slice(0, spec.cityLabels);
    cities = chosen.map(c => ({ code: c, ar: destinations[c].ar }));
    queries = chosen.map(c => pick(rng, destinations[c].q));
  } else if (spec.photos > 1) {
    const poolCities = shuffle(rng, [...TR, ...(outbound ? [] : IQ.slice(0, 2))]).slice(0, spec.photos);
    while (poolCities.length < spec.photos) poolCities.push(TR[poolCities.length % TR.length]);
    queries = poolCities.map(c => pick(rng, destinations[c].q));
  } else {
    queries = [pick(rng, to.q)];
  }

  // duo يعرض اسمَي مدينتيه فوق صورتيهما، فالمسار المعروض هو هما لا مسار اليوم
  const V = (spec.cityLabels === 2 && cities)
    ? { from: cities[0].ar, to: cities[1].ar }
    : { from: from.ar, to: to.ar };

  const headline = fillPair(pick(rng, HEADLINES[spec.family]), V);
  const subFamily = spec.family === 'service' ? 'service' : spec.family === 'multi' ? 'multi' : 'route';
  const sub = fill(pick(rng, SUBS[subFamily]), V);

  const copy = {
    site, label: pick(rng, LABELS), benefits: BENEFITS,
    from: V.from, to: V.to, fromCode, toCode, latin: to.latin,
    headline, sub,
    ...(spec.plane ? { plane: PLANES[index % PLANES.length] } : {}),
    ...(spec.services ? { services: SERVICES } : {}),
    ...(spec.stamp ? { stamp: pick(rng, STAMPS) } : {}),
    ...(spec.badge ? { badge: 'تركيا', badgeSub: 'وجهات مختارة' } : {}),
    ...(layout === 'marquee' ? { ribbon: 'عروض يومية' } : {}),
    ...(layout === 'sidebar' ? { railText: 'عروض الطيران' } : {})
  };

  if (cities) {
    copy.cities = cities;
    // بديل جاهز لكل موقع: إن لم تكن للمدينة صورة مطابقة نستبدل المدينة نفسها،
    // لأن صورة سماء تحت اسم "إسطنبول" كذبة صغيرة يراها الزبون.
    copy.cityPool = shuffle(rng, TR).map(code => ({ code, ar: destinations[code].ar, queries: destinations[code].q }));
  }
  if (layout === 'postcard') copy.photo2Needed = true;

  const hashtags = buildHashtags(rng, data.copyAr.hashtags, toCode, fromCode);
  const captions = buildCaptions({ rng, brand, headline, sub, hashtags, layout, spec, V });
  const headlineKey = headline.join(' ') + ' | ' + V.from + '→' + V.to;
  const comboId = hashString([layout, fromCode, toCode, headlineKey].join('|')).toString(16);

  return {
    day: slot.day, dueAt: slot.dueAt, localLabel: slot.localLabel,
    layout, comboId, queries, photosNeeded: spec.photos, cityLabels: !!spec.cityLabels,
    copy, hashtags, captions, headlineKey
  };
}

function buildHashtags(rng, tags, toCode, fromCode) {
  const out = [
    ...shuffle(rng, tags.market).slice(0, 2),
    ...shuffle(rng, tags.core).slice(0, 4),
    ...(tags.city[toCode] ?? []), ...(tags.city[fromCode] ?? []),
    ...tags.brand
  ];
  return [...new Set(out)];
}

/** كابشن لكل منصة: فيسبوك يجعل الرابط قابلاً للنقر داخل النص،
 *  وانستقرام لا يقبل رابطاً في الفيد فيُحال إلى البايو. */
function buildCaptions({ rng, brand, headline, sub, hashtags, spec, V }) {
  const b = brand.business;
  const service = pick(rng, brand.services);
  const proof = pick(rng, brand.proofPoints);
  const hook = headline.join(' ');

  const core = [
    hook,
    '',
    sub,
    '',
    `✅ ${proof}`,
    spec.family === 'service'
      ? `✈️ ${brand.services.map(s => s.name).join(' · ')}`
      : `✈️ ${service.name} — ${service.blurb}`,
    '',
    '💳 فيزا · ماستركارد · آبل باي · زيل · تحويل · كاش',
    '💱 الدفع بالليرة التركية · الدولار · الدينار العراقي'
  ].join('\n');

  const facebook = [core, '', `🔗 احجز الآن: ${b.website}`, '', hashtags.join(' ')]
    .join('\n').replace(/\n{3,}/g, '\n\n').trim();

  const instagram = [core, '', '🔗 الرابط في البايو', '', hashtags.join(' ')]
    .join('\n').replace(/\n{3,}/g, '\n\n').trim();

  return { facebook, instagram, social: facebook };
}
