// القوالب الأربعة. كل قالب يبني مستند HTML كاملاً؛ Chromium يطبع النص.
// مبني على ما وافق عليه خالد: اسم المدينة وحده عنواناً، ولافتة صغيرة فوقه،
// ومنطقتا نص لا أربع — لا جملة خبرية ولا ستارة سوداء على نصف الصورة.

import { fontFaceCSS, assetDataURI } from './render.mjs';

let logoCache = null;
const logo = async () => (logoCache ??= await assetDataURI('assets/logo-wordmark.png'));
let planeCache = {};
const plane = async (n) => (planeCache[n] ??= await assetDataURI(`assets/props/trim/${n}`));

const P = {
  teal: '#00a6a6', deep: '#00696b', dark: '#04353d',
  ink: '#0b1416', paper: '#f2ede3'
};

/** يصغّر العنوان الضخم حتى يدخل داخل إطاره — يُستدعى بعد جاهزية الخط. */
const FIT = `
window.__fit = function () {
  const el = document.querySelector('[data-fit]');
  if (!el) return { ok: true };
  const max = Number(el.dataset.fit);
  const room = Number(el.dataset.room);
  let size = max;
  el.style.fontSize = size + 'px';
  let guard = 0;
  while (el.scrollWidth > room && size > 40 && guard++ < 80) {
    size -= 4;
    el.style.fontSize = size + 'px';
  }
  const ghost = document.querySelector('[data-ghost]');
  if (ghost) ghost.style.fontSize = size + 'px';
  return { ok: el.scrollWidth <= room + 2, size, width: el.scrollWidth, room };
};`;

async function shell(size, css, body, extraJS = '') {
  return `<!doctype html><html dir="rtl" lang="ar"><meta charset="utf-8"><style>
${await fontFaceCSS()}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${size.w}px;height:${size.h}px;overflow:hidden}
body{font-family:'Tajawal',sans-serif;-webkit-font-smoothing:antialiased;background:#fff}
.stage{position:relative;width:${size.w}px;height:${size.h}px;overflow:hidden}
.cover{width:100%;height:100%;object-fit:cover;display:block}
.tile{background:${P.ink};border-radius:14px;padding:12px 20px;display:inline-flex;align-items:center}
.tile img{height:26px;display:block}
${css}</style><body><div class="stage">${body}</div><script>${FIT}${extraJS}</script></body></html>`;
}

