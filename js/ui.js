'use strict';
/* ===== UI wiring: tabs, tools, pointer interaction, panels, timeline, main loop ===== */
const TOOL_HINTS = {
  'cut-lasso': 'Drag all the way around the thing you want to cut out, then let go. Take your time: the closer the outline, the cleaner the result.',
  'cut-box': 'Drag a box around the whole thing (hen, dog, person). The app guesses the outline from the colours. Works best when it stands out from the background.',
  'cut-body': 'Tap on a person or animal. The app finds the whole body and makes only that body move (breathing, sway, head nod). Needs the free detector (small download, once).',
  'cut-ai': 'Tap on the thing to cut it out, or drag a box around it for a more exact outline. Needs the AI model (Load AI model button).',
  path: 'Drag from where the cut-out stands to where it should walk, or tap to add path points one by one. It walks there and back.',
  area: 'Drag a box on the ground where the cut-out may wander. It strolls to random spots inside it and pecks.'
};
const CUT_TOOLS = ['cut-lasso', 'cut-box', 'cut-body', 'cut-ai'];
const isRegionTool = t => !!EFFECTS[t] && t !== 'pin';

/* ---------- tabs ---------- */
$$('#tabs button').forEach(b => b.onclick = () => {
  $$('#tabs button').forEach(x => x.classList.toggle('on', x === b));
  $$('.pane').forEach(p => { p.hidden = p.dataset.pane !== b.dataset.tab; });
});
function showTab(name) { const b = $(`#tabs button[data-tab="${name}"]`); if (b) b.click(); }

/* ---------- tools ---------- */
function buildTools() {
  const box = $('#tools'); box.innerHTML = ''; let last = '';
  Object.keys(EFFECTS).forEach(k => {
    const g = EFFECTS[k].group;
    if (g && g !== last) { const d = document.createElement('div'); d.className = 'grp'; d.textContent = g; box.appendChild(d); last = g; }
    const b = document.createElement('button');
    b.textContent = `${EFFECTS[k].icon} ${EFFECTS[k].label}`; b.className = k === PA.tool ? 'on' : '';
    b.onclick = () => setTool(k); box.appendChild(b);
  });
  const sel = $('#selType'); sel.innerHTML = '';
  DRAWABLE.forEach(k => { const o = document.createElement('option'); o.value = k; o.textContent = `${EFFECTS[k].icon} ${EFFECTS[k].label}`; sel.appendChild(o); });
}
function setTool(k) {
  PA.tool = k;
  buildTools();
  $$('.cutmode').forEach(b => b.classList.toggle('on', b.dataset.tool === k));
  $('#toolPath').classList.toggle('on', k === 'path'); $('#toolArea').classList.toggle('on', k === 'area');
  const h = TOOL_HINTS[k] || (EFFECTS[k] && EFFECTS[k].hint) || '';
  $('#hint').textContent = h; $('#toolHint').textContent = (EFFECTS[k] && EFFECTS[k].hint) || ''; $('#cutHint').textContent = TOOL_HINTS[k] && CUT_TOOLS.includes(k) ? TOOL_HINTS[k] : '';
  if (k === 'pin') { const r = selRegion(); if (!r || r.type !== 'puppet') toast('First draw a 🧵 Puppet box (or select one), then tap inside it to add pins.'); }
}
$$('.cutmode').forEach(b => b.onclick = () => setTool(b.dataset.tool));
$('#toolPath').onclick = () => { if (!selActor()) return toast('Select a cut-out first.'); setTool('path'); };
$('#toolArea').onclick = () => { if (!selActor()) return toast('Select a cut-out first.'); setTool('area'); };

/* ---------- loading pictures ---------- */
function fileToImage(f) {
  return new Promise((res, rej) => { const u = URL.createObjectURL(f), i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Could not read ' + f.name)); i.src = u; });
}
async function loadFiles(files) {
  const arr = [...files].filter(f => f.type.startsWith('image/'));
  if (!arr.length) return;
  const first = PA.scenes.length;
  for (const f of arr) {
    try { addScene(await fileToImage(f), f.name.replace(/\.[^.]+$/, '')); } catch (e) { toast(e.message); }
  }
  if (PA.scenes.length > first) { PA.cur = first; PA.selKind = null; PA.selIdx = -1; onScenesReady(); toast(arr.length > 1 ? `${arr.length} pictures added as scenes.` : 'Picture loaded. Add effects, cut-outs or a mood.'); }
}
function onScenesReady() {
  $('#drop').hidden = true; $('#stageBox').hidden = false;
  ['#auto', '#autoHuman', '#autoAnimal', '#autoThing', '#autoWalk', '#recFast', '#recRT', '#recGif', '#btnSave'].forEach(s => { $(s).disabled = false; });
  setPreviewTime(0); refreshAll();
}
$('#file').onchange = e => { loadFiles(e.target.files); e.target.value = ''; };
const dz = $('#drop');
['dragover', 'dragenter'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add('over'); }));
['dragleave', 'drop'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove('over'); }));
dz.addEventListener('drop', e => loadFiles(e.dataTransfer.files));
window.addEventListener('paste', e => { const fs = [...(e.clipboardData || { items: [] }).items].map(i => i.getAsFile && i.getAsFile()).filter(Boolean); if (fs.length) loadFiles(fs); });

