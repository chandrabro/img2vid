'use strict';
/* ===== Effect library ===== */
const EFFECTS = {
  select: { icon: '✋', label: 'Select / move', short: 'Select', group: '', hint: 'Tap a box to select it. Drag to move it. Drag the square at its bottom-right corner to resize.' },

  cloud: { icon: '☁️', label: 'Cloud drift', short: 'Cloud', group: '🌤 Sky & water', dw: .30, dh: .18, anchor: 'center', hint: 'Drag a box around a cloud with some blue sky around it. The cloud drifts sideways and billows.' },
  waterfall: { icon: '💧', label: 'Waterfall flow', short: 'Waterfall', group: '🌤 Sky & water', dw: .08, dh: .30, anchor: 'center', hint: 'Drag a tall box over the falling water only. It flows downward with streaks and mist.' },
  water: { icon: '🌊', label: 'Water ripple', short: 'Water', group: '🌤 Sky & water', dw: .30, dh: .12, anchor: 'center', hint: 'Drag a box over a pond or river for ripples and sparkles.' },
  birds: { icon: '🕊️', label: 'Flying birds', short: 'Birds', group: '🌤 Sky & water', dw: .40, dh: .18, anchor: 'center', hint: 'Drag a box over the sky. Small birds fly across it. Tick Mirror to fly the other way.' },
  rays: { icon: '🌅', label: 'Sun rays', short: 'Rays', group: '🌤 Sky & water', dw: .25, dh: .45, anchor: 'center', hint: 'Drag a box where sunlight falls. Soft light beams slowly shimmer.' },
  rain: { icon: '🌧', label: 'Rain', short: 'Rain', group: '🌤 Sky & water', dw: .5, dh: .6, anchor: 'center', hint: 'Drag a box over the area where rain should fall.' },
  stars: { icon: '⭐', label: 'Twinkling stars', short: 'Stars', group: '🌤 Sky & water', dw: .5, dh: .25, anchor: 'center', hint: 'Drag a box over the sky for twinkling stars (best with Night light).' },

  smoke: { icon: '💨', label: 'Smoke / steam', short: 'Smoke', group: '🔥 Fire & air', dw: .08, dh: .22, anchor: 'bottom', hint: 'Tap where smoke starts, or drag a box. It rises from the bottom of the box.' },
  fire: { icon: '🔥', label: 'Fire / glow', short: 'Fire', group: '🔥 Fire & air', dw: .07, dh: .10, anchor: 'center', hint: 'Drag a box around the flame. Adds flicker, glow and sparks (glow stays bright at night).' },
  leaves: { icon: '🍃', label: 'Falling leaves', short: 'Leaves', group: '🔥 Fire & air', dw: .25, dh: .40, anchor: 'center', hint: 'Drag a box under a tree. Leaves fall slowly from the top of the box to the bottom.' },
  dust: { icon: '✨', label: 'Floating dust / pollen', short: 'Dust', group: '🔥 Fire & air', dw: .30, dh: .30, anchor: 'center', hint: 'Drag a box in sunlit air. Golden specks float and twinkle.' },
  fireflies: { icon: '🪲', label: 'Fireflies', short: 'Fireflies', group: '🔥 Fire & air', dw: .35, dh: .30, anchor: 'center', hint: 'Drag a box over grass or bushes. Glowing fireflies drift and blink.' },

  sway: { icon: '🌿', label: 'Sway (grass, leaves, cloth)', short: 'Sway', group: '🌾 Plants & hanging things', dw: .12, dh: .30, anchor: 'center', hint: 'Drag a box around leaves, bamboo, grass or a flag. The top moves most.' },
  swing: { icon: '🪢', label: 'Swing (hanging things)', short: 'Swing', group: '🌾 Plants & hanging things', dw: .05, dh: .10, anchor: 'center', hint: 'Drag a box around hanging corn, chillies, a bell, laundry or a broom. It swings from the top.' },

  breathe: { icon: '🫁', label: 'Breathe (person / animal)', short: 'Breathe', group: '🧑‍🌾 People & animals', dw: .15, dh: .25, anchor: 'center', hint: 'Drag a box around the whole person or animal for a gentle breathing movement.' },
  nod: { icon: '🙂', label: 'Head nod (person)', short: 'Nod', group: '🧑‍🌾 People & animals', dw: .05, dh: .07, anchor: 'center', hint: 'Drag a box around the HEAD only, down to the neck. Tick Mirror if the person faces left.' },
  eyes: { icon: '👀', label: 'Eyes (look + blink)', short: 'Eyes', group: '🧑‍🌾 People & animals', dw: .03, dh: .02, anchor: 'center', hint: 'Drag a small box around the eyes. They glance left and right and blink.' },
  blink: { icon: '👁️', label: 'Eye blink only', short: 'Blink', group: '🧑‍🌾 People & animals', dw: .025, dh: .02, anchor: 'center', hint: 'Tap on the eye, then resize the box so it covers only the eye.' },
  look: { icon: '🔍', label: 'Eye glance only', short: 'Look', group: '🧑‍🌾 People & animals', dw: .03, dh: .02, anchor: 'center', hint: 'Small box around the eyes. They glance side to side without blinking.' },
  stir: { icon: '🥄', label: 'Stir / cook (hand)', short: 'Stir', group: '🧑‍🌾 People & animals', dw: .10, dh: .12, anchor: 'center', hint: 'Drag a box around the hand and arm of someone cooking. It moves in small circles.' },
  wave: { icon: '👋', label: 'Wave / arm swing', short: 'Wave', group: '🧑‍🌾 People & animals', dw: .05, dh: .10, anchor: 'center', hint: 'Drag a box around a hand or forearm. It waves from the bottom of the box.' },
  peck: { icon: '🐔', label: 'Head peck (hen, bird)', short: 'Peck', group: '🧑‍🌾 People & animals', dw: .05, dh: .07, anchor: 'center', hint: 'Drag a box around the bird\'s HEAD and neck only. Tick Mirror if it faces left.' },
  wag: { icon: '🐕', label: 'Tail wag (dog)', short: 'Wag', group: '🧑‍🌾 People & animals', dw: .05, dh: .04, anchor: 'center', hint: 'Drag a small box around the tail only. Tick Mirror to switch the side it wags from.' },

  puppet: { icon: '🧵', label: 'Puppet (pins)', short: 'Puppet', group: '🧵 Puppet', dw: .12, dh: .22, anchor: 'center', hint: 'Drag a box around the part to bend (arm, tree, animal). Then use 📍 Pin to add anchors and moving pins.' },
  pin: { icon: '📍', label: 'Pin (add / move pins)', short: 'Pin', group: '🧵 Puppet', hint: 'Select a puppet box, then tap inside it to add a pin. Drag a pin to move it. Pick its kind below.', noRegion: true }
};
const DRAWABLE = Object.keys(EFFECTS).filter(k => k !== 'select' && !EFFECTS[k].noRegion);

