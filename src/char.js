import * as THREE from 'three';
import {INK, rng} from './kit.js';

const inkMat = new THREE.MeshBasicMaterial({color: INK, side: THREE.DoubleSide});
const fillCache = new Map();
function fillMat(c) {
  if (!fillCache.has(c)) fillCache.set(c, new THREE.MeshBasicMaterial({color: c, side: THREE.DoubleSide}));
  return fillCache.get(c);
}

// polygon points -> flat fill + wobbly ink band behind it
function flat(pts, color, z, band = 0.022, seed = 1) {
  const g = new THREE.Group();
  const r = rng(seed);
  const shape = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  const fill = new THREE.Mesh(new THREE.ShapeGeometry(shape), fillMat(color));
  fill.position.z = z;
  const n = pts.length, out = [];
  for (let i = 0; i < n; i++) {
    const p = pts[i], a = pts[(i - 1 + n) % n], b = pts[(i + 1) % n];
    let tx = b[0] - a[0], ty = b[1] - a[1]; const L = Math.hypot(tx, ty) || 1; tx /= L; ty /= L;
    const w = band * (0.8 + r() * 0.45);
    out.push(new THREE.Vector2(p[0] + ty * w, p[1] - tx * w));
  }
  const area = pts.reduce((s, p, i) => s + p[0] * pts[(i + 1) % n][1] - pts[(i + 1) % n][0] * p[1], 0);
  let inkPts = out;
  if (area < 0) inkPts = pts.map((p, i) => { const o = out[i]; return new THREE.Vector2(2 * p[0] - o.x, 2 * p[1] - o.y); });
  const inkM = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape(inkPts)), inkMat);
  inkM.position.z = z - 0.004;
  g.add(inkM, fill);
  return g;
}
function circlePts(cx, cy, rx, ry = rx, n = 28, a0 = 0, a1 = Math.PI * 2) {
  const p = []; for (let i = 0; i < n; i++) { const a = a0 + (a1 - a0) * i / (n - (a1 - a0 >= 6.28 ? 0 : 1)); p.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); }
  return p;
}
function stick(x0, y0, x1, y1, w0, w1) {
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1e-4, nx = -dy / L, ny = dx / L;
  const s = new THREE.Shape([
    new THREE.Vector2(x0 + nx * w0, y0 + ny * w0), new THREE.Vector2(x1 + nx * w1, y1 + ny * w1),
    new THREE.Vector2(x1 - nx * w1, y1 - ny * w1), new THREE.Vector2(x0 - nx * w0, y0 - ny * w0)]);
  return new THREE.Mesh(new THREE.ShapeGeometry(s), inkMat);
}
// polyline of sticks (arc / curve)
function line(pts, w, z = 0.025) {
  const g = new THREE.Group();
  for (let i = 0; i < pts.length - 1; i++) { const s = stick(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], w, w); s.position.z = z; g.add(s); }
  return g;
}
const heartPts = (cx, cy, s) => { const p = []; for (let i = 0; i < 24; i++) { const t = i / 24 * Math.PI * 2; p.push([cx + s * 0.0625 * 16 * Math.pow(Math.sin(t), 3), cy + s * 0.0625 * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t))]); } return p; };

