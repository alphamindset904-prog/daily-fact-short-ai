import * as THREE from 'three';
import {rng, toon, box, cyl, sign, paintTex, facade, lampPost, ground, sidewalk, cloud, ink} from './kit.js';
import {character} from './char.js';
import * as P from './props.js';

// Every scene is built around its own origin: characters stand on z = 0, x in [-3, 3].
// The camera looks toward -z. Keep that central area free.
export const SLOTS = {L: [-1.15, 0], C: [0, 0], R: [1.15, 0], FL: [-2.4, -1.0], FR: [2.4, -1.0], BL: [-3.0, -2.6], BR: [3.0, -2.6]};

const emissive = (w, h, d, color, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({color})); m.position.set(x, y, z); return m; };

function shell(ox, {w, h, d, cz = 0, wall, floor, seed = 4, plank = true}) {
  const g = new THREE.Group();
  const wt = paintTex(wall, {seed, stains: 14}); wt.repeat.set(Math.max(1, Math.round(w / 8)), 1);
  const walls = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), toon('#ffffff', wt, {side: THREE.BackSide}));
  walls.position.set(ox, h / 2, cz); walls.receiveShadow = true; g.add(walls);
  const ft = paintTex(floor, {seed: seed + 1, stripes: plank ? (gg, W, H) => { gg.strokeStyle = 'rgba(60,30,15,0.35)'; gg.lineWidth = 2; for (let i = 0; i < 10; i++) { gg.beginPath(); gg.moveTo(0, i * H / 10); gg.lineTo(W, i * H / 10); gg.stroke(); } } : (gg, W, H) => { const n = 6; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if ((i + j) % 2) { gg.fillStyle = 'rgba(0,0,0,0.13)'; gg.fillRect(i * W / n, j * H / n, W / n, H / n); } }});
  ft.repeat.set(Math.max(1, Math.round(w / 5)), Math.max(1, Math.round(d / 5)));
  const fl = new THREE.Mesh(new THREE.BoxGeometry(w - 0.02, 0.1, d - 0.02), toon('#ffffff', ft)); fl.position.set(ox, 0, cz); fl.receiveShadow = true; g.add(fl);
  g.add(box(w, 0.22, 0.12, '#6b4a36', {x: ox, y: 0.14, z: cz - d / 2 + 0.08, thick: 0.01}));
  return g;
}
const win = (w, h, day = true) => {
  const g = new THREE.Group();
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({color: day ? '#cdeeff' : '#1a2656'}));
  g.add(pane);
  g.add(box(w + 0.16, 0.1, 0.12, '#f2eee4', {y: h / 2 + 0.05}), box(w + 0.16, 0.1, 0.12, '#f2eee4', {y: -h / 2 - 0.05}), box(0.1, h, 0.12, '#f2eee4', {x: -w / 2 - 0.03}), box(0.1, h, 0.12, '#f2eee4', {x: w / 2 + 0.03}), box(0.07, h, 0.1, '#f2eee4'), box(w, 0.07, 0.1, '#f2eee4'));
  if (!day) { const moon = new THREE.Mesh(new THREE.CircleGeometry(0.28, 20), new THREE.MeshBasicMaterial({color: '#f6ecc8'})); moon.position.set(w * 0.22, h * 0.2, 0.01); g.add(moon); for (let i = 0; i < 7; i++) { const s = new THREE.Mesh(new THREE.CircleGeometry(0.025, 5), new THREE.MeshBasicMaterial({color: '#ffffff'})); s.position.set((Math.sin(i * 7.3)) * w * 0.4, (Math.cos(i * 3.1)) * h * 0.35, 0.01); g.add(s); } }
  else { for (let i = 0; i < 2; i++) { const c = new THREE.Mesh(new THREE.CircleGeometry(0.3 + i * 0.1, 12), new THREE.MeshBasicMaterial({color: '#ffffff'})); c.position.set(-w * 0.2 + i * w * 0.35, h * 0.15 - i * 0.2, 0.01); c.scale.y = 0.45; g.add(c); } }
  return g;
};
const place = (o, x, y, z, ry = 0) => { o.position.set(x, y, z); o.rotation.y = ry; return o; };
const sch = (d, x, z, ry = 0, col = '#a9784a') => { const g = new THREE.Group(); g.add(box(0.9, 0.06, 0.6, col, {y: 0.72}), box(0.05, 0.7, 0.05, '#6f7a7d', {x: -0.4, y: 0.35, z: -0.25, thick: 0.004}), box(0.05, 0.7, 0.05, '#6f7a7d', {x: 0.4, y: 0.35, z: -0.25, thick: 0.004}), box(0.05, 0.7, 0.05, '#6f7a7d', {x: -0.4, y: 0.35, z: 0.25, thick: 0.004}), box(0.05, 0.7, 0.05, '#6f7a7d', {x: 0.4, y: 0.35, z: 0.25, thick: 0.004})); const c = P.chair('#3e6fb0'); place(c, 0, 0, 0.75, Math.PI); g.add(c); g.add(place(P.papers(2, d), 0.1, 0.76, 0)); return place(g, x, 0.05, z, ry); };

