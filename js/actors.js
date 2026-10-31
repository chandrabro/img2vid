'use strict';
/* ===== Cut-outs ("actors"): masks, hole filling, walking / wandering ===== */

/* ---------- mask helpers (Uint8Array, 0..255, size w*h) ---------- */
function polyMask(pts, w, h) {
  const c = makeCanvas(w, h), x = c.getContext('2d');
  x.fillStyle = '#fff'; x.beginPath();
  pts.forEach((p, i) => i ? x.lineTo(p.x, p.y) : x.moveTo(p.x, p.y));
  x.closePath(); x.fill();
  const d = x.getImageData(0, 0, w, h).data, m = new Uint8Array(w * h);
  for (let i = 0; i < m.length; i++) m[i] = d[i * 4 + 3];
  return m;
}
function boxBlurU8(m, w, h, r) {
  if (r < 1) return m.slice();
  const tmp = new Float32Array(w * h), out = new Uint8Array(w * h), k = 2 * r + 1;
  for (let y = 0; y < h; y++) {
    const o = y * w; let s = 0;
    for (let x = -r; x <= r; x++) s += m[o + clamp(x, 0, w - 1)];
    for (let x = 0; x < w; x++) { tmp[o + x] = s / k; s += m[o + Math.min(w - 1, x + r + 1)] - m[o + Math.max(0, x - r)]; }
  }
  for (let x = 0; x < w; x++) {
    let s = 0;
    for (let y = -r; y <= r; y++) s += tmp[clamp(y, 0, h - 1) * w + x];
    for (let y = 0; y < h; y++) { out[y * w + x] = s / k; s += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x]; }
  }
  return out;
}
function dilateU8(m, w, h, r) {
  if (r < 1) return m.slice();
  const t = new Uint8Array(w * h), o = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let mx = 0; const row = y * w;
    for (let dx = -r; dx <= r; dx++) { const v = m[row + clamp(x + dx, 0, w - 1)]; if (v > mx) mx = v; }
    t[row + x] = mx;
  }
  for (let x = 0; x < w; x++) for (let y = 0; y < h; y++) {
    let mx = 0;
    for (let dy = -r; dy <= r; dy++) { const v = t[clamp(y + dy, 0, h - 1) * w + x]; if (v > mx) mx = v; }
    o[y * w + x] = mx;
  }
  return o;
}
function erodeU8(m, w, h, r) {
  const inv = new Uint8Array(m.length); for (let i = 0; i < m.length; i++) inv[i] = 255 - m[i];
  const d = dilateU8(inv, w, h, r); for (let i = 0; i < d.length; i++) d[i] = 255 - d[i];
  return d;
}
function largestComp(m, w, h, prefer) {
  const N = w * h, lab = new Int32Array(N), stack = new Int32Array(N);
  let best = 0, bestScore = -1, nl = 0;
  for (let i = 0; i < N; i++) {
    if (m[i] < 128 || lab[i]) continue;
    nl++; let sp = 0, area = 0, pc = 0;
    stack[sp++] = i; lab[i] = nl;
    while (sp) {
      const q = stack[--sp]; area++;
      if (prefer && prefer(q)) pc++;
      const x = q % w, y = (q / w) | 0;
      if (x > 0 && m[q - 1] >= 128 && !lab[q - 1]) { lab[q - 1] = nl; stack[sp++] = q - 1; }
      if (x < w - 1 && m[q + 1] >= 128 && !lab[q + 1]) { lab[q + 1] = nl; stack[sp++] = q + 1; }
      if (y > 0 && m[q - w] >= 128 && !lab[q - w]) { lab[q - w] = nl; stack[sp++] = q - w; }
      if (y < h - 1 && m[q + w] >= 128 && !lab[q + w]) { lab[q + w] = nl; stack[sp++] = q + w; }
    }
    const score = area + pc * 8;
    if (score > bestScore) { bestScore = score; best = nl; }
  }
  const out = new Uint8Array(N);
  if (best) for (let i = 0; i < N; i++) if (lab[i] === best) out[i] = 255;
  return out;
}
function fillHolesU8(m, w, h) {
  const N = w * h, reach = new Uint8Array(N), stack = new Int32Array(N); let sp = 0;
  const push = i => { if (m[i] < 128 && !reach[i]) { reach[i] = 1; stack[sp++] = i; } };
  for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
  while (sp) {
    const q = stack[--sp], x = q % w, y = (q / w) | 0;
    if (x > 0) push(q - 1); if (x < w - 1) push(q + 1); if (y > 0) push(q - w); if (y < h - 1) push(q + w);
  }
  const out = m.slice();
  for (let i = 0; i < N; i++) if (m[i] < 128 && !reach[i]) out[i] = 255;
  return out;
}
function bboxU8(m, w, h, thr) {
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (m[y * w + x] >= thr) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}
function refineMask(m, w, h, grow, feather) {
  let o = m.slice();
  for (let i = 0; i < o.length; i++) o[i] = o[i] >= 128 ? 255 : 0;
  if (grow > 0) o = dilateU8(o, w, h, grow); else if (grow < 0) o = erodeU8(o, w, h, -grow);
  if (feather > 0) o = boxBlurU8(boxBlurU8(o, w, h, feather), w, h, Math.max(1, feather - 1));
  return o;
}