const PASS = { smoke: ['top'], birds: ['top'], leaves: ['top'], rain: ['top'], dust: ['emis'], rays: ['emis'], stars: ['emis'], fireflies: ['emis'], fire: ['normal', 'emis'] };
const passesOf = t => PASS[t] || ['normal'];

const P = r => ({ x: r.x * W, y: r.y * H, w: r.w * W, h: r.h * H });
function normRect(x0, y0, x1, y1) {
  let x = Math.min(x0, x1), y = Math.min(y0, y1), w = Math.abs(x1 - x0), h = Math.abs(y1 - y0);
  x = clamp(x, 0, 1); y = clamp(y, 0, 1); w = Math.min(w, 1 - x); h = Math.min(h, 1 - y);
  return { x, y, w, h };
}
function defaultRect(type, cx, cy) {
  const d = EFFECTS[type], w = d.dw, h = d.dh;
  return { x: clamp(cx - w / 2, 0, 1 - w), y: clamp(d.anchor === 'bottom' ? cy - h : cy - h / 2, 0, 1 - h), w, h };
}
function newRegion(type, rect, extra) {
  const r = Object.assign({ type, x: rect.x, y: rect.y, w: Math.max(rect.w, .01), h: Math.max(rect.h, .01), strength: 1, speed: 1, mirror: false, delay: 0, end: 0, seed: Math.random() }, extra || {});
  if (type === 'puppet' && !r.pins) r.pins = [];
  return r;
}

/* ---------- soft-edged patch drawing ---------- */
function withPatch(p, r, fn, feather) {
  feather = feather == null ? .35 : feather;
  const w = Math.max(2, Math.ceil(p.w)), h = Math.max(2, Math.ceil(p.h));
  const cv = r._cv || (r._cv = document.createElement('canvas'));
  if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
  const c = cv.getContext('2d');
  c.clearRect(0, 0, w, h);
  c.save(); fn(c, w, h); c.restore();
  c.save();
  c.globalCompositeOperation = 'destination-in';
  c.translate(w / 2, h / 2); c.scale(w / 2, h / 2);
  const g = c.createRadialGradient(0, 0, 0, 0, 0, 1);
  g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1 - feather, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g; c.fillRect(-1, -1, 2, 2);
  c.restore();
  vctx.drawImage(cv, p.x, p.y);
}
function rgba(col, a) { return col.replace('rgb(', 'rgba(').replace(')', ',' + a + ')'); }

