// نظام التصميم: أبيض نقي، عناوين تركوازية، خط Noto Kufi Arabic.
// كل حرف يُطبع هنا في Chromium — نموذج الصور لا يكتب شيئاً أبداً.
//
// قواعد ثابتة من خالد:
//   لا رقم واتساب على أي صورة — الموقع فقط، والرابط في البايو.
//   لا أسعار بالأرقام.
//   العنوان قصير وقوي، والسطر الثاني يحمل المسار والفائدة.

import { fontFaceCSS, assetDataURI } from './render.mjs';

// علامة SO فقط (قرار خالد). ملفها على خلفية سوداء صمّاء بلا شفافية،
// وحرف الـS فضّي يختفي على الأبيض — فتُعرض دائماً داخل بلاطة داكنة مدوّرة.
let logoCache = null;
const logo = async () => (logoCache ??= await assetDataURI('assets/logo-so.png'));
const planeCache = {};
// قصاصة تلمس حافة ملفها = جناح مقصوص في الأصل، ولا يصلحه أي تموضع.
// الفحص يتم مرة واحدة عند أول استعمال ويوقف الإنتاج بدل أن ينشر خطأ.
const PLANES = ['plane-a.png', 'plane-b.png', 'plane-c.png', 'plane-d.png'];
const plane = async (n) => {
  if (!PLANES.includes(n)) throw new Error(`قصاصة طائرة غير معتمدة: ${n}`);
  return (planeCache[n] ??= await assetDataURI(`assets/props/trim/${n}`));
};
export { PLANES };

export const P = {
  teal: '#00a6a6',      // العناوين الكبيرة — 3.0:1 على الأبيض، كافٍ لحجم 24px فأكبر فقط
  deep: '#00696b',      // النص الصغير — 5.2:1
  dark: '#04353d',
  ink: '#0b1416',
  body: '#5a6a6c',
  mist: '#F1F8F8',
  line: '#E2EEEE'
};

