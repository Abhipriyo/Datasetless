// Netlify function: POST /api/ask  (optional — see README "Optional AI")
import { handleAsk } from '../../api/_ask-core.mjs';

export default async (req, context) => {
  if (req.method !== 'POST') return Response.json({ error: 'POST only' }, { status: 405 });
  const body = await req.json().catch(() => ({}));
  const [status, out] = await handleAsk({ body, ip: context.ip || 'unknown', origin: req.headers.get('origin') });
  return Response.json(out, { status });
};

export const config = { path: '/api/ask' };
