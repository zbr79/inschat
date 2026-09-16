# UI testing

The UI suite runs as a guest and does not use the login flow or write test
sessions to MongoDB.

```bash
npm run test:e2e
npm run test:e2e:records
npm run test:lighthouse
npm run test:lighthouse:records
npm test
```

Playwright starts a production server on port `3101` and writes its HTML
report to `artifacts/playwright-report`. Guest records coverage lives in
`tests/records.spec.ts` (desktop) and `tests/records.mobile.spec.ts` (Pixel 5
plus a 320px overflow check).

Lighthouse tests the public UI routes at a 390px mobile viewport by default
and writes per-route JSON/HTML reports plus `artifacts/lighthouse/summary.json`.
`npm run test:lighthouse:records` audits `/records` on both a 390px phone and
a 1350px desktop and records responsive audits (`viewport`, `content-width`,
`tap-targets` / `target-size`, `font-size`, image sizing).

Useful overrides:

```bash
PLAYWRIGHT_PORT=3201 npm run test:e2e
LIGHTHOUSE_ROUTES=/,/records LIGHTHOUSE_MIN_PERFORMANCE=0.6 npm run test:lighthouse
LIGHTHOUSE_FORM_FACTORS=mobile,desktop LIGHTHOUSE_ROUTES=/records npm run test:lighthouse
```

The Lighthouse command exits non-zero when a route falls below a configured
category threshold. Defaults are 40 performance, 80 accessibility, 80
best-practices, and 80 SEO.
