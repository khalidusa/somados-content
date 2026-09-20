// محرك التصميم — القسم ٤.٤. النص يُطبع هنا بـHTML/CSS، لا يولّده موديل الصور أبداً.
const { fontFaceCSS, logoWordmark } = require('./fonts');

const BRAND = {
  teal: '#00a6a6',
  tealDeep: '#007a7a',   // 5.2:1 على الأبيض — للنصوص والتعبئة
  tealLight: '#00c8c8',
  text: '#1D1D1F',
  ink: '#0b1416',
  radius: 18,
  site: 'somados.com',
};

const SIZES = {
  post: { w: 1080, h: 1350 },   // فيسبوك وانستغرام فيد
  reel: { w: 1080, h: 1920 },   // ريلز
};

// المناطق الآمنة لواجهة انستغرام على 1080×1920 (القسم ٥.٤)
const REEL_SAFE = { top: 210, bottom: 440, right: 230, left: 60 };

const TINT = { teal: 0.09, neutral: 0.05, moody: 0.07 };   // سقف 9% — أكثر يخلي الصورة أحادية اللون

function buildHTML(post, { size = 'post', background, safeGuides = false } = {}) {
  const { w, h } = SIZES[size];
  const isReel = size === 'reel';
  const padT = isReel ? REEL_SAFE.top : 64;
  const padR = isReel ? REEL_SAFE.right : 64;
  const padB = isReel ? REEL_SAFE.bottom : 64;
  const padL = isReel ? REEL_SAFE.left : 64;
  const pad = `${padT}px ${padR}px ${padB}px ${padL}px`;
  const tint = TINT[post.palette?.id] ?? 0.07;

  // بلا أسهم: السهم داخل نص عربي يقلب اتجاهه بصرياً حسب المحارف حوله ويصير المسار ملتبساً.
  // كلمات صريحة = صفر التباس، وأنسب لنبرة راقية.
  const kicker = post.market === 'visa'
    ? `${post.flag} ${post.subject}`
    : post.lang === 'ku'
      ? `لە ${post.fromKu} بۆ ${post.toKu}`
      : `من ${post.fromAr} إلى ${post.toAr}`;

  const esc = (s) => String(s ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

  return `<!doctype html><html dir="rtl" lang="${post.lang === 'ku' ? 'ckb' : 'ar'}"><head><meta charset="utf-8">
<style>
${fontFaceCSS()}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${w}px;height:${h}px;overflow:hidden}
body{font-family:'Tajawal',sans-serif;background:${BRAND.ink};-webkit-font-smoothing:antialiased}
.frame{position:relative;width:${w}px;height:${h}px;overflow:hidden}
.bg{position:absolute;inset:0;background-size:cover;background-position:center}
.tint{position:absolute;inset:0;background:${BRAND.teal};opacity:${tint};mix-blend-mode:color}
.scrim{position:absolute;inset:0;background:
  linear-gradient(to top, rgba(6,14,16,.92) 0%, rgba(6,14,16,.72) 22%, rgba(6,14,16,.18) 52%, rgba(6,14,16,.34) 100%)}
/* كل شي بالتدفق الطبيعي داخل حاوية واحدة — لا عناصر مطلقة فوق بعضها (القسم ٥.٣) */
.stack{position:absolute;inset:0;padding:${pad};display:flex;flex-direction:column;justify-content:space-between}
.brandbar{display:flex;align-items:center;gap:18px;align-self:flex-start;
  padding:14px 22px;border-radius:${BRAND.radius}px;
  background:rgba(8,18,20,.55);backdrop-filter:blur(18px);
  border:1px solid rgba(255,255,255,.14)}
.brandbar img{height:34px;display:block}
.body{display:flex;flex-direction:column;gap:22px;min-height:0}
.body>*{flex-shrink:0}   /* بلا هذا تنكمش العناصر بدل أن تفيض */
.kicker{display:inline-flex;align-self:flex-start;align-items:center;gap:12px;
  padding:10px 20px;border-radius:999px;
  background:rgba(0,200,200,.16);border:1px solid rgba(0,200,200,.42);
  color:#bdfbfb;font-weight:700;font-size:34px;letter-spacing:.2px}
h1{color:#fff;font-weight:800;line-height:1.18;letter-spacing:-.5px;
  font-size:${isReel ? 86 : 78}px;text-wrap:balance;
  text-shadow:0 2px 24px rgba(0,0,0,.45)}
.sub{color:rgba(255,255,255,.82);font-weight:400;font-size:${isReel ? 40 : 36}px;line-height:1.5;max-width:${isReel ? 700 : 860}px}
.foot{display:flex;align-items:center;gap:16px;padding-top:26px;
  border-top:1px solid rgba(255,255,255,.18)}
.dot{width:10px;height:10px;border-radius:50%;background:${BRAND.tealLight};box-shadow:0 0 14px ${BRAND.tealLight}}
.site{color:#fff;font-weight:700;font-size:38px;letter-spacing:.4px;direction:ltr}
${safeGuides ? `.guide{position:absolute;background:rgba(255,0,0,.28);pointer-events:none}
.g-top{top:0;left:0;right:0;height:${REEL_SAFE.top}px}
.g-bottom{bottom:0;left:0;right:0;height:${REEL_SAFE.bottom}px}
.g-right{top:0;bottom:0;right:0;width:${REEL_SAFE.right}px}` : ''}
</style></head><body>
<div class="frame">
  <div class="bg" id="bg" style="background-image:url('${background}')"></div>
  <div class="tint"></div><div class="scrim"></div>
  <div class="stack">
    <div class="brandbar"><img src="${logoWordmark()}" alt=""></div>
    <div class="body">
      <span class="kicker">${esc(kicker)}</span>
      <h1 id="headline">${esc(post.headline)}</h1>
      ${post.sub ? `<p class="sub">${esc(post.sub)}</p>` : ''}
      <div class="foot"><span class="dot"></span><span class="site">${BRAND.site}</span></div>
    </div>
  </div>
  ${safeGuides ? '<div class="guide g-top"></div><div class="guide g-bottom"></div><div class="guide g-right"></div>' : ''}
</div>
<script>
// IIFE — متغيرات الصفحة ما تتسرب بين المستندات (القسم ٥.٣، تلوث سياق Chromium)
(function () {
  var FRAME_H = ${h}, PAD_B = ${padB}, MIN = 34;
  // لا يُستدعى عند التحميل: القياس قبل جاهزية الخط يقرأ ترتيب الخط الاحتياطي،
  // ثم يعيد المتصفح الترتيب بعد رسم Tajawal فيخرج الفوتر خارج الإطار بلا ما يشعر الحارس.
  // render.js ينادي هذه الدالة بعد document.fonts.ready.
  window.__fitText = function () {
    var h = document.getElementById('headline');
    var foot = document.querySelector('.foot');
    var brand = document.querySelector('.brandbar');
    var kicker = document.querySelector('.kicker');
    function bad() {
      return foot.getBoundingClientRect().bottom > FRAME_H - PAD_B + 1
          || kicker.getBoundingClientRect().top < brand.getBoundingClientRect().bottom + 20;
    }
    var size = parseFloat(getComputedStyle(h).fontSize), guard = 0;
    while (bad() && size > MIN && guard++ < 140) { size -= 2; h.style.fontSize = size + 'px'; }
    var fb = foot.getBoundingClientRect();
    return (window.__fit = {
      finalFontSize: size, shrunk: guard,
      footBottom: Math.round(fb.bottom), limit: FRAME_H - PAD_B,
      overflow: bad(),
    });
  };
})();
</script></body></html>`;
}

module.exports = { buildHTML, BRAND, SIZES, REEL_SAFE };
