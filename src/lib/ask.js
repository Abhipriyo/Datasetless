// Built-in question answering. Turns everyday business questions into SQL, a
// chart and a two-sentence answer, with no AI and no API key. Handles rankings,
// recent changes ("which region fell last quarter?"), trends, comparisons,
// shares, totals, "who improved most since 2010", decades and weekdays.
// Returns null when the question can't be matched to the data.
import { query } from './db.js';
import { q, lit } from './sqlguard.js';
import { fmt, fmtPeriod } from './format.js';
import { timeExpr } from './autospec.js';

const STOP = new Set('the a an of in by for and or is are was were what which who how has have had did does do to with on at my our me show tell give list per each than from this that it its be been there their any all over time much many'.split(' '));
const SYN = [
  [/\b(sales?|revenue|turnover|income|earn\w*|money|gmv|takings|makes?)\b/, /(revenue|sales|amount|gmv|bill|income|turnover|mrr)/i],
  [/\b(orders?|purchases?|transactions?)\b/, /(order|transaction)/i],
  [/\b(customers?|clients?|users?|buyers?|subscribers?)\b/, /(customer|client|user|subscriber)/i],
  [/\b(spend|spent|spending|cost|costs|budget)\b/, /(spend|cost)/i],
  [/\b(profit|margins?)\b/, /(profit|margin)/i],
  [/\b(people|population|inhabitants)\b/, /population/i],
  [/\b(returns?|returned|refunds?)\b/, /(return|refund)/i],
  [/\b(ratings?|reviews?|stars?|satisfaction)\b/, /(rating|score|review)/i],
];
const UNIT_SQL = { day: '1 DAY', week: '7 DAY', month: '1 MONTH', quarter: '3 MONTH', year: '1 YEAR' };

const tokens = (s) => String(s).toLowerCase().replace(/\baverage\b/g, 'avg').replace(/[’']s\b/g, '').replace(/[^a-z0-9₹$€£%]+/g, ' ').trim().split(/\s+/).filter(Boolean);
const stem = (w) => (w.length > 3 ? w.replace(/ies$/, 'y').replace(/(ch|sh|x|ss)es$/, '$1').replace(/([^s])s$/, '$1') : w);
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const word = (c) => String(c).replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
const lower = (c) => { const w = word(c); return /^[A-Z]{2,}/.test(w) ? w : w.charAt(0).toLowerCase() + w.slice(1); };
const title = (c) => { const w = word(c); return w.charAt(0).toUpperCase() + w.slice(1); };
const plural = (w) => (/(s|x|ch|sh)$/i.test(w) ? w + 'es' : /[^aeiou]y$/i.test(w) ? w.slice(0, -1) + 'ies' : w + 's');
const unitWord = (u) => ({ day: 'day', week: 'week', month: 'month', quarter: 'quarter', year: 'year' }[u] || u);

function findMeasure(t, spec) {
  const qs = new Set(tokens(t).map(stem));
  let best = null, bestScore = 0;
  for (const m of spec.measures) {
    const lw = tokens(m.label.replace(/\(.*?\)/g, '')).filter((w) => !STOP.has(w)).map(stem);
    let sc = 0;
    for (const w of lw) if (qs.has(w)) sc += w.length > 2 ? 1 : 0.4;
    if (lw.length && lw.every((w) => qs.has(w))) sc += 1;
    for (const [qre, mre] of SYN) if (qre.test(t) && (mre.test(m.label) || mre.test(m.col || ''))) sc += 1.5;
    if (m.isCount && /\b(how many|number of|count|busiest|busy|volume)\b/.test(t)) sc += 2;
    if (sc > bestScore) { best = m; bestScore = sc; }
  }
  return bestScore > 0.5 ? best : null;
}

function findDim(t, spec) {
  const qs = new Set(tokens(t).map(stem));
  const dims = spec.dims.map((d) => d.col);
  for (const d of dims) { const w = tokens(d).filter((x) => !STOP.has(x)).map(stem); if (w.length && w.every((x) => qs.has(x))) return d; }
  for (const d of dims) { const w = tokens(d).filter((x) => !STOP.has(x) && x.length > 3).map(stem); if (w.some((x) => qs.has(x))) return d; }
  const geo = dims.find((d) => /(region|country|state|city|zone|location|market|area|outlet|store|branch)/i.test(d));
  if (geo && /\bwhere\b/.test(t)) return geo;
  return null;
}

async function dimValues(spec) {
  if (spec.__values) return spec.__values;
  const out = {};
  for (const d of spec.dims.slice(0, 8)) {
    if (d.distinct > 1000) continue;
    try {
      out[d.col] = (await query(`SELECT DISTINCT CAST(${q(d.col)} AS VARCHAR) AS v FROM main.data WHERE ${q(d.col)} IS NOT NULL`)).map((r) => r.v);
    } catch { /* ignore */ }
  }
  Object.defineProperty(spec, '__values', { value: out, enumerable: false, configurable: true });
  return out;
}

async function findValues(t, spec) {
  const all = await dimValues(spec);
  const found = [];
  for (const [col, values] of Object.entries(all)) {
    for (const v of values) {
      const lv = v.toLowerCase().trim();
      if (lv.length < 2 || /^(yes|no|true|false|other|all|none|n\/a)$/.test(lv)) continue;
      if (new RegExp(`(^|[^a-z0-9])${esc(lv)}('?s)?([^a-z0-9]|$)`).test(t)) found.push({ dim: col, value: v });
    }
  }
  // Prefer the longest match when one value contains another ("North America" vs "America").
  return found.filter((a) => !found.some((b) => b !== a && b.dim === a.dim && b.value.length > a.value.length && b.value.toLowerCase().includes(a.value.toLowerCase())));
}

function parsePeriod(t) {
  let m;
  if ((m = t.match(/\b(?:last|past)\s+(\d{1,3})\s+(day|week|month|quarter|year)s?\b/))) return { kind: 'window', n: +m[1], unit: m[2] };
  if ((m = t.match(/\b(?:last|past|previous|latest|recent|this|current)\s+(day|week|month|quarter|year)\b/))) return { kind: 'one', unit: m[1] };
  if ((m = t.match(/\b(?:from|between)\s+((?:19|20)\d{2})\s+(?:to|and|-|until)\s+((?:19|20)\d{2})\b/))) return { kind: 'range', from: +m[1], to: +m[2] };
  if ((m = t.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+((?:19|20)\d{2})\b/))) {
    const month = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].indexOf(m[1].slice(0, 3)) + 1;
    return { kind: 'month', year: +m[2], month };
  }
  if ((m = t.match(/\bsince\s+((?:19|20)\d{2})\b/))) return { kind: 'since', year: +m[1] };
  if ((m = t.match(/\b(?:in|during|for)\s+((?:19|20)\d{2})\b/))) return { kind: 'year', year: +m[1] };
  return null;
}

