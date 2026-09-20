const { plan } = require('../src/matrix');
const { buildCopy, assertClean, COOLDOWN_DAYS } = require('../src/copy');
let fail = 0;
const check = (n, ok, x = '') => { console.log(`${ok ? '✅' : '❌'} ${n}${x ? '  ' + x : ''}`); if (!ok) fail++; };

const posts = buildCopy(plan('2026-10-01', 180).filter(p => p.kind === 'image'));
console.log(`${posts.length} منشور صورة على 180 يوم\n`);

// ١) حارس الأسعار والهواتف
let clean = true, err = '';
for (const p of posts) { try { assertClean(p); } catch (e) { clean = false; err = e.message; break; } }
check('لا سعر ولا رقم هاتف بأي نص', clean, err);

// ٢) فحص مضاد: الحارس يمسك فعلاً لو تسرب سعر
let caught = false;
try { assertClean({ date: 'x', headline: 'تذكرة بـ 150 دولار' }); } catch { caught = true; }
check('الحارس يمسك سعراً مزروعاً (ضابط موجب)', caught);
caught = false;
try { assertClean({ date: 'x', headline: 'اتصل على +964 770 000 0000' }); } catch { caught = true; }
check('الحارس يمسك رقم هاتف مزروع', caught);

// ٣) فترة التبريد: لا يتكرر (قالب+موضوع) خلال 120 يوم
const byKey = {};
let violation = null;
for (const p of posts) {
  const prev = byKey[p.templateKey];
  if (prev) {
    const gap = Math.round((Date.parse(p.date) - Date.parse(prev)) / 86400000);
    if (gap < COOLDOWN_DAYS) violation = `${p.templateKey}: ${prev} ثم ${p.date} (${gap} يوم)`;
  }
  byKey[p.templateKey] = p.date;
}
check(`لا تكرار (قالب+موضوع) خلال ${COOLDOWN_DAYS} يوم`, !violation, violation || '');

// ٤) الهاشتاكات 10–12 وبلا تكرار داخلها
const bad = posts.filter(p => p.hashtags.length < 10 || p.hashtags.length > 12
  || new Set(p.hashtags).size !== p.hashtags.length);
check('الهاشتاكات 10–12 بلا تكرار', bad.length === 0,
      bad.length ? `${bad.length} منشور مخالف، مثال: ${bad[0].date} (${bad[0].hashtags.length})` : '');

// ٥) طول الكابشن ضمن حد انستغرام
const tooLong = posts.filter(p => (p.captionIG + ' ' + p.hashtags.join(' ')).length > 2200);
check('الكابشن تحت 2200 حرف', tooLong.length === 0);

// ٦) لا عنصر نائب غير مستبدل
const ph = posts.filter(p => /\{\w+\}/.test(p.headline + p.sub + p.caption));
check('كل العناصر النائبة مستبدلة', ph.length === 0, ph.length ? ph[0].headline : '');

// ٧) الكردي يظهر بالمنشورات الكردية فقط
const kuPosts = posts.filter(p => p.lang === 'ku');
check('منشورات كردية موجودة', kuPosts.length > 0, `${kuPosts.length} منشور`);

console.log('\nعيّنة:');
for (const p of [posts[0], posts.find(x => x.lang === 'ku'), posts.find(x => x.market === 'visa')]) {
  console.log(`\n── ${p.date} · ${p.lang} · ${p.market} · ${p.theme.id}`);
  console.log(`   ${p.headline}`);
  console.log(`   ${p.sub}`);
  console.log(`   ${p.hashtags.join(' ')}`);
}
console.log(fail ? `\n❌ فشل ${fail}` : '\n✅ كل فحوص النصوص نجحت');
process.exit(fail ? 1 : 0);
