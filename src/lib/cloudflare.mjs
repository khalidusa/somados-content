// Workers AI عبر عدة حسابات مجانية بالتناوب.
// كل حساب مجاني يعطي ١٠٬٠٠٠ نيورون يومياً تُصفَّر 00:00 UTC. بدل أن يتوقف
// اليوم كله عند نفاد الحصة، ننتقل إلى الحساب التالي ونكمل.
//
// التوكنات تُقرأ من CF_ACCOUNT_ID/CF_API_TOKEN ثم _2 .. _9.
// لا تُطبع أي قيمة في السجل — يُعرض رقم الحساب فقط.

// تسعير Cloudflare: 0.011$ لكل 1000 نيورون.
//   FLUX schnell 1024×1024 بأربع خطوات ≈ 59 نيورون
//   Leonardo lucid-origin ≈ 1200 نيورون (مقدّر من احتراق 22 ألفاً في يوم سابق)
//   حارس الرؤية ≈ 12 نيوروناً للصورة الواحدة بعد تصغيرها
export const COST = { art: 1200, flux: 59, vision: 12 };
// سقف نفرضه على أنفسنا دون الـ10,000 المجانية: الفارق وسادة أمان لو كان
// التقدير أقل من الواقع. خمسة حسابات × 8500 = 42,500 نيوروناً يومياً.
export const PER_ACCOUNT_BUDGET = Number(process.env.NEURON_BUDGET || 8500);
const FREE_DAILY = 10000;

const MODELS = {
  art: '@cf/leonardo/lucid-origin',          // مشاهد ورسومات
  flux: '@cf/black-forest-labs/flux-1-schnell',
  vision: '@cf/meta/llama-3.2-11b-vision-instruct'
};

export class AllAccountsExhausted extends Error {
  constructor() { super('نفدت حصة كل حسابات Cloudflare اليوم'); this.name = 'AllAccountsExhausted'; }
}

// دفتر الحصة: يوم UTC → معرّف مختصر للحساب → نيورونات مصروفة.
// يُحفظ على القرص فلا تُنسى الحصة بين تشغيل وآخر في اليوم نفسه.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { DATA } from './store.mjs';

const LEDGER = path.join(DATA, 'neurons.json');
const utcDay = () => new Date().toISOString().slice(0, 10);
const shortId = (id) => createHash('sha1').update(id).digest('hex').slice(0, 8);   // لا نكتب المعرّف الحقيقي في ملف يُرفع

function readLedger() {
  try { return JSON.parse(readFileSync(LEDGER, 'utf8')); } catch { return {}; }
}
function writeLedger(l) {
  try { mkdirSync(DATA, { recursive: true }); writeFileSync(LEDGER, JSON.stringify(l, null, 2) + '\n'); } catch { /* القرص للقراءة فقط في بعض البيئات */ }
}

export function spentToday(accountId) {
  return readLedger()[utcDay()]?.[shortId(accountId)] ?? 0;
}

export function charge(accountId, neurons) {
  const l = readLedger();
  const day = utcDay();
  l[day] ??= {};
  l[day][shortId(accountId)] = (l[day][shortId(accountId)] ?? 0) + neurons;
  // احتفظ بآخر ١٤ يوماً فقط
  for (const k of Object.keys(l)) if (k < new Date(Date.now() - 14 * 864e5).toISOString().slice(0, 10)) delete l[k];
  writeLedger(l);
  return l[day][shortId(accountId)];
}

/** تقرير اليوم: كم صُرف من كل حساب وكم بقي. */
export function usageReport() {
  return accounts().map(a => {
    const used = spentToday(a.id);
    return { account: a.label, used, budget: PER_ACCOUNT_BUDGET, left: Math.max(0, PER_ACCOUNT_BUDGET - used), free: FREE_DAILY };
  });
}

export function accounts() {
  const out = [];
  for (const suffix of ['', '_2', '_3', '_4', '_5', '_6', '_7', '_8', '_9']) {
    const id = process.env[`CF_ACCOUNT_ID${suffix}`];
    const token = process.env[`CF_API_TOKEN${suffix}`];
    if (id && token) out.push({ id, token, label: suffix ? `حساب${suffix}` : 'حساب1', spent: 0, dead: false });
  }
  return out;
}

