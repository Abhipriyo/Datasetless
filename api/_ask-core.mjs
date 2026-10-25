// Shared logic for the optional AI endpoint (/api/ask). Your API key stays on the
// server as an environment variable; visitors never see it. Only the app's own
// prompt types are accepted, with a per-visitor hourly limit and a token cap.
const ALLOWED_SYSTEM_PREFIXES = [
  'You are a senior data analyst writing DuckDB SQL',
  'You explain query results to busy business owners',
  'You map a question about countries to World Bank indicators',
  'Extract the main data table from the image',
];
const hits = new Map();

export async function handleAsk({ body, ip, origin }) {
  const allowed = (process.env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (allowed.length && !allowed.includes(origin || '')) return [403, { error: 'Not allowed from this site.' }];

  const now = Date.now();
  const limit = Number(process.env.AI_HOURLY_LIMIT || 30);
  const recent = (hits.get(ip) || []).filter((t) => now - t < 3600e3);
  if (recent.length >= limit) return [429, { error: 'You’ve asked a lot of questions. Please try again in a little while.' }];
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();

  const { system = '', user = '', maxTokens = 1200 } = body || {};
  if (typeof system !== 'string' || typeof user !== 'string' || system.length > 12000 || user.length > 24000) return [400, { error: 'Bad request.' }];
  if (!ALLOWED_SYSTEM_PREFIXES.some((p) => system.startsWith(p))) return [400, { error: 'Unsupported request.' }];
  const max = Math.min(Math.max(Number(maxTokens) || 1200, 50), 2000);

  try {
    if (process.env.ANTHROPIC_API_KEY) {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: process.env.AI_MODEL || 'claude-haiku-5-5', max_tokens: max, system, messages: [{ role: 'user', content: user }] }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error?.message || r.statusText);
      return [200, { text: (j.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('') }];
    }
    if (process.env.OPENAI_API_KEY) {
      const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        body: JSON.stringify({ model: process.env.AI_MODEL || 'gpt-5-mini', max_completion_tokens: max, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error?.message || r.statusText);
      return [200, { text: j.choices?.[0]?.message?.content || '' }];
    }
    return [501, { error: 'AI is not set up on this site.' }];
  } catch (e) {
    console.error('AI provider error:', e.message);
    return [502, { error: 'The AI service had a problem. Please try again.' }];
  }
}
