#!/usr/bin/env node
// يبحث ويصنّف الصور بمعايير الجمال: إضاءة عالية، تباين، تشبّع، وصلة بالمكان.
// يحفظ الأفضل في out/pick ليختار الإنسان بعينه.
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { loadEnv } from '../src/lib/env.mjs';
import { pool, download, photoQuality } from '../src/lib/photos.mjs';
import { withBrowser } from '../src/lib/render.mjs';
import { ROOT } from '../src/lib/store.mjs';

await loadEnv();
const queries = process.argv.slice(2);
if (!queries.length) { console.error('استعمال: node scripts/pick-photos.mjs "Antalya marina" ...'); process.exit(1); }
const OUT = path.join(ROOT, 'out', 'pick');
await mkdir(OUT, { recursive: true });

const cands = await pool(queries, { perQuery: 24 });
console.log(`${cands.length} مرشحاً`);

await withBrowser(async (page) => {
  const scored = [];
  for (const c of cands.slice(0, 26)) {
    const b64 = await download(c).catch(() => null);
    if (!b64) continue;
    const q = await photoQuality(page, b64);
    // الجمال هنا: إضاءة عالية بلا إحراق، تباين قوي، ألوان مشبعة، وصلة بالاسم
    const score = (q.mean / 2) + q.sd + q.saturation * 1.4 + (c.relevant ? 30 : 0) - Math.max(0, q.mean - 190) * 2;
    scored.push({ ...c, q, score, b64 });
  }
  scored.sort((a, b) => b.score - a.score);
  for (const [i, s] of scored.slice(0, 8).entries()) {
    const f = `${String(i + 1).padStart(2, '0')}-${s.id}.jpg`;
    await writeFile(path.join(OUT, f), Buffer.from(s.b64, 'base64'));
    console.log(`  ${f}  نقاط ${s.score.toFixed(0)}  إضاءة ${s.q.mean.toFixed(0)} تباين ${s.q.sd.toFixed(0)} تشبّع ${s.q.saturation.toFixed(0)}  «${(s.alt||'').slice(0,54)}»`);
  }
});
