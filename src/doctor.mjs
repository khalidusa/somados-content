#!/usr/bin/env node
// فحص ما قبل التشغيل: كل ما ينقص يُقال الآن، لا بعد نصف ساعة من الرسم.
import { loadEnv } from './lib/env.mjs';
import { accounts } from './lib/cloudflare.mjs';
import { ROOT, loadJson, pagesBaseUrl } from './lib/store.mjs';
import { readdir } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';

const run = promisify(execFile);
await loadEnv();
// الموسيقى وffmpeg شرطان للريلز وحدها. اعتبارهما إلزاميين دائماً كان يُفشل
// خط الصور كل ثلاث ساعات ويرسل إيميلاً، مع أن الصور لا تحتاجهما إطلاقاً.
const forReels = process.argv.includes('--reels');
let bad = 0;
const ok = (m) => console.log(`  ✓ ${m}`);
const no = (m) => { console.log(`  ✗ ${m}`); bad++; };
const warn = (m) => console.log(`  ! ${m}`);

console.log(`\nفحص سومادوس — ${forReels ? 'خط الريلز' : 'خط الصور'}\n`);

process.env.PEXELS_API_KEY ? ok('مفتاح Pexels موجود') : no('PEXELS_API_KEY مفقود — مصدر صور المدن');

const cf = accounts();
cf.length ? ok(`حسابات Cloudflare: ${cf.length} (${cf.map(a => a.label).join(' · ')}) ≈ ${cf.length * 10000} نيورون يومياً`)
          : warn('لا توكنات Cloudflare — الخلفيات المولّدة وحارس النص معطّلان (صور المدن لا تحتاجها)');

process.env.BUFFER_API_KEY ? ok('مفتاح Buffer موجود') : warn('BUFFER_API_KEY مفقود — الجدولة فقط هي المعطّلة');

const base = pagesBaseUrl();
base ? ok(`رابط الصور العام: ${base}`) : warn('PAGES_BASE_URL غير معيّن — يُحسب تلقائياً داخل GitHub Actions');

const brand = await loadJson('brand.json');
brand?.business?.website ? ok(`الهوية: ${brand.business.name} · ${brand.business.siteDisplay}`) : no('brand.json ناقص');

const dest = await loadJson('data/destinations.json');
Object.keys(dest ?? {}).length ? ok(`${Object.keys(dest).length} وجهة باستعلامات صور`) : no('data/destinations.json فارغ');

try {
  const fonts = (await readdir(path.join(ROOT, 'assets', 'fonts'))).filter(f => f.endsWith('.woff2'));
  fonts.length >= 6 ? ok(`${fonts.length} ملف خط مدموج`) : no('خطوط Tajawal ناقصة');
} catch { no('مجلد assets/fonts مفقود'); }

const need = forReels ? no : warn;      // للصور: تنبيه فقط، وللريلز: مانع
try {
  const music = (await readdir(path.join(ROOT, 'assets', 'music'))).filter(f => /\.(mp3|m4a|wav)$/i.test(f));
  music.length ? ok(`${music.length} مقطع موسيقى للريلز`) : need('لا موسيقى في assets/music');
} catch { need('مجلد assets/music مفقود — للريلز فقط'); }

try { await run('ffmpeg', ['-version']); ok('ffmpeg جاهز'); }
catch { need('ffmpeg غير مثبّت — للريلز فقط'); }

console.log(bad ? `\n${bad} مشكلة تمنع التشغيل.\n` : '\nكل شيء جاهز.\n');
process.exit(bad ? 1 : 0);