/* ═════ A — الوجهة: صورة كاملة، اسم المدينة ضخماً، مسار منقّط ═════ */
export async function destination({ size, photo, copy }) {
  const css = `
.wash{position:absolute;inset:0;background:linear-gradient(180deg,rgba(6,20,22,.62) 0%,rgba(6,20,22,.22) 22%,rgba(6,20,22,0) 40%,rgba(6,20,22,.14) 60%,rgba(6,20,22,.78) 100%)}
.top{position:absolute;top:46px;right:52px;left:52px;display:flex;align-items:center;justify-content:space-between}
.tag{color:#fff;font-size:22px;font-weight:400;letter-spacing:.14em;text-shadow:0 2px 12px rgba(0,0,0,.6)}
.route{position:absolute;top:208px;right:0;left:0;height:150px}
.rl{position:absolute;color:#fff;font-size:26px;font-weight:500;text-shadow:0 2px 14px rgba(0,0,0,.55)}
.chip{position:absolute;top:268px;right:56px;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.34);
  color:#fff;font-size:24px;font-weight:500;padding:12px 26px;border-radius:999px;backdrop-filter:blur(6px)}
.giant,.ghost{position:absolute;top:462px;right:56px;font-weight:900;line-height:.92;white-space:nowrap;transform-origin:right center}
.giant{color:#fff;transform:rotate(-5.5deg);text-shadow:0 18px 60px rgba(0,0,0,.45)}
.ghost{color:transparent;-webkit-text-stroke:2px rgba(255,255,255,.32);transform:rotate(-5.5deg) translate(26px,26px)}
.latin{position:absolute;top:742px;right:70px;color:#fff;font-size:26px;font-weight:500;letter-spacing:.42em;transform:rotate(-5.5deg);text-shadow:0 2px 16px rgba(0,0,0,.65)}
.plane{position:absolute;top:868px;left:-60px;width:660px;transform:rotate(6deg);filter:drop-shadow(0 26px 46px rgba(0,0,0,.45))}
.bar{position:absolute;bottom:0;right:0;left:0;height:116px;background:rgba(255,255,255,.95);
  display:flex;align-items:center;justify-content:space-between;padding:0 52px}
.site{color:${P.ink};font-size:30px;font-weight:700}
.badges{display:flex;gap:30px}
.badge{display:flex;align-items:center;gap:10px;color:#4a5558;font-size:21px;font-weight:500}
.bdot{width:30px;height:30px;border-radius:50%;background:${P.teal}1f;display:flex;align-items:center;justify-content:center}
.bdot i{width:11px;height:11px;border-radius:50%;background:${P.teal};display:block}`;

  const body = `
<img class="cover" src="data:image/jpeg;base64,${photo}">
<div class="wash"></div>
<div class="top"><span class="tile"><img src="${await logo()}"></span><span class="tag">${copy.tagline}</span></div>
${copy.noRoute ? '' : `<svg class="route" viewBox="0 0 1080 150" fill="none">
  <path d="M170 104 C 360 20, 700 22, 916 86" stroke="rgba(255,255,255,.85)" stroke-width="3" stroke-dasharray="2 13" stroke-linecap="round"/>
  <circle cx="916" cy="86" r="9" fill="#fff"/><circle cx="170" cy="104" r="9" fill="${P.teal}"/>
  <g transform="translate(540,26) rotate(6)"><path d="M0 10 L34 0 L28 12 L52 10 L28 18 L34 28 Z" fill="#fff"/></g>
</svg>
<div class="rl" style="top:294px;right:52px">${copy.from}</div>
<div class="rl" style="top:316px;left:56px">${copy.to}</div>`}
${copy.chip ? `<div class="chip">${copy.chip}</div>` : ''}
<div class="ghost" data-ghost style="font-size:188px">${copy.to}</div>
<div class="giant" data-fit="188" data-room="900" style="font-size:188px">${copy.to}</div>
${copy.latin ? `<div class="latin">${copy.latin.split('').join(' ')}</div>` : ''}
${copy.plane ? `<img class="plane" src="${await plane(copy.plane)}">` : ''}
<div class="bar">
  <span class="site">${copy.site}</span>
  <span class="badges">${copy.badges.map(b => `<span class="badge"><span class="bdot"><i></i></span>${b}</span>`).join('')}</span>
</div>`;
  return shell(size, css, body);
}

/* ═════ B — بطاقة الصعود: إطار صورة وبطاقة ورقية ═════ */
export async function boarding({ size, photo, copy }) {
  const css = `
body,.stage{background:${P.paper}}
.paper{position:absolute;inset:0;background:radial-gradient(120% 80% at 50% 0%,#fbf8f1 0%,#ece5d7 70%,#e5ddcc 100%)}
.frame{position:absolute;top:96px;right:64px;left:64px;height:660px;border-radius:26px;overflow:hidden;box-shadow:0 34px 70px rgba(30,25,15,.24)}
.kicker{position:absolute;top:34px;right:64px;color:#8a8070;font-size:21px;font-weight:500;letter-spacing:.24em}
.brand{position:absolute;top:24px;left:64px}
.plane{position:absolute;top:612px;left:10px;width:520px;z-index:2;transform:rotate(-7deg);filter:drop-shadow(0 22px 40px rgba(30,25,15,.32))}
.pass{position:absolute;bottom:170px;right:64px;left:64px;height:322px;background:#fff;border-radius:22px;z-index:3;
  box-shadow:0 26px 54px rgba(30,25,15,.2);display:flex;overflow:hidden}
.pmain{flex:1;padding:34px 40px}
.ptop{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #eceae4;padding-bottom:18px}
.plabel{color:#9aa0a2;font-size:18px;font-weight:500;letter-spacing:.2em}
.cities{display:flex;align-items:flex-end;gap:26px;margin-top:26px}
.city{font-size:64px;font-weight:800;color:${P.ink};line-height:1}
.ar{font-size:24px;font-weight:500;color:#6f7678;margin-top:8px}
.arrow{color:${P.teal};font-size:40px;padding-bottom:14px}
.meta{display:flex;gap:56px;margin-top:30px}
.mk{color:#9aa0a2;font-size:17px;font-weight:500;letter-spacing:.14em}
.mv{color:${P.ink};font-size:26px;font-weight:700;margin-top:6px}
.stub{width:230px;border-right:3px dashed #e2ddd2;padding:30px 24px;display:flex;flex-direction:column;
  align-items:center;justify-content:space-between;background:#fcfbf8}
.bars{width:100%;height:96px;background:repeating-linear-gradient(90deg,${P.ink} 0 3px,transparent 3px 6px,${P.ink} 6px 8px,transparent 8px 14px)}
.stubcode{font-size:40px;font-weight:800;color:${P.ink};letter-spacing:.06em}
.notch{position:absolute;width:34px;height:34px;border-radius:50%;background:#efe9de;z-index:4}
.foot{position:absolute;bottom:64px;right:64px;left:64px;display:flex;align-items:center;justify-content:space-between}
.fs{color:${P.ink};font-size:28px;font-weight:700}
.fw{color:#7d8486;font-size:23px;font-weight:400}`;

  const body = `
<div class="paper"></div>
<div class="kicker">${copy.kicker}</div>
<div class="brand"><span class="tile"><img src="${await logo()}"></span></div>
<div class="frame"><img class="cover" src="data:image/jpeg;base64,${photo}"></div>
${copy.plane ? `<img class="plane" src="${await plane(copy.plane)}">` : ''}
<div class="pass">
  <div class="stub"><div class="stubcode">${copy.toCode}</div><div class="bars"></div></div>
  <div class="pmain">
    <div class="ptop"><span class="plabel">بطاقة صعود</span><span class="plabel">SOMADOS</span></div>
    <div class="cities">
      <div><div class="city">${copy.fromCode}</div><div class="ar">${copy.from}</div></div>
      <div class="arrow">✈</div>
      <div><div class="city">${copy.toCode}</div><div class="ar">${copy.to}</div></div>
    </div>
    <div class="meta">${copy.meta.map(m => `<div><div class="mk">${m.k}</div><div class="mv">${m.v}</div></div>`).join('')}</div>
  </div>
</div>
<div class="notch" style="bottom:476px;left:246px"></div>
<div class="notch" style="bottom:154px;left:246px"></div>
<div class="foot"><span class="fs">${copy.site}</span><span class="fw">واتساب ‎${copy.whatsapp}</span></div>`;
  return shell(size, css, body);
}