function timeParts(T) {
  if (T.kind === 'year') {
    const Y = `CAST(${q(T.col)} AS INTEGER)`;
    return { Y, D: null, max: `(SELECT max(${Y}) FROM data)` };
  }
  const D = `CAST(${q(T.col)} AS DATE)`;
  return { Y: `year(${D})`, D, max: `(SELECT max(${D}) FROM data)` };
}

function periodConds(T, p, { forPanel = false } = {}) {
  if (!T || !p) return [];
  const { Y, D, max } = timeParts(T);
  switch (p.kind) {
    case 'year': return [`${Y} = ${p.year}`];
    case 'month': return D ? [`${Y} = ${p.year}`, `month(${D}) = ${p.month}`] : [`${Y} = ${p.year}`];
    case 'since': return [`${Y} >= ${p.year}`];
    case 'range': return [`${Y} BETWEEN ${p.from} AND ${p.to}`];
    case 'window':
      if (!D) return p.unit === 'year' ? [`${Y} > ${max} - ${p.n}`] : [];
      return [`${D} > ${max} - INTERVAL ${p.unit === 'quarter' ? p.n * 3 + ' MONTH' : p.unit === 'week' ? p.n * 7 + ' DAY' : p.n + ' ' + p.unit.toUpperCase()}`];
    case 'one':
      if (forPanel) return [];
      if (!D) return p.unit === 'year' ? [`${Y} = ${max}`] : [];
      return [`${D} >= date_trunc('${p.unit}', ${max})`];
    default: return [];
  }
}

function periodText(p) {
  if (!p) return '';
  switch (p.kind) {
    case 'year': return ` in ${p.year}`;
    case 'month': return ` in ${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][p.month - 1]} ${p.year}`;
    case 'since': return ` since ${p.year}`;
    case 'range': return ` from ${p.from} to ${p.to}`;
    case 'window': return ` in the last ${p.n} ${unitWord(p.unit)}${p.n === 1 ? '' : 's'}`;
    case 'one': return ` in the latest ${unitWord(p.unit)}`;
    default: return '';
  }
}

