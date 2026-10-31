'use strict';
/* ===== Apply-to-all-scenes for every setting, film look, aspect ratio, title cards, autosave ===== */

/* ---------- groups of per-scene settings that can be copied to every scene ---------- */
const SYNC = { time: false, cam: false, depth: false, light: false, look: false };
const is3D = m => ['orbit', 'sway', 'push'].includes(m);
let syncBusy = false;
const GROUPS = {
  time: { ids: ['#dur', '#transType', '#transDur'], copy: (a, b) => { b.dur = a.dur; b.trans = a.trans; b.transType = a.transType; b.regions.forEach(r => { if (r.end > b.dur) r.end = 0; if (r.delay > b.dur - .5) r.delay = 0; }); } },
  cam: { ids: ['#camMode', '#camAmt'], copy: (a, b) => { b.cam = JSON.parse(JSON.stringify(a.cam)); } },
  light: { ids: ['#lightFrom', '#lightTo'], copy: (a, b) => { b.light = JSON.parse(JSON.stringify(a.light)); } },
  look: { ids: [], copy: (a, b) => { b.look = JSON.parse(JSON.stringify(a.look)); } }
};
async function applyDepthToAll(cur) {
  for (const s of PA.scenes) {
    if (s === cur) continue;
    s.depthFocus = cur.depthFocus; s.horizon = cur.horizon; s.depthInv = cur.depthInv;
    if (!cur.depthOn || !cur.depth) { s.depthOn = false; continue; }
    if (cur.depth.kind === 'quick') setDepth(s, quickDepthCanvas(s), 'quick');
    else if (!(s.depth && s.depth.kind === 'ai')) {
      try { const c = await aiDepthFor(s, t => { $('#depthStatus').textContent = `Scene "${s.name}": ${t}`; }); setDepth(s, c, 'ai'); }
      catch (e) { console.warn(e); setDepth(s, quickDepthCanvas(s), 'quick'); $('#depthStatus').textContent = 'AI depth failed for one scene, used Quick depth there.'; }
    } else s.depthOn = true;
    if (is3D(cur.cam.mode) && !is3D(s.cam.mode)) s.cam.mode = cur.cam.mode;
  }
}
async function applyGroup(g, quiet) {
  const cur = curScene(); if (!cur || PA.scenes.length < 2 || syncBusy) return;
  syncBusy = true;
  try {
    if (g === 'depth') await applyDepthToAll(cur);
    else PA.scenes.forEach(s => { if (s !== cur) GROUPS[g].copy(cur, s); });
    refreshStripDur(); updateTotal(); buildTimeline();
    if (!quiet) toast('Applied to all ' + PA.scenes.length + ' scenes.');
  } finally { syncBusy = false; }
}
(function wireSync() {
  Object.keys(GROUPS).forEach(g => GROUPS[g].ids.forEach(id => { const el = $(id); ['input', 'change'].forEach(ev => el.addEventListener(ev, () => { if (SYNC[g]) applyGroup(g, true); })); }));
  ['#depthFocus', '#horizon', '#depthInv'].forEach(id => ['input', 'change'].forEach(ev => $(id).addEventListener(ev, () => { if (SYNC.depth) applyGroup('depth', true); })));
  ['#depthQuick', '#depthAI', '#depthOff'].forEach(id => { const el = $(id), o = el.onclick; el.onclick = async (...a) => { await o.apply(el, a); if (SYNC.depth) await applyGroup('depth', true); }; });
  ['#camMode'].forEach(id => $(id).addEventListener('change', () => { if (SYNC.depth) applyGroup('depth', true); }));
  $$('input[data-sync]').forEach(cb => cb.onchange = () => { SYNC[cb.dataset.sync] = cb.checked; if (cb.checked) applyGroup(cb.dataset.sync); });
  $$('.applyall').forEach(b => b.onclick = () => { if (PA.scenes.length < 2) return toast('Add another picture first.'); applyGroup(b.dataset.grp); });
  $$('.preset').forEach(b => b.addEventListener('click', () => {
    if (!$('#moodAll').checked || PA.scenes.length < 2) return;
    const keep = PA.cur; PA.scenes.forEach((s, i) => { if (i !== keep) { PA.cur = i; applyPreset(b.dataset.preset); } });
    PA.cur = keep; refreshAll(); toast('Mood applied to all scenes.');
  }));
})();

