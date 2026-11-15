import React, {useMemo, useRef, useState, useEffect} from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig, delayRender, continueRender} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {useThree, useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass.js';
import {ShaderPass} from 'three/examples/jsm/postprocessing/ShaderPass.js';
import {OutputPass} from 'three/examples/jsm/postprocessing/OutputPass.js';
import fontUrl from '@fontsource/lilita-one/files/lilita-one-latin-400-normal.woff2';
import story from './data/story.json';
import timing from './data/timing.json';
import {LOCS, LIGHTS, SLOTS} from './scenes.js';
import {character} from './char.js';
import {makeShotCamera} from './camera.js';

const Vignette = {
  uniforms: {tDiffuse: {value: null}, amount: {value: 0.3}},
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: 'uniform sampler2D tDiffuse; uniform float amount; varying vec2 vUv; void main(){ vec4 c = texture2D(tDiffuse, vUv); vec2 d = vUv - 0.5; float v = 1.0 - amount * smoothstep(0.25, 0.75, length(d * vec2(1.0, 0.8))); gl_FragColor = vec4(c.rgb * v, c.a); }',
};
const Grade = {
  uniforms: {tDiffuse: {value: null}, sat: {value: 1.18}, con: {value: 1.07}, warm: {value: 0.03}},
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float sat; uniform float con; uniform float warm; varying vec2 vUv;
  void main(){ vec4 c = texture2D(tDiffuse, vUv); vec3 col = c.rgb; float l = dot(col, vec3(0.299,0.587,0.114));
  col = mix(vec3(l), col, sat); col = (col - 0.5) * con + 0.5;
  col += vec3(warm, warm*0.4, -warm) * smoothstep(0.35, 1.0, l); col += vec3(-0.01, 0.0, 0.03) * (1.0 - smoothstep(0.0, 0.45, l));
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), c.a); }`,
};

function makeSky() {
  const mat = new THREE.ShaderMaterial({
    uniforms: {top: {value: new THREE.Color('#3d8fe0')}, hor: {value: new THREE.Color('#cde9f8')}, sunDir: {value: new THREE.Vector3(-0.5, 0.6, 0.6).normalize()}, sunCol: {value: new THREE.Color('#fff2c8')}, sunOn: {value: 1}},
    vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize((modelMatrix * vec4(position,1.0)).xyz - cameraPosition); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform vec3 top; uniform vec3 hor; uniform vec3 sunDir; uniform vec3 sunCol; uniform float sunOn; varying vec3 vDir;
    void main(){ float h = clamp(vDir.y, 0.0, 1.0); vec3 c = mix(hor, top, pow(h, 0.55)); float s = max(dot(normalize(vDir), sunDir), 0.0);
    c += sunCol * (pow(s, 600.0) * 1.2 + pow(s, 12.0) * 0.25) * sunOn; gl_FragColor = vec4(c, 1.0); }`,
    side: THREE.BackSide, depthWrite: false, fog: false,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(800, 32, 16), mat); m.renderOrder = -1; m.frustumCulled = false;
  return m;
}

const hash = (s) => { let h = 7; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h % 997; };

// ---- shot timeline (cut halfway through the silence between two sentences)
const SH = timing.shots;
const CUTS = SH.map((s, i) => (i === 0 ? 0 : (SH[i - 1].end + s.start) / 2));
const END = timing.duration;
const shotIndexAt = (t) => { let i = 0; while (i + 1 < CUTS.length && t >= CUTS[i + 1]) i++; return i; };
const locOf = (i) => story.shots[i].loc;

export const dipAt = (t) => {
  let o = 0;
  for (let i = 1; i < SH.length; i++) {
    if (locOf(i) === locOf(i - 1)) continue;
    const d = Math.abs(t - CUTS[i]);
    if (d < 0.2) o = Math.max(o, 1 - d / 0.2);
  }
  return o;
};

