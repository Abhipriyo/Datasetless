// Landing page: playful hero, question ticker, ways in, business demos, live gallery.
import { h, icon, sketch } from './components.js';
import { SAMPLES } from '../lib/samples.js';
import { BRAND } from '../config.js';

const Y = new Date().getFullYear();

export const GALLERY = [
  {
    id: 'india-peers', title: 'India vs emerging peers', emoji: '🚀', sketch: 'line', tone: 'sun', tags: ['Economy', 'Growth', 'Inflation'],
    blurb: 'GDP growth, income per person, inflation and jobs for India, China, Brazil and Indonesia since 2000.',
    plan: { indicators: ['NY.GDP.MKTP.KD.ZG', 'NY.GDP.PCAP.CD', 'FP.CPI.TOTL.ZG', 'SL.UEM.TOTL.ZS', 'NV.IND.MANF.ZS'], countries: ['IND', 'CHN', 'BRA', 'IDN'], from: 2000, to: Y, focus: 'IND', title: 'India vs emerging peers' },
  },
  {
    id: 'brics', title: 'BRICS at a glance', emoji: '🌍', sketch: 'bars', tone: 'sky', tags: ['Economy', 'Population'],
    blurb: 'Economy size, income per person, population and life expectancy across the five original BRICS.',
    plan: { indicators: ['NY.GDP.MKTP.CD', 'NY.GDP.PCAP.CD', 'SP.POP.TOTL', 'SP.DYN.LE00.IN'], countries: ['CHN', 'IND', 'BRA', 'RUS', 'ZAF'], from: 2000, to: Y, focus: 'IND', title: 'BRICS at a glance' },
  },
  {
    id: 'climate', title: 'Who is decarbonising?', emoji: '🌱', sketch: 'area', tone: 'mint', tags: ['Climate', 'Energy'],
    blurb: 'CO₂ per person, renewable energy share and electricity access for the biggest emitters.',
    plan: { indicators: ['EN.GHG.CO2.PC.CE.AR5', 'EG.FEC.RNEW.ZS', 'EG.ELC.ACCS.ZS'], countries: ['CHN', 'USA', 'IND', 'DEU', 'BRA', 'GBR'], from: 2000, to: Y, focus: 'IND', title: 'Who is decarbonising?' },
  },
  {
    id: 'health', title: 'Living longer', emoji: '❤️', sketch: 'dots', tone: 'pink', tags: ['Health'],
    blurb: 'Life expectancy, infant mortality and health spending — and how they relate.',
    plan: { indicators: ['SP.DYN.LE00.IN', 'SP.DYN.IMRT.IN', 'SH.XPD.CHEX.GD.ZS'], countries: ['IND', 'CHN', 'USA', 'JPN', 'NGA', 'BRA'], from: 2000, to: Y, focus: 'IND', title: 'Living longer' },
  },
  {
    id: 'digital', title: 'The internet decade', emoji: '📱', sketch: 'line', tone: 'lilac', tags: ['Digital', 'Tech'],
    blurb: 'Internet users and mobile subscriptions — how fast each country came online.',
    plan: { indicators: ['IT.NET.USER.ZS', 'IT.CEL.SETS.P2'], countries: ['IND', 'CHN', 'USA', 'KOR', 'NGA', 'BRA'], from: 2005, to: Y, focus: 'IND', title: 'The internet decade' },
  },
  {
    id: 'south-asia', title: 'South Asia development', emoji: '🏔️', sketch: 'hbars', tone: 'peach', tags: ['Development', 'Jobs'],
    blurb: 'Income, life expectancy, electricity and women in work across India and its neighbours.',
    plan: { indicators: ['NY.GDP.PCAP.CD', 'SP.DYN.LE00.IN', 'EG.ELC.ACCS.ZS', 'SL.TLF.CACT.FE.ZS'], countries: ['IND', 'BGD', 'PAK', 'NPL', 'LKA'], from: 2000, to: Y, focus: 'IND', title: 'South Asia development' },
  },
];

const PLACEHOLDERS = [
  'How has India’s GDP growth compared with China since 2010?',
  'Which BRICS country has the highest life expectancy?',
  'Renewable energy share in Germany, India and the US',
  'Internet users in South Asia over the last 15 years',
];

