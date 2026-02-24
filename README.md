# API Failure Simulator

A tiny **devtool** for reproducing common production API failures — latency, timeouts, 5xx errors, corrupt JSON, connection resets, and rate limiting — so you can validate resilient clients (retries, backoff, circuit breakers, and error UX).

Built with **Next.js App Router** and a single API endpoint: `GET /api/sim`. :contentReference[oaicite:1]{index=1}

---

## Why this exists

In real systems, failures are rarely “just a 500.” You’ll see:

- Slow responses that break UX and trigger retries
- Requests that hang long enough for client timeouts
- Transient 503s during deploys/maintenance
- Invalid payloads (bad JSON) from upstreams
- Rate limits (429 + retry-after) from gateways
- Crashes/resets that surface as network errors

This simulator makes those failure modes **repeatable** on localhost so you can test client behavior with confidence.

---

## Features

- **Failure modes** controlled via query params (`mode=...`) :contentReference[oaicite:2]{index=2}
- **Artificial latency** (`mode=slow&delayMs=...`) :contentReference[oaicite:3]{index=3}
- **Timeout-ish hangs** (`mode=timeout&delayMs=...`) :contentReference[oaicite:4]{index=4}
- **5xx errors** (`mode=error500&status=...`, `mode=error503`) :contentReference[oaicite:5]{index=5}
- **Corrupt JSON** while claiming JSON headers (`mode=corruptJson`) :contentReference[oaicite:6]{index=6}
- **Crash/reset simulation** by throwing server-side (`mode=reset`) :contentReference[oaicite:7]{index=7}
- **In-memory rate limiting** with standard headers (`mode=ratelimit&limit=...&windowMs=...`) :contentReference[oaicite:8]{index=8}
- **Request correlation** via `x-request-id` header (echoed back in responses) :contentReference[oaicite:9]{index=9}
- **Structured server logs** (JSON logs for start/end) :contentReference[oaicite:10]{index=10}

---

## Quickstart

### Requirements
- Node.js 18+ recommended

### Install & run
```bash
npm install
npm run dev

Open:

http://localhost:3000

API
Endpoint

GET /api/sim

Headers

Send a request id:

x-request-id: <your-id>

The server will echo it back in response headers:

| Mode          | What it simulates   | Status              | Notes                                                                    |
| ------------- | ------------------- | ------------------- | ------------------------------------------------------------------------ |
| `ok`          | Normal success      | 200                 | Baseline response ([GitHub][1])                                          |
| `slow`        | Slow API            | 200                 | Adds delay via `delayMs` ([GitHub][1])                                   |
| `timeout`     | Hanging request     | 200                 | Sleeps long enough to trigger client timeouts ([GitHub][1])              |
| `error500`    | Server error        | 500 (or custom)     | Configure with `status` ([GitHub][1])                                    |
| `error503`    | Service unavailable | 503                 | Good for retry/backoff testing ([GitHub][1])                             |
| `corruptJson` | Invalid JSON body   | 200                 | Returns invalid JSON with `content-type: application/json` ([GitHub][1]) |
| `reset`       | Crash/reset         | 500 / network error | Throws server-side to simulate crash/reset ([GitHub][1])                 |
| `ratelimit`   | Rate limiting       | 200 / 429           | Includes rate-limit headers + `retry-after` ([GitHub][1])                |

Examples (cURL)
OK
curl -i "http://localhost:3000/api/sim?mode=ok"
Slow (1.5s)
curl -i "http://localhost:3000/api/sim?mode=slow&delayMs=1500"
Timeout-ish (15s)
curl -i "http://localhost:3000/api/sim?mode=timeout&delayMs=15000"
500 (custom status)
curl -i "http://localhost:3000/api/sim?mode=error500&status=500"
503
curl -i "http://localhost:3000/api/sim?mode=error503"
Corrupt JSON
curl -i "http://localhost:3000/api/sim?mode=corruptJson"
Crash / Reset
curl -i "http://localhost:3000/api/sim?mode=reset"
Rate limit (2 requests per 30s)
curl -i "http://localhost:3000/api/sim?mode=ratelimit&limit=2&windowMs=30000"

Rate limit response headers include:

x-ratelimit-limit

x-ratelimit-remaining

x-ratelimit-reset

retry-after (only when blocked / 429)

Testing client resiliency (what to try)

Retries + exponential backoff: use error503 and ratelimit

Timeout UX: use timeout and client-side AbortController

Parser fallback: use corruptJson and ensure your client doesn’t crash

Circuit breaker: flip between ok and error503 to validate open/half-open/closed states

Development
Scripts
npm run dev
npm run build
npm run start
npm run lint

Roadmap (nice-to-have)

 Deterministic chaos mode (e.g., fail every Nth request)

 Configurable payload sizes (simulate large responses)

 Optional auth simulation (401/403)

 Latency distribution presets (p50/p95/p99 style)

Contributing

PRs welcome. If you add a new failure mode, please include:

the API behavior in /api/sim

a UI control/preset for it

an example cURL snippet in this README


x-request-id: <same-id>