const Scene = ({frame, fps}) => {
  const {gl, scene, camera, size} = useThree();
  const t = frame / fps;
  const world = useMemo(() => {
    const locInfo = {}; const used = [...new Set(story.shots.map((s) => s.loc))];
    const root = new THREE.Group();
    for (const k of used) {
      const L = LOCS[k]; const res = L.build(L.x);
      res.group.visible = false; root.add(res.group); locInfo[k] = {...res, ox: L.x, light: LIGHTS[L.light]};
      locInfo[k].npcs = []; res.group.traverse((o) => { if (o.userData && o.userData.npc) locInfo[k].npcs.push(o); });
    }
    const shots = story.shots.map((s, i) => {
      const info = locInfo[s.loc]; const g = new THREE.Group(); g.visible = false;
      const actors = (s.cast || []).map((c) => {
        const def = story.characters[c.id] || {};
        const ch = character({palette: def.palette || 'blue', hair: def.hair || 'fringe', hairColor: def.hairColor || null, skin: def.skin || 'light', glasses: !!def.glasses, hat: def.hat || 'none', seed: hash(c.id), scale: def.scale || 1});
        const [sx, sz] = SLOTS[c.slot] || SLOTS.C; ch.position.set(info.ox + sx, info.gy, sz);
        ch.userData.setState({emo: c.emo || 'neutral', gesture: c.gesture || 'none', emote: c.emote || 'none', prop: c.prop || 'none'});
        g.add(ch); return ch;
      });
      root.add(g);
      return {g, actors, cam: makeShotCamera(s, info, i, info.ox)};
    });
    return {root, locInfo, shots};
  }, []);
  const lights = useMemo(() => {
    const sun = new THREE.DirectionalLight('#ffffff', 1.5);
    sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.03;
    const hemi = new THREE.HemisphereLight('#ffffff', '#888888', 0.8);
    const pt = new THREE.PointLight('#ffc77a', 0, 14, 1.6);
    const sky = makeSky();
    scene.add(sun, sun.target, hemi, pt, sky, world.root);
    scene.fog = new THREE.Fog('#cfe4f2', 70, 330);
    gl.shadowMap.enabled = true; gl.shadowMap.type = THREE.PCFSoftShadowMap; gl.outputColorSpace = THREE.SRGBColorSpace;
    return {sun, hemi, pt, sky};
  }, []);
  const comp = useMemo(() => {
    const c = new EffectComposer(gl); c.setSize(size.width, size.height);
    c.addPass(new RenderPass(scene, camera)); c.addPass(new ShaderPass(Grade)); c.addPass(new ShaderPass(Vignette)); c.addPass(new OutputPass());
    return c;
  }, [gl, scene, camera, size.width, size.height]);

  const tRef = useRef(t); tRef.current = t;
  useFrame(() => {
    const tt = tRef.current; const i = shotIndexAt(tt); const s = story.shots[i]; const info = world.locInfo[s.loc]; const L = info.light;
    for (const k of Object.keys(world.locInfo)) world.locInfo[k].group.visible = k === s.loc;
    world.shots.forEach((x, j) => { x.g.visible = j === i; });
    const a = CUTS[i], b = i + 1 < CUTS.length ? CUTS[i + 1] : END;
    const cam = world.shots[i].cam((tt - a) / Math.max(0.1, b - a));
    camera.fov = 70; camera.near = 0.1; camera.far = 900; camera.updateProjectionMatrix();
    camera.position.copy(cam.pos); camera.lookAt(cam.look); camera.updateMatrixWorld();
    const A = [info.ox, 0, 0];
    lights.sun.color.set(L.sun); lights.sun.intensity = L.si;
    lights.sun.position.set(A[0] + L.sunOff[0], A[1] + L.sunOff[1], A[2] + L.sunOff[2]); lights.sun.target.position.set(A[0], 0, 0); lights.sun.target.updateMatrixWorld();
    const sc = lights.sun.shadow.camera; sc.left = -L.shadow; sc.right = L.shadow; sc.top = L.shadow; sc.bottom = -L.shadow; sc.near = 1; sc.far = 200; sc.updateProjectionMatrix();
    lights.hemi.color.set(L.sky); lights.hemi.groundColor.set(L.gnd); lights.hemi.intensity = L.hi;
    scene.fog.color.set(L.fog); scene.fog.near = L.near; scene.fog.far = L.far; scene.background = null;
    lights.sky.position.copy(cam.pos);
    const su = lights.sky.material.uniforms; su.top.value.set(L.top); su.hor.value.set(L.hor); su.sunDir.value.set(L.sunOff[0], L.sunOff[1], L.sunOff[2]).normalize(); su.sunOn.value = L.sunOn;
    if (L.pt) { lights.pt.color.set(L.pt.c); lights.pt.intensity = L.pt.i; lights.pt.distance = L.pt.d; lights.pt.position.set(A[0] + L.pt.p[0], L.pt.p[1], L.pt.p[2]); } else lights.pt.intensity = 0;
    const ts = tt - a;
    world.shots[i].actors.forEach((ch) => ch.userData.update(ts, tt, cam.pos, 0, camera.quaternion));
    info.npcs.forEach((n) => n.userData.update(99, tt, cam.pos, 0, null));
  }, 0);
  useFrame(() => { comp.render(); }, 1);
  return null;
};

