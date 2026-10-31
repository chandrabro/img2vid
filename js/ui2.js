'use strict';
/* ===== Detect categories, whole-body pick, effects for all scenes ===== */

/* ---------- all-scenes (global) effects ---------- */
const newGid = () => 'g' + Math.random().toString(36).slice(2, 9);
function removeGid(g) { PA.scenes.forEach(s => { s.regions = s.regions.filter(r => r.gid !== g); }); }
const regSig = r => JSON.stringify(pick(r, REGION_KEYS));
function copyRegionTo(r, s) {
  const q = s.regions.find(x => x.gid === r.gid);
  if (!q) { s.regions.push(Object.assign(newRegion(r.type, r), pick(r, REGION_KEYS))); return; }
  if (regSig(q) !== regSig(r)) { Object.assign(q, pick(r, REGION_KEYS)); q._cv = null; q._ck = null; }
}
function syncGlobals(ui) {
  const cur = curScene(); if (!cur || PA.scenes.length < 2) { if (ui) buildGlobalList(); return; }
  cur.regions.forEach(r => { if (r.gid) PA.scenes.forEach(s => { if (s !== cur) copyRegionTo(r, s); }); });
  /* effects that exist in other scenes but not here (e.g. a scene added later) */
  const have = new Set(cur.regions.map(r => r.gid).filter(Boolean));
  PA.scenes.forEach(s => { if (s !== cur) s.regions.forEach(r => { if (r.gid && !have.has(r.gid)) { have.add(r.gid); copyRegionTo(r, cur); } }); });
  if (ui) buildGlobalList();
}
setInterval(() => { if (PA.scenes.length > 1 && PA.mode === 'edit') syncGlobals(false); }, 400);

function buildGlobalList() {
  const box = $('#gList'); if (!box) return; box.innerHTML = '';
  const sc = curScene(); if (!sc) return;
  sc.regions.forEach((r, i) => {
    if (!r.gid) return;
    const b = document.createElement('button'); b.className = 'chip' + (PA.selKind === 'region' && PA.selIdx === i ? ' on' : '');
    b.textContent = `🌐 ${EFFECTS[r.type].icon} ${EFFECTS[r.type].label}`;
    b.onclick = () => { PA.selKind = 'region'; PA.selIdx = i; PA.selPin = -1; refreshAll(); showTab('fx'); };
    box.appendChild(b);
  });
  if (!box.children.length) box.innerHTML = '<span class="small">None yet. Tick the box above and draw an effect, or use Quick add.</span>';
}
(function initGlobalUI() {
  const sel = $('#gType'); DRAWABLE.filter(k => k !== 'puppet').forEach(k => { const o = document.createElement('option'); o.value = k; o.textContent = `${EFFECTS[k].icon} ${EFFECTS[k].label}`; sel.appendChild(o); });
  $('#gAdd').onclick = () => {
    const sc = curScene(); if (!sc) return toast('Add a picture first.');
    const type = sel.value, g = newGid(), rect = defaultRect(type, .5, .5);
    const r0 = newRegion(type, rect, { gid: g }); sc.regions.push(r0);
    PA.selKind = 'region'; PA.selIdx = sc.regions.length - 1; PA.selPin = -1; syncGlobals(); refreshAll(); toast('Added to all ' + PA.scenes.length + ' scene(s). Drag it into place.');
  };
  $('#gMake').onclick = () => { const r = selRegion(); if (!r) return toast('Select an effect first (✋ Select).'); if (!r.gid) r.gid = newGid(); syncGlobals(); refreshAll(); toast('Now in every scene.'); };
  $('#gLocal').onclick = () => { const r = selRegion(); if (!r || !r.gid) return toast('That effect is already local.'); r.gid = undefined; delete r.gid; refreshAll(); };
  $('#gCopyAll').onclick = () => { const sc = curScene(); if (!sc) return; sc.regions.forEach(r => { if (!r.gid) r.gid = newGid(); }); syncGlobals(); refreshAll(); toast('Copied to every scene.'); };
  $('#gClear').onclick = () => { PA.scenes.forEach(s => { s.regions = s.regions.filter(r => !r.gid); }); PA.selKind = null; PA.selIdx = -1; refreshAll(); };
})();

