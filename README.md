# pushforge POC

Web Push notifications using [`@pushforge/builder`](https://github.com/pushforge/pushforge) — zero dependencies, Web Crypto API, edge-safe.

**Port:** 3007  
**Runtime:** Node.js (v18+) or any Web Crypto API runtime (Deno, Bun, Cloudflare Workers, Vercel Edge)  
**Crypto:** `SubtleCrypto` (Web Crypto API) — universal

## How it works

```
Browser                        Server (server.js)              FCM/Mozilla Push
   |                                  |                               |
   |-- GET /vapid-public-key -------> |                               |
   |<- { key: "B..." } --------------|                               |
   |                                  |                               |
   |-- PushManager.subscribe() -----> FCM to get endpoint            |
   |<- PushSubscription (endpoint,    |                               |
   |    p256dh, auth)                 |                               |
   |                                  |                               |
   |-- POST /subscribe -------------> | store in Map                  |
   |<- { success: true } ------------|                               |
   |                                  |                               |
   |-- POST /send ------------------> | buildPushHTTPRequest()        |
   |                                  | → { endpoint, headers, body } |
   |                                  | native fetch(endpoint, ...)   |
   |                                  |-----------------------------> |
   |                                  |                   deliver     |
   |<--------- push event (SW) <--------------------------|           |
```

## Files

| File | Purpose |
|---|---|
| `server.js` | HTTP server — serves frontend + handles subscribe/send API |
| `public/index.html` | Browser UI (subscribe, send, unsubscribe) — purple theme |
| `public/sw.js` | Service worker — receives push events, shows notification |
| `generate-keys.js` | One-time VAPID key generation using Web Crypto API |
| `.env` | VAPID keys (not committed) |

## Setup

```bash
# Build pushforge (from repo root)
cd ../../pushforge
pnpm install && pnpm build

# Install POC deps (links to local @pushforge/builder)
cd ../../poc/pushforge
npm install

# Generate VAPID keys (only once)
node generate-keys.js
# Creates .env with VAPID_PUBLIC_KEY (base64url uncompressed point)
# and VAPID_PRIVATE_KEY_JWK (ES256 JWK JSON string)
```

## Run

```bash
npm start
# → http://localhost:3007
```

## Test flow

1. Open **http://localhost:3007** in Chrome (regular window, not Incognito)
2. Click **Subscribe to push** — allow notification permission
3. Click **Send test notification** — notification appears in OS

## API

| Method | Path | Body | Description |
|---|---|---|---|
| GET | `/` | — | Serve frontend HTML |
| GET | `/sw.js` | — | Serve service worker |
| GET | `/vapid-public-key` | — | Returns `{ key: "<base64url>" }` |
| POST | `/subscribe` | `PushSubscription` JSON | Store subscription in memory |
| DELETE | `/subscribe` | `{ endpoint }` | Remove subscription |
| POST | `/send` | — | Send notification to all subscribers |

## Key implementation details

- Private key stored as ES256 JWK (`{ kty, crv, d, x, y, alg, key_ops }`) in `VAPID_PRIVATE_KEY_JWK` env var
- `buildPushHTTPRequest()` returns `{ endpoint, headers, body }` — just call `fetch(endpoint, { method:'POST', headers, body })`
- No VAPID setup call needed — keys passed per-request
- Subscriptions stored in `Map` keyed by endpoint (in-memory, lost on restart)
- 410 Gone responses auto-remove expired subscriptions
- SW uses `skipWaiting()` + `clients.claim()` so new SW activates immediately

## Key generation details

`generate-keys.js` uses `crypto.subtle.generateKey` (no imports required):
- Generates ES256 (ECDSA P-256) key pair
- Exports private key as JWK
- Derives uncompressed public key (0x04 || x || y) from JWK x/y coordinates
- Encodes public key as base64url (required by `applicationServerKey`)

## Trade-offs

| | |
|---|---|
| **Pro** | Zero dependencies — only Web Crypto API |
| **Pro** | Edge-safe — runs on Cloudflare Workers, Vercel Edge, Deno Deploy, Next.js Edge |
| **Pro** | TypeScript-native with full type definitions |
| **Con** | Newer library, smaller community than `web-push` |