/* ---------- scene strip ---------- */
function cloneCanvas(c) { const o = makeCanvas(c.width, c.height); o.getContext('2d').drawImage(c, 0, 0); return o; }
function refreshStrip() {
  const st = $('#strip'); st.innerHTML = '';
  PA.scenes.forEach((sc, i) => {
    const d = document.createElement('div'); d.className = 'thumb' + (i === PA.cur ? ' on' : '');
    const c = makeCanvas(132, Math.round(132 * H / W)); c.getContext('2d').drawImage(sc.orig, 0, 0, c.width, c.height);
    d.appendChild(c);
    const cap = document.createElement('div'); cap.className = 'cap'; cap.innerHTML = `<span>${i + 1}. ${sc.name.slice(0, 12)}</span><span>${sc.dur}s</span>`; d.appendChild(cap);
    const tb = document.createElement('div'); tb.className = 'tb';
    [['◀', 'Move earlier', () => moveScene(i, -1)], ['▶', 'Move later', () => moveScene(i, 1)], ['⧉', 'Duplicate', () => dupScene(i)], ['✕', 'Delete', () => delScene(i)]].forEach(([ch, ti, fn]) => {
      const b = document.createElement('button'); b.textContent = ch; b.title = ti; b.onclick = ev => { ev.stopPropagation(); fn(); }; tb.appendChild(b);
    });
    d.appendChild(tb); d.onclick = () => selectScene(i); st.appendChild(d);
  });
  const add = document.createElement('label'); add.className = 'addthumb'; add.innerHTML = '＋ Add picture<input type="file" accept="image/*" multiple hidden>';
  add.querySelector('input').onchange = e => { loadFiles(e.target.files); e.target.value = ''; };
  st.appendChild(add);
}
function selectScene(i) { PA.cur = clamp(i, 0, PA.scenes.length - 1); PA.selKind = null; PA.selIdx = -1; PA.selPin = -1; setPreviewTime(0); stopPreviewSound(); refreshAll(); }
function moveScene(i, d) { const j = i + d; if (j < 0 || j >= PA.scenes.length) return; [PA.scenes[i], PA.scenes[j]] = [PA.scenes[j], PA.scenes[i]]; PA.cur = j; refreshAll(); }
function delScene(i) {
  if (PA.scenes.length < 2) return toast('You need at least one scene. Add another picture first, or reload the page to start over.');
  const sc = PA.scenes[i]; dropSceneTex(sc); PA.scenes.splice(i, 1);
  PA.cur = clamp(PA.cur >= i ? PA.cur - 1 : PA.cur, 0, PA.scenes.length - 1); PA.selKind = null; PA.selIdx = -1; refreshAll();
}
function dupScene(i) {
  const s0 = PA.scenes[i], sc = newScene(s0.img, s0.name + ' copy');
  ['dur', 'trans', 'transType', 'depthInv', 'depthFocus', 'horizon', 'caption'].forEach(k => { sc[k] = s0[k]; });
  sc.cam = JSON.parse(JSON.stringify(s0.cam)); sc.light = JSON.parse(JSON.stringify(s0.light));
  sc.regions = s0.regions.map(r => Object.assign(newRegion(r.type, r), pick(r, REGION_KEYS)));
  sc.actors = s0.actors.map(a => Object.assign({ kind: 'actor', cut: null }, pick(a, ACTOR_KEYS), { mask: cloneCanvas(a.mask) }));
  buildScene(sc);
  if (s0.depth) { setDepth(sc, cloneCanvas(s0.depth.canvas), s0.depth.kind); sc.depthOn = s0.depthOn; }
  PA.scenes.splice(i + 1, 0, sc); PA.cur = i + 1; PA.selKind = null; PA.selIdx = -1; refreshAll();
}

/* ---------- effects panel ---------- */
function refreshFx() {
  const sc = curScene(), r = selRegion();
  $('#selNone').hidden = !!r; $('#selBox').hidden = !r;
  if (r) {
    $('#selType').value = r.type; $('#selStrength').value = r.strength; $('#selSpeed').value = r.speed; $('#selMirror').checked = r.mirror;
    $('#selDelay').max = $('#selEnd').max = sc.dur;
    $('#selDelay').value = r.delay || 0; $('#selDelayVal').textContent = (r.delay || 0) + ' s';
    $('#selEnd').value = r.end || 0; $('#selEndVal').textContent = r.end ? r.end + ' s' : 'end';
    $('#pinPanel').hidden = r.type !== 'puppet'; refreshPinPanel();
  }
  const list = $('#list'); list.innerHTML = '';
  if (sc) sc.regions.forEach((q, i) => {
    const b = document.createElement('button'); b.className = 'chip' + (PA.selKind === 'region' && i === PA.selIdx ? ' on' : '');
    b.textContent = `${EFFECTS[q.type].icon} ${EFFECTS[q.type].short} #${i + 1}`;
    b.onclick = () => { PA.selKind = 'region'; PA.selIdx = i; PA.selPin = -1; refreshAll(); }; list.appendChild(b);
  });
  if (!list.children.length) list.innerHTML = '<span class="small">No effects yet.</span>';
}
function refreshPinPanel() {
  const r = selRegion(), q = r && r.pins && r.pins[PA.selPin];
  $('#pinSel').hidden = !q;
  if (q) { $('#pinAmp').value = q.amp || .04; $('#pinSpeed').value = q.speed || 1; $('#pinPhase').value = q.phase || 0; }
}
function deleteSelected() {
  const sc = curScene(); if (!sc) return;
  if (PA.selKind === 'region' && sc.regions[PA.selIdx]) { const g = sc.regions[PA.selIdx].gid; if (g) removeGid(g); sc.regions.splice(PA.selIdx, 1); PA.selKind = null; PA.selIdx = -1; PA.selPin = -1; refreshAll(); }
  else if (PA.selKind === 'actor' && sc.actors[PA.selIdx]) { deleteActor(PA.selIdx); refreshAll(); }
}
$('#selDel').onclick = deleteSelected;
$('#clear').onclick = () => { const sc = curScene(); sc.regions.forEach(r => { if (r.gid) removeGid(r.gid); }); sc.regions = []; PA.selKind = null; PA.selIdx = -1; refreshAll(); };
$('#selType').onchange = e => { const r = selRegion(); if (r) { r.type = e.target.value; r._cv = null; r._ck = null; if (r.type === 'puppet' && !r.pins) r.pins = []; refreshAll(); } };
$('#selStrength').oninput = e => { const r = selRegion(); if (r) r.strength = +e.target.value; };
$('#selSpeed').oninput = e => { const r = selRegion(); if (r) r.speed = +e.target.value; };
$('#selMirror').onchange = e => { const r = selRegion(); if (r) r.mirror = e.target.checked; };
$('#selDelay').oninput = e => { const r = selRegion(); if (r) { r.delay = +e.target.value; $('#selDelayVal').textContent = r.delay + ' s'; buildTimeline(); } };
$('#selEnd').oninput = e => { const r = selRegion(); if (r) { r.end = +e.target.value; $('#selEndVal').textContent = r.end ? r.end + ' s' : 'end'; buildTimeline(); } };

/* pins */
function setPins(list) { const r = selRegion(); if (!r || r.type !== 'puppet') return toast('Select a 🧵 Puppet box first.'); r.pins = list; PA.selPin = -1; refreshAll(); }
$('#pinPresetHang').onclick = () => setPins([{ x: .5, y: .05, kind: 'anchor' }, { x: .5, y: .95, kind: 'swing', amp: .07, speed: 1, phase: 0 }]);
$('#pinPresetHead').onclick = () => setPins([{ x: .5, y: .95, kind: 'anchor' }, { x: .5, y: .12, kind: 'sway', amp: .06, speed: 1, phase: 0 }]);
$('#pinPresetArm').onclick = () => setPins([{ x: .5, y: .95, kind: 'anchor' }, { x: .5, y: .08, kind: 'swing', amp: .14, speed: 1.4, phase: 0 }]);
const selPinObj = () => { const r = selRegion(); return r && r.pins ? r.pins[PA.selPin] : null; };
$('#pinAmp').oninput = e => { const q = selPinObj(); if (q) q.amp = +e.target.value; };
$('#pinSpeed').oninput = e => { const q = selPinObj(); if (q) q.speed = +e.target.value; };
$('#pinPhase').oninput = e => { const q = selPinObj(); if (q) q.phase = +e.target.value; };
$('#pinDel').onclick = () => { const r = selRegion(); if (r && r.pins && r.pins[PA.selPin]) { r.pins.splice(PA.selPin, 1); PA.selPin = -1; refreshPinPanel(); } };

