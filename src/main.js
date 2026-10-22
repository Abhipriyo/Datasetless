import './styles.css';
import { h, icon, toast, modal, choose } from './ui/components.js';
import { renderLanding, GALLERY } from './ui/landing.js';
import { renderDashboard } from './ui/dashboard.js';
import { getDB } from './lib/db.js';
import { loadTable, loadObjects, loadFile, loadBuffer } from './lib/load.js';
import { parsePasted } from './lib/parse.js';
import { profileTable } from './lib/profile.js';
import { buildSpec } from './lib/autospec.js';
import { loadWorldBank, planFromText, normalisePlan, INDICATORS, COUNTRY_NAME, parseCountries } from './lib/sources/worldbank.js';
import { normaliseUrl, fetchLink } from './lib/sources/links.js';
import { SAMPLES, SAMPLE_BY_ID } from './lib/samples.js';
import { encodeShare, decodeShare, isShareable } from './lib/share.js';
import { getAI, saveAI, PROVIDERS, testAI, planWorldBank, tableFromImage } from './lib/llm.js';
import { guardSelect } from './lib/sqlguard.js';
import { BRAND, LIMITS } from './config.js';

const app = document.getElementById('app');
let view = null;          // current view handle (destroy)
let current = null;       // { source, spec }
let busy = false;

// ---------------- theme ----------------
const THEME_KEY = 'datasetless.theme';
function applyTheme(t) {
  if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
  else document.documentElement.removeAttribute('data-theme');
}
function effectiveTheme() {
  const t = document.documentElement.getAttribute('data-theme');
  return t || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
}
try { applyTheme(localStorage.getItem(THEME_KEY)); } catch { /* ignore */ }

// ---------------- shell ----------------
const themeBtn = h('button', { class: 'icon-btn', 'aria-label': 'Toggle light/dark theme', title: 'Theme' });
const setThemeIcon = () => themeBtn.replaceChildren(icon(effectiveTheme() === 'dark' ? 'sun' : 'moon', 18));
themeBtn.onclick = () => {
  const next = effectiveTheme() === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  try { localStorage.setItem(THEME_KEY, next); } catch { /* ignore */ }
  setThemeIcon();
  window.dispatchEvent(new Event('themechange'));
};
setThemeIcon();

const aiBtn = h('button', { class: 'btn btn-ghost btn-sm ai-btn', onclick: () => openSettings() });
const setAiBtn = () => aiBtn.replaceChildren(icon('spark', 15), getAI() ? 'AI on' : 'Add AI key');
setAiBtn();

const header = h('header', { class: 'site-head no-print' },
  h('a', { class: 'logo', href: '#/', onclick: (e) => { e.preventDefault(); goHome(); } }, logoMark(), h('span', {}, BRAND.product)),
  h('nav', { class: 'nav' },
    h('a', { href: '#/', onclick: (e) => { e.preventDefault(); goHome('gallery'); } }, 'Gallery'),
    h('a', { href: '#/', onclick: (e) => { e.preventDefault(); goHome('business'); } }, 'Demos'),
    h('a', { href: '#/', onclick: (e) => { e.preventDefault(); goHome('how'); } }, 'How it works')),
  h('div', { class: 'head-right' },
    BRAND.authorUrl ? h('a', { class: 'made-pill', href: BRAND.authorUrl, target: '_blank', rel: 'noopener' }, 'Made by ', h('b', {}, BRAND.author)) : h('span', { class: 'made-pill' }, 'Made by ', h('b', {}, BRAND.author)),
    aiBtn, themeBtn));
const main = h('main', { id: 'main' });
const siteFoot = h('footer', { class: 'site-foot no-print' },
  h('div', {}, h('span', { class: 'logo-small' }, logoMark(16), BRAND.product), ' — made with ♥ by ', BRAND.authorUrl ? h('a', { href: BRAND.authorUrl, target: '_blank', rel: 'noopener' }, BRAND.author) : h('b', {}, BRAND.author), '.'),
  h('div', { class: 'foot-links' },
    BRAND.githubUrl ? h('a', { href: BRAND.githubUrl, target: '_blank', rel: 'noopener' }, 'Source code') : null,
    BRAND.contactUrl ? h('a', { href: BRAND.contactUrl, target: '_blank', rel: 'noopener' }, 'Hire me') : null,
    h('span', { class: 'muted' }, 'Public data: World Bank Open Data (CC BY 4.0) and the sources you link.')));
