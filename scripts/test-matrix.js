const { plan, combinations, VISAS, ROUTES } = require('../src/matrix');
let fail = 0;
const check = (n, ok, x = '') => { console.log(`${ok ? '✅' : '❌'} ${n}${x ? '  ' + x : ''}`); if (!ok) fail++; };

const c = combinations();
console.log(`المصفوفة: ${c.total.toLocaleString('en')} تركيبة (طيران ${c.flight.toLocaleString('en')} · فيزا ${c.visa.toLocaleString('en')})\n`);

const p30 = plan('2026-10-01', 30);
const img = p30.filter(x => x.kind === 'image');
check('منشوران كل يوم', p30.length === 60, `${img.length} صورة + ${p30.length - img.length} ريل`);

const v = img.filter(x => x.market === 'visa');
check('10 فيزا بالشهر، كل دولة مرة', v.length === 10 && new Set(v.map(x => x.subject)).size === 10);

// التغطية والفجوات عبر سنة كاملة — الضمان الحقيقي للمجدول
const year = plan('2026-10-01', 365).filter(x => x.kind === 'image' && x.market === 'flight');
const seen = new Set(year.map(x => x.route));
check('كل الـ22 مسار يظهر خلال سنة', seen.size === ROUTES.length, `${seen.size}/${ROUTES.length}`);

const lastSeen = {}, gaps = {};
year.forEach((x, i) => {
  if (lastSeen[x.route] !== undefined) gaps[x.route] = Math.max(gaps[x.route] || 0, i - lastSeen[x.route]);
  lastSeen[x.route] = i;
});
const worst = Object.entries(gaps).sort((a, b) => b[1] - a[1])[0];
check('أقصى فجوة بين ظهورَي أي مسار ≤ 50 منشور', worst[1] <= 50, `الأسوأ: ${worst[0]} بفجوة ${worst[1]} منشور طيران`);

const p60 = year.slice(0, 41);
// لا تكرار (مسار+مشهد) خلال 30 يوم
let dup = null;
for (let i = 0; i < p60.length; i++)
  for (let j = i + 1; j < Math.min(i + 30, p60.length); j++)
    if (p60[i].route === p60[j].route && p60[i].scene === p60[j].scene)
      dup = `${p60[i].date} و ${p60[j].date}: ${p60[i].route}/${p60[i].scene}`;
check('لا تكرار (مسار+مشهد) خلال 30 يوم', !dup, dup || '');

// لا يتكرر نفس المسار بيومين متتاليين
let adj = null;
for (let i = 1; i < p60.length; i++) if (p60[i].route === p60[i - 1].route) adj = `${p60[i].date}`;
check('لا يتكرر المسار بمنشورين متتاليين', !adj, adj || '');

// الكردي: على أربيل/السليمانية حصراً، ويتناوب
const ku = p60.filter(x => x.lang === 'ku');
const kuMarket = p60.filter(x => ['EBL', 'ISU'].includes(x.from) || ['EBL', 'ISU'].includes(x.to));
check('الكردي على أربيل/السليمانية حصراً',
      ku.every(x => ['EBL', 'ISU'].includes(x.from) || ['EBL', 'ISU'].includes(x.to)),
      `${ku.length} كردي من ${kuMarket.length} منشور كردي-السوق`);
check('التناوب قريب من النصف', Math.abs(ku.length / kuMarket.length - 0.5) < 0.2,
      `${(ku.length / kuMarket.length * 100).toFixed(0)}% كردي`);

// الريل لا ينسخ صورة نفس اليوم
const reels = p30.filter(x => x.kind === 'reel');
check('الريل لا يكرر صورة نفس اليوم',
      reels.every((r, i) => !(r.scene === img[i].scene && r.route === img[i].route)));

const dist = {};
for (const x of p60) dist[x.route] = (dist[x.route] || 0) + 1;
console.log(`\nتوزيع أول ${p60.length} منشور طيران (≈60 يوم):`);
Object.entries(dist).sort((a, b) => b[1] - a[1]).forEach(([k, n]) => {
  const d = ROUTES.find(r => r.name === k).depth;
  console.log(`  ${String(n).padStart(2)} × ${k.padEnd(26)} (عمق ${d})`);
});

console.log('\nعيّنة 5 أيام:');
for (const x of p30.slice(0, 10)) {
  const who = x.market === 'visa' ? `${x.flag} ${x.subject}` : `${x.fromAr} ← ${x.toAr}`;
  console.log(`  ${x.date} ${x.kind === 'image' ? '10:00 صورة' : '19:00 ريل '} │ ${x.lang} │ ${who.padEnd(20)} │ ${x.scene.padEnd(15)} │ ${x.lighting.id}/${x.angle.id}/${x.palette.id} │ ${x.theme.id}`);
}
console.log(fail ? `\n❌ فشل ${fail}` : '\n✅ كل فحوص المصفوفة نجحت');
process.exit(fail ? 1 : 0);
