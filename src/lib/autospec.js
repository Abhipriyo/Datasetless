// Turns a table profile into a dashboard spec: KPIs, charts and filters.
// The spec is plain data; the renderer owns all styling, so every dashboard
// looks consistent no matter where the data came from.
import { query } from './db.js';
import { q } from './sqlguard.js';

const MONEY = /(revenue|sales|amount|price|cost|spend|profit|income|gmv|mrr|arr|bill|fee|salary|wage|budget|value|payment|total|turnover|earning|margin|gdp|\$|₹|€|£|usd|inr|eur)/i;
const RATE = /(%|percent|pct|rate|ratio|share|avg|average|mean|median|per\b|per\s|index|score|rating|price|age|temperature|temp|growth|margin|yield|probability|density|expectancy|level|score|gini|latitude|longitude|duration|speed)/i;
const PRIORITY_MONEY = /(revenue|sales|gmv|mrr|arr|profit|amount|spend|gdp|income|turnover|bill)/i;
const PRIORITY_MEASURE = /(total|value|orders|units|quantity|qty|count|population|users|customers|visits|sessions)/i;
const PRIORITY_DIM = /(region|category|country|segment|channel|product|state|city|type|plan|platform|outlet|store|department|team|client|customer|brand|source|status|gender|industry|sector|zone|branch|market)/i;

export function grainFor(minStr, maxStr) {
  const a = Date.parse(minStr), b = Date.parse(maxStr);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 'month';
  const days = (b - a) / 864e5;
  if (days <= 45) return 'day';
  if (days <= 150) return 'week';
  if (days <= 365 * 6) return 'month';
  if (days <= 365 * 15) return 'quarter';
  return 'year';
}

export function timeExpr(time) {
  const c = q(time.col);
  if (time.kind === 'year') return `CAST(${c} AS VARCHAR)`;
  switch (time.grain) {
    case 'day': return `strftime(CAST(${c} AS DATE), '%Y-%m-%d')`;
    case 'week': return `strftime(date_trunc('week', CAST(${c} AS DATE)), '%Y-%m-%d')`;
    case 'quarter': return `(CAST(year(${c}) AS VARCHAR) || '-Q' || CAST(quarter(${c}) AS VARCHAR))`;
    case 'year': return `CAST(year(${c}) AS VARCHAR)`;
    default: return `strftime(CAST(${c} AS DATE), '%Y-%m')`;
  }
}

