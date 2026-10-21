import { getStore } from '@netlify/blobs';

function store() {
  return getStore('push-subscriptions');
}

export default async (req) => {
  const headers = { 'Content-Type': 'application/json' };

  if (req.method === 'POST') {
    const sub = await req.json();
    if (!sub?.endpoint) {
      return new Response(JSON.stringify({ error: 'Invalid subscription' }), { status: 400, headers });
    }
    const key = encodeURIComponent(sub.endpoint);
    await store().setJSON(key, sub);
    return new Response(JSON.stringify({ success: true }), { status: 201, headers });
  }

  if (req.method === 'DELETE') {
    const { endpoint } = await req.json();
    if (!endpoint) {
      return new Response(JSON.stringify({ error: 'Missing endpoint' }), { status: 400, headers });
    }
    await store().delete(encodeURIComponent(endpoint));
    return new Response(JSON.stringify({ success: true }), { headers });
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers });
};

export const config = { path: '/api/subscribe' };
