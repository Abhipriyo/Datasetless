// Writes insight-style chart titles from the query results
// ("South fell 24% in the last 3 months", not "Revenue by region").
import { fmt, fmtPeriod, pctChange } from './format.js';

const lc = (s) => (/^[A-Z0-9]{2,}\b/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1));
const dir = (p, up = 'rose', down = 'fell') => (p >= 0 ? up : down);
const pctStr = (p) => `${Math.abs(p) >= 100 ? Math.round(Math.abs(p)).toLocaleString('en-US') : Math.abs(p).toFixed(Math.abs(p) < 10 ? 1 : 0)}%`;
// Percent-format measures change in percentage points, not percent.
const changeStr = (m, a, b) => (m.format === 'percent' ? `${Math.abs(a - b).toFixed(1)} pts` : pctStr(pctChange(a, b)));

function windowCompare(values) {
  const v = values.filter((x) => x != null && Number.isFinite(x));
  if (v.length < 4) return null;
  const k = Math.min(3, Math.floor(v.length / 2));
  const sum = (arr) => arr.reduce((a, b) => a + b, 0);
  const last = sum(v.slice(-k)), prev = sum(v.slice(-2 * k, -k));
  return { k, last, prev, p: pctChange(last, prev) };
}

export function trendTitle(m, rows, grain, cur) {
  const v = rows.map((r) => r.value);
  const valid = rows.filter((r) => r.value != null);
  if (valid.length < 2) return `${m.label} over time`;
  if (grain === 'year' || m.format === 'percent' || !m.additive) {
    const a = valid[0], b = valid[valid.length - 1];
    const p = pctChange(b.value, a.value);
    if (p == null) return `${m.label} over time`;
    if (Math.abs(p) < 1 && m.format !== 'percent') return `${m.label} held steady since ${fmtPeriod(a.period, grain)}`;
    return `${m.label} ${dir(b.value - a.value)} ${changeStr(m, b.value, a.value)} since ${fmtPeriod(a.period, grain)}`;
  }
  const w = windowCompare(v);
  if (!w || w.p == null) return `${m.label} over time`;
  const unit = { day: 'days', week: 'weeks', month: 'months', quarter: 'quarters', year: 'years' }[grain] || 'periods';
  if (Math.abs(w.p) < 1) return `${m.label} is flat over the last ${w.k} ${unit}`;
  return `${m.label} ${dir(w.p, 'up', 'down')} ${pctStr(w.p)} in the last ${w.k} ${unit} vs the ${w.k} before`;
}

export function splitTitle(m, rows, grain, cur) {
  const bySeries = new Map();
  for (const r of rows) { if (!bySeries.has(r.series)) bySeries.set(r.series, []); bySeries.get(r.series).push(r); }
  if (!bySeries.size) return `${m.label} over time`;
  const periods = [...new Set(rows.map((r) => r.period))].sort();
  const lastP = periods[periods.length - 1];
  let leader = null;
  for (const [s, arr] of bySeries) { const l = arr.find((r) => r.period === lastP); if (l?.value != null && (!leader || l.value > leader.v)) leader = { s, v: l.value }; }
  // Biggest mover
  let mover = null, worst = null;
  for (const [s, arr] of bySeries) {
    const vals = arr.filter((r) => r.value != null);
    let p;
    if (grain === 'year' || !m.additive) {
      if (vals.length < 2) continue;
      const a = vals[0].value, b = vals[vals.length - 1].value;
      p = m.format === 'percent' ? b - a : pctChange(b, a);
    } else {
      const w = windowCompare(arr.map((r) => r.value));
      p = w?.p;
    }
    if (p != null && Number.isFinite(p) && (!mover || Math.abs(p) > Math.abs(mover.p))) mover = { s, p };
    if (p != null && Number.isFinite(p) && (!worst || p < worst.p)) worst = { s, p };
  }
  // For business data a decline is the most actionable thing to surface.
  if (grain !== 'year' && m.additive && worst && worst.p < -5) {
    const k = Math.min(3, Math.floor(periods.length / 2));
    return `${worst.s} ${lc(m.label)} fell ${pctStr(worst.p)} in the last ${k} ${grainWord(grain)}`;
  }
  if (bySeries.size === 1) return trendTitle(m, [...bySeries.values()][0], grain, cur);
  if (leader && mover && mover.s !== leader.s && Math.abs(mover.p) >= 5) {
    const moved = m.format === 'percent' ? `${Math.abs(mover.p).toFixed(1)} pts` : pctStr(mover.p);
    return `${leader.s} leads; ${mover.s} ${dir(mover.p, 'gained', 'lost')} the most (${mover.p >= 0 ? '+' : '−'}${moved})`;
  }
  if (leader) return `${leader.s} leads ${lc(m.label)} in ${fmtPeriod(lastP, grain)}`;
  return `${m.label} over time`;
}
const grainWord = (g) => ({ day: 'days', week: 'weeks', month: 'months', quarter: 'quarters' }[g] || 'periods');

export function rankTitle(m, rows, dimLabel, cur) {
  const valid = rows.filter((r) => r.value != null);
  if (!valid.length) return `${m.label} by ${dimLabel}`;
  const top = valid[0];
  if (valid.length === 1) return `${top.label}: ${fmt(top.value, m.format, cur)}`;
  if (m.additive && top.total) {
    const share = (top.value / top.total) * 100;
    return `${top.label} leads with ${fmt(top.value, m.format, cur)} (${share.toFixed(0)}% of total)`;
  }
  const bottom = valid[valid.length - 1];
  return `${top.label} is highest at ${fmt(top.value, m.format, cur)}; ${bottom.label} lowest at ${fmt(bottom.value, m.format, cur)}`;
}

export function pearson(points) {
  const n = points.length;
  if (n < 3) return null;
  const mx = points.reduce((a, p) => a + p.x, 0) / n, my = points.reduce((a, p) => a + p.y, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (const p of points) { sxy += (p.x - mx) * (p.y - my); sxx += (p.x - mx) ** 2; syy += (p.y - my) ** 2; }
  return sxx && syy ? sxy / Math.sqrt(sxx * syy) : null;
}

export function scatterTitle(mx, my, points) {
  const r = pearson(points);
  if (r == null) return `${my.label} vs ${mx.label}`;
  const a = Math.abs(r);
  const strength = a >= 0.7 ? 'Strong' : a >= 0.4 ? 'Moderate' : a >= 0.2 ? 'Weak' : 'No clear';
  const sign = a < 0.2 ? '' : r > 0 ? 'positive ' : 'negative ';
  return `${strength} ${sign}link between ${mx.label.replace(/\s*\(.*\)$/, '')} and ${my.label.replace(/\s*\(.*\)$/, '')} (r = ${r.toFixed(2)})`;
}