app.replaceChildren(h('a', { class: 'skip', href: '#main' }, 'Skip to content'), header, main, siteFoot);

function logoMark(size = 22) {
  const s = h('span', { class: 'logo-mark', 'aria-hidden': 'true' });
  s.innerHTML = `<svg width="${size}" height="${size}" viewBox="0 0 32 32"><rect x="1" y="1" width="30" height="30" rx="8" fill="var(--text)"/><rect x="7" y="15" width="4.5" height="10" rx="1.5" fill="var(--bg)"/><rect x="13.75" y="9" width="4.5" height="16" rx="1.5" fill="var(--accent)"/><rect x="20.5" y="12" width="4.5" height="13" rx="1.5" fill="var(--bg)"/></svg>`;
  return s;
}

// ---------------- routing ----------------
function setView(v) { view?.destroy?.(); view = v; }

function goHome(anchor) {
  if (location.hash && location.hash !== '#/') history.pushState(null, '', '#/');
  current = null;
  document.title = `${BRAND.product} — ${BRAND.tagline}`;
  setView(renderLanding(main, actions));
  window.scrollTo({ top: 0 });
  if (anchor) setTimeout(() => document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth' }), 60);
}

async function route() {
  const hash = location.hash || '#/';
  let m;
  if ((m = hash.match(/^#\/d\/(.+)$/))) {
    const payload = decodeShare(m[1]);
    if (!payload) { toast('That share link is broken or from a newer version.', 'error'); return goHome(); }
    return openSource(payload.source, { initial: payload, push: false });
  }
  if ((m = hash.match(/^#\/sample\/([\w-]+)$/)) && SAMPLE_BY_ID[m[1]]) return openSource({ type: 'sample', id: m[1] }, { push: false });
  if ((m = hash.match(/^#\/g\/([\w-]+)$/))) { const g = GALLERY.find((x) => x.id === m[1]); if (g) return openSource({ ...normalisePlan(g.plan), gallery: g.id }, { push: false }); }
  if ((m = hash.match(/^#\/ask\/(.+)$/))) return actions.question(decodeURIComponent(m[1]), { push: false });
  if (hash === '#/local') toast('Uploaded files are not kept after a reload (they never leave your device). Please upload again.');
  goHome();
}
window.addEventListener('popstate', route);

function hashFor(source, extra = {}) {
  if (source.type === 'sample' && !extra.asks?.length && !extra.hidden?.length && !extra.filters && !extra.title) return `#/sample/${source.id}`;
  if (!isShareable(source)) return '#/local';
  if (source.type === 'paste' && source.text.length > LIMITS.maxShareChars) return '#/local';
  return '#/d/' + encodeShare({ source: stripSource(source), ...extra });
}
function stripSource(s) {
  const { understood, gallery, ...rest } = s;
  return rest;
}

// ---------------- actions ----------------
const actions = {
  async question(text, { push = true } = {}) {
    text = String(text || '').trim();
    if (!text) return;
    if (/^https?:\/\//i.test(text)) return openSource({ type: 'link', url: text }, { push });
    let plan;
    if (getAI()) {
      try {
        showLoading(['Understanding your question']);
        const p = await planWorldBank(text);
        if (p.needsData) {
          hideLoading();
          toast('That sounds like your own data. Upload a file, or try a sample business dashboard below.');
          return goHome('business');
        }
        plan = normalisePlan({ ...p, question: text, understood: true });
      } catch (e) {
        console.warn('AI planner failed, using keyword planner', e);
      }
    }
    if (!plan) plan = planFromText(text);
    return openSource(plan, { push });
  },
  surprise() {
    const pool = [...SURPRISES].filter((q) => q !== lastSurprise);
    lastSurprise = pool[Math.floor(Math.random() * pool.length)];
    return actions.question(lastSurprise);
  },
  sample: (id) => openSource({ type: 'sample', id }),
  gallery: (id) => { const g = GALLERY.find((x) => x.id === id); openSource({ ...normalisePlan(g.plan), gallery: g.id }); },
  upload: () => openUpload(),
  link: () => openLinkModal(),
  paste: () => openPasteModal(),
  image: () => openImageModal(),
};

// ---------------- loading overlay ----------------
let loadingEl = null;
let quipTimer = null;
const QUIPS = [
  'Asking the World Bank nicely…', 'Sharpening the crayons…', 'Counting every single row…',
  'Teaching bars to stand up straight…', 'Polishing the KPIs…', 'Convincing the numbers to talk…',
  'Making the lines go up (honestly)…', 'Brewing some SQL…',
];
function showLoading(steps) {
  hideLoading();
  const list = h('ol', { class: 'load-steps' }, steps.map((s) => h('li', {}, h('span', { class: 'spinner' }), s)));
  const quip = h('p', { class: 'load-quip' }, QUIPS[Math.floor(Math.random() * QUIPS.length)]);
  const bars = h('div', { class: 'load-bars', 'aria-hidden': 'true' }, [0, 1, 2, 3, 4].map(() => h('span')));
  loadingEl = h('div', { class: 'loading', role: 'status', 'aria-live': 'polite' }, h('div', { class: 'loading-box' }, bars, list, quip));
  document.body.append(loadingEl);
  let qi = 0;
  quipTimer = setInterval(() => { qi = (qi + 1) % QUIPS.length; quip.textContent = QUIPS[qi]; }, 1600);
  return {
    step(text) {
      [...list.children].forEach((li) => { li.classList.add('done'); li.querySelector('.spinner')?.replaceWith(icon('check', 15)); });
      list.append(h('li', {}, h('span', { class: 'spinner' }), text));
    },
  };
}
function hideLoading() { clearInterval(quipTimer); loadingEl?.remove(); loadingEl = null; }

const SURPRISES = [
  'Which BRICS country has the highest life expectancy?', 'Internet users in India, China and Nigeria since 2005',
  'Renewable energy share in Germany, India and the US', 'Inflation and unemployment in the G7',
  'CO2 emissions per person: China vs USA vs India', 'Tourist arrivals in Thailand, Singapore and Malaysia',
  'Women in the workforce across South Asia', 'Military spending in the US, China, Russia and India',
  'Fertility rate in Japan, Korea and India since 1990', 'Population of the most populous countries',
];
let lastSurprise = null;

// ---------------- core pipeline ----------------
async function openSource(source, { initial = null, push = true, file = null } = {}) {
  if (busy) return;
  busy = true;
  const t0 = performance.now();
  const L = showLoading(['Starting the query engine']);
  try {
    await getDB();
    let opts = {}, sourceInfo, planChip = null, questions = null;
    if (source.type === 'worldbank') {
      L.step('Fetching live data from the World Bank');
      const wb = await loadWorldBank(source);
      await loadObjects(wb.rows, wb.headers);
      const names = source.countries.map((c) => COUNTRY_NAME[c] || c);
      opts = {
        title: source.title, exclude: ['Code'], keepOrder: true, panel: true, primaryDim: 'Country', currency: '$',
        focus: COUNTRY_NAME[source.focus] || source.focus, colorOrder: names,
        measureMeta: Object.fromEntries(wb.indicators.map((i) => [i.label, { format: i.format, additive: !!i.additive, source: i.code }])),
      };
      sourceInfo = {
        kind: 'live', provider: 'World Bank', updated: wb.lastUpdated,
        sourceText: `World Bank Open Data (CC BY 4.0): ${wb.indicators.map((i) => i.label).join(', ')}`,
        url: `https://data.worldbank.org/indicator/${wb.indicators.map((i) => i.code).join(',')}?locations=${source.countries.map((c) => c).join('-')}`,
      };
      planChip = `${source.understood === false ? 'Couldn’t spot specific indicators, so here’s an overview. ' : ''}Showing ${wb.indicators.map((i) => i.label.replace(/\s*\(.*\)$/, '')).join(', ')} · ${names.join(', ')} · ${source.from}–${source.to}`;
      if (wb.failed.length) toast(`No data for: ${wb.failed.map((f) => f.ind.label).join(', ')}`);
      questions = [`Which country improved ${wb.indicators[0].label.replace(/\s*\(.*\)$/, '').toLowerCase()} the most since ${source.from}?`, `Rank countries by ${wb.indicators[wb.indicators.length > 1 ? 1 : 0].label.replace(/\s*\(.*\)$/, '').toLowerCase()} in the latest year`, `Average ${wb.indicators[0].label.replace(/\s*\(.*\)$/, '').toLowerCase()} by decade for each country`];
    } else if (source.type === 'sample') {
      const s = SAMPLE_BY_ID[source.id];
      if (!s) throw new Error('Unknown sample.');
      L.step('Generating realistic sample data');
      const rows = s.generate();
      await loadObjects(rows);
      opts = { title: `${s.name} dashboard`, currency: s.currency, derived: s.derived, countLabel: s.countLabel, measureOrder: s.measureOrder, nonAdditive: s.nonAdditive };
      sourceInfo = { kind: 'sample', sample: s, sourceText: 'Synthetic sample data generated in your browser (not real figures).' };
      questions = s.questions;
    } else if (source.type === 'link') {
      const info = normaliseUrl(source.url);
      L.step(`Reading ${info.label}`);
      const got = await fetchLink(info);
      let detail = '';
      if (got.tables) {
        let ti = source.table;
        if (ti == null || !got.tables[ti]) {
          ti = got.tables.length === 1 ? 0 : await pickTable(got.tables);
          if (ti == null) throw new Error('cancelled');
          source = { ...source, table: ti };
        }
        await loadTable(got.tables[ti].data);
        detail = got.tables[ti].caption ? `Table: ${got.tables[ti].caption}` : `Table ${ti + 1}`;
      } else {
        const r = await loadBuffer(got.buffer, got.ext, { pickSheet });
        detail = r.detail || '';
      }
      opts = { title: prettyTitle(info.label) };
      sourceInfo = { kind: 'link', sourceText: info.label, url: info.original, detail };
    } else if (source.type === 'paste') {
      L.step('Reading your table');
      await loadTable(parsePasted(source.text));
      opts = { title: source.title || 'Pasted table' };
      sourceInfo = { kind: 'paste', sourceText: 'A table you pasted (processed in your browser)' };
    } else if (source.type === 'file') {
      if (!file) throw new Error('Please upload the file again.');
      L.step(`Reading ${file.name}`);
      const r = await loadFile(file, { pickSheet });
      opts = { title: prettyTitle(file.name.replace(/\.[^.]+$/, '')) };
      sourceInfo = { kind: 'file', sourceText: `${file.name} (processed on this device, never uploaded)`, detail: r.detail };
    } else {
      throw new Error('Unknown source.');
    }

    L.step('Profiling columns');
    const profile = await profileTable();
    if (!profile.columns.some((c) => ['measure', 'dim', 'time', 'year'].includes(c.kind))) throw new Error('Could not find any usable columns in that data.');
    L.step('Designing the dashboard');
    const spec = await buildSpec(profile, opts);
    if (initial) {
      if (initial.title) spec.title = String(initial.title).slice(0, 120);
      if (Array.isArray(initial.hidden)) spec.hidden = initial.hidden.filter((x) => typeof x === 'string');
      if (Array.isArray(initial.asks)) spec.asks = initial.asks.filter((a) => { try { guardSelect(a.sql); return true; } catch { return false; } }).slice(0, 12);
    }
    const defaultTitle = spec.title;
    current = { source, spec };

    const hash = hashFor(source, initial ? { title: initial.title, asks: spec.asks, hidden: spec.hidden, filters: initial.filters } : {});
    if (push) history.pushState(null, '', hash); else history.replaceState(null, '', hash);

    hideLoading();
    let handle;
    const onChange = () => {
      const st = handle?.getState?.() || {};
      const filters = (st.dimValues?.length || st.from || st.to) ? { dimValues: st.dimValues, from: st.from, to: st.to } : undefined;
      const extra = { title: spec.title !== defaultTitle ? spec.title : undefined, asks: spec.asks.length ? spec.asks : undefined, hidden: spec.hidden.length ? spec.hidden : undefined, filters };
      history.replaceState(null, '', hashFor(source, extra));
    };
    setView({ destroy: () => handle?.destroy() });
    handle = await renderDashboard(main, {
      spec, profile, sourceInfo, planChip, questions, initial,
      buildMs: performance.now() - t0,
      onHome: () => goHome(),
      onUpload: () => openUpload(sourceInfo.sample),
      onSettings: () => openSettings(),
      onEditSource: source.type === 'worldbank' ? () => openWBEditor(source) : null,
      onShare: () => share(source),
      onChange,
    });
    window.scrollTo({ top: 0 });
    if (push && !initial) confetti();
  } catch (e) {
    hideLoading();
    if (e.message !== 'cancelled') {
      console.error(e);
      toast(e.message || 'Something went wrong.', 'error', 8000);
      if (e.cors && source.type === 'link') openUpload();
    }
    if (!current) goHome();
  } finally {
    busy = false;
    hideLoading();
  }
}

function prettyTitle(s) {
  const t = String(s).replace(/^(Wikipedia|GitHub|Our World in Data):\s*/, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : 'Your dashboard';
}

async function pickTable(tables) {
  hideLoading();
  const pick = await choose('Which table?', tables.map((t, i) => ({ ...t, i })), (t) => [
    h('b', {}, t.caption || `Table ${t.i + 1}`),
    h('span', { class: 'muted' }, `${t.data.rows.length} rows · ${t.data.headers.slice(0, 5).join(', ')}${t.data.headers.length > 5 ? '…' : ''}`)]);
  showLoading(['Loading the table']);
  return pick ? pick.i : null;
}
async function pickSheet(sheets) {
  hideLoading();
  const pick = await choose('Which sheet?', sheets, (s) => [h('b', {}, s.name), h('span', { class: 'muted' }, `${s.grid.length} rows`)]);
  showLoading(['Loading the sheet']);
  return pick;
}

// ---------------- share ----------------
async function share(source) {
  if (!isShareable(source) || location.hash === '#/local') {
    modal({
      title: 'Share this dashboard',
      body: h('div', { class: 'stack' }, h('p', {}, 'Your uploaded data never leaves this device, so there is no link that could show it to someone else.'),
        h('p', { class: 'muted' }, 'Export an image or a PDF to share it instead. Links work for public data, samples, links and small pasted tables.')),
      actions: [{ label: 'Export PDF', onClick: (close) => { close(); window.print(); } }, { label: 'OK', primary: true, onClick: (close) => close() }],
    });
    return;
  }
  const url = location.href;
  try { await navigator.clipboard.writeText(url); toast('Link copied. Anyone with it sees this dashboard with live data.', 'success'); }
  catch {
    const inp = h('input', { class: 'input', value: url, readonly: true, onfocus: (e) => e.target.select() });
    modal({ title: 'Share link', body: h('div', { class: 'stack' }, h('p', {}, 'Copy this link:'), inp), actions: [{ label: 'Done', primary: true, onClick: (c) => c() }] });
  }
}

// ---------------- modals ----------------
function openUpload(sample) {
  const fileInput = h('input', { type: 'file', accept: '.csv,.tsv,.txt,.xlsx,.xls,.xlsm,.ods,.json,.ndjson,.parquet', hidden: true });
  const drop = h('label', { class: 'dropzone', tabindex: '0' },
    icon('upload', 28), h('b', {}, 'Drop a file here or click to choose'),
    h('span', { class: 'muted' }, `CSV, Excel, JSON or Parquet · up to ${LIMITS.maxFileMB} MB · never leaves your device`), fileInput);
  let m;
  const handle = (file) => { if (!file) return; m.close(); openSource({ type: 'file', name: file.name }, { file }); };
  fileInput.onchange = () => handle(fileInput.files[0]);
  drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', (e) => { e.preventDefault(); handle(e.dataTransfer.files[0]); });
  drop.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); } });
  const tips = h('div', { class: 'export-tips' }, h('div', { class: 'kicker mono' }, 'How to export your data'),
    h('ul', {}, SAMPLES.map((s) => h('li', { class: sample?.id === s.id ? 'on' : '' }, h('b', {}, s.name + ': '), s.export))));
  m = modal({ title: 'Upload your data', body: h('div', { class: 'stack' }, drop, tips), wide: true });
}

function openLinkModal() {
  const inp = h('input', { class: 'input', type: 'url', placeholder: 'https://…', 'aria-label': 'Link to data' });
  const examples = [
    ['Wikipedia: countries by GDP', 'https://en.wikipedia.org/wiki/List_of_countries_by_GDP_(nominal)'],
    ['Wikipedia: Indian states by GDP', 'https://en.wikipedia.org/wiki/List_of_Indian_states_and_union_territories_by_GDP'],
    ['Our World in Data: CO₂ per person', 'https://ourworldindata.org/grapher/co-emissions-per-capita'],
  ];
  let m;
  const go = (url) => { url = (url || inp.value).trim(); if (!url) return inp.focus(); m.close(); openSource({ type: 'link', url }); };
  m = modal({
    title: 'Build from a link',
    body: h('form', { class: 'stack', onsubmit: (e) => { e.preventDefault(); go(); } }, inp,
      h('p', { class: 'muted small' }, 'Works with Wikipedia articles, public Google Sheets, GitHub files, Our World in Data charts and direct CSV / JSON / Excel / Parquet links. Some sites block browser apps — if so, download the file and upload it instead.'),
      h('div', { class: 'kicker mono' }, 'Try one'),
      h('div', { class: 'choice-list' }, examples.map(([label, url]) => h('button', { type: 'button', class: 'choice', onclick: () => go(url) }, h('b', {}, label), h('span', { class: 'muted small' }, url))))),
    actions: [{ label: 'Build dashboard', primary: true, onClick: () => go() }],
  });
}

function openPasteModal() {
  const ta = h('textarea', { class: 'input paste-area', rows: 10, placeholder: 'Paste rows copied from Excel, Google Sheets, a web page, an email or a Markdown table.\n\nRegion\tQ1\tQ2\nNorth\t120\t135\nSouth\t98\t87', 'aria-label': 'Table text' });
  modal({
    title: 'Paste a table', wide: true,
    body: h('div', { class: 'stack' }, ta, h('p', { class: 'muted small' }, 'Tabs, commas, semicolons and Markdown tables are detected automatically. Numbers like “₹1,20,000”, “$4.5M” or “12%” are cleaned up for you.')),
    actions: [{ label: 'Build dashboard', primary: true, onClick: (close) => {
      try { parsePasted(ta.value); } catch (e) { toast(e.message, 'error'); return; }
      close(); openSource({ type: 'paste', text: ta.value });
    } }],
  });
}

function openImageModal() {
  if (!getAI()) {
    modal({
      title: 'Snap a table',
      body: h('div', { class: 'stack' }, h('p', {}, 'Reading a table from a photo or screenshot uses an AI vision model with your own API key. The key stays in this browser.'), h('p', { class: 'muted' }, 'Prefer no AI? Copy the table as text and use “Paste a table”.')),
      actions: [{ label: 'Paste a table instead', onClick: (c) => { c(); openPasteModal(); } }, { label: 'Add AI key', primary: true, onClick: (c) => { c(); openSettings(); } }],
    });
    return;
  }
  const fi = h('input', { type: 'file', accept: 'image/*', hidden: true });
  const drop = h('label', { class: 'dropzone', tabindex: '0' }, icon('image', 28), h('b', {}, 'Choose a photo or screenshot of a table'), h('span', { class: 'muted' }, 'PNG or JPG · sent only to your AI provider'), fi);
  let m;
  const run = async (file) => {
    if (!file) return;
    m.close();
    const L = showLoading(['Reading the table from your image']);
    try {
      const csv = await tableFromImage(file);
      L.step('Checking the result');
      parsePasted(csv);
      hideLoading();
      openSource({ type: 'paste', text: csv, title: 'Table from image' });
    } catch (e) { hideLoading(); toast(e.message, 'error'); }
  };
  fi.onchange = () => run(fi.files[0]);
  drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('drop', (e) => { e.preventDefault(); run(e.dataTransfer.files[0]); });
  m = modal({ title: 'Snap a table', body: drop });
}

function openSettings() {
  const s = getAI() || { provider: 'anthropic', key: '', model: '' };
  const prov = h('select', { class: 'select', 'aria-label': 'Provider' }, Object.entries(PROVIDERS).map(([k, p]) => h('option', { value: k, selected: k === s.provider }, p.name)));
  const key = h('input', { class: 'input', type: 'password', value: s.key || '', autocomplete: 'off', spellcheck: 'false', 'aria-label': 'API key' });
  const model = h('input', { class: 'input', type: 'text', value: s.model || '', 'aria-label': 'Model' });
  const base = h('input', { class: 'input', type: 'url', value: s.baseUrl || '', placeholder: 'https://api.groq.com/openai/v1', 'aria-label': 'Base URL' });
  const baseRow = h('label', { class: 'field' }, h('span', {}, 'Base URL'), base);
  const sync = () => { const p = PROVIDERS[prov.value]; key.placeholder = p.keyHint; model.placeholder = p.model || 'model name'; baseRow.hidden = !p.needsBase; };
  prov.onchange = sync; sync();
  const read = () => ({ provider: prov.value, key: key.value.trim(), model: model.value.trim(), baseUrl: base.value.trim() });
  modal({
    title: 'AI settings',
    body: h('div', { class: 'stack' },
      h('p', { class: 'muted small' }, 'Optional. Adds plain-English questions, smarter question routing and reading tables from images. Your key is stored only in this browser and requests go straight to the provider — no Datasetless server is involved.'),
      h('label', { class: 'field' }, h('span', {}, 'Provider'), prov),
      h('label', { class: 'field' }, h('span', {}, 'API key'), key),
      h('label', { class: 'field' }, h('span', {}, 'Model (optional)'), model),
      baseRow),
    actions: [
      { label: 'Remove key', onClick: (c) => { saveAI(null); setAiBtn(); toast('AI key removed from this browser.'); c(); } },
      { label: 'Test', onClick: async () => { const r = read(); if (!r.key) return toast('Enter a key first.', 'error'); saveAI(r); try { await testAI(); toast('Connected.', 'success'); } catch (e) { toast(e.message, 'error'); } setAiBtn(); } },
      { label: 'Save', primary: true, onClick: (c) => { const r = read(); if (!r.key) return toast('Enter a key first.', 'error'); if (r.provider === 'compatible' && !/^https:\/\//.test(r.baseUrl)) return toast('Enter an https base URL.', 'error'); saveAI(r); setAiBtn(); toast('Saved. AI features are on.', 'success'); c(); } },
    ],
  });
}

function openWBEditor(source) {
  const sel = new Set(source.indicators);
  const groups = {};
  for (const ind of INDICATORS) (groups[ind.topic] ||= []).push(ind);
  const names = { economy: 'Economy', trade: 'Trade', work: 'Jobs', population: 'Population', health: 'Health', climate: 'Climate', energy: 'Energy', digital: 'Digital', education: 'Education', poverty: 'Poverty & inequality' };
  const indList = h('div', { class: 'ind-groups' }, Object.entries(groups).map(([topic, list]) => h('fieldset', { class: 'ind-group' }, h('legend', {}, names[topic] || topic),
    list.map((ind) => { const cb = h('input', { type: 'checkbox', checked: sel.has(ind.code) }); cb.onchange = () => (cb.checked ? sel.add(ind.code) : sel.delete(ind.code)); return h('label', { class: 'check-item' }, cb, h('span', {}, ind.label)); }))));
  const countries = h('input', { class: 'input', value: source.countries.map((c) => COUNTRY_NAME[c] || c).join(', '), 'aria-label': 'Countries' });
  const from = h('input', { class: 'input', type: 'number', min: 1960, max: new Date().getFullYear(), value: source.from, 'aria-label': 'From year' });
  const to = h('input', { class: 'input', type: 'number', min: 1960, max: new Date().getFullYear(), value: source.to, 'aria-label': 'To year' });
  modal({
    title: 'Edit data', wide: true,
    body: h('div', { class: 'stack' },
      h('label', { class: 'field' }, h('span', {}, 'Countries (names, groups like “BRICS” or “G7”, or ISO codes — first one is the focus)'), countries),
      h('div', { class: 'row2' }, h('label', { class: 'field' }, h('span', {}, 'From'), from), h('label', { class: 'field' }, h('span', {}, 'To'), to)),
      h('div', { class: 'field' }, h('span', {}, 'Indicators (up to 6)'), indList)),
    actions: [{ label: 'Rebuild dashboard', primary: true, onClick: (close) => {
      const cs = parseCountries(countries.value);
      if (!cs.length) return toast('Add at least one country.', 'error');
      if (!sel.size) return toast('Pick at least one indicator.', 'error');
      if (sel.size > 6) return toast('Pick up to 6 indicators.', 'error');
      const order = [...source.indicators.filter((c) => sel.has(c)), ...[...sel].filter((c) => !source.indicators.includes(c))];
      let plan;
      try { plan = normalisePlan({ indicators: order, countries: cs, from: from.value, to: to.value, focus: cs[0], title: source.title }); } catch (e) { return toast(e.message, 'error'); }
      close(); current = null; openSource(plan);
    } }],
  });
}

// Global drag & drop on the landing page.
window.addEventListener('dragover', (e) => { if (!current && e.dataTransfer?.types?.includes('Files')) e.preventDefault(); });
window.addEventListener('drop', (e) => {
  if (current || !e.dataTransfer?.files?.length || e.target.closest?.('.dropzone')) return;
  e.preventDefault();
  const file = e.dataTransfer.files[0];
  openSource({ type: 'file', name: file.name }, { file });
});

// Optional privacy-friendly analytics (set VITE_PLAUSIBLE_DOMAIN).
if (import.meta.env.VITE_PLAUSIBLE_DOMAIN) {
  document.head.append(h('script', { defer: true, 'data-domain': import.meta.env.VITE_PLAUSIBLE_DOMAIN, src: 'https://plausible.io/js/script.js' }));
}

// Warm the engine while the user reads the landing page.
setTimeout(() => getDB().catch((e) => console.warn('DuckDB init failed', e)), 400);
route();

// A small celebration when a brand-new dashboard is built.
function confetti() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const colors = ['#f5c84c', '#ff7eb6', '#5ad1a4', '#6aa6f0', '#b69cff', '#ff9f5a'];
  const wrap = h('div', { class: 'confetti', 'aria-hidden': 'true' });
  for (let i = 0; i < 70; i++) {
    const p = h('i');
    const x = (Math.random() - 0.5) * 900, y = -(180 + Math.random() * 380);
    p.style.cssText = `--x:${x}px;--y:${y}px;--r:${Math.random() * 720 - 360}deg;--d:${0.9 + Math.random() * 0.8}s;background:${colors[i % colors.length]};left:${50 + (Math.random() - 0.5) * 20}%;width:${6 + Math.random() * 6}px;height:${8 + Math.random() * 8}px;border-radius:${Math.random() > 0.5 ? '50%' : '2px'}`;
    wrap.append(p);
  }
  document.body.append(wrap);
  setTimeout(() => wrap.remove(), 2000);
}
