// تحميل .env عند التشغيل المحلي. داخل GitHub Actions تأتي القيم من Secrets
// فلا ملف هنا ولا حاجة إليه.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ROOT } from './store.mjs';

export async function loadEnv() {
  try {
    const raw = await readFile(path.join(ROOT, '.env'), 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/i);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
    }
  } catch { /* لا ملف — الأسرار من البيئة */ }
}