function measureFormat(name, overrides, currency) {
  if (overrides?.format) return overrides.format;
  // Values already scaled to a unit ("₹ crore", "USD mn") are shown as plain numbers.
  if (/\b(crores?|cr|lakhs?|lacs?|millions?|mn|mln|billions?|bn|thousands?|'000|000s)\b/i.test(name)) return 'number';
  if (/%|percent|pct/i.test(name)) return 'percent';
  if (MONEY.test(name) && currency) return 'currency';
  return 'number';
}

export async function buildSpec(profile, opts = {}) {
  const { columns, n } = profile;
  const meta = opts.measureMeta || {};
  const cols = columns.filter((c) => !(opts.exclude || []).includes(c.name));

  // Time: prefer real dates, then year columns.
  const timeCol = cols.find((c) => c.kind === 'time' && c.nonNull > n * 0.5) || cols.find((c) => c.kind === 'year');
  let time = null;
  if (timeCol) {
    time = { col: timeCol.name, kind: timeCol.kind === 'year' ? 'year' : 'date' };
    time.grain = time.kind === 'year' ? 'year' : opts.grain || grainFor(timeCol.min, timeCol.max);
    time.expr = timeExpr(time);
  }

  // Measures
  let measureCols = cols.filter((c) => c.kind === 'measure');
  if (opts.measureOrder) {
    measureCols.sort((a, b) => idx(opts.measureOrder, a.name) - idx(opts.measureOrder, b.name));
  } else if (!opts.keepOrder) {
    measureCols.sort((a, b) => score(b) - score(a));
  }
  measureCols = measureCols.slice(0, 8);
  const currency = opts.currency ?? (measureCols.some((c) => /\$|usd/i.test(c.name)) ? '$' : measureCols.some((c) => /₹|inr|rs\.?\b|rupee/i.test(c.name)) ? '₹' : null);
  const measures = measureCols.map((c, i) => {
    const o = meta[c.name] || {};
    const additive = o.additive ?? !RATE.test(c.name);
    const stock = (opts.nonAdditive || []).includes(c.name);
    const agg = stock ? 'sum' : additive ? 'sum' : 'avg';
    return {
      id: `m${i}`, label: o.label || c.name, col: c.name, agg, additive: additive && !stock, stock,
      expr: `${agg}(${q(c.name)})`, format: measureFormat(c.name, o, currency || (o.format === 'currency' ? '$' : null)),
      source: o.source,
    };
  });
  (opts.derived || []).forEach((d, i) => measures.push({ id: `d${i}`, label: d.label, expr: d.expr, format: d.format, additive: false, derived: true }));
  if (opts.countLabel) measures.push({ id: 'count', label: opts.countLabel, expr: 'count(*)', format: 'integer', additive: true, isCount: true });
  if (!measures.length) measures.push({ id: 'count', label: 'Rows', expr: 'count(*)', format: 'integer', additive: true, isCount: true });

  // Dimensions
  const dims = cols.filter((c) => c.kind === 'dim' && c.distinct >= 2)
    .sort((a, b) => dimScore(b, n) - dimScore(a, n))
    .map((c) => ({ col: c.name, distinct: c.distinct }));
  if (opts.primaryDim) {
    const i = dims.findIndex((d) => d.col === opts.primaryDim);
    if (i > 0) dims.unshift(dims.splice(i, 1)[0]);
  }
  const dim = dims[0] || null;

  // Panel data = one row per entity per period (e.g. country-year indicators).
  let panel = false;
  if (dim && time) {
    const [r] = await query(`SELECT count(*)::INTEGER AS n, count(DISTINCT (${q(dim.col)}, ${time.expr}))::INTEGER AS k FROM data`);
    // Additive business data (sales per branch per month) is still summed, not treated as a panel.
    panel = r.n === r.k && dim.distinct <= 60 && (opts.panel ?? measures.filter((m) => !m.derived && !m.isCount).every((m) => !m.additive));
  }

  // Stable colour order for the primary dimension (colour follows the entity).
  let colorOrder = [];
  if (dim) {
    const m0 = measures[0];
    const rows = await query(`SELECT CAST(${q(dim.col)} AS VARCHAR) AS v FROM data WHERE ${q(dim.col)} IS NOT NULL GROUP BY 1 ORDER BY ${m0.expr} DESC NULLS LAST LIMIT 60`);
    colorOrder = rows.map((r) => r.v);
    if (opts.focus && colorOrder.includes(opts.focus)) colorOrder = [opts.focus, ...colorOrder.filter((v) => v !== opts.focus)];
    if (opts.colorOrder) colorOrder = [...opts.colorOrder.filter((v) => colorOrder.includes(v)), ...colorOrder.filter((v) => !opts.colorOrder.includes(v))];
  }

  const base = measures.filter((m) => !m.derived && !m.isCount);
  const charts = [];
  const m0 = measures[0];
  const splitOk = dim && dim.distinct <= 60;
  if (time) {
    const total = !panel && (m0.additive || m0.stock || !splitOk);
    if (total) charts.push({ id: 'c-trend', kind: 'trend', measure: m0.id, wide: true });
    if (splitOk) charts.push({ id: 'c-split', kind: 'trendSplit', measure: m0.id, dim: dim.col, top: panel ? 8 : 6, wide: !total });
  }
  if (dim) charts.push({ id: 'c-rank', kind: 'rank', measure: m0.id, dim: dim.col, latest: panel || !!m0.stock });
  if (dims[1] && !panel) charts.push({ id: 'c-rank2', kind: 'rank', measure: m0.id, dim: dims[1].col, latest: !!m0.stock });
  // A derived metric (e.g. ROAS, return rate) by primary dimension is usually the sharpest insight.
  const d0 = measures.find((m) => m.derived);
  if (d0 && dim) charts.push({ id: 'c-derived', kind: 'rank', measure: d0.id, dim: dim.col, latest: false });
  const others = (panel ? base.slice(1) : base.slice(1, 3));
  for (const m of others) {
    if (time && panel && splitOk) charts.push({ id: `c-${m.id}`, kind: 'trendSplit', measure: m.id, dim: dim.col, top: 8 });
    else if (time) charts.push({ id: `c-${m.id}`, kind: 'trend', measure: m.id });
    else if (dim) charts.push({ id: `c-${m.id}`, kind: 'rank', measure: m.id, dim: dim.col });
  }
  // Scatter only for panel data: comparing two additive totals across categories
  // just shows size (always r≈1), which is not an insight.
  if (panel && base.length >= 2 && dim && dim.distinct >= 4) {
    charts.push({ id: 'c-scatter', kind: 'scatter', mx: base[0].id, my: base[1].id, dim: dim.col, latest: true });
  }
  if (!time && !dim && base.length) {
    // Plain list of numbers: distribution of the main measure.
    charts.push({ id: 'c-hist', kind: 'histogram', measure: base[0].id, wide: true });
  }
  if (dim) charts.push({ id: 'c-table', kind: 'table', dim: dim.col, measures: measures.slice(0, 6).map((m) => m.id), latest: panel, wide: true });

  // KPIs: the main measures, then derived metrics, then the record count.
  const kpiPool = panel ? base : [...measures.filter((m) => !m.derived && !m.isCount).slice(0, 2), ...measures.filter((m) => m.derived), ...measures.filter((m) => m.isCount)];
  const kpis = kpiPool.slice(0, 4).map((m) => m.id);

  return {
    version: 1,
    title: opts.title || 'Your dashboard',
    subtitle: opts.subtitle || '',
    currency: currency || '$',
    n, time, dims, dim: dim?.col || null, measures, panel,
    focus: panel ? (opts.focus && colorOrder.includes(opts.focus) ? opts.focus : colorOrder[0]) : null,
    colorOrder, kpis, charts,
    asks: [], hidden: [],
  };
}

const idx = (arr, v) => { const i = arr.indexOf(v); return i < 0 ? 999 : i; };
function score(c) {
  let s = c.nonNull;
  if (PRIORITY_MONEY.test(c.name)) s *= 4;
  else if (PRIORITY_MEASURE.test(c.name)) s *= 2;
  if (RATE.test(c.name)) s *= 0.8;
  return s;
}
function dimScore(c, n) {
  let s = 1;
  if (PRIORITY_DIM.test(c.name)) s += 3;
  if (c.distinct >= 3 && c.distinct <= 12) s += 2;
  else if (c.distinct <= 30) s += 1;
  else if (c.distinct > 200) s -= 2;
  if (c.nonNull < n * 0.7) s -= 1;
  if (c.type === 'BOOLEAN' || c.distinct === 2) s -= 1.5;
  return s;
}
