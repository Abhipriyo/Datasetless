// Realistic SAMPLE datasets for "try it with your kind of business".
// Generated deterministically in the browser and always labelled as sample data.

function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (r, arr, w) => {
  if (!w) return arr[Math.floor(r() * arr.length)];
  let x = r() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < arr.length; i++) { x -= w[i]; if (x <= 0) return arr[i]; }
  return arr[arr.length - 1];
};
const iso = (d) => d.toISOString().slice(0, 10);
const days = (from, to) => { const out = []; for (let d = new Date(from + 'T00:00:00Z'); iso(d) <= to; d.setUTCDate(d.getUTCDate() + 1)) out.push(new Date(d)); return out; };
const round = (v, p = 0) => Math.round(v * 10 ** p) / 10 ** p;

function store() {
  const r = rng(42);
  const regions = ['North', 'South', 'East', 'West', 'Central'];
  const cats = { Electronics: [1200, 9000], Apparel: [400, 2500], Home: [300, 4000], Beauty: [200, 1500], Sports: [500, 5000] };
  const channels = ['Website', 'App', 'Marketplace'];
  const rows = [];
  let id = 100000;
  for (const d of days('2024-10-01', '2026-09-30')) {
    const m = d.getUTCMonth(), t = (d - new Date('2024-10-01')) / 864e5 / 730;
    const festive = m === 9 || m === 10 ? 1.6 : m === 11 ? 1.2 : m === 2 ? 0.85 : 1;
    const weekend = [0, 6].includes(d.getUTCDay()) ? 1.25 : 1;
    const n = Math.round((10 + r() * 6) * festive * weekend * (1 + 0.35 * t));
    for (let i = 0; i < n; i++) {
      let region = pick(r, regions, [24, 26, 16, 22, 12]);
      // The story: South loses ground in the latest quarter (Jul–Sep 2026).
      if (region === 'South' && iso(d) >= '2026-07-01' && r() < 0.45) region = pick(r, ['North', 'West', 'East']);
      const category = pick(r, Object.keys(cats), [18, 30, 20, 17, 15]);
      const appShare = 0.25 + 0.25 * t;
      const channel = pick(r, channels, [0.5 - appShare / 2, appShare, 0.5 - appShare / 2 + 0.2]);
      const [lo, hi] = cats[category];
      const price = round(lo + (hi - lo) * r() ** 1.6, -1);
      const units = r() < 0.8 ? 1 : r() < 0.7 ? 2 : 3;
      const disc = pick(r, [0, 5, 10, 15, 20, 30], [40, 15, 20, 10, 10, festive > 1 ? 8 : 2]);
      rows.push({
        'Order ID': `ORD-${id++}`, 'Order date': iso(d), Region: region, Category: category, Channel: channel,
        Units: units, 'Unit price': price, 'Discount (%)': disc, Revenue: round(price * units * (1 - disc / 100)),
        Returned: r() < (category === 'Apparel' ? 0.11 : 0.04) ? 'Yes' : 'No',
      });
    }
  }
  return rows;
}

