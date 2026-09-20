// مصفوفة المحتوى — الخطوة ٣. كل منشور مربوط بمدينة محددة، فما يوجد منشور "سفر عام".
const fs = require('fs');
const path = require('path');
const { addDays } = require('./schedule');

const D = (f) => JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', f), 'utf8'));
const ROUTES = D('routes.json');
const VISAS  = D('visas.json');

// المدن: اللغة سوق، لا تفضيل. أربيل والسليمانية يتناوبان عربي/كردي.
const CITIES = {
  BGW: { ar: 'بغداد',      ku: null,           country: 'iq', scene: 'دجلة عند الغروب، جسر بعيد، نخيل على الضفة' },
  EBL: { ar: 'أربيل',      ku: 'هەولێر',       country: 'iq', scene: 'قلعة أربيل من زاوية منخفضة، حجر قديم بضوء دافئ' },
  BSR: { ar: 'البصرة',     ku: null,           country: 'iq', scene: 'شط العرب، قوارب خشبية، ضوء نهاري' },
  NJF: { ar: 'النجف',      ku: null,           country: 'iq', scene: 'أفق المدينة عند الغسق، نخيل، بلا أي مبنى ديني' },
  KIK: { ar: 'كركوك',      ku: 'کەرکووک',      country: 'iq', scene: 'قلعة كركوك من بعيد، تلال ترابية' },
  ISU: { ar: 'السليمانية', ku: 'سلێمانی',      country: 'iq', scene: 'جبال تحيط بالمدينة، ضباب صباحي' },
  IST: { ar: 'إسطنبول',    ku: 'ئیستەنبوڵ',    country: 'tr', scene: 'البسفور وعبّارة، مآذن بعيدة بالضباب' },
  SAW: { ar: 'إسطنبول',    ku: 'ئیستەنبوڵ',    country: 'tr', scene: 'البسفور وعبّارة، مآذن بعيدة بالضباب' },
  ESB: { ar: 'أنقرة',      ku: 'ئەنقەرە',      country: 'tr', scene: 'تلال المدينة وأحياء متدرجة، ضوء مائل' },
  AYT: { ar: 'أنطاليا',    ku: 'ئەنتالیا',     country: 'tr', scene: 'ساحل فيروزي وصخور، مرسى قديم' },
  SZF: { ar: 'سامسون',     ku: 'سامسون',       country: 'tr', scene: 'ساحل البحر الأسود، خضرة وسماء رمادية فضية' },
};

// المشاهد: كلها إطارات قريبة. أي مشهد يصف الطائرة ككل محذوف بنيوياً —
// شعار شركة الطيران لا يظهر بإطار لا يشمل مكانه (القسم ٥.٢).
const SCENES_TRAVEL = [
  { id: 'window-clouds',   ar: 'إطار نافذة المقصورة البيضاوي وغيوم بيضاء خلفه' },
  { id: 'wingtip',         ar: 'طرف الجناح فقط من النافذة، بلا ذيل ولا هيكل' },
  { id: 'belt-suitcase',   ar: 'حقيبة سفر على سير الأمتعة، لقطة قريبة' },
  { id: 'passport-desk',   ar: 'جواز سفر وبطاقة صعود عامة على طاولة خشبية' },
  { id: 'terminal-dawn',   ar: 'ضوء الفجر عبر زجاج الصالة، مقاعد فارغة' },
  { id: 'coffee-gate',     ar: 'فنجان قهوة على طاولة قرب زجاج البوابة' },
  { id: 'hand-luggage',    ar: 'يد تسحب حقيبة بممر، لقطة منخفضة' },
  { id: 'cabin-aisle',     ar: 'ممر مقصورة فارغ، تفاصيل مساند قريبة' },
  { id: 'seatbelt',        ar: 'تفصيل حزام الأمان أو مسند النافذة، ماكرو' },
  { id: 'stairs-dawn',     ar: 'درج طائرة، الإطار يقطع قبل الهيكل' },
  { id: 'runway-lights',   ar: 'أضواء المدرج ليلاً، عمق ضحل' },
  { id: 'above-clouds',    ar: 'فوق الغيوم من زاوية المقعد، أفق منحنٍ' },
];