// ---------------------------------------------------------------- CLASSROOM
function classroom(ox) {
  const g = new THREE.Group();
  g.add(shell(ox, {w: 16, h: 4.4, d: 14, wall: '#cfe3ee', floor: '#b8824f', seed: 7}));
  const bb = sign('', 6.2, 2.0, {bg: '#2f5d4a', fg: '#c9a46a'}); place(bb, ox, 2.6, -6.88); g.add(bb);
  g.add(box(6.2, 0.1, 0.2, '#6b4a36', {x: ox, y: 1.55, z: -6.85, thick: 0.01}));
  for (let i = 0; i < 4; i++) g.add(box(0.2 + i * 0.05, 0.04, 0.06, '#fbf7ee', {x: ox - 0.8 + i * 0.4, y: 1.62, z: -6.8, thick: 0.004, edges: false}));
  for (let i = 0; i < 3; i++) { const w = win(2.0, 1.7); place(w, ox - 7.93, 2.5, -4 + i * 3.8, Math.PI / 2); g.add(w); }
  const door = box(1.2, 2.4, 0.1, '#8a5a3b', {x: 0, y: 1.2}); const dg = new THREE.Group(); dg.add(door, cyl(0.05, 0.05, 0.1, '#d8c27a', {x: 0.4, y: 1.15, z: 0.08, seg: 8})); place(dg, ox + 7.93, 0.05, -2.5, -Math.PI / 2); g.add(dg);
  g.add(place(P.wallClock(), ox + 3.4, 3.9, -6.85));
  for (const [dx, c, t] of [[-5.4, '#f2c12e', 'A B C'], [-4.2, '#e07aa3', '1 2 3'], [5.6, '#7cc8f2', 'SCIENCE']]) { const p = P.poster(t, 0.9, 1.2, c); place(p, ox + dx, 2.7, -6.88); g.add(p); }
  const r = rng(9);
  for (let row = 0; row < 2; row++) for (let i = -2; i <= 2; i++) g.add(sch(row * 5 + i, ox + i * 2.9 + (row ? 1.0 : 0), -4.9 + row * 1.2, 0, ['#a9784a', '#b88a58'][(i + row) & 1]));
  const td = P.desk(2.4, '#7a4f33'); place(td, ox - 4.6, 0.05, -5.9, 0); g.add(td); g.add(place(P.papers(8, 4), ox - 4.7, 1.0, -5.9), place(P.mug('#d4483c'), ox - 3.9, 1.0, -5.9), place(P.chair('#5a3a26'), ox - 4.4, 0.05, -5.0, Math.PI));
  g.add(place(P.bookshelf(3, 2.4, 2.4), ox + 6.2, 0.05, -6.5), place(P.bookshelf(5, 2.4, 2.4), ox - 7.4, 0.05, 4.4, Math.PI / 2));
  g.add(place(P.trashCan(), ox + 7.2, 0.05, -5.8));
  for (const x of [-4.5, 0, 4.5]) for (const z of [-3, 2]) g.add(emissive(1.6, 0.06, 0.5, '#fffbe8', ox + x, 4.36, z));
  // plant
  const pot = cyl(0.25, 0.2, 0.4, '#b3684a', {x: ox + 7.2, y: 0.25, z: 3.5, seg: 12}); g.add(pot); for (let i = 0; i < 5; i++) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), toon('#4f9a5a')); l.position.set(ox + 7.2 + Math.sin(i * 1.7) * 0.2, 0.7 + (i % 3) * 0.2, 3.5 + Math.cos(i * 1.7) * 0.2); ink(l, 0.02, false); g.add(l); }
  // foreground desks (soft depth in wide shots)
  g.add(sch(21, ox - 4.6, 3.0, Math.PI, '#a9784a'), sch(22, ox + 4.4, 3.4, Math.PI, '#b88a58'));
  for (const [x, z, c] of [[-6.6, 0.4, '#d4483c'], [6.6, 0.8, '#3e6fb0'], [-5.4, -3.2, '#e6b840']]) g.add(box(0.5, 0.6, 0.25, c, {x: ox + x, y: 0.35, z, thick: 0.02}));
  return {group: g, gy: 0.05, maxDist: 6.2};
}

