'use strict';
/* ===== Optional free in-browser AI (downloaded from public CDNs on demand) ===== */
const TF_URL = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/transformers.min.js';
const AI = { tf: null, depth: null, sam: null, samProc: null, coco: null };

async function loadTF() {
  if (AI.tf) return AI.tf;
  AI.tf = await import(TF_URL);
  AI.tf.env.allowLocalModels = false;
  return AI.tf;
}
function progressText(label, p) {
  if (!p) return label;
  if (p.status === 'progress' && p.total) return `${label}: downloading ${Math.round(p.loaded / 1048576)} / ${Math.round(p.total / 1048576)} MB`;
  if (p.status === 'ready') return label + ': ready';
  return label + '…';
}

/* ---- depth (Depth Anything small) ---- */
async function aiDepthFor(sc, onText) {
  const tf = await loadTF();
  if (!AI.depth) {
    AI.depth = await tf.pipeline('depth-estimation', 'Xenova/depth-anything-small-hf', { progress_callback: p => onText && onText(progressText('Depth model', p)) });
  }
  onText && onText('Reading the picture…');
  const out = await AI.depth(sc.orig.toDataURL('image/jpeg', .9));
  const img = out.depth, w = img.width, h = img.height, ch = img.channels || 1;
  const dc = makeCanvas(w, h), dctx = dc.getContext('2d'), id = dctx.createImageData(w, h);
  for (let i = 0; i < w * h; i++) { const v = img.data[i * ch]; id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = v; id.data[i * 4 + 3] = 255; }
  dctx.putImageData(id, 0, 0);
  return dc;
}

/* ---- click / box to cut (SlimSAM) ---- */
async function aiPrepareSAM(onText) {
  const tf = await loadTF();
  if (!AI.sam) {
    AI.sam = await tf.SamModel.from_pretrained('Xenova/slimsam-77-uniform', { progress_callback: p => onText && onText(progressText('Cut-out model', p)) });
    AI.samProc = await tf.AutoProcessor.from_pretrained('Xenova/slimsam-77-uniform');
  }
}
async function aiEmbed(sc, onText) {
  if (sc._samEmb) return;
  onText && onText('Studying the picture (about 10 to 30 seconds, once per scene)…');
  const raw = await AI.tf.RawImage.read(sc.orig.toDataURL('image/jpeg', .92));
  const inputs = await AI.samProc(raw);
  const emb = await AI.sam.get_image_embeddings(inputs);
  sc._samEmb = { raw, emb };
}
/* prompt: { points:[[x,y,label]...] } or { box:[x0,y0,x1,y1] } in picture pixels */
async function aiSegment(sc, prompt, onText) {
  await aiPrepareSAM(onText);
  await aiEmbed(sc, onText);
  const { raw, emb } = sc._samEmb;
  const opts = {};
  if (prompt.box) opts.input_boxes = [[prompt.box]];
  if (prompt.points) { opts.input_points = [prompt.points.map(p => [p[0], p[1]])]; opts.input_labels = [prompt.points.map(p => p[2])]; }
  const inputs = await AI.samProc(raw, opts);
  const feed = { image_embeddings: emb.image_embeddings, image_positional_embeddings: emb.image_positional_embeddings };
  if (inputs.input_points) feed.input_points = inputs.input_points;
  if (inputs.input_labels) feed.input_labels = inputs.input_labels;
  if (inputs.input_boxes) feed.input_boxes = inputs.input_boxes;
  const outputs = await AI.sam(feed);
  const masks = await AI.samProc.post_process_masks(outputs.pred_masks, inputs.original_sizes, inputs.reshaped_input_sizes);
  const mt = masks[0], dims = mt.dims, mh = dims[dims.length - 2], mw = dims[dims.length - 1], per = mh * mw;
  const scores = outputs.iou_scores.data; let best = 0;
  for (let i = 1; i < 3; i++) if (scores[i] > scores[best]) best = i;
  const out = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const sx = Math.min(mw - 1, Math.round(x * mw / W)), sy = Math.min(mh - 1, Math.round(y * mh / H));
    if (mt.data[best * per + sy * mw + sx]) out[y * W + x] = 255;
  }
  return out;
}

/* ---- object detection (COCO-SSD) and fire colour detection ---- */
async function loadCoco(onText) {
  if (AI.coco) return AI.coco;
  onText && onText('Downloading the free detection model (one time)…');
  await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js');
  await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js');
  AI.coco = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
  return AI.coco;
}
async function detectObjects(canvas, onText) {
  const m = await loadCoco(onText);
  return m.detect(canvas, 20, .25);
}
function detectFire(sc) {
  /* flame = very bright saturated orange with dark surroundings (hearth), in the lower part of the picture */
  const gw = 280, gh = Math.max(8, Math.round(gw * H / W)), N = gw * gh;
  const c = makeCanvas(gw, gh), cx = c.getContext('2d', { willReadFrequently: true });
  cx.drawImage(sc.orig, 0, 0, gw, gh);
  const d = cx.getImageData(0, 0, gw, gh).data, org = new Float32Array(N), dk = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const R = d[i * 4], G = d[i * 4 + 1], B = d[i * 4 + 2], y = ((i / gw) | 0) / gh;
    if (y > .6 && R > 235 && G > 160 && G < 215 && B < 110 && G < R * .9) org[i] = 1;
    if ((R + G + B) / 3 < 100) dk[i] = 1;
  }
  const bo = boxBlurF(org, gw, gh, 1), bd = boxBlurF(dk, gw, gh, 5), m = new Uint8Array(N);
  for (let i = 0; i < N; i++) if (bo[i] > .12 && bd[i] > .12) m[i] = 1;
  const cs = components(m, gw, gh, 3); if (!cs.length) return null;
  const b = cs[0], bw = (b.x1 - b.x0 + 1) / gw, bh = (b.y1 - b.y0 + 1) / gh;
  const w = Math.max(.05, bw * 1.5), h = Math.max(.07, bh * 1.6);
  return { x: clamp(b.x0 / gw + bw / 2 - w / 2, 0, 1 - w), y: clamp(b.y0 / gh + bh / 2 - h / 2, 0, 1 - h), w, h };
}
