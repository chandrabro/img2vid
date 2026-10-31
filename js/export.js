'use strict';
/* ===== Export: real-time record, fast MP4 (WebCodecs), GIF, save / load ===== */
const MUXER_URL = 'https://cdn.jsdelivr.net/npm/mp4-muxer@5.2.2/build/mp4-muxer.js';
const GIFENC_URL = 'https://cdn.jsdelivr.net/npm/gifenc@1.0.3/dist/gifenc.esm.js';
const sleep = ms => new Promise(r => setTimeout(r, ms));

function showResult(blob, ext, note) {
  const url = URL.createObjectURL(blob), res = $('#result');
  const isImg = ext === 'gif';
  let vid = $('#outVideo'), img = $('#outGif');
  if (!img) { img = document.createElement('img'); img.id = 'outGif'; img.style.cssText = 'width:100%;border-radius:10px'; vid.after(img); }
  vid.hidden = isImg; img.hidden = !isImg;
  if (isImg) img.src = url; else vid.src = url;
  $('#dl').href = url; $('#dl').download = 'animated.' + ext;
  $('#fmtNote').textContent = note || '';
  res.hidden = false;
  res.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
function setProg(p, text) {
  const pr = $('#prog'); pr.hidden = p == null; if (p != null) pr.value = p;
  $('#expStatus').textContent = text || '';
}
function setExportBusy(b) {
  PA.busy = b;
  ['#recFast', '#recRT', '#recGif'].forEach(s => { $(s).disabled = b; });
}

/* ---- project playback clock (used by real-time record and "play all") ---- */
function startProjectPlayback(onEnd) {
  const lay = projectLayout();
  PA.mode = 'project'; PA.projStart = performance.now() + 120; PA.projTotal = lay.total; PA.onProjectEnd = onEnd || null;
}
function endProjectPlayback() {
  PA.mode = 'edit'; const f = PA.onProjectEnd; PA.onProjectEnd = null;
  if (f) f();
}

/* ---- real-time recording (works everywhere, includes sound) ---- */
async function recordRealtime() {
  if (!PA.scenes.length) return;
  if (typeof MediaRecorder === 'undefined' || !view.captureStream) { alert('This browser cannot record video from a canvas. Please use a recent Chrome, Edge, Firefox or Safari.'); return; }
  stopPreviewSound();
  const lay = projectLayout();
  setExportBusy(true); PA.busy = false;       // keep the preview loop running (it draws the frames)
  setProg(0, 'Recording… keep this tab open and visible.');
  const stream = view.captureStream(PA.fps);
  let actx = null;
  if (hasAnySound()) {
    try {
      actx = new AudioCtor(); await actx.resume();
      const dest = actx.createMediaStreamDestination();
      buildAudio(actx, dest, lay.total, lay, actx.currentTime + .12);
      dest.stream.getAudioTracks().forEach(t => stream.addTrack(t));
    } catch (e) { actx = null; }
  }
  const types = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
  const mime = types.find(m => MediaRecorder.isTypeSupported(m)) || '';
  let rec; const chunks = [];
  try { rec = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 8e6 } : {}); } catch (e) { rec = new MediaRecorder(stream); }
  rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
  rec.onstop = () => {
    if (actx) { try { actx.close(); } catch (e) { } }
    const type = rec.mimeType || mime || 'video/webm', ext = type.includes('mp4') ? 'mp4' : 'webm';
    showResult(new Blob(chunks, { type }), ext, ext === 'webm' ? 'This browser saves WebM. For MP4 use the Fast MP4 button or a recent Chrome/Safari.' : '');
    setProg(null, 'Done!'); setExportBusy(false);
  };
  rec.start(250);
  startProjectPlayback(() => rec.stop());
}