// ---------------------------------------------------------------- HALLWAY
function hallway(ox) {
  const g = new THREE.Group();
  g.add(shell(ox, {w: 6.6, h: 3.6, d: 38, cz: -13, wall: '#e8eef2', floor: '#c9c4b6', seed: 12, plank: false}));
  const cols = ['#3e6fb0', '#3e6fb0', '#e6b840', '#3e6fb0', '#d4483c'];
  for (let i = 0; i < 22; i++) for (const side of [-1, 1]) {
    const x = ox + side * 3.0, z = 5 - i * 1.05;
    const L = box(0.5, 2.4, 0.95, cols[(i * 3 + (side > 0 ? 1 : 0)) % cols.length], {x, y: 1.25, z, thick: 0.02});
    g.add(L, box(0.02, 1.9, 0.5, '#26324a', {x: x - side * 0.26, y: 1.5, z, thick: 0.002, edges: false}), box(0.04, 0.2, 0.12, '#cfd3d8', {x: x - side * 0.27, y: 1.4, z: z + 0.25, thick: 0.002, edges: false}));
  }
  for (const [dx, z, c, t] of [[-1, -4, '#f2c12e', 'BAL'], [1, 1.5, '#7cc8f2', 'CLUB'], [-1, 2.5, '#e07aa3', 'FÊTE'], [1, -9, '#9bd77a', 'SPORT']]) { const p = P.poster(t, 0.7, 0.95, c); place(p, ox + dx * 2.7, 2.6, z, dx > 0 ? -Math.PI / 2 : Math.PI / 2); g.add(p); }
  for (let i = 0; i < 9; i++) g.add(emissive(1.2, 0.05, 0.5, '#fffbe8', ox, 3.56, 4 - i * 4));
  const ed = box(1.3, 2.5, 0.1, '#8a5a3b', {x: ox, y: 1.25, z: -31.9}); g.add(ed);
  g.add(place(P.trashCan(), ox - 2.6, 0.05, -2.6), place(P.bench(), ox + 2.4, 0.05, 3.4, -Math.PI / 2));
  return {group: g, gy: 0.05, maxDist: 5.2, xClamp: 2.5};
}

