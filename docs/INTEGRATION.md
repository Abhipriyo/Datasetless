# Integrating Datasetless

Three pieces, all optional except the first two:

1. **An endpoint in your backend** that returns the logged-in customer's data.
2. **The dashboard in your frontend**: a web component, an iframe or a JavaScript call.
3. **`metrics.json`**: your official metric definitions, with tests.

## 1. Your data endpoint

Return rows for the current user only, as JSON (an array of objects), CSV or Parquet. Your existing authentication enforces isolation, which is the most important rule: **never** rely on a filter in the browser to hide other customers' data.

```js
app.get('/api/reports/data', requireAuth, async (req, res) => {
  const { rows } = await db.query(
    'SELECT order_date, region, product, revenue FROM orders WHERE tenant_id = $1',
    [req.user.tenantId]
  );
  res.json(rows);
});
```

**Large data:** export one Parquet file per customer (e.g. nightly) and redirect to a short-lived signed URL. The bucket needs a CORS rule allowing your app's origin.

**Size guide:** a few million rows per view works well in a modern browser. Send pre-aggregated data for bigger accounts.

## 2. The frontend

### Web component (any framework)

```html
<script src="https://YOUR-DATASETLESS-HOST/embed.js" async></script>
<datasetless-dashboard source="/api/reports/data" metrics="/metrics.json"></datasetless-dashboard>
```

`embed.js` runs in your page and fetches `source` with the user's session (cookies, `credentials: same-origin` by default). It then hands the bytes to the dashboard iframe inside the same browser.

| Attribute | Meaning |
|---|---|
| `source` | Data URL (your endpoint or a file) |
| `metrics` | URL of `metrics.json` |
| `format` | `csv`, `json`, `parquet` or `xlsx` (detected automatically if omitted) |
| `title` | Dashboard title |
| `theme` | `light`, `dark` or `auto` |
| `accent` | Brand colour, e.g. `#4f46e5` (with a license key) |
| `license` | License key (provided with a white-label setup) |
| `ai-endpoint` | Your AI route (optional). Receives `{ system, user }` and returns `{ text }` |
| `sql` | Show a read-only SQL tab |
| `exports` | `"false"` hides PNG/PDF export |
| `refresh` | Re-fetch every N seconds (minimum 10) |
| `height` | Fixed height; default is auto-resize |
| `credentials` | Fetch credentials mode: `same-origin` (default), `include` or `omit` |
| `share` / `sample` | Show a public shared dashboard or a built-in sample |

**Properties and methods:**

- `el.load(rows | arrayBuffer, { format })` gives the data directly.
- `el.reload()` re-fetches from `source`.
- `el.metrics = {...}` sets the metrics contract in code.
- `el.requestInit = { headers: { Authorization: 'Bearer …' } }` adds fetch options.
- `Datasetless.mount(target, options)` creates a dashboard from JavaScript. The options mirror the attributes.

**Events** are DOM `CustomEvent`s with the payload in `event.detail`:

- `ready` → `{ title, rows, metrics: [{ id, status }] }`
- `filter` → `{ dimension, values, from, to }`
- `select` → `{ dimension, value }`
- `error` → `{ message }`

**Framework notes:**

- **React** and **Next.js:** use the tag as is. Listen to events with a `ref`.
- **Vue:** set `isCustomElement: (t) => t.startsWith('datasetless-')`.
- **Angular:** add `CUSTOM_ELEMENTS_SCHEMA`.

### Plain iframe (no-code tools)

```html
<iframe src="https://YOUR-DATASETLESS-HOST/embed.html?src=<url-encoded file URL>&metrics=<url>&title=Sales&theme=light"
        width="100%" height="900" style="border:0" loading="lazy"></iframe>
```

URL parameters:

- `src`, `metrics` and `title` set the data, metrics contract and title.
- `theme` is `light` or `dark`.
- `accent` and `license` work as in the web component.
- `sql=1` shows the SQL tab, and `exports=0` hides export.

The file must allow cross-origin reads. Public shared dashboards use `embed.html#/d/<code>`, and the app's **Embed** button generates that snippet.

### postMessage protocol (strict CSP, custom hosts)

All messages carry `ds: 1`.

**From the iframe to your page:**

- `{ type: 'hello' }` when it's ready for data.
- `{ type: 'height', value }` with its content height.
- `{ type: 'event', name, detail }` for each event.
- `{ type: 'ai', id, prompt: { system, user } }` when it needs an AI answer.

**From your page to the iframe** (target origin: the Datasetless host):

- `{ type: 'init', config, data, format }`.
  - `config` takes `title`, `theme`, `accent`, `license`, `sql`, `exports`, `metrics` and `hasAI`.
  - `data` is an array of objects, or an ArrayBuffer you can transfer.
- `{ type: 'data', data, format }` replaces the data.
- `{ type: 'ai:result', id, text }` or `{ type: 'ai:result', id, error }` answers an AI request.

### Mobile and desktop

Load a page of your web app that contains the tag in a WKWebView (iOS), WebView (Android), `react-native-webview`, Flutter's `webview_flutter`, or Electron.

## 3. metrics.json

```json
{
  "title": "Store performance",
  "currency": "$",
  "time": "date",
  "grain": "month",
  "dimensions": ["region", "product_line"],
  "metrics": [
    { "id": "net_revenue", "label": "Net revenue", "format": "currency",
      "sql": "sum(revenue) - sum(refunds)",
      "description": "Gross revenue minus refunds.", "owner": "finance@acme.com",
      "tests": [{ "type": "min", "value": 0 }] }
  ]
}
```

**Each metric has:**

- `sql`: one aggregate expression over the table `data`. Or use `column` plus `agg`, where `agg` is `sum`, `avg`, `min`, `max`, `count`, `count_distinct` or `median`.
- `format`: `currency`, `percent`, `number`, `integer` or `ratio`.
- `type: "snapshot"` for balances like MRR, where the latest period is the value.

**Tests:**

- `min`, `max` and `between`, checked for every period.
- `not_null` and `unique`, each with a `column`.
- `no_gaps`.
- `assert`, with an aggregate boolean `sql`.

**Statuses:** a metric with tests that all pass is **✓ Verified**. One with failing tests shows **⚠ Tests failing** with the periods involved, and one that can't be computed shows **Broken**. Plain-English AI answers are instructed to use these exact definitions.

## Security notes

- Datasetless never receives your data. The only network calls from the embed are to your own `source`, `metrics` and `ai-endpoint`, plus loading the Datasetless static files.
- License keys are ECDSA-signed and checked in the browser against the embedding page's domain. `localhost` always works for development, and the `license="preview"` key unlocks white-label features on localhost only, with a visible ribbon.
- Generated SQL is restricted to a single read-only `SELECT` with no file or network access.
- Business customers can host the built `dist/` folder on their own domain so no third party is involved at all.