/* ---------- cut-outs panel ---------- */
function refreshActors() {
  const sc = curScene(), a = selActor();
  $('#actNone').hidden = !!(sc && sc.actors.length); $('#actBox').hidden = !a;
  if (a) {
    $('#actName').value = a.name; $('#actBehavior').value = a.behavior; $('#actFaces').checked = a.facesLeft;
    $('#actSpeed').value = a.speed; $('#actSize').value = a.size; $('#actGait').value = a.gait; $('#actBob').value = a.bob;
    $('#actDelay').max = sc.dur; $('#actDelay').value = a.delay || 0; $('#actDelayVal').textContent = (a.delay || 0) + ' s';
    $('#actIdle').value = a.idle || 'breathe'; $('#actIdleAmt').value = a.idleAmt == null ? 1 : a.idleAmt; $('#actHead').value = a.head || 0;
    $('#actPeck').checked = a.peck; $('#actShadow').checked = a.shadow; $('#actPersp').checked = a.persp;
    $('#actHint').textContent = a.behavior === 'walk' ? (a.path.length ? `Path has ${a.path.length} point(s). The cut-out walks there and back.` : 'Press "Draw path", then drag on the picture where it should walk.')
      : a.behavior === 'wander' ? (a.area ? 'It wanders inside your area. Press "Set wander area" to change it.' : 'Wandering near where it stands. Press "Set wander area" to choose a bigger area.')
      : 'It stays where it is (breathing; tick "peck" for a hen).';
  }
  const list = $('#actList'); list.innerHTML = '';
  if (sc) sc.actors.forEach((q, i) => {
    const b = document.createElement('button'); b.className = 'chip' + (PA.selKind === 'actor' && i === PA.selIdx ? ' on' : '');
    b.textContent = '✂ ' + q.name; b.onclick = () => { PA.selKind = 'actor'; PA.selIdx = i; refreshAll(); showTab('cut'); }; list.appendChild(b);
  });
  if (!list.children.length) list.innerHTML = '<span class="small">None yet.</span>';
}
const bindAct = (id, key, kind) => { $(id).oninput = $(id).onchange = e => { const a = selActor(); if (!a) return; a[key] = kind === 'check' ? e.target.checked : kind === 'text' ? e.target.value : +e.target.value; a._sched = null; if (key === 'behavior') { rebuildActors(curScene()); } if (key === 'behavior' || key === 'delay') refreshActors(); if (key === 'delay') buildTimeline(); if (key === 'name') refreshActors(); }; };
bindAct('#actName', 'name', 'text'); bindAct('#actBehavior', 'behavior', 'text'); bindAct('#actFaces', 'facesLeft', 'check');
bindAct('#actSpeed', 'speed'); bindAct('#actSize', 'size'); bindAct('#actGait', 'gait'); bindAct('#actBob', 'bob'); bindAct('#actDelay', 'delay');
bindAct('#actIdle', 'idle', 'text'); bindAct('#actIdleAmt', 'idleAmt'); bindAct('#actHead', 'head');
bindAct('#actPeck', 'peck', 'check'); bindAct('#actShadow', 'shadow', 'check'); bindAct('#actPersp', 'persp', 'check');
$('#pathClear').onclick = () => { const a = selActor(); if (a) { a.path = []; refreshActors(); } };
$('#actDel').onclick = () => { if (PA.selKind === 'actor') deleteSelected(); };

/* AI buttons */
function setAiStatus(t) { $('#aiStatus').textContent = t; }
$('#aiPrep').onclick = async () => {
  const sc = curScene(); if (!sc) return;
  $('#aiPrep').disabled = true;
  try { await aiPrepareSAM(setAiStatus); await aiEmbed(sc, setAiStatus); setAiStatus('AI is ready. Choose "AI: tap on it" and tap the thing you want to cut out.'); }
  catch (e) { console.error(e); setAiStatus('Could not load the AI model (' + (e.message || e) + '). You can still use "Draw around it" and "Box it".'); }
  $('#aiPrep').disabled = false;
};
async function boxCutFlow(boxPx, name, behavior) {
  const sc = curScene();
  if (AI.sam) {
    try { toast('AI is cutting it out…'); const m = await aiSegment(sc, { box: [boxPx.x, boxPx.y, boxPx.x + boxPx.w, boxPx.y + boxPx.h] }, setAiStatus); return commitCut(m, name, behavior); }
    catch (e) { console.warn('AI cut failed, using colour guess', e); }
  }
  toast('Cutting it out…'); await sleep(30);
  return commitCut(boxCutMask(boxPx), name, behavior);
}

