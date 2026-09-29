# InsChat

Minimalist AI chatbot — text chat + image upload, streaming responses.

**Live:** https://inschat.rwkit.com

## Features

- Text chat with streaming responses
- Image upload (JPEG/PNG/WebP) — GPT-6 Luna analyzes your photo
- Live web research: search the web and fetch pages (`web_search` and `web_fetch`)
- Multi-turn conversation (last 20 messages kept as context)
- Conclude button: extracts structured health data (insulin/glucose/meals) and saves records
- Model picker (`/models`) and a usage page (`/usage`)
- Apple-style black & white UI, mobile-friendly

## Stack

Next.js 16 (App Router, React 19) and MongoDB. Text and image chat use GPT-6 Luna. Health conclusions are saved as records.

## Setup

InsChat’s live site is https://inschat.rwkit.com. Local development:

```bash
npm install
npm run dev
```

Production uses this repo’s PM2 config, which starts the `inschat` process on port 3001:

```bash
npm run build
pm2 start ecosystem.config.js
```

Put nginx (or any reverse proxy) in front and proxy `/` to `127.0.0.1:3001`. Keep `proxy_buffering off;` so responses stream. Each new API route needs its own nginx `location` block (POST-only routes fall through `location /`, which only allows GET).

Sessions and health records are stored in MongoDB. Record times use `RECORD_TIMEZONE` on the server. Those settings stay in `.env`, which is not committed.

## Testing

The UI suite runs as a guest. It does not use the login flow or write test sessions to MongoDB.

```bash
npm run test:e2e
npm run test:e2e:records
npm run test:lighthouse
npm run test:lighthouse:records
npm test
```

Playwright starts a production server on port `3101` and writes its HTML report to `artifacts/playwright-report`. Fresh-visitor coverage is in `tests/visitor.spec.ts` (desktop) and `tests/visitor.mobile.spec.ts` (Pixel 5). Guest records coverage is in `tests/records.spec.ts` (desktop) and `tests/records.mobile.spec.ts` (Pixel 5 plus a 320px overflow check).

Lighthouse tests the public UI routes at a 390px mobile viewport by default and writes per-route JSON/HTML reports plus `artifacts/lighthouse/summary.json`. `npm run test:lighthouse:records` audits `/records` on a 390px phone and a 1350px desktop, including viewport, content width, tap targets, font size, and image sizing.

```bash
PLAYWRIGHT_PORT=3201 npm run test:e2e
LIGHTHOUSE_ROUTES=/,/records LIGHTHOUSE_MIN_PERFORMANCE=0.6 npm run test:lighthouse
LIGHTHOUSE_FORM_FACTORS=mobile,desktop LIGHTHOUSE_ROUTES=/records npm run test:lighthouse
```

Lighthouse exits non-zero when a route falls below a category threshold. Defaults are 40 performance, 80 accessibility, 80 best-practices, and 80 SEO.

## How it works

1. Browser sends `POST /api/chat` with `{ messages: [{ role, text, image? }] }`.
2. Server validates the payload (roles, image type/size) and calls the model service with full history.
3. Tokens stream back; the server relays them chunk-by-chunk to the browser.
4. Images travel with the message as uploaded pictures.
5. A text reply can search the web or fetch a page. Image replies stay on the photo.

## Project structure

```
app/
  api/chat/route.ts        # POST endpoint: validation + streaming relay
  api/conclude/route.ts    # POST: structured conclusion extraction
  api/models/              # GET/POST: catalog + active model
  api/health/              # GET: live per-model probe
  api/usage/               # GET: usage overview
components/
  ChatApp.tsx              # client state: messages, streaming, abort
  MessageBubble.tsx        # message list + markdown rendering
  Composer.tsx             # text input + image upload + preview
  ModelsPanel.tsx          # model picker
  UsagePanel.tsx           # usage overview
lib/
  models.ts                # model catalog + chains
  prompt.ts                # persona + timezone helpers
  conclude.ts              # structured conclusion extraction
  chatRequest.ts           # shared request validation
  db.ts                    # MongoDB (sessions, records, calls)
  types.ts                 # shared types + limits
```
