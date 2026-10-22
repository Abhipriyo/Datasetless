// Bring-your-own-key AI. The key lives only in this browser (localStorage) and
// requests go straight from the browser to the provider — no server in between.
import { INDICATORS, COUNTRIES } from './sources/worldbank.js';

const KEY = 'datasetless.ai.v1';

export const PROVIDERS = {
  anthropic: { name: 'Anthropic (Claude)', model: 'claude-sonnet-5-5', keyHint: 'sk-ant-…' },
  openai: { name: 'OpenAI', model: 'gpt-5-mini', keyHint: 'sk-…' },
  compatible: { name: 'OpenAI-compatible (Groq, OpenRouter, local…)', model: '', keyHint: 'API key', needsBase: true },
};

// When embedded, the host application supplies a transport that forwards prompts
// to its own AI endpoint, so no key ever reaches the browser.
let transport = null;
export function setTransport(fn) { transport = typeof fn === 'function' ? fn : null; }

export function getAI() {
  if (transport) return { provider: 'host', key: 'host' };
  try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); return s && s.key ? s : null; } catch { return null; }
}
export function saveAI(s) {
  try { s ? localStorage.setItem(KEY, JSON.stringify(s)) : localStorage.removeItem(KEY); } catch { /* storage blocked */ }
}

async function call({ system, user, image, maxTokens = 1800 }) {
  if (transport) {
    const text = await transport({ system, user, image: image ? { type: image.type } : null, maxTokens });
    if (typeof text !== 'string') throw new Error('The AI endpoint returned no text.');
    return text;
  }
  const s = getAI();
  if (!s) throw new Error('Add an AI key in Settings to use this.');
  const model = s.model || PROVIDERS[s.provider]?.model;
  let res;
  try {
    if (s.provider === 'anthropic') {
      const content = [];
      if (image) content.push({ type: 'image', source: { type: 'base64', media_type: image.type, data: image.base64 } });
      content.push({ type: 'text', text: user });
      res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': s.key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({ model, max_tokens: maxTokens, system, messages: [{ role: 'user', content }] }),
      });
    } else {
      const base = (s.provider === 'compatible' ? s.baseUrl : 'https://api.openai.com/v1').replace(/\/+$/, '');
      const content = image ? [{ type: 'text', text: user }, { type: 'image_url', image_url: { url: `data:${image.type};base64,${image.base64}` } }] : user;
      res = await fetch(`${base}/chat/completions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${s.key}` },
        body: JSON.stringify({ model, messages: [{ role: 'system', content: system }, { role: 'user', content }] }),
      });
    }
  } catch {
    throw new Error('Could not reach the AI provider. Check your connection (and the base URL for custom providers).');
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json?.error?.message || json?.message || res.statusText;
    if (res.status === 401) throw new Error('The AI key was rejected. Check it in Settings.');
    throw new Error(`AI error (${res.status}): ${msg}`);
  }
  return s.provider === 'anthropic' ? (json.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('') : json.choices?.[0]?.message?.content || '';
}

