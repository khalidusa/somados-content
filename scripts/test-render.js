const { plan } = require('../src/matrix');
const { buildHTML } = require('../src/design');
const { launch, renderHTML } = require('../src/render');
const { placeholder } = require('../src/placeholder');
const fs = require('fs');

(async () => {
  fs.mkdirSync('out/design-test', { recursive: true });
  const p = plan('2026-10-01', 12).filter(x => x.kind === 'image');
  const flightAr = p.find(x => x.market === 'flight' && x.lang === 'ar');
  const flightKu = p.find(x => x.lang === 'ku');
  const visa = p.find(x => x.market === 'visa');

  const copy = {
    flightAr: { headline: 'مسار مباشر بين بغداد وإسطنبول، بلا محطة وسط الطريق.',
                sub: 'رحلات يومية على مدار الأسبوع. راجع مواعيد اليوم وأسعارها المحدثة.' },
    flightKu: { headline: 'ڕێگایەکی ڕاستەوخۆ لە نێوان هەولێر و ئیستەنبوڵ.',
                sub: 'فڕینی ڕۆژانە. کاتەکان و نرخەکانی ئەمڕۆ ببینە.' },
    visa:     { headline: 'تأشيرة السعودية السياحية، بإجراء واضح من أوله لآخره.',
                sub: 'نراجع أوراقك قبل التقديم ونتابع الطلب حتى صدوره.' },
    long:     { headline: 'عنوان طويل جداً مقصود لاختبار فيض النص داخل الإطار وتصغير الخط برمجياً قبل التقاط اللقطة حتى لا يخرج حرف واحد خارج الحاوية أبداً مهما طال النص المكتوب.',
                sub: 'سطر فرعي طويل أيضاً لاختبار السلوك نفسه مع نص ثانوي ممتد يشغل مساحة إضافية.' },
    insane:   { headline: 'نص متطرف الطول لإجبار حارس التصغير على العمل فعلياً: يذكر بغداد وإسطنبول وأربيل والسليمانية وكركوك والبصرة والنجف وأنقرة وأنطاليا وسامسون كلها بجملة واحدة ممتدة بلا توقف حتى نرى هل ينكمش الخط أم يفيض النص خارج الحاوية.',
                sub: 'سطر فرعي ممتد كذلك بنفس القدر من الطول المبالغ فيه لزيادة الضغط على الحاوية.' },
  };

  const browser = await launch();
  const jobs = [
    ['01-flight-ar-dark.png',  { ...flightAr, ...copy.flightAr },  'post', placeholder('dark', 1),  false],
    ['02-flight-ar-light.png', { ...flightAr, ...copy.flightAr },  'post', placeholder('light', 2), false],
    ['03-flight-ku-dark.png',  { ...flightKu, ...copy.flightKu },  'post', placeholder('dark', 3),  false],
    ['04-visa-light.png',      { ...visa, ...copy.visa },          'post', placeholder('light', 4), false],
    ['05-overflow-test.png',   { ...flightAr, ...copy.long },      'post', placeholder('dark', 5),  false],
    ['06-reel-safezones.png',  { ...flightAr, ...copy.flightAr },  'reel', placeholder('dark', 6),  true],
    ['07-reel-clean.png',      { ...flightAr, ...copy.flightAr },  'reel', placeholder('dark', 6),  false],
    ['08-shrink-guard.png',    { ...flightAr, ...copy.insane },    'post', placeholder('dark', 8),  false],
  ];

  for (const [name, post, size, bg, guides] of jobs) {
    const html = buildHTML(post, { size, background: bg, safeGuides: guides });
    const r = await renderHTML(browser, html, { size, out: `out/design-test/${name}` });
    console.log(`${name.padEnd(26)} خط ${String(r.fit.finalFontSize).padStart(3)}px  تصغير ${String(r.fit.shrunk).padStart(2)}  الفوتر عند ${String(r.fit.footBottom).padStart(4)} / الحد ${r.fit.limit}  ${r.fit.overflow ? '❌ فيض' : '✅ داخل الإطار'}`);
  }
  await browser.close();
})();