/* ═════ C — الأقواس: ثلاث وجهات ═════ */
export async function arches({ size, photos, copy }) {
  const css = `
.bg{position:absolute;inset:0;background:linear-gradient(170deg,${P.dark} 0%,#065c63 46%,#0a7f85 100%)}
.glow{position:absolute;inset:0;background:radial-gradient(60% 40% at 50% 26%,rgba(0,220,220,.30),transparent 70%)}
.brand{position:absolute;top:56px;right:0;left:0;display:flex;justify-content:center}
.arches{position:absolute;top:232px;right:0;left:0;display:flex;align-items:flex-end;justify-content:center;gap:26px}
.arch{position:relative;border-radius:190px 190px 22px 22px;overflow:hidden;box-shadow:0 28px 56px rgba(0,0,0,.34)}
.a1,.a3{width:296px;height:520px}
.a2{width:316px;height:610px}
.cap{position:absolute;right:0;left:0;bottom:0;padding:26px 0 20px;text-align:center;
  background:linear-gradient(180deg,rgba(2,30,34,0),rgba(2,30,34,.86))}
.cn{color:#fff;font-size:38px;font-weight:700;line-height:1.1}
.cc{color:rgba(255,255,255,.72);font-size:16px;font-weight:400;letter-spacing:.34em;margin-top:8px}
.lead{position:absolute;bottom:196px;right:90px;left:90px;text-align:center;color:#fff;font-size:44px;font-weight:300;line-height:1.55}
.lead b{font-weight:800}
.rule{position:absolute;bottom:150px;right:420px;left:420px;height:2px;background:rgba(255,255,255,.28)}
.foot{position:absolute;bottom:70px;right:0;left:0;text-align:center;color:rgba(255,255,255,.9);font-size:26px;font-weight:500}`;

  const cls = ['a1', 'a2', 'a3'];
  const body = `
<div class="bg"></div><div class="glow"></div>
<div class="brand"><span class="tile" style="background:rgba(255,255,255,.12)"><img src="${await logo()}"></span></div>
<div class="arches">
  ${copy.cities.map((c, i) => `<div class="arch ${cls[i]}"><img class="cover" src="data:image/jpeg;base64,${photos[i]}">
    <div class="cap"><div class="cn">${c.ar}</div><div class="cc">${c.code}</div></div></div>`).join('')}
</div>
<div class="lead">${copy.lead[0]}<br><b>${copy.lead[1]}</b></div>
<div class="rule"></div>
<div class="foot">${copy.site}</div>`;
  return shell(size, css, body);
}

