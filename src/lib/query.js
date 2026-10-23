// Compiles dashboard spec + filter state into SQL. Every chart's SQL is kept so
// users can see exactly how a number was produced.
import { q, lit } from './sqlguard.js';

export const measureById = (spec, id) => spec.measures.find((m) => m.id === id);

export function whereParts(spec, state, { skipTime = false } = {}) {
  const parts = [];
  if (spec.dim && state.dimValues?.length) parts.push(`CAST(${q(spec.dim)} AS VARCHAR) IN (${state.dimValues.map(lit).join(', ')})`);
  if (spec.time && !skipTime) {
    if (state.from) parts.push(`${spec.time.expr} >= ${lit(state.from)}`);
    if (state.to) parts.push(`${spec.time.expr} <= ${lit(state.to)}`);
  }
  return parts;
}
const where = (parts) => (parts.length ? ` WHERE ${parts.join(' AND ')}` : '');
const notNull = (m) => (m.col ? [`${q(m.col)} IS NOT NULL`] : []);

export function filteredBase(spec, state) {
  return `SELECT * FROM main.data${where(whereParts(spec, state))}`;
}

export function chartSQL(spec, chart, state) {
  const T = spec.time?.expr;
  const W = whereParts(spec, state);
  const base = `base AS (SELECT * FROM main.data${where(W)})`;
  switch (chart.kind) {
    case 'trend': {
      const m = measureById(spec, chart.measure);
      return `WITH ${base}\nSELECT ${T} AS period, ${m.expr} AS value\nFROM base\nGROUP BY 1\nORDER BY 1`;
    }
    case 'trendSplit': {
      const m = measureById(spec, chart.measure);
      const d = q(chart.dim);
      return `WITH ${base},\ntop_series AS (\n  SELECT CAST(${d} AS VARCHAR) AS s FROM base\n  WHERE ${d} IS NOT NULL${m.col ? ` AND ${q(m.col)} IS NOT NULL` : ''}\n  GROUP BY 1 ORDER BY ${m.expr} DESC NULLS LAST LIMIT ${chart.top || 6}\n)\nSELECT ${T} AS period, CAST(${d} AS VARCHAR) AS series, ${m.expr} AS value\nFROM base\nWHERE CAST(${d} AS VARCHAR) IN (SELECT s FROM top_series)\nGROUP BY 1, 2\nORDER BY 1, 2`;
    }
    case 'rank': {
      const m = measureById(spec, chart.measure);
      const d = q(chart.dim);
      if (chart.latest && T) {
        // Each entity's most recent value, so lagging data doesn't drop entities.
        return `WITH ${base},\nlatest AS (\n  SELECT ${d} AS __k, max(${T}) AS __p FROM base\n  WHERE ${d} IS NOT NULL${m.col ? ` AND ${q(m.col)} IS NOT NULL` : ''}\n  GROUP BY 1\n)\nSELECT CAST(${d} AS VARCHAR) AS label, ${m.expr} AS value, max(__p) AS period\nFROM base JOIN latest ON ${d} = __k AND ${T} = __p\nGROUP BY 1\nORDER BY 2 DESC NULLS LAST\nLIMIT ${chart.top || 10}`;
      }
      return `WITH ${base}\nSELECT CAST(${d} AS VARCHAR) AS label, ${m.expr} AS value,\n  (SELECT ${m.expr} FROM base) AS total\nFROM base\nWHERE ${d} IS NOT NULL\nGROUP BY 1\nORDER BY 2 DESC NULLS LAST\nLIMIT ${chart.top || 10}`;
    }
    case 'scatter': {
      const mx = measureById(spec, chart.mx), my = measureById(spec, chart.my);
      const d = q(chart.dim);
      if (chart.latest && T && mx.col && my.col) {
        return `WITH ${base}\nSELECT CAST(${d} AS VARCHAR) AS label,\n  arg_max(${q(mx.col)}, ${T}) AS x,\n  arg_max(${q(my.col)}, ${T}) AS y,\n  max(${T}) AS period\nFROM base\nWHERE ${q(mx.col)} IS NOT NULL AND ${q(my.col)} IS NOT NULL AND ${d} IS NOT NULL\nGROUP BY 1`;
      }
      return `WITH ${base}\nSELECT CAST(${d} AS VARCHAR) AS label, ${mx.expr} AS x, ${my.expr} AS y\nFROM base\nWHERE ${d} IS NOT NULL\nGROUP BY 1\nHAVING x IS NOT NULL AND y IS NOT NULL\nORDER BY x DESC\nLIMIT 40`;
    }
    case 'table': {
      const d = q(chart.dim);
      const ms = chart.measures.map((id) => measureById(spec, id)).filter(Boolean);
      const sel = ms.map((m) => {
        if (chart.latest && T && m.col) return `arg_max(${q(m.col)}, ${T}) FILTER (WHERE ${q(m.col)} IS NOT NULL) AS ${q(m.label)}`;
        if (m.stock && T && m.col) return `sum(${q(m.col)}) FILTER (WHERE ${T} = (SELECT max(${T}) FROM base)) AS ${q(m.label)}`;
        if (m.stock && T && /^\s*\w+\s*\([^()]*\)\s*$/.test(m.expr)) return `${m.expr} FILTER (WHERE ${T} = (SELECT max(${T}) FROM base)) AS ${q(m.label)}`;
        return `${m.expr} AS ${q(m.label)}`;
      });
      return `WITH ${base}\nSELECT CAST(${d} AS VARCHAR) AS ${q(chart.dim)}, ${sel.join(',\n  ')}\nFROM base\nWHERE ${d} IS NOT NULL\nGROUP BY 1\nORDER BY 2 DESC NULLS LAST\nLIMIT 25`;
    }
    case 'histogram': {
      const m = measureById(spec, chart.measure);
      const c = q(m.col);
      return `WITH ${base},\nb AS (SELECT min(${c}) AS lo, max(${c}) AS hi FROM base)\nSELECT least(floor((${c} - lo) / nullif((hi - lo) / 20.0, 0)), 19)::INTEGER AS bin,\n  min(lo + (hi - lo) / 20.0 * least(floor((${c} - lo) / nullif((hi - lo) / 20.0, 0)), 19)) AS start,\n  count(*) AS value\nFROM base, b\nWHERE ${c} IS NOT NULL\nGROUP BY 1\nORDER BY 1`;
    }
    case 'ai':
      return wrapAskSQL(chart.sql, spec, state);
    default:
      throw new Error(`Unknown chart kind ${chart.kind}`);
  }
}

