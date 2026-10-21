// Generate VAPID keys using Web Crypto API directly (same as pushforge internals)
const keypair = await crypto.subtle.generateKey(
  { name: 'ECDSA', namedCurve: 'P-256' },
  true,
  ['sign', 'verify']
);

const privateJWK = await crypto.subtle.exportKey('jwk', keypair.privateKey);
const privateJWKWithAlg = { alg: 'ES256', ...privateJWK };

// Derive uncompressed public key from JWK x/y coords → base64url encode
const { x, y } = privateJWKWithAlg;
const xBytes = Buffer.from(x, 'base64url');
const yBytes = Buffer.from(y, 'base64url');
const uncompressed = Buffer.concat([Buffer.from([0x04]), xBytes, yBytes]);
const publicKey = uncompressed.toString('base64url');

console.log('Add these to your .env file:\n');
console.log(`VAPID_PUBLIC_KEY=${publicKey}`);
console.log(`VAPID_PRIVATE_KEY_JWK=${JSON.stringify(privateJWKWithAlg)}`);
