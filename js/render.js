'use strict';
/* ===== Scene rendering: layers, light, camera, captions, transitions ===== */
const LIGHTS = {
  none:     { label: 'Natural light', mul: [255, 255, 255], glow: [255, 255, 255, 0], gx: .5, gy: .1, vig: 0 },
  dawn:     { label: '🌄 Dawn', mul: [255, 214, 204], glow: [255, 150, 95, .30], gx: .8, gy: .5, vig: .15 },
  morning:  { label: '🌤 Morning', mul: [255, 245, 226], glow: [255, 232, 175, .16], gx: .85, gy: .1, vig: .06 },
  noon:     { label: '☀️ Noon', mul: [255, 255, 250], glow: [255, 255, 255, .05], gx: .5, gy: 0, vig: .04 },
  sunset:   { label: '🌇 Sunset', mul: [255, 198, 142], glow: [255, 120, 50, .34], gx: .2, gy: .55, vig: .25 },
  dusk:     { label: '🌆 Dusk', mul: [176, 152, 205], glow: [255, 110, 120, .18], gx: .15, gy: .6, vig: .30 },
  night:    { label: '🌙 Night', mul: [72, 92, 152], glow: [120, 150, 255, .08], gx: .8, gy: .15, vig: .45 },
  overcast: { label: '☁️ Overcast', mul: [205, 214, 224], glow: [255, 255, 255, 0], gx: .5, gy: .1, vig: .15 }
};
function lightAt(sc, tl) {
  const a = LIGHTS[sc.light.from] || LIGHTS.none, b = LIGHTS[sc.light.to] || LIGHTS.none;
  if (sc.light.from === 'none' && sc.light.to === 'none') return null;
  const p = smooth(tl / Math.max(1, sc.dur)), L = {};
  L.mul = a.mul.map((v, i) => lerp(v, b.mul[i], p));
  L.glow = a.glow.map((v, i) => lerp(v, b.glow[i], p));
  L.gx = lerp(a.gx, b.gx, p); L.gy = lerp(a.gy, b.gy, p); L.vig = lerp(a.vig, b.vig, p);
  return L;
}
function applyLight(ctx, L) {
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = `rgb(${L.mul[0] | 0},${L.mul[1] | 0},${L.mul[2] | 0})`; ctx.fillRect(0, 0, W, H);
  if (L.glow[3] > .005) {
    ctx.globalCompositeOperation = 'screen';
    const g = ctx.createRadialGradient(L.gx * W, L.gy * H, 0, L.gx * W, L.gy * H, W * .85);
    g.addColorStop(0, `rgba(${L.glow[0] | 0},${L.glow[1] | 0},${L.glow[2] | 0},${L.glow[3]})`);
    g.addColorStop(1, `rgba(${L.glow[0] | 0},${L.glow[1] | 0},${L.glow[2] | 0},0)`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  if (L.vig > .005) {
    ctx.globalCompositeOperation = 'source-over';
    const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .35, W / 2, H / 2, Math.max(W, H) * .75);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${L.vig})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();
}

function present(sc, tctx, tl) {
  const cam = camParams(sc, tl);
  if (sc.depthOn && sc.depth && glPresent(sc, tctx, cam)) return;
  const z = cam.zoom + cam.push * .5, px = (cam.pan[0] + cam.shift[0] * .6) * W, py = (cam.pan[1] + cam.shift[1] * .6) * H;
  tctx.save();
  tctx.translate(W / 2 - px, H / 2 - py); tctx.scale(z, z); tctx.translate(-W / 2, -H / 2);
  tctx.drawImage(sc.comp, 0, 0);
  tctx.restore();
}

function drawCaption(tctx, sc, tl) {
  const txt = (sc.caption || '').trim();
  if (!txt) return;
  const D = sc.dur, a = clamp(Math.min((tl - .4) / .8, (D - tl) / .8), 0, 1);
  if (a <= 0) return;
  const fs = Math.max(12, Math.round(W / 30));
  tctx.save();
  tctx.font = `600 ${fs}px system-ui,-apple-system,Segoe UI,Roboto,sans-serif`;
  const maxW = W * .84, words = txt.split(/\s+/), lines = []; let cur = '';
  words.forEach(wd => { const test = cur ? cur + ' ' + wd : wd; if (tctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = wd; } else cur = test; });
  if (cur) lines.push(cur);
  const lh = fs * 1.3, bh = lines.length * lh + fs * .8;
  let bw = 0; lines.forEach(l => { bw = Math.max(bw, tctx.measureText(l).width); }); bw += fs * 1.6;
  const x = (W - bw) / 2, y = H - bh - fs * .9;
  tctx.globalAlpha = a; tctx.fillStyle = 'rgba(0,0,0,.55)'; tctx.beginPath();
  if (tctx.roundRect) tctx.roundRect(x, y, bw, bh, fs * .5); else tctx.rect(x, y, bw, bh);
  tctx.fill();
  tctx.fillStyle = '#fff'; tctx.textAlign = 'center'; tctx.textBaseline = 'middle';
  lines.forEach((l, i) => tctx.fillText(l, W / 2, y + fs * .4 + lh * (i + .5)));
  tctx.restore();
}

function renderSceneTo(sc, tctx, t, tl) {
  const cx = sc.compCtx;
  vctx = cx; src = sc.base;
  cx.globalCompositeOperation = 'source-over'; cx.globalAlpha = 1;
  cx.drawImage(sc.base, 0, 0);
  for (const r of sc.regions) drawRegion(r, t, tl, 'normal');
  drawActors(sc, t);
  for (const r of sc.regions) drawRegion(r, t, tl, 'top');
  const L = lightAt(sc, tl); if (L) applyLight(cx, L);
  for (const r of sc.regions) drawRegion(r, t, tl, 'emis');
  present(sc, tctx, tl);
  applyLook(tctx, sc, t);
  drawCaption(tctx, sc, tl);
}

/* ---------- whole-project rendering with transitions ---------- */
const BUF = [null, null];
function ensureBufs() {
  for (let i = 0; i < 2; i++) {
    if (!BUF[i] || BUF[i].width !== W || BUF[i].height !== H) { BUF[i] = makeCanvas(W, H); }
  }
}
function composeTransition(tctx, A, B, q, type) {
  const e = smooth(q);
  tctx.save();
  if (type === 'dip') {
    tctx.drawImage(q < .5 ? A : B, 0, 0);
    tctx.fillStyle = `rgba(0,0,0,${q < .5 ? q * 2 : (1 - q) * 2})`; tctx.fillRect(0, 0, W, H);
  } else if (type === 'slide') {
    tctx.drawImage(A, -W * e, 0); tctx.drawImage(B, W * (1 - e), 0);
  } else if (type === 'wipe') {
    tctx.drawImage(A, 0, 0);
    tctx.beginPath(); tctx.rect(0, 0, W * e, H); tctx.clip(); tctx.drawImage(B, 0, 0);
  } else {
    tctx.drawImage(A, 0, 0); tctx.globalAlpha = e; tctx.drawImage(B, 0, 0);
  }
  tctx.restore();
}
function renderProject(T, tctx) {
  const L = projectLayout();
  T = clamp(T, 0, Math.max(0, L.total - .001));
  const act = L.items.filter(it => T >= it.start && T < it.end);
  if (act.length <= 1) {
    const it = act[0] || L.items[L.items.length - 1];
    renderSceneTo(PA.scenes[it.i], tctx, T - it.start, T - it.start);
    return;
  }
  ensureBufs();
  const a = act[0], b = act[act.length - 1], ov = Math.max(.001, overlapOf(a.i));
  const q = clamp((T - b.start) / ov, 0, 1);
  const actx = BUF[0].getContext('2d'), bctx = BUF[1].getContext('2d');
  renderSceneTo(PA.scenes[a.i], actx, T - a.start, T - a.start);
  renderSceneTo(PA.scenes[b.i], bctx, T - b.start, T - b.start);
  composeTransition(tctx, BUF[0], BUF[1], q, PA.scenes[a.i].transType);
}

/* ---------- film look: grade, bloom, grain, letterbox (all free canvas maths) ---------- */
const GRADES = {
  none: '', cinematic: 'contrast(1.12) saturate(1.08) sepia(.1)', warm: 'sepia(.22) saturate(1.2) contrast(1.05) brightness(1.03)',
  vintage: 'sepia(.4) contrast(.95) saturate(.8) brightness(1.02)', vivid: 'saturate(1.4) contrast(1.08)', cool: 'saturate(.95) hue-rotate(-8deg) contrast(1.06) brightness(.98)',
  bw: 'grayscale(1) contrast(1.12)', soft: 'brightness(1.05) saturate(.92) contrast(.94)'
};
let LOOKBUF = null, GRAIN = null;
function grainTile() {
  if (GRAIN) return GRAIN;
  const c = makeCanvas(256, 256), x = c.getContext('2d'), id = x.createImageData(256, 256), r = rng(5);
  for (let i = 0; i < 65536; i++) { const v = 128 + (r() - .5) * 150; id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = v; id.data[i * 4 + 3] = 255; }
  x.putImageData(id, 0, 0); return (GRAIN = c);
}
function applyLook(tctx, sc, t) {
  const L = sc.look; if (!L) return;
  const g = GRADES[L.grade] || '';
  if ((g || L.bloom > 0) && !('filter' in tctx)) { /* Safari: no canvas filters; grain and bars still work */ }
  else if (g || L.bloom > 0) {
    if (!LOOKBUF || LOOKBUF.width !== W || LOOKBUF.height !== H) LOOKBUF = makeCanvas(W, H);
    const b = LOOKBUF.getContext('2d');
    if (g) {
      b.clearRect(0, 0, W, H); b.drawImage(tctx.canvas, 0, 0);
      tctx.save(); tctx.filter = g; tctx.drawImage(LOOKBUF, 0, 0); tctx.restore();
    }
    if (L.bloom > 0) {
      b.clearRect(0, 0, W, H); b.filter = `blur(${Math.max(4, W / 90)}px) brightness(1.25)`; b.drawImage(tctx.canvas, 0, 0); b.filter = 'none';
      tctx.save(); tctx.globalCompositeOperation = 'screen'; tctx.globalAlpha = clamp(L.bloom, 0, 1) * .55; tctx.drawImage(LOOKBUF, 0, 0); tctx.restore();
    }
  }
  if (L.grain > 0) {
    const tile = grainTile(), n = Math.floor(t * 14), ox = (hash(n) * 256) | 0, oy = (hash(n + 77) * 256) | 0;
    tctx.save(); tctx.globalCompositeOperation = 'soft-light'; tctx.globalAlpha = clamp(L.grain, 0, 1) * .8;
    tctx.fillStyle = tctx.createPattern(tile, 'repeat'); tctx.translate(-ox, -oy); tctx.fillRect(ox, oy, W, H); tctx.restore();
  }
  if (L.bars) { const bh = Math.round(H * .105); tctx.save(); tctx.fillStyle = '#000'; tctx.fillRect(0, 0, W, bh); tctx.fillRect(0, H - bh, W, bh); tctx.restore(); }
}
