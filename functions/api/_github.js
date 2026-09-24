// Commits a file to the repo. Pushing to the production branch is what makes
// a post go live — Cloudflare Pages rebuilds on the push.

function toBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

function api(env, path) {
  return `https://api.github.com/repos/${env.GITHUB_REPO}/contents/${path}`;
}

function headers(env) {
  return {
    authorization: `Bearer ${env.GITHUB_TOKEN}`,
    accept: 'application/vnd.github+json',
    'user-agent': 'slog-admin',
    'content-type': 'application/json',
  };
}

async function shaOf(env, path, branch) {
  const res = await fetch(`${api(env, path)}?ref=${encodeURIComponent(branch)}`, {
    headers: headers(env),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub read failed (${res.status})`);
  return (await res.json()).sha;
}

/**
 * Writes `content` to `path`. Creates the file, or updates it when `overwrite`
 * is set; without it, an existing path is an error so a post can't be clobbered.
 * Requires env: GITHUB_TOKEN, GITHUB_REPO ("owner/name"), optional GITHUB_BRANCH.
 */
export async function putFile(env, { path, content, message, overwrite = false }) {
  for (const name of ['GITHUB_TOKEN', 'GITHUB_REPO']) {
    if (!env[name]) throw new Error(`server is missing ${name}`);
  }
  const branch = env.GITHUB_BRANCH || 'main';

  const sha = await shaOf(env, path, branch);
  if (sha && !overwrite) throw new Error(`${path} already exists`);

  const res = await fetch(api(env, path), {
    method: 'PUT',
    headers: headers(env),
    body: JSON.stringify({ message, content: toBase64(content), branch, ...(sha ? { sha } : {}) }),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`GitHub write failed (${res.status}): ${detail.slice(0, 200)}`);
  }
  return res.json();
}