function restaurant() {
  const r = rng(7);
  const outlets = ['MG Road', 'Lakeview', 'Old Town', 'Airport'];
  const parts = { Breakfast: [180, 450], Lunch: [350, 900], Dinner: [600, 1800], 'Late night': [400, 1100] };
  const rows = [];
  for (const d of days('2025-10-01', '2026-09-30')) {
    const weekend = [0, 5, 6].includes(d.getUTCDay());
    for (const outlet of outlets) {
      const scale = { 'MG Road': 1.3, Lakeview: 1, 'Old Town': 0.8, Airport: 0.9 }[outlet];
      for (const [part, [lo, hi]] of Object.entries(parts)) {
        if (part === 'Breakfast' && outlet === 'Old Town') continue;
        const n = Math.round((part === 'Dinner' ? 5 : part === 'Lunch' ? 4 : 2) * scale * (weekend ? 1.4 : 1) * (0.7 + r() * 0.6));
        for (let i = 0; i < n; i++) {
          const type = pick(r, ['Dine-in', 'Takeaway', 'Delivery'], outlet === 'Airport' ? [50, 50, 0.01] : [55, 15, 30]);
          const covers = type === 'Dine-in' ? 1 + Math.floor(r() * 5) : 1 + Math.floor(r() * 2);
          const bill = round((lo + (hi - lo) * r()) * (type === 'Dine-in' ? covers * 0.7 : 1.2));
          const late = type === 'Delivery' && r() < 0.18;
          rows.push({ Date: iso(d), Outlet: outlet, Daypart: part, 'Order type': type, Covers: covers, 'Bill amount': bill, 'Rating (1-5)': late ? pick(r, [2, 3, 3, 4]) : pick(r, [3, 4, 4, 5, 5]) });
        }
      }
    }
  }
  return rows;
}

function saas() {
  const r = rng(99);
  const plans = { Starter: 29, Pro: 99, Enterprise: 499 };
  const countries = ['United States', 'United Kingdom', 'India', 'Germany', 'Brazil'];
  const rows = [];
  const base = {};
  for (let i = 0; i < 24; i++) {
    const dt = new Date(Date.UTC(2024, 9 + i, 1));
    for (const [plan, price] of Object.entries(plans)) {
      for (const c of countries) {
        const k = plan + c;
        const w = { 'United States': 1, 'United Kingdom': 0.45, India: 0.6, Germany: 0.4, Brazil: 0.3 }[c] * { Starter: 40, Pro: 18, Enterprise: 3 }[plan];
        base[k] ??= Math.round(w * 6);
        const growth = c === 'India' ? 1.09 : 1.04;
        const newC = Math.max(0, Math.round(w * (0.6 + r() * 0.5) * growth ** i * 0.3));
        const churn = Math.round(base[k] * (plan === 'Starter' ? 0.045 : plan === 'Pro' ? 0.025 : 0.01) * (0.6 + r() * 0.8));
        base[k] = Math.max(0, base[k] + newC - churn);
        rows.push({ Month: iso(dt), Plan: plan, Country: c, 'New customers': newC, 'Churned customers': churn, 'Active customers': base[k], MRR: base[k] * price });
      }
    }
  }
  return rows;
}

function agency() {
  const r = rng(2026);
  const clients = { 'Kestrel Shoes': 1.2, 'Bloom Skincare': 1, 'Orbit Fitness': 0.7, 'Saffron Foods': 0.9 };
  const platforms = { 'Google Ads': [0.035, 0.05, 1], 'Meta Ads': [0.012, 0.028, 1.15], 'LinkedIn Ads': [0.006, 0.07, 0.35] };
  const rows = [];
  for (const d of days('2025-10-01', '2026-09-30')) {
    for (const [client, cs] of Object.entries(clients)) {
      for (const [platform, [ctr, cvr, pw]] of Object.entries(platforms)) {
        if (platform === 'LinkedIn Ads' && client === 'Saffron Foods') continue;
        const spend = round(cs * pw * (250 + r() * 220), 2);
        const cpm = platform === 'LinkedIn Ads' ? 32 : platform === 'Meta Ads' ? 7 : 11;
        const impressions = Math.round((spend / cpm) * 1000 * (0.85 + r() * 0.3));
        const clicks = Math.round(impressions * ctr * (0.8 + r() * 0.4));
        // Meta performance for Bloom degrades in the last two months (creative fatigue).
        const fatigue = client === 'Bloom Skincare' && platform === 'Meta Ads' && iso(d) >= '2026-08-01' ? 0.55 : 1;
        const conversions = Math.round(clicks * cvr * fatigue * (0.7 + r() * 0.6));
        const aov = { 'Kestrel Shoes': 85, 'Bloom Skincare': 42, 'Orbit Fitness': 120, 'Saffron Foods': 28 }[client];
        rows.push({ Date: iso(d), Client: client, Platform: platform, Spend: spend, Impressions: impressions, Clicks: clicks, Conversions: conversions, Revenue: round(conversions * aov * (0.8 + r() * 0.4), 2) });
      }
    }
  }
  return rows;
}

