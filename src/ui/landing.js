// Landing page: ask box, ways in, business demos, live gallery, how it works.
import { h, icon, sketch } from './components.js';
import { SAMPLES } from '../lib/samples.js';
import { BRAND } from '../config.js';

const Y = new Date().getFullYear();

export const GALLERY = [
  {
    id: 'india-peers', title: 'India vs emerging peers', sketch: 'line', tags: ['Economy', 'Growth', 'Inflation'],
    blurb: 'GDP growth, income per person, inflation and jobs for India, China, Brazil and Indonesia since 2000.',
    plan: { indicators: ['NY.GDP.MKTP.KD.ZG', 'NY.GDP.PCAP.CD', 'FP.CPI.TOTL.ZG', 'SL.UEM.TOTL.ZS', 'NV.IND.MANF.ZS'], countries: ['IND', 'CHN', 'BRA', 'IDN'], from: 2000, to: Y, focus: 'IND', title: 'India vs emerging peers' },
  },
  {
    id: 'brics', title: 'BRICS at a glance', sketch: 'bars', tags: ['Economy', 'Population'],
    blurb: 'Economy size, income per person, population and life expectancy across the five original BRICS.',
    plan: { indicators: ['NY.GDP.MKTP.CD', 'NY.GDP.PCAP.CD', 'SP.POP.TOTL', 'SP.DYN.LE00.IN'], countries: ['CHN', 'IND', 'BRA', 'RUS', 'ZAF'], from: 2000, to: Y, focus: 'IND', title: 'BRICS at a glance' },
  },
  {
    id: 'climate', title: 'Who is decarbonising?', sketch: 'area', tags: ['Climate', 'Energy'],
    blurb: 'CO₂ per person, renewable energy share and electricity access for the biggest emitters.',
    plan: { indicators: ['EN.GHG.CO2.PC.CE.AR5', 'EG.FEC.RNEW.ZS', 'EG.ELC.ACCS.ZS'], countries: ['CHN', 'USA', 'IND', 'DEU', 'BRA', 'GBR'], from: 2000, to: Y, focus: 'IND', title: 'Who is decarbonising?' },
  },
  {
    id: 'health', title: 'Living longer', sketch: 'dots', tags: ['Health'],
    blurb: 'Life expectancy, infant mortality and health spending — and how they relate.',
    plan: { indicators: ['SP.DYN.LE00.IN', 'SP.DYN.IMRT.IN', 'SH.XPD.CHEX.GD.ZS'], countries: ['IND', 'CHN', 'USA', 'JPN', 'NGA', 'BRA'], from: 2000, to: Y, focus: 'IND', title: 'Living longer' },
  },
  {
    id: 'digital', title: 'The internet decade', sketch: 'line', tags: ['Digital', 'Tech'],
    blurb: 'Internet users and mobile subscriptions — how fast each country came online.',
    plan: { indicators: ['IT.NET.USER.ZS', 'IT.CEL.SETS.P2'], countries: ['IND', 'CHN', 'USA', 'KOR', 'NGA', 'BRA'], from: 2005, to: Y, focus: 'IND', title: 'The internet decade' },
  },
  {
    id: 'south-asia', title: 'South Asia development', sketch: 'hbars', tags: ['Development', 'Jobs'],
    blurb: 'Income, life expectancy, electricity and women in work across India and its neighbours.',
    plan: { indicators: ['NY.GDP.PCAP.CD', 'SP.DYN.LE00.IN', 'EG.ELC.ACCS.ZS', 'SL.TLF.CACT.FE.ZS'], countries: ['IND', 'BGD', 'PAK', 'NPL', 'LKA'], from: 2000, to: Y, focus: 'IND', title: 'South Asia development' },
  },
];

const EXAMPLES = [
  'How has India’s GDP growth compared with China since 2010?',
  'Which BRICS country has the highest life expectancy?',
  'Renewable energy share in Germany, India and the US',
  'Internet users in South Asia over the last 15 years',
  'Inflation and unemployment in the G7',
  'CO2 emissions per person: China vs USA vs India',
];

