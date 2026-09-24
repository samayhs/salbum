/**
 * Inverted-triangle jumble layout (no rows).
 *
 *   layoutTriangle(boxes, options) -> { width, height, targetHeight, boxes: [...] }
 *
 * Each input box:
 *   { id: string,
 *     importance: number,          // higher = placed nearer the top
 *     size: 'xs' | 's' | 'm' | 'l' | 'xl',
 *     aspect?: number | 'portrait' | 'square' | 'landscape' | 'wide' }  // omitted = picked from id
 *
 * Each output box: { id, x, y, w, h, importance, size }
 *
 * How it works
 *   Boxes are dropped one at a time, most important first, onto a "skyline" (the
 *   ragged lower edge of everything placed so far), like the reference collage.
 *   Each box goes to the highest spot where it fits inside the triangle, so boxes
 *   interlock at different heights instead of forming rows.
 *   - The width is fixed; the allowed width shrinks with depth (upside-down
 *     triangle). The total height is solved, so more boxes = longer shape.
 *   - A box may change its width so its edges line up with neighbours or the
 *     triangle edge: up to ±flex by changing its aspect ratio, and beyond that
 *     by scaling (between minScale and maxScale).
 *   - If a box leaves a small hole above it, the box above that hole grows down
 *     (up to holeFill of its height) to close it.
 *   - chaos adds seeded randomness to order, size and placement. Same seed =
 *     same layout.
 */
