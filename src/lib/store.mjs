// مخزن JSON بسيط على القرص. history.json هو ما يضمن ألا تتكرر صورة
// ولا جملة عبر الأشهر والسنوات.

import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const DATA = path.join(ROOT, 'data');
export const POSTS = path.join(ROOT, 'posts');

async function readJson(file, fallback) {
  try { return JSON.parse(await readFile(file, 'utf8')); } catch { return fallback; }
}
async function writeJson(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(value, null, 2) + '\n');
}

const HISTORY = path.join(DATA, 'history.json');
const POSTED = path.join(DATA, 'posted.json');
const planFile = (key) => path.join(DATA, 'plans', `${key}.json`);

export const loadHistory = () => readJson(HISTORY, { combos: {}, hashes: [], headlines: {}, photoIds: {} });
export const saveHistory = (h) => writeJson(HISTORY, h);
export const loadPosted = () => readJson(POSTED, {});
export const savePosted = (p) => writeJson(POSTED, p);
export const loadPlan = (key) => readJson(planFile(key), null);
export const savePlan = (key, plan) => writeJson(planFile(key), plan);
export const loadJson = (rel, fallback = null) => readJson(path.join(ROOT, rel), fallback);

export async function listPlans() {
  try {
    const files = await readdir(path.join(DATA, 'plans'));
    return files.filter(f => f.endsWith('.json')).map(f => f.replace('.json', '')).sort();
  } catch { return []; }
}

/** الرابط العام للصور المرفوعة (GitHub Pages) */
export function pagesBaseUrl() {
  if (process.env.PAGES_BASE_URL) return process.env.PAGES_BASE_URL.replace(/\/+$/, '');
  const repo = process.env.GITHUB_REPOSITORY;
  if (!repo) return null;
  const [owner, name] = repo.split('/');
  return `https://${owner.toLowerCase()}.github.io/${name}`;
}

export function mediaUrl(relPath) {
  const base = pagesBaseUrl();
  if (!base) throw new Error('لا يوجد رابط عام للصور: عيّن PAGES_BASE_URL أو شغّل داخل GitHub Actions.');
  return `${base}/${relPath.replace(/^\/+/, '')}`;
}

/** أقدم شهر خطته ناقصة عن عدد أيامه */
export async function findIncompleteMonth(suffix = '') {
  const want = suffix ? new RegExp('^\\d{4}-\\d{2}' + suffix + '$') : /^\d{4}-\d{2}$/;
  for (const key of await listPlans()) {
    if (!want.test(key)) continue;
    const [y, m] = key.split('-').map(Number);
    const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const plan = await loadPlan(key);
    if ((plan?.posts?.length ?? 0) < days) return { key, year: y, month: m, done: plan?.posts?.length ?? 0, days };
  }
  return null;
}
