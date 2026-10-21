// Loads any supported input into the single working table "data".
import { query, registerText, registerBuffer } from './db.js';
import { toCSV, cleanTable } from './parse.js';
import { lit } from './sqlguard.js';
import { LIMITS } from '../config.js';

let seq = 0;
const fname = (ext) => `input_${Date.now()}_${seq++}.${ext}`;

async function finish() {
  const [{ n }] = await query('SELECT count(*)::INTEGER AS n FROM data');
  if (!n) throw new Error('The data loaded, but it has no rows.');
  return n;
}

export async function loadCSVText(text) {
  const name = fname('csv');
  await registerText(name, text);
  await query(`CREATE OR REPLACE TABLE data AS SELECT * FROM read_csv_auto(${lit(name)}, header=true, sample_size=-1)`);
  return finish();
}

export async function loadTable({ headers, rows }) {
  return loadCSVText(toCSV(headers, rows));
}

export async function loadObjects(objs, headers) {
  const hs = headers || [...new Set(objs.flatMap((o) => Object.keys(o)))];
  return loadCSVText(toCSV(hs, objs));
}

function flatten(o, prefix = '', out = {}) {
  for (const [k, v] of Object.entries(o || {})) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length <= 30 && prefix.split('.').length < 2) flatten(v, key, out);
    else out[key] = Array.isArray(v) ? JSON.stringify(v) : v;
  }
  return out;
}

export function jsonToObjects(json) {
  let arr = Array.isArray(json) ? json : null;
  if (!arr && json && typeof json === 'object') {
    const stack = [json];
    while (stack.length && !arr) {
      const cur = stack.shift();
      for (const v of Object.values(cur)) {
        if (Array.isArray(v) && v.length && typeof v[0] === 'object' && v[0] !== null) { arr = v; break; }
        if (v && typeof v === 'object' && !Array.isArray(v)) stack.push(v);
      }
    }
  }
  if (!arr || !arr.length) throw new Error('Could not find a list of records in that JSON.');
  // Array of arrays with a header row
  if (Array.isArray(arr[0])) {
    return { headers: arr[0].map(String), rows: arr.slice(1) };
  }
  const objs = arr.filter((x) => x && typeof x === 'object').map((x) => flatten(x));
  const headers = [...new Set(objs.flatMap((o) => Object.keys(o)))].slice(0, 200);
  return { headers, rows: objs.map((o) => headers.map((h) => o[h])) };
}

export async function loadJSONText(text) {
  let json;
  try { json = JSON.parse(text); } catch {
    // NDJSON
    json = text.split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
  }
  return loadTable(jsonToObjects(json));
}

export async function workbookSheets(buf) {
  const XLSX = await import('xlsx'); // loaded only when an Excel file is used
  const wb = XLSX.read(buf, { type: 'array', cellDates: true, dense: true });
  return wb.SheetNames.map((name) => {
    const grid = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: true, defval: '' });
    return { name, grid, cells: grid.reduce((a, r) => a + r.filter((c) => c !== '').length, 0) };
  }).filter((s) => s.cells > 0);
}

// Messy sheets often have titles or notes above the real header row.
export function gridToTable(grid) {
  const head = grid.slice(0, 30);
  const counts = head.map((r) => r.filter((c) => c !== '' && c != null).length);
  const maxCols = Math.max(...counts, 0);
  let hi = counts.findIndex((c, i) => c >= Math.max(2, Math.ceil(maxCols * 0.6)) &&
    head[i].filter((x) => typeof x === 'string' && x.trim()).length >= c * 0.6);
  if (hi < 0) hi = 0;
  const headers = grid[hi].map((h) => (h instanceof Date ? h.toISOString().slice(0, 10) : String(h ?? '')));
  const rows = grid.slice(hi + 1)
    .filter((r) => r.some((c) => c !== '' && c != null))
    .map((r) => r.map((c) => (c instanceof Date ? (isNaN(c) ? '' : c.toISOString().slice(0, 10)) : c == null ? '' : String(c))));
  // Stop at a fully blank gap followed by notes/totals blocks of different width is too clever; keep all rows.
  return cleanTable({ headers, rows });
}

export async function loadFile(file, { pickSheet } = {}) {
  if (file.size > LIMITS.maxFileMB * 1024 * 1024) throw new Error(`Files up to ${LIMITS.maxFileMB} MB are supported.`);
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  const buf = new Uint8Array(await file.arrayBuffer());
  return loadBuffer(buf, ext, { pickSheet });
}

export async function loadBuffer(buf, ext, { pickSheet } = {}) {
  if (['xlsx', 'xlsm', 'xls', 'xlsb', 'ods'].includes(ext)) {
    const sheets = await workbookSheets(buf);
    if (!sheets.length) throw new Error('That workbook has no data.');
    sheets.sort((a, b) => b.cells - a.cells);
    let sheet = sheets[0];
    // Only ask when several sheets hold real data (skip notes/cover sheets).
    const candidates = sheets.filter((s) => s.cells >= sheet.cells * 0.2);
    if (candidates.length > 1 && pickSheet) sheet = (await pickSheet(candidates)) || sheet;
    return { rows: await loadTable(gridToTable(sheet.grid)), detail: `Sheet “${sheet.name}”` };
  }
  if (ext === 'parquet') {
    const name = fname('parquet');
    await registerBuffer(name, buf);
    await query(`CREATE OR REPLACE TABLE data AS SELECT * FROM read_parquet(${lit(name)})`);
    return { rows: await finish() };
  }
  const text = new TextDecoder().decode(buf).replace(/^﻿/, '');
  if (ext === 'json' || ext === 'ndjson' || /^\s*[[{]/.test(text.slice(0, 50))) return { rows: await loadJSONText(text) };
  return { rows: await loadCSVText(text) };
}
