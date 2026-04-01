# Agent API, harness sidecar, MCP, and briefings

This document describes the MarketPulse-AI integrations added for:

1. **Agentic Express API** — OpenAI tool-calling over your existing market services  
2. **Optional Rust harness sidecar** — reverse proxy from Node  
3. **MCP server** — stdio tools for Cursor / IDE workflows  
4. **Background research reports** — MongoDB or in-memory store + cron / HTTP trigger  

## Environment variables

| Variable | Purpose |
|----------|---------|
| `OPENAI_API_KEY` | Required for `/api/agent/chat`, `/api/agent/stream`, and report generation |
| `AGENT_OPENAI_MODEL` | Optional (default `gpt-4o-mini`) |
| `HARNESS_SERVER_URL` | Base URL of the claw (or other) harness HTTP server, e.g. `https://claw-harness.onrender.com` |
| `HARNESS_UPSTREAM_TOKEN` | Optional Bearer token sent to the harness |
| `INTERNAL_SERVICE_TOKEN` | If set, allows `/api/agent/harness/*` with `Authorization: Bearer <token>` plus `X-User-Id` |
| `INTERNAL_API_TOKEN` | Bearer for `/api/internal/mp/*` (harness callbacks). Falls back to `INTERNAL_SERVICE_TOKEN` if unset. |
| `AGENT_RATE_LIMIT_PER_MINUTE` | Per-IP or per-user cap on agent routes (default `30`) |
| `AGENT_MAX_MESSAGE_CHARS` | Max chat message length (default `8000`) |
| `CRON_SECRET` | For `POST /api/internal/cron/weekly-briefings` header `x-cron-secret` |
| `ENABLE_REPORT_CRON` | Set to `true` to run in-process weekly jobs (`node-cron`) |
| `REPORT_CRON_EXPRESSION` | Optional cron string (default `0 6 * * 0` — Sunday 06:00 server time) |

## HTTP API

### Agent (optional JWT)

- `POST /api/agent/chat` — JSON `{ "message": "...", "symbol": "AAPL", "watchlistSymbols": [], "portfolioSnapshot": {}, "contextNote": "short note", "patternQuery": { "markers": 10, "perIndicator": 3 } }`  
- `POST /api/agent/stream` — Same body; **Server-Sent Events** with `event: delta`, `event: tool`, `event: done`, `event: error`  

Send `Authorization: Bearer <jwt>` to attach server-side watchlist context. Tool rounds run **in parallel** per assistant step. Empty model replies trigger an automatic follow-up summarization pass.

### Internal machine API (no user JWT)

Prefix: **`/api/internal/mp`** — `Authorization: Bearer <INTERNAL_API_TOKEN>` (or `INTERNAL_SERVICE_TOKEN` if the former is unset).

- `GET /api/internal/mp/health`  
- `GET /api/internal/mp/quote/:symbol` — compact quote + bar counts  
- `GET /api/internal/mp/news/:symbol` — headlines (same pipeline as agent tool `latest_news_headlines`). Query: `companyName` (optional), `maxItems` or `limit` (1–15, default 8)  
- `POST /api/internal/mp/analyze` — body `{ "symbols": ["AAPL","MSFT"], "markers": 10, "perIndicator": 3 }` (max **8** symbols; strips heavy arrays from the JSON)

Use this from a Rust harness or worker so it never touches Mongo directly but still gets analysis data from your Node stack.

### Harness proxy

- Any method under `/api/agent/harness/*` is forwarded to `HARNESS_SERVER_URL` with the same path suffix.  
- Auth: normal user JWT **or** `INTERNAL_SERVICE_TOKEN` + header `X-User-Id` (or `X-MarketPulse-User`).  
- Upstream receives `X-MarketPulse-User` and optional `Authorization: Bearer <HARNESS_UPSTREAM_TOKEN>`.

### Reports (JWT required)

- `GET /api/reports` — list reports; add `?summary=1` (or `fields=summary`) to **omit `body`** for lighter payloads  
- `GET /api/reports/:id` — one report (full body)  
- `POST /api/reports/generate` — `202` immediately; body `{ "kind": "watchlist_weekly" \| "portfolio_snapshot", "portfolioSnapshot": {} }`  

### Cron trigger (for Render / Railway schedulers)

- `POST /api/internal/cron/weekly-briefings`  
- Header: `x-cron-secret: <CRON_SECRET>`  

## MCP (stdio)

From `server/`:

```bash
npm run mcp
```

Configure your MCP client (e.g. Cursor) to run this command with `cwd` set to `server/` and the same `.env` as the API (Gemini keys if you use full `analyze_symbol`, etc.).

Tools: `analyze_symbol`, `quick_quote`, `technical_forecast_only`, `latest_news_headlines`.

## Deploying a Rust harness next to Node

1. Build and deploy `claw-code` (or your fork) `rust/crates/server` (or documented HTTP entry) to its own URL.  
2. Set `HARNESS_SERVER_URL` on the MarketPulse backend to that origin (no trailing slash required).  
3. If the harness expects its own auth, set `HARNESS_UPSTREAM_TOKEN`.  
4. From the browser/session, call MarketPulse with a normal JWT; Node proxies to the harness with user id in `X-MarketPulse-User`.  
5. For **service-to-service** automation, configure `INTERNAL_SERVICE_TOKEN` and call `/api/agent/harness/...` with `X-User-Id`.  
6. Point harness **tools** at **`/api/internal/mp`** with `INTERNAL_API_TOKEN` for quotes and batch analysis without DB access.

## Notes

- Reports persist in **MongoDB** when `MONGODB_URI` is set; otherwise they are stored **in memory** (lost on restart).  
- The agent tools intentionally **truncate** large payloads (e.g. candle arrays) before returning them to the model.  
