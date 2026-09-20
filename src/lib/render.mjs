// HTML/CSS ← Chromium ← JPEG. نموذج الصور لا يكتب حرفاً أبداً؛
// كل النص يُركَّب هنا فيبقى حاداً ومحاذياً وبخط الهوية.

import puppeteer from 'puppeteer';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { ROOT } from './store.mjs';

export const SIZES = {
  feed: { w: 1080, h: 1350 },   // انستقرام وفيسبوك 4:5
  reel: { w: 1080, h: 1920 }
};

const FONT_DIR = path.join(ROOT, 'assets', 'fonts');
let fontCache = null;

/** يدمج Tajawal base64 داخل المستند — خطوط النظام تختلف بين الماك والسيرفر. */
export async function fontFaceCSS() {
  if (fontCache) return fontCache;
  const files = (await readdir(FONT_DIR)).filter(f => f.endsWith('.woff2'));
  const parts = [];
  for (const f of files) {
    const m = f.match(/^(\w+)-(\d+|var)-(\w+)\.woff2$/);   // 'var' = خط متغيّر بمحور وزن واحد
    if (!m) continue;
    const [, fam, weight, subset] = m;
    const family = { arefruqaa: 'Aref Ruqaa', notokufi: 'Noto Kufi Arabic', tajawal: 'Tajawal' }[fam] ?? 'Tajawal';
    const b64 = (await readFile(path.join(FONT_DIR, f))).toString('base64');
    const range = subset === 'arabic'
      ? 'U+0600-06FF, U+0750-077F, U+0870-088E, U+0890-0891, U+0898-08E1, U+08E3-08FF, U+200C-200E, U+2010-2011, U+204F, U+2E41, U+FB50-FDFF, U+FE70-FE74, U+FE76-FEFC'
      : 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD';
    parts.push(`@font-face{font-family:'${family}';font-style:normal;font-weight:${weight === 'var' ? '100 900' : weight};font-display:block;src:url(data:font/woff2;base64,${b64}) format('woff2');unicode-range:${range};}`);
  }
  fontCache = parts.join('\n');
  return fontCache;
}

export async function assetDataURI(rel, mime = 'image/png') {
  return `data:${mime};base64,` + (await readFile(path.join(ROOT, rel))).toString('base64');
}

export async function withBrowser(fn) {
  const browser = await puppeteer.launch({
    headless: 'shell',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none', '--force-color-profile=srgb']
  });
  try {
    const page = await browser.newPage();
    return await fn(page, browser);
  } finally {
    await browser.close();
  }
}

/**
 * يرسم مستنداً ويعيد JPEG. ينتظر جاهزية الخطوط فعلياً — القياس قبلها
 * يقيس الخط البديل فيخرج النص خارج الإطار والمقياس يقول "سليم".
 */
export async function shoot(page, html, { w, h }, { quality = 92 } = {}) {
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await page.goto('about:blank');
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => new Promise(r => {
    const imgs = [...document.images].filter(i => !i.complete);
    if (!imgs.length) return r();
    let left = imgs.length;
    imgs.forEach(i => { i.onload = i.onerror = () => (--left === 0) && r(); });
  }));
  const fit = await page.evaluate(() => (window.__fit ? window.__fit() : { ok: true }));
  return { buf: await page.screenshot({ type: 'jpeg', quality }), fit };
}

/** بصمة إدراكية 64 بت (DCT) للصورة — لرفض أي صورة تشبه صورة نُشرت سابقاً. */
export async function photoHash(page, imageB64) {
  await page.goto('about:blank');
  await page.setContent('<body></body>');
  return await page.evaluate(async (b64) => {
    const img = new Image();
    img.src = 'data:image/jpeg;base64,' + b64;
    await img.decode();
    const N = 32;
    const c = document.createElement('canvas');
    c.width = N; c.height = N;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, N, N);
    const d = ctx.getImageData(0, 0, N, N).data;
    const g = new Float64Array(N * N);
    for (let i = 0; i < N * N; i++) g[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2];
    const cos = new Float64Array(N * N);
    for (let x = 0; x < N; x++) for (let u = 0; u < N; u++) cos[x * N + u] = Math.cos(((2 * x + 1) * u * Math.PI) / (2 * N));
    const rows = new Float64Array(N * N);
    for (let y = 0; y < N; y++) for (let u = 0; u < N; u++) {
      let s = 0; for (let x = 0; x < N; x++) s += g[y * N + x] * cos[x * N + u];
      rows[y * N + u] = s;
    }
    const dct = new Float64Array(64);
    for (let v = 0; v < 8; v++) for (let u = 0; u < 8; u++) {
      let s = 0; for (let y = 0; y < N; y++) s += rows[y * N + u] * cos[y * N + v];
      dct[v * 8 + u] = s;
    }
    const vals = Array.from(dct).slice(1).sort((a, b) => a - b);
    const median = (vals[31] + vals[32]) / 2;
    let bits = '';
    for (let i = 0; i < 64; i++) bits += (dct[i] > median ? '1' : '0');
    let hex = '';
    for (let i = 0; i < 64; i += 4) hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
    return hex;
  }, imageB64);
}

export function hammingDistance(a = '', b = '') {
  if (a.length !== b.length) return 64;
  let dist = 0;
  for (let i = 0; i < a.length; i++) {
    let x = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    while (x) { dist += x & 1; x >>= 1; }
  }
  return dist;
}
