# InsChat

Minimalist AI chatbot — text chat + image upload, streaming responses. Powered by the **opencode-go subscription** (`https://opencode.ai/zen/go/v1`).

**Live:** https://agent.renstoolbox.com

## Features

- Text chat with streaming responses
- Image upload (JPEG/PNG/WebP) — DeepSeek V4 Flash Vision Exp analyzes your photo
- Live web research: the direct engine can search the web and fetch pages (`web_search` and `web_fetch`)
- Multi-turn conversation (last 20 messages kept as context)
- Conclude button: extracts structured health data (insulin/glucose/meals) and saves records
- Model picker (`/models`), usage pages (`/usage`, `/opencode-calls`) with the official Go quota windows
- Apple-style black & white UI, mobile-friendly
- Server-side API key (never exposed to the client)

## Stack

Next.js 16 (App Router, React 19) + plain `fetch` against the opencode-go OpenAI-compatible API (no SDK). Model routing:

- Text chat: `qwen3.8-flash`, falling back only to free models when balance or availability is exhausted
- Images: `qwen3.8-flash`, using the same free fallback chain if the paid model is unavailable
- Conclude: `qwen3.8-flash`, falling back only to free models
- Qwen3.8 Flash is enforced; manual model pins and `CONCLUDE_MODEL` are ignored

## Get an API key

1. Subscribe to OpenCode Go at https://opencode.ai/auth (the key is also stored locally at `~/.local/share/opencode/auth.json` → `opencode-go.key`).
2. Copy the key (starts with `sk-...`).

## Setup

```bash
npm install
cp .env.example .env
# edit .env: OPENCODE_API_KEY=sk-... (your key)
npm run dev        # development
# or production:
npm run build
npm run start      # serves on port 3000 by default
```

## Deploy with PM2

```bash
npm run build
pm2 start ecosystem.config.js
```

Text and image chat use the direct opencode-go engine. Text requests can call
`web_search` for live sources and `web_fetch` for readable page content; image
requests stay on the vision model without web tools.

Put nginx (or any reverse proxy) in front and proxy `/` to `127.0.0.1:3002`. If proxying, keep `proxy_buffering off;` so responses stream. Note: each new API route needs its own nginx `location` block (POST-only routes fall through `location /`, which only allows GET).

## How it works

1. Browser sends `POST /api/chat` with `{ messages: [{ role, text, image? }] }`.
2. Server validates the payload (roles, image type/size) and calls the opencode-go API with full history.
3. Tokens stream back; the server relays them chunk-by-chunk to the browser.
4. Images travel as base64 data-URLs in OpenAI `image_url` content blocks.

Quota: the Go plan is dollar-based ($12 per 5h, $30 per week, $60 per month). The app retries overloaded (503) calls up to 3 times with backoff and falls back from Qwen3.8 Flash to free models when the paid balance or model availability is exhausted.

## Project structure

```
app/
  api/chat/route.ts        # POST endpoint: validation + streaming relay
  api/conclude/route.ts    # POST: structured conclusion extraction
  api/opencode/route.ts    # POST: OpenCode-page chat (same engine)
  api/opencode-calls/      # GET: opencode call log + official quota
  api/models/              # GET/POST: catalog + active model
  api/health/              # GET: live per-model probe
  api/usage/               # GET: opencode usage + official quota windows
components/
  ChatApp.tsx              # client state: messages, streaming, abort
  MessageBubble.tsx        # message list + markdown rendering
  Composer.tsx             # text input + image upload + preview
  OpenCodeChat.tsx         # standalone DeepSeek chat page
  OpenCodeCallsPanel.tsx   # opencode call log + quota
  ModelsPanel.tsx          # model picker (opencode-go catalog)
  UsagePanel.tsx           # usage overview
lib/
  opencode.ts              # opencode-go client: streaming chains, quota, probes
  prompt.ts                # SYSTEM_PROMPT.md persona + timezone helpers
  models.ts                # opencode-go model catalog + chains
  conclude.ts              # structured conclusion extraction
  chatRequest.ts           # shared request validation
  db.ts                    # MongoDB (sessions, records, calls)
  types.ts                 # shared types + limits
```
