// Pricing and Developers pages — the two pages a business buyer reads.
import { h, icon, toast } from './components.js';
import { BRAND, PRICING } from '../config.js';
import { FREE_METRIC_LIMIT } from '../lib/metrics.js';

const contactOr = (url) => url || BRAND.contactUrl || '';

function codeBlock(text, lang = '') {
  const pre = h('pre', { class: `code lang-${lang}` }, text);
  const copy = h('button', { class: 'copy-btn', type: 'button', 'aria-label': 'Copy code' }, icon('table', 14), 'Copy');
  copy.onclick = () => navigator.clipboard?.writeText(text).then(() => { copy.lastChild.textContent = 'Copied'; setTimeout(() => (copy.lastChild.textContent = 'Copy'), 1500); }).catch(() => toast('Select the code and copy it.'));
  return h('div', { class: 'code-wrap' }, copy, pre);
}

function tabs(groups) {
  // groups: [{ name, items: [{ label, lang, code, note }] }]
  const panel = h('div', { class: 'tab-panel' });
  const bar = h('div', { class: 'pill-tabs', role: 'tablist' });
  const all = groups.flatMap((g) => g.items.map((it) => ({ ...it, group: g.name })));
  const show = (it, btn) => {
    [...bar.querySelectorAll('button')].forEach((b) => b.classList.toggle('on', b === btn));
    panel.replaceChildren(it.note ? h('p', { class: 'small muted tab-note' }, it.note) : '', codeBlock(it.code, it.lang));
  };
  groups.forEach((g) => {
    bar.append(h('span', { class: 'pill-group' }, g.name));
    g.items.forEach((it) => {
      const b = h('button', { type: 'button', class: 'pill', role: 'tab' }, it.label);
      b.onclick = () => show(it, b);
      bar.append(b);
    });
  });
  const first = bar.querySelector('button');
  show(all[0], first);
  return h('div', { class: 'tabs-block' }, bar, panel);
}

