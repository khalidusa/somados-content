#!/usr/bin/env node
// معبّئ الطابور. يشتغل كل 3 ساعات: بمنشورين يومياً لا تكفي دورة واحدة باليوم،
// وريل المساء يبقى خارج الطابور للأبد (القسم ٥.٥ — اختناق الطابور).
const path = require('path');
const state = require('../src/state');
const { listChannels, listQueue, createPost, QUEUE_TARGET } = require('../src/buffer');
const { slotsForDate, todayBaghdad, addDays } = require('../src/schedule');

const BASE = process.env.PAGES_BASE_URL;   // رابط Pages لا raw.githubusercontent (الأخير 429)
const DRY = process.argv.includes('--dry-run');

(async () => {
  if (!BASE) throw new Error('PAGES_BASE_URL غير موجود');
  const s = state.load();
  const { channels } = await listChannels();
  const live = channels.filter(c => !c.isDisconnected && ['facebook', 'instagram'].includes(c.service));
  if (!live.length) throw new Error('لا قنوات فيسبوك/انستغرام مربوطة بـBuffer');

  // المرشحون: كل منشور له ملف موجود وموعده بالمستقبل، مرتبون حسب الموعد
  const today = todayBaghdad();
  const cands = [];
  for (const [date, v] of Object.entries(s.images))
    cands.push({ date, kind: 'image', ...v });
  for (const [date, v] of Object.entries(s.reels))
    cands.push({ date, kind: 'reel', ...v });

  const queued = new Set();
  for (const ch of live) {
    for (const p of await listQueue(ch.id)) queued.add(`${ch.id}|${p.dueAt?.slice(0, 10)}`);
  }

  const ready = cands
    .filter(c => c.date >= today && !c.placeholder)     // الوهمي لا يُنشر أبداً
    .map(c => ({ ...c, slot: slotsForDate(c.date).find(x => x.kind === c.kind) }))
    .filter(c => c.slot.utc.getTime() > Date.now())
    .sort((a, b) => a.slot.utc - b.slot.utc);

  let added = 0, skipped = 0;
  for (const ch of live) {
    const depth = (await listQueue(ch.id)).length;      // العدد الحقيقي قبل الإضافة، لا المفترض
    let room = Math.max(0, QUEUE_TARGET - depth);
    console.log(`${ch.service} «${ch.name}»: بالطابور ${depth} · مساحة ${room}`);
    for (const c of ready) {
      if (room <= 0) break;
      if (queued.has(`${ch.id}|${c.date}`)) { skipped++; continue; }
      const url = `${BASE.replace(/\/$/, '')}/${c.kind === 'image' ? 'images' : 'reels'}/${path.basename(c.file)}`;
      if (DRY) { console.log(`  [تجريبي] ${c.slot.localISO} ${c.kind} ${url}`); }
      else {
        await createPost({ channelId: ch.id, service: ch.service, text: c.caption,
          mediaUrl: url, isVideo: c.kind === 'reel', dueAt: c.slot.utc.toISOString() });
      }
      room--; added++;
    }
  }
  console.log(`${DRY ? '[تجريبي] ' : ''}أُضيف ${added} · تُخطي ${skipped} (موجود بالطابور)`);
})();