const colCv = document.createElement('canvas'); colCv.width = colCv.height = 8;
const colCtx = colCv.getContext('2d', { willReadFrequently: true });
function borderColor(p, r) {
  const key = [p.x, p.y, p.w, p.h].map(v => v.toFixed(1)).join() + (src && src.width);
  if (r._ck === key) return r._col;
  colCtx.clearRect(0, 0, 8, 8);
  colCtx.drawImage(src, p.x, p.y, Math.max(1, p.w), Math.max(1, p.h), 0, 0, 8, 8);
  const d = colCtx.getImageData(0, 0, 8, 8).data;
  let R = 0, G = 0, B = 0, n = 0;
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    if (x === 0 || y === 0 || x === 7 || y === 7) { const i = (y * 8 + x) * 4; R += d[i]; G += d[i + 1]; B += d[i + 2]; n++; }
  }
  r._ck = key; r._col = `rgb(${R / n | 0},${G / n | 0},${B / n | 0})`;
  return r._col;
}

/* ---------- movement effects ---------- */
function fxSway(p, r, t, ampMul, speedMul) {
  ampMul = ampMul || 1; speedMul = speedMul || 1;
  withPatch(p, r, (c, w, h) => {
    const amp = Math.max(w, h) * 0.05 * r.strength * ampMul;
    const ph = r.seed * 6.283, sp = t * r.speed * speedMul * 1.6;
    for (let y = 0; y < h; y += 3) {
      const hh = Math.min(3, h - y);
      const k = Math.pow(1 - y / h, 1.5);
      const dx = amp * k * (Math.sin(sp + y * 0.012 + ph) + 0.35 * Math.sin(sp * 2.3 + y * 0.02 + ph * 2));
      c.drawImage(src, p.x, p.y + y, w, hh, dx, y, w, hh);
    }
  }, .3);
}
function fxBreathe(p, r, t) {
  withPatch(p, r, (c, w, h) => {
    const b = Math.sin(t * r.speed * 1.8 + r.seed * 6.283) * .5 + .5;
    const sy = 1 + .025 * r.strength * b, sx = 1 + .008 * r.strength * b;
    c.translate(w / 2, h); c.scale(sx, sy); c.translate(-w / 2, -h);
    c.drawImage(src, p.x, p.y, w, h, 0, 0, w, h);
  }, .3);
}
function underfill(p, r, a) {
  if (a < .05) return;
  const col = borderColor(p, r), cx = p.x + p.w / 2, cy = p.y + p.h / 2, rad = Math.max(p.w, p.h) * .62;
  const al = Math.min(.85, a);
  const g = vctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
  g.addColorStop(0, rgba(col, al)); g.addColorStop(.7, rgba(col, al * .8)); g.addColorStop(1, rgba(col, 0));
  vctx.fillStyle = g; vctx.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
}
function fxPivot(p, r, o) {
  withPatch(p, r, (c, w, h) => {
    const px = (o.px == null ? .5 : o.px) * w, py = (o.py == null ? 1 : o.py) * h;
    c.translate(px + (o.tx || 0) * w, py + (o.ty || 0) * h);
    c.rotate(o.ang || 0);
    c.scale(o.sx || 1, o.sy || 1);
    c.translate(-px, -py);
    c.drawImage(src, p.x, p.y, w, h, 0, 0, w, h);
  }, o.feather == null ? .3 : o.feather);
}
function fxNod(p, r, t) {
  const period = 3.4 / r.speed;
  const u = (((t + r.seed * period) % period) + period) % period / period;
  const a = u < .5 ? Math.max(0, Math.sin(u / .5 * 4 * Math.PI)) : 0;
  const idle = Math.sin(t * r.speed * .9 + r.seed * 6.283) * .012;
  const dir = r.mirror ? -1 : 1;
  underfill(p, r, a * .15);
  fxPivot(p, r, { px: .5, py: .95, ang: dir * (a * .14 + idle) * r.strength, ty: a * .03 * r.strength, sx: 1.04, sy: 1.05 - a * .03, feather: .3 });
}
function fxPeck(p, r, t) {
  const period = 2.4 / r.speed;
  const u = (((t + r.seed * period) % period) + period) % period / period;
  let a = 0;
  if (u < .14) a = Math.sin(u / .14 * Math.PI);
  else if (u > .2 && u < .34) a = Math.sin((u - .2) / .14 * Math.PI);
  const idle = Math.sin(t * r.speed * 2.2 + r.seed * 9) * .02;
  const dir = r.mirror ? -1 : 1;
  underfill(p, r, a * 1.1);
  fxPivot(p, r, { px: .5, py: 1, ang: dir * (a * .55 + idle) * r.strength, ty: a * .12 * r.strength, sx: 1.05, sy: 1.05, feather: .3 });
}
function fxWave(p, r, t) {
  const dir = r.mirror ? -1 : 1;
  const a = Math.sin(t * r.speed * 3.6 + r.seed * 6.283) * .28 + Math.sin(t * r.speed * 1.3) * .06;
  underfill(p, r, .35);
  fxPivot(p, r, { px: .5, py: 1, ang: dir * a * r.strength, sx: 1.04, sy: 1.04, feather: .3 });
}
function fxSwing(p, r, t) {
  const ph = r.seed * 6.283, sp = r.speed;
  const a = Math.sin(t * sp * 1.7 + ph) * .08 + Math.sin(t * sp * 2.9 + ph * 2) * .025;
  fxPivot(p, r, { px: .5, py: 0, ang: a * r.strength, sx: 1.03, sy: 1.03, feather: .35 });
}
function fxWag(p, r, t) {
  const env = clamp(.55 + Math.sin(t * r.speed * 1.1 + r.seed * 6.283), 0, 1);
  const a = Math.sin(t * r.speed * 10 + r.seed * 6.283) * .42 * env * r.strength;
  fxPivot(p, r, { px: r.mirror ? 1 : 0, py: .5, ang: a, sx: 1.04, sy: 1.04, feather: .3 });
}
function fxStir(p, r, t) {
  withPatch(p, r, (c, w, h) => {
    const a = t * r.speed * 3.4 + r.seed * 6.283, amp = Math.max(w, h) * .05 * r.strength;
    c.translate(Math.cos(a) * amp, Math.sin(a) * amp * .7);
    c.drawImage(src, p.x, p.y, w, h, 0, 0, w, h);
  }, .35);
}
function fxBlink(p, r, t) {
  const period = 3.4 / r.speed, d = .22;
  const tt = t + r.seed * period;
  const u = ((tt % period) + period) % period;
  let b = 0;
  if (u < d) b = Math.sin(u / d * Math.PI);
  else if (Math.floor(tt / period) % 3 === 0 && u > .34 && u < .34 + d) b = Math.sin((u - .34) / d * Math.PI);
  if (b < .03) return;
  b = Math.pow(b, .7);
  const col = borderColor(p, r);
  withPatch(p, r, (c, w, h) => {
    c.fillStyle = col; c.fillRect(0, 0, w, Math.min(h, h * b * 1.05));
    c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(0, Math.max(0, h * b - 1.5), w, 1.5);
  }, .45);
}
function fxLook(p, r, t) {
  const period = 4.2 / r.speed, tt = t + r.seed * period;
  const k = Math.floor(tt / period), u = (((tt % period) + period) % period) / period;
  const targets = [0, -1, 1, .5, -.6, 1, 0, -.8];
  const tg = targets[Math.floor(hash(k + r.seed * 31) * targets.length)];
  let e = u < .12 ? u / .12 : (u > .85 ? (1 - u) / .15 : 1);
  e = e * e * (3 - 2 * e);
  const dx = tg * e * r.strength * p.w * .12;
  if (Math.abs(dx) < .1) return;
  withPatch(p, r, (c, w, h) => { c.drawImage(src, p.x, p.y, w, h, dx, 0, w, h); }, .5);
}
function fxEyes(p, r, t) { fxLook(p, r, t); fxBlink(p, r, t); }