const SCENES_VISA = [
  { id: 'passport-macro',  ar: 'ماكرو لصفحة جواز وختم عام، بلا نص مقروء' },
  { id: 'map-detail',      ar: 'تفصيل خريطة ورقية وقلم، عمق ضحل' },
  { id: 'desk-docs',       ar: 'ملف مستندات ونظارة على مكتب، ضوء جانبي' },
  { id: 'landmark',        ar: '__COUNTRY_SCENE__' },
];

const VISA_SCENE = {
  sa: 'كثبان رملية عند الغروب وأفق مدينة حديث بعيد',
  jo: 'صخور وردية بوادٍ ضيق، ضوء مائل',
  eg: 'قارب شراعي على النيل عند الغسق',
  ae: 'أفق ناطحات بالضباب الذهبي من بعيد',
  iq: 'نخيل على ضفة نهر، ضوء دافئ',
  om: 'جبال حجرية وحصن ترابي بعيد',
  id: 'مصاطب أرز خضراء بضباب صباحي',
  cn: 'جبال كارستية وضباب، لقطة واسعة هادئة',
  ge: 'أسطح مدينة قديمة وجبال القوقاز خلفها',
  th: 'شاطئ وقارب طويل، ماء فيروزي',
};

const LIGHTING = [
  { id: 'dawn-gold',  ar: 'ضوء فجر ذهبي خافت' },
  { id: 'clear-day',  ar: 'نهار صافٍ وظلال نظيفة' },
  { id: 'sunset',     ar: 'غروب دافئ وهالة برتقالية' },
  { id: 'blue-night', ar: 'ليل أزرق وأضواء نقطية' },
];

const ANGLES = [
  { id: 'eye',   ar: 'مستوى النظر' },
  { id: 'top',   ar: 'من فوق عمودياً' },
  { id: 'low',   ar: 'زاوية منخفضة' },
  { id: 'macro', ar: 'ماكرو قريب جداً' },
];

const PALETTES = [
  { id: 'teal',    ar: 'تيل مهيمن بلمسة فضية' },
  { id: 'neutral', ar: 'محايد فاتح ورمادي دافئ' },
  { id: 'moody',   ar: 'داكن هادئ وتباين عميق' },
];

// زوايا الرسالة — راقية وغير مستهلكة. لا وعود، لا تعجّب، لا أسعار.
const THEMES_FLIGHT = [
  { id: 'directness', ar: 'قِصَر الطريق: مسار مباشر بلا ترانزيت' },
  { id: 'rhythm',     ar: 'إيقاع الرحلة: مغادرة الصباح والوصول قبل الظهر' },
  { id: 'reason',     ar: 'سبب السفر: دراسة، علاج، عمل، زيارة' },
  { id: 'season',     ar: 'الموسم: طقس الوجهة بهذا الشهر' },
  { id: 'craft',      ar: 'تفصيل مهني: الأمتعة، الوقت بين الرحلتين، اختيار المقعد' },
  { id: 'belonging',  ar: 'العودة: مدينة تنتظر' },
];

const THEMES_VISA = [
  { id: 'clarity',   ar: 'وضوح الإجراء: خطوة بخطوة بلا غموض' },
  { id: 'timing',    ar: 'الوقت: مدة الإنجاز الحقيقية' },
  { id: 'purpose',   ar: 'غرض الزيارة: سياحة أو عمل' },
];


// ── مجدول متسلسل: يضمن التغطية والتباعد. الاختيار المستقل لكل يوم يفشل بالاثنين. ──
const EPOCH = '2026-01-01';
const CYCLE = 40;                                   // 40 خانة طيران ≈ شهران

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function daysBetween(a, b) {
  return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000);
}