// ---- captions: chunks of up to 3 words, the spoken word in yellow
const CHUNKS = [];
SH.forEach((s) => {
  let cur = [];
  const flush = () => { if (cur.length) { CHUNKS.push({words: cur, a: cur[0].a, b: cur[cur.length - 1].b}); cur = []; } };
  (s.words || []).forEach((w) => { cur.push(w); if (cur.length >= 3 || /[.!?…,;:]$/.test(w.w)) flush(); });
  flush();
});
const Caption = ({t}) => {
  let ch = null; for (const c of CHUNKS) { if (t >= c.a - 0.04 && t < c.b + 0.14) ch = c; }
  if (!ch) return null;
  const k = Math.min(1, (t - ch.a + 0.04) / 0.1); const sc = 0.85 + 0.15 * k;
  return (
    <div style={{position: 'absolute', left: 30, right: 30, top: '66%', textAlign: 'center', transform: `scale(${sc})`, lineHeight: 1.12}}>
      {ch.words.map((w, i) => {
        const active = t >= w.a - 0.02 && t < w.b + 0.02;
        return <span key={i} style={{fontFamily: '"Lilita One", "Arial Black", Arial, sans-serif', fontSize: 74, color: active ? '#ffd23f' : '#ffffff', marginRight: 16, display: 'inline-block',
          WebkitTextStroke: '11px #1a1414', paintOrder: 'stroke fill', textShadow: '0 5px 0 rgba(0,0,0,0.35)', transform: active ? 'scale(1.08)' : 'none'}}>{w.w}</span>;
      })}
    </div>
  );
};

export const Full = () => {
  const frame = useCurrentFrame();
  const {width, height, fps} = useVideoConfig();
  const [handle] = useState(() => delayRender('font'));
  useEffect(() => {
    const f = new FontFace('Lilita One', `url(${fontUrl})`);
    f.load().then(() => { document.fonts.add(f); continueRender(handle); }).catch(() => continueRender(handle));
  }, [handle]);
  const dip = dipAt(frame / fps);
  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      <ThreeCanvas width={width} height={height} linear={false} flat shadows gl={{antialias: true, preserveDrawingBuffer: true}} camera={{fov: 70, near: 0.1, far: 900, position: [0, 1.5, 3]}}>
        <Scene frame={frame} fps={fps} />
      </ThreeCanvas>
      <AbsoluteFill style={{backgroundColor: '#f6ecd6', opacity: dip}} />
      <Caption t={frame / fps} />
    </AbsoluteFill>
  );
};