// ====================================================================
export function renderPricing(root, ctx) {
  const lic = ctx.license;
  const plan = (o) => h('div', { class: `plan ${o.featured ? 'plan-featured' : ''} ${o.tone}` },
    o.featured ? h('span', { class: 'sticker s-sun plan-flag' }, 'Most popular') : null,
    h('div', { class: 'plan-emoji', 'aria-hidden': 'true' }, o.emoji),
    h('h3', {}, o.name),
    h('p', { class: 'plan-for' }, o.for),
    h('div', { class: 'plan-price' }, h('b', {}, o.price), h('span', {}, o.period)),
    h('p', { class: 'plan-yearly' }, o.yearly || ' '),
    o.cta,
    h('ul', { class: 'plan-list' }, o.features.map((f) => h('li', {}, icon('check', 15), h('span', {}, f)))));

  const ctaLink = (url, label, primary) => url
    ? h('a', { class: `btn ${primary ? 'btn-primary' : ''} plan-cta`, href: url, target: '_blank', rel: 'noopener' }, label, icon('arrow', 16))
    : h('span', { class: 'btn plan-cta disabled', title: 'Set VITE_CHECKOUT_PRO_URL or VITE_CONTACT_URL' }, 'Available soon');

  const plans = h('div', { class: 'plans' },
    plan({
      name: 'Free', emoji: '🌱', tone: 't-mint', for: 'For individuals, side projects and trying it in your product.',
      price: '$0', period: 'forever', yearly: 'No card, no signup',
      cta: h('a', { class: 'btn plan-cta', href: '#/' }, 'Start building', icon('arrow', 16)),
      features: [
        'Full web app: upload, links, public data, sample dashboards',
        'Automatic dashboards, SQL on every chart, data checks',
        'Share links, PNG and PDF export',
        'Embed anywhere (with a small “Powered by Datasetless” badge)',
        `Metrics contract: up to ${FREE_METRIC_LIMIT} verified metrics`,
        'Plain-English questions in the web app with your own AI key',
      ],
    }),
    plan({
      name: 'Pro', emoji: '🚀', tone: 't-sun', featured: true, for: 'For SaaS teams putting analytics inside their product.',
      price: PRICING.pro.price, period: PRICING.pro.period, yearly: PRICING.pro.yearly,
      cta: ctaLink(contactOr(PRICING.pro.checkout), 'Get Pro', true),
      features: [
        'Everything in Free',
        'White-label: no badge, your accent colour',
        'Unlimited verified metrics with tests',
        'AI questions inside your product, via your own AI endpoint (any model)',
        'Events API for filters and clicks',
        'Up to 3 production domains · email support',
      ],
    }),
    plan({
      name: 'Business', emoji: '🏢', tone: 't-lilac', for: 'For companies with many apps, strict security reviews or custom needs.',
      price: PRICING.business.price, period: PRICING.business.period, yearly: PRICING.business.yearly,
      cta: ctaLink(contactOr(PRICING.business.checkout), 'Talk to us'),
      features: [
        'Everything in Pro',
        'Unlimited domains and apps',
        'Self-host the whole engine on your own CDN: zero third parties',
        'Onboarding call and priority support',
        'Custom connectors and features on request',
        'Security questionnaire help and invoicing',
      ],
    }));

  const keyInput = h('input', { class: 'input', type: 'text', placeholder: 'DSL1.…', 'aria-label': 'License key', spellcheck: 'false', autocomplete: 'off' });
  const status = h('p', { class: 'small lic-status' });
  const setStatus = (r) => {
    status.replaceChildren(r.valid
      ? h('span', { class: 'ok' }, icon('check', 14), ` ${r.plan.name} active${r.org ? ` for ${r.org}` : ''}${r.exp ? ` · renews or expires ${r.exp}` : ''}`)
      : h('span', { class: 'muted' }, 'You are on the Free plan in this browser.'));
  };
  setStatus(lic);
  const licBox = h('section', { class: 'lic-box' },
    h('div', {}, h('h3', {}, 'Have a license key?'), h('p', { class: 'small muted' }, 'Activate it here for the web app. For embeds, pass it in the license attribute (see For developers). Keys are checked in your browser, so nothing is sent anywhere.')),
    h('form', { class: 'lic-form', onsubmit: async (e) => { e.preventDefault(); const r = await ctx.onLicense(keyInput.value); if (r.valid) { keyInput.value = ''; setStatus(r); } } }, keyInput, h('button', { class: 'btn btn-primary', type: 'submit' }, 'Activate')),
    status);

  const row = (label, a, b) => h('tr', {}, h('th', {}, label), h('td', {}, a), h('td', { class: 'us' }, b));
  const compare = h('section', { class: 'section' },
    h('div', { class: 'section-head' }, h('div', { class: 'kicker mono' }, 'Why it’s different'), h('h2', {}, 'Not another BI tool'),
      h('p', {}, 'Most embedded analytics run on the vendor’s servers. Datasetless runs inside your users’ browsers, which changes everything below.')),
    h('div', { class: 'table-scroll compare' }, h('table', { class: 'data-table' },
      h('thead', {}, h('tr', {}, h('th', {}, ''), h('th', {}, 'Typical embedded BI'), h('th', { class: 'us' }, 'Datasetless'))),
      h('tbody', {},
        row('Where your data goes', 'Through the vendor’s cloud', 'Your API → your user’s browser. Never to us.'),
        row('Security review', 'New sub-processor to assess', 'No new data processor in the path'),
        row('Pricing', 'Often per viewer or per query', 'Flat per app, unlimited viewers'),
        row('Metric definitions', 'Set up in the vendor’s UI', 'metrics.json in your own repo, with tests'),
        row('AI', 'The vendor’s model, the vendor’s servers', 'Any model, through your own endpoint'),
        row('Integration', 'SDK per framework', 'One tag for any stack, iframe for no-code, WebView for mobile'),
        row('Speed of filters', 'Network round trip per click', 'Instant: queries run locally')))));

  const faq = h('section', { class: 'section faq' },
    h('div', { class: 'section-head' }, h('div', { class: 'kicker mono' }, 'FAQ'), h('h2', {}, 'Questions buyers ask')),
    ...[
      ['Do you ever see our data?', 'No. Your backend sends data straight to your logged-in user’s browser, and the SQL engine runs there. Datasetless has no server in that path. Business customers can even host the engine files themselves.'],
      ['How is the license checked without a server?', 'License keys are digitally signed. The embed verifies the signature and your domain in the browser, so it works offline and never phones home.'],
      ['How much data can it handle?', 'Comfortably up to a few million rows per customer view in a modern browser. For bigger accounts, send pre-summarised data or Parquet files from your storage; the docs show how.'],
      ['Which AI models work?', 'Any. On Pro, the embed sends prompts to an endpoint on your server, which calls the model you choose (Claude, GPT, Gemini, open-source). Your key stays on your server.'],
      ['What if a better AI comes out?', 'You plug it into the same endpoint. The part you own — tested metric definitions, tenant isolation and the in-browser engine — stays, and the new model gets more accurate by answering through it.'],
      ['Can we cancel?', 'Yes, any time. Keys run until their expiry date, and the Free plan keeps working forever.'],
    ].map(([q, a]) => h('details', { class: 'faq-item' }, h('summary', {}, q, icon('chevron', 14)), h('p', {}, a))));

  root.replaceChildren(h('div', { class: 'page pricing' },
    h('section', { class: 'page-hero' },
      h('div', { class: 'eyebrow' }, h('span', { class: 'sticker s-mint' }, 'No per-viewer fees'), 'Because there are no servers to run'),
      h('h1', {}, 'Simple pricing for ', h('span', { class: 'w-pink' }, 'every'), ' dashboard.'),
      h('p', { class: 'page-sub' }, 'Start free. Upgrade when you put Datasetless inside your product and want it fully yours.')),
    plans, licBox, compare, faq,
    h('section', { class: 'cta' },
      h('div', {}, h('h2', {}, 'See it inside a real app 👀'), h('p', {}, 'Open the Acme demo: a pretend SaaS product where three different customers each see only their own data.')),
      h('a', { class: 'btn btn-primary btn-lg', href: 'demo/acme.html', target: '_blank' }, 'Open the live demo', icon('arrow', 18)))));
  return {};
}