/* ---------- hole filling (push-pull + smoothing + matching grain) ---------- */
/* Smooth fill of the hole from its surroundings (push-pull pyramid + smoothing). Returns colour arrays. */
function pushPullArrays(d, w, h, known) {
  const mk = (lw, lh) => ({ w: lw, h: lh, r: new Float32Array(lw * lh), g: new Float32Array(lw * lh), b: new Float32Array(lw * lh), has: new Uint8Array(lw * lh) });
  const N = w * h, lv = [mk(w, h)];
  for (let i = 0; i < N; i++) if (known[i]) { lv[0].r[i] = d[i * 4]; lv[0].g[i] = d[i * 4 + 1]; lv[0].b[i] = d[i * 4 + 2]; lv[0].has[i] = 1; }
  while (lv[lv.length - 1].w > 2 && lv[lv.length - 1].h > 2) {
    const f = lv[lv.length - 1], nw = (f.w + 1) >> 1, nh = (f.h + 1) >> 1, n = mk(nw, nh), cnt = new Uint16Array(nw * nh);
    for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) {
      const i = y * f.w + x; if (!f.has[i]) continue;
      const j = (y >> 1) * nw + (x >> 1); n.r[j] += f.r[i]; n.g[j] += f.g[i]; n.b[j] += f.b[i]; cnt[j]++;
    }
    for (let j = 0; j < nw * nh; j++) if (cnt[j]) { n.r[j] /= cnt[j]; n.g[j] /= cnt[j]; n.b[j] /= cnt[j]; n.has[j] = 1; }
    lv.push(n);
  }
  const top = lv[lv.length - 1]; let mr = 0, mg = 0, mb = 0, mc = 0;
  for (let i = 0; i < top.has.length; i++) if (top.has[i]) { mr += top.r[i]; mg += top.g[i]; mb += top.b[i]; mc++; }
  mr /= mc || 1; mg /= mc || 1; mb /= mc || 1;
  for (let i = 0; i < top.has.length; i++) if (!top.has[i]) { top.r[i] = mr; top.g[i] = mg; top.b[i] = mb; top.has[i] = 1; }
  for (let l = lv.length - 2; l >= 0; l--) {
    const f = lv[l], c = lv[l + 1];
    for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) {
      const i = y * f.w + x; if (f.has[i]) continue;
      const fx = (x + .5) / 2 - .5, fy = (y + .5) / 2 - .5, fx0 = Math.floor(fx), fy0 = Math.floor(fy);
      const ax = clamp(fx0, 0, c.w - 1), ay = clamp(fy0, 0, c.h - 1), bx = clamp(fx0 + 1, 0, c.w - 1), by = clamp(fy0 + 1, 0, c.h - 1);
      const tx = fx - fx0, ty = fy - fy0;
      const q = arr => (arr[ay * c.w + ax] * (1 - tx) + arr[ay * c.w + bx] * tx) * (1 - ty) + (arr[by * c.w + ax] * (1 - tx) + arr[by * c.w + bx] * tx) * ty;
      f.r[i] = q(c.r); f.g[i] = q(c.g); f.b[i] = q(c.b); f.has[i] = 1;
    }
  }
  let R = lv[0].r, G = lv[0].g, B = lv[0].b, R2 = R.slice(), G2 = G.slice(), B2 = B.slice();
  for (let it = 0; it < 14; it++) {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x; if (known[i]) continue;
      let r = 0, g = 0, b = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue; const j = clamp(y + dy, 0, h - 1) * w + clamp(x + dx, 0, w - 1); r += R[j]; g += G[j]; b += B[j];
      }
      R2[i] = r / 8; G2[i] = g / 8; B2[i] = b / 8;
    }
    [R, R2] = [R2, R]; [G, G2] = [G2, G]; [B, B2] = [B2, B];
  }
  return { R, G, B };
}