export function extractJSON(text) {
  const t = String(text).replace(/```(?:json)?/gi, '');
  const a = t.indexOf('{'), b = t.lastIndexOf('}');
  if (a < 0 || b < a) throw new Error('The AI reply was not valid JSON.');
  return JSON.parse(t.slice(a, b + 1));
}

export async function testAI() {
  const text = await call({ system: 'Reply with the single word OK.', user: 'ping', maxTokens: 10 });
  return text.trim().length > 0;
}

function schemaText(spec, profile, sample) {
  const cols = profile.columns.filter((c) => c.kind !== 'empty').map((c) => {
    const extra = c.kind === 'measure' ? ` range ${c.min}..${c.max}` : c.kind === 'time' ? ` from ${c.min} to ${c.max}` : c.kind === 'dim' ? ` ${c.distinct} distinct values` : '';
    return `- "${c.name}" ${c.type} (${c.kind}${extra})`;
  }).join('\n');
  const defs = spec.contract?.metrics?.length
    ? `\n\nAPPROVED METRIC DEFINITIONS. These are the company's official numbers. Whenever the question involves one of them, you MUST use exactly this SQL expression and name the result column with the metric label:\n${spec.contract.metrics.map((m) => `- ${m.label}: ${m.sql}${m.description ? ` (${m.description})` : ''}`).join('\n')}`
    : '';
  return `Table "data" (${spec.n} rows) columns:\n${cols}${defs}\n\nSample rows (JSON):\n${JSON.stringify(sample.slice(0, 5))}`;
}

const SQL_SYSTEM = `You are a senior data analyst writing DuckDB SQL for a dashboard app.
Rules:
- Write ONE read-only SELECT (CTEs allowed) against the table named data. Never use other tables, files, URLs, or settings.
- Always double-quote column names exactly as given, e.g. "Order date".
- Time buckets: strftime(CAST("col" AS DATE), '%Y-%m') for months; year("col") for years; '%Y-%m-%d' for days. Return time buckets as text so they sort.
- "Last quarter" / "last month" mean relative to the latest date in the data, not today: use (SELECT max("date col") FROM data).
- Name result columns clearly (they become axis labels). Round ratios with round(x, 2). Limit to 500 rows.
- Pick the chart: "line" for change over time (x = time bucket), "bar" for comparing categories (x = category), "scatter" for two numeric measures (x and y numeric, label column optional), "number" for a single value, "table" for lists.
- For line or bar with several groups, return long format and set "series" to the group column.
Reply with JSON only:
{"title": "short answer-style title", "sql": "...", "chart": {"type": "bar|line|scatter|number|table", "x": "result column", "y": ["numeric result column"], "series": "result column or null", "label": "result column or null"}, "format": "currency|percent|number"}`;

export async function askSQL({ question, spec, profile, sample, error, previous }) {
  let user = `${schemaText(spec, profile, sample)}\n\nQuestion: ${question}`;
  if (error) user += `\n\nYour previous SQL failed:\n${previous}\nError: ${error}\nFix it.`;
  return extractJSON(await call({ system: SQL_SYSTEM, user }));
}

export async function explainResult({ question, title, rows }) {
  const text = await call({
    system: 'You explain query results to busy business owners. Write exactly two short sentences: the direct answer with the key number, then one useful implication or caveat. Plain text, no markdown. Only state what the data shows.',
    user: `Question: ${question}\nChart: ${title}\nResult rows (JSON, up to 60):\n${JSON.stringify(rows.slice(0, 60))}`,
    maxTokens: 300,
  });
  return text.trim().replace(/^["']|["']$/g, '');
}

export async function planWorldBank(question) {
  const catalog = INDICATORS.map((i) => `${i.code}: ${i.label}`).join('\n');
  const countries = COUNTRIES.map(([c, n]) => `${c} ${n}`).join(', ');
  const system = `You map a question about countries to World Bank indicators. Use ONLY these indicator codes:\n${catalog}\n\nCountries: any ISO3 code (common ones: ${countries}; aggregates WLD world, EUU European Union, SAS South Asia).
Pick 2-6 indicators that answer the question plus useful context, 2-8 countries (first = main subject), and a year range (data exists up to about last year).
If the question is about a private business or personal data (sales, my company, customers) rather than countries, reply {"needsData": true}.
Reply JSON only: {"title": "dashboard title", "indicators": ["CODE"], "countries": ["ISO3"], "from": 2000, "to": ${new Date().getFullYear()}, "focus": "ISO3"}`;
  return extractJSON(await call({ system, user: question, maxTokens: 500 }));
}

export async function tableFromImage(file) {
  const base64 = await new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(',')[1]);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
  const text = await call({
    system: 'Extract the main data table from the image. Output ONLY CSV with a header row: comma-separated, quote fields containing commas, numbers without thousands separators or currency symbols, no commentary.',
    user: 'Extract this table as CSV.',
    image: { type: file.type || 'image/png', base64 },
    maxTokens: 4000,
  });
  const csv = text.replace(/```(?:csv)?/gi, '').trim();
  if (!csv.includes('\n')) throw new Error('No table could be read from that image.');
  return csv;
}
