// محرك اللقطات — Chromium. الانضباط هنا مقصود: about:blank قبل كل مستند،
// وانتظار جاهزية الخطوط فعلياً لا بمهلة زمنية.
const puppeteer = require('puppeteer');
const { SIZES } = require('./design');

async function launch() {
  return puppeteer.launch({
    headless: 'shell',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none'],
  });
}

async function renderHTML(browser, html, { size = 'post', out } = {}) {
  const { w, h } = SIZES[size];
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
    await page.goto('about:blank');                       // تنظيف السياق قبل كل مستند
    await page.setContent(html, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);      // لا لقطة ولا قياس قبل رسم الخط
    const fit = await page.evaluate(() => window.__fitText());
    const buf = await page.screenshot({ path: out, type: 'png' });
    return { fit, bytes: buf.length };
  } finally {
    await page.close();
  }
}

module.exports = { launch, renderHTML };
