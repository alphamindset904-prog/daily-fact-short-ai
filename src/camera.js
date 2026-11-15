import * as THREE from 'three';
import {SLOTS} from './scenes.js';

const sm = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
const lerp = THREE.MathUtils.lerp;

// shot framing presets: distance (start -> end), camera height, look height
const FRAMES = {
  close: {d: [1.95, 1.6], cy: [1.45, 1.42], ly: 1.4},
  medium: {d: [2.8, 2.25], cy: [1.4, 1.3], ly: 1.12},
  two: {d: [4.4, 3.9], cy: [1.6, 1.45], ly: 1.1},
  wide: {d: [6.8, 5.9], cy: [2.2, 1.8], ly: 1.25},
  low: {d: [2.5, 2.0], cy: [0.4, 0.5], ly: 1.5},
};

export function slotXZ(slot) { return SLOTS[slot] || SLOTS.C; }

// returns a pure function t -> {pos, look} for one shot
export function makeShotCamera(shot, info, idx, ox) {
  const cast = shot.cast || [];
  const focus = cast.find((c) => c.id === shot.focus) || cast[0];
  const fx = focus ? slotXZ(focus.slot)[0] : 0;
  let type = FRAMES[shot.cam] ? shot.cam : 'medium';
  if (type === 'two' && cast.length < 2) type = 'medium';
  let lookX = fx;
  if (type === 'two') { const xs = cast.slice(0, 3).map((c) => slotXZ(c.slot)[0]); lookX = (Math.min(...xs) + Math.max(...xs)) / 2; }
  if (type === 'wide') lookX = 0;
  const F = FRAMES[type];
  const maxD = info.maxDist || 6;
  const sgn = idx % 2 ? 1 : -1;
  const move = shot.move || 'in';
  return (u) => {
    const k = sm(u);
    let d0 = F.d[0], d1 = F.d[1], y0 = F.cy[0], y1 = F.cy[1], x0 = 0, x1 = 0;
    if (move === 'out') [d0, d1] = [d1, d0];
    if (move === 'left') { x0 = 0.7; x1 = -0.7; d1 = d0; }
    if (move === 'right') { x0 = -0.7; x1 = 0.7; d1 = d0; }
    if (move === 'up') { y0 = F.cy[0] - 0.3; y1 = F.cy[0] + 0.5; d1 = d0; }
    d0 = Math.min(d0, maxD); d1 = Math.min(d1, maxD);
    const base = move === 'left' || move === 'right' ? 0 : 0.28 * sgn;
    let px = lookX + base + lerp(x0, x1, k);
    if (info.xClamp) px = Math.max(-info.xClamp, Math.min(info.xClamp, px));
    const pos = new THREE.Vector3(ox + px + Math.sin(u * 5.3 + idx) * 0.025, Math.max(0.3, lerp(y0, y1, k)), lerp(d0, d1, k));
    const look = new THREE.Vector3(ox + lookX, F.ly + (move === 'up' ? lerp(-0.1, 0.4, k) : 0), 0);
    return {pos, look};
  };
}