/* ---------- nature effects ---------- */
function fxSmoke(p, r, t) {
  const life = 6 / r.speed, N = 9, dt = life / N;
  const i1 = Math.floor(t / dt), i0 = i1 - N;
  vctx.save();
  for (let i = i0; i <= i1; i++) {
    const age = (t - i * dt) / life;
    if (age < 0 || age > 1) continue;
    const h1 = hash(i + r.seed * 977), h2 = hash(i * 1.7 + r.seed * 313);
    const sx = p.x + p.w / 2 + (h1 - .5) * p.w * .35;
    const x = sx + Math.sin(age * 4 + h2 * 6.283) * p.w * .3 * age + age * p.w * .5 * (h2 - .5);
    const y = p.y + p.h - age * p.h * 1.05;
    const rad = p.w * (.18 + .55 * age) + 2;
    const a = Math.pow(Math.sin(Math.PI * age), 1.3) * .34 * r.strength * Math.min(1, age * 6);
    const g = vctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, `rgba(238,238,242,${a})`);
    g.addColorStop(.5, `rgba(226,226,232,${a * .55})`);
    g.addColorStop(1, 'rgba(220,220,228,0)');
    vctx.fillStyle = g;
    vctx.beginPath(); vctx.arc(x, y, rad, 0, 6.283); vctx.fill();
  }
  vctx.restore();
}
function fxFireBody(p, r, t) { fxSway(p, r, t, .5, 6); }
function fxFireGlow(p, r, t) {
  const ph = r.seed * 10;
  const f = .65 + .2 * Math.sin(t * 13 + ph) + .12 * Math.sin(t * 23.7 + ph * 2) + .08 * Math.sin(t * 5.3);
  vctx.save();
  vctx.globalCompositeOperation = 'lighter';
  const cx = p.x + p.w / 2, cy = p.y + p.h * .6, rad = Math.max(p.w, p.h) * 1.2;
  const g = vctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
  g.addColorStop(0, `rgba(255,170,60,${Math.max(0, .4 * f * r.strength)})`);
  g.addColorStop(1, 'rgba(255,100,0,0)');
  vctx.fillStyle = g; vctx.beginPath(); vctx.arc(cx, cy, rad, 0, 6.283); vctx.fill();
  for (let k = 0; k < 10; k++) {
    const u = ((t * .35 * r.speed + hash(k + r.seed * 50) + k / 10) % 1);
    const x = p.x + p.w * (.3 + .4 * hash(k * 2.1)) + Math.sin(u * 9 + k) * p.w * .25;
    const y = p.y + p.h * .4 - u * p.h * 1.6;
    const s = Math.max(1, p.w * .02 * (1 - u)) + W / 1500;
    vctx.fillStyle = `rgba(255,190,80,${Math.max(0, (1 - u) * .9 * r.strength)})`;
    vctx.beginPath(); vctx.arc(x, y, s, 0, 6.283); vctx.fill();
  }
  vctx.restore();
}
function fxWater(p, r, t) {
  withPatch(p, r, (c, w, h) => {
    const amp = Math.max(2, w * .008) * r.strength, ph = r.seed * 6.283, sp = t * r.speed * 2.2;
    for (let y = 0; y < h; y += 2) {
      const hh = Math.min(2, h - y);
      const dx = amp * (Math.sin(y * .10 - sp + ph) + .5 * Math.sin(y * .23 + sp * 1.3));
      c.drawImage(src, p.x, p.y + y, w, hh, dx, y, w, hh);
    }
    c.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 14; k++) {
      const tw = Math.max(0, Math.sin(t * r.speed * 3 + k * 7.3));
      c.fillStyle = `rgba(255,255,255,${.35 * tw * r.strength})`;
      c.fillRect(hash(k + r.seed * 40) * w, hash(k * 3.3 + r.seed * 9) * h, w * .04 + 1, 1.5);
    }
  }, .3);
}
function fxCloud(p, r, t) {
  withPatch(p, r, (c, w, h) => {
    const off = (((t * r.speed * w * .05 * r.strength) % w) + w) % w;
    const sc = 1.03 + .012 * Math.sin(t * r.speed * .6 + r.seed * 6.283);
    c.translate(w / 2, h / 2); c.scale(sc, sc); c.translate(-w / 2, -h / 2);
    c.drawImage(src, p.x, p.y, w, h, off, 0, w, h);
    c.drawImage(src, p.x, p.y, w, h, off - w, 0, w, h);
  }, .55);
}
function fxWaterfall(p, r, t) {
  withPatch(p, r, (c, w, h) => {
    const off = (((t * r.speed * h * .7) % h) + h) % h;
    c.drawImage(src, p.x, p.y, w, h, 0, off, w, h);
    c.drawImage(src, p.x, p.y, w, h, 0, off - h, w, h);
    c.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 18; k++) {
      const sp = .5 + hash(k * 3.1 + r.seed) * .9;
      const y = (((t * r.speed * sp * h * .9) + hash(k * 7.7 + r.seed * 5) * h) % h);
      const len = h * (.10 + .18 * hash(k * 5.3));
      c.fillStyle = `rgba(255,255,255,${.2 * r.strength})`;
      c.fillRect(hash(k + r.seed * 20) * w, y, Math.max(1, w * .012), len);
    }
  }, .25);
  const cx = p.x + p.w / 2, cy = p.y + p.h, rad = Math.max(p.w * 1.1, p.h * .18);
  const a = (.28 + .08 * Math.sin(t * r.speed * 2.1 + r.seed * 6)) * Math.min(1.5, r.strength);
  const g = vctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
  g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(1, 'rgba(255,255,255,0)');
  vctx.fillStyle = g; vctx.beginPath(); vctx.arc(cx, cy, rad, 0, 6.283); vctx.fill();
}
function fxBirds(p, r, t) {
  const n = Math.max(2, Math.round(4 * r.strength));
  vctx.save();
  vctx.lineCap = 'round'; vctx.lineWidth = Math.max(1.2, W / 600);
  for (let i = 0; i < n; i++) {
    const sp = (.045 + .03 * hash(i + r.seed * 7)) * r.speed;
    const u = (((t * sp + hash(i * 2.3 + r.seed * 3)) % 1) + 1) % 1;
    const x = p.x + (r.mirror ? 1 - u : u) * p.w;
    const y = p.y + p.h * (.2 + .6 * hash(i * 5.1 + r.seed)) + Math.sin(u * 12 + i) * p.h * .05;
    const s = Math.max(3, W * (.006 + .006 * hash(i * 9.7 + r.seed)));
    const flap = Math.sin(t * r.speed * 9 + i * 2.1);
    const al = Math.min(1, u * 8, (1 - u) * 8) * .85;
    vctx.strokeStyle = `rgba(25,28,36,${al})`;
    vctx.beginPath();
    vctx.moveTo(x - s * 1.2, y - flap * s * .7);
    vctx.quadraticCurveTo(x - s * .5, y - s * .5 - flap * s * .3, x, y);
    vctx.quadraticCurveTo(x + s * .5, y - s * .5 - flap * s * .3, x + s * 1.2, y - flap * s * .7);
    vctx.stroke();
  }
  vctx.restore();
}
function fxLeaves(p, r, t) {
  const cols = ['#8ab04a', '#c9a23a', '#d9772b', '#6f9a3d'];
  const n = Math.max(3, Math.round(9 * r.strength));
  vctx.save();
  for (let i = 0; i < n; i++) {
    const sp = (.10 + .09 * hash(i + r.seed * 11)) * r.speed;
    const u = (((t * sp + hash(i * 3.7 + r.seed * 5)) % 1) + 1) % 1;
    const x = p.x + p.w * hash(i * 1.3 + r.seed * 2) + Math.sin(u * 10 + i) * p.w * .06;
    const y = p.y + u * p.h;
    const s = Math.max(2, W / 190) * (.7 + .6 * hash(i * 2.9));
    vctx.globalAlpha = Math.min(1, u * 6, (1 - u) * 6) * .9;
    vctx.fillStyle = cols[i % cols.length];
    vctx.beginPath(); vctx.ellipse(x, y, s, s * .45, u * 8 + i, 0, 6.283); vctx.fill();
  }
  vctx.restore();
}
function fxRain(p, r, t) {
  const n = Math.max(10, Math.round(70 * r.strength));
  vctx.save();
  vctx.strokeStyle = 'rgba(215,226,245,.5)'; vctx.lineWidth = Math.max(1, W / 900);
  vctx.beginPath();
  for (let i = 0; i < n; i++) {
    const sp = (1.1 + .5 * hash(i + r.seed)) * r.speed;
    const u = (((t * sp + hash(i * 3.1 + r.seed * 7)) % 1) + 1) % 1;
    const x = p.x + p.w * hash(i * 1.7 + r.seed * 3) + u * p.h * .12;
    const y = p.y + u * p.h;
    const len = Math.max(6, p.h * .05);
    vctx.moveTo(x, y); vctx.lineTo(x + len * .15, y + len);
  }
  vctx.stroke();
  vctx.restore();
}
function fxDust(p, r, t) {
  const n = Math.max(6, Math.round(26 * r.strength));
  vctx.save(); vctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const h1 = hash(i * 1.7 + r.seed * 9), h2 = hash(i * 4.1 + r.seed * 3);
    const x = p.x + p.w * (h1 + .06 * Math.sin(t * r.speed * .5 + i));
    const yy = p.y + (((h2 - t * r.speed * .025 * (.5 + h1)) % 1) + 1) % 1 * p.h;
    const tw = .35 + .65 * Math.max(0, Math.sin(t * r.speed * 1.5 + i * 3.3));
    const rad = Math.max(1, W / 650) * (1 + 1.5 * hash(i * 6.1));
    const g = vctx.createRadialGradient(x, yy, 0, x, yy, rad * 2.5);
    g.addColorStop(0, `rgba(255,236,190,${.7 * tw})`); g.addColorStop(1, 'rgba(255,230,170,0)');
    vctx.fillStyle = g; vctx.beginPath(); vctx.arc(x, yy, rad * 2.5, 0, 6.283); vctx.fill();
  }
  vctx.restore();
}
function fxFireflies(p, r, t) {
  const n = Math.max(3, Math.round(10 * r.strength));
  vctx.save(); vctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const a = hash(i * 2.1 + r.seed * 5), b = hash(i * 3.7 + r.seed * 2);
    const x = p.x + p.w * (.5 + .45 * Math.sin(t * r.speed * (.2 + .15 * a) + i * 2.3));
    const y = p.y + p.h * (.5 + .45 * Math.sin(t * r.speed * (.17 + .15 * b) + i * 4.1));
    const blink = Math.pow(Math.max(0, Math.sin(t * r.speed * (.9 + a) + i * 5)), 3);
    const rad = Math.max(2, W / 260) * (1 + a);
    const g = vctx.createRadialGradient(x, y, 0, x, y, rad * 3);
    g.addColorStop(0, `rgba(235,255,130,${.9 * blink})`); g.addColorStop(1, 'rgba(200,255,90,0)');
    vctx.fillStyle = g; vctx.beginPath(); vctx.arc(x, y, rad * 3, 0, 6.283); vctx.fill();
  }
  vctx.restore();
}
function fxStars(p, r, t) {
  const n = Math.max(10, Math.round(70 * r.strength));
  vctx.save(); vctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const x = p.x + p.w * hash(i * 1.3 + r.seed * 4), y = p.y + p.h * hash(i * 2.9 + r.seed * 8);
    const tw = .25 + .75 * Math.max(0, Math.sin(t * r.speed * (.8 + hash(i)) + i * 3.1));
    const s = Math.max(.8, W / 900) * (.6 + hash(i * 5.7));
    vctx.fillStyle = `rgba(255,252,235,${.85 * tw})`;
    vctx.beginPath(); vctx.arc(x, y, s, 0, 6.283); vctx.fill();
  }
  vctx.restore();
}
function fxRays(p, r, t) {
  const n = 5, dir = r.mirror ? -1 : 1;
  vctx.save(); vctx.globalCompositeOperation = 'lighter';
  for (let k = 0; k < n; k++) {
    const pulse = .5 + .5 * Math.sin(t * r.speed * .7 + k * 1.7 + r.seed * 6);
    const a = (.05 + .09 * pulse) * r.strength;
    const x0 = p.x + p.w * (k + .5) / n - p.w * .06, bw = p.w * (.07 + .03 * hash(k * 3 + r.seed)), sl = dir * p.h * .35;
    const g = vctx.createLinearGradient(0, p.y, 0, p.y + p.h);
    g.addColorStop(0, 'rgba(255,240,200,0)'); g.addColorStop(.2, `rgba(255,240,200,${a})`); g.addColorStop(1, 'rgba(255,240,200,0)');
    vctx.fillStyle = g;
    vctx.beginPath();
    vctx.moveTo(x0, p.y); vctx.lineTo(x0 + bw, p.y); vctx.lineTo(x0 + bw + sl, p.y + p.h); vctx.lineTo(x0 + sl, p.y + p.h);
    vctx.closePath(); vctx.fill();
  }
  vctx.restore();
}

