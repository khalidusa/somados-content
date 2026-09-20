#!/usr/bin/env node
// كل رابط وسائط يرجع 200 قبل الجدولة. Buffer لا ينسخ الوسائط — يسحبها لحظة النشر،
// فرابط ميت وقت الجدولة يعني منشوراً بلا صورة (القسم ٦).
const path = require('path');
const state = require('../src/state');
const { todayBaghdad } = require('../src/schedule');

const BASE = process.env.PAGES_BASE_URL;

(async () => {
  if (!BASE) { console.log('⏭  PAGES_BASE_URL غير مضبوط — تخطي الفحص'); return; }
  const s = state.load();
  const today = todayBaghdad();
  const items = [
    ...Object.entries(s.images).map(([d, v]) => ({ d, v, kind: 'images' })),
    ...Object.entries(s.reels).map(([d, v]) => ({ d, v, kind: 'reels' })),
  ].filter(x => x.d >= today && !x.v.placeholder);

  if (!items.length) { console.log('لا وسائط مستقبلية للفحص'); return; }
  let bad = 0;
  for (const it of items) {
    const url = `${BASE.replace(/\/$/, '')}/${it.kind}/${path.basename(it.v.file)}`;
    try {
      const r = await fetch(url, { method: 'HEAD' });
      if (r.status !== 200) { console.log(`❌ ${r.status} ${url}`); bad++; }
    } catch (e) { console.log(`❌ فشل الطلب ${url} — ${e.message}`); bad++; }
  }
  console.log(bad ? `❌ ${bad} من ${items.length} رابط لا يرجع 200` : `✅ كل الروابط (${items.length}) ترجع 200`);
  if (bad) process.exit(1);
})();