/* ---------- auto-detect by category ---------- */
async function addThings(sc, found, global) {
  const items = detectNonLiving(sc);
  sc.regions = sc.regions.filter(r => !(r.auto && !r.gid && !r.body));
  items.forEach(it => {
    const r = newRegion(it.type, it.rect, Object.assign({ auto: true }, it.extra || {}));
    if (global) r.gid = newGid();
    sc.regions.push(r); found.push(it.label);
  });
}
const iouBox = (a, b) => { const iw = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), ih = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y); if (iw <= 0 || ih <= 0) return 0; const i = iw * ih; return i / (a.w * a.h + b.w * b.h - i); };
async function addBodies(sc, wantPerson, wantAnimal, found) {
  const list = (await bodyPreds(sc, msg)).filter(p => (p.cls === 'person' ? wantPerson : wantAnimal && p.cls !== 'person')).sort((a, b) => b.w * b.h - a.w * a.h).slice(0, 10);
  if (!list.length) return 0;
  const cut = $('#cutBodies').checked, glob = $('#applyAllDetect').checked;
  if (!cut) sc.regions = sc.regions.filter(r => !(r.auto && !r.gid && r.body && r.body === (list[0].cls === 'person' ? 'person' : 'animal') && list.every(q => (q.cls === 'person') === (list[0].cls === 'person'))));
  let n = 0; const counts = {};
  for (const p of list) {
    const box = { x: p.x, y: p.y, w: p.w, h: p.h };
    counts[p.cls] = (counts[p.cls] || 0) + 1; n++;
    if (!cut) {
      const rc = { x: clamp(p.x / W, 0, 1), y: clamp(p.y / H, 0, 1), w: p.w / W, h: p.h / H };
      rc.w = Math.min(rc.w, 1 - rc.x); rc.h = Math.min(rc.h, 1 - rc.y);
      const add = (t, r, ex) => { const q = newRegion(t, r, Object.assign({ auto: true, body: p.cls === 'person' ? 'person' : 'animal' }, ex || {})); if (glob) q.gid = newGid(); sc.regions.push(q); };
      if (p.cls === 'person') { add('breathe', rc, { strength: .6 }); if (rc.h > .08) add('nod', { x: rc.x + rc.w * .2, y: rc.y, w: rc.w * .6, h: Math.min(rc.h * .24, .12) }, { strength: .8 }); found.push('person'); }
      else if (p.cls === 'bird') { add('peck', { x: rc.x, y: rc.y, w: rc.w, h: rc.h * .5 }); found.push('bird'); }
      else { add('breathe', rc); found.push(p.cls); }
      continue;
    }
    if (sc.actors.some(a => iouBox(box, { x: a.nx * W, y: a.ny * H, w: a.nw * W, h: a.nh * H }) > .4)) continue;
    const nm = p.cls.charAt(0).toUpperCase() + p.cls.slice(1) + ' ' + counts[p.cls];
    msg(`Cutting out the whole ${p.cls} (${n} of ${list.length})…`); await sleep(20);
    const a = await boxCutFlow(box, nm, 'stay'); applyBodyDefaults(a, p.cls); found.push(p.cls);
  }
  return n;
}
function msg(t) { setStatus(t); const e = $('#detectMsg'); if (e) e.textContent = t; }
async function runDetect(kind) {
  const sc = curScene(); if (!sc) return;
  const btns = ['#auto', '#autoHuman', '#autoAnimal', '#autoThing'].map(s => $(s)); btns.forEach(b => { b.disabled = true; });
  const found = [], glob = $('#applyAllDetect').checked; msg('Working…');
  try {
    if (kind === 'thing' || kind === 'all') { msg('Looking for clouds, trees, sunlight, fire…'); await sleep(20); await addThings(sc, found, glob); PA.selKind = null; PA.selIdx = -1; if (glob) syncGlobals(); refreshAll(); }
    if (kind !== 'thing') {
      try { await addBodies(sc, kind === 'human' || kind === 'all', kind === 'animal' || kind === 'all', found); }
      catch (err) { console.warn(err); msg('The people/animal detector could not load (' + (err.message || err) + '). It needs internet once. Non-living detection and the manual tools still work.'); btns.forEach(b => { b.disabled = false; }); refreshAll(); return; }
    }
    refreshAll();
    const m2 = found.length ? 'Found: ' + [...new Set(found)].join(', ') + '. Check them, then fix or delete anything wrong.' : (sc.actors.length ? 'Nothing new found (already-detected things are skipped). Use "Remove all cut-outs" to start again.' : 'Nothing obvious found for that choice. Add effects by hand.');
    msg(m2); toast(m2);
  } catch (err) { console.error(err); msg('Detection failed: ' + (err.message || err)); toast('Detection failed: ' + (err.message || err)); }
  finally { btns.forEach(b => { b.disabled = false; }); }
}
$('#auto').onclick = () => runDetect('all');
$('#autoHuman').onclick = () => runDetect('human');
$('#autoAnimal').onclick = () => runDetect('animal');
$('#autoThing').onclick = () => runDetect('thing');

$('#actClearAll').onclick = () => { const sc = curScene(); if (!sc) return; sc.actors = []; rebuildActors(sc); PA.selKind = null; PA.selIdx = -1; refreshAll(); toast('All cut-outs removed, picture restored.'); };
