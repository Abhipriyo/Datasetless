// Parsing helpers for pasted tables, HTML tables and CSV output.

export function toCSV(headers, rows) {
  const esc = (v) => {
    if (v == null) return '';
    if (v instanceof Date) return isNaN(v) ? '' : v.toISOString().slice(0, v.getUTCHours() || v.getUTCMinutes() ? 19 : 10);
    const s = String(v);
    return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const lines = [headers.map(esc).join(',')];
  for (const r of rows) lines.push(headers.map((h, i) => esc(Array.isArray(r) ? r[i] : r[h])).join(','));
  return lines.join('\n');
}

// Minimal RFC-4180 parser with a configurable delimiter.
export function parseDelimited(text, delim = ',') {
  const rows = [];
  let row = [], field = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false;
      } else field += c;
    } else if (c === '"' && field === '') inQ = true;
    else if (c === delim) { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim() !== ''));
}

function detectDelimiter(firstLines) {
  const cands = ['\t', ',', ';', '|'];
  let best = ',', score = 0;
  for (const d of cands) {
    const counts = firstLines.map((l) => l.split(d).length - 1);
    const min = Math.min(...counts);
    if (min > 0 && min >= score) { if (min > score || d === '\t') { best = d; score = min; } }
  }
  return best;
}

// Accepts spreadsheet copy (TSV), CSV, semicolon CSV, or a Markdown table.
export function parsePasted(text) {
  const t = String(text || '').replace(/ /g, ' ').trim();
  if (!t) throw new Error('Nothing to parse — paste a table first.');
  const lines = t.split(/\r?\n/).filter((l) => l.trim());
  let grid;
  const isMarkdown = lines.length >= 2 && /\|/.test(lines[0]) && /^\s*\|?\s*:?-{2,}/.test(lines[1]);
  if (isMarkdown) {
    grid = lines
      .filter((l) => !/^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(l))
      .map((l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim()));
  } else {
    grid = parseDelimited(t, detectDelimiter(lines.slice(0, 5)));
  }
  if (grid.length < 2) throw new Error('Need a header row and at least one data row.');
  return cleanTable({ headers: grid[0], rows: grid.slice(1) });
}

const NUMERIC_RE = /^\(?[-−–]?\s*[$€£₹¥]?\s*[-−–]?\d[\d,]*(\.\d+)?\s*(%|[kKmMbB])?\)?$/;

export function parseNumberLike(s) {
  if (s == null) return null;
  let t = String(s).trim();
  if (!t || /^(n\/?a|–|—|-|\.{1,3}|null|none)$/i.test(t)) return null;
  if (!NUMERIC_RE.test(t)) return undefined;
  const neg = /^\(.*\)$/.test(t) || /^[-−–]/.test(t.replace(/^[$€£₹¥]\s*/, '')) || /[$€£₹¥]\s*[-−–]/.test(t);
  let mult = 1;
  const suf = t.match(/([kKmMbB])\)?$/);
  if (suf) mult = { k: 1e3, m: 1e6, b: 1e9 }[suf[1].toLowerCase()];
  const num = parseFloat(t.replace(/[^\d.]/g, ''));
  if (!Number.isFinite(num)) return undefined;
  return (neg ? -num : num) * mult;
}

// Normalise headers, strip footnote markers, and turn numeric-looking text into numbers.
export function cleanTable({ headers, rows }) {
  const width = Math.max(headers.length, ...rows.map((r) => r.length));
  const seen = new Map();
  const hs = Array.from({ length: width }, (_, i) => {
    let h = String(headers[i] ?? '').replace(/\[[^\]]*\]/g, '').replace(/\s+/g, ' ').trim() || `Column ${i + 1}`;
    const k = h.toLowerCase();
    if (seen.has(k)) { seen.set(k, seen.get(k) + 1); h = `${h} ${seen.get(k)}`; } else seen.set(k, 1);
    return h;
  });
  let body = rows.map((r) =>
    Array.from({ length: width }, (_, i) => String(r[i] ?? '').replace(/\[[^\]]*\]/g, '').replace(/\s+/g, ' ').trim())
  );
  // Drop repeated header rows and fully empty columns.
  body = body.filter((r) => r.join('|').toLowerCase() !== hs.join('|').toLowerCase());
  const keep = hs.map((_, i) => body.some((r) => r[i] !== ''));
  for (let i = 0; i < width; i++) {
    if (!keep[i]) continue;
    const vals = body.map((r) => r[i]).filter((v) => v !== '');
    if (!vals.length) continue;
    const parsed = vals.map(parseNumberLike);
    const ok = parsed.filter((p) => p !== undefined).length;
    if (ok / vals.length >= 0.8 && vals.some((v) => /\d/.test(v))) {
      const hadPct = vals.some((v) => /%\)?$/.test(v));
      for (const r of body) {
        const p = parseNumberLike(r[i]);
        r[i] = p == null || p === undefined ? '' : String(p);
      }
      if (hadPct && !/%|percent/i.test(hs[i])) hs[i] = `${hs[i]} (%)`;
    }
  }
  const headersOut = hs.filter((_, i) => keep[i]);
  const rowsOut = body.map((r) => r.filter((_, i) => keep[i]));
  if (!headersOut.length || !rowsOut.length) throw new Error('That table looks empty.');
  return { headers: headersOut, rows: rowsOut };
}

// Convert an HTML <table> element (e.g. from Wikipedia) into headers + rows.
export function htmlTableToData(table) {
  table.querySelectorAll('sup, style, script, .reference, .sortkey, [style*="display:none"], [style*="display: none"]').forEach((n) => n.remove());
  const trs = [...table.querySelectorAll('tr')];
  const grid = [];
  const spans = []; // carry-down for rowspan: col -> {text, left}
  const headerRows = [];
  trs.forEach((tr, ri) => {
    const cells = [...tr.children].filter((c) => /^(TD|TH)$/.test(c.tagName));
    if (!cells.length) return;
    const out = [];
    let col = 0;
    const take = () => {
      while (spans[col] && spans[col].left > 0) { out[col] = spans[col].text; spans[col].left--; col++; }
    };
    for (const c of cells) {
      take();
      const text = c.textContent.replace(/\s+/g, ' ').trim();
      const cs = Math.min(parseInt(c.getAttribute('colspan') || '1', 10) || 1, 50);
      const rs = Math.min(parseInt(c.getAttribute('rowspan') || '1', 10) || 1, 500);
      for (let k = 0; k < cs; k++) {
        out[col] = text;
        if (rs > 1) spans[col] = { text, left: rs - 1 };
        col++;
      }
    }
    take();
    const allTh = cells.every((c) => c.tagName === 'TH');
    if (allTh && grid.length === 0) headerRows.push(out);
    else grid.push(out);
  });
  if (!headerRows.length && grid.length) headerRows.push(grid.shift());
  const width = Math.max(...headerRows.map((r) => r.length), ...grid.map((r) => r.length), 0);
  const headers = Array.from({ length: width }, (_, i) => {
    const parts = [];
    for (const hr of headerRows) { const p = hr[i] || ''; if (p && parts[parts.length - 1] !== p) parts.push(p); }
    return parts.join(' – ');
  });
  return cleanTable({ headers, rows: grid });
}
