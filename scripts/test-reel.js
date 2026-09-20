const { plan } = require('../src/matrix');
const { buildCopy } = require('../src/copy');
const { launch } = require('../src/render');
const { placeholder } = require('../src/placeholder');
const { buildReel } = require('../src/reel');
const fs = require('fs');

(async () => {
  fs.mkdirSync('out/reel-test', { recursive: true });
  const p = buildCopy(plan('2026-10-01', 2).filter(x => x.kind === 'reel'))[0];
  console.log(`ريل ${p.date} · ${p.lang} · ${p.headline}`);
  const t0 = Date.now();
  const browser = await launch();
  const r = await buildReel(browser, p, placeholder('dark', 11), 'out/reel-test/reel.mp4');
  await browser.close();
  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\nإطارات: ${r.frames} · خط ${r.fit.finalFontSize}px · موسيقى: ${r.track}`);
  console.log(`التحقق: ${r.verify.width}x${r.verify.height} · ${r.verify.duration.toFixed(2)}s · ${r.verify.vcodec}/${r.verify.acodec} · ${(r.verify.bytes / 1048576).toFixed(2)}MB`);
  console.log(r.verify.ok ? `✅ الريل سليم (بُني بـ${secs}s)` : `❌ ${r.verify.issues.join(' · ')}`);
  process.exit(r.verify.ok ? 0 : 1);
})();
