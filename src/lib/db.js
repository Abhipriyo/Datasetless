// In-browser SQL engine (DuckDB-WASM). Everything runs on the user's device.
import * as duckdb from '@duckdb/duckdb-wasm';
import { DataType } from 'apache-arrow';

let ready = null;

async function init() {
  let bundles;
  if (import.meta.env.VITE_DUCKDB_CDN === '1') {
    bundles = duckdb.getJsDelivrBundles();
  } else {
    bundles = (await import('./duckdb-local.js')).bundles;
  }
  const bundle = await duckdb.selectBundle(bundles);
  const workerSrc = new URL(bundle.mainWorker, location.href).href;
  const workerUrl = URL.createObjectURL(new Blob([`importScripts("${workerSrc}");`], { type: 'text/javascript' }));
  const worker = new Worker(workerUrl);
  const db = new duckdb.AsyncDuckDB(new duckdb.VoidLogger(), worker);
  await db.instantiate(new URL(bundle.mainModule, location.href).href, bundle.pthreadWorker);
  URL.revokeObjectURL(workerUrl);
  await db.open({
    query: { castBigIntToDouble: true, castDecimalToDouble: true, castTimestampToDate: true },
  });
  const conn = await db.connect();
  // No silent extension downloads from generated SQL.
  for (const s of ['SET autoinstall_known_extensions=false', 'SET autoload_known_extensions=false']) {
    try { await conn.query(s); } catch { /* older builds */ }
  }
  return { db, conn };
}

export function getDB() {
  if (!ready) ready = init().catch((e) => { ready = null; throw e; });
  return ready;
}

function toPlain(res) {
  const fields = res.schema.fields;
  const isTime = fields.map((f) => DataType.isDate(f.type) || DataType.isTimestamp(f.type));
  const out = [];
  for (const row of res.toArray()) {
    const o = {};
    fields.forEach((f, i) => {
      let v = row[f.name];
      if (typeof v === 'bigint') v = Number(v);
      if (v != null && isTime[i]) {
        const d = v instanceof Date ? v : new Date(Number(v));
        v = isNaN(d) ? null : d.toISOString().replace('T00:00:00.000Z', '').replace('.000Z', '').replace('T', ' ');
      } else if (v != null && typeof v === 'object' && !(v instanceof Date)) {
        v = typeof v.toJSON === 'function' ? v.toJSON() : String(v);
      }
      o[f.name] = v;
    });
    out.push(o);
  }
  return { rows: out, columns: fields.map((f) => f.name) };
}

export async function query(sql) {
  const { conn } = await getDB();
  const res = await conn.query(sql);
  return toPlain(res).rows;
}

export async function queryWithColumns(sql) {
  const { conn } = await getDB();
  return toPlain(await conn.query(sql));
}

export async function registerText(name, text) {
  const { db } = await getDB();
  await db.registerFileText(name, text);
}

export async function registerBuffer(name, buf) {
  const { db } = await getDB();
  await db.registerFileBuffer(name, buf instanceof Uint8Array ? buf : new Uint8Array(buf));
}

export async function dropFile(name) {
  const { db } = await getDB();
  try { await db.dropFile(name); } catch { /* ignore */ }
}
