// Metrics contract ("metrics as code"). A company defines its key numbers once,
// in its own repository, with tests. Every chart, KPI and AI answer then uses
// exactly those definitions, and each one shows whether its tests pass.
//
// {
//   "title": "Customer analytics",
//   "currency": "$",
//   "time": "order_date",            // optional: which column is time
//   "grain": "month",                // optional: day | week | month | quarter | year
//   "dimensions": ["region", "plan"],// optional: which columns to break down by (first = primary)
//   "metrics": [
//     { "id": "revenue", "label": "Revenue", "sql": "sum(amount)", "format": "currency",
//       "description": "Paid invoices, excluding refunds.", "owner": "finance@acme.com",
//       "tests": [{ "type": "min", "value": 0 }, { "type": "not_null", "column": "amount" }] }
//   ]
// }
import { query } from './db.js';
import { q, guardSelect } from './sqlguard.js';
import { timeExpr, grainFor } from './autospec.js';

const FORMATS = ['number', 'integer', 'currency', 'percent', 'ratio'];
const AGGS = ['sum', 'avg', 'min', 'max', 'count', 'count_distinct', 'median'];
const GRAINS = ['day', 'week', 'month', 'quarter', 'year'];

export const FREE_METRIC_LIMIT = 5;

/** Validates shape only (no data needed). Returns { contract, errors }. */
export function parseContract(input) {
  let c = input;
  const errors = [];
  if (typeof c === 'string') {
    try { c = JSON.parse(c); } catch (e) { return { contract: null, errors: [`metrics.json is not valid JSON: ${e.message}`] }; }
  }
  if (!c || typeof c !== 'object' || !Array.isArray(c.metrics)) return { contract: null, errors: ['metrics.json needs a "metrics" array.'] };
  const seen = new Set();
  const metrics = [];
  c.metrics.forEach((m, i) => {
    const where = `metrics[${i}]`;
    if (!m || typeof m !== 'object') return errors.push(`${where} is not an object.`);
    const id = String(m.id || '').trim();
    if (!/^[a-z][a-z0-9_]{0,40}$/i.test(id)) return errors.push(`${where}: "id" must be letters, digits or _ (got "${m.id ?? ''}").`);
    if (seen.has(id)) return errors.push(`${where}: duplicate id "${id}".`);
    seen.add(id);
    let sql = m.sql ? String(m.sql).trim() : '';
    if (!sql && m.column) {
      const agg = String(m.agg || 'sum').toLowerCase();
      if (!AGGS.includes(agg)) return errors.push(`${where}: unknown agg "${m.agg}".`);
      sql = agg === 'count_distinct' ? `count(DISTINCT ${q(m.column)})` : `${agg}(${q(m.column)})`;
    }
    if (!sql && m.agg === 'count') sql = 'count(*)';
    if (!sql) return errors.push(`${where} (${id}): give either "sql" or "column".`);
    try { guardSelect(`SELECT ${sql} FROM data`); } catch (e) { return errors.push(`${where} (${id}): ${e.message}`); }
    if (/\bselect\b/i.test(sql)) return errors.push(`${where} (${id}): "sql" must be one aggregate expression, not a query.`);
    const format = FORMATS.includes(m.format) ? m.format : (/%|rate|percent/i.test(m.label || id) ? 'percent' : 'number');
    metrics.push({
      id, label: String(m.label || id).slice(0, 60), sql, format,
      description: m.description ? String(m.description).slice(0, 400) : '',
      owner: m.owner ? String(m.owner).slice(0, 80) : '',
      column: m.column || null,
      type: m.type === 'snapshot' ? 'snapshot' : 'flow',
      additive: typeof m.additive === 'boolean' ? m.additive : /^\s*(sum|count)\s*\(/i.test(sql) && !/[/*]/.test(sql.replace(/count\(\*\)/gi, '')),
      tests: Array.isArray(m.tests) ? m.tests.slice(0, 10) : [],
    });
  });
  const grain = GRAINS.includes(c.grain) ? c.grain : null;
  const dims = Array.isArray(c.dimensions) ? c.dimensions.map(String).slice(0, 6) : [];
  return {
    contract: { title: c.title ? String(c.title).slice(0, 120) : '', currency: c.currency ? String(c.currency).slice(0, 3) : null, time: c.time ? String(c.time) : null, grain, dimensions: dims, metrics },
    errors,
  };
}

/**
 * Checks the contract against the loaded data, runs every metric's tests and
 * returns spec options. `limit` caps the number of metrics (plan gating).
 */
export async function applyMetrics(input, profile, opts = {}, { limit = Infinity } = {}) {
  const { contract, errors } = parseContract(input);
  if (!contract) return { opts, contract: { errors, metrics: [], results: {} } };
  const colNames = new Set(profile.columns.map((c) => c.name));
  const skipped = contract.metrics.length > limit ? contract.metrics.slice(limit).map((m) => m.label) : [];
  const metrics = contract.metrics.slice(0, limit);

  // Time column and grain, so tests can be run per period.
  let time = null;
  const tcol = contract.time && profile.columns.find((c) => c.name === contract.time);
  if (contract.time && !tcol) errors.push(`time column "${contract.time}" was not found in the data.`);
  const autoT = tcol || profile.columns.find((c) => c.kind === 'time') || profile.columns.find((c) => c.kind === 'year');
  if (autoT && ['time', 'year'].includes(autoT.kind)) {
    time = { col: autoT.name, kind: autoT.kind === 'year' ? 'year' : 'date' };
    time.grain = time.kind === 'year' ? 'year' : contract.grain || grainFor(autoT.min, autoT.max);
    time.expr = timeExpr(time);
  }
  for (const d of contract.dimensions) if (!colNames.has(d)) errors.push(`dimension "${d}" was not found in the data.`);

  const results = {};
  const measures = [];
  for (const m of metrics) {
    const r = { status: 'pass', details: [], tests: m.tests.length };
    if (m.column && !colNames.has(m.column)) { r.status = 'error'; r.details.push(`column "${m.column}" not found`); results[m.id] = r; continue; }
    try {
      await query(`SELECT ${m.sql} AS v FROM data`);
    } catch (e) {
      r.status = 'error'; r.details.push(cleanErr(e)); results[m.id] = r; continue;
    }
    for (const t of m.tests) {
      try {
        const msg = await runTest(m, t, time);
        if (msg) { r.status = 'fail'; r.details.push(msg); }
      } catch (e) {
        r.status = r.status === 'fail' ? 'fail' : 'error';
        r.details.push(`test ${t.type || '?'} could not run: ${cleanErr(e)}`);
      }
    }
    results[m.id] = r;
    measures.push({
      id: `k_${m.id}`, metricId: m.id, label: m.label, expr: m.sql, format: m.format,
      col: m.column && /^(sum|avg|min|max|median)$/.test(String(m.sql.match(/^(\w+)\(/)?.[1] || '').toLowerCase()) ? m.column : undefined,
      additive: m.type === 'snapshot' ? false : m.additive, stock: m.type === 'snapshot',
      verified: r.status === 'pass' && m.tests.length > 0, defined: true,
      description: m.description, owner: m.owner,
    });
  }

  const next = { ...opts, contractMeasures: measures.length ? measures : undefined };
  if (contract.title) next.title = contract.title;
  if (contract.currency) next.currency = contract.currency;
  if (time) { next.timeCol = time.col; if (contract.grain) next.grain = contract.grain; }
  if (contract.dimensions.length) { next.dimsAllow = contract.dimensions.filter((d) => colNames.has(d)); next.primaryDim = next.dimsAllow[0]; }
  return { opts: next, contract: { ...contract, metrics, skipped, errors, results } };
}

async function runTest(m, t, time) {
  const type = String(t.type || '').toLowerCase();
  const per = time ? `SELECT ${time.expr} AS p, ${m.sql} AS v FROM data GROUP BY 1 ORDER BY 1` : `SELECT 'all' AS p, ${m.sql} AS v FROM data`;
  const bad = (rows, label) => {
    if (!rows.length) return null;
    const list = rows.slice(0, 3).map((r) => r.p).join(', ');
    return `${label} in ${rows.length} period${rows.length === 1 ? '' : 's'} (${list}${rows.length > 3 ? '…' : ''})`;
  };
  switch (type) {
    case 'min': return bad((await query(per)).filter((r) => r.v != null && r.v < Number(t.value)), `below ${t.value}`);
    case 'max': return bad((await query(per)).filter((r) => r.v != null && r.v > Number(t.value)), `above ${t.value}`);
    case 'between': {
      const [lo, hi] = (t.value || []).map(Number);
      return bad((await query(per)).filter((r) => r.v != null && (r.v < lo || r.v > hi)), `outside ${lo}–${hi}`);
    }
    case 'not_null': {
      const col = t.column || m.column;
      if (!col) return 'not_null test needs a "column"';
      const [r] = await query(`SELECT count(*) FILTER (WHERE ${q(col)} IS NULL)::INTEGER AS k FROM data`);
      return r.k ? `${r.k.toLocaleString('en-US')} empty values in "${col}"` : null;
    }
    case 'unique': {
      const col = t.column || m.column;
      if (!col) return 'unique test needs a "column"';
      const [r] = await query(`SELECT (count(${q(col)}) - count(DISTINCT ${q(col)}))::INTEGER AS k FROM data`);
      return r.k ? `${r.k.toLocaleString('en-US')} duplicate values in "${col}"` : null;
    }
    case 'no_gaps': {
      if (!time) return 'no_gaps needs a time column';
      const rows = await query(per);
      const empty = rows.filter((r) => r.v == null || r.v === 0);
      return bad(empty, 'no data');
    }
    case 'assert': {
      const expr = String(t.sql || '');
      guardSelect(`SELECT ${expr} FROM data`);
      if (/\bselect\b/i.test(expr)) return 'assert must be one expression';
      const [r] = await query(`SELECT (${expr})::BOOLEAN AS ok FROM data`);
      return r.ok ? null : (t.message || `assertion failed: ${expr}`);
    }
    default:
      return `unknown test type "${t.type}"`;
  }
}

const cleanErr = (e) => String(e?.message || e).split('\n')[0].replace(/^(Binder|Parser|Catalog|Conversion) Error:\s*/i, '').slice(0, 160);

/** A ready-to-edit starter contract generated from the data profile. */
export function starterContract(profile, spec) {
  const metrics = spec.measures.filter((m) => !m.isCount).slice(0, 4).map((m) => ({
    id: (m.label || m.id).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 30) || m.id,
    label: m.label, sql: m.expr, format: m.format,
    description: 'Describe exactly what counts here.', owner: 'team@yourcompany.com',
    tests: m.format === 'percent' ? [{ type: 'between', value: [0, 100] }] : [{ type: 'min', value: 0 }],
  }));
  return {
    title: spec.title,
    currency: spec.currency,
    ...(spec.time ? { time: spec.time.col, grain: spec.time.grain } : {}),
    dimensions: spec.dims.slice(0, 3).map((d) => d.col),
    metrics,
  };
}