/* Main hole filler: smooth tones from the surroundings + fine ground grain copied from a nearby patch. */
function inpaintRegion(cv, x0, y0, w, h, hole) {
  const ctx = cv.getContext('2d');
  const S = Math.round(Math.max(w, h) * 1.8);
  const wx0 = Math.max(0, x0 - S), wy0 = Math.max(0, y0 - S), wx1 = Math.min(cv.width, x0 + w + S), wy1 = Math.min(cv.height, y0 + h + S);
  const ww = wx1 - wx0, wh = wy1 - wy0, id = ctx.getImageData(wx0, wy0, ww, wh), d = id.data, N = ww * wh;
  const hm = new Uint8Array(N), known = new Uint8Array(N);
  let hx0 = ww, hy0 = wh, hx1 = -1, hy1 = -1, nh = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (hole[y * w + x] < 128) continue;
    const X = x + x0 - wx0, Y = y + y0 - wy0; hm[Y * ww + X] = 255; nh++;
    if (X < hx0) hx0 = X; if (X > hx1) hx1 = X; if (Y < hy0) hy0 = Y; if (Y > hy1) hy1 = Y;
  }
  if (!nh || nh === N) return;
  for (let i = 0; i < N; i++) known[i] = hm[i] ? 0 : 1;
  const { R, G, B } = pushPullArrays(d, ww, wh, known);
  /* high-frequency detail of the picture (value minus its local average) */
  const chan = o => { const a = new Uint8Array(N); for (let i = 0; i < N; i++) a[i] = d[i * 4 + o]; return a; };
  const cr = chan(0), cg = chan(1), cb = chan(2), br = boxBlurU8(cr, ww, wh, 5), bg = boxBlurU8(cg, ww, wh, 5), bb = boxBlurU8(cb, ww, wh, 5);
  const rough = i => Math.abs(cr[i] - br[i]) + Math.abs(cg[i] - bg[i]) + Math.abs(cb[i] - bb[i]);
  const dil = dilateU8(hm, ww, wh, 7);
  let tr = 0, tn = 0;
  for (let y = 0; y < wh; y += 3) for (let x = 0; x < ww; x += 3) { const i = y * ww + x; if (!dil[i]) { tr += rough(i); tn++; } }
  const target = tn ? tr / tn : 0;
  const soft = boxBlurU8(hm, ww, wh, 3), nr = rng(7), amp = clamp(target * .22, 0, 3.5);
  for (let y = hy0; y <= hy1; y++) for (let x = hx0; x <= hx1; x++) {
    const i = y * ww + x; if (!hm[i]) continue;
    const n = (nr() - .5) * 2 * amp * clamp((soft[i] / 255 - .5) * 2.4, 0, 1);
    d[i * 4] = clamp(R[i] + n, 0, 255); d[i * 4 + 1] = clamp(G[i] + n, 0, 255); d[i * 4 + 2] = clamp(B[i] + n, 0, 255); d[i * 4 + 3] = 255;
  }
  ctx.putImageData(id, wx0, wy0);
}