/** أيقونات خطّية صغيرة — رسم مباشر لا صور، فتبقى حادة بأي حجم. */
const ICON = {
  card: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="5" width="20" height="14" rx="3"/><path d="M2 10h20"/></svg>`,
  cash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/></svg>`,
  phone: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="6" y="2" width="12" height="20" rx="3"/><path d="M10.5 18.5h3"/></svg>`,
  swap: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 8h13l-3.5-3.5M20 16H7l3.5 3.5"/></svg>`,
  coin: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 7v10M9.5 9.5h5M9.5 14.5h5"/></svg>`,
  link: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1"/></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M4 12.5l5 5L20 6.5"/></svg>`
};

// الشعارات الأصلية (simple-icons) تُقرأ من القرص وتُحقن كـSVG مباشر،
// فتأخذ لون النص وتبقى حادة بأي مقاس — لا صور نقطية.
const payCache = {};
async function payMark(name) {
  if (!payCache[name]) {
    const { readFile } = await import('node:fs/promises');
    const path = (await import('node:path')).default;
    const { ROOT } = await import('./store.mjs');
    const raw = await readFile(path.join(ROOT, 'assets', 'pay', name + '.svg'), 'utf8');
    payCache[name] = raw.replace(/<title>.*?<\/title>/, '').replace('<svg ', '<svg fill="currentColor" ');
  }
  return payCache[name];
}

/** شريط الدفع: شعارات حقيقية + العملات المقبولة. بلا رقم هاتف. */
async function payments() {
  const marks = await Promise.all(['visa', 'mastercard', 'applepay', 'zelle'].map(payMark));
  return `
<div class="pay" data-guard="شريط الدفع">
  <div class="marks">
    ${marks.map(m => `<span class="mark">${m}</span>`).join('')}
    <span class="msep"></span>
    <span class="markico">${ICON.swap}</span><span class="marktx">تحويل</span>
    <span class="markico">${ICON.cash}</span><span class="marktx">كاش</span>
  </div>
  <div class="curr">الدفع بالليرة التركية · الدولار · الدينار العراقي</div>
</div>`;
}

/** التذييل: الموقع فقط + إشارة أن الرابط في البايو. */
function footer(copy) {
  return `
<div class="foot" data-guard="التذييل">
  <span class="sitepill">${copy.site}</span>
  <span class="bio"><span class="bioico">${ICON.link}</span>الرابط في البايو</span>
</div>`;
}

function header(logoSrc, label) {
  return `
<div class="head">
  <span class="tile" data-guard="الشعار"><img src="${logoSrc}"></span>
  ${label ? `<span class="hlabel" data-guard="اللافتة">${label}</span>` : ''}
</div>`;
}

/** العنوان يُمرَّر كسلسلة أو [صدر، تكملة تركوازية]. */
const headlineHTML = (h) => Array.isArray(h)
  ? `<span class="lead">${h[0]}</span> <span class="accent">${h[1]}</span>`
  : `<span class="accent">${h}</span>`;

/** صف المزايا الثلاث — يحل محل وسوم "رحلات يومية/بلا ترانزيت". */
const benefits = (items) => `
<div class="bens" data-guard="المزايا">${items.map(t => `<span class="ben"><span class="benico">${ICON.check}</span>${t}</span>`).join('')}</div>`;

const BASE = `
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Noto Kufi Arabic','Tajawal',sans-serif;-webkit-font-smoothing:antialiased;background:#fff}
/* الخلفية: أبيض يميل إلى التركواز في الزوايا — حركة بلا ضجيج */
.stage{position:relative;overflow:hidden;
  background:
    radial-gradient(760px 620px at 6% 2%, rgba(0,166,166,.20), transparent 62%),
    radial-gradient(680px 560px at 98% 96%, rgba(0,166,166,.14), transparent 58%),
    linear-gradient(170deg, #ffffff 0%, #fbfeff 46%, #eef9f9 100%)}
.blob{position:absolute;border-radius:50%;background:linear-gradient(140deg,rgba(0,166,166,.16),rgba(0,166,166,0));filter:blur(2px)}
.dots{position:absolute;opacity:.5;
  background-image:radial-gradient(${P.teal} 1.6px, transparent 1.7px);background-size:18px 18px}
.cover{width:100%;height:100%;object-fit:cover;display:block}
.tile{background:#000;border-radius:22px;padding:0;display:inline-flex;align-items:center;justify-content:center;
  width:92px;height:92px;overflow:hidden;box-shadow:0 12px 26px rgba(6,60,62,.18)}
.tile img{width:100%;height:100%;object-fit:cover;display:block}
.head{position:absolute;top:52px;right:64px;left:64px;display:flex;align-items:center;justify-content:space-between}
.hlabel{color:${P.deep};font-size:22px;font-weight:500;letter-spacing:.02em;background:${P.mist};
  border:1px solid ${P.line};border-radius:999px;padding:10px 24px}
.pay{position:absolute;right:64px;left:64px;bottom:196px;display:flex;flex-direction:column;gap:14px;
  padding-top:26px;border-top:1px solid ${P.line}}
.marks{display:flex;align-items:center;gap:26px;direction:ltr;justify-content:flex-end}
.mark{height:38px;color:#22383a;display:flex;align-items:center}
.mark svg{height:100%;width:auto;display:block}
.msep{width:1px;height:30px;background:${P.line};display:block;margin:0 4px}
.markico{width:30px;height:30px;color:${P.teal};display:block}
.markico svg{width:100%;height:100%}
.marktx{color:#3f5051;font-size:22px;font-weight:500;margin-left:6px}
.curr{color:${P.body};font-size:21px;font-weight:400;text-align:right}
.foot{position:absolute;right:64px;left:64px;bottom:72px;display:flex;align-items:center;justify-content:space-between}
.sitepill{background:${P.teal};color:#fff;font-size:30px;font-weight:700;padding:16px 36px;border-radius:999px;
  box-shadow:0 14px 30px rgba(0,166,166,.28)}
.bio{display:flex;align-items:center;gap:12px;color:${P.deep};font-size:24px;font-weight:500}
.bioico{width:26px;height:26px;display:block;color:${P.teal}}
.bioico svg{width:100%;height:100%}
.hl{font-weight:800;line-height:1.16;letter-spacing:-.015em}
.hl .lead{color:${P.ink}}
.hl .accent{color:${P.teal}}
.bens{display:flex;align-items:center;justify-content:center;gap:14px}
.ben{display:flex;align-items:center;gap:9px;background:#fff;border:1px solid ${P.line};border-radius:999px;
  padding:13px 24px;color:#2f4142;font-size:23px;font-weight:500;box-shadow:0 8px 20px rgba(6,60,62,.08)}
.benico{width:20px;height:20px;color:${P.teal};display:block;flex:none}
.benico svg{width:100%;height:100%}
.sub{color:${P.body};font-weight:400;line-height:1.55}
`;

/** يصغّر العنوان حتى يدخل إطاره — بعد جاهزية الخط لا قبلها.
 *  ثم يفحص التخطيط: لا عنصرين متداخلين، ولا عنصر مقصوص على حافة الإطار.
 *  الفحص هو الضمانة الوحيدة أن تصميماً جديداً لا يكسر تصميماً قديماً. */
const FIT = `
window.__fit = function () {
  const out = [];
  document.querySelectorAll('[data-fit]').forEach(el => {
    const max = Number(el.dataset.fit), room = Number(el.dataset.room);
    let size = max, guard = 0;
    el.style.fontSize = size + 'px';
    while ((el.scrollWidth > room || el.scrollHeight > (Number(el.dataset.tall) || 1e9)) && size > 26 && guard++ < 90) {
      size -= 3; el.style.fontSize = size + 'px';
    }
    out.push({ size, w: el.scrollWidth, room });
  });
  const bad = out.find(o => o.w > o.room + 2);
  const problems = window.__audit();
  return { ok: !bad && !problems.length, detail: out, problems };
};

// كل عنصر يحمل data-guard يدخل الفحص. الطبقات الزخرفية معفاة عمداً.
window.__audit = function () {
  const W = document.documentElement.clientWidth, H = document.documentElement.clientHeight;

  // صندوق الحبر لا صندوق العنصر: فقرة بعرض الإطار كله صندوقها يلمس كل شيء
  // بينما حروفها في المنتصف. Range يعطي المساحة المرسومة فعلاً.
  const ink = (el) => {
    if (el.tagName === 'IMG' || !el.textContent.trim()) return el.getBoundingClientRect();
    const rg = document.createRange();
    rg.selectNodeContents(el);
    const rects = [...rg.getClientRects()].filter(r => r.width > 0 && r.height > 0);
    if (!rects.length) return el.getBoundingClientRect();
    const left = Math.min(...rects.map(r => r.left)), right = Math.max(...rects.map(r => r.right));
    const top = Math.min(...rects.map(r => r.top)), bottom = Math.max(...rects.map(r => r.bottom));
    return { left, right, top, bottom, width: right - left, height: bottom - top };
  };

  const els = [...document.querySelectorAll('[data-guard]')].map(el => ({
    name: el.dataset.guard,
    r: ink(el),
    soft: el.dataset.soft === '1',
    bleed: el.dataset.bleed === '1'
  })).filter(x => x.r.width > 1 && x.r.height > 1);

  const out = [];

  // القص لا يحدث عند حافة الإطار فقط: بطاقة بـoverflow:hidden تقص ما بداخلها بصمت
  const clippedBy = (el, r) => {
    let p = el.parentElement;
    while (p && p !== document.body) {
      const cs = getComputedStyle(p);
      if (/hidden|clip/.test(cs.overflow + cs.overflowX + cs.overflowY)) {
        const pr = p.getBoundingClientRect();
        if (r.left < pr.left - 2 || r.top < pr.top - 2 || r.right > pr.right + 2 || r.bottom > pr.bottom + 2) return p;
      }
      p = p.parentElement;
    }
    return null;
  };
  for (const el of document.querySelectorAll('[data-guard]')) {
    const r = ink(el);
    if (r.width < 1) continue;
    if (clippedBy(el, r)) out.push(el.dataset.guard + ': مقصوص داخل بطاقة تحتويه');
  }

  for (const e of els) {
    if (e.bleed) continue;
    const m = 6;   // سماح بسيط لظل أو حد
    if (e.r.left < -m || e.r.top < -m || e.r.right > W + m || e.r.bottom > H + m) {
      out.push(e.name + ': مقصوص على الحافة (' +
        Math.round(e.r.left) + ',' + Math.round(e.r.top) + ' → ' +
        Math.round(e.r.right) + ',' + Math.round(e.r.bottom) + ')');
    }
  }
  for (let i = 0; i < els.length; i++) {
    for (let j = i + 1; j < els.length; j++) {
      const a = els[i].r, b = els[j].r;
      const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (ox <= 2 || oy <= 2) continue;
      // القصاصات الشفافة (الطائرة) صندوقها أكبر من شكلها، فتُقاس بالنسبة لا بالبكسل
      const soft = els[i].soft || els[j].soft;
      const smaller = Math.min(a.width * a.height, b.width * b.height);
      const ratio = (ox * oy) / smaller;
      if (soft && ratio < 0.28) continue;
      out.push(els[i].name + ' × ' + els[j].name + ': تداخل ' + Math.round(ox) + '×' + Math.round(oy) + 'px');
    }
  }
  return out;
};`;

async function shell(size, css, body, extraJS = '') {
  return `<!doctype html><html dir="rtl" lang="ar"><meta charset="utf-8"><style>
${await fontFaceCSS()}
${BASE}
html,body{width:${size.w}px;height:${size.h}px;overflow:hidden}
.stage{width:${size.w}px;height:${size.h}px}
${css}</style><body><div class="stage">${body}</div><script>${FIT}${extraJS}</script></body></html>`;
}

/* ═════ A — «العرض»: صورة داخل قوس، وعنوان بلونين وصف مزايا ═════ */
export async function destination({ size, photo, copy }) {
  const css = `
.blobA{top:60px;right:-120px;width:520px;height:520px}
.blobB{bottom:300px;left:-160px;width:420px;height:420px}
.dots{top:150px;left:56px;width:132px;height:150px}
.arch{position:absolute;top:170px;right:180px;left:180px;height:524px;border-radius:360px 360px 40px 40px;
  overflow:hidden;box-shadow:0 34px 70px rgba(6,60,62,.28);border:8px solid #fff}
.archline{position:absolute;top:154px;right:164px;left:164px;height:552px;border-radius:376px 376px 48px 48px;
  border:2px dashed rgba(0,166,166,.45)}
.chip{position:absolute;top:470px;left:54px;width:186px;height:230px;border-radius:24px;overflow:hidden;
  border:7px solid #fff;box-shadow:0 20px 40px rgba(6,60,62,.26);z-index:5}
.plane{position:absolute;top:132px;left:96px;width:246px;z-index:6;transform:rotate(-11deg);
  filter:drop-shadow(0 18px 28px rgba(6,60,62,.34))}
.route{position:absolute;top:648px;right:50%;transform:translateX(50%);background:#fff;border-radius:999px;
  padding:15px 32px;display:flex;align-items:center;gap:16px;box-shadow:0 18px 38px rgba(6,60,62,.24);z-index:6}
.route b{color:${P.ink};font-size:27px;font-weight:700}
.route span{color:${P.teal};font-size:26px;font-weight:700}
.hl{position:absolute;top:752px;right:64px;left:64px;font-size:92px;text-align:center;white-space:nowrap}
.sub{position:absolute;top:896px;right:64px;left:64px;font-size:31px;text-align:center}
.bens{position:absolute;top:962px;right:56px;left:56px}`;

  const body = `
<div class="blob blobA"></div><div class="blob blobB"></div>
<div class="dots"></div>
<div class="archline"></div>
<div class="arch"><img class="cover" src="data:image/jpeg;base64,${photo}"></div>
${copy.photo2 ? `<div class="chip" data-guard="الصورة الصغيرة"><img class="cover" src="data:image/jpeg;base64,${copy.photo2}"></div>` : ''}
${copy.plane ? `<img class="plane" data-guard="الطائرة" data-soft="1" src="${await plane(copy.plane)}">` : ''}
<div class="route" data-guard="المسار"><b>${copy.from}</b><span>⇄</span><b>${copy.to}</b></div>
${header(await logo(), copy.label)}
<div class="hl" data-guard="العنوان" data-fit="92" data-room="952">${headlineHTML(copy.headline)}</div>
<div class="sub" data-guard="السطر">${copy.sub}</div>
${benefits(copy.benefits)}
${await payments()}
${footer(copy)}`;
  return shell(size, css, body);
}

/* ═════ B — «بطاقة الصعود»: الصورة فوق والبطاقة تتداخل معها ═════ */
export async function boarding({ size, photo, copy }) {
  const css = `
.deco{position:absolute;top:322px;right:44px;left:92px;height:444px;border-radius:38px;
  background:linear-gradient(150deg,rgba(0,166,166,.22),rgba(0,166,166,.06));transform:rotate(-1.6deg)}
.dots{top:262px;left:34px;width:120px;height:104px}
.card{position:absolute;top:334px;right:64px;left:64px;height:430px;border-radius:38px 110px 38px 38px;
  overflow:hidden;box-shadow:0 26px 54px rgba(6,60,62,.24)}
.pass{position:absolute;top:684px;right:88px;left:88px;height:286px;background:#fff;border-radius:26px;
  box-shadow:0 26px 60px rgba(6,60,62,.24);display:flex;overflow:hidden;z-index:3;border:1px solid ${P.line}}
.pmain{flex:1;padding:30px 36px}
.ptop{display:flex;justify-content:space-between;align-items:center;padding-bottom:16px;border-bottom:1px solid ${P.line}}
.plabel{color:${P.deep};font-size:19px;font-weight:500;letter-spacing:.06em}
.cities{display:flex;align-items:center;gap:24px;margin-top:22px}
.code{font-size:62px;font-weight:800;color:${P.ink};line-height:1}
.ar{font-size:23px;font-weight:400;color:${P.body};margin-top:6px}
.arrow{color:${P.teal};font-size:34px;font-weight:700;padding-bottom:22px}
.bens{position:absolute;top:998px;right:56px;left:56px}
.pay{bottom:162px}
.stub{width:196px;border-right:2px dashed ${P.line};background:${P.mist};padding:26px 20px;
  display:flex;flex-direction:column;align-items:center;justify-content:space-between}
.bars{width:100%;height:86px;background:repeating-linear-gradient(90deg,${P.ink} 0 3px,transparent 3px 6px,${P.ink} 6px 8px,transparent 8px 14px)}
.stubcode{font-size:34px;font-weight:800;color:${P.teal}}
.hl{position:absolute;top:166px;right:64px;left:64px;font-size:74px;text-align:center;white-space:nowrap}
.sub{position:absolute;top:286px;right:64px;left:64px;font-size:30px;text-align:center}
.plane{position:absolute;top:272px;left:64px;width:232px;z-index:4;transform:rotate(-9deg);
  filter:drop-shadow(0 16px 26px rgba(6,60,62,.32))}`;

  const body = `
<div class="dots"></div>
<div class="deco"></div>
<div class="card"><img class="cover" src="data:image/jpeg;base64,${photo}"></div>
${copy.plane ? `<img class="plane" data-guard="الطائرة" data-soft="1" src="${await plane(copy.plane)}">` : ''}
<div class="pass" data-guard="بطاقة الصعود">
  <div class="stub"><div class="stubcode">${copy.toCode}</div><div class="bars"></div></div>
  <div class="pmain">
    <div class="ptop"><span class="plabel">بطاقة صعود</span><span class="plabel">SOMADOS</span></div>
    <div class="cities">
      <div><div class="code">${copy.fromCode}</div><div class="ar">${copy.from}</div></div>
      <div class="arrow">←</div>
      <div><div class="code">${copy.toCode}</div><div class="ar">${copy.to}</div></div>
    </div>
  </div>
</div>
${header(await logo(), copy.label)}
<div class="hl" data-guard="العنوان" data-fit="74" data-room="952">${headlineHTML(copy.headline)}</div>
<div class="sub" data-guard="السطر">${copy.sub}</div>
${benefits(copy.benefits)}
${await payments()}
${footer(copy)}`;
  return shell(size, css, body);
}

/* ═════ C — «الأقواس»: ثلاث وجهات على أبيض ═════ */
export async function arches({ size, photos, copy }) {
  const css = `
.hl{position:absolute;top:146px;right:64px;left:64px;font-size:76px;text-align:center;white-space:nowrap}
.sub{position:absolute;top:276px;right:64px;left:64px;font-size:30px;text-align:center}
.arches{position:absolute;top:360px;right:64px;left:64px;display:flex;align-items:flex-end;justify-content:center;gap:22px}
.arch{position:relative;border-radius:170px 170px 26px 26px;overflow:hidden;box-shadow:0 24px 48px rgba(6,60,62,.2)}
.a1,.a3{width:290px;height:480px}
.a2{width:306px;height:560px}
.cap{position:absolute;right:0;left:0;bottom:0;padding:22px 0 18px;text-align:center;
  background:linear-gradient(180deg,rgba(4,53,61,0),rgba(4,53,61,.86))}
.cn{color:#fff;font-size:34px;font-weight:700}
.cc{color:rgba(255,255,255,.76);font-size:16px;font-weight:400;letter-spacing:.3em;margin-top:6px}
.strip{position:absolute;top:960px;right:64px;left:64px;display:flex;justify-content:center;gap:16px}
.chip{display:flex;align-items:center;gap:10px;background:${P.mist};border:1px solid ${P.line};
  color:${P.deep};font-size:22px;font-weight:500;padding:12px 24px;border-radius:999px}
.chip span{width:20px;height:20px;color:${P.teal};display:block}
.chip span svg{width:100%;height:100%}`;

  const cls = ['a1', 'a2', 'a3'];
  const body = `
${header(await logo(), copy.label)}
<div class="hl" data-guard="العنوان" data-fit="76" data-room="952">${headlineHTML(copy.headline)}</div>
<div class="sub" data-guard="السطر">${copy.sub}</div>
<div class="arches">
  ${copy.cities.map((c, i) => `<div class="arch ${cls[i]}"><img class="cover" src="data:image/jpeg;base64,${photos[i]}">
    <div class="cap"><div class="cn">${c.ar}</div><div class="cc">${c.code}</div></div></div>`).join('')}
</div>
<div class="strip">${copy.chips.map(t => `<span class="chip"><span>${ICON.check}</span>${t}</span>`).join('')}</div>
${await payments()}
${footer(copy)}`;
  return shell(size, css, body);
}

/* ═════ D — «الخدمات»: بتلات صور فوق طائرة ═════ */
export async function fan({ size, photos, copy }) {
  const css = `
.halo{position:absolute;top:-220px;right:50%;width:1200px;height:700px;transform:translateX(50%);
  background:radial-gradient(50% 60% at 50% 50%,${P.mist},#fff 70%)}
.fan{position:absolute;top:172px;right:0;left:0;height:380px}
.petal{position:absolute;top:0;right:50%;width:238px;height:324px;overflow:hidden;border:6px solid #fff;
  border-radius:54% 54% 44% 44% / 62% 62% 38% 38%;transform-origin:50% 620px;box-shadow:0 18px 34px rgba(6,60,62,.2)}
.plane{position:absolute;top:520px;right:50%;width:560px;transform:translateX(50%);
  filter:drop-shadow(0 26px 40px rgba(6,60,62,.24))}
.hl{position:absolute;top:800px;right:64px;left:64px;font-size:74px;text-align:center;white-space:nowrap}
.sub{position:absolute;top:930px;right:64px;left:64px;font-size:29px;text-align:center}
.svcs{position:absolute;top:990px;right:64px;left:64px;display:flex;justify-content:center;gap:14px}
.pay{bottom:160px}
.svc{background:${P.mist};border:1px solid ${P.line};color:${P.deep};font-size:22px;font-weight:500;
  padding:12px 22px;border-radius:999px}`;

  const body = `
<div class="halo"></div>
<div class="fan">${photos.map((p, i) => {
    const rot = (i - (photos.length - 1) / 2) * 17;
    return `<div class="petal" style="transform:translateX(50%) rotate(${rot}deg)"><img class="cover" src="data:image/jpeg;base64,${p}"></div>`;
  }).join('')}</div>
<img class="plane" src="${await plane(copy.plane || 'plane-cut-14.png')}">
${header(await logo(), copy.label)}
<div class="hl" data-guard="العنوان" data-fit="76" data-room="952">${headlineHTML(copy.headline)}</div>
<div class="sub" data-guard="السطر">${copy.sub}</div>
<div class="svcs" data-guard="الخدمات">${copy.services.map(s => `<span class="svc">${s}</span>`).join('')}</div>
${await payments()}
${footer(copy)}`;
  return shell(size, css, body);
}

/* ═════ الريل: ١٠ ثوانٍ، 1080×1920، أبيض وتركواز ═════ */
export async function reel({ photo, copy, duration = 10 }) {
  const size = { w: 1080, h: 1920 };
  const css = `
.frame{position:absolute;top:210px;right:60px;left:60px;height:980px;border-radius:40px;overflow:hidden;
  box-shadow:0 30px 70px rgba(6,60,62,.24)}
.ken{position:absolute;inset:-6%;will-change:transform}
.ken img{width:100%;height:100%;object-fit:cover;display:block}
.tint{position:absolute;inset:0;background:linear-gradient(180deg,rgba(4,53,61,.28),rgba(4,53,61,0) 40%,rgba(4,53,61,.42))}
.brand{position:absolute;top:248px;right:98px;opacity:0;z-index:3}
.routepill{position:absolute;top:1112px;right:98px;background:#fff;border-radius:999px;padding:18px 34px;
  display:flex;align-items:center;gap:16px;box-shadow:0 18px 36px rgba(6,60,62,.24);opacity:0;z-index:4}
.routepill b{color:${P.ink};font-size:30px;font-weight:700}
.routepill span{color:${P.teal};font-size:30px;font-weight:700}
.hl{position:absolute;top:1252px;right:60px;left:250px;font-size:92px;opacity:0;white-space:nowrap}
.sub{position:absolute;top:1392px;right:60px;left:250px;font-size:34px;opacity:0}
.pay{position:absolute;right:60px;left:250px;bottom:330px;opacity:0}
.foot{position:absolute;right:60px;left:250px;bottom:236px;opacity:0}`;

  const body = `
<div class="frame"><div class="ken" id="ken"><img src="data:image/jpeg;base64,${photo}"></div><div class="tint"></div></div>
<div class="brand" id="brand"><span class="tile" style="width:104px;height:104px"><img src="${await logo()}"></span></div>
<div class="routepill" id="routepill"><b>${copy.from}</b><span>⇄</span><b>${copy.to}</b></div>
<div class="hl" id="hl" data-guard="العنوان" data-fit="92" data-room="760">${headlineHTML(copy.headline)}</div>
<div class="sub" id="sub">${copy.sub}</div>
${await payments()}
${footer(copy)}`;

  const js = `
const D = ${duration};
const ease = (x) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
const seg = (t, a, b) => ease((t - a) / (b - a));
window.__seek = function (t) {
  const p = t / D;
  document.getElementById('ken').style.transform =
    'scale(' + (1.06 + 0.10 * p) + ') translate(' + (-12 * p) + 'px,' + (-8 * p) + 'px)';
  const fade = (sel, a, b, dy) => {
    const el = typeof sel === 'string' ? document.querySelector(sel) : sel;
    if (!el) return;
    const v = seg(t, a, b);
    el.style.opacity = v;
    if (dy) el.style.transform = (el.dataset.baseTransform || '') + ' translateY(' + ((1 - v) * dy) + 'px)';
  };
  fade('#brand', 0.2, 1.0, 0);
  fade('#routepill', 1.0, 1.8, 20);
  fade('#hl', 1.6, 2.6, 40);
  fade('#sub', 2.4, 3.3, 24);
  fade('.pay', 4.6, 5.6, 18);
  fade('.foot', 5.4, 6.4, 18);
};
window.__seek(0);`;

  return shell(size, css, body, js);
}


/* ═════ E — «التذكرة»: بطاقة سفر بثقوب وكعب تركوازي ═════ */
export async function ticket({ size, photo, copy }) {
  const css = `
.blobA{top:-60px;left:-140px;width:460px;height:460px}
.dots{top:150px;right:36px;width:120px;height:140px}
.tk{position:absolute;top:172px;right:104px;left:104px;height:664px;background:#fff;border-radius:34px;
  box-shadow:0 34px 74px rgba(6,60,62,.26);overflow:hidden;transform:rotate(-1.4deg)}
.tkphoto{position:absolute;top:22px;right:22px;left:22px;height:428px;border-radius:24px;overflow:hidden}
.perf{position:absolute;top:482px;right:22px;left:22px;border-top:3px dashed ${P.line}}
.notchL,.notchR{position:absolute;top:460px;width:44px;height:44px;border-radius:50%;background:#f3fafa;
  box-shadow:inset 0 2px 6px rgba(6,60,62,.12)}
.notchL{left:-22px} .notchR{right:-22px}
.stub{position:absolute;top:496px;right:40px;left:40px;display:flex;align-items:center;justify-content:space-between}
.stubtx .kk{color:${P.deep};font-size:20px;font-weight:500;letter-spacing:.14em}
.stubtx .city{color:${P.ink};font-size:48px;font-weight:800;line-height:1.18;margin-top:4px}
.stubtx .rt{color:${P.body};font-size:23px;font-weight:400;margin-top:6px}
.bars{width:74px;height:120px;background:repeating-linear-gradient(0deg,${P.ink} 0 3px,transparent 3px 6px,${P.ink} 6px 8px,transparent 8px 13px);border-radius:4px}
.stamp{position:absolute;top:196px;left:58px;width:168px;height:168px;border-radius:50%;
  border:3px dashed rgba(0,166,166,.75);display:flex;align-items:center;justify-content:center;
  color:${P.deep};font-size:22px;font-weight:700;text-align:center;line-height:1.4;
  background:rgba(255,255,255,.82);transform:rotate(-14deg);z-index:6}
.plane{position:absolute;top:96px;left:168px;width:236px;z-index:7;transform:rotate(-13deg);
  filter:drop-shadow(0 18px 28px rgba(6,60,62,.34))}
.hl{position:absolute;top:888px;right:64px;left:64px;font-size:74px;text-align:center;white-space:nowrap}
.bens{position:absolute;top:1006px;right:56px;left:56px}
.pay{bottom:168px}`;

  const body = `
<div class="blob blobA"></div><div class="dots"></div>
<div class="tk">
  <div class="tkphoto"><img class="cover" src="data:image/jpeg;base64,${photo}"></div>
  <div class="perf"></div><div class="notchL"></div><div class="notchR"></div>
  <div class="stub">
    <div class="stubtx" data-guard="كعب التذكرة">
      <div class="kk">${copy.label}</div>
      <div class="city">${copy.to}</div>
      <div class="rt">${copy.from} ⇄ ${copy.to} · ${copy.toCode}</div>
    </div>
    <div class="bars"></div>
  </div>
</div>
<div class="stamp" data-guard="الختم">${copy.stamp}</div>
${copy.plane ? `<img class="plane" data-guard="الطائرة" data-soft="1" src="${await plane(copy.plane)}">` : ''}
${header(await logo(), '')}
<div class="hl" data-guard="العنوان" data-fit="74" data-room="952">${headlineHTML(copy.headline)}</div>
${benefits(copy.benefits)}
${await payments()}
${footer(copy)}`;
  return shell(size, css, body);
}

/* ═════ F — «النافذة»: المدينة من نافذة الطائرة ═════ */
export async function windowSeat({ size, photo, copy }) {
  const css = `
.cabin{position:absolute;inset:0;background:linear-gradient(160deg,#ffffff 0%,#f3fbfb 58%,#e6f6f6 100%)}
.rail{position:absolute;top:150px;right:64px;left:64px;height:2px;background:${P.line}}
.win{position:absolute;top:200px;right:206px;left:206px;height:620px;border-radius:300px/240px;
  overflow:hidden;border:18px solid #fff;box-shadow:0 30px 64px rgba(6,60,62,.26), inset 0 0 0 3px rgba(6,60,62,.06)}
.winring{position:absolute;top:176px;right:182px;left:182px;height:668px;border-radius:320px/262px;
  border:2px solid rgba(0,166,166,.34)}
.shade{position:absolute;top:158px;right:250px;left:250px;height:16px;border-radius:999px;background:#e9f4f4}
.dots{bottom:430px;right:44px;width:110px;height:130px}
.plane{position:absolute;top:676px;left:40px;width:214px;z-index:6;transform:rotate(-8deg);
  filter:drop-shadow(0 16px 26px rgba(6,60,62,.3))}
.route{position:absolute;top:790px;right:50%;transform:translateX(50%);background:#fff;border-radius:999px;
  padding:14px 30px;display:flex;align-items:center;gap:14px;box-shadow:0 16px 34px rgba(6,60,62,.22);z-index:7}
.route b{color:${P.ink};font-size:25px;font-weight:700}
.route span{color:${P.teal};font-size:24px;font-weight:700}
.hl{position:absolute;top:894px;right:64px;left:64px;font-size:78px;text-align:center;white-space:nowrap}
.bens{position:absolute;top:1006px;right:56px;left:56px}
.pay{bottom:168px}`;

  const body = `
<div class="cabin"></div>
<div class="rail"></div><div class="dots"></div>
<div class="winring"></div>
<div class="shade"></div>
<div class="win"><img class="cover" src="data:image/jpeg;base64,${photo}"></div>
${copy.plane ? `<img class="plane" data-guard="الطائرة" data-soft="1" src="${await plane(copy.plane)}">` : ''}
<div class="route" data-guard="المسار"><b>${copy.from}</b><span>⇄</span><b>${copy.to}</b></div>
${header(await logo(), copy.label)}
<div class="hl" data-guard="العنوان" data-fit="78" data-room="952">${headlineHTML(copy.headline)}</div>
${benefits(copy.benefits)}
${await payments()}
${footer(copy)}`;
  return shell(size, css, body);
}


/* ═════ G — «القطري»: شريط تركوازي مائل وبطاقة صورة مائلة ═════ */
export async function diagonal({ size, photo, copy }) {
  const css = `
.band{position:absolute;top:300px;right:-140px;left:-140px;height:330px;transform:rotate(-13deg);
  background:linear-gradient(90deg,${P.teal},#00c2c2)}
.band2{position:absolute;top:648px;right:-140px;left:-140px;height:10px;transform:rotate(-13deg);background:rgba(0,105,107,.35)}
.pic{position:absolute;top:214px;right:206px;left:206px;height:512px;border-radius:30px;overflow:hidden;
  border:12px solid #fff;box-shadow:0 30px 60px rgba(6,60,62,.3);transform:rotate(4deg)}
.plane{position:absolute;top:168px;left:52px;width:238px;z-index:6;transform:rotate(-10deg);
  filter:drop-shadow(0 18px 26px rgba(6,60,62,.3))}
.route{position:absolute;top:760px;right:50%;transform:translateX(50%);background:#fff;border-radius:999px;
  padding:14px 30px;display:flex;align-items:center;gap:14px;box-shadow:0 16px 34px rgba(6,60,62,.2);z-index:7}
.route b{color:${P.ink};font-size:25px;font-weight:700}
.route span{color:${P.teal};font-size:24px;font-weight:700}
.hl{position:absolute;top:856px;right:64px;left:64px;font-size:80px;text-align:center;white-space:nowrap}
.bens{position:absolute;top:1006px;right:56px;left:56px}
.pay{bottom:168px}`;
  const body = `
<div class="band"></div><div class="band2"></div>
<div class="pic"><img class="cover" src="data:image/jpeg;base64,${photo}"></div>
${copy.plane ? `<img class="plane" data-guard="الطائرة" data-soft="1" src="${await plane(copy.plane)}">` : ''}
<div class="route" data-guard="المسار"><b>${copy.from}</b><span>⇄</span><b>${copy.to}</b></div>
${header(await logo(), copy.label)}
<div class="hl" data-guard="العنوان" data-fit="80" data-room="952">${headlineHTML(copy.headline)}</div>
${benefits(copy.benefits)}
${await payments()}
${footer(copy)}`;
  return shell(size, css, body);
}

/* ═════ H — «الشبكة»: تحرير مجلّاتي، عنوان فوق وثلاث صور ═════ */
export async function grid({ size, photos, copy }) {
  const css = `
.hl{position:absolute;top:182px;right:64px;left:420px;font-size:70px;white-space:nowrap}
.sub{position:absolute;top:306px;right:64px;left:64px;font-size:30px}
.big{position:absolute;top:356px;right:64px;width:560px;height:520px;border-radius:30px;overflow:hidden;
  box-shadow:0 26px 52px rgba(6,60,62,.24)}
.s1{position:absolute;top:356px;left:64px;width:376px;height:250px;border-radius:26px;overflow:hidden;
  box-shadow:0 20px 40px rgba(6,60,62,.2)}
.s2{position:absolute;top:626px;left:64px;width:376px;height:250px;border-radius:26px;overflow:hidden;
  box-shadow:0 20px 40px rgba(6,60,62,.2)}
.tagc{position:absolute;top:806px;right:96px;background:#fff;border-radius:999px;padding:12px 26px;
  display:flex;align-items:center;gap:12px;box-shadow:0 14px 30px rgba(6,60,62,.2);z-index:6}
.tagc b{color:${P.ink};font-size:24px;font-weight:700}
.tagc span{color:${P.teal};font-size:23px;font-weight:700}
.bens{position:absolute;top:944px;right:56px;left:56px}
.pay{bottom:168px}`;
  const body = `
<div class="big"><img class="cover" src="data:image/jpeg;base64,${photos[0]}"></div>
<div class="s1"><img class="cover" src="data:image/jpeg;base64,${photos[1] ?? photos[0]}"></div>
<div class="s2"><img class="cover" src="data:image/jpeg;base64,${photos[2] ?? photos[0]}"></div>
<div class="tagc" data-guard="المسار"><b>${copy.from}</b><span>⇄</span><b>${copy.to}</b></div>
${header(await logo(), copy.label)}
<div class="hl" data-guard="العنوان" data-fit="76" data-room="952">${headlineHTML(copy.headline)}</div>
<div class="sub" data-guard="السطر">${copy.sub}</div>
${benefits(copy.benefits)}
${await payments()}
${footer(copy)}`;
  return shell(size, css, body);
}

/* ═════ I — «المسار»: مدينتان بدائرتين وقوس منقّط بينهما ═════ */
export async function routemap({ size, photos, copy }) {
  const css = `
.grid{position:absolute;top:150px;right:64px;left:64px;height:640px;border-radius:40px;background:${P.mist};
  border:1px solid ${P.line}}
.gdots{position:absolute;top:150px;right:64px;left:64px;height:640px;border-radius:40px;opacity:.55;
  background-image:radial-gradient(${P.teal} 1.5px, transparent 1.6px);background-size:26px 26px}
.c1,.c2{position:absolute;width:268px;height:268px;border-radius:50%;overflow:hidden;border:9px solid #fff;
  box-shadow:0 22px 44px rgba(6,60,62,.26)}
.c1{top:430px;right:112px} .c2{top:250px;left:112px}
.cl1,.cl2{position:absolute;color:${P.ink};font-size:29px;font-weight:700;text-align:center;width:268px}
.cl1{top:716px;right:112px} .cl2{top:536px;left:112px}
.arcsvg{position:absolute;top:150px;right:64px;left:64px;height:640px}
.plane{position:absolute;top:352px;right:452px;width:190px;z-index:6;transform:rotate(-24deg);
  filter:drop-shadow(0 14px 24px rgba(6,60,62,.3))}
.hl{position:absolute;top:836px;right:64px;left:64px;font-size:78px;text-align:center;white-space:nowrap}
.bens{position:absolute;top:1006px;right:56px;left:56px}
.pay{bottom:168px}`;
  const body = `
<div class="grid"></div><div class="gdots"></div>
<svg class="arcsvg" viewBox="0 0 952 640" fill="none">
  <path d="M200 430 C 340 250, 560 230, 700 350" stroke="${P.teal}" stroke-width="4" stroke-dasharray="3 14" stroke-linecap="round" opacity=".85"/>
</svg>
<div class="c1"><img class="cover" src="data:image/jpeg;base64,${photos[0]}"></div>
<div class="c2"><img class="cover" src="data:image/jpeg;base64,${photos[1] ?? photos[0]}"></div>
<div class="cl1" data-guard="مدينة ١">${copy.from}</div>
<div class="cl2" data-guard="مدينة ٢">${copy.to}</div>
${copy.plane ? `<img class="plane" data-guard="الطائرة" data-soft="1" src="${await plane(copy.plane)}">` : ''}
${header(await logo(), copy.label)}
<div class="hl" data-guard="العنوان" data-fit="78" data-room="952">${headlineHTML(copy.headline)}</div>
${benefits(copy.benefits)}
${await payments()}
${footer(copy)}`;
  return shell(size, css, body);
}

/* ═════ J — «البطاقة السفلية»: صورة تملأ الإطار وبطاقة بيضاء طافية ═════ */
export async function overlay({ size, photo, copy }) {
  const css = `
.full{position:absolute;top:0;right:0;left:0;height:812px;overflow:hidden}
.veil{position:absolute;top:0;right:0;left:0;height:812px;
  background:linear-gradient(180deg,rgba(4,53,61,.42) 0%,rgba(4,53,61,0) 34%,rgba(4,53,61,.30) 100%)}
.cardw{position:absolute;top:660px;right:64px;left:64px;background:#fff;border-radius:34px;padding:34px 40px 38px;
  box-shadow:0 30px 64px rgba(6,60,62,.3);z-index:4}
.cardw .lab{color:${P.deep};font-size:21px;font-weight:500;letter-spacing:.1em}
.cardw .rt{color:${P.body};font-size:25px;font-weight:400;margin-top:10px}
.hl{position:relative;margin-top:14px;font-size:72px;white-space:nowrap}
.bens{position:absolute;top:1010px;right:56px;left:56px}
.pay{bottom:168px}
.plane{position:absolute;top:150px;left:64px;width:236px;z-index:5;transform:rotate(-9deg);
  filter:drop-shadow(0 18px 28px rgba(0,0,0,.34))}`;
  const body = `
<div class="full"><img class="cover" src="data:image/jpeg;base64,${photo}"></div>
<div class="veil"></div>
${copy.plane ? `<img class="plane" data-guard="الطائرة" data-soft="1" src="${await plane(copy.plane)}">` : ''}
<div class="cardw" data-guard="بطاقة النص">
  <div class="lab">${copy.label}</div>
  <div class="hl" data-fit="72" data-room="872">${headlineHTML(copy.headline)}</div>
  <div class="rt">${copy.from} ⇄ ${copy.to}</div>
</div>
${header(await logo(), '')}
${benefits(copy.benefits)}
${await payments()}
${footer(copy)}`;
  return shell(size, css, body);
}


/* ═════ K — «المنقسم»: نصف صورة ونصف نص ═════ */
export async function split({ size, photo, copy }) {
  const css = `
.half{position:absolute;top:0;bottom:0;left:0;width:556px;overflow:hidden;border-radius:0 60px 60px 0}
.tint{position:absolute;top:0;bottom:0;left:0;width:556px;border-radius:0 60px 60px 0;
  background:linear-gradient(180deg,rgba(4,53,61,.26),rgba(4,53,61,0) 40%,rgba(4,53,61,.30))}
.dots{top:200px;right:60px;width:120px;height:140px}
.lab{position:absolute;top:172px;right:64px;color:${P.deep};font-size:22px;font-weight:500;
  background:${P.mist};border:1px solid ${P.line};border-radius:999px;padding:10px 24px}
.hl{position:absolute;top:268px;right:64px;left:600px;font-size:72px;line-height:1.22;text-align:right}
.sub{position:absolute;top:576px;right:64px;left:600px;font-size:28px;text-align:right}
.route{position:absolute;top:734px;right:64px;background:#fff;border-radius:999px;padding:14px 28px;
  display:flex;align-items:center;gap:14px;box-shadow:0 14px 30px rgba(6,60,62,.18)}
.route b{color:${P.ink};font-size:24px;font-weight:700}
.route span{color:${P.teal};font-size:23px;font-weight:700}
.plane{position:absolute;top:836px;right:110px;width:214px;transform:rotate(-8deg);
  filter:drop-shadow(0 16px 26px rgba(6,60,62,.28))}
.bens{position:absolute;top:1006px;right:56px;left:56px}
.pay{bottom:168px}
.head{right:64px;left:600px}`;
  const body = `
<div class="half"><img class="cover" src="data:image/jpeg;base64,${photo}"></div>
<div class="tint"></div><div class="dots"></div>
${header(await logo(), '')}
<div class="lab" data-guard="اللافتة">${copy.label}</div>
<div class="hl" data-guard="العنوان" data-fit="72" data-room="416" data-tall="286">${headlineHTML(copy.headline)}</div>
<div class="sub" data-guard="السطر">${copy.sub}</div>
<div class="route" data-guard="المسار"><b>${copy.from}</b><span>⇄</span><b>${copy.to}</b></div>
${copy.plane ? `<img class="plane" data-guard="الطائرة" data-soft="1" src="${await plane(copy.plane)}">` : ''}
${benefits(copy.benefits)}
${await payments()}
${footer(copy)}`;
  return shell(size, css, body);
}

/* ═════ L — «البانوراما»: شريط صورة عريض بين نصّين ═════ */
export async function panorama({ size, photo, copy }) {
  const css = `
.hl{position:absolute;top:182px;right:64px;left:64px;font-size:78px;text-align:center;white-space:nowrap}
.band{position:absolute;top:322px;right:0;left:0;height:420px;overflow:hidden}
.bandline{position:absolute;top:306px;right:0;left:0;height:6px;background:${P.teal}}
.sub{position:absolute;top:790px;right:64px;left:64px;font-size:30px;text-align:center}
.route{position:absolute;top:868px;right:50%;transform:translateX(50%);background:#fff;border-radius:999px;
  padding:14px 30px;display:flex;align-items:center;gap:14px;box-shadow:0 14px 32px rgba(6,60,62,.2)}
.route b{color:${P.ink};font-size:25px;font-weight:700}
.route span{color:${P.teal};font-size:24px;font-weight:700}
.plane{position:absolute;top:372px;left:38px;width:196px;z-index:4;transform:rotate(-9deg);
  filter:drop-shadow(0 14px 22px rgba(6,60,62,.26))}
.bens{position:absolute;top:1006px;right:56px;left:56px}
.pay{bottom:168px}`;
  const body = `
<div class="bandline"></div>
<div class="band"><img class="cover" src="data:image/jpeg;base64,${photo}"></div>
${header(await logo(), copy.label)}
${copy.plane ? `<img class="plane" data-guard="الطائرة" data-soft="1" src="${await plane(copy.plane)}">` : ''}
<div class="hl" data-guard="العنوان" data-fit="80" data-room="952">${headlineHTML(copy.headline)}</div>
<div class="sub" data-guard="السطر">${copy.sub}</div>
<div class="route" data-guard="المسار"><b>${copy.from}</b><span>⇄</span><b>${copy.to}</b></div>
${benefits(copy.benefits)}
${await payments()}
${footer(copy)}`;
  return shell(size, css, body);
}

/* ═════ M — «الملصقات»: ثلاث صور مائلة متراكبة ═════ */
export async function polaroids({ size, photos, copy }) {
  const css = `
.pol{position:absolute;background:#fff;border-radius:18px;padding:14px 14px 42px;
  box-shadow:0 24px 46px rgba(6,60,62,.26);overflow:hidden}
.pol img{width:100%;height:100%;object-fit:cover;display:block;border-radius:10px}
.p1{top:196px;right:96px;width:330px;height:390px;transform:rotate(-6deg)}
.p2{top:236px;right:50%;margin-right:-165px;width:340px;height:400px;transform:rotate(2deg);z-index:3}
.p3{top:196px;left:96px;width:330px;height:390px;transform:rotate(7deg)}
.polcap{position:absolute;right:0;left:0;bottom:12px;text-align:center;color:${P.deep};font-size:20px;font-weight:600}
.hl{position:absolute;top:742px;right:64px;left:64px;font-size:78px;text-align:center;white-space:nowrap}
.sub{position:absolute;top:870px;right:64px;left:64px;font-size:29px;text-align:center}
.bens{position:absolute;top:958px;right:56px;left:56px}
.pay{bottom:168px}`;
  const cls = ['p1', 'p2', 'p3'];
  const body = `
${copy.cities.map((c, i) => `<div class="pol ${cls[i]}"><img src="data:image/jpeg;base64,${photos[i] ?? photos[0]}"><div class="polcap">${c.ar}</div></div>`).join('')}
${header(await logo(), copy.label)}
<div class="hl" data-guard="العنوان" data-fit="78" data-room="952">${headlineHTML(copy.headline)}</div>
<div class="sub" data-guard="السطر">${copy.sub}</div>
${benefits(copy.benefits)}
${await payments()}
${footer(copy)}`;
  return shell(size, css, body);
}

/* ═════ N — «الرباعية»: أربع صور وشارة في المنتصف ═════ */
export async function quad({ size, photos, copy }) {
  const css = `
.q{position:absolute;width:432px;height:330px;overflow:hidden;box-shadow:0 14px 28px rgba(6,60,62,.16)}
.q1{top:170px;right:64px;border-radius:30px 30px 8px 30px}
.q2{top:170px;left:64px;border-radius:30px 30px 30px 8px}
.q3{top:516px;right:64px;border-radius:8px 30px 30px 30px}
.q4{top:516px;left:64px;border-radius:30px 8px 30px 30px}
.badge{position:absolute;top:378px;right:50%;transform:translateX(50%);width:224px;height:224px;border-radius:50%;
  background:#fff;box-shadow:0 20px 44px rgba(6,60,62,.26);display:flex;flex-direction:column;
  align-items:center;justify-content:center;gap:6px;z-index:5;border:6px solid ${P.mist}}
.badge b{color:${P.teal};font-size:34px;font-weight:800;line-height:1.2;text-align:center}
.badge i{color:${P.body};font-size:20px;font-style:normal}
.hl{position:absolute;top:888px;right:64px;left:64px;font-size:74px;text-align:center;white-space:nowrap}
.bens{position:absolute;top:1006px;right:56px;left:56px}
.pay{bottom:168px}`;
  const cls = ['q1', 'q2', 'q3', 'q4'];
  const body = `
${cls.map((c, i) => `<div class="q ${c}"><img class="cover" src="data:image/jpeg;base64,${photos[i] ?? photos[0]}"></div>`).join('')}
<div class="badge" data-guard="الشارة"><b>${copy.badge}</b><i>${copy.badgeSub}</i></div>
${header(await logo(), copy.label)}
<div class="hl" data-guard="العنوان" data-fit="74" data-room="952">${headlineHTML(copy.headline)}</div>
${benefits(copy.benefits)}
${await payments()}
${footer(copy)}`;
  return shell(size, css, body);
}

/* ═════ O — «الموجة»: صورة بحافة سفلية منحنية ═════ */
export async function wave({ size, photo, copy }) {
  const css = `
.top{position:absolute;top:0;right:0;left:0;height:800px;overflow:hidden}
.wavesvg{position:absolute;top:620px;right:0;left:0;height:220px;z-index:3}
.tint{position:absolute;top:0;right:0;left:0;height:800px;
  background:linear-gradient(180deg,rgba(4,53,61,.34),rgba(4,53,61,0) 44%)}
.route{position:absolute;top:566px;right:64px;background:rgba(255,255,255,.95);border-radius:999px;padding:14px 30px;
  display:flex;align-items:center;gap:14px;box-shadow:0 14px 30px rgba(6,60,62,.2);z-index:4}
.route b{color:${P.ink};font-size:25px;font-weight:700}
.route span{color:${P.teal};font-size:24px;font-weight:700}
.plane{position:absolute;top:150px;left:60px;width:224px;z-index:4;transform:rotate(-10deg);
  filter:drop-shadow(0 16px 26px rgba(0,0,0,.3))}
.hl{position:absolute;top:832px;right:64px;left:64px;font-size:80px;text-align:center;white-space:nowrap}
.sub{position:absolute;top:962px;right:64px;left:64px;font-size:29px;text-align:center}
.bens{position:absolute;top:1010px;right:56px;left:56px}
.pay{bottom:168px}`;
  const body = `
<div class="top"><img class="cover" src="data:image/jpeg;base64,${photo}"></div>
<div class="tint"></div>
<svg class="wavesvg" viewBox="0 0 1080 220" preserveAspectRatio="none">
  <path d="M0 96 C 260 200, 500 20, 1080 120 L1080 220 L0 220 Z" fill="#fff"/>
  <path d="M0 96 C 260 200, 500 20, 1080 120" fill="none" stroke="${P.teal}" stroke-width="5"/>
</svg>
${copy.plane ? `<img class="plane" data-guard="الطائرة" data-soft="1" src="${await plane(copy.plane)}">` : ''}
<div class="route" data-guard="المسار"><b>${copy.from}</b><span>⇄</span><b>${copy.to}</b></div>
${header(await logo(), copy.label)}
<div class="hl" data-guard="العنوان" data-fit="80" data-room="952">${headlineHTML(copy.headline)}</div>
<div class="sub" data-guard="السطر">${copy.sub}</div>
${benefits(copy.benefits)}
${await payments()}
${footer(copy)}`;
  return shell(size, css, body);
}

/* ═════ P — «الجواز»: صفحة جواز بختم ═════ */
export async function passport({ size, photo, copy }) {
  const css = `
.page{position:absolute;top:150px;right:64px;left:64px;height:700px;border-radius:30px;background:#fff;
  border:2px dashed ${P.line};box-shadow:0 22px 50px rgba(6,60,62,.16)}
.pgtop{position:absolute;top:186px;right:104px;left:104px;display:flex;justify-content:space-between;align-items:center}
.pgk{color:${P.deep};font-size:20px;font-weight:600;letter-spacing:.16em}
.win{position:absolute;top:250px;right:104px;left:104px;height:452px;border-radius:22px;overflow:hidden}
.mrz{position:absolute;top:730px;right:104px;left:104px;height:52px;border-radius:8px;background:${P.mist};
  display:flex;align-items:center;padding:0 18px;gap:9px;overflow:hidden}
.mrz i{flex:none;width:13px;height:5px;border-radius:2px;background:#cfe3e3;display:block}
.stamp{position:absolute;top:556px;left:52px;width:168px;height:168px;border-radius:50%;
  border:3px dashed rgba(0,166,166,.85);display:flex;align-items:center;justify-content:center;
  color:${P.deep};font-size:22px;font-weight:700;text-align:center;line-height:1.4;
  background:rgba(255,255,255,.92);transform:rotate(-15deg);z-index:6}
.hl{position:absolute;top:884px;right:64px;left:64px;font-size:76px;text-align:center;white-space:nowrap}
.bens{position:absolute;top:1006px;right:56px;left:56px}
.pay{bottom:168px}`;
  const body = `
<div class="page"></div>
<div class="pgtop"><span class="pgk" data-guard="ترويسة">${copy.label}</span><span class="pgk" data-guard="اسم الجواز">SOMADOS</span></div>
<div class="win"><img class="cover" src="data:image/jpeg;base64,${photo}"></div>
<div class="mrz">${Array.from({ length: 34 }).map(() => '<i></i>').join('')}</div>
<div class="stamp" data-guard="الختم">${copy.stamp}</div>
${header(await logo(), '')}
<div class="hl" data-guard="العنوان" data-fit="76" data-room="952">${headlineHTML(copy.headline)}</div>
${benefits(copy.benefits)}
${await payments()}
${footer(copy)}`;
  return shell(size, css, body);
}

export const LAYOUTS = { destination, boarding, arches, fan, ticket, windowSeat, diagonal, grid, routemap, overlay, split, panorama, polaroids, quad, wave, passport };

export async function buildPostHTML({ layout, size, photos, copy }) {
  const fn = LAYOUTS[layout];
  if (!fn) throw new Error('قالب غير معروف: ' + layout);
  return fn({ size, photo: photos[0], photos, copy });
}