/* ---------- film look ---------- */
function refreshLookPane() {
  const sc = curScene(); if (!sc) return; const L = sc.look || (sc.look = { grade: 'none', grain: 0, bloom: 0, bars: false });
  $('#lookGrade').value = L.grade; $('#lookBloom').value = L.bloom; $('#lookGrain').value = L.grain; $('#lookBars').checked = !!L.bars;
  $('#aspect').value = PA.aspect || 'auto';
}
const lookSync = () => { if (SYNC.look) applyGroup('look', true); };
$('#lookGrade').onchange = e => { curScene().look.grade = e.target.value; lookSync(); };
$('#lookBloom').oninput = e => { curScene().look.bloom = +e.target.value; lookSync(); };
$('#lookGrain').oninput = e => { curScene().look.grain = +e.target.value; lookSync(); };
$('#lookBars').onchange = e => { curScene().look.bars = e.target.checked; lookSync(); };

/* ---------- video shape (aspect ratio) ---------- */
$('#aspect').onchange = e => {
  if (!PA.scenes.length) { PA.aspect = e.target.value; return; }
  PA.aspect = e.target.value; rebuildAll();
  PA.scenes.forEach(s => refreshQuickDepth(s));
  refreshAll(); toast('Video shape changed. Pictures are cropped to fit; check your effect boxes.');
};

/* ---------- title card ---------- */
const TITLE_STYLES = [['#1d2b4a', '#0b1020', '#ffd479'], ['#3a1c13', '#140806', '#ffb36b'], ['#12322b', '#06140f', '#b6f5c8'], ['#2a1a3d', '#0e0816', '#f6c9ff']];
$('#addTitle').onclick = () => {
  if (!PA.scenes.length) return toast('Add a picture first.');
  const txt = prompt('Title text (use | for a new line):', 'The Village Story'); if (txt === null || !txt.trim()) return;
  const st = TITLE_STYLES[PA.scenes.length % TITLE_STYLES.length], c = makeCanvas(W, H), x = c.getContext('2d');
  const g = x.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * .7); g.addColorStop(0, st[0]); g.addColorStop(1, st[1]);
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  const lines = txt.split('|').map(s => s.trim()).filter(Boolean), fs = Math.round(Math.min(W / 12, H / (lines.length + 1.5) * .7));
  x.fillStyle = st[2]; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = `700 ${fs}px Georgia, 'Times New Roman', serif`;
  x.shadowColor = 'rgba(0,0,0,.5)'; x.shadowBlur = fs * .2;
  lines.forEach((l, i) => x.fillText(l, W / 2, H / 2 + (i - (lines.length - 1) / 2) * fs * 1.25));
  x.shadowBlur = 0; x.fillRect(W * .35, H / 2 + (lines.length / 2) * fs * 1.25 + fs * .2, W * .3, Math.max(2, fs * .05));
  const sc = addScene(c, lines[0].slice(0, 20)); sc.dur = 4; sc.cam = { mode: 'in', amount: 1 }; sc.look = { grade: 'none', grain: .25, bloom: 0, bars: false };
  PA.cur = PA.scenes.length - 1; PA.selKind = null; PA.selIdx = -1; refreshAll(); toast('Title card added at the end. Use the ◀ ▶ buttons on its thumbnail to move it.');
};

/* ---------- autosave to this browser (IndexedDB) + restore ---------- */
const IDB = {
  open() { return new Promise((res, rej) => { const q = indexedDB.open('photo-animator', 1); q.onupgradeneeded = () => q.result.createObjectStore('kv'); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); }); },
  async set(k, v) { const db = await IDB.open(); return new Promise((res, rej) => { const t = db.transaction('kv', 'readwrite'); t.objectStore('kv').put(v, k); t.oncomplete = res; t.onerror = () => rej(t.error); }); },
  async get(k) { const db = await IDB.open(); return new Promise((res, rej) => { const q = db.transaction('kv').objectStore('kv').get(k); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); }); }
};
let lastSaved = '';
async function autosave() {
  try {
    if (!PA.scenes.length || PA.busy || PA.mode !== 'edit') return;
    const json = JSON.stringify(serializeProject()); if (json === lastSaved) return;
    await IDB.set('last', { at: Date.now(), json }); lastSaved = json;
  } catch (e) { console.warn('autosave skipped', e); }
}
setInterval(autosave, 45000);
document.addEventListener('visibilitychange', () => { if (document.hidden) autosave(); });
(async function offerRestore() {
  try {
    const rec = await IDB.get('last'); if (!rec || !rec.json) return;
    const b = $('#btnRestore'); b.hidden = false; b.title = 'Saved ' + new Date(rec.at).toLocaleString();
    b.onclick = async () => {
      try { toast('Restoring…'); await loadProject(JSON.parse(rec.json)); $('#res').value = String(PA.quality); $('#fpsSel').value = String(PA.fps); buildAmbUI(); onScenesReady(); toast('Last session restored.'); b.hidden = true; }
      catch (err) { console.error(err); toast('Could not restore: ' + (err.message || err)); }
    };
    setInterval(() => { if (PA.scenes.length) b.hidden = true; }, 1000);
  } catch (e) { /* no storage available */ }
})();