/* ---------- actor creation ---------- */
function rebuildActors(sc) {
  const bctx = sc.base.getContext('2d');
  bctx.clearRect(0, 0, W, H); bctx.drawImage(sc.orig, 0, 0);
  sc.actors.forEach(a => { a._sched = null; buildActorCut(sc, a, true); });
}
function buildActorCut(sc, a, inpaint) {
  const bx = clamp(Math.round(a.nx * W), 0, W - 2), by = clamp(Math.round(a.ny * H), 0, H - 2);
  const bw = clamp(Math.round(a.nw * W), 2, W - bx), bh = clamp(Math.round(a.nh * H), 2, H - by);
  const m = makeCanvas(bw, bh); m.getContext('2d').drawImage(a.mask, 0, 0, bw, bh);
  const cut = makeCanvas(bw, bh), cx = cut.getContext('2d');
  cx.drawImage(sc.base, bx, by, bw, bh, 0, 0, bw, bh);
  cx.globalCompositeOperation = 'destination-in'; cx.drawImage(m, 0, 0);
  a.cut = cut;
  if (inpaint && a.behavior !== 'stay') { /* only things that walk away leave a hole that needs filling */
    const M = Math.max(10, Math.round(.15 * Math.max(bw, bh)));
    const rx = Math.max(0, bx - M), ry = Math.max(0, by - M), rw = Math.min(W, bx + bw + M) - rx, rh = Math.min(H, by + bh + M) - ry;
    const rc = makeCanvas(rw, rh), rctx = rc.getContext('2d'); rctx.drawImage(m, bx - rx, by - ry);
    const al = rctx.getImageData(0, 0, rw, rh).data, hole = new Uint8Array(rw * rh);
    for (let i = 0; i < hole.length; i++) hole[i] = al[i * 4 + 3] >= 40 ? 255 : 0;
    inpaintRegion(sc.base, rx, ry, rw, rh, dilateU8(hole, rw, rh, 6));
  }
}
function commitCut(mask, nameHint, behavior) {
  const sc = curScene(); if (!sc) return null;
  const grow = +$('#cutGrow').value, fe = +$('#cutFeather').value;
  const m = refineMask(mask, W, H, grow, fe);
  let bb = bboxU8(m, W, H, 40);
  if (!bb || bb.w * bb.h < 60) { toast('That area is too small to cut out. Try again.'); return null; }
  const x0 = Math.max(0, bb.x - 2), y0 = Math.max(0, bb.y - 2), x1 = Math.min(W, bb.x + bb.w + 2), y1 = Math.min(H, bb.y + bb.h + 2);
  bb = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  const mc = makeCanvas(bb.w, bb.h), mctx = mc.getContext('2d'), id = mctx.createImageData(bb.w, bb.h);
  for (let y = 0; y < bb.h; y++) for (let x = 0; x < bb.w; x++) {
    const o = (y * bb.w + x) * 4; id.data[o] = id.data[o + 1] = id.data[o + 2] = 255; id.data[o + 3] = m[(bb.y + y) * W + bb.x + x];
  }
  mctx.putImageData(id, 0, 0);
  const a = {
    kind: 'actor', name: nameHint || ('Cut-out ' + (sc.actors.length + 1)),
    nx: bb.x / W, ny: bb.y / H, nw: bb.w / W, nh: bb.h / H, mask: mc, cut: null,
    behavior: behavior || 'stay', idle: 'breathe', idleAmt: 1, head: 0, headFrac: .25, facesLeft: false, speed: 1, size: 1, gait: 1, bob: 1, peck: false, shadow: true, persp: true, delay: 0,
    path: [], area: null, seed: Math.random()
  };
  buildActorCut(sc, a, true);
  sc.actors.push(a);
  PA.selKind = 'actor'; PA.selIdx = sc.actors.length - 1;
  if (typeof refreshAll === 'function') refreshAll();
  return a;
}
function deleteActor(i) {
  const sc = curScene(); if (!sc || !sc.actors[i]) return;
  sc.actors.splice(i, 1);
  rebuildActors(sc);
  PA.selKind = null; PA.selIdx = -1;
}

