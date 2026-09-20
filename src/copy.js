// محرك النصوص — عنوان وسطر فرعي للصورة، وكابشن وهاشتاكات للمنشور.
// لا أسعار ولا أرقام هاتف: ممنوعة بحارس بنيوي آخر الملف، لا بالاعتماد على الانتباه.
const fs = require('fs');
const path = require('path');

const AR = require('../data/copy.ar.json');
const KU = require('../data/copy.ku.json');
const LOG = path.join(__dirname, '..', 'data', 'headline-log.json');

const COOLDOWN_DAYS = 120;   // القسم ٧ — العناوين تُسجَّل بتاريخها ولا تتكرر قبل 120 يوم
const SITE = 'somados.com';

const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);

function loadLedger() {
  try { return JSON.parse(fs.readFileSync(LOG, 'utf8')); } catch { return {}; }
}
function saveLedger(l) { fs.writeFileSync(LOG, JSON.stringify(l, null, 2)); }

function fill(tpl, post) {
  const L = post.lang === 'ku';
  return tpl
    .replace(/\{from\}/g, L ? post.fromKu : post.fromAr)
    .replace(/\{to\}/g, L ? post.toKu : post.toAr)
    .replace(/\{country\}/g, post.subject || '')
    .replace(/\{visaType\}/g, post.visaType || '')
    .replace(/\{processing\}/g, post.processing || '');
}

/** يختار قالباً لم يُستخدم لنفس الموضوع خلال 120 يوم. إن استُهلكت كلها، يأخذ الأقدم. */
function pickTemplate(post, ledger) {
  const bank = post.lang === 'ku' ? KU : AR;
  const group = post.market === 'visa' ? bank.visa : bank.flight;
  const themeId = post.theme.id;
  const list = group[themeId] || group[Object.keys(group)[0]];
  const subject = post.market === 'visa' ? post.subjectId : post.route;

  const keys = list.map((_, i) => `${post.lang}:${post.market}:${themeId}:${i}|${subject}`);
  const fresh = [];
  for (let i = 0; i < keys.length; i++) {
    const last = ledger[keys[i]];
    if (!last || daysBetween(last, post.date) >= COOLDOWN_DAYS) fresh.push(i);
  }
  let idx;
  if (fresh.length) {
    // دوران ثابت داخل المتاح — نفس التاريخ يعطي نفس النتيجة دائماً
    const d = Number(post.date.slice(8, 10)) + Number(post.date.slice(5, 7)) * 31;
    idx = fresh[d % fresh.length];
  } else {
    idx = keys.map((k, i) => [i, ledger[k]]).sort((a, b) => Date.parse(a[1]) - Date.parse(b[1]))[0][0];
  }
  return { tpl: list[idx], key: keys[idx] };
}

function hashtags(post) {
  const bank = (post.lang === 'ku' ? KU : AR).hashtags;
  const ar = AR.hashtags;
  const out = [];
  const push = (arr, n, offset = 0) => {
    if (!arr) return;
    for (let i = 0; i < n && i < arr.length; i++) out.push(arr[(i + offset) % arr.length]);
  };
  const rot = Number(post.date.slice(8, 10));

  if (post.market === 'visa') {
    push(ar.visaCountry[post.subjectId], 2);
    push(ar.visa, 3, rot);
    push(ar.core, 3, rot);
    push(ar.market, 2, rot);
    push(ar.brand, 1);
  } else {
    push(bank.city?.[post.from] || ar.city[post.from], 1);
    push(bank.city?.[post.to] || ar.city[post.to], 2);
    push(bank.market || ar.market, 2, rot);
    push(bank.core || ar.core, 4, rot);
    push(bank.brand || ar.brand, 2);
  }
  return [...new Set(out)].slice(0, 12);
}

function caption(post, headline, sub) {
  const L = post.lang === 'ku';
  const cta = L ? `وردەکاری و حیجزکردن: ${SITE}` : `التفاصيل والحجز: ${SITE}`;
  const igNote = L ? 'بەستەرەکە لە بایۆدایە.' : 'الرابط في البايو.';
  const tags = hashtags(post).join(' ');
  return { text: `${headline}\n\n${sub}\n\n${cta}`, igText: `${headline}\n\n${sub}\n\n${cta}\n${igNote}`, tags };
}

/** يبني نصوص خطة كاملة ويحدّث سجل العناوين. */
function buildCopy(plan, { commit = false } = {}) {
  const ledger = loadLedger();
  const out = plan.map(post => {
    const { tpl, key } = pickTemplate(post, ledger);
    const headline = fill(tpl.h, post);
    const sub = fill(tpl.s, post);
    ledger[key] = post.date;
    const c = caption(post, headline, sub);
    return { ...post, headline, sub, templateKey: key, caption: c.text, captionIG: c.igText, hashtags: c.tags.split(' ') };
  });
  if (commit) saveLedger(ledger);
  return out;
}

// ── حارس بنيوي: لا سعر ولا هاتف يمر، مهما كتب أحد بالقوالب ──
const PRICE = /(\$|USD|دولار|د\.ع|IQD|₺|TRY|ليرة)\s*\d|\d+\s*(\$|USD|دولار|د\.ع|IQD|₺|ليرة)|سعر\s*\d|ابتداء[ًا]?\s*من\s*\d/i;
const PHONE = /(\+?\d[\d\s\-()]{7,})/;

function assertClean(post) {
  const fields = [post.headline, post.sub, post.caption, post.captionIG].filter(Boolean);
  for (const f of fields) {
    if (PRICE.test(f)) throw new Error(`سعر بالنص (${post.date}): ${f}`);
    if (PHONE.test(f)) throw new Error(`رقم هاتف بالنص (${post.date}): ${f}`);
  }
  return true;
}

module.exports = { buildCopy, assertClean, hashtags, COOLDOWN_DAYS, loadLedger, saveLedger, PRICE, PHONE };
