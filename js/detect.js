'use strict';
/* ===== Auto-detect: colour heuristics (offline) for clouds, trees, sunlight, fire;
   COCO-SSD (optional, free) for people and animals, snapped to the WHOLE body ===== */

const ANIMAL_CLASSES = new Set(['dog', 'cat', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe', 'bird']);

function smallGrid(sc, gw) {
  const gh = Math.max(8, Math.round(gw * H / W)), c = makeCanvas(gw, gh), x = c.getContext('2d', { willReadFrequently: true });
  x.drawImage(sc.orig, 0, 0, gw, gh);
  return { gw, gh, d: x.getImageData(0, 0, gw, gh).data };
}
/* connected components of a 0/1 mask; returns [{n,x0,y0,x1,y1}] largest first */
function components(m, gw, gh, minN) {
  const seen = new Uint8Array(gw * gh), out = [];
  for (let i = 0; i < gw * gh; i++) {
    if (!m[i] || seen[i]) continue;
    const st = [i]; seen[i] = 1; let n = 0, x0 = gw, y0 = gh, x1 = 0, y1 = 0;
    while (st.length) {
      const q = st.pop(), x = q % gw, y = (q / gw) | 0; n++;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      if (x > 0 && m[q - 1] && !seen[q - 1]) { seen[q - 1] = 1; st.push(q - 1); }
      if (x < gw - 1 && m[q + 1] && !seen[q + 1]) { seen[q + 1] = 1; st.push(q + 1); }
      if (y > 0 && m[q - gw] && !seen[q - gw]) { seen[q - gw] = 1; st.push(q - gw); }
      if (y < gh - 1 && m[q + gw] && !seen[q + gw]) { seen[q + gw] = 1; st.push(q + gw); }
    }
    if (n >= minN) out.push({ n, x0, y0, x1, y1 });
  }
  return out.sort((a, b) => b.n - a.n);
}
function boxBlurF(a, gw, gh, r) {
  const t = new Float32Array(a.length), o = new Float32Array(a.length);
  for (let y = 0; y < gh; y++) { let s = 0; for (let x = -r; x <= r; x++) s += a[y * gw + clamp(x, 0, gw - 1)]; for (let x = 0; x < gw; x++) { t[y * gw + x] = s / (2 * r + 1); s += a[y * gw + clamp(x + r + 1, 0, gw - 1)] - a[y * gw + clamp(x - r, 0, gw - 1)]; } }
  for (let x = 0; x < gw; x++) { let s = 0; for (let y = -r; y <= r; y++) s += t[clamp(y, 0, gh - 1) * gw + x]; for (let y = 0; y < gh; y++) { o[y * gw + x] = s / (2 * r + 1); s += t[clamp(y + r + 1, 0, gh - 1) * gw + x] - t[clamp(y - r, 0, gh - 1) * gw + x]; } }
  return o;
}
const cRect = (c, gw, gh, pad) => {
  const w = (c.x1 - c.x0 + 1) / gw, h = (c.y1 - c.y0 + 1) / gh, px = w * pad, py = h * pad;
  const x = clamp(c.x0 / gw - px, 0, 1), y = clamp(c.y0 / gh - py, 0, 1);
  return { x, y, w: Math.min(1 - x, w + 2 * px), h: Math.min(1 - y, h + 2 * py) };
};

/* clouds: bright, low-colour blobs that touch blue sky, in the upper part of the picture */
function detectClouds(sc) {
  const { gw, gh, d } = smallGrid(sc, 160), N = gw * gh, sky = new Float32Array(N), cl = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    const R = d[i * 4], G = d[i * 4 + 1], B = d[i * 4 + 2], y = ((i / gw) | 0) / gh, lum = (R + G + B) / 3;
    if (B > R + 18 && B >= G && y < .7) sky[i] = 1;
    if (y < .66 && lum > 175 && Math.max(R, G, B) - Math.min(R, G, B) < 62) cl[i] = 1;
  }
  const near = boxBlurF(sky, gw, gh, 9);
  for (let i = 0; i < N; i++) if (cl[i] && near[i] < .06) cl[i] = 0;
  const cs = components(cl, gw, gh, Math.max(30, N * .004)).filter(c => c.n < N * .6).slice(0, 3);
  return cs.map(c => ({ type: 'cloud', rect: cRect(c, gw, gh, .08), label: 'cloud', extra: { strength: 1 } }));
}
/* trees / leafy plants: green, not too bright, above the ground line */
function detectTrees(sc) {
  const { gw, gh, d } = smallGrid(sc, 140), N = gw * gh, m = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    const R = d[i * 4], G = d[i * 4 + 1], B = d[i * 4 + 2], y = ((i / gw) | 0) / gh, lum = (R + G + B) / 3;
    if (G > R + 6 && G > B + 14 && lum < 185 && lum > 25 && y < .86) m[i] = 1;
  }
  const open = new Uint8Array(N); /* drop thin specks */
  const bl = boxBlurF(Float32Array.from(m), gw, gh, 2);
  for (let i = 0; i < N; i++) open[i] = bl[i] > .55 ? 1 : 0;
  const cs = components(open, gw, gh, Math.max(60, N * .006)).filter(c => c.n < N * .5).slice(0, 4);
  return cs.map(c => {
    const r = cRect(c, gw, gh, .02), tall = r.h > r.w * 1.1;
    return { type: tall ? 'sway' : 'sway', rect: r, label: 'tree / leaves', extra: { strength: .7 } };
  });
}
/* sunlight: the brightest warm spot in the upper half → light rays */
function detectSun(sc) {
  const { gw, gh, d } = smallGrid(sc, 120), N = gw * gh, L = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const R = d[i * 4], G = d[i * 4 + 1], B = d[i * 4 + 2], y = ((i / gw) | 0) / gh;
    L[i] = y < .55 ? (R * .35 + G * .4 + B * .25) + Math.max(0, R - B) * .25 : 0;
  }
  const b = boxBlurF(L, gw, gh, 4); let bi = 0;
  for (let i = 0; i < N; i++) if (b[i] > b[bi]) bi = i;
  if (b[bi] < 195) return [];
  const cx = (bi % gw) / gw, cy = ((bi / gw) | 0) / gh, w = .5, h = .7;
  return [{ type: 'rays', rect: { x: clamp(cx - w / 2, 0, 1 - w), y: 0, w, h }, label: 'sunlight', extra: { strength: .9, mirror: cx > .5 } }];
}
function detectNonLiving(sc) {
  const out = [];
  const f = detectFire(sc);
  if (f) {
    out.push({ type: 'fire', rect: f, label: 'fire', extra: {} });
    const sw = Math.min(.2, f.w * 1.2), sh = Math.min(.3, f.y + .02);
    if (sh > .05) out.push({ type: 'smoke', rect: { x: clamp(f.x + f.w / 2 - sw / 2, 0, 1 - sw), y: Math.max(0, f.y - sh + .03), w: sw, h: sh }, label: 'smoke', extra: { strength: .9 } });
  }
  return out.concat(detectClouds(sc), detectSun(sc), detectTrees(sc));
}

