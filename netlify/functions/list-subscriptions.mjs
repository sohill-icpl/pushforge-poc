import { getStore } from '@netlify/blobs';

function store() {
  return getStore('push-subscriptions');
}

export default async () => {
  const headers = { 'Content-Type': 'application/json' };
  const { blobs } = await store().list();
  const subs = await Promise.all(
    blobs.map(async ({ key }) => {
      const sub = await store().get(key, { type: 'json' });
      return {
        key,
        endpoint_short: sub?.endpoint?.substring(0, 80) + '...',
        has_keys: !!(sub?.keys?.p256dh && sub?.keys?.auth),
      };
    })
  );
  return new Response(JSON.stringify({ count: subs.length, subscriptions: subs }, null, 2), { headers });
};

export const config = { path: '/api/list-subscriptions' };
