// قوالب الريلز: 1080×1920، عشر ثوانٍ، نفس هوية الصور.
// الحركة دالة في الزمن: __seek(t) يرسم اللحظة t، فكل إطار قابل لإعادة الإنتاج.
// مناطق انستقرام الآمنة: 210 أعلى · 440 أسفل · 250 يمين (أزرار) · 60 يسار.

import { fontFaceCSS, assetDataURI } from './render.mjs';
import { P, AUDIT_JS } from './design.mjs';

let logoCache = null;
const logo = async () => (logoCache ??= await assetDataURI('assets/logo-so.png'));
const planeCache = {};
const plane = async (n) => (planeCache[n] ??= await assetDataURI(`assets/props/trim/${n}`));

const SAFE = { top: 216, bottom: 448, right: 250, left: 60 };
// السلّم الرأسي للريل (من 216 إلى 1472): كل قالب يلتزم به فلا يتكدّس النص أعلى الإطار
const Y = { brand: 216, kick: 340, big: 470, head: 712, route: 872, bens: 1244, bar: 1362 };

const MOTION = `
const ease = (x) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
const seg = (t, a, b) => ease((t - a) / (b - a));
const fade = (sel, t, a, b, dy) => {
  document.querySelectorAll(sel).forEach((el, i) => {
    const v = seg(t, a + i * 0.28, b + i * 0.28);
    el.style.opacity = v;
    if (dy) el.style.transform = (el.dataset.base || '') + ' translateY(' + ((1 - v) * dy) + 'px)';
  });
};`;

async function shell(css, body, js, duration) {
  return `<!doctype html><html dir="rtl" lang="ar"><meta charset="utf-8"><style>
${await fontFaceCSS()}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1080px;height:1920px;overflow:hidden;background:#fff}
body{font-family:'Noto Kufi Arabic',sans-serif;-webkit-font-smoothing:antialiased}
.stage{position:relative;width:1080px;height:1920px;overflow:hidden;background:#fff}
.cover{width:100%;height:100%;object-fit:cover;display:block}
.tile{background:#000;border-radius:24px;width:104px;height:104px;overflow:hidden;display:inline-flex}
.tile img{width:100%;height:100%;object-fit:cover}
.brand{position:absolute;top:${SAFE.top}px;right:${SAFE.right}px;opacity:0;z-index:8}
.ben{display:flex;align-items:center;gap:10px;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.4);
  color:#fff;font-size:27px;font-weight:500;padding:14px 24px;border-radius:999px;opacity:0;white-space:nowrap}
.bens{position:absolute;top:${Y.bens}px;right:${SAFE.right}px;left:${SAFE.left}px;
  display:flex;align-items:center;justify-content:flex-end;gap:14px;z-index:7}
.bar{position:absolute;top:${Y.bar}px;right:${SAFE.right}px;left:${SAFE.left}px;display:flex;
  align-items:center;justify-content:space-between;opacity:0;z-index:7}
.site{background:${P.teal};color:#fff;font-size:38px;font-weight:800;padding:20px 44px;border-radius:999px;
  box-shadow:0 18px 38px rgba(0,166,166,.36)}
.bio{color:#eafafa;font-size:28px;font-weight:500}
${css}</style><body><div class="stage">${body}</div>
<script>${AUDIT_JS}${MOTION}
const D = ${duration};
${js}
window.__fit = () => ({ ok: true });
window.__seek(0);</script></body></html>`;
}