/* ---------- people & animals: whole-body boxes ---------- */
async function bodyPreds(sc, onText) {
  if (sc._bodies) return sc._bodies;
  const preds = await detectObjects(sc.orig, onText);
  sc._bodies = preds.filter(p => p.class === 'person' || ANIMAL_CLASSES.has(p.class)).map(p => ({
    cls: p.class, score: p.score, x: p.bbox[0], y: p.bbox[1], w: p.bbox[2], h: p.bbox[3]
  }));
  return sc._bodies;
}
/* the whole-body detection that best matches a tapped point or a dragged box (pixels); null if none */
async function findWholeBody(sc, q, onText) {
  let list; try { list = await bodyPreds(sc, onText); } catch (e) { console.warn(e); return null; }
  let best = null, bs = 0;
  list.forEach(p => {
    let s = 0;
    if (q.w === undefined) { /* point */
      if (q.x >= p.x && q.x <= p.x + p.w && q.y >= p.y && q.y <= p.y + p.h) s = 1 / (p.w * p.h);
    } else {
      const iw = Math.min(p.x + p.w, q.x + q.w) - Math.max(p.x, q.x), ih = Math.min(p.y + p.h, q.y + q.h) - Math.max(p.y, q.y);
      if (iw > 0 && ih > 0) { const inter = iw * ih, cover = inter / (q.w * q.h), pc = inter / (p.w * p.h); s = Math.min(cover, pc) > .12 ? cover * .6 + pc * .4 : 0; }
    }
    if (s > bs) { bs = s; best = p; }
  });
  if (!best) return null;
  const padx = best.w * .04, pady = best.h * .04, x = clamp(best.x - padx, 0, W - 2), y = clamp(best.y - pady, 0, H - 2);
  return { cls: best.cls, box: { x, y, w: Math.min(W - x, best.w + 2 * padx), h: Math.min(H - y, best.h + 2 * pady) } };
}
/* give a freshly cut-out body its default life: only this body moves */
function applyBodyDefaults(a, cls) {
  if (!a) return;
  if (cls === 'person') { Object.assign(a, { idle: 'sway', idleAmt: 1, head: .8, headFrac: .22, behavior: 'stay', peck: false }); if (/^Cut-out/.test(a.name)) a.name = 'Person'; }
  else if (cls === 'bird') { Object.assign(a, { behavior: 'wander', peck: true, speed: .6, idle: 'breathe', head: 0 }); }
  else { Object.assign(a, { idle: 'breathe', idleAmt: 1.4, head: .5, headFrac: .3, behavior: 'stay', peck: false }); if (cls && /^Cut-out/.test(a.name)) a.name = cls.charAt(0).toUpperCase() + cls.slice(1); }
}
