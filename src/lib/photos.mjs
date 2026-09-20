// مصدر الصور: Pexels — صور حقيقية للمدن، رخصة تجارية بلا نسب إجباري.
// لماذا لا نولّد المدن بالذكاء الاصطناعي: معالم مثل برج غلطة وقلعة أربيل
// تخرج مشوّهة، والمسافر العراقي يعرف مدينته. النموذج يبقى للخلفيات المجرّدة فقط.

const API = 'https://api.pexels.com/v1';

function key() {
  if (!process.env.PEXELS_API_KEY) throw new Error('PEXELS_API_KEY غير موجود — شغّل: npm run doctor');
  return process.env.PEXELS_API_KEY;
}

// حدود Pexels: 200 طلب في الساعة و20,000 في الشهر. شهر كامل يحتاج ~40 بحثاً
// بفضل التخزين داخل التشغيل، لكن العدّاد يحمينا من تشغيل متكرر بلا انتباه.
let calls = 0;
const HOURLY_SOFT_LIMIT = Number(process.env.PEXELS_SOFT_LIMIT || 150);
export const pexelsCalls = () => calls;

async function api(url, tries = 3) {
  if (++calls > HOURLY_SOFT_LIMIT) throw new Error(`تجاوزنا ${HOURLY_SOFT_LIMIT} طلب بحث في هذا التشغيل — توقف حمايةً لحصة Pexels`);
  await new Promise(r => setTimeout(r, 400));          // فاصل بسيط بين الطلبات
  let last;
  for (let i = 0; i < tries; i++) {
    if (i) await new Promise(r => setTimeout(r, 1200 * 2 ** (i - 1)));
    const r = await fetch(url, { headers: { Authorization: key() } });
    if (r.status === 429) { last = new Error('Pexels 429'); await new Promise(r2 => setTimeout(r2, 8000)); continue; }
    if (!r.ok) { last = new Error(`Pexels ${r.status}: ${(await r.text()).slice(0, 120)}`); continue; }
    return r.json();
  }
  throw last;
}

export const searchPhotos = (q, page = 1, per = 60) =>
  api(`${API}/search?query=${encodeURIComponent(q)}&orientation=portrait&size=large&per_page=${per}&page=${page}`);

// كلمات ترفض الصورة من عنوانها وحده — قبل أي تنزيل.
// الوجوه والحشود والأعلام تجعل الإعلان يبدو صورة أخبار لا إعلان سفر.
const ALT_BLOCK = /\b(people|person|persons|individual|man|woman|women|men|boy|girl|child|kid|tourist|selfie|portrait|posing|poses|model|fashion|outfit|wearing|jacket|sunglasses|smiling|standing|sitting|young|crowd|festival|flag|protest|soldier|military|war|ruins?|sign|text|poster|billboard|logo|banner|menu|newspaper|hand|hands|holding|fruit|food|plate|closeup|close-up|macro|animal|cat|dog|bird|hotel room|interior)\b/i;

export function metaFilter(p) {
  const long = Math.max(p.width, p.height);
  const ratio = p.width / p.height;
  if (long < 2000) return `دقة ${long} أقل من 2000`;
  if (ratio > 1.05) return `نسبة ${ratio.toFixed(2)} — القص إلى 4:5 يضيّع الكثير`;
  if (ALT_BLOCK.test(p.alt || '')) return `العنوان يحوي: ${(p.alt.match(ALT_BLOCK) || [])[0]}`;
  return null;
}

/** كل الصور الصالحة لمجموعة استعلامات، مرتبة عشوائياً بالبذرة نفسها. */
export async function pool(queries, { perQuery = 40, pages = 2 } = {}) {
  const out = [];
  for (const q of queries) {
    const photos = [];
    for (let page = 1; page <= pages; page++) {
      try {
        const res = await searchPhotos(q, page, perQuery);
        photos.push(...(res.photos ?? []));
        if ((res.photos ?? []).length < perQuery) break;      // لا صفحة تالية
      } catch (e) { console.warn(`  تعذّر البحث عن "${q}": ${e.message}`); break; }
    }
    for (const p of photos) {
      if (metaFilter(p)) continue;
      // الصلة: صورة وصفها يذكر اسم المكان أقرب للمدينة من صورة عامة بالبحث نفسه
      const head = q.split(' ')[0].toLowerCase();
      const relevant = (p.alt || '').toLowerCase().includes(head) ? 1 : 0;
      out.push({ id: p.id, query: q, alt: p.alt, photographer: p.photographer, relevant, url: p.src.large2x || p.src.original });
    }
  }
  return out.sort((a, b) => b.relevant - a.relevant);
}

/** ينزّل الصورة ويعيدها base64 — بحجم يكفي 1080×1350 بلا إسراف. */
export async function download(photo) {
  const r = await fetch(photo.url);
  if (!r.ok) throw new Error(`تنزيل الصورة فشل: ${r.status}`);
  return Buffer.from(await r.arrayBuffer()).toString('base64');
}

/**
 * فحص الصورة نفسها لا وصفها: الصور الليلية والمعتمة تجعل الإعلان يبدو
 * ثقيلاً — وهو بالضبط ما رفضه خالد سابقاً. والصور المسطّحة بلا تباين
 * تبتلع النص الأبيض فوقها.
 */
export async function photoQuality(page, imageB64) {
  await page.goto('about:blank');
  await page.setContent('<body></body>');
  return await page.evaluate(async (b64) => {
    const img = new Image();
    img.src = 'data:image/jpeg;base64,' + b64;
    await img.decode();
    const W = 64, H = 80;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(img, 0, 0, W, H);
    const d = x.getImageData(0, 0, W, H).data;
    let sum = 0, sum2 = 0, dark = 0, sat = 0;
    const n = W * H;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i + 1], b = d[i + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      sum += lum; sum2 += lum * lum;
      if (lum < 55) dark++;
      sat += (Math.max(r, g, b) - Math.min(r, g, b));
    }
    const mean = sum / n;
    const sd = Math.sqrt(Math.max(0, sum2 / n - mean * mean));
    return { mean, sd, darkRatio: dark / n, saturation: sat / n };
  }, imageB64);
}

/**
 * حدود مختارة على صور حقيقية: أقل منها والإعلان يخرج ليلياً أو باهتاً.
 * sky=true لصور الرحلة (سحاب، جناح، مدرج): السماء منخفضة التشبّع بطبيعتها،
 * وحدّ المدن كان يرفضها كلها فتتحول أيام كاملة إلى فجوات في التقويم.
 */
export function qualityReject(q, { sky = false } = {}) {
  if (q.mean < (sky ? 80 : 92)) return `الصورة معتمة (متوسط الإضاءة ${q.mean.toFixed(0)})`;
  if (q.darkRatio > (sky ? 0.5 : 0.42)) return `${Math.round(q.darkRatio * 100)}% من الصورة أسود`;
  if (q.sd < (sky ? 14 : 28)) return `تباين ضعيف (${q.sd.toFixed(0)})`;
  if (q.saturation < (sky ? 5 : 20)) return `صورة باهتة (تشبّع ${q.saturation.toFixed(0)})`;
  return null;
}