let pool = null;
let cursor = 0;
export function resetPool() { pool = null; cursor = 0; }
export const poolStatus = () => (pool ?? []).map(a => ({ account: a.label, neurons: a.spent, dead: a.dead }));

/** يجرّب الحسابات بالترتيب؛ 429 أو رسالة الحصة تُخرج الحساب لبقية التشغيل. */
async function run(model, body, { charge: charge_ = 0 } = {}) {
  pool ??= accounts();
  if (!pool.length) throw new Error('لا توجد توكنات Cloudflare — أضفها إلى .env');

  for (let tried = 0; tried < pool.length; tried++) {
    const acc = pool[(cursor + tried) % pool.length];
    if (acc.dead) continue;
    if (spentToday(acc.id) + charge_ >= PER_ACCOUNT_BUDGET) continue;   // الفحص قبل الطلب لا بعده

    const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${acc.id}/ai/run/${model}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${acc.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (res.status === 429 || res.status === 402) {
      acc.dead = true;
      console.log(`  ${acc.label}: نفدت حصته — ننتقل للتالي`);
      continue;
    }
    if (!res.ok) {
      const text = (await res.text()).slice(0, 200);
      if (/quota|limit|capacity/i.test(text)) { acc.dead = true; console.log(`  ${acc.label}: ${text.slice(0, 80)}`); continue; }
      throw new Error(`Cloudflare ${res.status}: ${text}`);
    }

    acc.spent += charge_;
    if (charge_) charge(acc.id, charge_);
    cursor = (cursor + tried) % pool.length;       // ابقَ على الحساب الشغّال
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('json')) return { json: await res.json(), account: acc.label };
    return { bytes: Buffer.from(await res.arrayBuffer()), account: acc.label };
  }
  throw new AllAccountsExhausted();
}

/** صورة → base64. تُستعمل للخلفيات والرسومات، لا لصور المدن الحقيقية. */
export async function generateArt(prompt, { negative, width = 1080, height = 1350, model = MODELS.art } = {}) {
  const r = await run(model, { prompt, ...(negative ? { negative_prompt: negative } : {}), width, height }, { charge: COST.art });
  if (r.bytes) return r.bytes.toString('base64');
  const img = r.json?.result?.image;
  if (!img) throw new Error('رد Cloudflare بلا صورة');
  return img;
}

/** حارس النص: يرفض أي صورة مولّدة فيها حروف — النص كله يُطبع في Chromium. */
const QUESTIONS = [
  'Answer YES if EITHER is true: (a) the image contains legible written letters, words, numbers, a sign or a logo; ' +
  'or (b) one or more people are prominent in the foreground. Otherwise answer NO. Answer with exactly one word: YES or NO.',
  'Is a human being the main subject of this photograph? Answer with exactly one word: YES or NO.'
];

/** فحصان لا واحد: السؤال المركّب يمرّر أحياناً صورة أزياء، والسؤال المباشر يمسكها. */
export async function hasVisibleText(imageB64, { retries = 1, strict = false } = {}) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const r = await visionOnce(imageB64, QUESTIONS[0]);
    if (r.checked) return r;
    if (r.checked) return r;
    if (attempt < retries) await new Promise(res => setTimeout(res, 900));
  }
  return { checked: false, hasText: false };
}

/** الصورة البطلة تمر بالسؤالين؛ رفض أحدهما يكفي. */
export async function heroGuard(imageB64) {
  const a = await hasVisibleText(imageB64);
  if (a.checked && a.hasText) return { checked: true, reject: true, why: 'كتابة أو أشخاص' };
  const b = await visionOnce(imageB64, QUESTIONS[1]);
  if (b.checked && b.hasText) return { checked: true, reject: true, why: 'الشخص هو موضوع الصورة' };
  return { checked: a.checked || b.checked, reject: false };
}

async function visionOnce(imageB64, question) {
  try {
    const r = await run(MODELS.vision, {
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: question },
          { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,' + imageB64 } }
        ]
      }],
      max_tokens: 8
    }, { charge: COST.vision });
    const raw = String(r.json?.result?.response ?? '').toUpperCase();
    if (!raw) return { checked: false, hasText: false };
    return { checked: true, hasText: /\bYES\b/.test(raw.replace(/[^A-Z ]/g, ' ')) };
  } catch {
    return { checked: false, hasText: false };   // الحارس لا يوقف الإنتاج أبداً
  }
}

export { MODELS };
