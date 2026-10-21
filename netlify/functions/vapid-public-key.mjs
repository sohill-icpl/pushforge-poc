export default async () => {
  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key) {
    return new Response(JSON.stringify({ error: 'VAPID_PUBLIC_KEY not set' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return new Response(JSON.stringify({ key }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const config = { path: '/api/vapid-public-key' };