/* ---- fast MP4 via WebCodecs (renders faster than real time) ---- */
async function exportFastMP4() {
  if (!PA.scenes.length) return;
  if (!window.VideoEncoder || !window.VideoFrame) { toast('Fast MP4 needs a recent Chrome, Edge or Safari. Use "Record in real time" instead.'); $('#expStatus').textContent = 'Your browser has no WebCodecs. Use "Record in real time".'; return; }
  stopPreviewSound(); setExportBusy(true);
  try {
    setProg(0, 'Loading the MP4 writer…');
    if (!window.Mp4Muxer) await loadScript(MUXER_URL);
    const { Muxer, ArrayBufferTarget } = window.Mp4Muxer;
    const fps = PA.fps, lay = projectLayout(), total = lay.total, n = Math.max(1, Math.round(total * fps));
    const cands = [['avc1.640028', 'avc'], ['avc1.4d0028', 'avc'], ['avc1.42001f', 'avc'], ['vp09.00.10.08', 'vp9']];
    let vc = null;
    for (const [cs, name] of cands) {
      const cfg = { codec: cs, width: W, height: H, bitrate: Math.round(W * H * fps * .12), framerate: fps };
      try { const s = await VideoEncoder.isConfigSupported(cfg); if (s.supported) { vc = { cfg, name }; break; } } catch (e) { }
    }
    if (!vc) throw new Error('This browser cannot encode MP4 video at this size. Try "Fast (960 px)" quality or the real-time recorder.');
    const acfg = { codec: 'mp4a.40.2', sampleRate: 44100, numberOfChannels: 2, bitrate: 128000 };
    let audioOK = false;
    if (hasAnySound() && window.AudioEncoder && window.AudioData && window.OfflineAudioContext) {
      try { audioOK = (await AudioEncoder.isConfigSupported(acfg)).supported; } catch (e) { }
    }
    const target = new ArrayBufferTarget();
    const muxer = new Muxer({ target, video: { codec: vc.name, width: W, height: H }, audio: audioOK ? { codec: 'aac', numberOfChannels: 2, sampleRate: 44100 } : undefined, fastStart: 'in-memory' });
    let encErr = null;
    const venc = new VideoEncoder({ output: (c, m) => muxer.addVideoChunk(c, m), error: e => { encErr = e; } });
    venc.configure(vc.cfg);
    const ex = makeCanvas(W, H), ectx = ex.getContext('2d');
    for (let i = 0; i < n; i++) {
      if (encErr) throw encErr;
      renderProject(i / fps, ectx);
      const vf = new VideoFrame(ex, { timestamp: Math.round(i * 1e6 / fps), duration: Math.round(1e6 / fps) });
      venc.encode(vf, { keyFrame: i % (fps * 2) === 0 }); vf.close();
      while (venc.encodeQueueSize > 8) await sleep(2);
      if (i % 4 === 0) { setProg(i / n * (audioOK ? .85 : .97), `Rendering frame ${i + 1} of ${n}…`); await sleep(0); }
    }
    await venc.flush();
    if (audioOK) {
      setProg(.88, 'Mixing sound…');
      const oc = new OfflineAudioContext(2, Math.ceil(total * 44100), 44100);
      buildAudio(oc, oc.destination, total, lay, 0);
      const buf = await oc.startRendering();
      const aenc = new AudioEncoder({ output: (c, m) => muxer.addAudioChunk(c, m), error: e => { encErr = e; } });
      aenc.configure(acfg);
      const c0 = buf.getChannelData(0), c1 = buf.getChannelData(1), step = 4096;
      for (let off = 0; off < buf.length; off += step) {
        const m = Math.min(step, buf.length - off), data = new Float32Array(m * 2);
        data.set(c0.subarray(off, off + m), 0); data.set(c1.subarray(off, off + m), m);
        const ad = new AudioData({ format: 'f32-planar', sampleRate: 44100, numberOfFrames: m, numberOfChannels: 2, timestamp: Math.round(off / 44100 * 1e6), data });
        aenc.encode(ad); ad.close();
      }
      await aenc.flush();
    }
    muxer.finalize();
    showResult(new Blob([target.buffer], { type: 'video/mp4' }), 'mp4', hasAnySound() && !audioOK ? 'This browser cannot encode sound in fast mode, so the MP4 is silent. Use "Record in real time" to include sound.' : '');
    setProg(null, 'Done!');
  } catch (e) {
    console.error(e); setProg(null, 'Export failed: ' + (e.message || e));
  } finally { setExportBusy(false); }
}