export const SAMPLES = [
  {
    id: 'store', name: 'Online store', icon: 'cart', blurb: 'Orders by region, category and channel over two years.',
    business: 'I run an online store', currency: '₹', generate: store, countLabel: 'Orders',
    measureOrder: ['Revenue', 'Units', 'Discount (%)', 'Unit price'],
    derived: [{ label: 'Avg order value', expr: 'sum("Revenue") / nullif(count(*), 0)', format: 'currency' }, { label: 'Return rate (%)', expr: '100.0 * avg(CASE WHEN "Returned" = \'Yes\' THEN 1 ELSE 0 END)', format: 'percent' }],
    questions: ["Which region's sales fell last quarter?", 'Which category has the highest return rate?', 'How is the app channel trending?'],
    export: 'Shopify: Orders → Export → CSV. WooCommerce: Analytics → Orders → Download.',
  },
  {
    id: 'restaurant', name: 'Restaurant', icon: 'food', blurb: 'Bills across four outlets, dayparts and order types.',
    business: 'I run a restaurant or café', currency: '₹', generate: restaurant, countLabel: 'Bills',
    measureOrder: ['Bill amount', 'Covers', 'Rating (1-5)'],
    derived: [{ label: 'Avg bill', expr: 'avg("Bill amount")', format: 'currency' }],
    questions: ['Which outlet earns the most at dinner?', 'Do delivery orders get lower ratings?', 'What are the busiest days of the week?'],
    export: 'Most POS systems (Petpooja, Posist, Square, Toast) have Reports → Sales → Export to Excel.',
  },
  {
    id: 'saas', name: 'SaaS startup', icon: 'rocket', blurb: 'Monthly customers, churn and MRR by plan and country.',
    business: 'I run a SaaS or subscription business', currency: '$', generate: saas, countLabel: null,
    measureOrder: ['MRR', 'New customers', 'Churned customers', 'Active customers'],
    nonAdditive: ['Active customers', 'MRR'],
    derived: [{ label: 'Churn rate (%)', expr: '100.0 * sum("Churned customers") / nullif(sum("Active customers"), 0)', format: 'percent' }],
    questions: ['Which country is growing fastest?', 'Which plan churns the most?', 'What is MRR by plan this month?'],
    export: 'Stripe: Billing → Subscriptions → Export. Chargebee/Razorpay: Reports → Export CSV.',
  },
  {
    id: 'agency', name: 'Marketing agency', icon: 'megaphone', blurb: 'Ad spend, clicks and conversions per client and platform.',
    business: 'I run ads or a marketing agency', currency: '$', generate: agency, countLabel: null,
    measureOrder: ['Revenue', 'Spend', 'Conversions', 'Clicks', 'Impressions'],
    derived: [
      { label: 'ROAS', expr: 'sum("Revenue") / nullif(sum("Spend"), 0)', format: 'ratio' },
      { label: 'CTR (%)', expr: '100.0 * sum("Clicks") / nullif(sum("Impressions"), 0)', format: 'percent' },
      { label: 'Cost per conversion', expr: 'sum("Spend") / nullif(sum("Conversions"), 0)', format: 'currency' },
    ],
    questions: ['Which platform has the best ROAS?', 'Is any client’s performance dropping?', 'Which platform has the lowest cost per conversion?'],
    export: 'Google Ads: Reports → Download → CSV. Meta Ads Manager: Reports → Export table data.',
  },
];

export const SAMPLE_BY_ID = Object.fromEntries(SAMPLES.map((s) => [s.id, s]));
