// Offline-verifiable license keys. Keys are signed with the vendor's private key
// (scripts/license.mjs) and verified here with the public key, so no licensing
// server is needed. Format: DSL1.<base64url JSON payload>.<base64url signature>
import { LICENSE_PUBLIC_KEY } from '../license-key.js';

export const PLANS = {
  free: { id: 'free', name: 'Free', whiteLabel: false, ai: false, customTheme: false, metrics: 5 },
  pro: { id: 'pro', name: 'Pro', whiteLabel: true, ai: true, customTheme: true, metrics: Infinity },
  business: { id: 'business', name: 'Business', whiteLabel: true, ai: true, customTheme: true, metrics: Infinity, selfHost: true },
};

const STORE = 'datasetless.license.v1';

const b64urlToBytes = (s) => {
  const b = atob(String(s).replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '='));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
};

// Browsers disable WebCrypto on non-HTTPS pages (and in iframes inside them),
// so a small audited library verifies signatures there instead.
async function verifySignature(sig, data, { fallback = false } = {}) {
  if (!fallback && globalThis.crypto?.subtle) {
    return crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, await publicKey(), sig, data);
  }
  const [{ p256 }, { sha256 }] = await Promise.all([import('@noble/curves/p256'), import('@noble/hashes/sha256')]);
  const point = b64urlToBytes(LICENSE_PUBLIC_KEY).slice(-65); // SPKI ends with the uncompressed point
  return p256.verify(sig, sha256(data), point);
}

let keyPromise = null;
function publicKey() {
  if (!keyPromise) {
    keyPromise = crypto.subtle.importKey('spki', b64urlToBytes(LICENSE_PUBLIC_KEY), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
  }
  return keyPromise;
}

export function hostAllowed(domains, hostname) {
  if (!Array.isArray(domains) || !domains.length) return true;
  const host = String(hostname || '').toLowerCase();
  if (!host || host === 'localhost' || host === '127.0.0.1' || host.endsWith('.localhost')) return true;
  return domains.some((d) => {
    d = String(d).toLowerCase().trim();
    if (d.startsWith('*.')) return host.endsWith(d.slice(1)) || host === d.slice(2);
    return host === d;
  });
}

/** Returns { valid, plan, org, exp, reason }. Never throws. */
export async function verifyLicense(key, { hostname = globalThis.location?.hostname, now = new Date(), fallback = false } = {}) {
  const free = (reason) => ({ valid: false, plan: PLANS.free, reason });
  try {
    if (!key) return free('No license key');
    const parts = String(key).trim().split('.');
    if (parts.length !== 3 || parts[0] !== 'DSL1') return free('This is not a Datasetless license key.');
    const data = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
    const ok = await verifySignature(b64urlToBytes(parts[2]), data, { fallback });
    if (!ok) return free('This license key is not valid.');
    const p = JSON.parse(new TextDecoder().decode(b64urlToBytes(parts[1])));
    const plan = PLANS[p.plan];
    if (!plan || plan.id === 'free') return free('Unknown plan in license.');
    if (p.exp && new Date(p.exp + 'T23:59:59Z') < now) return { ...free(`This license expired on ${p.exp}.`), expired: true, org: p.org };
    if (!hostAllowed(p.domains, hostname)) return { ...free(`This license is for ${p.domains.join(', ')}, not ${hostname}.`), org: p.org };
    return { valid: true, plan, org: p.org || '', exp: p.exp || null, domains: p.domains || [] };
  } catch {
    return free('This license key could not be read.');
  }
}

export function savedLicense() {
  try { return localStorage.getItem(STORE) || ''; } catch { return ''; }
}
export function saveLicense(key) {
  try { key ? localStorage.setItem(STORE, key.trim()) : localStorage.removeItem(STORE); } catch { /* storage blocked */ }
}
