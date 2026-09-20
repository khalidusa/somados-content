// حساب التوقيت — الخطوة ٢ بترتيب البناء. يُختبر قبل أي شي ثاني.
// بغداد UTC+3 ثابت (ألغى العراق التوقيت الصيفي 2008) وإسطنبول UTC+3 ثابت (تركيا 2016).
// ما نكتب الإزاحة يدوياً — نحسبها من tzdata عبر Intl، فإذا تغيّرت السياسة يوماً النظام يتبعها.

const TZ = 'Asia/Baghdad';

/** إزاحة المنطقة بالدقائق لهذه اللحظة، محسوبة من tzdata لا من ثابت. */
function offsetMinutes(date, tz = TZ) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const p = Object.fromEntries(dtf.formatToParts(date).map(x => [x.type, x.value]));
  const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
  return Math.round((asUTC - date.getTime()) / 60000);
}

/** ساعة محلية ببغداد ليوم معيّن -> لحظة UTC. يحل الإزاحة بتكرارين (يكفي لأي منطقة). */
function baghdadToUTC(ymd, hour, minute = 0) {
  const [y, m, d] = ymd.split('-').map(Number);
  let guess = new Date(Date.UTC(y, m - 1, d, hour, minute));
  for (let i = 0; i < 2; i++) {
    guess = new Date(Date.UTC(y, m - 1, d, hour, minute) - offsetMinutes(guess) * 60000);
  }
  return guess;
}

/** خانتا النشر اليوميتان بتوقيت بغداد. */
const SLOTS = {
  image: { hour: 10, minute: 0, kind: 'image', label: 'صورة الصباح' },
  reel:  { hour: 19, minute: 0, kind: 'reel',  label: 'ريل المساء' },
};

function slotsForDate(ymd) {
  return Object.values(SLOTS).map(s => ({
    ...s,
    localISO: `${ymd}T${String(s.hour).padStart(2, '0')}:${String(s.minute).padStart(2, '0')}:00+03:00`,
    utc: baghdadToUTC(ymd, s.hour, s.minute),
  }));
}

function addDays(ymd, n) {
  const [y, m, d] = ymd.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}

function todayBaghdad() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());
}

module.exports = { TZ, SLOTS, offsetMinutes, baghdadToUTC, slotsForDate, addDays, todayBaghdad };
