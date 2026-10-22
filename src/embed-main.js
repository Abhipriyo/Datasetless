// The dashboard that runs inside an embed iframe. It receives configuration and
// data from the host page (through embed.js or postMessage), or loads a public
// source from its own URL. Data stays inside the viewer's browser.
import './styles.css';
import { h, icon } from './ui/components.js';
import { renderDashboard } from './ui/dashboard.js';
import { loadSource, buildModel } from './lib/pipeline.js';
import { decodeShare } from './lib/share.js';
import { SAMPLE_BY_ID } from './lib/samples.js';
import { verifyLicense, PLANS } from './lib/license.js';
import { setTransport } from './lib/llm.js';
import { BRAND, SITE_URL } from './config.js';

document.documentElement.classList.add('embedded');
const root = document.getElementById('app');
const inFrame = window.parent !== window;
const post = (msg) => { if (inFrame) window.parent.postMessage({ ds: 1, ...msg }, parentOrigin || '*'); };
let parentOrigin = null;
let handle = null;
let started = false;
let lastInit = null;
const aiWaiters = new Map();

function parentHost() {
  try {
    if (location.ancestorOrigins?.length) return new URL(location.ancestorOrigins[0]).hostname;
  } catch { /* ignore */ }
  if (parentOrigin) return new URL(parentOrigin).hostname;
  try { if (document.referrer) return new URL(document.referrer).hostname; } catch { /* ignore */ }
  return inFrame ? '' : location.hostname;
}

function status(text, kind = 'loading') {
  root.replaceChildren(h('div', { class: `embed-status ${kind}` },
    kind === 'loading' ? h('div', { class: 'load-bars', 'aria-hidden': 'true' }, [0, 1, 2, 3, 4].map(() => h('span'))) : icon(kind === 'error' ? 'alert' : 'info', 22),
    h('p', {}, text)));
  reportHeight();
}

function applyLook(config, plan) {
  if (config.theme === 'light' || config.theme === 'dark') document.documentElement.setAttribute('data-theme', config.theme);
  else document.documentElement.removeAttribute('data-theme');
  const accent = String(config.accent || '').trim();
  if (plan.customTheme && /^#[0-9a-f]{6}$/i.test(accent)) {
    const n = parseInt(accent.slice(1), 16);
    const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
    const r = document.documentElement.style;
    r.setProperty('--accent', accent);
    r.setProperty('--accent-ink', lum > 0.6 ? '#1b1b1d' : '#ffffff');
    r.setProperty('--accent-text', accent);
    r.setProperty('--series-single', accent);
  }
  if (config.transparent) document.documentElement.classList.add('transparent');
}

async function resolvePlan(key) {
  const host = parentHost();
  // "preview" unlocks Pro features on localhost or on our own demo pages, with a ribbon.
  if (key === 'preview') {
    const own = parentOrigin ? parentOrigin === location.origin : (!inFrame || host === location.hostname);
    const local = /^(localhost|127\.0\.0\.1|.*\.localhost)$/.test(host);
    return own || local ? { valid: true, plan: PLANS.pro, preview: true } : { valid: false, plan: PLANS.free, reason: 'Preview keys only work on localhost.' };
  }
  return verifyLicense(key, { hostname: host || 'unknown' });
}

