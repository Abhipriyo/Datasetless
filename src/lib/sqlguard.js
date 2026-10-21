// Guards SQL produced by an LLM before it runs in the in-browser engine:
// one read-only SELECT, no file/network access, no settings changes.

const WRITE_OR_SYSTEM = /\b(attach|detach|copy|install|load|pragma|set|reset|create|insert|update|delete|drop|alter|export|import|call|checkpoint|vacuum|truncate|grant|use)\b/i;
const EXTERNAL = /\b(read_\w+|glob|sniff_csv|parquet_\w+|duckdb_\w+|getenv)\s*\(|https?:\/\/|s3:\/\/|gcs:\/\/|file:\/\//i;

function stripLiterals(sql) {
  return sql
    .replace(/'(?:[^']|'')*'/g, "''")
    .replace(/"(?:[^"]|"")*"/g, '""')
    .replace(/--[^\n]*/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ');
}

export function guardSelect(sql) {
  let s = String(sql || '').trim().replace(/^```(?:sql)?\s*|\s*```$/gi, '').trim().replace(/;\s*$/, '');
  if (!s) throw new Error('Empty query.');
  const bare = stripLiterals(s);
  if (bare.includes(';')) throw new Error('Only one statement is allowed.');
  if (!/^\s*(with|select|from|values)\b/i.test(bare)) throw new Error('Only SELECT queries are allowed.');
  if (WRITE_OR_SYSTEM.test(bare)) throw new Error('This query tries to change data or settings, so it was blocked.');
  if (EXTERNAL.test(s)) throw new Error('This query tries to read files or the network, so it was blocked.');
  return s;
}

export const q = (name) => '"' + String(name).replace(/"/g, '""') + '"';
export const lit = (v) => (v == null ? 'NULL' : typeof v === 'number' ? String(v) : "'" + String(v).replace(/'/g, "''") + "'");