/* ---------- scene panel ---------- */
const lightOpts = Object.keys(LIGHTS).map(k => `<option value="${k}">${LIGHTS[k].label}</option>`).join('');
$('#lightFrom').innerHTML = lightOpts; $('#lightTo').innerHTML = lightOpts;
function depthStatusText(sc) {
  if (!sc.depth) return 'Depth is off.';
  const k = sc.depth.kind === 'ai' ? 'AI depth' : 'Quick depth';
  return `${k} ${sc.depthOn ? 'is on. Pick a 3D camera move (Orbit, Side sway or Push in).' : 'is loaded but switched off.'}`;
}
function refreshScenePane() {
  const sc = curScene(); if (!sc) return;
  $('#dur').value = sc.dur; $('#durVal').textContent = sc.dur + ' s'; $('#caption').value = sc.caption;
  $('#transType').value = sc.transType; $('#transDur').value = sc.trans; $('#transVal').textContent = sc.trans.toFixed(1) + ' s';
  $('#camMode').value = sc.cam.mode; $('#camAmt').value = sc.cam.amount;
  $('#depthFocus').value = sc.depthFocus; $('#horizon').value = sc.horizon; $('#depthInv').checked = sc.depthInv; $('#depthStatus').textContent = depthStatusText(sc);
  $('#lightFrom').value = sc.light.from; $('#lightTo').value = sc.light.to;
  if (typeof refreshLookPane === 'function') refreshLookPane();
}
$('#dur').oninput = e => { const sc = curScene(); sc.dur = +e.target.value; $('#durVal').textContent = sc.dur + ' s'; sc.regions.forEach(r => { if (r.end > sc.dur) r.end = 0; if (r.delay > sc.dur - .5) r.delay = 0; }); refreshStripDur(); buildTimeline(); updateTotal(); };
function refreshStripDur() { $$('#strip .thumb .cap span:last-child').forEach((s, i) => { s.textContent = (PA.scenes[i] ? PA.scenes[i].dur : 0) + 's'; }); }
$('#caption').oninput = e => { curScene().caption = e.target.value; };
$('#transType').onchange = e => { curScene().transType = e.target.value; updateTotal(); };
$('#transDur').oninput = e => { const sc = curScene(); sc.trans = +e.target.value; $('#transVal').textContent = sc.trans.toFixed(1) + ' s'; updateTotal(); };
$('#camMode').onchange = e => { curScene().cam.mode = e.target.value; };
$('#camAmt').oninput = e => { curScene().cam.amount = +e.target.value; };
$('#depthFocus').oninput = e => { curScene().depthFocus = +e.target.value; };
$('#depthInv').onchange = e => { curScene().depthInv = e.target.checked; };
$('#horizon').oninput = e => { const sc = curScene(); sc.horizon = +e.target.value; refreshQuickDepth(sc); };
$('#lightFrom').onchange = e => { curScene().light.from = e.target.value; };
$('#lightTo').onchange = e => { curScene().light.to = e.target.value; };
$('#depthQuick').onclick = () => {
  const sc = curScene(); if (!glInit()) return $('#depthStatus').textContent = 'This browser cannot do 3D depth (WebGL missing). The flat camera is used instead.';
  setDepth(sc, quickDepthCanvas(sc), 'quick');
  if (!['orbit', 'sway', 'push'].includes(sc.cam.mode)) sc.cam.mode = 'orbit';
  refreshScenePane();
};
$('#depthAI').onclick = async () => {
  const sc = curScene(); if (!glInit()) return $('#depthStatus').textContent = 'This browser cannot do 3D depth (WebGL missing).';
  $('#depthAI').disabled = true;
  try {
    const c = await aiDepthFor(sc, t => { $('#depthStatus').textContent = t; });
    setDepth(sc, c, 'ai'); if (!['orbit', 'sway', 'push'].includes(sc.cam.mode)) sc.cam.mode = 'orbit';
    refreshScenePane();
  } catch (e) { console.error(e); $('#depthStatus').textContent = 'AI depth failed (' + (e.message || e) + '). Quick depth still works.'; }
  $('#depthAI').disabled = false;
};
$('#depthOff').onclick = () => { const sc = curScene(); sc.depthOn = false; refreshScenePane(); };

/* mood presets */
function applyPreset(name) {
  const sc = curScene(); if (!sc) return;
  sc.regions = sc.regions.filter(r => !r.preset);
  const add = (type, x, y, w, h, ex) => sc.regions.push(newRegion(type, { x, y, w, h }, Object.assign({ preset: true }, ex || {})));
  const orbit = sc.depthOn ? 'orbit' : 'breathe';
  if (name === 'morning') {
    sc.light = { from: 'dawn', to: 'morning' }; Object.assign(PA.audio.amb, AMB_PRESETS.village); sc.cam = { mode: orbit, amount: 1 };
    add('birds', .05, .04, .9, .22); add('dust', .1, .3, .8, .5); add('rays', .55, 0, .4, .5);
  } else if (name === 'sunset') {
    sc.light = { from: 'sunset', to: 'dusk' }; Object.assign(PA.audio.amb, { wind: .2, birds: .2, hens: 0, fire: 0, water: 0, rain: 0, crickets: .25 }); sc.cam = { mode: orbit, amount: 1 };
    add('birds', .05, .05, .9, .2, { mirror: true }); add('dust', .1, .35, .8, .5); add('rays', .05, 0, .45, .5, { mirror: true });
  } else if (name === 'night') {
    sc.light = { from: 'night', to: 'night' }; Object.assign(PA.audio.amb, AMB_PRESETS.night); sc.cam = { mode: orbit, amount: .8 };
    add('stars', .05, .02, .9, .3); add('fireflies', .05, .55, .9, .4);
  } else if (name === 'rain') {
    sc.light = { from: 'overcast', to: 'overcast' }; Object.assign(PA.audio.amb, AMB_PRESETS.rain); sc.cam = { mode: 'breathe', amount: .8 };
    add('rain', 0, 0, 1, 1, { strength: 1.2 });
  }
  PA.selKind = null; PA.selIdx = -1; refreshAll(); buildAmbUI();
  toast('Mood applied. Adjust anything you like in the tabs.');
}
$$('.preset').forEach(b => b.onclick = () => applyPreset(b.dataset.preset));

