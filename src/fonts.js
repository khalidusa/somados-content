// الخط يُدمج base64 داخل القالب — خطوط النظام تختلف بين الماك والسيرفر (القسم ٥.٣).
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'assets', 'fonts');

function fontFaceCSS() {
  const files = fs.readdirSync(DIR).filter(f => f.endsWith('.woff2'));
  return files.map(f => {
    const [, weight, subset] = f.match(/tajawal-(\d+)-(\w+)\.woff2/);
    const b64 = fs.readFileSync(path.join(DIR, f)).toString('base64');
    const range = subset === 'arabic'
      ? 'U+0600-06FF, U+0750-077F, U+0870-088E, U+0890-0891, U+0898-08E1, U+08E3-08FF, U+200C-200E, U+2010-2011, U+204F, U+2E41, U+FB50-FDFF, U+FE70-FE74, U+FE76-FEFC'
      : 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD';
    return `@font-face{font-family:'Tajawal';font-style:normal;font-weight:${weight};font-display:block;src:url(data:font/woff2;base64,${b64}) format('woff2');unicode-range:${range};}`;
  }).join('\n');
}

const dataURI = (p, mime) => `data:${mime};base64,${fs.readFileSync(p).toString('base64')}`;
const logoWordmark = () => dataURI(path.join(__dirname, '..', 'assets', 'logo-wordmark.png'), 'image/png');

module.exports = { fontFaceCSS, logoWordmark, dataURI };