// ---------------------------------------------------------------- BEDROOM
function bedroom(ox) {
  const g = new THREE.Group();
  g.add(shell(ox, {w: 10, h: 3.6, d: 10, wall: '#c9c0e0', floor: '#a7764e', seed: 21}));
  const bed = new THREE.Group();
  bed.add(box(2.3, 0.45, 3.2, '#8a5a3b', {y: 0.28}), box(2.15, 0.28, 3.0, '#f1ece2', {y: 0.63}), box(2.2, 0.14, 2.0, '#6b8fd6', {y: 0.82, z: 0.45}), box(2.3, 1.1, 0.14, '#8a5a3b', {y: 0.85, z: -1.6}), box(0.9, 0.2, 0.55, '#ffffff', {x: -0.5, y: 0.82, z: -1.05}), box(0.9, 0.2, 0.55, '#ffd6e0', {x: 0.5, y: 0.82, z: -1.05}));
  g.add(place(bed, ox + 3.0, 0.05, -3.2));
  const ns = box(0.7, 0.6, 0.6, '#8a5a3b', {x: ox + 1.3, y: 0.35, z: -4.6}); g.add(ns, place(P.deskLamp(), ox + 1.3, 0.65, -4.6));
  const w = win(2.2, 1.6, false); place(w, ox - 1.5, 2.3, -4.93); g.add(w);
  g.add(place(P.rug(4.2, 3.0, '#8a5aa8', '#f2d36b'), ox - 0.3, 0, 0.3));
  const dk = P.desk(2.0, '#d6c9a8'); place(dk, ox - 3.9, 0.05, -3.9, 0); g.add(dk, place(P.tvMonitor('♥'), ox - 4.1, 1.0, -4.1), place(P.chair('#e07aa3'), ox - 3.8, 0.05, -2.9, Math.PI), place(P.papers(4, 3), ox - 3.4, 1.0, -3.7));
  const wd = box(1.6, 2.7, 0.7, '#7a5a46', {x: ox - 4.1, y: 1.4, z: 1.5, ry: Math.PI / 2}); g.add(wd);
  for (const [x, c, t] of [[-3.7, '#f2c12e', '★'], [0.9, '#7cc8f2', 'MUSIC'], [-0.2, '#e07aa3', '♥']]) { const p = P.poster(t, 0.8, 1.1, c); place(p, ox + x, 2.4, -4.93); g.add(p); }
  const cols = ['#ff6b8b', '#ffd23f', '#7cc8f2', '#9bd77a'];
  for (let i = 0; i < 14; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 5), new THREE.MeshBasicMaterial({color: cols[i % 4]})); b.position.set(ox - 4.6 + i * 0.68, 3.25 - Math.sin(i * 0.9) * 0.1, -4.9); g.add(b); }
  const bear = new THREE.Group(); bear.add(box(0.5, 0.5, 0.4, '#c49a62', {y: 0.25}), cyl(0.2, 0.2, 0.1, '#c49a62', {y: 0.65, seg: 10})); g.add(place(bear, ox + 2.2, 0.9, -3.0));
  g.add(emissive(0.6, 0.05, 0.6, '#fff3d0', ox, 3.56, 0));
  g.add(place(P.bookshelf(8, 1.6, 2.0), ox + 4.9, 0.05, 1.0, -Math.PI / 2));
  return {group: g, gy: 0.05, maxDist: 4.4};
}

// ---------------------------------------------------------------- LIVING ROOM
function livingroom(ox) {
  const g = new THREE.Group();
  g.add(shell(ox, {w: 12, h: 3.8, d: 11, wall: '#eddab8', floor: '#8c5e3c', seed: 31}));
  const sofa = new THREE.Group(); sofa.add(box(2.8, 0.45, 1.1, '#c2564a', {y: 0.4}), box(2.8, 0.8, 0.3, '#a9463c', {y: 0.85, z: -0.5}), box(0.3, 0.7, 1.1, '#a9463c', {x: -1.4, y: 0.55}), box(0.3, 0.7, 1.1, '#a9463c', {x: 1.4, y: 0.55}), box(0.6, 0.5, 0.2, '#f2d36b', {x: -0.8, y: 0.85, z: -0.2, thick: 0.01}), box(0.6, 0.5, 0.2, '#7cc8f2', {x: 0.8, y: 0.85, z: -0.2, thick: 0.01})); g.add(place(sofa, ox - 3.4, 0.05, -4.2));
  const ct = new THREE.Group(); ct.add(box(1.4, 0.08, 0.8, '#6b4430', {y: 0.45}), box(0.08, 0.45, 0.08, '#6b4430', {x: -0.6, y: 0.22, z: -0.3, thick: 0.004}), box(0.08, 0.45, 0.08, '#6b4430', {x: 0.6, y: 0.22, z: -0.3, thick: 0.004}), box(0.08, 0.45, 0.08, '#6b4430', {x: -0.6, y: 0.22, z: 0.3, thick: 0.004}), box(0.08, 0.45, 0.08, '#6b4430', {x: 0.6, y: 0.22, z: 0.3, thick: 0.004})); ct.add(place(P.mug('#3e6fb0'), 0.2, 0.49, 0), place(P.papers(3, 5), -0.3, 0.5, 0)); g.add(place(ct, ox - 1.6, 0.05, -2.6));
  const tvs = box(2.2, 0.6, 0.6, '#5a3a26', {x: ox + 3.6, y: 0.35, z: -4.9}); g.add(tvs); const tv = P.tvMonitor('TV'); tv.scale.setScalar(1.8); g.add(place(tv, ox + 3.6, 0.65, -4.95));
  g.add(place(P.bookshelf(2, 2.4, 2.6), ox - 0.2, 0.05, -5.15), place(P.bookshelf(7, 2.0, 2.2), ox + 5.85, 0.05, -1.6, -Math.PI / 2));
  g.add(place(P.rug(5.5, 3.6, '#2e6f8e', '#f2d36b'), ox + 0.2, 0, 0.2));
  const w = win(2.4, 1.8, true); place(w, ox - 5.93, 2.3, 0.5, Math.PI / 2); g.add(w);
  for (const [x, c, t] of [[-5.0, '#7cc8f2', 'MER'], [2.2, '#e0a07a', 'FAMILLE']]) { const p = P.poster(t, 1.0, 0.8, c); place(p, ox + x, 2.7, -5.43); g.add(p); }
  const lamp = new THREE.Group(); lamp.add(cyl(0.02, 0.02, 1.6, '#2b2b2e', {y: 0.8}), cyl(0.12, 0.28, 0.35, '#f2d36b', {y: 1.75, seg: 14}), cyl(0.2, 0.2, 0.05, '#2b2b2e', {y: 0.03})); g.add(place(lamp, ox - 5.4, 0.05, -4.9));
  g.add(emissive(1.0, 0.05, 1.0, '#fff3d0', ox, 3.76, -1), place(P.wallClock(), ox - 3.0, 3.1, -5.43));
  const pot = cyl(0.3, 0.24, 0.5, '#b3684a', {x: ox + 5.2, y: 0.3, z: 2.8, seg: 12}); g.add(pot);
  for (let i = 0; i < 6; i++) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), toon('#4f9a5a')); l.position.set(ox + 5.2 + Math.sin(i * 1.5) * 0.22, 0.85 + (i % 3) * 0.22, 2.8 + Math.cos(i * 1.5) * 0.22); ink(l, 0.02, false); g.add(l); }
  return {group: g, gy: 0.05, maxDist: 4.8};
}