export const PALETTES = {
  blue: {jacket: '#3e6fb0', jacket2: '#335d95', tie: '#f2d36b', hair: '#2b1d17'},
  orange: {jacket: '#e08a3c', jacket2: '#c4742f', tie: '#2f5d62', hair: '#2b1d17'},
  green: {jacket: '#4f9a5a', jacket2: '#3f8049', tie: '#f2d36b', hair: '#5a3a26'},
  purple: {jacket: '#8a5aa8', jacket2: '#734a8e', tie: '#f2d36b', hair: '#2b1d17'},
  red: {jacket: '#d4483c', jacket2: '#b23a30', tie: '#fbf7ee', hair: '#3b2a22'},
  teal: {jacket: '#2f9a96', jacket2: '#277f7b', tie: '#f07a2b', hair: '#1f1a18'},
  yellow: {jacket: '#e6b840', jacket2: '#c99f33', tie: '#3e5a7a', hair: '#5a3a26'},
  pink: {jacket: '#e07aa3', jacket2: '#c4668c', tie: '#fbf7ee', hair: '#6b4430'},
  navy: {jacket: '#2e3f6b', jacket2: '#26355a', tie: '#e0533d', hair: '#1f1a18'},
  gray: {jacket: '#7a8088', jacket2: '#666b72', tie: '#2f6db3', hair: '#8b8178'},
  black: {jacket: '#33323a', jacket2: '#28272e', tie: '#d4483c', hair: '#141214'},
};
export const SKINS = {light: '#f4ecdc', tan: '#e8c39e', brown: '#b98058', dark: '#7a4f36'};
export const HAIR_COLORS = {black: '#171315', brown: '#4a3328', blond: '#d9b256', red: '#a8442c', gray: '#9a958f', blue: '#3a6fd0', green: '#3aa75a', pink: '#e06a9a', white: '#e9e5dc'};
export const EMOTIONS = ['neutral', 'happy', 'sad', 'cry', 'angry', 'surprised', 'scared', 'shy', 'smirk', 'love', 'tired'];
export const GESTURES = ['none', 'wave', 'up', 'point', 'face', 'cross', 'shrug', 'hold'];
export const EMOTES = ['none', 'exclaim', 'question', 'heart', 'dots', 'anger', 'sweat', 'sparkle'];
export const PROPS = ['none', 'phone', 'letter', 'flowers', 'gift', 'book'];

