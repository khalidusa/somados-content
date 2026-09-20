// باني الريلز: Chromium يرسم كل إطار كدالة في الزمن، وffmpeg يدمجها مع
// مقطع موسيقى حرّ. لا نموذج فيديو ولا تسجيل شاشة — الناتج قابل للتكرار حرفياً.

import { writeFile, mkdir, rm, readdir } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { ROOT } from './store.mjs';

const run = promisify(execFile);
export const REEL = { w: 1080, h: 1920, fps: 30, duration: 10 };
const MUSIC_DIR = path.join(ROOT, 'assets', 'music');

export async function trackDuration(file) {
  const { stdout } = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', file]);
  return Number(stdout.trim()) || 0;
}

/** المقاطع الأطول من الريل فقط — مقطع أقصر ينتهي قبل نهاية الفيديو. */
export async function musicTracks() {
  let files;
  try { files = (await readdir(MUSIC_DIR)).filter(f => /\.(mp3|m4a|aac|wav)$/i.test(f)).sort(); }
  catch { return []; }
  const usable = [];
  for (const f of files) {
    try {
      const s = await trackDuration(path.join(MUSIC_DIR, f));
      if (s >= REEL.duration + 0.5) usable.push(f);
      else console.warn(`  نتخطّى ${f}: ${s.toFixed(1)}ث أقصر من الريل`);
    } catch { usable.push(f); }
  }
  return usable;
}

/** يلتقط كل إطار ثم يرمّز. يعيد مسار الملف. */
export async function renderReel(page, { html, musicFile, outPath, workDir, coverPath }) {
  const frames = path.join(workDir, 'frames');
  await rm(frames, { recursive: true, force: true });
  await mkdir(frames, { recursive: true });

  await page.setViewport({ width: REEL.w, height: REEL.h, deviceScaleFactor: 1 });
  await page.goto('about:blank');
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => new Promise(r => {
    const imgs = [...document.images].filter(i => !i.complete);
    if (!imgs.length) return r();
    let left = imgs.length;
    imgs.forEach(i => { i.onload = i.onerror = () => (--left === 0) && r(); });
  }));
  // القياس بعد جاهزية الخط لا قبله — قبله يُقاس الخط البديل فيخرج العنوان خارج الإطار
  await page.evaluate(() => window.__fit && window.__fit());

  const total = REEL.fps * REEL.duration;
  for (let i = 0; i < total; i++) {
    await page.evaluate(t => window.__seek(t), i / REEL.fps);
    await writeFile(path.join(frames, `${String(i).padStart(4, '0')}.jpg`), await page.screenshot({ type: 'jpeg', quality: 88 }));
  }

  if (coverPath) {
    await page.evaluate(() => window.__seek(8.6));
    await writeFile(coverPath, await page.screenshot({ type: 'jpeg', quality: 92 }));
  }

  const args = ['-y', '-hide_banner', '-loglevel', 'error', '-framerate', String(REEL.fps), '-i', path.join(frames, '%04d.jpg')];
  if (musicFile) {
    const full = path.join(MUSIC_DIR, musicFile);
    const len = await trackDuration(full).catch(() => 0);
    // ابدأ بعد المقدمة حتى لا تتشابه كل الريلز صوتياً
    const offset = len > REEL.duration + 12 ? Math.min(len - REEL.duration - 2, 8 + (len % 17)) : 0;
    args.push('-ss', offset.toFixed(2), '-i', full,
      '-af', `afade=t=in:st=0:d=0.4,afade=t=out:st=${REEL.duration - 1.2}:d=1.2`,
      '-c:a', 'aac', '-b:a', '160k', '-ar', '44100', '-ac', '2');
  }
  args.push('-t', String(REEL.duration), '-c:v', 'libx264', '-preset', 'medium', '-crf', '20',
    '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-level', '4.1', '-movflags', '+faststart', '-shortest', outPath);

  await run('ffmpeg', args);
  await rm(frames, { recursive: true, force: true });
  return outPath;
}