export function renderLanding(root, act) {
  const input = h('input', { class: 'hero-input', type: 'text', name: 'q', autocomplete: 'off', 'aria-label': 'Ask a question about the world', placeholder: EXAMPLES[0] });
  let ex = 0;
  const rot = setInterval(() => { if (document.activeElement !== input && !input.value) { ex = (ex + 1) % EXAMPLES.length; input.placeholder = EXAMPLES[ex]; } }, 3500);

  const hero = h('section', { class: 'hero' },
    h('div', { class: 'eyebrow' }, h('span', { class: 'badge badge-accent' }, 'New'), 'Dashboards, without the dashboard'),
    h('h1', { class: 'hero-title' }, 'Ask a question.', h('br'), 'Get a ', h('span', { class: 'hl' }, 'dashboard'), '.', h('br'), h('span', { class: 'muted-title' }, 'No dataset required.')),
    h('p', { class: 'hero-sub' }, 'Type a question about the world and Datasetless finds live public data, writes the SQL and builds a polished dashboard in seconds — or bring your own CSV, Excel, link or table. Everything runs privately in your browser.'),
    h('form', { class: 'hero-form', onsubmit: (e) => { e.preventDefault(); act.question(input.value || input.placeholder); } },
      icon('search', 20), input, h('button', { class: 'btn btn-primary btn-lg', type: 'submit' }, 'Build dashboard', icon('arrow', 18))),
    h('div', { class: 'examples' }, EXAMPLES.slice(1, 5).map((e) => h('button', { class: 'chip-btn', onclick: () => act.question(e) }, e))),
    h('div', { class: 'ways' },
      way('upload', 'Upload a file', 'CSV, Excel, JSON or Parquet', act.upload),
      way('link', 'Paste a link', 'Wikipedia, Google Sheets, GitHub, OWID', act.link),
      way('table', 'Paste a table', 'From a spreadsheet, email or PDF', act.paste),
      way('image', 'Snap a table', 'Photo or screenshot (AI key)', act.image)),
  );

  const business = h('section', { class: 'section', id: 'business' },
    sectionHead('No data yet?', 'See your kind of dashboard first', 'Pick your business. We build the full dashboard on realistic sample data, clearly labelled — then show you how to export your real numbers.'),
    h('div', { class: 'biz-grid' }, SAMPLES.map((s) => h('button', { class: 'biz', onclick: () => act.sample(s.id) },
      h('span', { class: 'biz-icon' }, icon(s.icon, 22)),
      h('span', { class: 'biz-text' }, h('b', {}, s.business), h('span', {}, s.blurb)),
      icon('arrow', 18)))));

  const gallery = h('section', { class: 'section', id: 'gallery' },
    sectionHead('Live gallery', 'Real data, built in seconds', 'Each dashboard pulls fresh numbers from the World Bank when you open it. Remix any of them: ask questions, filter, change countries.'),
    h('div', { class: 'gallery' }, GALLERY.map((g, i) => h('button', { class: 'g-card', onclick: () => act.gallery(g.id), 'aria-label': `Open ${g.title}` },
      h('div', { class: 'g-art' }, sketch(g.sketch, i + 3)),
      h('div', { class: 'g-body' },
        h('div', { class: 'g-row' }, h('span', { class: 'badge badge-accent' }, 'Live data'), h('span', { class: 'mono muted' }, 'World Bank')),
        h('h3', { class: 'g-title' }, g.title),
        h('p', { class: 'g-blurb' }, g.blurb),
        h('div', { class: 'tags' }, g.tags.map((t) => h('span', { class: 'tag' }, t))))))));

  const how = h('section', { class: 'section', id: 'how' },
    sectionHead('How it works', 'From question to dashboard', ''),
    h('div', { class: 'steps' },
      step('1', 'Find the data', 'Your question is matched to live public sources — or your own file, link or table is loaded straight into a SQL engine inside your browser.'),
      step('2', 'Write the SQL', 'Columns are profiled, then KPIs, trends, rankings and comparisons are generated. Every chart shows the exact SQL behind it.'),
      step('3', 'Check before you trust', 'Automatic checks flag missing values, partial periods, duplicates and outliers, so a pretty chart never hides bad data.')),
    h('div', { class: 'privacy' }, icon('lock', 18), h('p', {}, h('b', {}, 'Private by design. '), 'Files you upload never leave your device — there is no server to send them to. Optional AI features use your own key, sent directly from your browser to the provider you choose.')));

  const cta = BRAND.contactUrl ? h('section', { class: 'cta' },
    h('div', {}, h('h2', {}, 'Want this on your live business data?'),
      h('p', {}, `${BRAND.author} builds custom dashboards and data tools connected to your Shopify, database, POS or ads accounts — updating automatically, with logins and scheduled reports.`)),
    h('a', { class: 'btn btn-primary btn-lg', href: BRAND.contactUrl, target: '_blank', rel: 'noopener' }, `Work with ${BRAND.author}`, icon('arrow', 18))) : null;

  root.replaceChildren(h('div', { class: 'landing' }, hero, business, gallery, how, cta));
  setTimeout(() => input.focus({ preventScroll: true }), 50);
  return { destroy: () => clearInterval(rot) };
}

function way(ic, title, sub, onClick) {
  return h('button', { class: 'way', onclick: onClick }, h('span', { class: 'way-icon' }, icon(ic, 20)), h('span', { class: 'way-text' }, h('b', {}, title), h('span', {}, sub)));
}
function sectionHead(kicker, title, sub) {
  return h('div', { class: 'section-head' }, h('div', { class: 'kicker mono' }, kicker), h('h2', {}, title), sub ? h('p', {}, sub) : null);
}
function step(n, title, text) {
  return h('div', { class: 'step' }, h('div', { class: 'step-n mono' }, n), h('h3', {}, title), h('p', {}, text));
}
