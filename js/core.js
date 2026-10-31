'use strict';
/* ===== Photo Animator Studio: core state and helpers ===== */
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
function rng(seed) {
  let a = (Math.floor(seed * 4294967296) >>> 0) || 1;
  return () => {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, w | 0); c.height = Math.max(1, h | 0); return c; }
function loadScript(url) {
  return new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = url; s.onload = res;
    s.onerror = () => rej(new Error('Could not load ' + url)); document.head.appendChild(s);
  });
}

/* current render target + current source picture (used by all effect functions) */
let W = 0, H = 0, vctx = null, src = null;

const view = $('#view'), viewCtx = view.getContext('2d');
const overlay = $('#overlay'), octx = overlay.getContext('2d');

const PA = {
  scenes: [], cur: 0,
  tool: 'smoke',
  selKind: null, selIdx: -1, selPin: -1,       // selection: 'region' | 'actor'
  playing: true, t0: performance.now(), tFrozen: 0,
  mode: 'edit',                                 // 'edit' | 'project'
  quality: 1280, fps: 30, nextId: 1, busy: false,
  audio: { amb: { wind: 0, birds: 0, hens: 0, fire: 0, water: 0, rain: 0, crickets: 0 }, master: .9, music: null, musicName: '', musicVol: .5 }
};

const curScene = () => PA.scenes[PA.cur] || null;
const selRegion = () => { const s = curScene(); return s && PA.selKind === 'region' ? s.regions[PA.selIdx] || null : null; };
const selActor = () => { const s = curScene(); return s && PA.selKind === 'actor' ? s.actors[PA.selIdx] || null : null; };

function setStatus(m) { const e = $('#status'); if (e) e.textContent = m || ''; }
let toastTimer = 0;
function toast(m, ms) { setStatus(m); clearTimeout(toastTimer); toastTimer = setTimeout(() => setStatus(''), ms || 6000); }

function evenInt(v) { return Math.max(2, Math.round(v / 2) * 2); }
const ASPECTS = { '16:9': 16 / 9, '9:16': 9 / 16, '1:1': 1, '4:3': 4 / 3, '3:4': 3 / 4 };
function sizeFor(img) {
  const ar = ASPECTS[PA.aspect];
  if (ar) { const m = Math.min(PA.quality, Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height)); return ar >= 1 ? [evenInt(m), evenInt(m / ar)] : [evenInt(m * ar), evenInt(m)]; }
  const sc = Math.min(1, PA.quality / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height));
  return [evenInt((img.naturalWidth || img.width) * sc), evenInt((img.naturalHeight || img.height) * sc)];
}
function coverDraw(ctx, img, w, h) {
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  const s = Math.max(w / iw, h / ih), dw = iw * s, dh = ih * s;
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
}

function newScene(img, name) {
  return {
    id: 's' + (PA.nextId++), name: name || 'Scene', img,
    orig: null, base: null, comp: null, compCtx: null,
    dur: 6, trans: .8, transType: 'fade',
    regions: [], actors: [],
    depth: null, depthOn: false, depthInv: false, depthFocus: .5, horizon: .38,
    cam: { mode: 'breathe', amount: 1 },
    light: { from: 'none', to: 'none' },
    look: { grade: 'none', grain: 0, bloom: 0, bars: false },
    caption: '', voice: null, voiceName: ''
  };
}
function buildScene(sc) {
  const o = makeCanvas(W, H); coverDraw(o.getContext('2d'), sc.img, W, H);
  sc.orig = o;
  sc.base = makeCanvas(W, H); sc.base.getContext('2d').drawImage(o, 0, 0);
  sc.comp = makeCanvas(W, H); sc.compCtx = sc.comp.getContext('2d');
  sc.regions.forEach(r => { r._cv = null; r._ck = null; r._sp = null; });
  rebuildActors(sc);
}
function resizeViews() {
  view.width = overlay.width = W; view.height = overlay.height = H;
}
function addScene(img, name) {
  if (!PA.scenes.length) { [W, H] = sizeFor(img); resizeViews(); }
  const sc = newScene(img, name);
  buildScene(sc);
  PA.scenes.push(sc);
  return sc;
}
function rebuildAll() {
  if (!PA.scenes.length) return;
  [W, H] = sizeFor(PA.scenes[0].img); resizeViews();
  PA.scenes.forEach(buildScene);
}

function previewTime(now) { return PA.playing ? (now - PA.t0) / 1000 : PA.tFrozen; }
function setPreviewTime(sec) { PA.tFrozen = sec; PA.t0 = performance.now() - sec * 1000; }

/* project layout: scenes overlap by their transition time */
function overlapOf(i) {
  const s = PA.scenes[i], n = PA.scenes[i + 1];
  if (!n || s.transType === 'none') return 0;
  return Math.min(s.trans, s.dur * .5, n.dur * .5);
}
function projectLayout() {
  let T = 0; const items = [];
  PA.scenes.forEach((s, i) => { items.push({ i, start: T, end: T + s.dur }); T += s.dur - overlapOf(i); });
  const total = items.length ? items[items.length - 1].end : 0;
  return { items, total };
}
