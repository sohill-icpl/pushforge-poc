import { getStore } from '@netlify/blobs';
import { buildPushHTTPRequest } from '@pushforge/builder';

function store() {
  return getStore('push-subscriptions');
}

export default async () => {
  const headers = { 'Content-Type': 'application/json' };

  const privateJWK = JSON.parse(process.env.VAPID_PRIVATE_KEY_JWK ?? '{}');
  if (!privateJWK.kty) {
    return new Response(JSON.stringify({ error: 'VAPID_PRIVATE_KEY_JWK not set' }), { status: 500, headers });
  }

  const { blobs } = await store().list();
  if (blobs.length === 0) {
    return new Response(JSON.stringify({ error: 'No subscriptions' }), { status: 400, headers });
  }

  const payload = { title: 'pushforge POC', body: 'Hello from pushforge on Netlify!' };

  const results = await Promise.allSettled(
    blobs.map(async ({ key }) => {
      const sub = await store().get(key, { type: 'json' });
      try {
        const { endpoint, headers: pushHeaders, body } = await buildPushHTTPRequest({
          privateJWK,
          subscription: sub,
          message: { payload, adminContact: 'mailto:test@example.com' },
        });
        const res = await fetch(endpoint, { method: 'POST', headers: pushHeaders, body });
        if (res.status === 410) {
          await store().delete(key);
          throw Object.assign(new Error('Expired'), { statusCode: 410 });
        }
        if (!res.ok) throw new Error(`Push failed: ${res.status}`);
      } catch (err) {
        if (err.statusCode === 410) await store().delete(key);
        throw err;
      }
    })
  );

  const sent = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  return new Response(JSON.stringify({ success: true, sent, failed }), { headers });
};

export const config = { path: '/api/send' };
