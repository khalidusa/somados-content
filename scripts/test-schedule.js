const { offsetMinutes, slotsForDate, addDays, todayBaghdad } = require('../src/schedule');

let fail = 0;
const check = (name, ok, extra = '') => { console.log(`${ok ? '✅' : '❌'} ${name}${extra ? '  ' + extra : ''}`); if (!ok) fail++; };

// ١) امسح سنتين يوماً بيوم وابحث عن أي انتقال توقيت فعلي
let d = '2026-01-01', offsets = new Set(), transitions = [], prev = null;
for (let i = 0; i < 730; i++) {
  const o = offsetMinutes(new Date(`${d}T12:00:00Z`));
  offsets.add(o);
  if (prev !== null && o !== prev) transitions.push(`${d}: ${prev / 60}h -> ${o / 60}h`);
  prev = o; d = addDays(d, 1);
}
check('بغداد بلا توقيت صيفي عبر سنتين', offsets.size === 1 && [...offsets][0] === 180,
      `الإزاحات: ${[...offsets].map(o => o / 60 + 'h').join(', ')} | انتقالات: ${transitions.length}`);

// ٢) أيام الانتقال الصيفي الأوروبية — لازم تمر بلا أثر علينا
for (const day of ['2026-03-29', '2026-10-25', '2027-03-28']) {
  const s = slotsForDate(day);
  const img = s.find(x => x.kind === 'image').utc.toISOString().slice(11, 16);
  const reel = s.find(x => x.kind === 'reel').utc.toISOString().slice(11, 16);
  check(`${day} — يوم انتقال أوروبي`, img === '07:00' && reel === '16:00', `صورة ${img}Z · ريل ${reel}Z`);
}

// ٣) إسطنبول = بغداد
const istOff = (iso) => offsetMinutes(new Date(iso), 'Europe/Istanbul');
check('إسطنبول تطابق بغداد شتاءً وصيفاً',
      istOff('2026-01-15T12:00:00Z') === 180 && istOff('2026-07-15T12:00:00Z') === 180);

const t = todayBaghdad();
console.log(`\nاليوم ببغداد: ${t}`);
for (const x of slotsForDate(t)) console.log(`  ${x.label}: ${x.localISO}  ->  ${x.utc.toISOString()}`);

console.log(fail ? `\n❌ فشل ${fail}` : '\n✅ كل فحوص التوقيت نجحت');
process.exit(fail ? 1 : 0);