/* ═════ D — المروحة: الخدمات كلها ═════ */
export async function fan({ size, photos, copy }) {
  const css = `
.bg{position:absolute;inset:0;background:linear-gradient(180deg,#f4fbfb 0%,#dff2f3 44%,#bfe6e8 100%)}
.halo{position:absolute;inset:0;background:radial-gradient(52% 34% at 50% 30%,rgba(255,255,255,.9),transparent 70%)}
.brand{position:absolute;top:52px;right:0;left:0;display:flex;justify-content:center}
.fan{position:absolute;top:186px;right:0;left:0;height:430px}
.petal{position:absolute;top:0;right:50%;width:248px;height:338px;overflow:hidden;border:5px solid #fff;
  border-radius:54% 54% 44% 44% / 62% 62% 38% 38%;transform-origin:50% 636px;box-shadow:0 20px 38px rgba(10,60,64,.26)}
.plane{position:absolute;top:556px;right:50%;width:720px;transform:translateX(50%);filter:drop-shadow(0 30px 44px rgba(10,60,64,.28))}
.veil{position:absolute;right:0;left:0;bottom:0;height:420px;background:linear-gradient(180deg,rgba(214,238,239,0),rgba(226,243,244,.92) 46%,#e3f3f4 100%)}
.head{position:absolute;bottom:276px;right:70px;left:70px;text-align:center;color:${P.ink};font-size:62px;font-weight:800;line-height:1.28}
.head span{color:${P.deep}}
.sub{position:absolute;bottom:206px;right:0;left:0;text-align:center;color:#5d696b;font-size:28px;font-weight:300}
.pill{position:absolute;bottom:82px;right:50%;transform:translateX(50%);background:${P.ink};color:#fff;border-radius:999px;
  padding:20px 40px;display:flex;align-items:center;gap:22px;font-size:26px;font-weight:500;box-shadow:0 18px 34px rgba(10,60,64,.28)}
.pill b{font-weight:800}
.pill i{width:8px;height:8px;border-radius:50%;background:${P.teal};display:block}`;

  const body = `
<div class="bg"></div><div class="halo"></div>
<div class="brand"><span class="tile"><img src="${await logo()}"></span></div>
<div class="fan">${photos.map((p, i) => {
    const rot = (i - (photos.length - 1) / 2) * 17;
    return `<div class="petal" style="transform:translateX(50%) rotate(${rot}deg)"><img class="cover" src="data:image/jpeg;base64,${p}"></div>`;
  }).join('')}</div>
<img class="plane" src="${await plane(copy.plane || 'plane-cut-14.png')}">
<div class="veil"></div>
<div class="head">${copy.head[0]} <span>${copy.head[1]}</span></div>
<div class="sub">${copy.sub}</div>
<div class="pill"><b>${copy.site}</b><i></i><span>‎${copy.whatsapp}</span></div>`;
  return shell(size, css, body);
}

/* ═════ الريل: ١٠ ثوانٍ، 1080×1920 ═════
   الحركة كلها دالة في الزمن: __seek(t) يرسم اللحظة t بلا اعتماد على مؤقّت،
   فكل إطار قابل لإعادة الإنتاج بالضبط. النص داخل مناطق انستقرام الآمنة:
   210 من الأعلى، 440 من الأسفل، 250 يميناً (أزرار التفاعل)، 60 يساراً. */
