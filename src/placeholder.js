// خلفية وهمية للاختبار قبل صرف أي حصة توليد (القسم ٤.٤).
// تحاكي مدى نغمات صورة حقيقية — نسخة داكنة وأخرى فاتحة لاختبار قراءة النص على الاثنتين.
function placeholder(tone = 'dark', seed = 1) {
  const stops = tone === 'light'
    ? [['#f4f6f6', 0], ['#dfe7e7', 45], ['#c9d6d6', 100]]
    : [['#0d2b2e', 0], ['#0a3b3f', 40], ['#061719', 100]];
  const dots = Array.from({ length: 26 }, (_, i) => {
    const x = (seed * 97 + i * 137) % 1080, y = (seed * 53 + i * 211) % 1920;
    const r = 40 + ((i * 37) % 160);
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="${tone === 'light' ? '#ffffff' : '#00a6a6'}" opacity="${tone === 'light' ? 0.35 : 0.06}"/>`;
  }).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0.4" y2="1">
      ${stops.map(([c, o]) => `<stop offset="${o}%" stop-color="${c}"/>`).join('')}
    </linearGradient></defs>
    <rect width="1080" height="1920" fill="url(#g)"/>${dots}
    <text x="540" y="1860" text-anchor="middle" font-family="monospace" font-size="26"
      fill="${tone === 'light' ? '#0006' : '#fff4'}">PLACEHOLDER — not a generated image</text>
  </svg>`;
  return 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64');
}
module.exports = { placeholder };
