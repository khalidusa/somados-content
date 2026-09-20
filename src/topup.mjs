#!/usr/bin/env node
// الروبوت اليومي: يبقي طابور كل قناة في Buffer ممتلئاً إلى TARGET_QUEUE،
// وهو دون سقف الخطة المجانية (١٠ منشورات مجدولة لكل قناة).
// لا ينشر شيئاً بنفسه — Buffer هو من ينشر في موعده.

import { loadEnv } from './lib/env.mjs';
import { getOrganizationId, getChannels, getScheduledByChannel, createPost, classifyChannel } from './lib/buffer.mjs';
import { listPlans, loadPlan, loadPosted, savePosted, mediaUrl, pagesBaseUrl, loadJson } from './lib/store.mjs';

await loadEnv();
const brand = await loadJson('brand.json');
const site = brand.business.siteDisplay;

const TARGET_QUEUE = Number(process.env.TARGET_QUEUE || 9);
const HARD_CAP = Number(process.env.QUEUE_HARD_CAP || 10);
const LEAD_MINUTES = 20;
const dry = process.argv.includes('--dry-run');

if (TARGET_QUEUE >= HARD_CAP) { console.error(`TARGET_QUEUE (${TARGET_QUEUE}) يجب أن يبقى دون سقف الخطة (${HARD_CAP}).`); process.exit(1); }

const base = pagesBaseUrl();
if (!base) { console.error('لا رابط عام للصور. عيّن PAGES_BASE_URL أو شغّل داخل GitHub Actions.'); process.exit(1); }

// انستقرام لا يقبل رابطاً في منشور الفيد، وفيسبوك يجعل الرابط قابلاً للنقر
// داخل النص — فالرابط يبقى في الكابشن نفسه لا في تعليق أول (ميزة مدفوعة).
function metadataFor(kind, isReel) {
  if (kind === 'facebook') return { facebook: { type: isReel ? 'reel' : 'post' } };
  return { instagram: { type: isReel ? 'reel' : 'post', shouldShareToFeed: true } };
}

const orgId = await getOrganizationId();
const channels = (await getChannels(orgId)).map(c => ({ ...c, kind: classifyChannel(c.service) }))
  .filter(c => ['facebook', 'instagram'].includes(c.kind));
if (!channels.length) { console.error('لا قنوات فيسبوك أو انستقرام موصولة في Buffer.'); process.exit(1); }
console.log(`القنوات: ${channels.map(c => `${c.kind}:${c.name}`).join(' · ')}`);

const { counts } = await getScheduledByChannel(orgId);
const posted = await loadPosted();

const cutoff = Date.now() + LEAD_MINUTES * 60 * 1000;
const queue = [];
for (const key of await listPlans()) {
  const plan = await loadPlan(key);
  for (const p of plan?.posts ?? []) if (new Date(p.dueAt).getTime() > cutoff) queue.push({ ...p, planKey: key });
}
queue.sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt));
console.log(`${queue.length} منشوراً مستقبلياً في الخطط.`);

let created = 0;
for (const channel of channels) {
  const already = counts.get(channel.id) ?? 0;
  const room = Math.min(TARGET_QUEUE, HARD_CAP - 1) - already;
  const head = `${channel.kind} (${channel.name}): ${already} في الطابور`;
  if (room <= 0) { console.log(`${head} — ممتلئ`); continue; }

  const done = posted[channel.id] ?? {};
  const todo = queue.filter(p => !done[`${p.planKey}#${p.day}`]).slice(0, room);
  if (!todo.length) { console.log(`${head} — لا جديد`); continue; }
  console.log(`${head} — نضيف ${todo.length}`);

  for (const p of todo) {
    const isReel = p.kind === 'reel';
    const url = mediaUrl(isReel ? p.video : p.images.feed);
    const thumbnailUrl = isReel && p.cover ? mediaUrl(p.cover) : undefined;

    // Buffer يجلب الملف لحظة النشر: رابط ميت يفشل بصمت بعد أيام
    const head2 = await fetch(url, { method: 'HEAD' }).catch(() => null);
    if (!head2?.ok) { console.error(`  ! ${p.localLabel}: الملف غير متاح (${head2?.status ?? 'شبكة'}) ${url}`); continue; }

    if (dry) {
      const t = (p.captions[channel.kind] ?? p.captions.social).split('\n')[0];
      console.log(`  [تجربة] ${p.localLabel} ${isReel ? 'ريل' : 'صورة'} · "${t}"`);
      continue;
    }

    // لكل منصة كابشنها: فيسبوك يحمل الرابط، وانستقرام يحيل إلى البايو
    const text = p.captions[channel.kind] ?? p.captions.social;
    const post = await createPost({
      channelId: channel.id, text, url, dueAt: p.dueAt, isReel, thumbnailUrl,
      metadata: metadataFor(channel.kind, isReel)
    });
    posted[channel.id] = posted[channel.id] ?? {};
    posted[channel.id][`${p.planKey}#${p.day}`] = { postId: post.id, dueAt: p.dueAt, at: new Date().toISOString() };
    created++;
    console.log(`  + ${p.localLabel}  ${post.id}`);
  }
}

if (!dry) await savePosted(posted);
console.log(`\nجُدول ${created} منشوراً${dry ? ' (تجربة — لم يُرسل شيء)' : ''}. الرابط في الكابشن: ${site}`);
