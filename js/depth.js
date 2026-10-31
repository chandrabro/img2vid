'use strict';
/* ===== Depth + 3D camera (WebGL parallax) ===== */
const GLX = { gl: null, cv: null, prog: null, loc: {}, imgTex: null, ok: null, vbo: null };

function glInit() {
  if (GLX.ok !== null) return GLX.ok;
  try {
    const cv = makeCanvas(W, H);
    const gl = cv.getContext('webgl', { premultipliedAlpha: false, preserveDrawingBuffer: true, antialias: false });
    if (!gl) throw new Error('no webgl');
    const vs = `attribute vec2 p; varying vec2 vUv; void main(){ vUv = vec2(p.x*.5+.5, p.y*.5+.5); gl_Position = vec4(p,0.,1.); }`;
    const fs = `precision mediump float; varying vec2 vUv; uniform sampler2D uImg, uDepth;
      uniform float uZoom, uPush, uFocus, uInv; uniform vec2 uShift, uPan;
      float dep(vec2 uv){ float d = texture2D(uDepth, uv).r; return mix(d, 1.-d, uInv); }
      vec2 warp(vec2 uv, float d){ float z = uZoom + (d-uFocus)*uPush; return (uv-.5)/z + .5 + (d-uFocus)*uShift + uPan; }
      void main(){
        vec2 u0 = warp(vUv, dep(vUv));
        vec2 u1 = warp(vUv, dep(u0));
        gl_FragColor = vec4(texture2D(uImg, u1).rgb, 1.);
      }`;
    const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
    const pr = gl.createProgram(); gl.attachShader(pr, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error('link failed');
    gl.useProgram(pr);
    const vbo = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const pl = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(pl); gl.vertexAttribPointer(pl, 2, gl.FLOAT, false, 0, 0);
    ['uImg', 'uDepth', 'uZoom', 'uPush', 'uFocus', 'uInv', 'uShift', 'uPan'].forEach(n => GLX.loc[n] = gl.getUniformLocation(pr, n));
    gl.uniform1i(GLX.loc.uImg, 0); gl.uniform1i(GLX.loc.uDepth, 1);
    GLX.imgTex = glTex(gl);
    Object.assign(GLX, { gl, cv, prog: pr, vbo, ok: true });
  } catch (e) { console.warn('WebGL parallax unavailable:', e); GLX.ok = false; }
  return GLX.ok;
}
function glTex(gl) {
  const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return t;
}
function glResize() { if (GLX.cv && (GLX.cv.width !== W || GLX.cv.height !== H)) { GLX.cv.width = W; GLX.cv.height = H; } }

/* draw `comp` into tctx using the scene depth map and camera params {zoom,push,shift:[x,y],pan:[x,y]} */
function glPresent(sc, tctx, cam) {
  if (!glInit()) return false;
  glResize();
  const gl = GLX.gl;
  gl.viewport(0, 0, W, H); gl.useProgram(GLX.prog);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, GLX.imgTex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, sc.comp);
  gl.activeTexture(gl.TEXTURE1);
  if (!sc.depth.tex) { sc.depth.tex = glTex(gl); sc.depth.texVer = -1; }
  gl.bindTexture(gl.TEXTURE_2D, sc.depth.tex);
  if (sc.depth.texVer !== sc.depth.ver) { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, sc.depth.canvas); sc.depth.texVer = sc.depth.ver; }
  gl.uniform1f(GLX.loc.uZoom, cam.zoom); gl.uniform1f(GLX.loc.uPush, cam.push);
  gl.uniform1f(GLX.loc.uFocus, sc.depthFocus); gl.uniform1f(GLX.loc.uInv, sc.depthInv ? 1 : 0);
  gl.uniform2f(GLX.loc.uShift, cam.shift[0], cam.shift[1]); gl.uniform2f(GLX.loc.uPan, cam.pan[0], cam.pan[1]);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  tctx.drawImage(GLX.cv, 0, 0, W, H);
  return true;
}
function dropSceneTex(sc) {
  if (sc.depth && sc.depth.tex && GLX.gl) { GLX.gl.deleteTexture(sc.depth.tex); sc.depth.tex = null; }
}

/* ---- depth maps ---- */
function quickDepthCanvas(sc) {
  const w = 256, h = Math.max(2, Math.round(256 * H / W)), c = makeCanvas(w, h), x = c.getContext('2d'), id = x.createImageData(w, h);
  const hz = sc.horizon;
  for (let j = 0; j < h; j++) {
    const v = j / (h - 1);
    const dd = clamp((v - hz) / (1 - hz), 0, 1);
    const val = Math.round(255 * (.08 + .92 * Math.pow(dd, .85)));
    for (let i = 0; i < w; i++) { const o = (j * w + i) * 4; id.data[o] = id.data[o + 1] = id.data[o + 2] = val; id.data[o + 3] = 255; }
  }
  x.putImageData(id, 0, 0);
  return c;
}
function setDepth(sc, canvas, kind) {
  dropSceneTex(sc);
  sc.depth = { canvas, kind, ver: (sc.depth ? sc.depth.ver : 0) + 1, tex: null, texVer: -1 };
  sc.depthOn = true;
}
function refreshQuickDepth(sc) {
  if (sc.depth && sc.depth.kind === 'quick') setDepth(sc, quickDepthCanvas(sc), 'quick');
}

/* ---- camera path (shared by 2D fallback and 3D) ---- */
function camParams(sc, tl) {
  const d = Math.max(1, sc.dur), p = clamp(tl / d, 0, 1), e = smooth(p), amt = sc.cam.amount, ang = p * Math.PI * 2;
  const c = { zoom: 1, push: 0, shift: [0, 0], pan: [0, 0] };
  switch (sc.cam.mode) {
    case 'breathe': c.zoom = 1 + .035 * amt * (.5 - .5 * Math.cos(ang)); break;
    case 'in': c.zoom = 1 + .08 * amt * e; break;
    case 'out': c.zoom = 1 + .08 * amt * (1 - e); break;
    case 'left': c.zoom = 1.06; c.pan = [(.5 - e) * .035 * amt * 2, 0]; break;
    case 'right': c.zoom = 1.06; c.pan = [(e - .5) * .035 * amt * 2, 0]; break;
    case 'orbit': c.zoom = 1.08; c.shift = [Math.sin(ang) * .035 * amt, -Math.cos(ang) * .018 * amt]; break;
    case 'sway': c.zoom = 1.08; c.shift = [Math.sin(ang) * .05 * amt, 0]; break;
    case 'push': c.zoom = 1.02; c.push = .12 * amt * e; break;
  }
  /* overscan: always zoom in enough that no sample can fall outside the picture (no blank/stretched edges) */
  const f = sc.depthOn && sc.depth ? Math.max(sc.depthFocus, 1 - sc.depthFocus, .5) : 1, k = sc.depthOn && sc.depth ? 1 : .6;
  const mx = Math.abs(c.pan[0]) + Math.abs(c.shift[0]) * f * k, my = Math.abs(c.pan[1]) + Math.abs(c.shift[1]) * f * k;
  const m = Math.min(.42, Math.max(mx, my) + .012), need = 1 / (1 - 2 * m) + Math.abs(c.push) * f;
  if (c.zoom < need) c.zoom = need;
  return c;
}
