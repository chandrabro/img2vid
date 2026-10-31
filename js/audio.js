'use strict';
/* ===== Sound: procedural ambience (no audio files), music, voice-over ===== */
const AMB_DEFS = [['wind', '🌬 Wind'], ['birds', '🐦 Birds'], ['hens', '🐔 Hens'], ['fire', '🔥 Fire'], ['water', '🌊 Water / stream'], ['rain', '🌧 Rain'], ['crickets', '🦗 Crickets']];
const AMB_PRESETS = {
  village: { wind: .25, birds: .5, hens: .35, fire: 0, water: 0, rain: 0, crickets: 0 },
  night: { wind: .12, birds: 0, hens: 0, fire: .4, water: 0, rain: 0, crickets: .6 },
  river: { wind: .2, birds: .35, hens: 0, fire: 0, water: .6, rain: 0, crickets: 0 },
  rain: { wind: .3, birds: 0, hens: 0, fire: 0, water: 0, rain: .6, crickets: 0 },
  off: { wind: 0, birds: 0, hens: 0, fire: 0, water: 0, rain: 0, crickets: 0 }
};
const AudioCtor = window.AudioContext || window.webkitAudioContext;

function hasAnySound() {
  const A = PA.audio;
  return Object.values(A.amb).some(v => v > 0) || !!A.music || PA.scenes.some(s => s.voice);
}
function noiseBuffer(ctx) {
  const len = ctx.sampleRate * 2, b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0), r = rng(3);
  let last = 0;
  for (let i = 0; i < len; i++) { const w = r() * 2 - 1; last = (last + .02 * w) / 1.02; d[i] = (w * .5 + last * 3.5) * .6; }
  return b;
}

/* Schedules every sound for `total` seconds starting at t0 into any audio context (live or offline) */
function buildAudio(ctx, dest, total, layout, t0) {
  const A = PA.audio, amb = A.amb, rnd = rng(11), end = t0 + total + .2;
  const master = ctx.createGain(); master.gain.value = A.master; master.connect(dest);
  const nb = noiseBuffer(ctx);
  const loopNoise = (vol, type, freq, q) => {
    const s = ctx.createBufferSource(); s.buffer = nb; s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q || .7;
    const g = ctx.createGain(); g.gain.value = vol;
    s.connect(f); f.connect(g); g.connect(master); s.start(t0, rnd() * 1.5); s.stop(end);
    return { f, g };
  };
  const lfo = (freq, depth, param) => {
    const o = ctx.createOscillator(); o.frequency.value = freq;
    const g = ctx.createGain(); g.gain.value = depth; o.connect(g); g.connect(param); o.start(t0); o.stop(end);
  };
  if (amb.wind > 0) { const w = loopNoise(amb.wind * .55, 'lowpass', 450, .7); lfo(.11, 180, w.f.frequency); lfo(.17, amb.wind * .2, w.g.gain); }
  if (amb.water > 0) { loopNoise(amb.water * .4, 'bandpass', 900, .35); loopNoise(amb.water * .16, 'highpass', 3500, .5); }
  if (amb.rain > 0) { loopNoise(amb.rain * .32, 'highpass', 1400, .5); loopNoise(amb.rain * .18, 'bandpass', 5000, .7); }
  if (amb.fire > 0) {
    loopNoise(amb.fire * .2, 'lowpass', 220, .7);
    for (let tm = t0 + .1; tm < t0 + total; tm += .04 + rnd() * .28) {
      const s = ctx.createBufferSource(); s.buffer = nb;
      const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 1200 + rnd() * 2500;
      const g = ctx.createGain(); s.connect(f); f.connect(g); g.connect(master);
      g.gain.setValueAtTime(0, tm); g.gain.linearRampToValueAtTime(amb.fire * (.15 + rnd() * .5), tm + .003);
      g.gain.exponentialRampToValueAtTime(.0001, tm + .02 + rnd() * .04);
      s.start(tm, rnd() * 1.8); s.stop(tm + .08);
    }
  }
  const chirp = (tm, f0, vol) => {
    const o = ctx.createOscillator(); o.type = 'sine'; const g = ctx.createGain(); o.connect(g); g.connect(master);
    const d = .07 + rnd() * .07;
    o.frequency.setValueAtTime(f0, tm); o.frequency.exponentialRampToValueAtTime(f0 * (1.25 + rnd() * .5), tm + d * .6); o.frequency.exponentialRampToValueAtTime(f0 * .9, tm + d);
    g.gain.setValueAtTime(0, tm); g.gain.linearRampToValueAtTime(vol, tm + .012); g.gain.linearRampToValueAtTime(0, tm + d);
    o.start(tm); o.stop(tm + d + .02);
  };
  if (amb.birds > 0) {
    for (let tm = t0 + rnd() * 1.5; tm < t0 + total; tm += 1 + rnd() * 3.5) {
      const n = 2 + Math.floor(rnd() * 4), f0 = 2200 + rnd() * 1800, sp = .11 + rnd() * .06;
      for (let k = 0; k < n; k++) chirp(tm + k * sp, f0 * (1 + .05 * k * (rnd() - .3)), amb.birds * .08);
    }
  }
  const cluck = (tm, vol) => {
    const o = ctx.createOscillator(); o.type = 'sawtooth';
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 2.5;
    const g = ctx.createGain(); o.connect(f); f.connect(g); g.connect(master);
    const d = .09;
    o.frequency.setValueAtTime(420, tm); o.frequency.exponentialRampToValueAtTime(260, tm + d);
    g.gain.setValueAtTime(0, tm); g.gain.linearRampToValueAtTime(vol, tm + .01); g.gain.exponentialRampToValueAtTime(.0001, tm + d);
    o.start(tm); o.stop(tm + d + .02);
  };
  if (amb.hens > 0) {
    for (let tm = t0 + 1 + rnd() * 3; tm < t0 + total; tm += 2.5 + rnd() * 6) {
      const n = 2 + Math.floor(rnd() * 4);
      for (let k = 0; k < n; k++) cluck(tm + k * (.15 + rnd() * .05), amb.hens * (.22 + .1 * rnd()));
    }
  }
  if (amb.crickets > 0) {
    [[4300, 26], [4800, 21]].forEach(([fr, lf]) => {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = fr;
      const g = ctx.createGain(); g.gain.value = amb.crickets * .02; o.connect(g); g.connect(master);
      lfo(lf, amb.crickets * .02, g.gain); o.start(t0); o.stop(end);
    });
  }
  if (A.music) {
    const s = ctx.createBufferSource(); s.buffer = A.music; s.loop = true;
    const g = ctx.createGain(); g.gain.value = A.musicVol; s.connect(g); g.connect(master); s.start(t0); s.stop(end);
  }
  (layout.items || []).forEach(it => {
    const sc = PA.scenes[it.i];
    if (sc && sc.voice) { const s = ctx.createBufferSource(); s.buffer = sc.voice; s.connect(master); s.start(t0 + it.start); }
  });
}

