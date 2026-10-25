// "Work with me" and "For developers" pages: the two pages a business reads.
import { h, icon, toast } from './components.js';
import { BRAND, CONTACT } from '../config.js';


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
// "Work with me": turns interest in this version into conversations with companies.
export function renderContact(root, ctx) {
  const card = (emoji, tone, head, text) => h('div', { class: `offer ${tone}` }, h('div', { class: 'offer-emoji', 'aria-hidden': 'true' }, emoji), h('h3', {}, head), h('p', {}, text));
  const step = (n, tone, head, text) => h('div', { class: `step ${tone}` }, h('div', { class: 'step-num mono' }, n), h('h3', {}, head), h('p', {}, text));

  const offers = h('section', { class: 'section' },
    h('div', { class: 'section-head' }, h('div', { class: 'kicker mono' }, 'What I can build for you'), h('h2', {}, 'This app, on your real data'),
      h('p', {}, 'Everything you’ve seen here, set up for your company. You don’t need a data team or a new BI tool.')),
    h('div', { class: 'offers' },
      card('🧩', 't-sky', 'Dashboards inside your product', 'Give your customers analytics on their own data, inside your SaaS. Each customer sees only their own numbers.'),
      card('🏢', 't-sun', 'Internal dashboards', 'For sales, operations and finance teams. Connected to your database, Google Sheets, CRM or regular exports.'),
      card('💬', 't-pink', 'Ask your data', 'Your team types a question in plain English and gets the answer, a chart and the SQL behind it.'),
      card('✅', 't-mint', 'Numbers everyone trusts', 'Your official metrics are defined once and checked automatically, so they’re the same in every report.'),
      card('🔐', 't-lilac', 'Private by design', 'Your data stays in your systems. The engine runs in the browser or on your own servers.'),
      card('🎨', 't-peach', 'Your brand', 'Your colours, your domain, no third-party badge. It looks like part of your product.')));

  const process = h('section', { class: 'section' },
    h('div', { class: 'section-head' }, h('div', { class: 'kicker mono' }, 'How we’d work together'), h('h2', {}, 'From first call to live in weeks')),
    h('div', { class: 'steps' },
      step('1', 't-sky', 'A free 30-minute call', 'Show me your data and what you want to see. I’ll tell you honestly whether this is a good fit.'),
      step('2', 't-sun', 'A pilot on your real data', 'A working dashboard on your own data, in your own stack, so you can judge it with real numbers.'),
      step('3', 't-mint', 'Launch and improve', 'Roll it out to your team or customers. I stay on hand for changes, new metrics and support.')));

  const stack = h('section', { class: 'section' },
    h('div', { class: 'section-head' }, h('div', { class: 'kicker mono' }, 'Fits what you already use'), h('h2', {}, 'No need to change your software')),
    h('div', { class: 'stack-chips' }, ['React', 'Vue', 'Angular', 'Next.js', 'Plain HTML', 'WordPress', 'Webflow', 'Salesforce', 'SharePoint', 'iOS', 'Android', 'Flutter',
      'Postgres', 'MySQL', 'SQL Server', 'Snowflake', 'BigQuery', 'Google Sheets', 'Excel', 'Shopify', 'Stripe', 'HubSpot', 'Any REST API'].map((t) => h('span', { class: 'tag' }, t))),
    h('p', { class: 'small muted stack-note' }, 'Technical details for your developers are on the ', h('a', { href: '#/developers' }, 'For developers'), ' page.'));

  // ---------- form ----------
  const field = (label, input, hint) => h('label', { class: 'field' }, h('span', {}, label), input, hint ? h('small', { class: 'muted' }, hint) : null);
  const name = h('input', { class: 'input', name: 'name', required: true, autocomplete: 'name' });
  const email = h('input', { class: 'input', name: 'email', type: 'email', required: true, autocomplete: 'email' });
  const company = h('input', { class: 'input', name: 'company', required: true, autocomplete: 'organization' });
  const site = h('input', { class: 'input', name: 'website', type: 'text', placeholder: 'yourcompany.com', autocomplete: 'url' });
  const phone = h('input', { class: 'input', name: 'phone', type: 'tel', placeholder: '+1 555 010 0199', autocomplete: 'tel' });
  const trap = h('input', { class: 'trap', name: 'company_url', tabindex: '-1', autocomplete: 'off', 'aria-hidden': 'true' });
  const needs = ['Dashboards inside our product', 'Internal dashboards for our team', 'Ask-your-data for our team', 'Something else'];
  const picks = h('div', { class: 'pick-row' }, needs.map((n) => {
    const cb = h('input', { type: 'checkbox', value: n });
    return h('label', { class: 'pick' }, cb, h('span', {}, n));
  }));
  const msg = h('textarea', { class: 'input', name: 'message', rows: 5, placeholder: 'What data do you have, and what would you like to see? Any deadline?' });
  const send = h('button', { class: 'btn btn-primary btn-lg', type: 'submit' }, 'Send message', icon('arrow', 18));
  const note = h('p', { class: 'small form-note', 'aria-live': 'polite' });
  const form = h('form', { class: 'contact-form', novalidate: true },
    h('div', { class: 'row2' }, field('Your name', name), field('Work email', email)),
    h('div', { class: 'row2' }, field('Company', company), field('Website (optional)', site)),
    h('div', { class: 'field' }, h('span', {}, 'What are you looking for?'), picks),
    field('Phone or WhatsApp (optional)', phone, 'Prefer a call? Leave your number and I’ll call you back.'),
    field('Tell me a bit more', msg),
    trap,
    h('div', { class: 'form-actions' }, send, BRAND.contactUrl ? h('a', { class: 'btn btn-lg', href: BRAND.contactUrl, target: '_blank', rel: 'noopener' }, 'Or book a call') : null),
    note);
  const formBox = h('div', { class: 'form-box' }, form);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (trap.value) return; // bots fill hidden fields
    const data = {
      name: name.value.trim(), email: email.value.trim(), company: company.value.trim(), website: site.value.trim(), phone: phone.value.trim(),
      interest: [...picks.querySelectorAll('input:checked')].map((c) => c.value).join(', '), message: msg.value.trim(),
      source: `Datasetless (${location.host})`,
    };
    if (!data.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email) || !data.company) {
      note.className = 'small form-note bad';
      note.textContent = 'Please add your name, a valid work email and your company.';
      return;
    }
    if (data.phone && !/^\+?[\d\s\-().]{7,20}$/.test(data.phone)) {
      note.className = 'small form-note bad';
      note.textContent = 'That phone number doesn’t look right. Include the country code, e.g. +1 555 010 0199.';
      return;
    }
    const done = () => formBox.replaceChildren(h('div', { class: 'sent' },
      h('div', { class: 'sent-emoji', 'aria-hidden': 'true' }, '🎉'),
      h('h3', {}, `Thanks, ${data.name.split(' ')[0]}!`),
      h('p', {}, data.phone ? `I’ll call you on ${data.phone} or email ${data.email} soon to set up a short chat.` : `I’ll get back to you at ${data.email} soon to set up a short call.`),
      h('p', { class: 'muted' }, `— ${BRAND.author}`)));
    if (CONTACT.formEndpoint) {
      send.disabled = true; note.className = 'small form-note'; note.textContent = 'Sending…';
      try {
        const r = await fetch(CONTACT.formEndpoint, {
          method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' },
          body: JSON.stringify({ ...data, _subject: `Datasetless enquiry from ${data.company}`, _template: 'table', _captcha: 'false', _replyto: data.email }),
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok || j.success === false || j.success === 'false') throw new Error(j.message || String(r.status));
        done();
      } catch (err) {
        console.warn('Form delivery failed:', err.message);
        send.disabled = false;
        note.className = 'small form-note bad';
        note.replaceChildren('That didn’t send. ', CONTACT.email ? h('a', { href: mailtoFor(data) }, 'Send it by email instead') : 'Please try again in a moment.', '.');
      }
      return;
    }
    if (CONTACT.email) {
      location.href = mailtoFor(data);
      done();
      return;
    }
    note.className = 'small form-note bad';
    note.textContent = BRAND.contactUrl ? 'Messages aren’t switched on yet. Please use “Book a call”.' : 'Contact details haven’t been set up for this site yet.';
  });

  function mailtoFor(d) {
    const body = `Hi ${BRAND.author},\n\n${d.message || 'I’d like to talk about using Datasetless at our company.'}\n\nLooking for: ${d.interest || '—'}\n\n${d.name}\n${d.company}${d.website ? ` · ${d.website}` : ''}\n${d.email}${d.phone ? `\n${d.phone}` : ''}`;
    return `mailto:${CONTACT.email}?subject=${encodeURIComponent(`Datasetless for ${d.company}`)}&body=${encodeURIComponent(body)}`;
  }

  const contact = h('section', { class: 'section contact', id: 'contact-form' },
    h('div', { class: 'contact-grid' },
      h('div', { class: 'contact-copy' },
        h('div', { class: 'kicker mono' }, 'Get in touch'),
        h('h2', {}, 'Tell me about your project'),
        h('p', {}, 'A few lines about your data and what you’d like to see is enough. I read every message myself.'),
        h('ul', { class: 'plan-list' },
          ['Free first call, no obligation', 'A clear, fixed quote after we talk', 'Your data stays with you throughout'].map((x) => h('li', {}, icon('check', 15), h('span', {}, x)))),
        CONTACT.email ? h('p', { class: 'small email-line' }, 'Prefer email? ', h('a', { href: `mailto:${CONTACT.email}?subject=${encodeURIComponent('Datasetless enquiry')}` }, CONTACT.email)) : null,
        h('div', { class: 'me-card' }, h('div', { class: 'me-avatar', 'aria-hidden': 'true' }, BRAND.author.slice(0, 1)),
          h('div', {}, h('b', {}, BRAND.author), h('span', { class: 'muted small' }, 'Builder of Datasetless'),
            BRAND.authorUrl ? h('a', { class: 'small', href: BRAND.authorUrl, target: '_blank', rel: 'noopener' }, 'Portfolio') : null))),
      formBox));

  const faq = h('section', { class: 'section faq' },
    h('div', { class: 'section-head' }, h('div', { class: 'kicker mono' }, 'FAQ'), h('h2', {}, 'Questions companies ask')),
    ...[
      ['Do you need access to our data?', 'Only as much as you’re comfortable with. Dashboards run in your users’ browsers or on your own servers, and I can build and test with sample or anonymised data.'],
      ['Will it work with our software?', 'Almost certainly. It drops into any website or web app, no-code tools that allow embeds, and mobile apps. It reads from any database or API you already have.'],
      ['How long does it take?', 'A first pilot on your real data usually takes one to two weeks, depending on how your data is set up.'],
      ['What does it cost?', 'It depends on what you need. After a short call you get a clear fixed quote. There are no per-user or per-viewer fees.'],
      ['Can our team maintain it?', 'Yes. Metric definitions live in a simple file in your own code, and I document everything. Ongoing support is available if you want it.'],
    ].map(([qq, a]) => h('details', { class: 'faq-item' }, h('summary', {}, qq, icon('chevron', 14)), h('p', {}, a))));

  root.replaceChildren(h('div', { class: 'page contact-page' },
    h('section', { class: 'page-hero' },
      h('div', { class: 'eyebrow' }, h('span', { class: 'sticker s-sun' }, `👋 Hi, I’m ${BRAND.author}`), 'I built Datasetless'),
      h('h1', {}, 'Want this inside ', h('span', { class: 'w-pink' }, 'your company'), '?'),
      h('p', { class: 'page-sub' }, 'You’ve seen what it does with sample and public data. I can set up the same thing on your real data, inside your product, internal tools or website, so your team and customers get answers in seconds.'),
      h('div', { class: 'hero-row' },
        h('a', { class: 'btn btn-primary btn-lg', href: '#/contact', onclick: (e) => { e.preventDefault(); document.getElementById('contact-form').scrollIntoView({ behavior: 'smooth' }); setTimeout(() => name.focus({ preventScroll: true }), 500); } }, 'Tell me about your project', icon('arrow', 18)),
        h('a', { class: 'btn btn-lg', href: 'demo/acme.html', target: '_blank' }, 'See it inside a demo app'))),
    offers, process, stack, contact, faq));
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
      { label: 'AI endpoint', lang: 'js', code: `// <datasetless-dashboard ai-endpoint="/api/reports/ai" ...>\n// Datasetless sends { system, user }. Call any model; return { text }.\napp.post('/api/reports/ai', requireAuth, express.json(), async (req, res) => {\n  const { system, user } = req.body;\n  const r = await anthropic.messages.create({\n    model: 'claude-sonnet-5-5', max_tokens: 1500, system,\n    messages: [{ role: 'user', content: user }],\n  });\n  res.json({ text: r.content[0].text });\n});`, note: 'Prompts contain your column names, 5 sample rows and query results. They go only to your server and the model you choose.' },
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
    ['accent', 'Brand colour, e.g. #4f46e5 (with a license key).'],
    ['license', 'License key provided with your setup. Removes the badge and enables brand colour and AI.'],
    ['ai-endpoint', 'Your server route for open-ended AI questions (optional).'],
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
        h('a', { class: 'btn btn-lg', href: '#/contact' }, 'Talk to me'))),
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
      h('div', {}, h('h2', {}, 'Want help setting it up? 🛠️'), h('p', {}, `${BRAND.author} can integrate it into your stack, connect your data and define your metrics with your team.`)),
      h('a', { class: 'btn btn-primary btn-lg', href: '#/contact' }, 'Work with me', icon('arrow', 18)))));
  return {};
}

function flowBox(emoji, title, text, tone) {
  return h('div', { class: `flow-box ${tone}` }, h('div', { class: 'flow-emoji', 'aria-hidden': 'true' }, emoji), h('b', {}, title), h('span', {}, text));
}
function flowArrow() {
  return h('div', { class: 'flow-arrow', 'aria-hidden': 'true' }, '→');
}