// ---------------------------------------------------------------- STREET
const SHOPS = ['BOULANGERIE', 'PHARMACIE', 'CAFÉ', 'LIBRAIRIE', 'FLEURS', 'MARCHÉ', 'COIFFEUR', 'ÉPICERIE'];
const BCOL = ['#c98f6b', '#b8775e', '#d1a47a', '#a86f5c', '#c4a27c', '#9e7b66', '#8fa8b8', '#c9b27c'];
const CARCOL = ['#c43d32', '#2f6db3', '#4f8a4a', '#e6d9b8', '#7a4f73', '#3a3a3f', '#d9a441', '#9fc0d4'];
function street(lit) {
  return (ox) => {
    const g = new THREE.Group(); const r = rng(lit ? 77 : 55);
    g.add(ground(300, 160, lit ? '#3a3846' : '#9c958a', {x: ox, z: -10, seed: 3, repeat: 18}));
    const road = new THREE.Mesh(new THREE.BoxGeometry(300, 0.05, 9), toon(lit ? '#34303e' : '#6e6670')); road.position.set(ox, 0.03, 7.2); g.add(road);
    for (let i = -14; i < 14; i++) g.add(box(2.4, 0.06, 0.3, '#efe7d2', {x: ox + i * 7, y: 0.07, z: 7.2, edges: false, thick: 0.001}));
    g.add(sidewalk(300, {x: ox, z: 0, w: 4}));
    const plaza = new THREE.Mesh(new THREE.BoxGeometry(300, 0.25, 7), toon(lit ? '#4a4660' : '#cbbfa6')); plaza.position.set(ox, 0.125, -5.5); g.add(plaza);
    let x = -70, si = 0;
    while (x < 70) {
      const w = 8 + r() * 3, h = 8 + r() * 9;
      const f = facade({w, h, color: BCOL[(si + 2) % 8], cols: 3, rows: Math.floor(h / 3.6), seed: 100 + si, lit, interior: lit ? '#ffcf7d' : '#3b2b33'});
      f.position.set(ox + x + w / 2, 0, -9.0); g.add(f);
      g.add(box(w, h, 8, '#8f6c5e', {x: ox + x + w / 2, y: h / 2, z: -13.4, thick: 0.04}));
      if (si % 2 === 0) { const s = P.shopFront(SHOPS[si % SHOPS.length], BCOL[(si + 4) % 8], si + 5); s.position.set(ox + x + w / 2, 0.25, -8.25); g.add(s); }
      x += w + 0.2; si++;
    }
    for (let i = 0; i < 14; i++) { const h = 25 + r() * 40, w = 10 + r() * 10; g.add(box(w, h, 10, lit ? '#3a3658' : '#b9c3c9', {x: ox - 90 + i * 14 + r() * 4, y: h / 2, z: -60 - r() * 25, thick: 0.08})); }
    for (let i = -6; i <= 6; i++) { const lx = ox + i * 8 + 3.8; g.add(lampPost(lx, 1.6, 4.8)); g.add(P.at(P.tree(1.1, 40 + i), ox + i * 8 - 0.2, 0.25, i % 2 ? -3.6 : -6.2)); }
    g.add(P.at(P.bench(), ox - 5.8, 0.25, -2.6, 0), P.at(P.mailbox(), ox + 5.4, 0.25, 1.4), P.at(P.hydrant(), ox - 7.5, 0.25, 1.5), P.at(P.trashCan(), ox + 7.8, 0.25, 1.4));
    for (const [cx, ci] of [[-9, 0], [6.5, 3], [-18, 5], [15, 2]]) g.add(P.at(P.car(CARCOL[ci], {seed: ci, lights: lit}), ox + cx, 0, 4.5));
    for (let i = 0; i < 5; i++) { const c = character({palette: ['blue', 'orange', 'green', 'purple', 'red', 'teal'][i % 6], hair: ['fringe', 'spiky', 'long', 'curly', 'bun'][i], skin: ['light', 'tan', 'brown', 'dark', 'light'][i], seed: 600 + i}); c.position.set(ox + (i % 2 ? 1 : -1) * (8 + i * 4), 0.25, -0.2 + (i % 3) * 0.6); g.add(c); c.userData.npc = true; }
    for (let i = 0; i < 6; i++) g.add(cloud(ox - 80 + i * 30, 90 + (i % 2) * 10, -110, 6, lit ? '#3d3f6b' : '#e9e4dc'));
    if (lit) { const moon = new THREE.Mesh(new THREE.CircleGeometry(7, 32), new THREE.MeshBasicMaterial({color: '#f6ecc8', fog: false})); moon.position.set(ox - 50, 110, -150); g.add(moon); }
    return {group: g, gy: 0.25, maxDist: 6.5, npc: true};
  };
}