/* live preview */
let previewCtx = null;
async function togglePreviewSound() {
  if (previewCtx) { try { previewCtx.close(); } catch (e) { } previewCtx = null; return false; }
  const ctx = new AudioCtor(); await ctx.resume();
  const lay = projectLayout();
  buildAudio(ctx, ctx.destination, Math.max(60, lay.total), lay, ctx.currentTime + .05);
  previewCtx = ctx; return true;
}
function stopPreviewSound() { if (previewCtx) { try { previewCtx.close(); } catch (e) { } previewCtx = null; } }

/* decoding + voice recording */
async function decodeBlob(blob) {
  const ctx = new AudioCtor(), ab = await blob.arrayBuffer();
  try { return await ctx.decodeAudioData(ab); } finally { try { ctx.close(); } catch (e) { } }
}
const VOICE = { rec: null, chunks: [], stream: null };
async function voiceStart(onDone) {
  VOICE.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  VOICE.chunks = []; VOICE.rec = new MediaRecorder(VOICE.stream);
  VOICE.rec.ondataavailable = e => { if (e.data && e.data.size) VOICE.chunks.push(e.data); };
  VOICE.rec.onstop = async () => {
    VOICE.stream.getTracks().forEach(t => t.stop());
    try { onDone(await decodeBlob(new Blob(VOICE.chunks, { type: VOICE.rec.mimeType }))); } catch (e) { onDone(null, e); }
  };
  VOICE.rec.start();
}
function voiceStop() { if (VOICE.rec && VOICE.rec.state !== 'inactive') VOICE.rec.stop(); }
async function playBufferOnce(buf) {
  const ctx = new AudioCtor(); await ctx.resume();
  const s = ctx.createBufferSource(); s.buffer = buf; s.connect(ctx.destination); s.start();
  s.onended = () => { try { ctx.close(); } catch (e) { } };
}