/* ---------- automatic cut: colour model inside a box ---------- */
function boxCutMask(box) {
  const sc = curScene(), base = sc.orig;
  const mx = Math.round(box.w * .18), my = Math.round(box.h * .18);
  const cx0 = clamp(Math.floor(box.x - mx), 0, W - 2), cy0 = clamp(Math.floor(box.y - my), 0, H - 2);
  const cx1 = clamp(Math.ceil(box.x + box.w + mx), cx0 + 2, W), cy1 = clamp(Math.ceil(box.y + box.h + my), cy0 + 2, H);
  const cw = cx1 - cx0, ch = cy1 - cy0, k = Math.min(1, 180 / Math.max(cw, ch));
  const sw = Math.max(8, Math.round(cw * k)), sh = Math.max(8, Math.round(ch * k)), N = sw * sh;
  const sc2 = makeCanvas(sw, sh), sctx = sc2.getContext('2d', { willReadFrequently: true });
  sctx.drawImage(base, cx0, cy0, cw, ch, 0, 0, sw, sh);
  const d = sctx.getImageData(0, 0, sw, sh).data, bin = new Uint16Array(N);
  for (let i = 0; i < N; i++) bin[i] = ((d[i * 4] >> 4) << 8) | ((d[i * 4 + 1] >> 4) << 4) | (d[i * 4 + 2] >> 4);
  const bx0 = (box.x - cx0) * sw / cw, by0 = (box.y - cy0) * sh / ch, bx1 = bx0 + box.w * sw / cw, by1 = by0 + box.h * sh / ch;
  const ecx = (bx0 + bx1) / 2, ecy = (by0 + by1) / 2, erx = Math.max(1, (bx1 - bx0) / 2), ery = Math.max(1, (by1 - by0) / 2);
  const inBox = new Uint8Array(N), rr = new Float32Array(N);
  for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
    const i = y * sw + x; inBox[i] = (x >= bx0 && x < bx1 && y >= by0 && y < by1) ? 1 : 0;
    rr[i] = Math.hypot((x + .5 - ecx) / erx, (y + .5 - ecy) / ery);
  }
  let label = new Uint8Array(N);
  for (let i = 0; i < N; i++) label[i] = inBox[i] && rr[i] < .55 ? 1 : 0;
  const majority = (l) => {
    const o = new Uint8Array(N);
    for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
      let c = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) c += l[clamp(y + dy, 0, sh - 1) * sw + clamp(x + dx, 0, sw - 1)];
      o[y * sw + x] = c >= 5 ? 1 : 0;
    }
    return o;
  };
  const score = new Float32Array(N);
  for (let iter = 0; iter < 4; iter++) {
    const fg = new Float32Array(4096), bg = new Float32Array(4096); let nf = 0, nb = 0;
    for (let i = 0; i < N; i++) {
      if (!inBox[i]) { bg[bin[i]] += 1; nb += 1; }
      else if (label[i]) { fg[bin[i]] += 1; nf += 1; }
      else if (iter === 0 ? rr[i] > 1.15 : true) { const w8 = iter === 0 ? 1 : .6; bg[bin[i]] += w8; nb += w8; }
    }
    let next = new Uint8Array(N);
    for (let i = 0; i < N; i++) {
      if (!inBox[i]) continue;
      const lf = Math.log((fg[bin[i]] + .4) / (nf + 1638)), lb = Math.log((bg[bin[i]] + .4) / (nb + 1638));
      const prior = clamp(1.3 * (.95 - rr[i]), -1.4, 1.4);
      score[i] = lf - lb + prior;
      next[i] = score[i] > 0 ? 1 : 0;
    }
    next = majority(majority(next));
    const m255 = new Uint8Array(N); for (let i = 0; i < N; i++) m255[i] = next[i] ? 255 : 0;
    const comp = fillHolesU8(largestComp(m255, sw, sh, q => rr[q] < .45), sw, sh);
    for (let i = 0; i < N; i++) label[i] = comp[i] ? 1 : 0;
  }
  for (let g = 0; g < 3; g++) {
    const add = [];
    for (let y = 1; y < sh - 1; y++) for (let x = 1; x < sw - 1; x++) {
      const i = y * sw + x;
      if (label[i] || !inBox[i] || score[i] < -.9) continue;
      if (label[i - 1] || label[i + 1] || label[i - sw] || label[i + sw]) add.push(i);
    }
    add.forEach(i => { label[i] = 1; });
  }
  const out = new Uint8Array(W * H);
  for (let y = cy0; y < cy1; y++) for (let x = cx0; x < cx1; x++) {
    if (x < box.x || x >= box.x + box.w || y < box.y || y >= box.y + box.h) continue;
    const sx = Math.min(sw - 1, ((x - cx0) * sw / cw) | 0), sy = Math.min(sh - 1, ((y - cy0) * sh / ch) | 0);
    if (label[sy * sw + sx]) out[y * W + x] = 255;
  }
  const sm = boxBlurU8(out, W, H, 2);
  for (let i = 0; i < sm.length; i++) sm[i] = sm[i] >= 128 ? 255 : 0;
  return sm;
}

/* ---------- actor motion ---------- */
const actorOrigin = a => ({ x: (a.nx + a.nw / 2) * W, y: (a.ny + a.nh) * H });
const actorSpeedPx = a => a.speed * W * .05;
const peckAmt = tau => Math.max(0, Math.sin((tau / .6) * Math.PI * 2));

