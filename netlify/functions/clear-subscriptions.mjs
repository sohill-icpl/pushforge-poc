import { getStore } from '@netlify/blobs';

function store() {
  return getStore('push-subscriptions');
}

export default async () => {
  const headers = { 'Content-Type': 'application/json' };
  const { blobs } = await store().list();
  await Promise.all(blobs.map(({ key }) => store().delete(key)));
  return new Response(JSON.stringify({ cleared: blobs.length }), { headers });
};

export const config = { path: '/api/clear-subscriptions' };
