#!/usr/bin/env node
// التنسيق الكامل. --placeholder يشغّل كل الخط بلا Cloudflare ولا صرف نيورون واحد.
const fs = require('fs');
const path = require('path');
const { plan } = require('../src/matrix');
const { buildCopy, assertClean } = require('../src/copy');
const { launch, renderHTML } = require('../src/render');
const { buildHTML } = require('../src/design');
const { placeholder } = require('../src/placeholder');
const { buildReel } = require('../src/reel');
const state = require('../src/state');
const { todayBaghdad, addDays } = require('../src/schedule');

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > -1 ? process.argv[i + 1] : d; };
const has = (k) => process.argv.includes(k);

const START = arg('--start', todayBaghdad());
const DAYS = Number(arg('--days', 30));
const USE_PLACEHOLDER = has('--placeholder');
const SKIP_REELS = has('--no-reels');

const root = path.join(__dirname, '..');
const rel = (p) => path.relative(root, p);

async function backgroundFor(post, raw) {
  if (USE_PLACEHOLDER) return placeholder(post.palette.id === 'neutral' ? 'light' : 'dark',
                                          Number(post.date.replace(/-/g, '')) % 97);
  return 'data:image/png;base64,' + fs.readFileSync(raw).toString('base64');
}

(async () => {
  const s = state.load();
  const posts = buildCopy(plan(START, DAYS), { commit: true });
  posts.forEach(assertClean);                       // لا ينشر شي قبل ما يمر الحارس

  const images = posts.filter(p => p.kind === 'image');
  const reels = posts.filter(p => p.kind === 'reel');
  const browser = await launch();
  let madeI = 0, madeR = 0, skipped = 0;
  const t0 = Date.now();

  try {
    for (const p of images) {
      if (state.doneImage(s, p.date)) { skipped++; continue; }
      const rawDir = path.join(root, 'content', 'raw');
      fs.mkdirSync(rawDir, { recursive: true });
      const rawFile = path.join(rawDir, `${p.date}.png`);

      if (!USE_PLACEHOLDER && !fs.existsSync(rawFile)) {
        const { generateImage } = require('../src/cloudflare');
        const { promptFor } = require('../src/prompts');
        const buf = await generateImage(promptFor(p));
        fs.writeFileSync(rawFile, buf);             // الخام يُحفظ: الريل يعيد استخدامه بلا توليد
      }

      const out = path.join(root, 'content', 'images', `${p.date}.png`);
      const r = await renderHTML(browser, buildHTML(p, {
        size: 'post', background: await backgroundFor(p, rawFile),
      }), { size: 'post', out });

      s.images[p.date] = { file: rel(out), headline: p.headline, sub: p.sub, lang: p.lang,
        market: p.market, route: p.route, subject: p.subject, scene: p.scene,
        caption: p.captionIG, hashtags: p.hashtags, fontSize: r.fit.finalFontSize,
        placeholder: USE_PLACEHOLDER };
      state.save(s);                                 // بعد كل منشور، لا بآخر التشغيل
      madeI++;
    }

    if (!SKIP_REELS) {
      for (const p of reels) {
        if (state.doneReel(s, p.date)) { skipped++; continue; }
        const srcRaw = path.join(root, 'content', 'raw', `${p.reuseImageFrom}.png`);
        const bg = USE_PLACEHOLDER || !fs.existsSync(srcRaw)
          ? placeholder('dark', Number(p.reuseImageFrom.replace(/-/g, '')) % 97)
          : 'data:image/png;base64,' + fs.readFileSync(srcRaw).toString('base64');
        const out = path.join(root, 'content', 'reels', `${p.date}.mp4`);
        const r = await buildReel(browser, p, bg, out);
        if (!r.verify.ok) throw new Error(`ريل ${p.date} فشل التحقق: ${r.verify.issues.join(' · ')}`);
        s.reels[p.date] = { file: rel(out), headline: p.headline, lang: p.lang,
          reuseImageFrom: p.reuseImageFrom, track: r.track, caption: p.captionIG,
          hashtags: p.hashtags, duration: r.verify.duration, bytes: r.verify.bytes,
          placeholder: USE_PLACEHOLDER };
        state.save(s);
        madeR++;
      }
    }
  } catch (e) {
    state.save(s);
    if (e.name === 'DailyQuotaExhausted') {
      console.log(`\n⏹  توقف نظيف: الحصة نفدت — ${e.message}`);
      console.log(`أُنجز قبل التوقف: ${madeI} صورة · ${madeR} ريل. التشغيل التالي يستأنف من نقطة التوقف.`);
      await browser.close();
      process.exit(0);                               // خروج نظيف، والسجل يقول لماذا
    }
    await browser.close();
    throw e;
  }

  await browser.close();
  const secs = ((Date.now() - t0) / 1000).toFixed(0);
  console.log(`✅ ${madeI} صورة · ${madeR} ريل · ${skipped} موجود مسبقاً · ${secs}s${USE_PLACEHOLDER ? '  (خلفيات وهمية)' : ''}`);
})();
