// حالة التوليد تُحفظ بعد كل منشور — التشغيل الذي يفشل لا يضيّع ما أُنجز (القسم ٥.١).
const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, '..', 'data', 'state.json');

function load() {
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); }
  catch { return { images: {}, reels: {}, lastRun: null }; }
}
function save(s) {
  s.lastRun = new Date().toISOString();
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(s, null, 2));
}
const doneImage = (s, d) => Boolean(s.images[d]?.file && fs.existsSync(path.join(__dirname, '..', s.images[d].file)));
const doneReel  = (s, d) => Boolean(s.reels[d]?.file  && fs.existsSync(path.join(__dirname, '..', s.reels[d].file)));

module.exports = { load, save, doneImage, doneReel, FILE };