export async function reel({ photo, copy, duration = 10 }) {
  const size = { w: 1080, h: 1920 };
  const css = `
.ken{position:absolute;inset:-6%;will-change:transform}
.ken img{width:100%;height:100%;object-fit:cover;display:block}
.wash{position:absolute;inset:0;background:linear-gradient(180deg,rgba(6,20,22,.66) 0%,rgba(6,20,22,.16) 26%,rgba(6,20,22,0) 44%,rgba(6,20,22,.30) 66%,rgba(6,20,22,.88) 100%)}
.brand{position:absolute;top:214px;right:60px;opacity:0}
.kick{position:absolute;top:340px;right:60px;color:#fff;font-size:34px;font-weight:400;letter-spacing:.12em;opacity:0;
  text-shadow:0 2px 16px rgba(0,0,0,.6)}
.giant{position:absolute;top:700px;right:60px;left:250px;color:#fff;font-weight:900;font-size:180px;line-height:.94;
  opacity:0;text-shadow:0 20px 60px rgba(0,0,0,.5);white-space:nowrap}
.latin{position:absolute;top:920px;right:64px;color:#fff;font-size:30px;font-weight:500;opacity:0;text-shadow:0 2px 14px rgba(0,0,0,.6)}
.route{position:absolute;top:1090px;right:60px;left:250px;height:140px}
.chips{position:absolute;bottom:470px;right:60px;left:250px;display:flex;flex-direction:column;gap:18px;align-items:flex-start}
.chip{background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.34);color:#fff;font-size:30px;font-weight:500;
  padding:14px 30px;border-radius:999px;opacity:0;transform:translateY(16px)}
.bar{position:absolute;bottom:0;right:0;left:0;height:300px;background:linear-gradient(180deg,rgba(255,255,255,0),#fff 38%);
  display:flex;flex-direction:column;align-items:center;justify-content:flex-end;padding-bottom:96px;gap:10px;opacity:0}
.site{color:${P.ink};font-size:46px;font-weight:800}
.wa{color:#5d696b;font-size:30px;font-weight:400}`;

  const body = `
<div class="ken" id="ken"><img src="data:image/jpeg;base64,${photo}"></div>
<div class="wash"></div>
<div class="brand" id="brand"><span class="tile" style="padding:16px 26px"><img src="${await logo()}" style="height:34px"></span></div>
<div class="kick" id="kick">${copy.kicker}</div>
<div class="giant" id="giant" data-fit="180" data-room="770">${copy.to}</div>
<div class="latin" id="latin">${copy.latin ? copy.latin.split('').join(' ') : ''}</div>
<svg class="route" id="route" viewBox="0 0 770 140" fill="none">
  <path id="line" d="M40 104 C 220 20, 520 22, 730 74" stroke="rgba(255,255,255,.9)" stroke-width="4" stroke-dasharray="3 16" stroke-linecap="round"/>
  <circle cx="730" cy="74" r="11" fill="#fff"/><circle cx="40" cy="104" r="11" fill="${P.teal}"/>
  <g id="jet"><path d="M0 12 L40 0 L33 14 L60 12 L33 21 L40 33 Z" fill="#fff"/></g>
</svg>
<div class="chips">${copy.badges.map((b, i) => `<span class="chip" id="chip${i}">${b}</span>`).join('')}</div>
<div class="bar" id="bar"><span class="site">${copy.site}</span><span class="wa">واتساب ‎${copy.whatsapp}</span></div>`;

  const js = `
const D = ${duration};
const ease = (x) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
const seg = (t, a, b) => ease((t - a) / (b - a));
const jetPath = document.getElementById('line');
window.__seek = function (t) {
  const k = document.getElementById('ken');
  const p = t / D;
  k.style.transform = 'scale(' + (1.06 + 0.10 * p) + ') translate(' + (-14 * p) + 'px,' + (-10 * p) + 'px)';

  const fade = (el, a, b, dy) => {
    const v = seg(t, a, b);
    el.style.opacity = v;
    if (dy) el.style.transform = 'translateY(' + ((1 - v) * dy) + 'px)';
  };
  fade(document.getElementById('brand'), 0.2, 1.0, 0);
  fade(document.getElementById('kick'), 0.7, 1.5, 26);
  fade(document.getElementById('giant'), 1.1, 2.2, 46);
  fade(document.getElementById('latin'), 2.1, 3.0, 18);

  const draw = seg(t, 3.0, 4.8);
  const len = jetPath.getTotalLength();
  jetPath.style.strokeDasharray = '3 16';
  jetPath.style.opacity = draw;
  const jet = document.getElementById('jet');
  const pt = jetPath.getPointAtLength(len * Math.min(1, draw));
  jet.setAttribute('transform', 'translate(' + (pt.x - 30) + ',' + (pt.y - 16) + ') rotate(-6)');
  jet.style.opacity = draw;
  document.querySelectorAll('.chip').forEach((el, i) => fade(el, 5.0 + i * 0.5, 5.8 + i * 0.5, 16));
  fade(document.getElementById('bar'), 7.0, 8.2, 0);
};
window.__fit && window.__fit();
window.__seek(0);`;

  return shell(size, css, body, js);
}

export const LAYOUTS = { destination, boarding, arches, fan };

export async function buildPostHTML({ layout, size, photos, copy }) {
  const fn = LAYOUTS[layout];
  if (!fn) throw new Error('قالب غير معروف: ' + layout);
  return fn({ size, photo: photos[0], photos, copy });
}