async function start(init) {
  if (started && !init.reload) return;
  started = true;
  lastInit = init;
  const config = init.config || {};
  const lic = await resolvePlan(config.license);
  const plan = lic.plan;
  if (config.license && !lic.valid) console.warn(`[Datasetless] ${lic.reason} Running on the Free plan.`);
  applyLook(config, plan);

  // AI goes through the host's endpoint (Pro). The host page answers 'ai' messages.
  const aiOn = !!(plan.ai && config.hasAI && inFrame);
  setTransport(aiOn ? (prompt) => new Promise((resolve, reject) => {
    const id = Math.random().toString(36).slice(2);
    aiWaiters.set(id, { resolve, reject });
    post({ type: 'ai', id, prompt: { system: prompt.system, user: prompt.user, maxTokens: prompt.maxTokens } });
    setTimeout(() => { if (aiWaiters.delete(id)) reject(new Error('The AI endpoint did not answer in time.')); }, 90000);
  }) : null);

  status('Building your dashboard…');
  try {
    let source, hooks = {}, initial = null, metrics = config.metrics || null;
    if (init.share) {
      const payload = decodeShare(init.share);
      if (!payload) throw new Error('This embed link is broken.');
      source = payload.source; initial = payload; metrics = metrics || payload.metrics || null;
    } else if (init.sample) {
      if (!SAMPLE_BY_ID[init.sample]) throw new Error('Unknown sample.');
      source = { type: 'sample', id: init.sample };
    } else if (init.src) {
      source = { type: 'link', url: init.src };
    } else {
      source = { type: 'host', title: config.title, sourceLabel: config.sourceLabel };
      if (Array.isArray(init.data)) hooks.rows = init.data;
      else if (init.data) { hooks.buffer = new Uint8Array(init.data); hooks.ext = init.format || 'csv'; }
    }
    const loaded = await loadSource(source, hooks);
    if (config.title) loaded.opts.title = config.title;
    const { profile, spec } = await buildModel(loaded.opts, { initial, metrics, metricLimit: plan.metrics });
    if (config.title) spec.title = config.title;
    handle?.destroy?.();
    handle = await renderDashboard(root, {
      spec, profile, sourceInfo: loaded.sourceInfo, questions: loaded.questions, planChip: null,
      embed: {
        badge: !plan.whiteLabel, ask: aiOn, sql: !!config.sql, allowExport: config.exports !== false,
        siteUrl: SITE_URL || location.origin + location.pathname.replace(/embed\.html$/, ''),
      },
      onEvent: (type, detail) => post({ type: 'event', name: type, detail }),
    });
    if (lic.preview) root.prepend(h('div', { class: 'preview-ribbon' }, '✦ Pro preview — not for production'));
    reportHeight();
  } catch (e) {
    console.error(e);
    status(e.message || 'Something went wrong.', 'error');
    post({ type: 'event', name: 'error', detail: { message: e.message } });
  }
}

let lastH = 0;
function reportHeight() {
  if (!inFrame) return;
  const hgt = Math.ceil(document.documentElement.scrollHeight);
  if (Math.abs(hgt - lastH) > 2) { lastH = hgt; post({ type: 'height', value: hgt }); }
}
new ResizeObserver(() => reportHeight()).observe(document.documentElement);

window.addEventListener('message', (e) => {
  if (e.source !== window.parent || !e.data || e.data.ds !== 1) return;
  const m = e.data;
  if (m.type === 'init') { parentOrigin = e.origin; start(m); }
  else if (m.type === 'data' && lastInit) { start({ ...lastInit, data: m.data, format: m.format || lastInit.format, reload: true }); }
  else if (m.type === 'ai:result') {
    const w = aiWaiters.get(m.id);
    if (!w) return;
    aiWaiters.delete(m.id);
    m.error ? w.reject(new Error(m.error)) : w.resolve(String(m.text ?? ''));
  }
});

// Self-starting modes: a public share code, a sample, or a public file URL.
const params = new URLSearchParams(location.search);
const shareCode = (location.hash.match(/^#\/d\/(.+)$/) || [])[1] || params.get('share');
const cfgFromUrl = {
  title: params.get('title') || undefined, theme: params.get('theme') || undefined, accent: params.get('accent') || undefined,
  license: params.get('license') || undefined, sql: params.get('sql') === '1', exports: params.get('exports') !== '0',
};
async function selfStart() {
  if (shareCode) return start({ share: shareCode, config: cfgFromUrl });
  if (params.get('sample')) return start({ sample: params.get('sample'), config: cfgFromUrl });
  if (params.get('src')) {
    let metrics = null;
    if (params.get('metrics')) {
      try { metrics = await (await fetch(params.get('metrics'))).json(); } catch { console.warn('[Datasetless] Could not load metrics file'); }
    }
    return start({ src: params.get('src'), config: { ...cfgFromUrl, metrics } });
  }
  if (inFrame) {
    status('Waiting for data from the app…');
    post({ type: 'hello', version: 1 });
    setTimeout(() => { if (!started) status(`No data received. Add a "source" to <datasetless-dashboard>, or see the docs.`, 'info'); }, 8000);
  } else {
    status(`This page shows a ${BRAND.product} dashboard when embedded in another app.`, 'info');
  }
}
selfStart();
