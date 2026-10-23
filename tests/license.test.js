import { describe, it, expect, vi } from 'vitest';
import { sign } from 'node:crypto';

// Use a throwaway key pair so tests never depend on the real signing key.
const keys = vi.hoisted(() => {
  const { generateKeyPairSync } = require('node:crypto');
  const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const spki = publicKey.export({ type: 'spki', format: 'der' }).toString('base64url');
  return { spki, privateKey };
});
vi.mock('../src/license-key.js', () => ({ LICENSE_PUBLIC_KEY: keys.spki }));

const { verifyLicense, hostAllowed } = await import('../src/lib/license.js');

function issue(payload) {
  const head = `DSL1.${Buffer.from(JSON.stringify(payload)).toString('base64url')}`;
  const sig = sign('sha256', Buffer.from(head), { key: keys.privateKey, dsaEncoding: 'ieee-p1363' });
  return `${head}.${sig.toString('base64url')}`;
}

describe('license keys', () => {
  it('accepts a valid Pro key on an allowed domain', async () => {
    const key = issue({ v: 1, plan: 'pro', org: 'Acme', domains: ['acme.com', '*.acme.com'], exp: '2099-01-01' });
    const r = await verifyLicense(key, { hostname: 'app.acme.com' });
    expect(r.valid).toBe(true);
    expect(r.plan.id).toBe('pro');
    expect(r.plan.whiteLabel).toBe(true);
  });
  it('rejects other domains, expired keys and tampering', async () => {
    const key = issue({ v: 1, plan: 'pro', domains: ['acme.com'], exp: '2099-01-01' });
    expect((await verifyLicense(key, { hostname: 'evil.com' })).valid).toBe(false);
    const old = issue({ v: 1, plan: 'pro', exp: '2020-01-01' });
    expect((await verifyLicense(old, { hostname: 'x.com' })).valid).toBe(false);
    const [a, , c] = key.split('.');
    const forged = `${a}.${Buffer.from(JSON.stringify({ plan: 'business' })).toString('base64url')}.${c}`;
    expect((await verifyLicense(forged, { hostname: 'acme.com' })).valid).toBe(false);
    expect((await verifyLicense('nonsense')).plan.id).toBe('free');
  });
  it('verifies the same way without WebCrypto (non-HTTPS pages)', async () => {
    const key = issue({ v: 1, plan: 'business', exp: '2099-01-01' });
    expect((await verifyLicense(key, { hostname: 'intranet.local', fallback: true })).plan.id).toBe('business');
    const [a, b] = key.split('.');
    const bad = `${a}.${b}.${Buffer.alloc(64, 1).toString('base64url')}`;
    expect((await verifyLicense(bad, { hostname: 'x', fallback: true })).valid).toBe(false);
  });
  it('always allows localhost for development', () => {
    expect(hostAllowed(['acme.com'], 'localhost')).toBe(true);
    expect(hostAllowed(['*.acme.com'], 'acme.com')).toBe(true);
    expect(hostAllowed(['acme.com'], 'notacme.com')).toBe(false);
  });
});