/* ═ ر١ — «الوجهة»: صورة كاملة، اسم المدينة يصعد، ثم المزايا ═ */
export async function reelDestination({ photo, copy, duration = 10 }) {
  const css = `
.ken{position:absolute;inset:-7%}
.ken img{width:100%;height:100%;object-fit:cover}
.scrim{position:absolute;inset:0;background:linear-gradient(180deg,rgba(4,44,50,.62) 0%,rgba(4,44,50,.12) 26%,rgba(4,44,50,.30) 56%,rgba(4,44,50,.92) 88%)}
.kick{position:absolute;top:${Y.kick}px;right:${SAFE.right}px;color:#bff0f0;font-size:34px;font-weight:600;letter-spacing:.14em;opacity:0}
.city{position:absolute;top:${Y.big}px;right:${SAFE.right}px;left:${SAFE.left}px;color:#fff;font-size:128px;
  font-weight:900;line-height:1.04;opacity:0;text-align:right;text-shadow:0 20px 60px rgba(0,0,0,.45)}
.hl{position:absolute;top:${Y.head}px;right:${SAFE.right}px;left:${SAFE.left}px;font-size:58px;font-weight:800;
  text-align:right;opacity:0;line-height:1.3}
.hl .lead{color:#fff} .hl .accent{color:#8ff0f0}
.rt{position:absolute;top:${Y.route}px;right:${SAFE.right}px;background:rgba(255,255,255,.18);
  border:1px solid rgba(255,255,255,.44);color:#fff;border-radius:999px;padding:16px 34px;font-size:30px;font-weight:700;
  display:flex;align-items:center;gap:14px;opacity:0}
.rt i{width:10px;height:10px;border-radius:50%;background:#8ff0f0;display:block}
.plane{position:absolute;top:${SAFE.top + 20}px;left:${SAFE.left}px;width:280px;opacity:0;
  filter:drop-shadow(0 20px 30px rgba(0,0,0,.45))}`;
  const body = `
<div class="ken" id="ken"><img src="data:image/jpeg;base64,${photo}"></div>
<div class="scrim"></div>
<div class="brand" id="brand" data-guard="الشعار"><span class="tile"><img src="${await logo()}"></span></div>
${copy.plane ? `<img class="plane" id="plane" data-guard="الطائرة" data-soft="1" src="${await plane(copy.plane)}">` : ''}
<div class="kick" id="kick" data-guard="اللافتة">${copy.label}</div>
<div class="city" id="city" data-guard="اسم المدينة">${copy.to}</div>
<div class="hl" id="hl" data-guard="العنوان">${`<span class="lead">${copy.headline[0]}</span> <span class="accent">${copy.headline[1]}</span>`}</div>
<div class="rt" id="rt" data-guard="المسار">${copy.from}<i></i>${copy.to}</div>
<div class="bens" data-guard="المزايا">${copy.benefits.map(b => `<span class="ben">${b}</span>`).join('')}</div>
<div class="bar" id="bar" data-guard="الشريط السفلي"><span class="site">${copy.site}</span><span class="bio">الرابط في البايو</span></div>`;
  const js = `
window.__seek = function (t) {
  const p = t / D;
  document.getElementById('ken').style.transform = 'scale(' + (1.05 + 0.12 * p) + ') translate(' + (-16 * p) + 'px,' + (-10 * p) + 'px)';
  fade('#brand', t, 0.2, 1.0, 0);
  fade('#plane', t, 0.6, 1.6, -30);
  fade('#kick', t, 0.9, 1.6, 22);
  fade('#city', t, 1.3, 2.4, 60);
  fade('#hl', t, 2.4, 3.4, 34);
  fade('#rt', t, 3.4, 4.2, 22);
  fade('.ben', t, 5.0, 5.8, 20);
  fade('#bar', t, 7.2, 8.2, 24);
};`;
  return shell(css, body, js, duration);
}

