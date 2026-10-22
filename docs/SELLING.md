# Selling Datasetless: licenses and payments

There is no license server. You sell through a checkout link and email a signed key.

## One-time setup

```bash
npm run license:keygen
```

This creates `.license/private.pem` (keep it secret and backed up) and rewrites `src/license-key.js`. Commit `src/license-key.js`, then rebuild and redeploy.

> If you ever run `keygen --force`, every key you've issued stops working. Only do this if the private key leaks.

## When someone buys

1. They pay through your checkout link (`VITE_CHECKOUT_PRO_URL`), for example a Stripe Payment Link with a field asking for their domain.
2. You issue a key:

   ```bash
   npm run license:issue -- --plan pro --org "Acme Inc" --domains acme.com,*.acme.com --days 365
   ```

3. Email them the key. They add `license="…"` to `<datasetless-dashboard>`, or activate it on the Pricing page for the web app.

**Plan options:**

- `pro`: white-label, unlimited metrics, AI through their endpoint, custom accent. Suggested limit: up to 3 domains.
- `business`: everything in Pro. Issue it with no `--domains` for unlimited domains, or a list they give you.

**Trials:** issue a key with `--days 14`.

**Renewals:** issue a new key with a new expiry date. An expired key falls back to the Free plan automatically and never breaks a customer's page.

## Inspect a key

```bash
node scripts/license.mjs inspect DSL1.xxxxx.yyyyy
```

## Honest notes

- Checks run in the browser, as with most client-side SDKs. A determined developer could patch them out. The license is a commercial agreement, and the key is how you enforce it in normal use. Business contracts should include terms of use.
- The code is MIT-licensed open source. That brings developers in, while support, white-label rights and your updates are what customers pay for. If you'd rather keep the source closed, change the `LICENSE` file before publishing.
