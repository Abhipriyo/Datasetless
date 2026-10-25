// Vercel serverless function: POST /api/ask  (optional — see README "Optional AI")
import { handleAsk } from './_ask-core.mjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  const [status, body] = await handleAsk({ body: req.body, ip, origin: req.headers.origin });
  res.status(status).json(body);
}
