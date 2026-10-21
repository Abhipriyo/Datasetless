// Profiles the "data" table: classifies each column as time, measure or dimension.
import { query } from './db.js';
import { q } from './sqlguard.js';

const NUMERIC = /^(TINYINT|SMALLINT|INTEGER|BIGINT|HUGEINT|UTINYINT|USMALLINT|UINTEGER|UBIGINT|FLOAT|REAL|DOUBLE|DECIMAL.*|NUMERIC.*)$/i;
const INTEGER = /INT/i;
const TIME = /^(DATE|TIMESTAMP.*|TIMESTAMP WITH TIME ZONE)$/i;
const ID_NAME = /(^|[\s_-])(id|uuid|guid|key|code|zip|pin|pincode|postcode|postal|phone|mobile|sku|isbn|ean|upc|invoice no|order no|lat|latitude|lon|lng|longitude)$|^(id|#|no\.?|s\.?no\.?|sr\.?\s?no\.?|serial|index|rank)$/i;
const YEAR_NAME = /(^|[\s_-])(year|yr|fy|fiscal year)$|^year/i;

export async function profileTable() {
  const desc = await query('DESCRIBE data');
  const cols = desc.map((d) => ({ name: d.column_name, type: String(d.column_type).toUpperCase() })).slice(0, 80);
  const [{ n }] = await query('SELECT count(*)::INTEGER AS n FROM data');
  const parts = [];
  cols.forEach((c, i) => {
    parts.push(`approx_count_distinct(${q(c.name)})::INTEGER AS d${i}`, `count(${q(c.name)})::INTEGER AS c${i}`);
    if (NUMERIC.test(c.type)) parts.push(`min(${q(c.name)})::DOUBLE AS mn${i}`, `max(${q(c.name)})::DOUBLE AS mx${i}`);
    if (TIME.test(c.type)) parts.push(`CAST(min(${q(c.name)}) AS VARCHAR) AS mn${i}`, `CAST(max(${q(c.name)}) AS VARCHAR) AS mx${i}`);
  });
  const [s] = parts.length ? await query(`SELECT ${parts.join(', ')} FROM data`) : [{}];
  const columns = cols.map((c, i) => {
    const col = { ...c, distinct: Math.min(s[`d${i}`] ?? 0, n), nonNull: s[`c${i}`] ?? 0, min: s[`mn${i}`], max: s[`mx${i}`] };
    col.kind = classify(col, n);
    return col;
  });
  return { n, columns };
}

function classify(c, n) {
  if (c.nonNull === 0) return 'empty';
  if (TIME.test(c.type)) return 'time';
  if (NUMERIC.test(c.type)) {
    if (INTEGER.test(c.type) && YEAR_NAME.test(c.name) && c.min >= 1800 && c.max <= 2100) return 'year';
    if (ID_NAME.test(c.name)) return 'id';
    if (INTEGER.test(c.type) && c.distinct >= n * 0.98 && n > 50 && c.min >= 0 && /no|num|number|#/i.test(c.name)) return 'id';
    return c.distinct <= 1 ? 'constant' : 'measure';
  }
  if (c.type === 'BOOLEAN') return 'dim';
  if (ID_NAME.test(c.name)) return 'id';
  if (c.distinct <= 1) return 'constant';
  if (n > 20 && c.distinct > Math.max(200, n * 0.6)) return 'text';
  return 'dim';
}
