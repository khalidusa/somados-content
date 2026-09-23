// تحويل التوقيت المحلي (بغداد) إلى لحظة UTC حقيقية.
// العراق ألغى التوقيت الصيفي سنة 2008، لكن الحساب يمر عبر Intl على أي حال
// حتى لا ينكسر الجدول لو عاد يوماً ما.

const TZ = 'Asia/Baghdad';

function tzOffsetMs(date, tz = TZ) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
  const p = Object.fromEntries(dtf.formatToParts(date).map(x => [x.type, x.value]));
  const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
  return date.getTime() - asUTC;
}

/** الساعة كذا بتوقيت بغداد في يوم معيّن → لحظة UTC */
export function baghdadWallTimeToUtc(year, month, day, hour = 10, minute = 0) {
  const naive = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  let offset = tzOffsetMs(new Date(naive));
  let ts = naive + offset;
  const settled = tzOffsetMs(new Date(ts));
  if (settled !== offset) ts = naive + settled;
  return new Date(ts);
}

/** Buffer يطلب ISO 8601 بـUTC وبأجزاء الثانية: 2026-10-01T07:00:00.000Z */
export const toBufferDueAt = (date) => date.toISOString().replace(/\.\d{3}Z$/, '.000Z');

export const daysInMonth = (year, month) => new Date(Date.UTC(year, month, 0)).getUTCDate();

/** الشهر المستهدف: الشهر القادم افتراضياً، أو MONTH=YYYY-MM */
export function targetMonth(override = process.env.MONTH) {
  if (override && /^\d{4}-\d{2}$/.test(override)) {
    const [y, m] = override.split('-').map(Number);
    return { year: y, month: m, key: override };
  }
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth() + 2;
  const year = m > 12 ? y + 1 : y;
  const month = m > 12 ? m - 12 : m;
  return { year, month, key: `${year}-${String(month).padStart(2, '0')}` };
}

/**
 * كل مواعيد الشهر. hours يقبل رقماً واحداً أو قائمة (مثلاً [10, 15])،
 * فيخرج لكل يوم موعد لكل ساعة، مرتّبة زمنياً.
 * slotId يميّز الموعد داخل اليوم — اليوم وحده لم يعد مفتاحاً كافياً.
 */
export function monthSlots(year, month, hours = [10]) {
  const list = Array.isArray(hours) ? [...hours].sort((a, b) => a - b) : [hours];
  const out = [];
  for (let d = 1; d <= daysInMonth(year, month); d++) {
    for (const hour of list) {
      const at = baghdadWallTimeToUtc(year, month, d, hour);
      out.push({
        day: d,
        hour,
        slotId: `${d}@${hour}`,
        weekday: new Date(Date.UTC(year, month - 1, d, 12)).getUTCDay(),
        dueAt: toBufferDueAt(at),
        localLabel: `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')} ${String(hour).padStart(2, '0')}:00 بغداد`
      });
    }
  }
  return out.sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt));
}