// ====================================================================
export function renderDevelopers(root, ctx) {
  const B = ctx.origin; // e.g. https://datasetless.app/
  const ORIGIN = new URL(B).origin;

  const flow = h('div', { class: 'flow', 'aria-label': 'Data path' },
    flowBox('🗄️', 'Your database', 'Postgres, MySQL, Snowflake, BigQuery…', 't-sky'),
    flowArrow(),
    flowBox('🔐', 'Your API', 'Your login decides which customer’s rows to send', 't-sun'),
    flowArrow(),
    flowBox('💻', 'Your user’s browser', 'Datasetless engine runs SQL, charts and checks here', 't-mint'),
    h('div', { class: 'flow-none' }, h('span', { class: 'flow-x', 'aria-hidden': 'true' }, '✕'), h('b', {}, 'Datasetless servers'), h('span', {}, 'Not in the path. There are none.')));

  const front = [
    { name: 'Websites & apps', items: [
      { label: 'Any HTML', lang: 'html', code: `<script src="${B}embed.js" async></script>\n\n<datasetless-dashboard\n  source="/api/reports/data"\n  metrics="/metrics.json"\n  license="YOUR_LICENSE_KEY">\n</datasetless-dashboard>`, note: 'Works in any server-rendered page too: PHP, Rails, Django, .NET, Java, Go templates.' },
      { label: 'React', lang: 'jsx', code: `// index.html: <script src="${B}embed.js" async></script>\nimport { useEffect, useRef } from 'react';\n\nexport function Reports() {\n  const ref = useRef(null);\n  useEffect(() => {\n    const onFilter = (e) => console.log('filters changed', e.detail);\n    ref.current.addEventListener('filter', onFilter);\n    return () => ref.current?.removeEventListener('filter', onFilter);\n  }, []);\n  return <datasetless-dashboard ref={ref} source="/api/reports/data" metrics="/metrics.json" />;\n}` },
      { label: 'Next.js', lang: 'jsx', code: `'use client';\nimport Script from 'next/script';\n\nexport default function Reports() {\n  return (\n    <>\n      <Script src="${B}embed.js" strategy="afterInteractive" />\n      <datasetless-dashboard source="/api/reports/data" metrics="/metrics.json" />\n    </>\n  );\n}` },
      { label: 'Vue', lang: 'html', code: `<!-- index.html: <script src="${B}embed.js" async></script> -->\n<!-- vite.config.js: vue({ template: { compilerOptions: { isCustomElement: (t) => t.startsWith('datasetless-') } } }) -->\n<template>\n  <datasetless-dashboard source="/api/reports/data" metrics="/metrics.json" @filter="onFilter" />\n</template>` },
      { label: 'Angular', lang: 'ts', code: `// index.html: <script src="${B}embed.js" async></script>\nimport { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';\n\n@Component({\n  selector: 'app-reports',\n  standalone: true,\n  schemas: [CUSTOM_ELEMENTS_SCHEMA],\n  template: \`<datasetless-dashboard source="/api/reports/data" metrics="/metrics.json"></datasetless-dashboard>\`,\n})\nexport class ReportsComponent {}` },
      { label: 'Data in JS', lang: 'js', code: `// Already have the rows in your frontend? Hand them over directly.\nconst el = Datasetless.mount('#reports', { title: 'Sales', metrics: myMetrics });\nel.load(rows);              // array of objects\n// el.load(arrayBuffer, { format: 'parquet' })  // or CSV / Parquet / Excel bytes`, note: 'Nothing is uploaded: the data goes from your page into the dashboard frame inside the same browser.' },
    ] },
    { name: 'No-code & internal tools', items: [
      { label: 'WordPress · Webflow · Notion · SharePoint', lang: 'html', code: `<iframe\n  src="${B}embed.html?src=https%3A%2F%2Fexample.com%2Freport.csv&title=Sales&theme=light"\n  width="100%" height="900" style="border:0;border-radius:16px" loading="lazy"\n  title="Sales dashboard"></iframe>`, note: 'Use any public or signed link to a CSV, JSON, Excel or Parquet file (the host must allow cross-origin reads). Add &metrics=<url> for a metrics contract.' },
      { label: 'Salesforce · Retool · Bubble', lang: 'html', code: `<!-- Any tool with an "HTML / iframe" or "custom code" block -->\n<script src="${B}embed.js" async></script>\n<datasetless-dashboard source="https://api.yourcompany.com/reports/data"></datasetless-dashboard>`, note: 'If your platform only allows iframes, use the iframe snippet and a signed file URL.' },
      { label: 'postMessage only', lang: 'js', code: `// For strict CSPs where you can't load our script: talk to the iframe directly.\nconst frame = document.querySelector('#ds'); // <iframe id="ds" src="${B}embed.html">\nwindow.addEventListener('message', (e) => {\n  if (e.source !== frame.contentWindow || e.data?.ds !== 1) return;\n  if (e.data.type === 'hello') {\n    frame.contentWindow.postMessage(\n      { ds: 1, type: 'init', config: { title: 'Sales', metrics: myMetrics }, data: rows },\n      '${ORIGIN}');\n  }\n  if (e.data.type === 'height') frame.style.height = e.data.value + 'px';\n});` },
    ] },
    { name: 'Mobile & desktop', items: [
      { label: 'iOS', lang: 'swift', code: `// Load a page of your web app that contains <datasetless-dashboard>\nlet webView = WKWebView(frame: .zero)\nwebView.load(URLRequest(url: URL(string: "https://app.yourcompany.com/reports")!))` },
      { label: 'Android', lang: 'kotlin', code: `webView.settings.javaScriptEnabled = true\nwebView.loadUrl("https://app.yourcompany.com/reports")` },
      { label: 'React Native', lang: 'jsx', code: `import { WebView } from 'react-native-webview';\n\n<WebView source={{ uri: 'https://app.yourcompany.com/reports' }} />` },
      { label: 'Flutter', lang: 'dart', code: `final controller = WebViewController()\n  ..setJavaScriptMode(JavaScriptMode.unrestricted)\n  ..loadRequest(Uri.parse('https://app.yourcompany.com/reports'));\n\nWebViewWidget(controller: controller);` },
      { label: 'Electron', lang: 'js', code: `// Same as any web page: add the script tag to your renderer's HTML\n<script src="${B}embed.js" async></script>\n<datasetless-dashboard source="/api/reports/data"></datasetless-dashboard>` },
    ] },
  ];

  const back = [
    { name: 'Your report endpoint', items: [
      { label: 'Node', lang: 'js', code: `app.get('/api/reports/data', requireAuth, async (req, res) => {\n  const { rows } = await db.query(\n    'SELECT order_date, region, product, revenue FROM orders WHERE tenant_id = $1',\n    [req.user.tenantId]          // isolation is enforced here, by your login\n  );\n  res.json(rows);\n});` },
      { label: 'Python · FastAPI', lang: 'python', code: `@app.get("/api/reports/data")\ndef report_data(user: User = Depends(current_user)):\n    rows = db.execute(\n        text("SELECT order_date, region, product, revenue FROM orders WHERE tenant_id = :t"),\n        {"t": user.tenant_id},\n    ).mappings().all()\n    return [dict(r) for r in rows]` },
      { label: 'Django', lang: 'python', code: `@login_required\ndef report_data(request):\n    rows = Order.objects.filter(tenant=request.user.tenant).values(\n        "order_date", "region", "product", "revenue")\n    return JsonResponse(list(rows), safe=False)` },
      { label: 'Rails', lang: 'ruby', code: `class ReportsController < ApplicationController\n  before_action :authenticate_user!\n\n  def data\n    render json: Order.where(tenant_id: current_user.tenant_id)\n                      .select(:order_date, :region, :product, :revenue)\n  end\nend` },
      { label: 'PHP · Laravel', lang: 'php', code: `Route::middleware('auth')->get('/api/reports/data', function (Request $request) {\n    return Order::where('tenant_id', $request->user()->tenant_id)\n        ->get(['order_date', 'region', 'product', 'revenue']);\n});` },
      { label: 'Java · Spring', lang: 'java', code: `@GetMapping("/api/reports/data")\npublic List<Map<String, Object>> data(@AuthenticationPrincipal AppUser user) {\n    return jdbc.queryForList(\n        "SELECT order_date, region, product, revenue FROM orders WHERE tenant_id = ?",\n        user.getTenantId());\n}` },
      { label: 'C# · .NET', lang: 'csharp', code: `app.MapGet("/api/reports/data", async (ClaimsPrincipal user, AppDb db) =>\n    await db.Orders\n        .Where(o => o.TenantId == user.FindFirstValue("tenant_id"))\n        .Select(o => new { o.OrderDate, o.Region, o.Product, o.Revenue })\n        .ToListAsync())\n   .RequireAuthorization();` },
      { label: 'Go', lang: 'go', code: `mux.Handle("/api/reports/data", requireAuth(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {\n    rows, err := queryRows(r.Context(),\n        "SELECT order_date, region, product, revenue FROM orders WHERE tenant_id = $1",\n        tenantID(r.Context()))\n    if err != nil { http.Error(w, "error", 500); return }\n    json.NewEncoder(w).Encode(rows)\n})))` },
    ] },
    { name: 'Big data & AI', items: [
      { label: 'Parquet from S3', lang: 'js', code: `// Millions of rows: export a Parquet file per customer nightly, then\n// hand the browser a short-lived link to that customer's file only.\napp.get('/api/reports/data', requireAuth, async (req, res) => {\n  const url = await getSignedUrl(s3, new GetObjectCommand({\n    Bucket: 'reports', Key: \`tenants/\${req.user.tenantId}/orders.parquet\`,\n  }), { expiresIn: 300 });\n  res.redirect(url);   // the bucket needs a CORS rule for your app's domain\n});` },
      { label: 'AI endpoint (Pro)', lang: 'js', code: `// <datasetless-dashboard ai-endpoint="/api/reports/ai" ...>\n// Datasetless sends { system, user }. Call any model; return { text }.\napp.post('/api/reports/ai', requireAuth, express.json(), async (req, res) => {\n  const { system, user } = req.body;\n  const r = await anthropic.messages.create({\n    model: 'claude-sonnet-5-5', max_tokens: 1500, system,\n    messages: [{ role: 'user', content: user }],\n  });\n  res.json({ text: r.content[0].text });\n});`, note: 'Prompts contain your column names, 5 sample rows and query results. They go only to your server and the model you choose.' },
    ] },
  ];

  const metricsExample = `{
  "title": "Store performance",
  "currency": "$",
  "time": "date",
  "grain": "month",
  "dimensions": ["region", "product_line", "channel"],
  "metrics": [
    { "id": "net_revenue", "label": "Net revenue", "format": "currency",
      "sql": "sum(revenue) - sum(refunds)",
      "description": "Gross revenue minus refunds.", "owner": "finance@acme.com",
      "tests": [{ "type": "min", "value": 0 }] },
    { "id": "refund_rate", "label": "Refund rate", "format": "percent",
      "sql": "100.0 * sum(refunds) / nullif(sum(revenue), 0)",
      "tests": [{ "type": "between", "value": [0, 15] }] }
  ]
}`;

  const attrs = [
    ['source', 'URL of your report endpoint or file. Fetched by your page with the user’s session (cookies).'],
    ['metrics', 'URL of your metrics.json (or set el.metrics = {...}).'],
    ['format', 'csv · json · parquet · xlsx. Usually detected automatically.'],
    ['title', 'Dashboard title. Defaults to the metrics title.'],
    ['theme', 'light · dark · auto (default).'],
    ['accent', 'Brand colour, e.g. #4f46e5 (Pro).'],
    ['license', 'Your license key. Unlocks white-label, AI and unlimited metrics.'],
    ['ai-endpoint', 'Your server route for AI questions (Pro).'],
    ['sql', 'Show a read-only SQL tab to your users.'],
    ['exports', '"false" hides PNG/PDF export.'],
    ['refresh', 'Re-fetch data every N seconds.'],
    ['share · sample', 'Show a public shared dashboard or a sample instead of your data.'],
  ];
  const events = [
    ['ready', '{ title, rows, metrics: [{ id, status }] }'],
    ['filter', '{ dimension, values, from, to }'],
    ['select', '{ dimension, value } — a bar, line or dot was clicked'],
    ['error', '{ message }'],
  ];
  const methods = [
    ['el.load(data, { format })', 'Give rows (array of objects) or file bytes directly.'],
    ['el.reload()', 'Re-fetch from source.'],
    ['el.metrics = {...}', 'Set the metrics contract in code.'],
    ['el.requestInit = { headers }', 'Extra fetch options, e.g. an Authorization header.'],
    ['Datasetless.mount(target, options)', 'Create a dashboard from JavaScript. Options mirror the attributes.'],
  ];
  const refTable = (rows, a, b) => h('div', { class: 'table-scroll' }, h('table', { class: 'data-table ref' }, h('thead', {}, h('tr', {}, h('th', {}, a), h('th', {}, b))), h('tbody', {}, rows.map(([k, v]) => h('tr', {}, h('td', {}, h('code', {}, k)), h('td', {}, v))))));

  root.replaceChildren(h('div', { class: 'page devs' },
    h('section', { class: 'page-hero' },
      h('div', { class: 'eyebrow' }, h('span', { class: 'sticker s-sky' }, '</> For developers'), 'Customer-facing analytics in an afternoon'),
      h('h1', {}, 'One tag. ', h('span', { class: 'w-sky' }, 'Any stack.'), h('br'), 'Your data never leaves your app.'),
      h('p', { class: 'page-sub' }, 'Drop a dashboard into your product, internal tool or mobile app. Your API decides what each customer sees; the engine runs in their browser. No data pipeline to us, no per-viewer bill.'),
      h('div', { class: 'hero-row' },
        h('a', { class: 'btn btn-primary btn-lg', href: 'demo/acme.html', target: '_blank' }, 'Open the live demo app', icon('arrow', 18)),
        h('a', { class: 'btn btn-lg', href: '#/pricing' }, 'See pricing'))),
    h('section', { class: 'section' }, h('div', { class: 'section-head' }, h('div', { class: 'kicker mono' }, 'The data path'), h('h2', {}, 'Where your data goes (and doesn’t)')), flow),
    h('section', { class: 'section' },
      h('div', { class: 'section-head' }, h('div', { class: 'kicker mono' }, 'Step 1'), h('h2', {}, 'Add one endpoint to your backend'),
        h('p', {}, 'Return the logged-in customer’s rows as JSON, CSV or Parquet. Your existing auth keeps every customer isolated.')),
      tabs(back)),
    h('section', { class: 'section' },
      h('div', { class: 'section-head' }, h('div', { class: 'kicker mono' }, 'Step 2'), h('h2', {}, 'Drop the dashboard into any frontend'),
        h('p', {}, 'A standard web component, so it works with every framework, plus an iframe for no-code tools and a WebView for mobile.')),
      tabs(front)),
    h('section', { class: 'section' },
      h('div', { class: 'section-head' }, h('div', { class: 'kicker mono' }, 'Step 3 · optional'), h('h2', {}, 'Define your numbers in code'),
        h('p', {}, 'Keep metrics.json in your repo next to your code. Every KPI, chart and AI answer uses these exact definitions, and each one is tested against the data and marked ✓ Verified, ⚠ Tests failing or Broken.')),
      h('div', { class: 'two-col' }, codeBlock(metricsExample, 'json'),
        h('div', { class: 'stack' },
          h('div', { class: 'mini-card t-mint' }, h('b', {}, '✓ Verified'), h('p', {}, 'All tests pass for every period. Safe to show customers and the board.')),
          h('div', { class: 'mini-card t-pink' }, h('b', {}, '⚠ Tests failing'), h('p', {}, 'e.g. “Refund rate above 15 in 2026-03”. You find out before your customer does.')),
          h('div', { class: 'mini-card t-sky' }, h('b', {}, 'AI follows it'), h('p', {}, 'Plain-English answers must use these definitions, so “revenue” means the same thing everywhere.'))))),
    h('section', { class: 'section' },
      h('div', { class: 'section-head' }, h('div', { class: 'kicker mono' }, 'Reference'), h('h2', {}, 'Attributes, events and methods')),
      h('div', { class: 'two-col' }, refTable(attrs, 'Attribute', 'What it does'), h('div', { class: 'stack' }, refTable(events, 'Event', 'detail'), refTable(methods, 'Method', 'What it does')))),
    h('section', { class: 'cta' },
      h('div', {}, h('h2', {}, 'Try it in your app today 🛠️'), h('p', {}, 'The Free plan works in production with a small badge. Upgrade for white-label, AI and unlimited metrics.')),
      h('a', { class: 'btn btn-primary btn-lg', href: '#/pricing' }, 'See plans', icon('arrow', 18)))));
  return {};
}

function flowBox(emoji, title, text, tone) {
  return h('div', { class: `flow-box ${tone}` }, h('div', { class: 'flow-emoji', 'aria-hidden': 'true' }, emoji), h('b', {}, title), h('span', {}, text));
}
function flowArrow() {
  return h('div', { class: 'flow-arrow', 'aria-hidden': 'true' }, '→');
}
