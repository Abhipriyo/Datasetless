// Shared data pipeline: loads any source into the in-browser engine, then
// profiles it and builds the dashboard spec. Used by the web app and the embed.
import { getDB } from './db.js';
import { loadTable, loadObjects, loadBuffer, loadFile } from './load.js';
import { parsePasted } from './parse.js';
import { profileTable } from './profile.js';
import { buildSpec } from './autospec.js';
import { loadWorldBank, COUNTRY_NAME } from './sources/worldbank.js';
import { normaliseUrl, fetchLink } from './sources/links.js';
import { SAMPLE_BY_ID } from './samples.js';
import { applyMetrics } from './metrics.js';
import { guardSelect } from './sqlguard.js';

const short = (label) => label.replace(/\s*\(.*\)$/, '');

/**
 * Loads `source` into table "data".
 * Returns { source, opts, sourceInfo, planChip, questions }.
 * hooks: { step(text), pickTable(tables), pickSheet(sheets), file, buffer, ext, rows }
 */
export async function loadSource(source, hooks = {}) {
  const step = hooks.step || (() => {});
  await getDB();
  let opts = {}, sourceInfo, planChip = null, questions = null;

  if (source.type === 'worldbank') {
    step('Fetching live data from the World Bank');
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
      url: `https://data.worldbank.org/indicator/${wb.indicators.map((i) => i.code).join(',')}?locations=${source.countries.join('-')}`,
      failed: wb.failed,
    };
    planChip = `${source.understood === false ? 'Couldn’t spot specific indicators, so here’s an overview. ' : ''}Showing ${wb.indicators.map((i) => short(i.label)).join(', ')} · ${names.join(', ')} · ${source.from}–${source.to}`;
    const a = short(wb.indicators[0].label).toLowerCase();
    const b = short(wb.indicators[wb.indicators.length > 1 ? 1 : 0].label).toLowerCase();
    questions = [`Which country improved ${a} the most since ${source.from}?`, `Rank countries by ${b} in the latest year`, `Average ${a} by decade for each country`];
  } else if (source.type === 'sample') {
    const s = SAMPLE_BY_ID[source.id];
    if (!s) throw new Error('Unknown sample.');
    step('Generating realistic sample data');
    await loadObjects(s.generate());
    opts = { title: `${s.name} dashboard`, currency: s.currency, derived: s.derived, countLabel: s.countLabel, measureOrder: s.measureOrder, nonAdditive: s.nonAdditive };
    sourceInfo = { kind: 'sample', sample: s, sourceText: 'Synthetic sample data generated in your browser (not real figures).' };
    questions = s.questions;
  } else if (source.type === 'link') {
    const info = normaliseUrl(source.url);
    step(`Reading ${info.label}`);
    const got = await fetchLink(info);
    let detail = '';
    if (got.tables) {
      let ti = source.table;
      if (ti == null || !got.tables[ti]) {
        ti = got.tables.length === 1 || !hooks.pickTable ? 0 : await hooks.pickTable(got.tables);
        if (ti == null) throw new Error('cancelled');
        source = { ...source, table: ti };
      }
      await loadTable(got.tables[ti].data);
      detail = got.tables[ti].caption ? `Table: ${got.tables[ti].caption}` : `Table ${ti + 1}`;
    } else {
      const r = await loadBuffer(got.buffer, got.ext, { pickSheet: hooks.pickSheet });
      detail = r.detail || '';
    }
    opts = { title: prettyTitle(info.label) };
    sourceInfo = { kind: 'link', sourceText: info.label, url: info.original, detail };
  } else if (source.type === 'paste') {
    step('Reading your table');
    await loadTable(parsePasted(source.text));
    opts = { title: source.title || 'Pasted table' };
    sourceInfo = { kind: 'paste', sourceText: 'A table you pasted (processed in your browser)' };
  } else if (source.type === 'file') {
    if (!hooks.file) throw new Error('Please upload the file again.');
    step(`Reading ${hooks.file.name}`);
    const r = await loadFile(hooks.file, { pickSheet: hooks.pickSheet });
    opts = { title: prettyTitle(hooks.file.name.replace(/\.[^.]+$/, '')) };
    sourceInfo = { kind: 'file', sourceText: `${hooks.file.name} (processed on this device, never uploaded)`, detail: r.detail };
  } else if (source.type === 'host') {
    // Data handed over by the host application (embed). It never leaves the browser.
    step('Loading data from your app');
    if (hooks.rows) await loadObjects(hooks.rows);
    else if (hooks.buffer) await loadBuffer(hooks.buffer, hooks.ext || 'csv', {});
    else throw new Error('No data was provided.');
    opts = { title: source.title || 'Dashboard' };
    sourceInfo = { kind: 'host', sourceText: source.sourceLabel || 'Your application', detail: '' };
  } else {
    throw new Error('Unknown source.');
  }
  return { source, opts, sourceInfo, planChip, questions };
}

/** Profiles table "data" and builds the spec. Applies a metrics contract if given. */
export async function buildModel(opts, { initial = null, metrics = null, metricLimit = Infinity, step = () => {} } = {}) {
  step('Profiling columns');
  const profile = await profileTable();
  if (!profile.columns.some((c) => ['measure', 'dim', 'time', 'year'].includes(c.kind))) throw new Error('Could not find any usable columns in that data.');
  step('Designing the dashboard');
  let o = { ...opts };
  let contract = null;
  if (metrics) {
    const r = await applyMetrics(metrics, profile, o, { limit: metricLimit });
    o = r.opts; contract = r.contract;
  }
  const spec = await buildSpec(profile, o);
  spec.contract = contract;
  if (initial) {
    if (initial.title) spec.title = String(initial.title).slice(0, 120);
    if (Array.isArray(initial.hidden)) spec.hidden = initial.hidden.filter((x) => typeof x === 'string');
    if (Array.isArray(initial.asks)) spec.asks = initial.asks.filter((a) => { try { guardSelect(a.sql); return true; } catch { return false; } }).slice(0, 12);
  }
  return { profile, spec };
}

export function prettyTitle(s) {
  const t = String(s).replace(/^(Wikipedia|GitHub|Our World in Data):\s*/, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : 'Your dashboard';
}