/* ---- GIF ---- */
async function exportGif() {
  if (!PA.scenes.length) return;
  stopPreviewSound(); setExportBusy(true);
  try {
    setProg(0, 'Loading the GIF writer…');
    const lib = await import(GIFENC_URL);
    const lay = projectLayout(), total = lay.total, gfps = total > 20 ? 8 : 12, n = Math.max(1, Math.round(total * gfps));
    const gw = Math.min(480, W), gh = Math.max(2, Math.round(H * gw / W));
    const ex = makeCanvas(W, H), ectx = ex.getContext('2d'), sm = makeCanvas(gw, gh), sctx = sm.getContext('2d', { willReadFrequently: true });
    const gif = lib.GIFEncoder();
    for (let i = 0; i < n; i++) {
      renderProject(i / gfps, ectx);
      sctx.drawImage(ex, 0, 0, gw, gh);
      const data = sctx.getImageData(0, 0, gw, gh).data;
      const palette = lib.quantize(data, 256), index = lib.applyPalette(data, palette);
      gif.writeFrame(index, gw, gh, { palette, delay: Math.round(1000 / gfps) });
      if (i % 3 === 0) { setProg(i / n, `Frame ${i + 1} of ${n}…`); await sleep(0); }
    }
    gif.finish();
    showResult(new Blob([gif.bytes()], { type: 'image/gif' }), 'gif', 'GIFs are silent and limited to 256 colours.');
    setProg(null, 'Done!');
  } catch (e) {
    console.error(e); setProg(null, 'GIF failed: ' + (e.message || e));
  } finally { setExportBusy(false); }
}

/* ---- save / load project ---- */
const REGION_KEYS = ['type', 'x', 'y', 'w', 'h', 'strength', 'speed', 'mirror', 'delay', 'end', 'seed', 'pins'];
const ACTOR_KEYS = ['name', 'nx', 'ny', 'nw', 'nh', 'behavior', 'facesLeft', 'speed', 'size', 'gait', 'bob', 'peck', 'shadow', 'persp', 'delay', 'path', 'area', 'seed'];
function imgToDataURL(img, maxSide) {
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height, s = Math.min(1, maxSide / Math.max(iw, ih));
  const c = makeCanvas(Math.round(iw * s), Math.round(ih * s)); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', .9);
}
function pick(o, keys) { const r = {}; keys.forEach(k => { if (o[k] !== undefined) r[k] = JSON.parse(JSON.stringify(o[k])); }); return r; }
function serializeProject() {
  return {
    app: 'photo-animator-studio', version: 3, quality: PA.quality, fps: PA.fps,
    audio: { amb: PA.audio.amb, master: PA.audio.master, musicVol: PA.audio.musicVol },
    scenes: PA.scenes.map(sc => ({
      name: sc.name, img: imgToDataURL(sc.img, 1800), dur: sc.dur, trans: sc.trans, transType: sc.transType,
      cam: sc.cam, light: sc.light, caption: sc.caption, depthOn: sc.depthOn, depthInv: sc.depthInv, depthFocus: sc.depthFocus, horizon: sc.horizon,
      depth: sc.depth ? { png: sc.depth.canvas.toDataURL('image/png'), kind: sc.depth.kind } : null,
      regions: sc.regions.map(r => pick(r, REGION_KEYS)),
      actors: sc.actors.map(a => Object.assign(pick(a, ACTOR_KEYS), { maskPNG: a.mask.toDataURL('image/png') }))
    }))
  };
}
function loadImageURL(url) { return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('image failed to load')); i.src = url; }); }
async function imageToCanvas(url) { const i = await loadImageURL(url), c = makeCanvas(i.naturalWidth, i.naturalHeight); c.getContext('2d').drawImage(i, 0, 0); return c; }
async function loadProject(data) {
  if (!data || data.app !== 'photo-animator-studio') throw new Error('This is not a Photo Animator project file.');
  PA.scenes = []; PA.cur = 0; PA.selKind = null; PA.selIdx = -1;
  PA.quality = data.quality || 1280; PA.fps = data.fps || 30;
  if (data.audio) { Object.assign(PA.audio.amb, data.audio.amb || {}); PA.audio.master = data.audio.master ?? .9; PA.audio.musicVol = data.audio.musicVol ?? .5; }
  for (const s of data.scenes) {
    const img = await loadImageURL(s.img);
    if (!PA.scenes.length) { [W, H] = sizeFor(img); resizeViews(); }
    const sc = newScene(img, s.name);
    Object.assign(sc, { dur: s.dur, trans: s.trans, transType: s.transType, cam: s.cam, light: s.light, caption: s.caption || '', depthInv: !!s.depthInv, depthFocus: s.depthFocus ?? .5, horizon: s.horizon ?? .38 });
    sc.regions = (s.regions || []).map(r => Object.assign(newRegion(r.type, r), r));
    sc.actors = [];
    for (const a of (s.actors || [])) {
      const m = await imageToCanvas(a.maskPNG);
      sc.actors.push(Object.assign({ kind: 'actor', cut: null, mask: m }, a));
    }
    buildScene(sc);
    if (s.depth) { setDepth(sc, await imageToCanvas(s.depth.png), s.depth.kind); sc.depthOn = !!s.depthOn; }
    PA.scenes.push(sc);
  }
}