function buildFaces(skin, seed) {
  const F = {};
  const mk = (name, fn) => { const g = new THREE.Group(); fn(g); g.visible = false; F[name] = g; };
  const eyeX = [-0.115, 0.115];
  const dot = (g, r = 0.05, ry = 0.062) => { for (const x of eyeX) { g.add(flat(circlePts(x, -0.01, r, ry, 14), INK, 0.02, 0, seed)); const gl = flat(circlePts(x + 0.015, 0.012, 0.013, 0.015, 8), '#ffffff', 0.024, 0, seed); g.add(gl); } };
  const big = (g, pr = 0.025) => { for (const x of eyeX) { g.add(flat(circlePts(x, 0, 0.085, 0.095, 18), '#ffffff', 0.02, 0.014, seed)); g.add(flat(circlePts(x, -0.005, pr, pr * 1.2, 10), INK, 0.026, 0, seed)); } };
  const brow = (g, x, y, ang, len = 0.075, w = 0.014) => { const dx = Math.cos(ang) * len, dy = Math.sin(ang) * len; const s = stick(x - dx, y - dy, x + dx, y + dy, w, w); s.position.z = 0.03; g.add(s); };
  const smile = (g, depth = 0.04, wd = 0.075, y = -0.115) => g.add(line(circlePts(0, y + depth * 2, wd, depth * 2, 12, Math.PI * 1.2, Math.PI * 1.8).map(([x, yy]) => [x, yy]), 0.008));
  const frown = (g, depth = 0.035, wd = 0.07, y = -0.17) => g.add(line(circlePts(0, y - depth * 2, wd, depth * 2, 12, Math.PI * 0.2, Math.PI * 0.8), 0.008));
  const openMouth = (g, w = 0.07, h = 0.06, y = -0.14) => { g.add(flat(circlePts(0, y, w, h, 16), INK, 0.022, 0.0, seed)); g.add(flat(circlePts(0, y - h * 0.45, w * 0.6, h * 0.45, 10), '#e0605e', 0.026, 0, seed)); };
  const blush = (g, c = '#ee8f9a') => { for (const x of [-0.2, 0.2]) { const b = flat(circlePts(x, -0.08, 0.07, 0.04, 12), c, 0.012, 0, seed); g.add(b); } };

  mk('neutral', (g) => { dot(g); smile(g, 0.02, 0.055); });
  mk('happy', (g) => { for (const x of eyeX) g.add(line(circlePts(x, -0.03, 0.055, 0.055, 10, Math.PI * 0.1, Math.PI * 0.9), 0.012)); openMouth(g, 0.085, 0.07, -0.13); blush(g, '#f4a9a0'); });
  mk('sad', (g) => { dot(g, 0.045, 0.055); brow(g, -0.115, 0.095, 0.35); brow(g, 0.115, 0.095, -0.35); frown(g); });
  mk('cry', (g) => { dot(g, 0.045, 0.055); brow(g, -0.115, 0.095, 0.35); brow(g, 0.115, 0.095, -0.35); openMouth(g, 0.06, 0.055, -0.17);
    for (const x of eyeX) { g.add(flat([[x - 0.03, -0.06], [x + 0.03, -0.06], [x + 0.06, -0.26], [x - 0.06, -0.26]], '#7cc8f2', 0.028, 0.006, seed)); } });
  mk('angry', (g) => { dot(g, 0.04, 0.045); brow(g, -0.115, 0.07, -0.42, 0.085, 0.02); brow(g, 0.115, 0.07, 0.42, 0.085, 0.02); g.add(line([[-0.07, -0.15], [0.07, -0.15]], 0.012)); g.add(line([[-0.06, -0.15], [-0.04, -0.12], [-0.02, -0.15], [0, -0.12], [0.02, -0.15], [0.04, -0.12], [0.06, -0.15]], 0.006)); blush(g, '#e8604f'); });
  mk('surprised', (g) => { big(g, 0.02); brow(g, -0.115, 0.15, 0.1); brow(g, 0.115, 0.15, -0.1); openMouth(g, 0.045, 0.065, -0.16); });
  mk('scared', (g) => { big(g, 0.016); brow(g, -0.115, 0.14, 0.25); brow(g, 0.115, 0.14, -0.25); g.add(line([[-0.08, -0.16], [-0.05, -0.14], [-0.02, -0.17], [0.02, -0.14], [0.05, -0.17], [0.08, -0.15]], 0.009)); g.add(flat([[0.27, 0.12], [0.3, 0.05], [0.33, 0.12], [0.3, 0.17]], '#7cc8f2', 0.03, 0.006, seed)); });
  mk('shy', (g) => { dot(g, 0.042, 0.05); smile(g, 0.025, 0.05, -0.13); blush(g, '#f0808f'); brow(g, -0.115, 0.09, 0.2); brow(g, 0.115, 0.09, -0.2); });
  mk('smirk', (g) => { dot(g, 0.045, 0.05); brow(g, -0.115, 0.09, 0.0); brow(g, 0.115, 0.115, 0.22); g.add(line([[-0.04, -0.13], [0.03, -0.14], [0.09, -0.1]], 0.009)); });
  mk('love', (g) => { for (const x of eyeX) g.add(flat(heartPts(x, 0, 0.16), '#e0334f', 0.022, 0.01, seed)); openMouth(g, 0.05, 0.045, -0.14); blush(g, '#f4a9b4'); });
  mk('tired', (g) => { for (const x of eyeX) { g.add(flat(circlePts(x, -0.02, 0.05, 0.045, 14, Math.PI, Math.PI * 2), INK, 0.02, 0, seed)); const lid = stick(x - 0.07, -0.015, x + 0.07, -0.015, 0.009, 0.009); lid.position.z = 0.025; g.add(lid); } g.add(line([[-0.05, -0.15], [0.05, -0.16]], 0.008)); g.add(flat(circlePts(-0.12, -0.08, 0.045, 0.02, 10), '#b9a2c9', 0.012, 0, seed)); });
  void skin;
  return F;
}

// emote bubble above the head (canvas, billboard)
function emoteMesh(kind) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 128; const g = c.getContext('2d');
  g.lineWidth = 9; g.lineJoin = 'round'; g.lineCap = 'round'; g.strokeStyle = INK; g.textAlign = 'center'; g.textBaseline = 'middle';
  const txt = (s, col, size = 104) => { g.font = `900 ${size}px Arial Black, Arial, sans-serif`; g.strokeText(s, 64, 70); g.fillStyle = col; g.fillText(s, 64, 70); };
  if (kind === 'exclaim') txt('!', '#ffd23f');
  else if (kind === 'question') txt('?', '#7cc8f2');
  else if (kind === 'dots') txt('...', '#ffffff', 90);
  else if (kind === 'anger') { txt('#', '#e8453c', 100); }
  else if (kind === 'heart') { g.beginPath(); const s = 4.4; for (let i = 0; i <= 40; i++) { const t = i / 40 * Math.PI * 2; const x = 64 + s * 16 * Math.pow(Math.sin(t), 3), y = 62 - s * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)); i ? g.lineTo(x, y) : g.moveTo(x, y); } g.closePath(); g.stroke(); g.fillStyle = '#ee4466'; g.fill(); }
  else if (kind === 'sweat') { g.beginPath(); g.moveTo(64, 14); g.quadraticCurveTo(108, 70, 64, 112); g.quadraticCurveTo(20, 70, 64, 14); g.stroke(); g.fillStyle = '#7cc8f2'; g.fill(); }
  else if (kind === 'sparkle') { g.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, r = i % 2 ? 22 : 54; const x = 64 + Math.cos(a - Math.PI / 2) * r, y = 64 + Math.sin(a - Math.PI / 2) * r; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.closePath(); g.stroke(); g.fillStyle = '#fff3a0'; g.fill(); }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), new THREE.MeshBasicMaterial({map: tex, transparent: true, depthWrite: false}));
  m.renderOrder = 10;
  return m;
}