const isVisaDay = (ymd) => Number(ymd.slice(8, 10)) % 3 === 0;

/** رقم خانة الطيران منذ الحقبة — ثابت مهما كان تاريخ البدء. */
const _fiCache = new Map();
function flightIndex(ymd) {
  if (_fiCache.has(ymd)) return _fiCache.get(ymd);
  let n = 0;
  const total = daysBetween(EPOCH, ymd);
  for (let i = 0; i < total; i++) if (!isVisaDay(addDays(EPOCH, i))) n++;
  _fiCache.set(ymd, n);
  return n;
}

/**
 * أوراق الدورة: كل مسار مرة واحدة كحد أدنى (تغطية مضمونة)،
 * والخانات الباقية توزّع بجذر العمق (بغداد وأربيل يتصدران بلا ابتلاع الشهر)،
 * ثم تُفرش بالتناوب فالمسار المتكرر يجي متباعداً لا متجاوراً.
 */
function stableHash(str) {
  let h = 2166136261;
  for (const ch of str) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return Math.abs(h);
}

function buildDeck(cycle) {
  const counts = new Map(ROUTES.map(r => [r.name, 1]));           // تغطية: كل مسار مرة على الأقل
  const w = ROUTES.map(r => Math.sqrt(r.depth));                  // ثم الوزن بجذر العمق
  const sum = w.reduce((a, b) => a + b, 0);
  let left = CYCLE - ROUTES.length;
  const quota = ROUTES.map((r, i) => ({ r, exact: left * w[i] / sum }));
  quota.forEach(q => { const f = Math.floor(q.exact); counts.set(q.r.name, counts.get(q.r.name) + f); left -= f; });
  quota.sort((a, b) => (b.exact % 1) - (a.exact % 1));
  for (let i = 0; i < left; i++) counts.set(quota[i].r.name, counts.get(quota[i].r.name) + 1);

  // كل مسار يُرسى على موضع ثابت مشتق من اسمه، فيقع بنفس المكان تقريباً كل دورة.
  // بدون هذا، المسار المفرد يقفز من بداية دورة إلى نهاية التالية وتصير الفجوة ضعف المتوقع.
  const deck = new Array(CYCLE).fill(null);
  const place = (route, pos) => {
    let i = ((pos % CYCLE) + CYCLE) % CYCLE;
    for (let k = 0; k < CYCLE; k++) { const j = (i + k) % CYCLE; if (!deck[j]) { deck[j] = route; return; } }
  };
  const ordered = [...counts.entries()].sort((a, b) => b[1] - a[1]);   // الأكثر تكراراً أولاً
  for (const [name, n] of ordered) {
    const route = ROUTES.find(r => r.name === name);
    const step = CYCLE / n;
    const anchor = stableHash(name + (n > 1 ? '' : ':solo')) % Math.max(1, Math.floor(step));
    for (let k = 0; k < n; k++) place(route, Math.round(anchor + k * step) + (n === 1 ? cycle * 0 : 0));
  }
  for (let i = 0; i < CYCLE; i++) if (!deck[i]) deck[i] = ROUTES[i % ROUTES.length];
  return deck;
}

const _deckCache = new Map();
function deckFor(cycle) {
  if (!_deckCache.has(cycle)) _deckCache.set(cycle, buildDeck(cycle));
  return _deckCache.get(cycle);
}

/** كم مرة استُخدم هذا المسار قبل هذه الخانة — يحرّك مؤشر المشهد فما يتكرر مشهد لنفس المسار. */
function routeUseCount(routeName, fi) {
  let n = 0;
  for (let i = 0; i <= fi; i++) {
    const d = deckFor(Math.floor(i / CYCLE))[i % CYCLE];
    if (d.name === routeName) n++;
  }
  return n;
}

const pick = (arr, n) => arr[((n % arr.length) + arr.length) % arr.length];