const TICKER = [
  ['📈', 'India vs China GDP growth since 2010'],
  ['❤️', 'Life expectancy in the BRICS'],
  ['🌱', 'Renewable energy in Germany, India and the US'],
  ['📱', 'Internet users in South Asia'],
  ['💸', 'Inflation and unemployment in the G7'],
  ['🏭', 'CO2 emissions per person: China vs USA vs India'],
  ['✈️', 'Tourist arrivals in Thailand and Singapore'],
  ['👩‍💼', 'Women in the workforce across South Asia'],
  ['🎓', 'University enrolment in Korea, Japan and India'],
  ['👶', 'Fertility rate in Japan, Korea and India since 1990'],
];

const WORDS = [['dashboard', 'w-sun'], ['chart', 'w-pink'], ['answer', 'w-mint'], ['KPI', 'w-sky']];

export function renderLanding(root, act) {
  const timers = [];
  const input = h('input', { class: 'hero-input', type: 'text', name: 'q', autocomplete: 'off', 'aria-label': 'Ask a question about the world', placeholder: PLACEHOLDERS[0] });
  let ex = 0;
  timers.push(setInterval(() => { if (document.activeElement !== input && !input.value) { ex = (ex + 1) % PLACEHOLDERS.length; input.placeholder = PLACEHOLDERS[ex]; } }, 3500));

  // Rotating coloured word in the headline (no highlight behind the text).
  const word = h('span', { class: `swap ${WORDS[0][1]}` }, WORDS[0][0]);
  let wi = 0;
  timers.push(setInterval(() => {
    wi = (wi + 1) % WORDS.length;
    word.classList.add('out');
    setTimeout(() => { word.textContent = WORDS[wi][0]; word.className = `swap ${WORDS[wi][1]} in`; setTimeout(() => word.classList.remove('in'), 20); }, 220);
  }, 2400));

  const hero = h('section', { class: 'hero' },
    h('div', { class: 'hero-copy' },
      h('div', { class: 'eyebrow' }, h('span', { class: 'sticker s-sun' }, '✦ New'), 'Dashboards, without the dashboard'),
      h('h1', { class: 'hero-title' }, 'Ask a question.', h('br'), 'Get a ', word, '.', h('br'), h('span', { class: 'muted-title' }, 'No dataset required.')),
      h('p', { class: 'hero-sub' }, 'Type any question about the world. Datasetless grabs live public data, writes the SQL and builds a dashboard while you blink — or bring your own CSV, Excel, link or table. It all runs privately in your browser.'),
      h('form', { class: 'hero-form', onsubmit: (e) => { e.preventDefault(); act.question(input.value || input.placeholder); } },
        icon('search', 20), input, h('button', { class: 'btn btn-primary btn-lg', type: 'submit' }, 'Build it', icon('arrow', 18))),
      h('div', { class: 'hero-row' },
        h('button', { class: 'dice', type: 'button', onclick: (e) => { e.currentTarget.classList.add('roll'); setTimeout(() => act.surprise(), 380); } }, h('span', { class: 'dice-face', 'aria-hidden': 'true' }, '🎲'), 'Surprise me'),
        h('span', { class: 'hero-note' }, 'No signup · Free · Nothing to install'))),
    heroArt());

  const ticker = h('section', { class: 'ticker', 'aria-label': 'Example questions' },
    tickerRow(TICKER.slice(0, 5).concat(TICKER.slice(0, 5)), act, false),
    tickerRow(TICKER.slice(5).concat(TICKER.slice(5)), act, true));

  const ways = h('section', { class: 'section ways-section' },
    sectionHead('Bring anything', 'Got data? Throw it in.', ''),
    h('div', { class: 'ways' },
      way('upload', 'Upload a file', 'CSV, Excel, JSON, Parquet', 't-sky', act.upload),
      way('link', 'Paste a link', 'Wikipedia, Sheets, GitHub', 't-mint', act.link),
      way('table', 'Paste a table', 'From a sheet, email or PDF', 't-pink', act.paste),
      way('image', 'Snap a table', 'Photo or screenshot', 't-lilac', act.image)));

  const tones = { store: 't-pink', restaurant: 't-peach', saas: 't-sky', agency: 't-lilac' };
  const emojis = { store: '🛍️', restaurant: '🍜', saas: '🚀', agency: '📣' };
  const business = h('section', { class: 'section', id: 'business' },
    sectionHead('No data yet?', 'Peek at your kind of dashboard', 'Pick your business and we’ll build the whole thing on realistic sample data (clearly labelled), then show you how to export your real numbers.'),
    h('div', { class: 'biz-grid' }, SAMPLES.map((s) => h('button', { class: `biz ${tones[s.id] || 't-sun'}`, onclick: () => act.sample(s.id) },
      h('span', { class: 'biz-emoji', 'aria-hidden': 'true' }, emojis[s.id] || '📊'),
      h('span', { class: 'biz-text' }, h('b', {}, s.business), h('span', {}, s.blurb)),
      h('span', { class: 'biz-go' }, 'Try it', icon('arrow', 16))))));

  const gallery = h('section', { class: 'section', id: 'gallery' },
    sectionHead('Live gallery', 'Real data, cooked in seconds', 'Each one pulls fresh numbers from the World Bank when you open it. Remix away: ask questions, filter, swap countries.'),
    h('div', { class: 'gallery' }, GALLERY.map((g, i) => h('button', { class: `g-card t-${g.tone}`, onclick: () => act.gallery(g.id), 'aria-label': `Open ${g.title}` },
      h('div', { class: 'g-art' }, h('span', { class: 'g-emoji', 'aria-hidden': 'true' }, g.emoji), sketch(g.sketch, i + 3)),
      h('div', { class: 'g-body' },
        h('div', { class: 'g-row' }, h('span', { class: 'live-dot' }, h('span', { class: 'pulse' }), 'Live data'), h('span', { class: 'mono muted' }, 'World Bank')),
        h('h3', { class: 'g-title' }, g.title),
        h('p', { class: 'g-blurb' }, g.blurb),
        h('div', { class: 'tags' }, g.tags.map((t) => h('span', { class: 'tag' }, t))))))));

  const how = h('section', { class: 'section', id: 'how' },
    sectionHead('How it works', 'Question in, dashboard out', ''),
    h('div', { class: 'steps' },
      step('🔎', 't-sky', 'Find the data', 'Your question is matched to live public sources, or your own file, link or table is loaded into a SQL engine inside your browser.'),
      step('🧮', 't-sun', 'Write the SQL', 'Columns are profiled, then KPIs, trends, rankings and comparisons are generated. Every chart shows the exact SQL behind it.'),
      step('✅', 't-mint', 'Check before you trust', 'Automatic checks flag missing values, partial periods, duplicates and outliers, so a pretty chart never hides bad data.')),
    h('div', { class: 'privacy' }, h('span', { class: 'privacy-emoji', 'aria-hidden': 'true' }, '🔒'), h('p', {}, h('b', {}, 'Private by design. '), 'Files you upload never leave your device — there’s no server to send them to. Optional AI features use your own key, sent straight from your browser to the provider you pick.')));

  const cta = BRAND.contactUrl ? h('section', { class: 'cta' },
    h('div', {}, h('h2', {}, 'Want this on your live business data? 👋'),
      h('p', {}, `${BRAND.author} builds custom dashboards and data tools connected to your Shopify, database, POS or ads accounts — updating automatically, with logins and scheduled reports.`)),
    h('a', { class: 'btn btn-primary btn-lg', href: BRAND.contactUrl, target: '_blank', rel: 'noopener' }, `Work with ${BRAND.author}`, icon('arrow', 18))) : null;

  const biz = h('section', { class: 'section', id: 'for-business' },
    sectionHead('For businesses', 'Put it inside your product', 'Give your customers dashboards on their own data, in your app, with one HTML tag. Works with any stack, no-code tool or mobile app.'),
    h('div', { class: 'steps' },
      step('🔐', 't-mint', 'Your data never leaves', 'Your API sends each customer their own rows; the engine runs in their browser. We never see it, so security reviews stay short.'),
      step('✅', 't-sun', 'Numbers you can trust', 'Define metrics once in metrics.json. Every chart and AI answer uses them, and each one is tested and marked Verified.'),
      step('🧩', 't-sky', 'Any stack, one tag', 'React, Vue, Angular, plain HTML, WordPress, Salesforce, iOS or Android. Flat pricing, unlimited viewers.')),
    h('div', { class: 'hero-row biz-cta' },
      h('a', { class: 'btn btn-primary btn-lg', href: 'demo/acme.html', target: '_blank' }, 'See it inside a demo app', icon('arrow', 18)),
      h('a', { class: 'btn btn-lg', href: '#/developers' }, 'Integration guide'),
      h('a', { class: 'btn btn-lg btn-ghost', href: '#/pricing' }, 'Pricing')));

  root.replaceChildren(h('div', { class: 'landing' }, hero, ticker, ways, business, gallery, biz, how, cta));
  setTimeout(() => input.focus({ preventScroll: true }), 50);
  return { destroy: () => timers.forEach(clearInterval) };
}