function propMesh(kind) {
  const g = new THREE.Group();
  const add = (w, h, d, col, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), fillMat(col)); m.position.set(x, y, z); const o = new THREE.Mesh(new THREE.BoxGeometry(w + 0.03, h + 0.03, d + 0.01), inkMat); o.position.set(x, y, z - 0.01); g.add(o, m); };
  if (kind === 'phone') { add(0.13, 0.24, 0.02, '#2a2a30'); add(0.1, 0.19, 0.01, '#9fd8ff', 0, 0, 0.012); }
  else if (kind === 'letter') { add(0.3, 0.2, 0.02, '#fbf3dc'); add(0.05, 0.05, 0.01, '#d4483c', 0, 0, 0.016); }
  else if (kind === 'gift') { add(0.26, 0.22, 0.2, '#d4483c'); add(0.05, 0.22, 0.21, '#f2d36b'); add(0.26, 0.05, 0.21, '#f2d36b'); }
  else if (kind === 'book') { add(0.22, 0.3, 0.05, '#3e6fb0'); add(0.19, 0.27, 0.052, '#fbf3dc', 0.01, 0, 0.002); }
  else if (kind === 'flowers') { for (let i = -1; i <= 1; i++) { add(0.015, 0.28, 0.01, '#4f9a5a', i * 0.06, 0.1, 0); const f = new THREE.Mesh(new THREE.CircleGeometry(0.06, 10), fillMat(['#e0334f', '#ffd23f', '#e07aa3'][i + 1])); f.position.set(i * 0.075, 0.27 + (i === 0 ? 0.04 : 0), 0.02); const o = new THREE.Mesh(new THREE.CircleGeometry(0.075, 10), inkMat); o.position.set(f.position.x, f.position.y, 0.015); g.add(o, f); } }
  return g;
}

const ease = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };

// gesture target angles (armL.rotation.z, armR.rotation.z); CCW-positive, arm hangs along -y
const GEST = {
  none: [0, 0], wave: [0, 2.7], up: [-2.5, 2.5], point: [0, 1.55], face: [2.75, -2.75], cross: [0.95, -0.95], shrug: [-1.0, 1.0], hold: [0.25, 1.1],
};