function planDay(ymd, seqIndex) {
  const dayNum = Number(ymd.slice(8, 10));

  if (isVisaDay(ymd)) {
    const vIdx = Math.floor(dayNum / 3) - 1;
    const v = VISAS[vIdx % VISAS.length];
    const monthIdx = Number(ymd.slice(0, 4)) * 12 + Number(ymd.slice(5, 7));
    const sc = pick(SCENES_VISA, vIdx + monthIdx);            // مشهد مختلف لنفس الدولة كل شهر
    return {
      date: ymd, market: 'visa', lang: 'ar',
      subject: v.country, subjectId: v.id, flag: v.flag,
      visaType: v.type, processing: v.processing,
      scene: sc.id,
      sceneAr: sc.ar === '__COUNTRY_SCENE__' ? VISA_SCENE[v.id] : sc.ar,
      lighting: pick(LIGHTING, vIdx + monthIdx * 3),
      angle: pick(ANGLES, vIdx * 3 + monthIdx),
      palette: pick(PALETTES, vIdx + monthIdx * 2),
      theme: pick(THEMES_VISA, vIdx + monthIdx),
    };
  }

  const fi = flightIndex(ymd);
  const r = deckFor(Math.floor(fi / CYCLE))[fi % CYCLE];
  const from = CITIES[r.from], to = CITIES[r.to];
  const kurdishMarket = ['EBL', 'ISU'].includes(r.from) || ['EBL', 'ISU'].includes(r.to);

  const use = routeUseCount(r.name, fi);                       // 1, 2, 3... لهذا المسار
  const lang = kurdishMarket && use % 2 === 0 ? 'ku' : 'ar';   // يتناوب عربي/كردي لكل مسار كردي

  // 13 مشهد لكل مسار (12 عام + مشهد الوجهة) — المؤشر يتقدم كل استخدام، فلا تكرار قبل 13 مرة
  const scenes = [...SCENES_TRAVEL, { id: `city-${r.to}`, ar: to.scene }];
  const sc = scenes[(use - 1) % scenes.length];

  return {
    date: ymd, market: 'flight', lang,
    route: r.name, from: r.from, to: r.to,
    fromAr: from.ar, toAr: to.ar,
    fromKu: from.ku || from.ar, toKu: to.ku || to.ar,
    audience: to.country === 'iq' ? 'العراقيون بتركيا' : 'المسافرون من العراق',
    scene: sc.id, sceneAr: sc.ar,
    lighting: pick(LIGHTING, fi),                              // خطوات غير متزامنة فما تدور الحزم سوية
    angle: pick(ANGLES, fi * 3 + 1),
    palette: pick(PALETTES, fi * 2),
    theme: pick(THEMES_FLIGHT, fi * 5),
  };
}

/** خطة N يوم. الريل يعيد استخدام صورة يوم يبعد 14 يوماً (القسم ٥.٤ — كلفة صفر وبلا تكرار بنفس اليوم). */
function plan(startYmd, days) {
  const out = [];
  for (let i = 0; i < days; i++) {
    const ymd = addDays(startYmd, i);
    out.push({ ...planDay(ymd, i), slot: 'image', kind: 'image' });
    const src = addDays(ymd, -14);
    out.push({ ...planDay(src, i - 14), slot: 'reel', kind: 'reel', date: ymd, reuseImageFrom: src });
  }
  return out;
}

function combinations() {
  const flight = ROUTES.length * (SCENES_TRAVEL.length + 1) * LIGHTING.length * ANGLES.length * PALETTES.length * THEMES_FLIGHT.length;
  const visa = VISAS.length * SCENES_VISA.length * LIGHTING.length * ANGLES.length * PALETTES.length * THEMES_VISA.length;
  return { flight, visa, total: flight + visa };
}

module.exports = { plan, planDay, combinations, isVisaDay, deckFor, CYCLE, ROUTES, VISAS, CITIES, SCENES_TRAVEL, SCENES_VISA, LIGHTING, ANGLES, PALETTES, THEMES_FLIGHT, THEMES_VISA };