/* ═ ر٢ — «البطاقة»: بطاقة صعود تصعد وتستقر ═ */
export async function reelPass({ photo, copy, duration = 10 }) {
  const css = `
.ken{position:absolute;inset:-6%}
.ken img{width:100%;height:100%;object-fit:cover}
.scrim{position:absolute;inset:0;background:linear-gradient(180deg,rgba(4,44,50,.58),rgba(4,44,50,.14) 30%,rgba(4,44,50,.42) 60%,rgba(4,44,50,.94))}

.pass{position:absolute;top:640px;right:${SAFE.right - 130}px;left:${SAFE.left + 40}px;background:#fff;border-radius:34px;
  box-shadow:0 34px 70px rgba(0,0,0,.4);display:flex;overflow:hidden;opacity:0;height:330px}
.stub{width:210px;background:${P.mist};border-right:3px dashed ${P.line};display:flex;flex-direction:column;
  align-items:center;justify-content:space-between;padding:26px 18px}
.stubcode{color:${P.teal};font-size:40px;font-weight:800}
.bars{width:100%;height:92px;background:repeating-linear-gradient(90deg,${P.ink} 0 3px,transparent 3px 6px,${P.ink} 6px 8px,transparent 8px 14px)}
.pmain{flex:1;padding:30px 34px;display:flex;flex-direction:column;justify-content:space-between}
.prow{display:flex;justify-content:space-between;align-items:flex-end}
.pk{color:${P.deep};font-size:20px;font-weight:600;letter-spacing:.12em}
.pcity{color:${P.ink};font-size:52px;font-weight:800;line-height:1.1}
.par{color:#000;font-size:23px;margin-top:4px}
.parrow{color:${P.teal};font-size:34px;font-weight:800;padding-bottom:14px}
.hl{position:absolute;top:1046px;right:${SAFE.right}px;left:${SAFE.left}px;font-size:62px;font-weight:800;
  text-align:right;opacity:0;line-height:1.3}
.hl .lead{color:#fff} .hl .accent{color:#8ff0f0}
.kick{position:absolute;top:${Y.kick}px;right:${SAFE.right}px;color:#bff0f0;font-size:34px;font-weight:600;letter-spacing:.14em;opacity:0}
.plane{position:absolute;top:${SAFE.top + 20}px;left:${SAFE.left}px;width:300px;opacity:0;
  filter:drop-shadow(0 20px 30px rgba(0,0,0,.45))}`;
  const body = `
<div class="ken" id="ken"><img src="data:image/jpeg;base64,${photo}"></div>
<div class="scrim"></div>
<div class="brand" id="brand" data-guard="الشعار"><span class="tile"><img src="${await logo()}"></span></div>
<div class="kick" id="kick" data-guard="اللافتة">${copy.label}</div>
${copy.plane ? `<img class="plane" id="plane" data-guard="الطائرة" data-soft="1" src="${await plane(copy.plane)}">` : ''}
<div class="pass" id="pass" data-guard="البطاقة">
  <div class="stub"><div class="stubcode">${copy.toCode}</div><div class="bars"></div></div>
  <div class="pmain">
    <div class="prow"><span class="pk">بطاقة صعود</span><span class="pk">SOMADOS</span></div>
    <div class="prow">
      <div><div class="pcity">${copy.fromCode}</div><div class="par">${copy.from}</div></div>
      <div class="parrow">←</div>
      <div><div class="pcity">${copy.toCode}</div><div class="par">${copy.to}</div></div>
    </div>
  </div>
</div>
<div class="hl" id="hl" data-guard="العنوان">${`<span class="lead">${copy.headline[0]}</span> <span class="accent">${copy.headline[1]}</span>`}</div>
<div class="bens" data-guard="المزايا">${copy.benefits.map(b => `<span class="ben">${b}</span>`).join('')}</div>
<div class="bar" id="bar" data-guard="الشريط السفلي"><span class="site">${copy.site}</span><span class="bio">الرابط في البايو</span></div>`;
  const js = `
window.__seek = function (t) {
  const p = t / D;
  document.getElementById('ken').style.transform = 'scale(' + (1.04 + 0.10 * p) + ')';
  fade('#brand', t, 0.2, 1.0, 0);
  fade('#kick', t, 0.8, 1.5, 20);
  fade('#plane', t, 1.2, 2.2, -26);
  fade('#pass', t, 2.0, 3.2, 90);
  fade('#hl', t, 3.6, 4.6, 30);
  fade('.ben', t, 5.4, 6.2, 20);
  fade('#bar', t, 7.2, 8.2, 24);
};`;
  return shell(css, body, js, duration);
}

/* ═ ر٣ — «الثلاثية»: ثلاث مدن تدخل واحدة بعد أخرى ═ */
export async function reelTrio({ photos, copy, duration = 10 }) {
  const css = `
.bgw{position:absolute;inset:0;background:linear-gradient(170deg,#ffffff,#eefafa 60%,#dcf3f3)}

.arch{position:absolute;top:436px;border-radius:200px 200px 28px 28px;overflow:hidden;opacity:0;
  box-shadow:0 26px 54px rgba(6,60,62,.26);border:8px solid #fff}
.a1{right:${SAFE.right - 10}px;width:320px;height:520px}
.a2{right:${SAFE.right + 320}px;width:320px;height:600px;top:376px}
.a3{right:${SAFE.right + 650}px;width:320px;height:520px}
.cap{position:absolute;right:0;left:0;bottom:0;padding:22px 0 18px;text-align:center;
  background:linear-gradient(180deg,rgba(4,53,61,0),rgba(4,53,61,.86));color:#fff;font-size:34px;font-weight:700}
.kick{position:absolute;top:${Y.kick}px;right:${SAFE.right}px;color:${P.deep};font-size:32px;font-weight:600;letter-spacing:.14em;opacity:0}
.hl{position:absolute;top:1040px;right:${SAFE.right}px;left:${SAFE.left}px;font-size:66px;font-weight:800;
  text-align:right;opacity:0;line-height:1.3}
.hl .lead{color:${P.ink}} .hl .accent{color:${P.teal}}
.sub{position:absolute;top:1160px;right:${SAFE.right}px;left:${SAFE.left}px;color:#000;font-size:30px;text-align:right;opacity:0}
.ben{background:${P.mist};border-color:${P.line};color:#000}
.bio{color:${P.deep}}`;
  const body = `
<div class="bgw"></div>
<div class="brand" id="brand" data-guard="الشعار"><span class="tile"><img src="${await logo()}"></span></div>
<div class="kick" id="kick" data-guard="اللافتة">${copy.label}</div>
${copy.cities.map((c, i) => `<div class="arch a${i + 1}"><img class="cover" src="data:image/jpeg;base64,${photos[i]}"><div class="cap">${c.ar}</div></div>`).join('')}
<div class="hl" id="hl" data-guard="العنوان">${`<span class="lead">${copy.headline[0]}</span> <span class="accent">${copy.headline[1]}</span>`}</div>
<div class="sub" id="sub" data-guard="السطر">${copy.sub}</div>
<div class="bens" data-guard="المزايا">${copy.benefits.map(b => `<span class="ben">${b}</span>`).join('')}</div>
<div class="bar" id="bar" data-guard="الشريط السفلي"><span class="site">${copy.site}</span><span class="bio">الرابط في البايو</span></div>`;
  const js = `
window.__seek = function (t) {
  fade('#brand', t, 0.2, 1.0, 0);
  fade('#kick', t, 0.7, 1.4, 18);
  fade('.arch', t, 1.2, 2.0, 70);
  fade('#hl', t, 3.4, 4.4, 30);
  fade('#sub', t, 4.2, 5.0, 22);
  fade('.ben', t, 5.6, 6.4, 18);
  fade('#bar', t, 7.2, 8.2, 24);
};`;
  return shell(css, body, js, duration);
}

