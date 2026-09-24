import { requireAdmin, json } from './_access.js';
import { putFile } from './_github.js';

// Strips everything that isn't a word character, so no '.', '/' or '\' can
// survive into the path. Path traversal is impossible by construction.
function toSlug(input) {
  return String(input || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

// JSON string syntax is valid YAML double-quoted scalar syntax, so this closes
// off frontmatter injection via quotes or newlines in a title.
const yamlStr = (v) => JSON.stringify(String(v ?? ''));

function frontmatter(body) {
  const lines = [
    `title: ${yamlStr(body.title)}`,
    `artist: ${yamlStr(body.artist)}`,
    `album: ${yamlStr(body.album)}`,
  ];
  if (body.label) lines.push(`label: ${yamlStr(body.label)}`);
  if (Number.isFinite(Number(body.year))) lines.push(`year: ${Number(body.year)}`);
  lines.push(`pubDate: ${yamlStr(body.pubDate)}`);
  lines.push(`tldr: [${body.tldr.map(yamlStr).join(', ')}]`);
  if (body.tags?.length) lines.push(`tags: [${body.tags.map(yamlStr).join(', ')}]`);
  if (body.cover) lines.push(`cover: ${yamlStr(body.cover)}`);
  if (body.coverAlt) lines.push(`coverAlt: ${yamlStr(body.coverAlt)}`);
  if (body.featured) lines.push('featured: true');
  return lines.join('\n');
}

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

  const slug = toSlug(body.slug || body.title);
  if (!slug) return json({ error: 'title or slug must contain letters or numbers' }, 400);

  for (const field of ['title', 'artist', 'album']) {
    if (!String(body[field] || '').trim()) return json({ error: `${field} is required` }, 400);
  }

  const tldr = Array.isArray(body.tldr) ? body.tldr.map((t) => String(t).trim()).filter(Boolean) : [];
  if (tldr.length !== 3) return json({ error: 'tldr must be exactly three words' }, 400);

  const pubDate = String(body.pubDate || '').trim() || new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(pubDate)) return json({ error: 'pubDate must be YYYY-MM-DD' }, 400);

  const tags = Array.isArray(body.tags) ? body.tags.map((t) => String(t).trim()).filter(Boolean) : [];
  const markdown = `---\n${frontmatter({ ...body, tldr, tags, pubDate })}\n---\n\n${String(body.body || '').trim()}\n`;

  try {
    await putFile(env, {
      path: `src/content/reviews/${slug}.md`,
      content: markdown,
      message: `post: ${slug} (via admin, ${email})`,
    });
  } catch (err) {
    return json({ error: err.message }, 502);
  }

  return json({ ok: true, slug, url: `/reviews/${slug}/` });
}