/* ---------- sound panel ---------- */
function buildAmbUI() {
  const box = $('#ambBox'); box.innerHTML = '';
  AMB_DEFS.forEach(([k, label]) => {
    const row = document.createElement('div'); row.className = 'row';
    row.innerHTML = `<label>${label}</label><input type="range" min="0" max="1" step="0.05" value="${PA.audio.amb[k]}">`;
    row.querySelector('input').oninput = e => { PA.audio.amb[k] = +e.target.value; liveAudioUpdate(); };
    box.appendChild(row);
  });
  $('#masterVol').value = PA.audio.master; liveAudioUpdate();
}
$('#masterVol').oninput = e => { PA.audio.master = +e.target.value; liveAudioUpdate(); };
$$('.ambpre').forEach(b => b.onclick = () => { Object.assign(PA.audio.amb, AMB_PRESETS[b.dataset.amb]); buildAmbUI(); });
$('#audPreview').onclick = async () => { const on = await togglePreviewSound(); $('#audPreview').textContent = on ? '⏹ Stop preview' : '🔊 Preview sound'; };
$('#musicFile').onchange = async e => {
  const f = e.target.files[0]; if (!f) return;
  try { PA.audio.music = await decodeBlob(f); PA.audio.musicName = f.name; $('#musicStatus').textContent = 'Loaded: ' + f.name + ' (loops under the whole video).'; }
  catch (err) { $('#musicStatus').textContent = 'Could not read that audio file.'; }
};
$('#musicVol').oninput = e => { PA.audio.musicVol = +e.target.value; liveAudioUpdate(); if (ONE && ONE.tag === 'music') ONE.gain.gain.value = PA.audio.musicVol; };
$('#musicPlay').onclick = () => {
  if (ONE && ONE.tag === 'music') return stopOne();
  if (!PA.audio.music) return toast('Choose a music file first.');
  $('#musicPlay').textContent = '■ Stop music';
  playOne(PA.audio.music, { loop: true, vol: PA.audio.musicVol, tag: 'music', onend: () => { $('#musicPlay').textContent = '▶ Preview music'; } });
};
$('#musicClear').onclick = () => { if (ONE && ONE.tag === 'music') stopOne(); PA.audio.music = null; PA.audio.musicName = ''; $('#musicStatus').textContent = ''; $('#musicFile').value = ''; };
function refreshVoice() {
  const sc = curScene(), has = !!(sc && sc.voice);
  $('#voicePlay').disabled = !has; $('#voiceClear').disabled = !has;
  if (sc && has) $('#voiceStatus').textContent = `Voice-over: ${sc.voiceName || 'recording'} (${sc.voice.duration.toFixed(1)} s). It starts with this scene.`;
}
$('#voiceRec').onclick = async () => {
  const sc = curScene();
  try {
    await voiceStart((buf, err) => {
      $('#voiceRec').disabled = false; $('#voiceStop').disabled = true;
      if (!buf) return $('#voiceStatus').textContent = 'Could not read the recording.';
      sc.voice = buf; sc.voiceName = 'recorded voice'; refreshVoice();
    });
    $('#voiceRec').disabled = true; $('#voiceStop').disabled = false; $('#voiceStatus').textContent = '● Recording… press Stop when done.';
  } catch (e) { $('#voiceStatus').textContent = 'Microphone not available: ' + (e.message || e); }
};
$('#voiceStop').onclick = () => voiceStop();
$('#voicePlay').onclick = () => {
  if (ONE && ONE.tag === 'voice') return stopOne();
  const sc = curScene(); if (!sc.voice) return;
  $('#voicePlay').textContent = '■ Stop';
  playOne(sc.voice, { tag: 'voice', onend: () => { $('#voicePlay').textContent = '▶ Play'; } });
};
$('#voiceClear').onclick = () => { const sc = curScene(); sc.voice = null; sc.voiceName = ''; refreshVoice(); $('#voiceStatus').textContent = 'Voice-over removed.'; };
$('#voiceFile').onchange = async e => {
  const f = e.target.files[0]; if (!f) return; const sc = curScene();
  try { sc.voice = await decodeBlob(f); sc.voiceName = f.name; refreshVoice(); } catch (err) { $('#voiceStatus').textContent = 'Could not read that audio file.'; }
};

/* ---------- export panel ---------- */
$('#res').onchange = e => {
  PA.quality = +e.target.value; rebuildAll(); refreshAll();
};
$('#fpsSel').onchange = e => { PA.fps = +e.target.value; };
$('#recFast').onclick = exportFastMP4;
$('#recRT').onclick = recordRealtime;
$('#recGif').onclick = exportGif;
function updateTotal() { $('#totalLen').textContent = projectLayout().total.toFixed(1) + ' s'; }
$('#btnSave').onclick = () => {
  try {
    const blob = new Blob([JSON.stringify(serializeProject())], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'photo-animator-project.json'; a.click();
    toast('Project saved to your downloads.');
  } catch (e) { toast('Could not save: ' + e.message); }
};
$('#btnLoad').onclick = () => $('#loadFile').click();
$('#loadFile').onchange = async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  try {
    toast('Opening project…'); await loadProject(JSON.parse(await f.text()));
    $('#res').value = String(PA.quality); $('#fpsSel').value = String(PA.fps); buildAmbUI(); onScenesReady(); toast('Project opened.');
  } catch (err) { console.error(err); toast('Could not open that file: ' + (err.message || err)); }
};

/* ---------- play controls ---------- */
$('#play').onclick = () => {
  const now = performance.now();
  if (PA.playing) { PA.tFrozen = (now - PA.t0) / 1000; PA.playing = false; $('#play').textContent = '▶ Play'; stopLiveAudio(); }
  else {
    PA.t0 = now - PA.tFrozen * 1000; PA.playing = true; $('#play').textContent = '⏸ Pause'; stopOne();
    if (hasAnySound()) { const d = Math.max(1, curScene().dur); startLiveAudio('scene', ((PA.tFrozen % d) + d) % d); }
  }
};
let scrubbing = false;
$('#scrub').addEventListener('pointerdown', () => { scrubbing = true; });
window.addEventListener('pointerup', () => { scrubbing = false; });
$('#scrub').oninput = e => {
  const sc = curScene(); if (!sc) return;
  PA.playing = false; $('#play').textContent = '▶ Play'; stopLiveAudio(); setPreviewTime(+e.target.value / 1000 * sc.dur * .999);
};
$('#playAll').onclick = () => {
  if (PA.mode === 'project') { endProjectPlayback(); return; }
  if (PA.busy) return;
  stopPreviewSound();
  const lay = projectLayout();
  stopOne(); if (hasAnySound()) startLiveAudio('project', 0);
  $('#playAll').textContent = '■ Stop';
  startProjectPlayback(() => { $('#playAll').textContent = '▶ Play all scenes'; stopPreviewSound(); });
};