function idleState(a, t, o) {
  let pk = 0;
  if (a.peck) { const tau = ((t % 3.4) + 3.4) % 3.4; pk = tau < 1.8 ? peckAmt(tau) : 0; }
  return { x: o.x, y: o.y, dir: a.facesLeft ? -1 : 1, moving: false, dist: 0, pk };
}
function walkState(a, t) {
  const o = actorOrigin(a), pts = [o].concat(a.path.map(p => ({ x: p.x * W, y: p.y * H })));
  const lens = []; let L = 0;
  for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); lens.push(l); L += l; }
  if (L < 4) return idleState(a, t, o);
  const v = actorSpeedPx(a), Tm = L / v, pause = 1.5, period = 2 * (Tm + pause);
  const u = ((t % period) + period) % period;
  let s, forward, moving = true, tau = 0;
  if (u < Tm) { s = u * v; forward = true; }
  else if (u < Tm + pause) { s = L; forward = true; moving = false; tau = u - Tm; }
  else if (u < 2 * Tm + pause) { s = (2 * Tm + pause - u) * v; forward = false; }
  else { s = 0; forward = false; moving = false; tau = u - (2 * Tm + pause); }
  let rem = s, i = 0;
  while (i < lens.length - 1 && rem > lens[i]) { rem -= lens[i]; i++; }
  const f = lens[i] ? clamp(rem / lens[i], 0, 1) : 0;
  const x = lerp(pts[i].x, pts[i + 1].x, f), y = lerp(pts[i].y, pts[i + 1].y, f);
  const overall = Math.sign(pts[pts.length - 1].x - pts[0].x) || 1;
  const sdx = pts[i + 1].x - pts[i].x;
  let dir = Math.abs(sdx) > .15 * lens[i] ? Math.sign(sdx) : overall;
  if (!forward) dir = Math.abs(sdx) > .15 * lens[i] ? -Math.sign(sdx) : -overall;
  const dist = forward ? s : L + (L - s);
  return { x, y, dir, moving, dist, pk: (!moving && a.peck) ? peckAmt(tau) : 0 };
}
function wanderSched(a) {
  const key = [a.speed, W, H, a.nx, a.ny, JSON.stringify(a.area)].join();
  if (a._sched && a._schedKey === key) return a._sched;
  const rnd = rng(a.seed), o = actorOrigin(a);
  const ar = a.area ? { x: a.area.x * W, y: a.area.y * H, w: a.area.w * W, h: a.area.h * H } : { x: o.x - W * .12, y: o.y - H * .04, w: W * .24, h: H * .08 };
  const v = actorSpeedPx(a); let tt = 0, cx = o.x, cy = o.y, dist = 0, lastDir = a.facesLeft ? -1 : 1;
  const segs = [];
  for (let k = 0; k <= 9; k++) {
    const nx = k === 9 ? o.x : ar.x + rnd() * ar.w, ny = k === 9 ? o.y : ar.y + rnd() * ar.h;
    const dd = Math.hypot(nx - cx, ny - cy);
    if (dd > 6) {
      const dur = dd / v; if (Math.abs(nx - cx) > 2) lastDir = Math.sign(nx - cx);
      segs.push({ t0: tt, t1: tt + dur, x0: cx, y0: cy, x1: nx, y1: ny, move: true, d0: dist, dd, dir: lastDir });
      tt += dur; dist += dd; cx = nx; cy = ny;
    }
    const idle = 1.2 + rnd() * 2.6;
    segs.push({ t0: tt, t1: tt + idle, x0: cx, y0: cy, x1: cx, y1: cy, move: false, d0: dist, dd: 0, dir: lastDir });
    tt += idle;
  }
  a._sched = { segs, total: tt }; a._schedKey = key;
  return a._sched;
}
function wanderState(a, t) {
  const S = wanderSched(a), tt = ((t % S.total) + S.total) % S.total;
  let seg = S.segs[S.segs.length - 1];
  for (const s of S.segs) if (tt < s.t1) { seg = s; break; }
  const f = seg.t1 > seg.t0 ? clamp((tt - seg.t0) / (seg.t1 - seg.t0), 0, 1) : 0;
  return {
    x: lerp(seg.x0, seg.x1, f), y: lerp(seg.y0, seg.y1, f), dir: seg.dir, moving: seg.move,
    dist: seg.d0 + f * seg.dd, pk: (!seg.move && a.peck && tt - seg.t0 > .25) ? peckAmt(tt - seg.t0 - .25) : 0
  };
}
function actorStateAt(a, t) {
  const tt = Math.max(0, t - (a.delay || 0));
  return a.behavior === 'walk' ? walkState(a, tt) : a.behavior === 'wander' ? wanderState(a, tt) : idleState(a, tt, actorOrigin(a));
}
function drawActor(sc, a, st, t) {
  if (!a.cut) return;
  const bw = a.cut.width, bh = a.cut.height, o = actorOrigin(a), hy = sc.horizon * H;
  let s = a.size;
  if (a.persp && o.y > hy + 4) s *= clamp((st.y - hy) / (o.y - hy), .45, 2.2);
  const flip = ((st.dir > 0) !== a.facesLeft) ? 1 : -1;
  const step = Math.max(6, bw * .4), ph = st.dist / step * Math.PI;
  const bob = st.moving ? Math.abs(Math.sin(ph)) * bh * .035 * a.bob : 0;
  const rock = st.moving ? Math.sin(ph) * .035 * a.bob : 0;
  const amt = a.idleAmt == null ? 1 : a.idleAmt, idle = a.idle || 'breathe', sd = a.seed * 6;
  let breath = 0, sway = 0;
  if (!st.moving) {
    if (idle === 'sleep') breath = Math.sin(t * 1.3 + sd) * .02 * amt;
    else if (idle === 'none') breath = 0;
    else breath = Math.sin(t * 2.2 + sd) * (idle === 'sway' ? .014 : .012) * amt;
    if (idle === 'sway') sway = Math.sin(t * 1.25 + sd) * .012 * amt + Math.sin(t * .6 + sd * 2) * .006 * amt;
  }
  const rot = rock + st.pk * .42 + sway;
  /* head-only nod (rotates just the top part of the body about the neck) */
  const headA = (a.head > 0 && !st.moving && st.pk === 0) ? Math.max(0, Math.sin(t * 1.5 + sd)) * Math.max(0, Math.sin(t * .47 + sd)) * .16 * a.head : 0;
  if (a.shadow) {
    const rx = bw * s * .42;
    vctx.save(); vctx.translate(st.x, st.y - 1); vctx.scale(1, .2);
    const g = vctx.createRadialGradient(0, 0, 0, 0, 0, rx);
    g.addColorStop(0, 'rgba(0,0,0,.34)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    vctx.fillStyle = g; vctx.beginPath(); vctx.arc(0, 0, rx, 0, 6.283); vctx.fill(); vctx.restore();
  }
  vctx.save();
  vctx.translate(st.x, st.y - bob * s);
  vctx.scale(s * flip, s * (1 + breath - st.pk * .05));
  vctx.rotate(rot);
  vctx.translate(-bw / 2, -bh);
  if (st.moving && a.gait > 0) {
    for (let y = 0; y < bh; y += 2) {
      const hh = Math.min(3, bh - y), wy = y / bh, leg = smooth((wy - .5) / .5);
      const dx = Math.sin(ph) * bw * .045 * a.gait * leg;
      vctx.drawImage(a.cut, 0, y, bw, hh, dx, y, bw, hh);
    }
  } else if (headA > .002) {
    const hf = clamp(a.headFrac || .25, .1, .45), hh = Math.max(2, Math.round(bh * hf));
    vctx.drawImage(a.cut, 0, hh, bw, bh - hh, 0, hh, bw, bh - hh);
    vctx.save(); vctx.translate(bw / 2, hh); vctx.rotate(headA * (a.facesLeft ? -1 : 1)); vctx.translate(-bw / 2, -hh);
    vctx.drawImage(a.cut, 0, 0, bw, hh + 1, 0, 0, bw, hh + 1); vctx.restore();
  } else vctx.drawImage(a.cut, 0, 0);
  vctx.restore();
}
function drawActors(sc, t) {
  if (!sc.actors.length) return;
  const items = sc.actors.map(a => ({ a, st: actorStateAt(a, t) }));
  items.sort((p, q) => p.st.y - q.st.y);
  items.forEach(it => drawActor(sc, it.a, it.st, t));
}