// ---------------------------------------------------------------- PARK
function park(ox) {
  const g = new THREE.Group(); const r = rng(88);
  g.add(ground(300, 200, '#74b857', {x: ox, z: -20, seed: 8, repeat: 14}));
  const path = new THREE.Mesh(new THREE.BoxGeometry(300, 0.04, 2.6), toon('#d9c7a0')); path.position.set(ox, 0.03, 1.3); g.add(path);
  for (let i = 0; i < 22; i++) { const s = 1.0 + r() * 0.8; const x = ox - 45 + i * 4.3 + r() * 2; if (Math.abs(x - ox) < 3.4) continue; g.add(P.at(P.tree(s, 50 + i), x, 0, -4 - r() * 14)); }
  for (let i = 0; i < 4; i++) g.add(P.at(P.tree(1.2, 90 + i), ox + (i % 2 ? 1 : -1) * (5.5 + i), 0, -1.2 - i * 0.4));
  g.add(P.at(P.bench(), ox - 4.4, 0, -1.6, 0.15), P.at(P.bench(), ox + 5.2, 0, -2.2, -0.2), P.at(lampPost(0, 0, 3.6), ox + 3.8, 0, -0.6));
  for (let i = 0; i < 40; i++) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 5), new THREE.MeshBasicMaterial({color: ['#ff6b8b', '#ffd23f', '#ffffff', '#c58cf2'][i % 4]})); f.position.set(ox - 9 + r() * 18, 0.12, -1.2 + r() * -2.5); if (Math.abs(f.position.x - ox) < 2.2 && f.position.z > -2) continue; g.add(f); }
  for (let i = 0; i < 6; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.6 + r() * 0.3, 10, 8), toon('#5aa04a')); b.position.set(ox - 8 + i * 3.2 + r(), 0.5, -3.5 - r()); b.scale.y = 0.8; ink(b, 0.03, false); g.add(b); }
  const pond = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.4, 0.05, 28), new THREE.MeshBasicMaterial({color: '#6fb8e6'})); pond.position.set(ox - 11, 0.05, -8); g.add(pond);
  const fo = new THREE.Group(); fo.add(cyl(1.4, 1.6, 0.4, '#bcb5a5', {y: 0.2, seg: 20}), cyl(0.2, 0.3, 1.4, '#bcb5a5', {y: 1.0, seg: 10}), cyl(0.7, 0.2, 0.2, '#bcb5a5', {y: 1.7, seg: 14})); g.add(place(fo, ox + 9, 0, -7));
  for (let i = 0; i < 4; i++) { const h = new THREE.Mesh(new THREE.SphereGeometry(40 + i * 8, 20, 12), toon(['#6aa55a', '#5d9a50', '#78b162', '#689f56'][i])); h.position.set(ox - 90 + i * 60, -22, -120 - i * 6); g.add(h); }
  for (let i = 0; i < 7; i++) g.add(cloud(ox - 80 + i * 28, 70 + (i % 3) * 10, -110, 6));
  for (let i = 0; i < 3; i++) { const c = character({palette: ['yellow', 'teal', 'pink'][i], hair: ['curly', 'bun', 'spiky'][i], skin: ['tan', 'light', 'brown'][i], seed: 700 + i}); c.position.set(ox + [-9, 11, 14][i], 0.02, -1 + i * 0.5); g.add(c); }
  return {group: g, gy: 0.02, maxDist: 7};
}