/* ---------- timeline ---------- */
const snap = v => Math.round(v * 2) / 2;
function buildTimeline() {
  const sc = curScene(), rows = $('#tlRows'); rows.innerHTML = ''; if (!sc) return;
  const items = [];
  sc.regions.forEach((r, i) => items.push({ kind: 'region', i, label: EFFECTS[r.type].icon + ' ' + EFFECTS[r.type].short, ref: r, noEnd: false }));
  sc.actors.forEach((a, i) => items.push({ kind: 'actor', i, label: '✂ ' + a.name, ref: a, noEnd: true }));
  if (!items.length) { rows.innerHTML = '<div class="small">Add an effect or a cut-out and it will appear here.</div>'; $('#playhead').hidden = true; return; }
  $('#playhead').hidden = false;
  const D = sc.dur;
  items.forEach(it => {
    const row = document.createElement('div'); row.className = 'tlrow';
    const sel = PA.selKind === it.kind && PA.selIdx === it.i;
    const lbl = document.createElement('div'); lbl.className = 'lbl' + (sel ? ' on' : ''); lbl.textContent = it.label;
    lbl.onclick = () => { PA.selKind = it.kind; PA.selIdx = it.i; PA.selPin = -1; refreshAll(); };
    const track = document.createElement('div'); track.className = 'track';
    const bar = document.createElement('div'); bar.className = 'tbar' + (sel ? ' on' : '');
    const st = () => it.ref.delay || 0, en = () => (it.noEnd ? D : (it.ref.end > 0 ? it.ref.end : D));
    const place = () => { bar.style.left = (st() / D * 100) + '%'; bar.style.width = Math.max(1.5, (en() - st()) / D * 100) + '%'; };
    place();
    const hl = document.createElement('i'); hl.className = 'l'; bar.appendChild(hl);
    if (!it.noEnd) { const hr = document.createElement('i'); hr.className = 'r'; bar.appendChild(hr); }
    bar.addEventListener('pointerdown', ev => {
      ev.preventDefault(); bar.setPointerCapture(ev.pointerId);
      const x0 = ev.clientX, s0 = st(), e0 = en(), tw = track.getBoundingClientRect().width, part = ev.target.className;
      const mv = e2 => {
        const dx = (e2.clientX - x0) / tw * D;
        if (part === 'l') it.ref.delay = clamp(snap(s0 + dx), 0, Math.max(0, e0 - .5));
        else if (part === 'r') { const ne = clamp(snap(e0 + dx), s0 + .5, D); it.ref.end = ne >= D ? 0 : ne; }
        else { const len = e0 - s0, ns = clamp(snap(s0 + dx), 0, Math.max(0, D - (it.noEnd || !it.ref.end ? .5 : len))); it.ref.delay = ns; if (!it.noEnd && it.ref.end > 0) it.ref.end = Math.min(D, ns + len); }
        place();
      };
      const up = () => { bar.removeEventListener('pointermove', mv); bar.removeEventListener('pointerup', up); PA.selKind = it.kind; PA.selIdx = it.i; refreshFx(); refreshActors(); };
      bar.addEventListener('pointermove', mv); bar.addEventListener('pointerup', up);
    });
    track.appendChild(bar); row.appendChild(lbl); row.appendChild(track); rows.appendChild(row);
  });
}
function updateTimeUI(tl) {
  const sc = curScene(); if (!sc) return;
  $('#timeLbl').textContent = tl.toFixed(1) + ' / ' + sc.dur.toFixed(1) + ' s';
  if (!scrubbing) $('#scrub').value = Math.round(tl / sc.dur * 1000);
  const tr = $('#tlRows .track'), ph = $('#playhead');
  if (tr && !ph.hidden) { const base = $('#tl').getBoundingClientRect(), r = tr.getBoundingClientRect(); ph.style.left = (r.left - base.left + tl / sc.dur * r.width) + 'px'; }
}

