#!/usr/bin/env node
// ينشر منشوراً بعينه الآن (بعد دقائق قليلة) على القناتين.
// يتجاوز حساب مساحة الطابور عمداً: سقف Buffer عشرة، والمنشور يغادر الطابور
// حال نشره فيعود العدد إلى تسعة.
import { loadEnv } from '../src/lib/env.mjs';
import { getOrganizationId, getChannels, createPost, classifyChannel } from '../src/lib/buffer.mjs';
import { loadPlan, savePlan, loadPosted, savePosted, mediaUrl } from '../src/lib/store.mjs';

await loadEnv();
const [monthKey, dayArg, minsArg] = process.argv.slice(2);
const day = Number(dayArg);
const mins = Number(minsArg || 4);
if (!monthKey || !day) { console.error('استعمال: node scripts/publish-now.mjs 2026-09 21 [دقائق]'); process.exit(1); }

const plan = await loadPlan(monthKey);
const post = plan?.posts.find(p => p.day === day);
if (!post) { console.error(`اليوم ${day} ليس في خطة ${monthKey}`); process.exit(1); }

const dueAt = new Date(Date.now() + mins * 60000).toISOString().replace(/\.\d{3}Z$/, '.000Z');
const url = mediaUrl(post.images.feed);
const head = await fetch(url, { method: 'HEAD' });
if (!head.ok) { console.error(`الصورة غير متاحة (${head.status}) ${url}`); process.exit(1); }

const orgId = await getOrganizationId();
const channels = (await getChannels(orgId)).map(c => ({ ...c, kind: classifyChannel(c.service) }))
  .filter(c => ['facebook', 'instagram'].includes(c.kind));

const posted = await loadPosted();
console.log(`ينشر ${post.localLabel} — ${post.copy.headline.join(' ')}`);
console.log(`الموعد: بعد ${mins} دقائق (${dueAt})`);

for (const ch of channels) {
  const text = post.captions[ch.kind] ?? post.captions.social;
  const metadata = ch.kind === 'facebook'
    ? { facebook: { type: 'post' } }
    : { instagram: { type: 'post', shouldShareToFeed: true } };
  const created = await createPost({ channelId: ch.id, text, url, dueAt, metadata });
  posted[ch.id] = posted[ch.id] ?? {};
  posted[ch.id][`${monthKey}#${day}`] = { postId: created.id, dueAt, at: new Date().toISOString() };
  console.log(`  ✓ ${ch.kind} (${ch.name}) — ${created.id}`);
}
await savePosted(posted);
plan.posts = plan.posts.map(p => (p.day === day ? { ...p, dueAt } : p));
await savePlan(monthKey, plan);
console.log('\nتم. سينشر Buffer المنشور في موعده.');
