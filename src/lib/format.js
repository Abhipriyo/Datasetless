// Number and label formatting shared by KPIs, charts, tooltips and tables.

const trim = (s) => (s.includes('.') ? s.replace(/0+$/, '').replace(/\.$/, '') : s);

export function compact(v, digits = 1) {
  if (v == null || !Number.isFinite(Number(v))) return '–';
  v = Number(v);
  const a = Math.abs(v);
  for (const [d, s] of [[1e12, 'T'], [1e9, 'B'], [1e6, 'M'], [1e3, 'K']]) {
    if (a >= d) return trim((v / d).toFixed(a / d >= 100 ? 0 : digits)) + s;
  }
  if (a >= 100) return Math.round(v).toLocaleString('en-US');
  if (a === 0) return '0';
  return trim(v.toFixed(a < 1 ? 2 : digits));
}

// Indian grouping (lakh / crore), used for ₹ amounts.
export function compactIN(v) {
  if (v == null || !Number.isFinite(Number(v))) return '–';
  v = Number(v);
  const a = Math.abs(v);
  if (a >= 1e7) return trim((v / 1e7).toFixed(a >= 1e9 ? 0 : 2)) + ' Cr';
  if (a >= 1e5) return trim((v / 1e5).toFixed(2)) + ' L';
  if (a >= 1e3) return trim((v / 1e3).toFixed(1)) + 'K';
  return compact(v);
}

export function fmt(v, format = 'number', currency = '$') {
  if (v == null || v === '' || Number.isNaN(Number(v))) return '–';
  const n = Number(v);
  switch (format) {
    case 'percent':
      return trim(n.toFixed(Math.abs(n) < 100 ? 1 : 0)) + '%';
    case 'currency': {
      const body = currency === '₹' ? compactIN(Math.abs(n)) : compact(Math.abs(n));
      return (n < 0 ? '-' : '') + currency + body;
    }
    case 'ratio':
      return trim(n.toFixed(2)) + '×';
    case 'integer':
      return Math.abs(n) >= 1e4 ? compact(n) : Math.round(n).toLocaleString('en-US');
    default:
      return compact(n);
  }
}

export function pctChange(curr, prev) {
  if (curr == null || prev == null || !Number.isFinite(curr) || !Number.isFinite(prev) || prev === 0) return null;
  return ((curr - prev) / Math.abs(prev)) * 100;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Period labels are produced by SQL in sortable form; this makes them readable.
export function fmtPeriod(label, grain, short = false) {
  if (label == null) return '–';
  const s = String(label);
  if (grain === 'month') {
    const m = s.match(/^(\d{4})-(\d{2})/);
    if (m) return `${MONTHS[+m[2] - 1]} ${short ? "'" + m[1].slice(2) : m[1]}`;
  }
  if (grain === 'day' || grain === 'week') {
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${+m[3]} ${MONTHS[+m[2] - 1]}${short ? '' : ' ' + m[1]}`;
  }
  if (grain === 'quarter') return s.replace(/^(\d\d)(\d\d)-Q(\d)$/, short ? "Q$3 '$2" : 'Q$3 $1$2');
  return s;
}

export function plural(n, word) {
  return `${Number(n).toLocaleString('en-US')} ${word}${n === 1 ? '' : 's'}`;
}