/* ---------- pointer interaction ---------- */
let drag = null;
function ptr(e) { const b = overlay.getBoundingClientRect(); return { x: clamp((e.clientX - b.left) / b.width, 0, 1), y: clamp((e.clientY - b.top) / b.height, 0, 1) }; }
function hitRegion(x, y) { const sc = curScene(); for (let i = sc.regions.length - 1; i >= 0; i--) { const r = sc.regions[i]; if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return i; } return -1; }
function hitActor(x, y) { const sc = curScene(); for (let i = sc.actors.length - 1; i >= 0; i--) { const a = sc.actors[i]; if (x >= a.nx && x <= a.nx + a.nw && y >= a.ny && y <= a.ny + a.nh) return i; } return -1; }
function findPin(r, x, y, rect) {
  if (!r || !r.pins) return -1;
  for (let i = r.pins.length - 1; i >= 0; i--) { const q = r.pins[i], dx = (x - (r.x + q.x * r.w)) * rect.width, dy = (y - (r.y + q.y * r.h)) * rect.height; if (Math.hypot(dx, dy) < 14) return i; }
  return -1;
}
overlay.addEventListener('pointerdown', e => {
  const sc = curScene(); if (!sc || PA.mode !== 'edit' || PA.busy) return;
  overlay.setPointerCapture(e.pointerId);
  const { x, y } = ptr(e), rect = overlay.getBoundingClientRect(), tool = PA.tool, hs = 18 / rect.width;
  const sel = selRegion();
  if (sel && isRegionTool(tool) && Math.abs(x - (sel.x + sel.w)) < hs && Math.abs(y - (sel.y + sel.h)) < hs * W / H) { drag = { mode: 'resize' }; return; }
  if (tool === 'select') {
    const ri = hitRegion(x, y);
    if (ri >= 0) { const r = sc.regions[ri]; PA.selKind = 'region'; PA.selIdx = ri; PA.selPin = -1; drag = { mode: 'move', dx: x - r.x, dy: y - r.y }; refreshAll(); return; }
    const ai = hitActor(x, y);
    if (ai >= 0) { PA.selKind = 'actor'; PA.selIdx = ai; refreshAll(); showTab('cut'); drag = null; return; }
    PA.selKind = null; PA.selIdx = -1; refreshAll(); drag = null; return;
  }
  if (tool === 'pin') {
    if (!sel || sel.type !== 'puppet') { toast('Select a 🧵 Puppet box first.'); return; }
    const pi = findPin(sel, x, y, rect);
    if (pi >= 0) { PA.selPin = pi; drag = { mode: 'pin' }; refreshPinPanel(); return; }
    if (x >= sel.x && x <= sel.x + sel.w && y >= sel.y && y <= sel.y + sel.h) {
      const kind = $('#pinKind').value;
      sel.pins.push({ x: (x - sel.x) / sel.w, y: (y - sel.y) / sel.h, kind, amp: kind === 'anchor' ? 0 : .06, speed: 1, phase: 0 });
      PA.selPin = sel.pins.length - 1; drag = { mode: 'pin' }; refreshPinPanel();
    } else toast('Tap inside the puppet box to add a pin.');
    return;
  }
  if (tool === 'cut-lasso') { drag = { mode: 'lasso', pts: [{ x: x * W, y: y * H }] }; return; }
  if (tool === 'cut-body') { drag = { mode: 'bodyclick', x0: x, y0: y, x1: x, y1: y }; return; }
  if (tool === 'cut-box') { drag = { mode: 'cutbox', x0: x, y0: y, x1: x, y1: y }; return; }
  if (tool === 'cut-ai') { drag = { mode: 'aiclick', x0: x, y0: y, x1: x, y1: y }; return; }
  if (tool === 'path') { if (!selActor()) { toast('Select a cut-out first.'); return; } drag = { mode: 'path', pts: [{ x, y }], moved: false }; return; }
  if (tool === 'area') { if (!selActor()) { toast('Select a cut-out first.'); return; } drag = { mode: 'area', x0: x, y0: y, x1: x, y1: y }; return; }
  if (isRegionTool(tool)) { drag = { mode: 'new', x0: x, y0: y, x1: x, y1: y }; }
});
overlay.addEventListener('pointermove', e => {
  if (!drag) return;
  const { x, y } = ptr(e), r = selRegion();
  switch (drag.mode) {
    case 'new': case 'cutbox': case 'aiclick': case 'bodyclick': case 'area': drag.x1 = x; drag.y1 = y; break;
    case 'move': if (r) { r.x = clamp(x - drag.dx, 0, 1 - r.w); r.y = clamp(y - drag.dy, 0, 1 - r.h); } break;
    case 'resize': if (r) { r.w = clamp(x - r.x, .01, 1 - r.x); r.h = clamp(y - r.y, .01, 1 - r.y); } break;
    case 'pin': { const q = r && r.pins[PA.selPin]; if (q) { q.x = clamp((x - r.x) / r.w, 0, 1); q.y = clamp((y - r.y) / r.h, 0, 1); } break; }
    case 'lasso': { const l = drag.pts[drag.pts.length - 1]; if (Math.hypot(x * W - l.x, y * H - l.y) > 3) drag.pts.push({ x: x * W, y: y * H }); break; }
    case 'path': { const l = drag.pts[drag.pts.length - 1]; if (Math.hypot((x - l.x) * W, (y - l.y) * H) > 14) { drag.pts.push({ x, y }); drag.moved = true; } break; }
  }
});
overlay.addEventListener('pointerup', async () => {
  const d = drag; drag = null; if (!d) return;
  const sc = curScene(), tool = PA.tool;
  if (d.mode === 'new') {
    const w = Math.abs(d.x1 - d.x0), h = Math.abs(d.y1 - d.y0);
    const rect = (w < .012 && h < .012) ? defaultRect(tool, d.x0, d.y0) : normRect(d.x0, d.y0, d.x1, d.y1);
    const nr = newRegion(tool, rect); if ($('#applyAll') && $('#applyAll').checked) nr.gid = newGid();
    sc.regions.push(nr); PA.selKind = 'region'; PA.selIdx = sc.regions.length - 1; PA.selPin = -1; refreshAll();
  } else if (d.mode === 'move' || d.mode === 'resize' || d.mode === 'pin') { refreshPinPanel(); }
  else if (d.mode === 'lasso') {
    if (d.pts.length < 8) return toast('Draw all the way around the thing, then let go.');
    commitCut(polyMask(d.pts, W, H), null); showTab('cut'); toast('Cut out! Now choose how it should move.');
  } else if (d.mode === 'cutbox') {
    const b = { x: Math.min(d.x0, d.x1) * W, y: Math.min(d.y0, d.y1) * H, w: Math.abs(d.x1 - d.x0) * W, h: Math.abs(d.y1 - d.y0) * H };
    if (b.w < 10 || b.h < 10) return toast('Drag a box around the whole thing.');
    let nm = null, cls = null;
    if ($('#snapBody').checked) { setAiStatus('Looking for the whole body…'); const wb = await findWholeBody(sc, b, setAiStatus); if (wb) { Object.assign(b, wb.box); cls = wb.cls; toast('Whole ' + wb.cls + ' found'); setAiStatus('Whole ' + wb.cls + ' found.'); } }
    const a0 = await boxCutFlow(b, nm); if (cls) applyBodyDefaults(a0, cls); refreshAll(); showTab('cut');
  } else if (d.mode === 'bodyclick') {
    setAiStatus('Looking for the whole body…'); toast('Looking for a person or animal…');
    const wb = await findWholeBody(sc, { x: d.x0 * W, y: d.y0 * H }, setAiStatus);
    if (!wb) return toast('No person or animal found there (the detector needs internet once). Try "Box it" or "Draw around it".');
    const a0 = await boxCutFlow(wb.box, null); applyBodyDefaults(a0, wb.cls); refreshAll(); setAiStatus('Whole ' + wb.cls + ' cut out. Only it moves. Tap another one.'); showTab('cut');
  } else if (d.mode === 'aiclick') {
    const moved = Math.abs(d.x1 - d.x0) > .01 || Math.abs(d.y1 - d.y0) > .01;
    let wbCls = null, wbBox = null;
    if ($('#snapBody').checked && !moved) { const wb = await findWholeBody(sc, { x: d.x0 * W, y: d.y0 * H }, setAiStatus); if (wb) { wbCls = wb.cls; wbBox = wb.box; } }
    if (!AI.sam) { if (wbBox) { const a0 = await boxCutFlow(wbBox, null); applyBodyDefaults(a0, wbCls); refreshAll(); return; } return toast('Press "Load AI model" first (it is optional). Meanwhile "Box it" and "Draw around it" work.'); }
    const prompt = wbBox ? { box: [wbBox.x, wbBox.y, wbBox.x + wbBox.w, wbBox.y + wbBox.h] } : moved ? { box: [Math.min(d.x0, d.x1) * W, Math.min(d.y0, d.y1) * H, Math.max(d.x0, d.x1) * W, Math.max(d.y0, d.y1) * H] } : { points: [[d.x0 * W, d.y0 * H, 1]] };
    try { toast('AI is cutting it out…'); const m = await aiSegment(sc, prompt, setAiStatus); const a1 = commitCut(m, null); if (wbCls) { applyBodyDefaults(a1, wbCls); refreshAll(); } setAiStatus('Done. Tap another thing, or choose its behaviour.'); }
    catch (err) { console.error(err); setAiStatus('AI cut failed: ' + (err.message || err)); }
  } else if (d.mode === 'path') {
    const a = selActor(); if (!a) return;
    if (d.moved) a.path = d.pts.slice(1).map(p => ({ x: p.x, y: p.y }));
    else a.path = a.path.concat([{ x: d.pts[0].x, y: d.pts[0].y }]);
    a.behavior = 'walk'; a._sched = null; rebuildActors(sc); refreshActors();
  } else if (d.mode === 'area') {
    const a = selActor(); if (!a) return;
    const q = normRect(d.x0, d.y0, d.x1, d.y1);
    if (q.w > .02 && q.h > .01) { a.area = q; a.behavior = 'wander'; a.peck = a.peck || true; a._sched = null; rebuildActors(sc); refreshActors(); }
  }
});
window.addEventListener('keydown', e => {
  if ((e.key === 'Delete' || e.key === 'Backspace') && !/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) { deleteSelected(); }
});

