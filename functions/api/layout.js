import { requireAdmin, json } from './_access.js';
import { putFile } from './_github.js';

// Every knob is clamped server-side: these values are read straight into the
// packer at build time, and an out-of-range one produces a broken homepage.
const FIELDS = {
  gap: [0, 40],
  taper: [0, 1],
  chaos: [0, 1],
  seed: [1, 9999],
  minScale: [0.5, 1],
  baseHeightMin: [80, 400],
  baseHeightRatio: [0.05, 0.4],
};

export async function onRequestPost({ request, env }) {
  let email;
  try {
    email = await requireAdmin(request, env);
  } catch (err) {
    return json({ error: err.message }, 403);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'expected JSON' }, 400);
  }

  const config = {};
  for (const [key, [min, max]] of Object.entries(FIELDS)) {
    const value = Number(body[key]);
    if (!Number.isFinite(value)) return json({ error: `${key} must be a number` }, 400);
    config[key] = Math.min(max, Math.max(min, value));
  }
  config.seed = Math.round(config.seed);

  try {
    await putFile(env, {
      path: 'src/data/layout.json',
      content: `${JSON.stringify(config, null, 2)}\n`,
      message: `layout: retune (via admin, ${email})`,
      overwrite: true,
    });
  } catch (err) {
    return json({ error: err.message }, 502);
  }

  return json({ ok: true, config });
}
