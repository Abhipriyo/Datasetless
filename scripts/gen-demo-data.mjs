// Generates the demo tenants' data for public/demo (run: node scripts/gen-demo-data.mjs)
import { writeFileSync } from 'node:fs';
function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const tenants = {
  bluebird: { seed: 11, scale: 1.4, regions: ['North America', 'Europe', 'Asia Pacific', 'Latin America'], lines: ['Apparel', 'Footwear', 'Accessories'] },
  kite: { seed: 22, scale: 0.8, regions: ['North America', 'Europe', 'Middle East'], lines: ['Snacks', 'Beverages', 'Frozen'], refundSpike: '2026-03' },
  orbit: { seed: 33, scale: 2.2, regions: ['North America', 'Europe', 'Asia Pacific'], lines: ['Hardware', 'Software', 'Services'] },
};
const channels = ['Online', 'Retail', 'Partners'];
for (const [id, t] of Object.entries(tenants)) {
  const r = rng(t.seed);
  const rows = ['date,region,product_line,channel,orders,revenue,refunds,new_customers'];
  for (let d = new Date('2025-10-01T00:00:00Z'); d <= new Date('2026-09-30T00:00:00Z'); d.setUTCDate(d.getUTCDate() + 1)) {
    const iso = d.toISOString().slice(0, 10);
    const tt = (d - new Date('2025-10-01')) / 864e5 / 365;
    const season = 1 + 0.25 * Math.sin((d.getUTCMonth() / 12) * Math.PI * 2 + id.length);
    for (const region of t.regions) for (const line of t.lines) {
      if (r() < 0.35) continue; // not every combination sells every day
      const channel = channels[Math.floor(r() * 3)];
      const orders = Math.max(1, Math.round((3 + r() * 9) * t.scale * season * (1 + 0.4 * tt) * (region === t.regions[0] ? 1.6 : 1)));
      const aov = (line === t.lines[0] ? 70 : line === t.lines[1] ? 45 : 110) * (0.8 + r() * 0.4) * (id === 'orbit' ? 3 : 1);
      const revenue = Math.round(orders * aov * 100) / 100;
      let rr = 0.02 + r() * 0.05;
      if (t.refundSpike && iso.startsWith(t.refundSpike)) rr = 0.16 + r() * 0.1; // a real problem the tests catch
      const refunds = Math.round(revenue * rr * 100) / 100;
      const newc = Math.round(orders * (0.15 + r() * 0.2));
      rows.push([iso, region, line, channel, orders, revenue, refunds, newc].join(','));
    }
  }
  writeFileSync(`public/demo/data/${id}.csv`, rows.join('\n') + '\n');
  console.log(id, rows.length - 1, 'rows');
}
