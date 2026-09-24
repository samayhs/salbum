// Cloudflare Access verification.
//
// Access protects the /admin and /api routes at the edge, but these endpoints
// commit to the repo, so they verify the assertion themselves too. If the
// Access policy is ever loosened or misrouted, the endpoint still refuses.

const certCache = new Map();

function b64urlToBytes(s) {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '=');
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function decodeSegment(s) {
  return JSON.parse(new TextDecoder().decode(b64urlToBytes(s)));
}

async function keyFor(teamDomain, kid) {
  const url = `https://${teamDomain}/cdn-cgi/access/certs`;
  let certs = certCache.get(url);
  if (!certs || !certs.keys?.some((k) => k.kid === kid)) {
    const res = await fetch(url);
    if (!res.ok) throw new Error('could not fetch Access certs');
    certs = await res.json();
    certCache.set(url, certs);
  }
  const jwk = certs.keys?.find((k) => k.kid === kid);
  if (!jwk) throw new Error('unknown signing key');
  return crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );
}

/**
 * Returns the verified caller's email, or throws.
 * Requires env: CF_ACCESS_TEAM_DOMAIN, CF_ACCESS_AUD, ADMIN_EMAIL.
 */
export async function requireAdmin(request, env) {
  for (const name of ['CF_ACCESS_TEAM_DOMAIN', 'CF_ACCESS_AUD', 'ADMIN_EMAIL']) {
    if (!env[name]) throw new Error(`server is missing ${name}`);
  }

  const token = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!token) throw new Error('no Access assertion on this request');

  const [h, p, s] = token.split('.');
  if (!h || !p || !s) throw new Error('malformed assertion');

  const header = decodeSegment(h);
  const key = await keyFor(env.CF_ACCESS_TEAM_DOMAIN, header.kid);
  const ok = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    key,
    b64urlToBytes(s),
    new TextEncoder().encode(`${h}.${p}`)
  );
  if (!ok) throw new Error('bad assertion signature');

  const claims = decodeSegment(p);
  const now = Math.floor(Date.now() / 1000);
  if (claims.exp && claims.exp < now) throw new Error('assertion expired');
  if (claims.nbf && claims.nbf > now) throw new Error('assertion not yet valid');

  const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!aud.includes(env.CF_ACCESS_AUD)) throw new Error('assertion is for another application');

  const allowed = env.ADMIN_EMAIL.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  const email = String(claims.email || '').toLowerCase();
  if (!allowed.includes(email)) throw new Error('not an admin');

  return email;
}

export function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}
