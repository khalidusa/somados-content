// توليد الخلفيات — Cloudflare Workers AI · FLUX-1-schnell.
// كل سطر هنا مبني على عطل حقيقي بالقسم ٥.١. لا تُعد اشتقاق أي منه.
const fs = require('fs');
const path = require('path');

const MODEL = '@cf/black-forest-labs/flux-1-schnell';
const GUARD_MODEL = '@cf/llava-hf/llava-1.5-7b-hf';

// سقف ذاتي تحت الحد اليومي (10,000) بهامش — نتوقف عند 8500 لا عند الرفض
const NEURON_CAP = 8500;
const STEPS = 4;              // schnell مقطّر لـ1–4 خطوات؛ 8 تضاعف الكلفة بلا فائدة
const EST_NEURONS_PER_IMAGE = 60;
const EST_NEURONS_PER_GUARD = 14;   // بعد التصغير إلى 448px

class DailyQuotaExhausted extends Error {
  constructor(msg) { super(msg); this.name = 'DailyQuotaExhausted'; this.fatal = true; }
}

const USAGE = path.join(__dirname, '..', 'data', 'neuron-usage.json');

function loadUsage() {
  try { return JSON.parse(fs.readFileSync(USAGE, 'utf8')); } catch { return { window: [], }; }
}
function saveUsage(u) { fs.writeFileSync(USAGE, JSON.stringify(u, null, 2)); }

/** التجديد ليس منتصف الليل — التطبيق الفعلي نافذة متحركة 24 ساعة. */
function spentLast24h(usage = loadUsage()) {
  const cutoff = Date.now() - 24 * 3600 * 1000;
  usage.window = (usage.window || []).filter(e => e.t > cutoff);
  return usage.window.reduce((a, e) => a + e.n, 0);
}

function chargeNeurons(n, usage = loadUsage()) {
  const spent = spentLast24h(usage);
  if (spent + n > NEURON_CAP) {
    throw new DailyQuotaExhausted(`السقف الذاتي: ${spent} + ${n} > ${NEURON_CAP} نيورون خلال 24 ساعة`);
  }
  usage.window.push({ t: Date.now(), n });
  saveUsage(usage);
  return spent + n;
}

function cfg() {
  const account = process.env.CF_ACCOUNT_ID;
  const token = process.env.CF_API_TOKEN;
  if (!account || !token) throw new Error('CF_ACCOUNT_ID أو CF_API_TOKEN غير موجود — ضعهما بـ.env أو GitHub Secrets');
  return { account, token };
}

async function callModel(model, body) {
  const { account, token } = cfg();
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${model}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = null; }

  if (!res.ok) {
    const msg = json?.errors?.map(e => e.message).join(' · ') || text.slice(0, 300);
    // النفاد يُصنّف ويُرمى فوراً — إعادة المحاولة لا تُرجع حصة منتهية
    if (res.status === 429 || /quota|capacity|limit|exceeded/i.test(msg)) throw new DailyQuotaExhausted(msg);
    // رخصة الموديل: موافقة قانونية لمرة واحدة على حساب المستخدم — لا نرسلها تلقائياً
    if (/Model Agreement|prompt agree/i.test(msg)) {
      const e = new Error(`الموديل يطلب موافقة رخصة على حسابك: ${msg}`);
      e.name = 'ModelAgreementRequired'; e.fatal = true; throw e;
    }
    const e = new Error(`${res.status}: ${msg}`); e.status = res.status; throw e;
  }
  return json;
}

/**
 * التوثيق يكذب: الموديل يقبل prompt و steps فقط.
 * لا seed ولا width/height ولا negative_prompt — يرد «Additional properties not allowed».
 * التنويع يجي من المصفوفة لا من البذرة.
 */
async function generateImage(prompt, { retries = 2 } = {}) {
  chargeNeurons(EST_NEURONS_PER_IMAGE);
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    try {
      const j = await callModel(MODEL, { prompt, steps: STEPS });
      const b64 = j?.result?.image;
      if (!b64) throw new Error('الرد بلا صورة');
      return Buffer.from(b64, 'base64');
    } catch (e) {
      if (e.fatal) throw e;         // يُعاد رميه فوراً من داخل catch الخاص بإعادة المحاولة
      lastErr = e;
      await new Promise(r => setTimeout(r, 1200 * (i + 1)));
    }
  }
  throw lastErr;
}

/**
 * حارس الجودة: إشاري لا بوابة. موديل الرؤية احتمالي — نفس الصورة تُقبل وتُرفض،
 * وملاحقة نتائجه بإعادة التوليد دوامة تستهلك الحصة بلا نهاية (القسم ٥.٢).
 * المنع الحقيقي للشعارات بنيوي: التأطير القريب بالمصفوفة.
 */
async function inspectImage(pngBuffer, resizedTo448) {
  chargeNeurons(EST_NEURONS_PER_GUARD);
  const j = await callModel(GUARD_MODEL, {
    image: [...new Uint8Array(resizedTo448 || pngBuffer)],
    prompt: 'Does this image contain readable written words a viewer could read, or a visible manufacturer brand logo? '
          + 'Ignore small textures and patterns. Answer with yes or no and one short reason.',
    max_tokens: 40,
  });
  const desc = j?.result?.description || j?.result?.response || '';
  return { raw: desc, flagged: /^\s*yes/i.test(desc) };
}

module.exports = {
  generateImage, inspectImage, DailyQuotaExhausted,
  spentLast24h, chargeNeurons, loadUsage, saveUsage,
  MODEL, GUARD_MODEL, STEPS, NEURON_CAP, EST_NEURONS_PER_IMAGE,
};
