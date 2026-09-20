// اختيار الموسيقى. القاعدة الحرجة (القسم ٥.٤): فشل القياس ليس دليلاً على قِصَر الملف —
// نُبقي المقطع ونطبع سبب الفشل، ولا نرفض إلا إذا قِيس الطول فعلاً وكان أقصر.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const DIR = path.join(__dirname, '..', 'assets', 'music');

function probeDuration(file) {
  try {
    const out = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
      '-of', 'default=nw=1:nk=1', file], { encoding: 'utf8' }).trim();
    const d = parseFloat(out);
    return Number.isFinite(d) && d > 0 ? { duration: d, measured: true } : { duration: null, measured: false, reason: `ffprobe أرجع «${out}»` };
  } catch (e) {
    return { duration: null, measured: false, reason: (e.message || '').split('\n')[0] };
  }
}

function catalog(reelSeconds = 10) {
  if (!fs.existsSync(DIR)) return { usable: [], skipped: [], unmeasured: [] };
  const need = reelSeconds + 0.5;                 // -shortest يحدد الطول بأقصر مُدخل
  const files = fs.readdirSync(DIR).filter(f => /\.mp3$/i.test(f)).sort();
  const usable = [], skipped = [], unmeasured = [];
  for (const f of files) {
    const p = path.join(DIR, f);
    const r = probeDuration(p);
    if (r.measured && r.duration < need) { skipped.push({ file: f, duration: r.duration }); continue; }
    if (!r.measured) unmeasured.push({ file: f, reason: r.reason });   // يُبقى لا يُرفض
    usable.push({ file: f, path: p, duration: r.duration });
  }
  return { usable, skipped, unmeasured };
}

/** مقطع ثابت لكل تاريخ، ولا يتكرر بيومين متتاليين. */
function pickTrack(dateYmd, usable) {
  if (!usable.length) return null;
  const n = Number(dateYmd.replace(/-/g, ''));
  return usable[n % usable.length];
}

module.exports = { catalog, pickTrack, probeDuration, DIR };
