#!/usr/bin/env node
// إعادة رسم منشور من خطة موجودة وصوره المحفوظة — بلا أي طلب شبكة.
// أداة التصميم: تغيّر القالب وترى النتيجة في ثوانٍ.
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { loadEnv } from './lib/env.mjs';
import { withBrowser, shoot, SIZES } from './lib/render.mjs';
import { buildPostHTML } from './lib/design.mjs';
import { ROOT, loadPlan, listPlans } from './lib/store.mjs';

await loadEnv();
const arg = process.argv[2];
const monthArg = process.argv.find(a => /^\d{4}-\d{2}$/.test(a));
const monthKey = monthArg || (await listPlans()).filter(k => /^\d{4}-\d{2}$/.test(k)).pop();
const plan = await loadPlan(monthKey);
if (!plan) { console.error('لا خطة لـ ' + monthKey); process.exit(1); }

const days = arg && /^\d+$/.test(arg) ? [Number(arg)] : plan.posts.map(p => p.day);
await withBrowser(async (page) => {
  for (const day of days) {
    const post = plan.posts.find(p => p.day === day);
    if (!post) { console.warn(`اليوم ${day} ليس في الخطة`); continue; }
    const photos = [];
    for (const rel of post.images.photos) photos.push((await readFile(path.join(ROOT, rel))).toString('base64'));
    const html = await buildPostHTML({ layout: post.layout, size: SIZES.feed, photos, copy: post.copy });
    const { buf, fit } = await shoot(page, html, SIZES.feed);
    await writeFile(path.join(ROOT, post.images.feed), buf);
    console.log(`  ✓ ${post.images.feed}${fit && fit.ok === false ? '  (العنوان ضيّق)' : ''}`);
  }
});
