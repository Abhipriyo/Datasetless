# Datasetless

**Ask a question. Get a dashboard. No dataset required.**

Type a question about the world, or bring a CSV, Excel file, link or table, and get a polished dashboard: KPIs, insight-titled charts, data checks and plain-English answers. Everything runs in the browser, and companies can embed it in their own software.

Made by **Abhipriyo**.

![Landing page](docs/landing.png)

## Ask a question, get an answer

Type a question into any dashboard, for example:

- "Which region's sales fell last quarter?"
- "Which outlet earns the most at dinner?"
- "Compare North and South"
- "How many orders in 2025?"
- "What are the busiest days of the week?"
- "Which country improved the most since 2000?"

You get a chart, a two-sentence answer and the SQL behind it. There's **no API key and no setup**: a built-in engine understands rankings, recent changes, trends, comparisons, shares, totals, averages, decades and weekdays, and runs the SQL in your browser.

### Optional: AI for open-ended questions

If you want the app to handle unusual questions too, turn on the included server function. Visitors still never see a key.

1. Set `ANTHROPIC_API_KEY` (or `OPENAI_API_KEY`) as a **server** environment variable in Vercel or Netlify.
2. Set `VITE_AI_PROXY=/api/ask` and redeploy.

Questions the built-in engine can't match then go to AI. The function (`api/ask.js` for Vercel, `netlify/functions/ask.mjs` for Netlify) accepts only this app's own requests, caps answer length, and limits each visitor to `AI_HOURLY_LIMIT` questions an hour (default 30). AI usage is billed to your API account, so keep the limit sensible. Setting `ALLOWED_ORIGINS` to your domain is also a good idea.

This also turns on "Snap a table" (reading a table from a photo).

## For companies: "Work with me"

There's no pricing page. The **Work with me** page (`#/contact`) turns interest into conversations. It covers:

- what you can build for a company,
- how you'd work together (call, then pilot, then launch),
- which software it fits with,
- a contact form and an FAQ.

Calls to action across the site, the demo app and the embed dialog all lead there. To set it up:

| Variable | What it does |
|---|---|
| `VITE_FORM_ENDPOINT` | A [Formspree](https://formspree.io) form URL. Messages arrive in your inbox, and the visitor sees a thank-you. |
| `VITE_CONTACT_EMAIL` | Used if no form URL is set: the form opens a pre-filled email to you. |
| `VITE_CONTACT_URL` | A Cal.com or Calendly link that adds a "Book a call" button. |
| `VITE_AUTHOR_URL` | Your portfolio or LinkedIn. Makes "Made by Abhipriyo" a link. |

## Embedding in other software

```html
<script src="https://YOUR-DATASETLESS-HOST/embed.js" async></script>
<datasetless-dashboard source="/api/reports/data" metrics="/metrics.json"></datasetless-dashboard>
```

The company's own API decides what each customer sees, and the engine runs in the customer's browser, so you never receive their data. It works with:

- any website framework,
- no-code tools, through an iframe,
- mobile apps, through a WebView.

The **For developers** page and [docs/INTEGRATION.md](docs/INTEGRATION.md) have copy-paste examples for 8 backend languages and 15 frontends.

**Live demo:** `/demo/acme.html` is a pretend SaaS app where three customers each see only their own data, with tested metrics and an event log.

![Demo app with an embedded dashboard](docs/demo-app.png)

**Verified metrics:** companies can define their official numbers in `metrics.json`. Each metric is tested against the data and marked ✓ Verified or ⚠ Tests failing, and answers use those exact definitions.

**White-label keys (for clients you set up):** embeds show a small "Powered by Datasetless · made by Abhipriyo" badge. For a client you work with, you can issue a key that removes it and enables their brand colour:

```bash
npm run license:keygen   # once: creates .license/private.pem (keep it secret, never commit it)
npm run license:issue -- --plan pro --org "Client Inc" --domains client.com,*.client.com --days 365
```

## Run locally

```bash
npm install
npm run dev     # http://localhost:5173   (demo: /demo/acme.html)
npm test
npm run build   # production build in dist/
```

## Deploy

It's a static site with one optional server function. Vercel (`vercel.json`) and Netlify (`netlify.toml`) configs are included. Use HTTPS. On Cloudflare Pages, set `VITE_DUCKDB_CDN=1`.

## How it's built

- Vanilla JS and Vite. DuckDB-WASM for in-browser SQL, Apache ECharts for charts.
- `src/lib/ask.js` is the built-in question engine; `pipeline.js` loads data; `autospec.js` designs dashboards; `metrics.js` tests metric definitions.
- `public/embed.js` is the embed loader, and `src/embed-main.js` is the dashboard inside the iframe.
- All SQL passes a read-only guard: one SELECT, no file or network access.

## Privacy

Uploaded and embedded data is processed in the viewer's browser. If you turn on the optional AI, only questions the built-in engine can't answer are sent: the column names, 5 sample rows and the result.

## License

MIT © Abhipriyo