export function character({palette = 'blue', hat = 'none', hair = 'fringe', hairColor = null, skin = 'light', glasses = false, seed = 1, scale = 1} = {}) {
  const P = PALETTES[palette] || PALETTES.blue;
  const skinC = SKINS[skin] || skin;
  const hairC = HAIR_COLORS[hairColor] || hairColor || P.hair;
  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);
  body.add(stick(-0.09, 0.72, -0.1, 0.05, 0.03, 0.022), stick(0.09, 0.72, 0.1, 0.05, 0.03, 0.022));
  body.add(flat(circlePts(-0.13, 0.04, 0.09, 0.045), INK, 0.0, 0.004, seed + 1), flat(circlePts(0.13, 0.04, 0.09, 0.045), INK, 0.0, 0.004, seed + 2));
  const torso = [];
  for (let i = 0; i <= 20; i++) { const t = i / 20; const a = Math.PI * 2 * t; const y = 0.98 + Math.sin(a) * 0.29; const wid = 0.2 + 0.07 * (1 - (y - 0.69) / 0.58); torso.push([Math.cos(a) * wid, y]); }
  body.add(flat(torso, P.jacket, 0.01, 0.022, seed + 3));
  const lower = []; for (let i = 0; i <= 12; i++) { const a = Math.PI + Math.PI * i / 12; lower.push([Math.cos(a) * 0.255, 0.86 + Math.sin(a) * 0.17]); }
  body.add(flat(lower, P.jacket2, 0.015, 0.0, seed + 4));
  body.add(flat([[-0.11, 1.25], [0, 1.15], [0.11, 1.25], [0.0, 1.28]], '#fbf7ee', 0.025, 0.01, seed + 6));
  body.add(flat([[-0.025, 1.17], [0.025, 1.17], [0.04, 0.98], [0, 0.93], [-0.04, 0.98]], P.tie, 0.03, 0.008, seed + 7));
  const armL = new THREE.Group(), armR = new THREE.Group();
  armL.position.set(-0.2, 1.17, 0.012); armR.position.set(0.2, 1.17, 0.012);
  armL.add(stick(0, 0, -0.08, -0.42, 0.026, 0.02)); armR.add(stick(0, 0, 0.08, -0.42, 0.026, 0.02));
  armL.add(flat(circlePts(-0.085, -0.45, 0.05), skinC, 0.002, 0.012, seed + 8)); armR.add(flat(circlePts(0.085, -0.45, 0.05), skinC, 0.002, 0.012, seed + 9));
  body.add(armL, armR);
  const handHold = new THREE.Group(); handHold.position.set(0.085, -0.45, 0.03); armR.add(handHold);
  // head
  const head = new THREE.Group(); head.position.set(0, 1.56, 0.04); body.add(head);
  // hair behind head for long styles
  if (hair === 'long') head.add(flat([[-0.36, 0.1], [-0.38, -0.35], [-0.3, -0.62], [-0.1, -0.5], [0.1, -0.5], [0.3, -0.62], [0.38, -0.35], [0.36, 0.1]], hairC, -0.01, 0.014, seed + 20));
  if (hair === 'bun') head.add(flat(circlePts(0, 0.4, 0.14, 0.13, 14), hairC, -0.01, 0.014, seed + 21));
  head.add(flat(circlePts(0, 0, 0.33, 0.31, 36), skinC, 0, 0.024, seed + 10));
  // hair front
  if (hair !== 'bald') {
    const fringe = circlePts(0, 0, 0.335, 0.315, 18, 0.15, Math.PI - 0.15);
    if (hair === 'spiky') fringe.push([-0.27, 0.2], [-0.2, 0.36], [-0.1, 0.22], [0, 0.4], [0.1, 0.22], [0.2, 0.36], [0.27, 0.2]);
    else if (hair === 'long') fringe.push([-0.26, 0.1], [-0.08, 0.2], [0.04, 0.12], [0.18, 0.2], [0.3, 0.1]);
    else if (hair === 'curly') { for (let i = 0; i < 8; i++) fringe.push([-0.3 + i * 0.085, 0.18 + (i % 2) * 0.1]); }
    else fringe.push([-0.24, 0.17], [-0.1, 0.21], [0.04, 0.17], [0.18, 0.22], [0.3, 0.12]);
    head.add(flat(fringe.reverse(), hairC, 0.01, 0.012, seed + 11));
    if (hair === 'curly') for (const [x, y] of [[-0.3, 0.12], [0.3, 0.12], [0, 0.34], [-0.17, 0.3], [0.17, 0.3]]) head.add(flat(circlePts(x, y, 0.11, 0.1, 10), hairC, 0.009, 0.01, seed + 22 + x * 10));
  }
  // faces
  const faces = buildFaces(skinC, seed);
  for (const k of Object.keys(faces)) head.add(faces[k]);
  if (glasses) {
    for (const ex of [-0.115, 0.115]) { const ring = new THREE.Mesh(new THREE.RingGeometry(0.085, 0.105, 24), inkMat); ring.position.set(ex, -0.0, 0.034); head.add(ring); }
    const br = stick(-0.035, 0.0, 0.035, 0.0, 0.01, 0.01); br.position.z = 0.034; head.add(br);
  }
  if (hat === 'cap') {
    head.add(flat(circlePts(0, 0.17, 0.3, 0.13, 20, 0, Math.PI), P.jacket2, 0.035, 0.02, seed + 13));
    head.add(flat([[-0.05, 0.18], [0.42, 0.16], [0.42, 0.12], [-0.05, 0.13]], P.jacket2, 0.036, 0.02, seed + 14));
  } else if (hat === 'beanie') {
    head.add(flat(circlePts(0, 0.16, 0.34, 0.2, 20, 0, Math.PI), P.tie, 0.035, 0.02, seed + 15));
    head.add(flat([[-0.35, 0.17], [0.35, 0.17], [0.35, 0.09], [-0.35, 0.09]], P.jacket2, 0.036, 0.02, seed + 16));
  }
  const blob = new THREE.Mesh(new THREE.CircleGeometry(0.42, 24), new THREE.MeshBasicMaterial({color: '#000', transparent: true, opacity: 0.22, depthWrite: false}));
  blob.rotation.x = -Math.PI / 2; blob.position.y = 0.01; blob.scale.y = 0.55;
  root.add(blob);
  root.scale.setScalar(scale);
  const phase = rng(seed)() * 6;

  const state = {emo: 'neutral', gesture: 'none', emote: 'none', prop: 'none', t0: 0};
  let emoteM = null, propM = null;
  root.userData.setState = (s) => {
    Object.assign(state, s);
    for (const k of Object.keys(faces)) faces[k].visible = k === state.emo;
    if (!faces[state.emo]) faces.neutral.visible = true;
    if (state.emote && state.emote !== 'none') { emoteM = emoteMesh(state.emote); emoteM.position.set(0.45, 2.05, 0.1); root.add(emoteM); }
    if (state.prop && state.prop !== 'none') { propM = propMesh(state.prop); handHold.add(propM); if (state.gesture === 'none') state.gesture = 'hold'; }
  };
  root.userData.setState({});
  // pure function of time: ts = seconds since the shot started
  root.userData.update = (ts, t, camPos, baseYaw = 0, camQuat = null) => {
    const k = ease(ts / 0.35);
    const [gl, gr] = GEST[state.gesture] || GEST.none;
    const sw = state.gesture === 'wave' ? Math.sin(t * 9) * 0.35 : state.gesture === 'face' ? Math.sin(t * 14) * 0.04 : state.gesture === 'up' ? Math.sin(t * 12) * 0.08 : 0;
    const idleL = Math.sin(t * 1.6 + phase) * 0.08, idleR = -Math.sin(t * 1.4 + phase + 1) * 0.08;
    armL.rotation.z = THREE.MathUtils.lerp(idleL, gl + (state.gesture === 'face' ? sw : -sw * 0.5), k);
    armR.rotation.z = THREE.MathUtils.lerp(idleR, gr + (state.gesture === 'face' ? -sw : sw), k);
    handHold.rotation.z = -armR.rotation.z;
    const emoBob = state.emo === 'cry' ? Math.sin(t * 14) * 0.012 : state.emo === 'happy' ? Math.abs(Math.sin(t * 6)) * 0.03 : state.emo === 'scared' ? Math.sin(t * 40) * 0.006 : 0;
    body.position.y = Math.abs(Math.sin(t * 2.2 + phase)) * 0.015 + emoBob;
    head.rotation.z = Math.sin(t * 1.3 + phase) * 0.05 + (state.emo === 'sad' || state.emo === 'tired' ? -0.12 : state.emo === 'smirk' ? 0.1 : 0);
    head.position.y = 1.56 + Math.sin(t * 1.9 + phase) * 0.008 - (state.emo === 'sad' || state.emo === 'cry' ? 0.04 : 0);
    const wp = new THREE.Vector3(); root.getWorldPosition(wp);
    let yaw = Math.atan2(camPos.x - wp.x, camPos.z - wp.z) - baseYaw;
    yaw = Math.max(-0.7, Math.min(0.7, yaw));
    body.rotation.y = yaw + baseYaw - root.rotation.y;
    if (emoteM) { const p = ease((ts - 0.25) / 0.25); const s = ts < 0.25 ? 0.0001 : (0.3 + 0.7 * p) * (1 + 0.08 * Math.sin(t * 7)); emoteM.scale.setScalar(Math.max(0.0001, s * 0.95)); emoteM.position.y = 2.05 + Math.sin(t * 3) * 0.03; if (camQuat) emoteM.quaternion.copy(camQuat); }
  };
  root.userData.emoteMesh = () => emoteM;
  return root;
}