/* ---------- puppet: pins + mesh warp ---------- */
function drawTri(c, img, sx0, sy0, sx1, sy1, sx2, sy2, dx0, dy0, dx1, dy1, dx2, dy2) {
  const a = sx1 - sx0, b = sx2 - sx0, cc = sy1 - sy0, d = sy2 - sy0;
  const det = a * d - b * cc;
  if (Math.abs(det) < 1e-9) return;
  const cx = (dx0 + dx1 + dx2) / 3, cy = (dy0 + dy1 + dy2) / 3;
  const ex = (x, y) => { const vx = x - cx, vy = y - cy, l = Math.hypot(vx, vy) || 1; return [x + vx / l * .7, y + vy / l * .7]; };
  const p0 = ex(dx0, dy0), p1 = ex(dx1, dy1), p2 = ex(dx2, dy2);
  c.save();
  c.beginPath(); c.moveTo(p0[0], p0[1]); c.lineTo(p1[0], p1[1]); c.lineTo(p2[0], p2[1]); c.closePath(); c.clip();
  const ea = dx1 - dx0, eb = dx2 - dx0, ec = dy1 - dy0, ed = dy2 - dy0;
  const m00 = (ea * d - eb * cc) / det, m01 = (-ea * b + eb * a) / det;
  const m10 = (ec * d - ed * cc) / det, m11 = (-ec * b + ed * a) / det;
  c.transform(m00, m10, m01, m11, dx0 - (m00 * sx0 + m01 * sy0), dy0 - (m10 * sx0 + m11 * sy0));
  c.drawImage(img, 0, 0);
  c.restore();
}
function pinOffset(q, r, t, w, h) {
  const a = t * (q.speed || 1) * r.speed * 2.2 + (q.phase || 0);
  const A = (q.amp || .04) * Math.max(w, h) * r.strength;
  switch (q.kind) {
    case 'circle': return [Math.cos(a) * A, Math.sin(a) * A];
    case 'swing': return [Math.sin(a) * A, 0];
    case 'bounce': return [0, -Math.abs(Math.sin(a)) * A];
    case 'sway': return [Math.sin(a) * A, Math.cos(a * .7) * A * .3];
    case 'wave': return [0, Math.sin(a) * A];
    default: return [0, 0];
  }
}
function fxPuppet(p, r, t) {
  const pins = r.pins;
  if (!pins || !pins.length) return;
  withPatch(p, r, (c, w, h) => {
    const sp = r._sp || (r._sp = makeCanvas(w, h));
    if (sp.width !== w || sp.height !== h) { sp.width = w; sp.height = h; }
    const sctx = sp.getContext('2d'); sctx.clearRect(0, 0, w, h);
    sctx.drawImage(src, p.x, p.y, w, h, 0, 0, w, h);
    const G = 14, eps = Math.pow(Math.min(w, h) * .05, 2);
    const pp = pins.map(q => { const o = pinOffset(q, r, t, w, h); return { x: q.x * w, y: q.y * h, dx: o[0], dy: o[1] }; });
    const VX = new Float32Array((G + 1) * (G + 1)), VY = new Float32Array((G + 1) * (G + 1));
    for (let j = 0; j <= G; j++) for (let i = 0; i <= G; i++) {
      const x = i / G * w, y = j / G * h, k = j * (G + 1) + i;
      let dx = 0, dy = 0;
      if (i > 0 && j > 0 && i < G && j < G) {
        let sw = 0, sx = 0, sy = 0;
        for (const q of pp) { const d2 = (x - q.x) * (x - q.x) + (y - q.y) * (y - q.y) + eps; const wt = 1 / Math.pow(d2, 1.2); sw += wt; sx += wt * q.dx; sy += wt * q.dy; }
        dx = sx / sw; dy = sy / sw;
      }
      VX[k] = x + dx; VY[k] = y + dy;
    }
    for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) {
      const a = j * (G + 1) + i, b = a + 1, d = a + G + 1, e = d + 1;
      const s = (k) => [(k % (G + 1)) / G * w, Math.floor(k / (G + 1)) / G * h];
      const sa = s(a), sb = s(b), sd = s(d), se = s(e);
      drawTri(c, sp, sa[0], sa[1], sb[0], sb[1], sd[0], sd[1], VX[a], VY[a], VX[b], VY[b], VX[d], VY[d]);
      drawTri(c, sp, sb[0], sb[1], se[0], se[1], sd[0], sd[1], VX[b], VY[b], VX[e], VY[e], VX[d], VY[d]);
    }
  }, .1);
}