const where = (conds) => (conds.length ? `WHERE ${conds.join(' AND ')}` : '');
const pct = (v) => `${v >= 0 ? '+' : '−'}${Math.abs(v) >= 100 ? Math.round(Math.abs(v)) : Math.abs(v).toFixed(1)}%`;
const pts = (v) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(1)} pts`;

/** Returns { title, sql, chart, format, explain(rows) } or null. */
export async function answerQuestion(question, spec) {
  const t = ` ${String(question).toLowerCase().replace(/[’`]/g, "'")} `;
  const cur = spec.currency;
  const T = spec.time;

  const down = /\b(fell|fall\w*|drop\w*|declin\w*|decreas\w*|lost|lose|losing|shrank|shrink\w*|worse|down|slow\w*|dip\w*)\b/.test(t);
  const up = /\b(grew|grow\w*|rose|rise|rising|increas\w*|gain\w*|improv\w*|up|jump\w*|climb\w*)\b/.test(t);
  const changeQ = down || up || /\bchang\w*\b/.test(t);
  const low = /\b(lowest|least|smallest|fewest|worst|bottom|minimum|min|lower|weakest)\b/.test(t);
  const high = /\b(highest|most|top|largest|biggest|best|leading|leader|maximum|max|greatest|rank\w*|strongest|higher)\b/.test(t);
  const whichQ = /\b(which|what|who|where)\b/.test(t);
  const avgQ = /\b(average|avg|mean|typical)\b/.test(t);
  const numQ = avgQ || /\b(total|overall|sum|how many|how much|median|in total|altogether)\b/.test(t);
  const trendQ = /\b(over time|trend\w*|history|historical|evolv\w*|monthly|yearly|quarterly|weekly|daily|by (month|year|quarter|week|day)|per (month|year)|over the (years|months)|growth|changed|doing)\b/.test(t);
  const decadeQ = /\bdecades?\b/.test(t);
  const compareQ = /\b(compare|comparison|vs|versus|against|difference)\b/.test(t);
  const shareQ = /\b(share|percentage of|proportion|split|mix|breakdown|distribution|contribut\w*)\b/.test(t);
  const mostQ = /\b(most|fastest|biggest|least|slowest|largest|quickest)\b/.test(t);
  const dowQ = /\b(day of (the )?week|weekdays?|weekends?|busiest days?|which days?)\b/.test(t);

  const found = findMeasure(t, spec);
  const M = found || spec.measures.find((m) => !m.isCount) || spec.measures[0];
  let dim = findDim(t, spec);
  const vals = await findValues(t, spec);
  let period = parsePeriod(t);
  const Mlabel = M.label;
  const mWord = lower(Mlabel.replace(/\s*\(.*?\)\s*$/, ''));

  // Filters from mentioned values ("at dinner", "in the South"). If the question only
  // names a value ("do delivery orders get lower ratings?"), compare across that column.
  const byDim = {};
  for (const v of vals) (byDim[v.dim] ||= []).push(v.value);
  if (!dim && compareQ) { const two = Object.entries(byDim).find(([, v]) => v.length >= 2); if (two) dim = two[0]; }
  let dropFilterFor = null;
  if (!dim && vals.length && !trendQ && !numQ && !changeQ && !dowQ) { dim = vals[0].dim; dropFilterFor = dim; }
  // One value of the same column ("how is the App channel trending?", "do delivery orders rate lower?"):
  // for trends, follow that value; for rankings, compare all values and point out that one.
  else if (dim && byDim[dim]?.length === 1 && !compareQ) {
    if ((trendQ || numQ || changeQ) && !(high || low)) dim = null;
    else dropFilterFor = dim;
  }
  const valConds = Object.entries(byDim).filter(([d]) => d !== dropFilterFor).map(([d, vs]) => `CAST(${q(d)} AS VARCHAR) IN (${vs.map(lit).join(', ')})`);
  const valText = Object.entries(byDim).filter(([d]) => d !== dropFilterFor).map(([, vs]) => vs.join(' & ')).join(', ');
  const forText = valText ? ` for ${valText}` : '';
  const highlight = dropFilterFor ? byDim[dropFilterFor] : null;
  const F = (v) => fmt(v, M.format, cur);

  // ---------------- intents ----------------
  if (T && dowQ && T.kind !== 'year') return weekday();
  if (T && decadeQ && T.kind === 'year') return decade(dim || spec.dim);
  if (T && changeQ && period?.kind === 'one' && !mostQ) return change(dim || (whichQ ? spec.dim : null), period.unit);
  if (T && (up || down || changeQ) && (mostQ || period?.kind === 'since') && (dim || spec.dim)) return improved(dim || spec.dim);
  if (T && (up || down) && dim && !period) return change(dim, T.kind === 'year' ? 'year' : ['day', 'week'].includes(T.grain) ? 'month' : 'quarter');
  if (T && trendQ && !(high || low)) return trend(dim);
  if (dim && (high || low || whichQ || shareQ)) return rank(dim);
  if (numQ && !dim) return number();
  if (T && (trendQ || compareQ)) return trend(dim);
  if (dim) return rank(dim);
  if (found && T) return trend(null);
  if (found) return number();
  if (vals.length && T) return trend(null);
  return null;

  // ---------------- builders ----------------
  function rank(d) {
    const D = title(d);
    const dir = low && !high ? 'ASC' : 'DESC';
    const n = Math.min(+((t.match(/\b(?:top|bottom)\s+(\d{1,2})\b/) || [])[1] || 10), 25);
    const conds = [`${q(d)} IS NOT NULL`, ...valConds, ...periodConds(T, period, { forPanel: spec.panel })];
    let sql, hasShare = false;
    if (spec.panel && T) {
      sql = `WITH g AS (\n  SELECT CAST(${q(d)} AS VARCHAR) AS __k, ${T.expr} AS __p, ${M.expr} AS __v\n  FROM data ${where(conds)}\n  GROUP BY 1, 2 HAVING ${M.expr} IS NOT NULL\n)\nSELECT __k AS ${q(D)}, arg_max(__v, __p) AS ${q(Mlabel)}, max(__p) AS "Latest period"\nFROM g GROUP BY 1\nORDER BY 2 ${dir} NULLS LAST\nLIMIT ${n}`;
    } else {
      hasShare = (M.additive || M.isCount) && !M.derived && !/\//.test(M.expr);
      sql = `SELECT CAST(${q(d)} AS VARCHAR) AS ${q(D)}, ${M.expr} AS ${q(Mlabel)}${hasShare ? `,\n  round(100.0 * ${M.expr} / nullif(sum(${M.expr}) OVER (), 0), 1) AS "Share (%)"` : ''}\nFROM data ${where(conds)}\nGROUP BY 1\nORDER BY 2 ${dir} NULLS LAST\nLIMIT ${n}`;
    }
    return {
      title: `${Mlabel} by ${lower(d)}${forText}${periodText(period)}`,
      sql, format: M.format, chart: { type: 'bar', x: D, y: [Mlabel] },
      explain(rows) {
        const r = rows.filter((x) => x[Mlabel] != null);
        if (!r.length) return 'There is no data for this question with the current filters.';
        const a = r[0], b = r[1], z = r[r.length - 1];
        const lead = dir === 'ASC' ? 'lowest' : 'highest';
        let s1 = `${a[D]} has the ${lead} ${mWord}${forText}${periodText(period)} at ${F(a[Mlabel])}${hasShare && a['Share (%)'] != null ? ` (${a['Share (%)']}% of the total)` : ''}`;
        s1 += b ? `, ${dir === 'ASC' ? 'followed by' : 'ahead of'} ${b[D]} at ${F(b[Mlabel])}.` : '.';
        let s2 = '';
        if (highlight?.length) {
          const h = r.find((x) => highlight.some((v) => v.toLowerCase() === String(x[D]).toLowerCase()));
          if (h && h !== a) s2 = `${h[D]} is at ${F(h[Mlabel])}, ranked ${r.indexOf(h) + 1} of ${r.length}.`;
          else if (h === a) s2 = `So yes: ${h[D]} comes ${dir === 'ASC' ? 'last' : 'first'} of ${r.length}.`;
        }
        const ratio = a[Mlabel] && z[Mlabel] > 0 ? a[Mlabel] / z[Mlabel] : 0;
        if (!s2 && r.length > 2) s2 = `${z[D]} is ${dir === 'ASC' ? 'highest' : 'lowest'} at ${F(z[Mlabel])}${dir === 'DESC' && (M.additive || M.isCount) && ratio >= 1.3 && ratio <= 20 ? `, about ${ratio.toFixed(1)}× smaller than ${a[D]}` : ''}.`;
        return `${s1} ${s2}`.trim();
      },
    };
  }

  function change(d, unit) {
    const { Y, D } = timeParts(T);
    const curDef = D ? (unit === 'day' ? `max(${D})` : `date_trunc('${unit}', max(${D}))`) : `max(${Y})`;
    const prevCond = D ? `${D} >= __cur - INTERVAL ${UNIT_SQL[unit]}` : `${Y} = __cur - 1`;
    const curCond = D ? `${D} >= __cur` : `${Y} = __cur`;
    const isPts = M.format === 'percent';
    const chg = isPts ? 'Change (pts)' : 'Change (%)';
    const prevL = `Previous ${unitWord(unit)}`, latL = `Latest ${unitWord(unit)}`;
    const dir = down && !up ? 'ASC' : up && !down ? 'DESC' : null;
    const delta = isPts ? `round(max(__v) FILTER (WHERE __p = 'cur') - max(__v) FILTER (WHERE __p = 'prev'), 2)`
      : `round(100.0 * (max(__v) FILTER (WHERE __p = 'cur') - max(__v) FILTER (WHERE __p = 'prev')) / nullif(abs(max(__v) FILTER (WHERE __p = 'prev')), 0), 1)`;
    const conds = [...valConds, ...(d ? [`${q(d)} IS NOT NULL`] : [])];
    const DD = d ? title(d) : null;
    const sql = `WITH b AS (SELECT ${curDef} AS __cur FROM data),\nt AS (\n  SELECT data.*, CASE WHEN ${curCond} THEN 'cur' WHEN ${prevCond} THEN 'prev' END AS __p\n  FROM data, b\n),\ng AS (\n  SELECT ${d ? `CAST(${q(d)} AS VARCHAR)` : `'All'`} AS __k, __p, ${M.expr} AS __v\n  FROM t WHERE __p IS NOT NULL${conds.length ? ' AND ' + conds.join(' AND ') : ''}\n  GROUP BY 1, 2\n)\nSELECT __k AS ${q(DD || 'Total')}, max(__v) FILTER (WHERE __p = 'prev') AS ${q(prevL)}, max(__v) FILTER (WHERE __p = 'cur') AS ${q(latL)},\n  ${delta} AS ${q(chg)}\nFROM g GROUP BY 1\nORDER BY 4 ${dir || 'DESC'} NULLS LAST`;
    return {
      title: d ? `Change in ${mWord} by ${lower(d)}${forText}: latest ${unitWord(unit)} vs the one before` : `Change in ${mWord}${forText}: latest ${unitWord(unit)} vs the one before`,
      sql, format: isPts ? 'number' : 'percent', chart: d ? { type: 'bar', x: DD, y: [chg] } : { type: 'table' },
      explain(rows) {
        const r = rows.filter((x) => x[chg] != null);
        if (!r.length) return `There isn't enough data in the two most recent ${unitWord(unit)}s to compare.`;
        const ch = (v) => (isPts ? pts(v) : pct(v));
        const a = r[0];
        if (!d) return `${title(mWord)}${forText} ${a[chg] < 0 ? 'fell' : 'rose'} ${ch(a[chg]).replace(/^[+−]/, '')} in the latest ${unitWord(unit)}, from ${F(a[prevL])} to ${F(a[latL])}. ${a[chg] < 0 ? 'Worth finding out what changed.' : 'Nice momentum.'}`;
        const fallers = r.filter((x) => x[chg] < 0);
        const pick = dir === 'ASC' ? a : dir === 'DESC' ? a : [...r].sort((x, y) => Math.abs(y[chg]) - Math.abs(x[chg]))[0];
        let s1;
        if (down && !up && pick[chg] >= 0) s1 = `No ${lower(d)} fell: the smallest change was ${pick[DD]} at ${ch(pick[chg])} (${F(pick[prevL])} → ${F(pick[latL])}).`;
        else if (up && !down && pick[chg] < 0) s1 = `No ${lower(d)} grew: the best was ${pick[DD]} at ${ch(pick[chg])}.`;
        else s1 = `${pick[DD]} ${pick[chg] < 0 ? 'fell' : 'grew'} the most: ${mWord} went from ${F(pick[prevL])} to ${F(pick[latL])} (${ch(pick[chg])}) in the latest ${unitWord(unit)}.`;
        const s2 = fallers.length === 0 ? `Every ${lower(d)} grew.` : fallers.length === r.length ? `All ${r.length} ${plural(lower(d))} declined.` : fallers.length === 1 && pick[chg] < 0 ? `It is the only ${lower(d)} that declined; the other ${r.length - 1} grew.` : `${fallers.length} of ${r.length} ${plural(lower(d))} declined.`;
        return `${s1} ${s2}`;
      },
    };
  }

  function improved(d) {
    const DD = title(d);
    const isPts = M.format === 'percent';
    const chg = isPts ? 'Change (pts)' : 'Change (%)';
    const conds = [`${q(d)} IS NOT NULL`, ...valConds, ...periodConds(T, period?.kind === 'one' ? null : period)];
    const first = 'arg_min(__v, __p)', last = 'arg_max(__v, __p)';
    const delta = isPts ? `round(${last} - ${first}, 2)` : `round(100.0 * (${last} - ${first}) / nullif(abs(${first}), 0), 1)`;
    const dir = down && !up ? 'ASC' : 'DESC';
    const sql = `WITH g AS (\n  SELECT CAST(${q(d)} AS VARCHAR) AS __k, ${T.expr} AS __p, ${M.expr} AS __v\n  FROM data ${where(conds)}\n  GROUP BY 1, 2 HAVING ${M.expr} IS NOT NULL\n)\nSELECT __k AS ${q(DD)}, ${first} AS "Start", min(__p) AS "From", ${last} AS "Latest", max(__p) AS "To",\n  ${delta} AS ${q(chg)}\nFROM g GROUP BY 1 HAVING count(*) > 1\nORDER BY 6 ${dir} NULLS LAST`;
    return {
      title: `Change in ${mWord} by ${lower(d)}${period?.kind === 'since' ? ` since ${period.year}` : ''}${forText}`,
      sql, format: isPts ? 'number' : 'percent', chart: { type: 'bar', x: DD, y: [chg] },
      explain(rows) {
        const r = rows.filter((x) => x[chg] != null);
        if (!r.length) return 'There is not enough history to measure change.';
        const ch = (v) => (isPts ? pts(v) : pct(v));
        const a = r[0], z = r[r.length - 1];
        const g = T.grain;
        const s1 = `${a[DD]} ${a[chg] >= 0 ? (dir === 'ASC' ? 'grew the least' : 'improved the most') : 'declined the most'}: ${mWord} went from ${F(a.Start)} in ${fmtPeriod(a.From, g)} to ${F(a.Latest)} in ${fmtPeriod(a.To, g)} (${ch(a[chg])}).`;
        const s2 = r.length > 1 ? `${z[DD]} is at the other end with ${ch(z[chg])} (${F(z.Start)} → ${F(z.Latest)}).` : '';
        return `${s1} ${s2}`.trim();
      },
    };
  }

  function trend(d) {
    let grain = T.kind === 'year' ? 'year' : T.grain;
    if (T.kind !== 'year') {
      if (/\b(by year|yearly|annual\w*|per year|each year)\b/.test(t)) grain = 'year';
      else if (/\b(by quarter|quarterly|per quarter)\b/.test(t)) grain = 'quarter';
      else if (/\b(by month|monthly|per month|each month)\b/.test(t)) grain = 'month';
      else if (/\b(by week|weekly|per week)\b/.test(t)) grain = 'week';
      else if (/\b(daily|by day|per day|each day)\b/.test(t)) grain = 'day';
    }
    const TE = T.kind === 'year' ? T.expr : timeExpr({ ...T, grain });
    const conds = [...valConds, ...periodConds(T, period)];
    const DD = d ? title(d) : null;
    const sql = d
      ? `WITH top_values AS (\n  SELECT CAST(${q(d)} AS VARCHAR) AS __k FROM data ${where([`${q(d)} IS NOT NULL`, ...conds])}\n  GROUP BY 1 ORDER BY ${M.expr} DESC NULLS LAST LIMIT 6\n)\nSELECT ${TE} AS "Period", CAST(${q(d)} AS VARCHAR) AS ${q(DD)}, ${M.expr} AS ${q(Mlabel)}\nFROM data ${where([...conds, `CAST(${q(d)} AS VARCHAR) IN (SELECT __k FROM top_values)`])}\nGROUP BY 1, 2 ORDER BY 1, 2`
      : `SELECT ${TE} AS "Period", ${M.expr} AS ${q(Mlabel)}\nFROM data ${where(conds)}\nGROUP BY 1 ORDER BY 1`;
    return {
      title: `${Mlabel} over time${d ? ` by ${lower(d)}` : ''}${forText}${periodText(period)}`,
      sql, format: M.format, chart: { type: 'line', x: 'Period', y: [Mlabel], series: DD },
      explain(rows) {
        const r = rows.filter((x) => x[Mlabel] != null);
        if (r.length < 2) return r.length ? `${title(mWord)}${forText} is ${F(r[0][Mlabel])} in ${fmtPeriod(r[0].Period, grain)}.` : 'There is no data for this question with the current filters.';
        const ch = (a, b) => (M.format === 'percent' ? pts(b - a) : a ? pct((100 * (b - a)) / Math.abs(a)) : '');
        if (!d) {
          const a = r[0], z = r[r.length - 1];
          const peak = r.reduce((p, x) => (x[Mlabel] > p[Mlabel] ? x : p), r[0]);
          const low2 = r.reduce((p, x) => (x[Mlabel] < p[Mlabel] ? x : p), r[0]);
          return `${title(mWord)}${forText} went from ${F(a[Mlabel])} in ${fmtPeriod(a.Period, grain)} to ${F(z[Mlabel])} in ${fmtPeriod(z.Period, grain)} (${ch(a[Mlabel], z[Mlabel])}). It peaked at ${F(peak[Mlabel])} in ${fmtPeriod(peak.Period, grain)} and was lowest at ${F(low2[Mlabel])} in ${fmtPeriod(low2.Period, grain)}.`;
        }
        const series = {};
        for (const x of r) (series[x[DD]] ||= []).push(x);
        const last = r[r.length - 1].Period;
        const latest = Object.entries(series).map(([k, xs]) => ({ k, v: xs[xs.length - 1][Mlabel], first: xs[0][Mlabel], p: xs[xs.length - 1].Period })).sort((a, b) => b.v - a.v);
        const growth = latest.filter((x) => x.first).map((x) => ({ ...x, g: M.format === 'percent' ? x.v - x.first : (100 * (x.v - x.first)) / Math.abs(x.first) })).sort((a, b) => b.g - a.g);
        const s1 = `${latest[0].k} is highest in ${fmtPeriod(latest[0].p || last, grain)} at ${F(latest[0].v)}${latest[1] ? `, followed by ${latest[1].k} at ${F(latest[1].v)}` : ''}.`;
        const s2 = growth.length > 1 ? `Over the period, ${growth[0].k} grew the most (${M.format === 'percent' ? pts(growth[0].g) : pct(growth[0].g)}) and ${growth[growth.length - 1].k} the least (${M.format === 'percent' ? pts(growth[growth.length - 1].g) : pct(growth[growth.length - 1].g)}).` : '';
        return `${s1} ${s2}`.trim();
      },
    };
  }

  function number() {
    let expr = M.expr, label = Mlabel, lead = 'Total';
    const median = /\bmedian\b/.test(t);
    if ((avgQ || median) && M.col && (M.additive || M.isCount)) { expr = `${median ? 'median' : 'avg'}(${q(M.col)})`; label = `${median ? 'Median' : 'Average'} ${mWord} per record`; lead = median ? 'The median' : 'The average'; }
    else if (!M.additive && !M.isCount) lead = 'Overall,';
    const conds = [...valConds, ...periodConds(T, period)];
    const withAll = conds.length && lead === 'Total';
    const sql = `SELECT ${expr} AS ${q(label)}, count(*) AS "Records"${withAll ? `, (SELECT ${expr} FROM data) AS "All data"` : ''}\nFROM data ${where(conds)}`;
    return {
      title: `${label}${forText}${periodText(period)}`,
      sql, format: M.format, chart: { type: 'number', y: [label] },
      explain(rows) {
        const v = rows[0]?.[label];
        if (v == null) return 'There is no data for this question with the current filters.';
        const what = lead === 'Total' ? `Total ${mWord}` : lead === 'Overall,' ? `Overall, ${mWord}` : `${lead} ${mWord} per record`;
        const all = rows[0]['All data'];
        const s2 = withAll && all ? `That’s ${((100 * v) / all).toFixed(1)}% of the total across all the data (${F(all)}).`
          : M.isCount ? '' : `This is based on ${Number(rows[0].Records).toLocaleString('en-US')} records.`;
        return `${what}${forText}${periodText(period)} is ${F(v)}. ${s2}`.trim();
      },
    };
  }

  function decade(d) {
    const { Y } = timeParts(T);
    const DD = title(d);
    const conds = [`${q(d)} IS NOT NULL`, ...valConds];
    const sql = `WITH g AS (\n  SELECT CAST(${q(d)} AS VARCHAR) AS __k, ${Y} AS __y, ${M.expr} AS __v\n  FROM data ${where(conds)}\n  GROUP BY 1, 2 HAVING ${M.expr} IS NOT NULL\n)\nSELECT CAST(CAST(floor(__y / 10) * 10 AS INTEGER) AS VARCHAR) || 's' AS "Decade", __k AS ${q(DD)}, round(avg(__v), 2) AS ${q(Mlabel)}\nFROM g GROUP BY 1, 2 ORDER BY 1, 2`;
    return {
      title: `Average ${mWord} by decade and ${lower(d)}`,
      sql, format: M.format, chart: { type: 'bar', x: 'Decade', y: [Mlabel], series: DD },
      explain(rows) {
        const r = rows.filter((x) => x[Mlabel] != null);
        if (!r.length) return 'There is no data for this question.';
        const decs = [...new Set(r.map((x) => x.Decade))].sort();
        const lastD = decs[decs.length - 1];
        const inLast = r.filter((x) => x.Decade === lastD).sort((a, b) => b[Mlabel] - a[Mlabel]);
        return `In the ${lastD}, ${inLast[0][DD]} has the highest average ${mWord} at ${F(inLast[0][Mlabel])}${inLast.length > 1 ? `, and ${inLast[inLast.length - 1][DD]} the lowest at ${F(inLast[inLast.length - 1][Mlabel])}` : ''}. Averages use the years available in each decade (${decs[0]}–${lastD}).`;
      },
    };
  }

  function weekday() {
    const { D } = timeParts(T);
    const W = found || spec.measures.find((m) => m.isCount) || M;
    const L = W.label;
    const conds = [...valConds, ...periodConds(T, period)];
    const sql = `SELECT dayname(${D}) AS "Day", ${W.expr} AS ${q(L)}\nFROM data ${where(conds)}\nGROUP BY 1, isodow(${D})\nORDER BY isodow(${D})`;
    return {
      title: `${L} by day of the week${forText}`,
      sql, format: W.format, chart: { type: 'bar', x: 'Day', y: [L], highlight: 'max' },
      explain(rows) {
        const r = rows.filter((x) => x[L] != null);
        if (!r.length) return 'There is no data for this question.';
        const s = [...r].sort((a, b) => b[L] - a[L]);
        const F2 = (v) => fmt(v, W.format, cur);
        return `${s[0].Day} is the busiest day with ${F2(s[0][L])} ${lower(L.replace(/\s*\(.*?\)\s*$/, ''))}${s[1] ? `, followed by ${s[1].Day} (${F2(s[1][L])})` : ''}. ${s[s.length - 1].Day} is the quietest at ${F2(s[s.length - 1][L])}.`;
      },
    };
  }
}

/** Example questions that this engine answers well for the given dashboard. */
export function exampleQuestions(spec) {
  const m0 = spec.measures.find((m) => !m.isCount) || spec.measures[0];
  const m1 = spec.measures.find((m) => m !== m0 && !m.isCount);
  const d = spec.dim, w = (c) => lower(c);
  const out = [];
  const ml = lower(m0.label.replace(/\s*\(.*?\)\s*$/, ''));
  if (d) out.push(`Which ${w(d)} has the highest ${ml}?`);
  if (d && spec.time && spec.time.kind !== 'year') out.push(`Which ${w(d)}'s ${ml} fell last quarter?`);
  if (d && spec.time && spec.time.kind === 'year') out.push(`Which ${w(d)} improved ${ml} the most?`);
  if (spec.time) out.push(`How has ${ml} changed over time?`);
  if (m1 && d) out.push(`Which ${w(d)} has the lowest ${lower(m1.label.replace(/\s*\(.*?\)\s*$/, ''))}?`);
  if (!out.length) out.push(`What is the total ${ml}?`);
  return out.slice(0, 3);
}
