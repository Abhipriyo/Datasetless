// Automatic data-quality checks shown beside every dashboard, so a good-looking
// chart never hides missing or partial data.
import { query } from './db.js';
import { q } from './sqlguard.js';
import { fmt, fmtPeriod } from './format.js';

export async function runChecks(spec, profile) {
  const out = [];
  const n = spec.n;
  const safe = async (fn) => { try { await fn(); } catch (e) { console.warn('check failed', e); } };

  if (n < 30) out.push({ level: 'warning', title: 'Small sample', text: `Only ${n} rows — patterns may be chance.` });

  // Missing values in measures
  for (const m of spec.measures.filter((m) => m.col)) {
    const c = profile.columns.find((c) => c.name === m.col);
    if (!c) continue;
    const missing = 1 - c.nonNull / n;
    if (missing > 0.05) out.push({ level: missing > 0.4 ? 'serious' : 'warning', title: `Gaps in ${m.label}`, text: `${Math.round(missing * 100)}% of values are missing${spec.panel ? ' (not every country reports every year)' : ''}.` });
  }

  if (spec.time) {
    const T = spec.time.expr;
    // Partial latest period (date data)
    if (spec.time.kind === 'date' && spec.time.grain !== 'day') await safe(async () => {
      const [r] = await query(`SELECT CAST(max(CAST(${q(spec.time.col)} AS DATE)) AS VARCHAR) AS mx, max(${T}) AS p FROM main.data`);
      if (!r?.mx) return;
      const d = new Date(r.mx + 'T00:00:00Z');
      const g = spec.time.grain;
      let end;
      if (g === 'week') { end = new Date(d); end.setUTCDate(d.getUTCDate() + ((7 - d.getUTCDay()) % 7)); }
      else if (g === 'month') end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
      else if (g === 'quarter') end = new Date(Date.UTC(d.getUTCFullYear(), Math.floor(d.getUTCMonth() / 3) * 3 + 3, 0));
      else end = new Date(Date.UTC(d.getUTCFullYear(), 11, 31));
      const gap = (end - d) / 864e5;
      if (gap >= 2) out.push({ level: 'warning', title: 'Latest period is partial', text: `${fmtPeriod(r.p, g)} only has data up to ${r.mx}, so it will look lower than full periods.` });
    });
    // Panel coverage in the latest period
    if (spec.panel && spec.dim) await safe(async () => {
      const m = spec.measures.find((m) => m.col);
      const rows = await query(`SELECT ${T} AS p, count(DISTINCT ${q(spec.dim)}) FILTER (WHERE ${q(m.col)} IS NOT NULL)::INTEGER AS k FROM main.data GROUP BY 1 ORDER BY 1`);
      const max = Math.max(...rows.map((r) => r.k));
      const last = [...rows].reverse().find((r) => r.k > 0);
      const lastAll = rows[rows.length - 1];
      if (lastAll && lastAll.k < max) {
        out.push({ level: 'warning', title: 'Recent data still coming in', text: `${m.label}: ${lastAll.p} has values for ${lastAll.k} of ${max} ${spec.dim === 'Country' ? 'countries' : 'entities'}. Rankings use each one's latest available year${last ? ` (latest complete: ${[...rows].reverse().find((r) => r.k === max)?.p ?? last.p})` : ''}.` });
      }
    });
  }

  // Duplicate rows
  if (n <= 2_000_000) await safe(async () => {
    const cols = profile.columns.slice(0, 60).map((c) => q(c.name)).join(', ');
    const [d] = await query(`SELECT coalesce(sum(c - 1), 0)::INTEGER AS d FROM (SELECT count(*) AS c FROM main.data GROUP BY ${cols} HAVING count(*) > 1)`);
    if (d.d > 0) out.push({ level: d.d > n * 0.05 ? 'serious' : 'warning', title: 'Duplicate rows', text: `${d.d.toLocaleString('en-US')} rows are exact duplicates and may be double-counted.` });
  });

  // Outliers and negatives in the main additive measure (row level)
  const m0 = spec.measures.find((m) => m.col && m.additive && !spec.panel);
  if (m0) await safe(async () => {
    const c = q(m0.col);
    const [r] = await query(`SELECT quantile_cont(${c}, 0.25) AS q1, quantile_cont(${c}, 0.75) AS q3, count(*) FILTER (WHERE ${c} < 0)::INTEGER AS neg FROM main.data`);
    const iqr = r.q3 - r.q1;
    if (iqr > 0) {
      const hi = r.q3 + 3 * iqr;
      const [o] = await query(`SELECT count(*)::INTEGER AS k, max(${c}) AS mx FROM main.data WHERE ${c} > ${hi}`);
      if (o.k > 0) out.push({ level: 'info', title: `Unusually large ${m0.label} values`, text: `${o.k.toLocaleString('en-US')} rows are far above typical (over ${fmt(hi, m0.format, spec.currency)}; max ${fmt(o.mx, m0.format, spec.currency)}). Check they're real.` });
    }
    if (r.neg > 0) out.push({ level: 'info', title: `Negative ${m0.label}`, text: `${r.neg.toLocaleString('en-US')} rows are negative — refunds or adjustments? They reduce totals.` });
  });

  if (!out.length) out.push({ level: 'good', title: 'All checks passed', text: 'No missing values, duplicates, partial periods or extreme outliers found.' });
  return out;
}
