#!/usr/bin/env node
// كم صُرف اليوم من كل حساب Cloudflare، وكم بقي قبل السقف.
import { loadEnv } from './lib/env.mjs';
import { usageReport, PER_ACCOUNT_BUDGET, COST } from './lib/cloudflare.mjs';

await loadEnv();
const rows = usageReport();
if (!rows.length) { console.log('لا حسابات Cloudflare في البيئة.'); process.exit(0); }

console.log(`\nحصة اليوم (تتصفّر 00:00 UTC) — السقف المفروض ${PER_ACCOUNT_BUDGET} من ${10000} مجانية لكل حساب\n`);
let used = 0, left = 0;
for (const r of rows) {
  const bar = '█'.repeat(Math.round((r.used / r.budget) * 24)).padEnd(24, '·');
  console.log(`  ${r.account.padEnd(10)} ${bar} ${String(r.used).padStart(6)} / ${r.budget}`);
  used += r.used; left += r.left;
}
console.log(`\n  المجموع: ${used} مصروف · ${left} متاح`);
console.log(`  الكلفة التقديرية: صورة مولّدة ${COST.art} · FLUX ${COST.flux} · فحص صورة ${COST.vision} نيوروناً`);
console.log(`  الصور الحقيقية من Pexels: صفر نيورون.\n`);