/* ═ ر٤ — «الحروف»: اسم المدينة والصورة داخل حروفه ═ */
export async function reelWord({ photo, copy, duration = 10 }) {
  const css = `
.bgw{position:absolute;inset:0;background:linear-gradient(170deg,#ffffff,#f1fbfb 55%,#dff4f4)}
.pic{position:absolute;top:336px;right:${SAFE.right}px;left:${SAFE.left}px;height:436px;border-radius:36px;
  overflow:hidden;opacity:0;box-shadow:0 28px 58px rgba(6,60,62,.24)}


.word{position:absolute;top:876px;right:${SAFE.right}px;left:${SAFE.left}px;text-align:center;font-weight:900;
  font-size:126px;line-height:1.05;color:transparent;-webkit-background-clip:text;background-clip:text;
  background-size:cover;background-position:center;opacity:0;white-space:nowrap;-webkit-text-stroke:2px rgba(0,105,107,.55)}


.rule{position:absolute;top:1066px;right:${SAFE.right + 130}px;left:${SAFE.left + 130}px;height:8px;
  border-radius:4px;background:${P.teal};opacity:0}
.hl{position:absolute;top:1110px;right:${SAFE.right}px;left:${SAFE.left}px;font-size:54px;font-weight:800;
  text-align:center;opacity:0;line-height:1.3}
.hl .lead{color:${P.ink}} .hl .accent{color:${P.teal}}
.ben{background:${P.mist};border-color:${P.line};color:#000}
.bens{align-items:center}
.bio{color:${P.deep}}
.plane{position:absolute;top:806px;left:${SAFE.left}px;width:236px;opacity:0;
  filter:drop-shadow(0 18px 28px rgba(6,60,62,.3))}`;
  const body = `
<div class="bgw"></div>
<div class="brand" id="brand" data-guard="الشعار"><span class="tile"><img src="${await logo()}"></span></div>
<div class="pic" id="pic" data-guard="الصورة"><img class="cover" src="data:image/jpeg;base64,${photo}"></div>
<div class="word" id="word" data-guard="اسم المدينة" style="background-image:url(data:image/jpeg;base64,${photo})">${copy.to}</div>
<div class="rule" id="rule"></div>
<div class="hl" id="hl" data-guard="العنوان">${`<span class="lead">${copy.headline[0]}</span> <span class="accent">${copy.headline[1]}</span>`}</div>
<div class="bens" data-guard="المزايا">${copy.benefits.map(b => `<span class="ben">${b}</span>`).join('')}</div>
<div class="bar" id="bar" data-guard="الشريط السفلي"><span class="site">${copy.site}</span><span class="bio">الرابط في البايو</span></div>`;
  const js = `
window.__seek = function (t) {
  const p = t / D;
  const w = document.getElementById('word');
  w.style.backgroundPosition = (50 + 14 * p) + '% ' + (50 - 8 * p) + '%';
  fade('#brand', t, 0.2, 1.0, 0);
  fade('#pic', t, 0.7, 1.7, 40);
  fade('#word', t, 2.2, 3.4, 44);
  fade('#rule', t, 3.6, 4.2, 0);
  fade('#hl', t, 4.0, 5.0, 26);
  fade('.ben', t, 5.8, 6.6, 18);
  fade('#bar', t, 7.2, 8.2, 24);
};`;
  return shell(css, body, js, duration);
}

export const REELS = { reelDestination, reelPass, reelTrio, reelWord };
