import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildPushHTTPRequest } from '@pushforge/builder';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3007;

const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY_JWK } = process.env;
if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY_JWK) {
  console.error('Missing VAPID keys. Run: node generate-keys.js');
  process.exit(1);
}

const privateJWK = JSON.parse(VAPID_PRIVATE_KEY_JWK);

// In-memory store — POC only
const subscriptions = new Map();

function serveFile(res, filePath, contentType) {
  res.writeHead(200, { 'Content-Type': contentType });
  res.end(fs.readFileSync(filePath));
}

function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise(resolve => {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', () => resolve(body));
  });
}

async function sendPush(subscription, payload) {
  const { endpoint, headers, body } = await buildPushHTTPRequest({
    privateJWK,
    subscription,
    message: {
      payload,
      adminContact: 'mailto:test@example.com',
    },
  });
  const res = await fetch(endpoint, { method: 'POST', headers, body });
  if (res.status === 410) throw Object.assign(new Error('Subscription expired'), { statusCode: 410 });
  if (!res.ok) throw new Error(`Push failed: ${res.status}`);
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (req.method === 'GET' && url.pathname === '/') {
    serveFile(res, path.join(__dirname, 'public/index.html'), 'text/html');
    return;
  }

  if (req.method === 'GET' && url.pathname === '/sw.js') {
    serveFile(res, path.join(__dirname, 'public/sw.js'), 'application/javascript');
    return;
  }

  if (req.method === 'GET' && (url.pathname === '/vapid-public-key' || url.pathname === '/api/vapid-public-key')) {
    json(res, 200, { key: VAPID_PUBLIC_KEY });
    return;
  }

  if (req.method === 'POST' && (url.pathname === '/subscribe' || url.pathname === '/api/subscribe')) {
    const sub = JSON.parse(await readBody(req));
    subscriptions.set(sub.endpoint, sub);
    console.log(`[pushforge] Subscription stored. Total: ${subscriptions.size}`);
    json(res, 201, { success: true });
    return;
  }

  if (req.method === 'DELETE' && (url.pathname === '/subscribe' || url.pathname === '/api/subscribe')) {
    const { endpoint } = JSON.parse(await readBody(req));
    subscriptions.delete(endpoint);
    json(res, 200, { success: true });
    return;
  }

  if (req.method === 'POST' && (url.pathname === '/send' || url.pathname === '/api/send')) {
    if (subscriptions.size === 0) { json(res, 400, { error: 'No subscriptions' }); return; }

    const payload = { title: 'pushforge POC', body: 'Hello from pushforge — zero deps, Web Crypto API!' };
    const results = await Promise.allSettled(
      [...subscriptions.values()].map(sub =>
        sendPush(sub, payload).catch(err => {
          if (err.statusCode === 410) subscriptions.delete(sub.endpoint);
          throw err;
        })
      )
    );

    const sent = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    console.log(`[pushforge] Sent: ${sent}, Failed: ${failed}`);
    json(res, 200, { success: true, sent, failed });
    return;
  }

  res.writeHead(404); res.end('Not found');
});

server.listen(PORT, () => {
  console.log(`pushforge POC → http://localhost:${PORT}`);
});
