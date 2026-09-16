# UI testing

The UI suite runs as a guest and does not use the login flow or write test
sessions to MongoDB.

```bash
npm run test:e2e
npm run test:lighthouse
npm test
```

Playwright starts a production server on port `3101` and writes its HTML
report to `artifacts/playwright-report`. Lighthouse tests the public UI routes
at a 390px mobile viewport and writes per-route JSON reports plus
`artifacts/lighthouse/summary.json`.

Useful overrides:

```bash
PLAYWRIGHT_PORT=3201 npm run test:e2e
LIGHTHOUSE_ROUTES=/,/records LIGHTHOUSE_MIN_PERFORMANCE=0.6 npm run test:lighthouse
```

The Lighthouse command exits non-zero when a route falls below a configured
category threshold. Defaults are 40 performance, 80 accessibility, 80
best-practices, and 80 SEO.