export const LOCS = {
  classroom: {build: classroom, x: 0, light: 'school'},
  hallway: {build: hallway, x: 100, light: 'school'},
  bedroom: {build: bedroom, x: 200, light: 'bedroom'},
  livingroom: {build: livingroom, x: 300, light: 'home'},
  street_day: {build: street(false), x: 400, light: 'day'},
  street_night: {build: street(true), x: 600, light: 'night'},
  park_day: {build: park, x: 800, light: 'day'},
  park_sunset: {build: park, x: 1000, light: 'sunset'},
};

export const LIGHTS = {
  school: {sun: '#fff4e0', si: 1.5, sky: '#f4fbff', gnd: '#b48a62', hi: 1.15, fog: '#e6eef2', near: 30, far: 90, sunOff: [-6, 10, 7], shadow: 12, top: '#7fb7e6', hor: '#d6ecf6', pt: {c: '#ffe0b0', i: 3, p: [0, 3.4, 1], d: 12}, sunOn: 0},
  home: {sun: '#ffe2b8', si: 1.3, sky: '#ffeccc', gnd: '#a07040', hi: 1.0, fog: '#efd9b8', near: 30, far: 90, sunOff: [-5, 8, 6], shadow: 12, top: '#7fb7e6', hor: '#d6ecf6', pt: {c: '#ffb870', i: 4.5, p: [-1.5, 2.4, 1.5], d: 13}, sunOn: 0},
  bedroom: {sun: '#9fb4ff', si: 0.55, sky: '#7a74b8', gnd: '#3a2c40', hi: 0.85, fog: '#2c2a52', near: 20, far: 60, sunOff: [-6, 9, 7], shadow: 10, top: '#0b1030', hor: '#3e3f86', pt: {c: '#ffb066', i: 9, p: [1.0, 1.8, -2.5], d: 11}, sunOn: 0},
  day: {sun: '#fff0cf', si: 2.6, sky: '#a9d8ff', gnd: '#d9a878', hi: 1.15, fog: '#cfe7f7', near: 100, far: 420, sunOff: [-30, 55, 40], shadow: 24, top: '#3d8fe0', hor: '#cde9f8', pt: null, sunOn: 1},
  sunset: {sun: '#ffc9a0', si: 1.5, sky: '#d9c3e6', gnd: '#6f8a58', hi: 1.0, fog: '#f1c9b4', near: 90, far: 380, sunOff: [-40, 22, 40], shadow: 24, top: '#5b73c4', hor: '#ffb27a', pt: null, sunOn: 1},
  night: {sun: '#b9c6ff', si: 1.5, sky: '#6a70c0', gnd: '#3a3050', hi: 1.45, fog: '#232856', near: 80, far: 360, sunOff: [-20, 50, 30], shadow: 24, top: '#0b1030', hor: '#3e3f86', pt: {c: '#ffc77a', i: 10, p: [0, 3.2, 3], d: 14}, sunOn: 0},
};