(function (root) {
  const SIZE_HEIGHT = { xs: 0.55, s: 0.72, m: 1, l: 1.35, xl: 1.75 };
  const ASPECTS = { portrait: 0.75, square: 1, landscape: 1.4, wide: 1.9 };
  const AUTO_ASPECTS = [0.7, 0.8, 1, 1.25, 1.45, 1.7];
  const EPS = 0.01;

  function hash(str) {
    let h = 2166136261;
    for (const ch of String(str)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function rng(seed) { // mulberry32
    let a = seed >>> 0;
    return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function aspectOf(box) {
    if (typeof box.aspect === 'number' && box.aspect > 0) return box.aspect;
    if (box.aspect && ASPECTS[box.aspect]) return ASPECTS[box.aspect];
    return AUTO_ASPECTS[hash(box.id) % AUTO_ASPECTS.length];
  }

  function pack(items, H, o) {
    const G = o.gap, TW = o.width + G;          // boxes are inflated by the gap
    const rand = rng(o.seed * 7919 + 17);
    const allowed = (yy) => {
      const rw = o.width * Math.max(o.minRowFrac, 1 - (o.taper * yy) / H);
      return [(o.width - rw) / 2, (o.width + rw) / 2 + G];
    };
    let sky = [{ x: 0, w: TW, y: 0, owner: null }];
    const placed = [];

    const sliver = o.baseHeight * 0.45 + G;   // free strips narrower than this can never be filled

    function evaluate(x, w, it) {
      // Width change q is split: up to ±flex goes into the aspect ratio, the rest
      // scales the box uniformly (so a box can grow/shrink to fill a gap).
      const heightFor = (ww) => {
        const q = (ww - G) / it.nw;
        const d = Math.min(1 + o.flex, Math.max(1 - o.flex, Math.sqrt(q)));
        return it.nh * (q / d) + G;
      };
      const topAt = (xx, ww) => {
        let yy = 0;
        for (const s of sky) if (s.x < xx + ww - EPS && s.x + s.w > xx + EPS) yy = Math.max(yy, s.y);
        return yy;
      };
      let h = heightFor(w), y = 0, al = 0, ar = TW;
      // Nudge the box inside the triangle; the allowed range depends on depth, so re-check.
      let ok = false;
      for (let pass = 0; pass < 4 && !ok; pass++) {
        x = Math.max(0, Math.min(TW - w, x));
        y = topAt(x, w);
        [al, ar] = allowed(y + h / 2);
        if (w > ar - al + 0.5) return null;
        if (x < al - 0.5) x = al; else if (x + w > ar + 0.5) x = ar - w; else ok = true;
      }
      if (!ok) return null;

      // Absorb unfillable slivers beside the box (up to a wall or the triangle edge).
      let left = x;
      for (let k = sky.length - 1; k >= 0; k--) {
        const s = sky[k];
        if (s.x >= x - EPS) continue;
        if (s.y > y + EPS) { left = Math.max(left, s.x + s.w); break; }
        left = s.x;
      }
      left = Math.max(left, al, 0);
      let right = x + w;
      for (const s of sky) {
        if (s.x + s.w <= x + w + EPS) continue;
        if (s.y > y + EPS) { right = Math.min(right, s.x); break; }
        right = s.x + s.w;
      }
      right = Math.min(right, ar, TW);
      if (x - left > EPS && x - left < sliver) { w += x - left; x = left; }
      if (right - (x + w) > EPS && right - (x + w) < sliver) w = right - x;
      h = heightFor(w);

      let waste = 0;
      for (const s of sky) {
        const ov = Math.min(s.x + s.w, x + w) - Math.max(s.x, x);
        if (ov > EPS) waste += (y - s.y) * ov;
      }
      const q = (w - G) / it.nw;
      const score = y + (waste / w) * 2.5 + Math.abs(x + w / 2 - TW / 2) * 0.04
                  + (rand() - 0.5) * o.chaos * it.nh * 0.6
                  + Math.abs(Math.log(q)) * it.nh * 0.35;          // prefer natural size
      return { x, y, w, h, score };
    }

    function candidates(it, scale) {
      const W0 = (it.nw * scale) + G;
      const lo = (W0 - G) * o.minScale + G, hi = (W0 - G) * o.maxScale + G;
      const lefts = new Set(), rights = new Set();
      for (const s of sky) {
        lefts.add(s.x); rights.add(s.x + s.w);
        const [al, ar] = allowed(s.y + (it.nh * scale) / 2);
        lefts.add(Math.max(0, al)); rights.add(Math.min(TW, ar));
      }
      const R = [...rights].sort((a, b) => a - b), L = [...lefts].sort((a, b) => a - b);
      let best = null;
      const consider = (x, w) => {
        if (w < lo - EPS || w > hi + EPS || w <= G + 4) return;
        const c = evaluate(x, w, { nh: it.nh * scale, nw: it.nw * scale });
        if (c && (!best || c.score < best.score)) best = c;
      };
      for (const l of L) {
        consider(l, W0);
        for (const r of R) { if (r - l > hi + EPS) break; if (r - l >= lo - EPS) consider(l, r - l); }
      }
      for (const r of R) consider(r - W0, W0);
      return best;
    }

    for (const it of items) {
      let best = null;
      for (let scale = 1; !best && scale > 0.15; scale *= 0.85) best = candidates(it, scale);
      if (!best) continue;
      const box = { it, x: best.x, y: best.y, w: best.w, h: best.h };

      // Close small holes above the new box by growing the box that sits over each hole.
      for (const s of sky) {
        const ov = Math.min(s.x + s.w, box.x + box.w) - Math.max(s.x, box.x);
        if (ov <= EPS || s.y >= box.y - EPS || !s.owner) continue;
        const own = s.owner, delta = box.y - s.y;
        if (delta > o.holeFill * own.h + G) continue;
        const exposed = sky.filter((t) => t.x < own.x + own.w - EPS && t.x + t.w > own.x + EPS)
                           .every((t) => t.owner === own);
        if (!exposed) continue;
        own.h += delta;
        for (const t of sky) if (t.owner === own) t.y = own.y + own.h;
      }

      // Update skyline.
      const next = [];
      for (const s of sky) {
        const a = s.x, b = s.x + s.w;
        if (b <= box.x + EPS || a >= box.x + box.w - EPS) { next.push(s); continue; }
        if (a < box.x - EPS) next.push({ ...s, w: box.x - a });
        if (b > box.x + box.w + EPS) next.push({ ...s, x: box.x + box.w, w: b - box.x - box.w });
      }
      next.push({ x: box.x, w: box.w, y: box.y + box.h, owner: box });
      next.sort((p, q) => p.x - q.x);
      sky = next;
      placed.push(box);
    }

    const height = placed.reduce((m, b) => Math.max(m, b.y + b.h), 0) - G;
    return { height: Math.max(0, height), placed };
  }

  const round = (v) => Math.round(v * 10) / 10;

  function layoutTriangle(boxes, options = {}) {
    const o = {
      width: 1000,        // fixed horizontal size
      gap: 8,             // space between boxes
      baseHeight: null,   // height of an 'm' box; default width * 0.12
      taper: 1,           // 1 = full triangle, 0 = rectangle
      minRowFrac: 0.2,    // narrowest part as a fraction of width
      flex: 0.2,          // how much a box's aspect ratio may change to fit (±20%)
      minScale: 0.7,      // smallest a box may shrink (uniformly) to fill a gap
      maxScale: 1.4,      // largest a box may grow to fill a gap
      holeFill: 0.35,     // a box may grow down by this fraction of its height to close a hole
      chaos: 0.5,         // 0 = tidy, 1 = very jumbled
      seed: 1,            // change for a different jumble
      iterations: 10,
      ...options,
    };
    if (o.baseHeight == null) o.baseHeight = o.width * 0.1;
    if (!boxes.length) return { width: o.width, height: 0, targetHeight: 0, boxes: [] };

    const r = rng(o.seed);
    const items = boxes
      .map((b, idx) => {
        const jitter = 1 + (r() - 0.5) * o.chaos * 0.5;           // ±25% size wobble at chaos 1
        const nh = o.baseHeight * (SIZE_HEIGHT[b.size] || 1) * jitter;
        const imp = Number(b.importance) || 0;
        return { ...b, importance: imp, idx, nh, nw: nh * aspectOf(b),
                 key: imp + (r() - 0.5) * o.chaos * 2.5 };        // chaos lets neighbours swap
      })
      .sort((p, q) => q.key - p.key || p.idx - q.idx);

    const area = items.reduce((s, it) => s + (it.nw + o.gap) * (it.nh + o.gap), 0);
    const H0 = area / (o.width * Math.max(0.3, 1 - o.taper / 2));
    let lo = H0 * 0.25, hi = H0 * 4, best = null, bestErr = Infinity, bestH = H0;
    for (let k = 0; k < o.iterations; k++) {
      const H = (lo + hi) / 2;
      const res = pack(items, H, o);
      const err = Math.abs(res.height - H);
      if (err < bestErr) { best = res; bestErr = err; bestH = H; }
      if (err < 1) break;
      if (res.height > H) lo = H; else hi = H;
    }
    return {
      width: o.width, height: round(best.height), targetHeight: round(bestH),
      boxes: best.placed.map((b) => ({ id: b.it.id, x: round(b.x), y: round(b.y),
        w: round(b.w - o.gap), h: round(b.h - o.gap), importance: b.it.importance, size: b.it.size })),
    };
  }

  const api = { layoutTriangle, SIZE_HEIGHT, ASPECTS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TriangleLayout = api;
})(typeof window !== 'undefined' ? window : globalThis);