// AI-written queries read from "data"; filters are applied by shadowing that name.
export function wrapAskSQL(sql, spec, state) {
  const W = whereParts(spec, state);
  if (!W.length) return sql;
  const cte = `data AS (SELECT * FROM main.data${where(W)})`;
  return /^\s*with\s+(recursive\s+)?/i.test(sql)
    ? sql.replace(/^\s*with\s+(recursive\s+)?/i, (m) => `${m}${cte}, `)
    : `WITH ${cte}\n${sql}`;
}

export function kpiSQL(spec, state) {
  const ms = spec.kpis.map((id) => measureById(spec, id)).filter(Boolean);
  const W = whereParts(spec, state);
  const T = spec.time?.expr;
  if (spec.panel && T) {
    const focus = state.dimValues?.length ? state.dimValues[0] : spec.focus;
    const Wf = [...W, `CAST(${q(spec.dim)} AS VARCHAR) = ${lit(focus)}`];
    return { focus, mode: 'panel', sql: `SELECT ${T} AS period, ${ms.map((m, i) => `${m.expr} AS k${i}`).join(', ')}\nFROM main.data${where(Wf)}\nGROUP BY 1 ORDER BY 1`, measures: ms };
  }
  const totals = `SELECT ${ms.map((m, i) => `${m.expr} AS k${i}`).join(', ')} FROM main.data${where(W)}`;
  const series = T ? `SELECT ${T} AS period, ${ms.map((m, i) => `${m.expr} AS k${i}`).join(', ')}\nFROM main.data${where(W)}\nGROUP BY 1 ORDER BY 1` : null;
  return { mode: 'series', totals, sql: series, measures: ms };
}

export function periodsSQL(spec) {
  return `SELECT DISTINCT ${spec.time.expr} AS p FROM main.data WHERE ${q(spec.time.col)} IS NOT NULL ORDER BY 1`;
}

export function dimValuesSQL(spec) {
  const m0 = spec.measures[0];
  return `SELECT CAST(${q(spec.dim)} AS VARCHAR) AS v, count(*)::INTEGER AS n FROM main.data WHERE ${q(spec.dim)} IS NOT NULL GROUP BY 1 ORDER BY ${m0.expr} DESC NULLS LAST LIMIT 500`;
}