/* ---------- dispatcher ---------- */
function drawRegion(r, t, tl, pass) {
  if (!passesOf(r.type).includes(pass)) return;
  let k = r.delay ? clamp((tl - r.delay) / .8, 0, 1) : 1;
  if (r.end > 0) k *= clamp((r.end - tl) / .8, 0, 1);
  if (k <= 0) return;
  const p = P(r), s0 = r.strength;
  r.strength = s0 * k;
  try {
    switch (r.type) {
      case 'smoke': return fxSmoke(p, r, t);
      case 'sway': return fxSway(p, r, t);
      case 'breathe': return fxBreathe(p, r, t);
      case 'peck': return fxPeck(p, r, t);
      case 'nod': return fxNod(p, r, t);
      case 'blink': return fxBlink(p, r, t);
      case 'look': return fxLook(p, r, t);
      case 'eyes': return fxEyes(p, r, t);
      case 'fire': return pass === 'normal' ? fxFireBody(p, r, t) : fxFireGlow(p, r, t);
      case 'water': return fxWater(p, r, t);
      case 'cloud': return fxCloud(p, r, t);
      case 'waterfall': return fxWaterfall(p, r, t);
      case 'birds': return fxBirds(p, r, t);
      case 'leaves': return fxLeaves(p, r, t);
      case 'rain': return fxRain(p, r, t);
      case 'dust': return fxDust(p, r, t);
      case 'fireflies': return fxFireflies(p, r, t);
      case 'stars': return fxStars(p, r, t);
      case 'rays': return fxRays(p, r, t);
      case 'stir': return fxStir(p, r, t);
      case 'wave': return fxWave(p, r, t);
      case 'swing': return fxSwing(p, r, t);
      case 'wag': return fxWag(p, r, t);
      case 'puppet': return fxPuppet(p, r, t);
    }
  } finally { r.strength = s0; }
}