// Animated mini dashboard that fills the right side of the hero.
function heroArt() {
  const kpi = h('div', { class: 'float f1 mini mini-kpi' },
    h('div', { class: 'mini-label' }, 'Revenue'),
    h('div', { class: 'mini-value' }, '₹', h('span', { class: 'count', 'data-to': '291' }, '0'), 'L'),
    h('div', { class: 'mini-delta' }, '▲ 15.4% vs last month'));
  const bars = h('div', { class: 'float f2 mini mini-bars' },
    h('div', { class: 'mini-label' }, 'Sales by region'),
    h('div', { class: 'bars' }, [62, 88, 45, 74, 30].map((v, i) => h('span', { style: `--h:${v}%;--i:${i}` }))));
  const line = h('div', { class: 'float f3 mini mini-line' }, h('div', { class: 'mini-label' }, 'Users over time'));
  line.insertAdjacentHTML('beforeend', '<svg viewBox="0 0 200 80" aria-hidden="true"><path class="draw" d="M4 70 C 30 66, 40 50, 62 52 S 96 30, 118 36 S 160 12, 196 8" fill="none" stroke-width="4" stroke-linecap="round"/><circle class="pop" cx="196" cy="8" r="5"/></svg>');
  const donut = h('div', { class: 'float f4 mini mini-donut' });
  donut.insertAdjacentHTML('beforeend', '<svg viewBox="0 0 42 42" aria-hidden="true"><circle cx="21" cy="21" r="15.9" fill="none" stroke="var(--fun-sky)" stroke-width="7"/><circle class="seg" cx="21" cy="21" r="15.9" fill="none" stroke="var(--fun-pink)" stroke-width="7" stroke-dasharray="38 62" stroke-dashoffset="25"/><circle class="seg" cx="21" cy="21" r="15.9" fill="none" stroke="var(--accent)" stroke-width="7" stroke-dasharray="24 76" stroke-dashoffset="87"/></svg>');
  const art = h('div', { class: 'hero-art', 'aria-hidden': 'true' },
    h('span', { class: 'blob b1' }), h('span', { class: 'blob b2' }), h('span', { class: 'blob b3' }),
    kpi, bars, line, donut,
    h('span', { class: 'sticker s-pink st1' }, 'No signup!'),
    h('span', { class: 'sticker s-mint st2' }, '100% in your browser'),
    h('span', { class: 'sticker s-sky st3' }, 'SQL included ✦'),
    h('span', { class: 'spark sp1' }, '✦'), h('span', { class: 'spark sp2' }, '✦'), h('span', { class: 'spark sp3' }, '✺'));
  // Count-up for the KPI number.
  const el = kpi.querySelector('.count');
  const to = Number(el.dataset.to);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) el.textContent = (to / 100).toFixed(2);
  else {
    const start = performance.now() + 300;
    const tick = (t) => {
      const p = Math.min(1, Math.max(0, (t - start) / 1400));
      el.textContent = ((to * (1 - (1 - p) ** 3)) / 100).toFixed(2);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  return art;
}

function tickerRow(items, act, reverse) {
  const half = items.length / 2;
  return h('div', { class: `ticker-row ${reverse ? 'rev' : ''}` },
    h('div', { class: 'ticker-track' }, items.map(([e, q], i) =>
      h('button', { class: 'q-chip', type: 'button', onclick: () => act.question(q), tabindex: i >= half ? '-1' : null, 'aria-hidden': i >= half ? 'true' : null },
        h('span', { 'aria-hidden': 'true' }, e), q))));
}

function way(ic, title, sub, tone, onClick) {
  return h('button', { class: `way ${tone}`, onclick: onClick }, h('span', { class: 'way-icon' }, icon(ic, 22)), h('span', { class: 'way-text' }, h('b', {}, title), h('span', {}, sub)));
}
function sectionHead(kicker, title, sub) {
  return h('div', { class: 'section-head' }, h('div', { class: 'kicker mono' }, kicker), h('h2', {}, title), sub ? h('p', {}, sub) : null);
}
function step(emoji, tone, title, text) {
  return h('div', { class: `step ${tone}` }, h('div', { class: 'step-emoji', 'aria-hidden': 'true' }, emoji), h('h3', {}, title), h('p', {}, text));
}