/* ---------- overlay drawing ---------- */
function drawOverlay() {
  octx.clearRect(0, 0, W, H);
  const sc = curScene(); if (!sc || PA.mode !== 'edit') return;
  const k = W / 800;
  sc.regions.forEach((r, i) => {
    const p = P(r), sel = PA.selKind === 'region' && i === PA.selIdx;
    octx.lineWidth = (sel ? 3 : 1.5) * k; octx.strokeStyle = sel ? '#ffd34d' : 'rgba(255,255,255,.7)';
    octx.setLineDash(sel ? [] : [6 * k, 4 * k]); octx.strokeRect(p.x, p.y, p.w, p.h); octx.setLineDash([]);
    octx.font = `${14 * k}px system-ui`; octx.fillText(EFFECTS[r.type].icon, p.x + 3 * k, p.y + 15 * k);
    if (sel) { octx.fillStyle = '#ffd34d'; octx.fillRect(p.x + p.w - 7 * k, p.y + p.h - 7 * k, 14 * k, 14 * k); octx.fillStyle = '#fff'; }
    if (r.type === 'puppet' && r.pins) r.pins.forEach((q, j) => {
      const px = p.x + q.x * p.w, py = p.y + q.y * p.h;
      octx.beginPath(); octx.arc(px, py, 6 * k, 0, 6.283); octx.fillStyle = q.kind === 'anchor' ? '#3b82f6' : '#ff8a3d'; octx.fill();
      octx.lineWidth = 2 * k; octx.strokeStyle = (sel && j === PA.selPin) ? '#ffe066' : '#fff'; octx.stroke();
    });
  });
  sc.actors.forEach((a, i) => {
    const sel = PA.selKind === 'actor' && i === PA.selIdx, bx = a.nx * W, by = a.ny * H, bw = a.nw * W, bh = a.nh * H;
    octx.lineWidth = (sel ? 2.5 : 1.2) * k; octx.strokeStyle = sel ? '#4de1ff' : 'rgba(77,225,255,.55)'; octx.setLineDash([5 * k, 4 * k]); octx.strokeRect(bx, by, bw, bh); octx.setLineDash([]);
    octx.font = `${12 * k}px system-ui`; octx.fillStyle = '#4de1ff'; octx.fillText('✂ ' + a.name, bx + 3 * k, by - 4 * k);
    if (sel) {
      const o = actorOrigin(a);
      if (a.behavior === 'walk' && a.path.length) {
        octx.strokeStyle = '#4de1ff'; octx.lineWidth = 2.5 * k; octx.beginPath(); octx.moveTo(o.x, o.y);
        a.path.forEach(p => octx.lineTo(p.x * W, p.y * H)); octx.stroke();
        a.path.forEach(p => { octx.beginPath(); octx.arc(p.x * W, p.y * H, 4 * k, 0, 6.283); octx.fillStyle = '#4de1ff'; octx.fill(); });
      }
      if (a.behavior === 'wander' && a.area) { octx.strokeStyle = '#7dff9a'; octx.setLineDash([8 * k, 5 * k]); octx.strokeRect(a.area.x * W, a.area.y * H, a.area.w * W, a.area.h * H); octx.setLineDash([]); }
      octx.beginPath(); octx.arc(o.x, o.y, 5 * k, 0, 6.283); octx.fillStyle = '#ffd34d'; octx.fill();
    }
  });
  if (drag) {
    octx.lineWidth = 2 * k; octx.strokeStyle = '#3b82f6'; octx.setLineDash([6 * k, 4 * k]);
    if (drag.mode === 'new' || drag.mode === 'cutbox' || drag.mode === 'aiclick' || drag.mode === 'area') { const q = normRect(drag.x0, drag.y0, drag.x1, drag.y1); octx.strokeRect(q.x * W, q.y * H, q.w * W, q.h * H); }
    if (drag.mode === 'lasso') { octx.setLineDash([]); octx.strokeStyle = '#ff5ad2'; octx.lineWidth = 2.5 * k; octx.beginPath(); drag.pts.forEach((p, i) => i ? octx.lineTo(p.x, p.y) : octx.moveTo(p.x, p.y)); octx.stroke(); }
    if (drag.mode === 'path') { octx.setLineDash([]); octx.strokeStyle = '#4de1ff'; octx.lineWidth = 2.5 * k; octx.beginPath(); drag.pts.forEach((p, i) => i ? octx.lineTo(p.x * W, p.y * H) : octx.moveTo(p.x * W, p.y * H)); octx.stroke(); }
    octx.setLineDash([]);
  }
}

/* ---------- auto detect ---------- */
$('#autoWalk').onclick = async () => {
  const sc = curScene(); if (!sc) return;
  $('#autoWalk').disabled = true;
  try {
    const preds = await detectObjects(sc.orig, setStatus);
    const OK = new Set(['bird', 'dog', 'cat', 'horse', 'sheep', 'cow', 'person']);
    const list = preds.filter(p => OK.has(p.class)).sort((a, b) => b.bbox[2] * b.bbox[3] - a.bbox[2] * a.bbox[3]).slice(0, 8);
    if (!list.length) { setStatus('No birds, animals or people found. Use "Draw around it" or "Box it" on the Cut-outs tab.'); }
    let n = 0;
    for (const p of list) {
      const [bx, by, bw, bh] = p.bbox; n++;
      setStatus(`Cutting out ${p.class} ${n} of ${list.length}…`); await sleep(20);
      const name = p.class.charAt(0).toUpperCase() + p.class.slice(1) + ' ' + n;
      const a = await boxCutFlow({ x: bx, y: by, w: bw, h: bh }, name, p.class === 'bird' ? 'wander' : 'stay');
      if (a && p.class === 'bird') { a.peck = true; a.speed = .6; }
      if (a && p.class !== 'bird') a.peck = false;
    }
    if (list.length) setStatus(`Made ${n} cut-out(s). Check each outline; fix with "Draw around it" if needed. Birds wander and peck; select one to draw a path instead.`);
  } catch (err) { console.warn(err); setStatus('Detection failed (internet needed once for the model): ' + (err.message || err)); }
  $('#autoWalk').disabled = false; refreshAll();
};

/* ---------- refresh everything ---------- */
function refreshAll() {
  if (typeof syncGlobals === 'function') syncGlobals(true);
  refreshStrip(); refreshFx(); refreshActors(); refreshScenePane(); refreshVoice(); buildTimeline(); updateTotal();
}

/* ---------- main loop ---------- */
function frame(now) {
  requestAnimationFrame(frame);
  const sc = curScene(); if (!sc || PA.busy) return;
  if (PA.mode === 'project') {
    const T = (now - PA.projStart) / 1000;
    if (T >= PA.projTotal) { endProjectPlayback(); return; }
    renderProject(Math.max(0, T), viewCtx); octx.clearRect(0, 0, W, H);
    $('#timeLbl').textContent = Math.max(0, T).toFixed(1) + ' / ' + PA.projTotal.toFixed(1) + ' s (all scenes)';
    if (!$('#prog').hidden) $('#prog').value = clamp(T / PA.projTotal, 0, 1);
    return;
  }
  const t = previewTime(now), tl = ((t % sc.dur) + sc.dur) % sc.dur;
  renderSceneTo(sc, viewCtx, t, tl);
  drawOverlay(); updateTimeUI(tl);
}

/* ---------- start ---------- */
buildTools(); buildAmbUI(); setTool('smoke'); refreshAll();
requestAnimationFrame(frame);
