// خط الريلز: إطارات من Chromium ثم تجميع بـFFmpeg. لا توليد صور جديدة إطلاقاً —
// نعيد استخدام صورة خط الصور (القسم ٥.٤) فتكون كلفة الريل صفراً.
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');
const { buildHTML } = require('./design');
const { catalog, pickTrack } = require('./music');

const FPS = 30;
const DURATION = 10;

async function renderFrames(browser, post, background, dir, { fps = FPS, duration = DURATION } = {}) {
  fs.mkdirSync(dir, { recursive: true });
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
    await page.goto('about:blank');
    await page.setContent(buildHTML(post, { size: 'reel', background, animated: true, duration }),
                          { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    const fit = await page.evaluate(() => window.__fitText());
    const total = Math.round(fps * duration);
    for (let i = 0; i < total; i++) {
      const t = i / fps;
      await page.evaluate((tt) => window.__seek(tt), t);
      await page.screenshot({ path: path.join(dir, `f_${String(i).padStart(4, '0')}.png`), type: 'png' });
    }
    return { frames: total, fit };
  } finally { await page.close(); }
}

function assemble(framesDir, track, out, { fps = FPS, duration = DURATION } = {}) {
  const args = [
    '-y', '-loglevel', 'error',
    '-framerate', String(fps), '-i', path.join(framesDir, 'f_%04d.png'),
    '-i', track.path,
    '-t', String(duration),
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '20',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
    '-c:a', 'aac', '-b:a', '128k', '-ar', '44100',
    '-af', `afade=t=in:st=0:d=0.6,afade=t=out:st=${duration - 1.4}:d=1.4`,
    '-shortest', out,
  ];
  execFileSync('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });
  return out;
}

/** تحقق إلزامي (القسم ٦): العرض والارتفاع والمدة ووجود مسار صوت. */
function verify(file, { duration = DURATION } = {}) {
  const j = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-print_format', 'json',
    '-show_format', '-show_streams', file], { encoding: 'utf8' }));
  const v = j.streams.find(s => s.codec_type === 'video');
  const a = j.streams.find(s => s.codec_type === 'audio');
  const d = parseFloat(j.format.duration);
  const issues = [];
  if (!v) issues.push('لا مسار فيديو');
  else {
    if (v.width !== 1080 || v.height !== 1920) issues.push(`المقاس ${v.width}x${v.height} لا 1080x1920`);
    if (v.pix_fmt !== 'yuv420p') issues.push(`pix_fmt ${v.pix_fmt}`);
  }
  if (!a) issues.push('لا مسار صوت');
  if (!(Math.abs(d - duration) < 0.35)) issues.push(`المدة ${d?.toFixed(2)}s لا ${duration}s`);
  return { ok: issues.length === 0, issues, width: v?.width, height: v?.height,
           duration: d, vcodec: v?.codec_name, acodec: a?.codec_name,
           bytes: fs.statSync(file).size };
}

async function buildReel(browser, post, background, outFile, opts = {}) {
  const cat = catalog(opts.duration || DURATION);
  const track = pickTrack(post.date, cat.usable);
  if (!track) throw new Error('لا توجد موسيقى صالحة');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'reel-'));
  try {
    const r = await renderFrames(browser, post, background, dir, opts);
    assemble(dir, track, outFile, opts);
    return { ...r, track: track.file, verify: verify(outFile, opts) };
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

module.exports = { buildReel, renderFrames, assemble, verify, FPS, DURATION };
