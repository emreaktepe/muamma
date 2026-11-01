// Su katmanı: maske ile yalnız denizde dalga çizgisi + parıltı (toplamalı karışım), ve üstünde yüzen küçük tekneler.
import {
  Mesh, PlaneGeometry, ShaderMaterial, CanvasTexture, AdditiveBlending, Vector3, Color, LinearFilter, Group, MeshStandardMaterial,
} from 'three';
import { drawWaterMask } from './texture.js';
import { BOARD_W, BOARD_H, SCALE, toWorld } from './model.js';
import { Builder, PAL as P } from './builder.js';

const VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const FRAG = `
uniform sampler2D uMask; uniform float uTime; uniform vec3 uTint; uniform float uAmp;
varying vec2 vUv;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y); }
void main(){
  float m = texture2D(uMask, vUv).r;
  if (m < 0.02) discard;
  vec2 p = vUv * vec2(46.0, 24.0);
  float warp = vnoise(p * 0.55 + uTime * 0.12) * 3.2;
  float w1 = sin(p.x * 1.15 + p.y * 0.8 + uTime * 0.85 + warp);
  float w2 = sin(p.x * 0.6 - p.y * 1.5 - uTime * 0.55 + warp * 1.3);
  float ripple = smoothstep(0.82, 1.0, 0.5 * w1 + 0.5 * w2 + 0.1);
  vec2 g = floor(p * 3.2);
  float tw = 0.5 + 0.5 * sin(uTime * (1.4 + hash(g) * 2.2) + hash(g + 7.0) * 6.28);
  float spark = step(0.965, hash(g)) * tw * smoothstep(0.35, 0.0, length(fract(p * 3.2) - 0.5));
  float a = (ripple * 0.17 + spark * 0.6) * uAmp * m;
  vec3 col = mix(uTint, vec3(1.0, 0.96, 0.82), clamp(spark * 1.4, 0.0, 1.0));
  gl_FragColor = vec4(col, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

const ERA_TINT = { c532: '#9d86e8', c1580: '#5fe0e4', c1933: '#e8d08a', bugun: '#9fd8e8' };

function boatGeo(kind) {
  const b = new Builder(kind === 'ferry' ? 9 : 4);
  if (kind === 'ferry') {
    b.box(0, 0, 0, 22, 3.2, 7, P.white); b.box(0, 3.2, 0, 17, 0.8, 6, P.stoneD);
    b.box(1, 4, 0, 11, 4, 5, P.white); b.box(2, 8, 0, 5, 2.4, 4, P.redD);
    b.cyl(-5, 4, 0, 1.4, 1.6, 7, P.red, { seg: 6 }); b.cyl(-5, 10.5, 0, 1.55, 1.4, 1.2, P.dark, { seg: 6 });
    b.box(11.5, 0.6, 0, 3, 2.4, 3.6, P.white);
  } else {
    b.box(0, 0, 0, 14, 2.6, 4.6, P.wood); b.box(6.5, 0.6, 0, 3, 2, 3.4, P.wood);
    b.cyl(0, 2.6, 0, 0.5, 0.6, 16, P.dark, { seg: 5 });
    b.pyr(-1.6, 3.6, 0, 6.5, 12, 0.5, P.white, { ry: 0 });
    b.pyr(3.2, 3.6, 0, 4.4, 9, 0.5, kind === 'sail2' ? P.coral : P.white);
  }
  return b.build();
}

export function createWater({ coarse }) {
  const mw = coarse ? 420 : 840, mh = Math.round(mw * (BOARD_H / BOARD_W));
  const cv = document.createElement('canvas');
  cv.width = mw; cv.height = mh;
  drawWaterMask(cv.getContext('2d'), mw, mh);
  const maskTex = new CanvasTexture(cv);
  maskTex.minFilter = LinearFilter; maskTex.generateMipmaps = false;
  const mat = new ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, blending: AdditiveBlending,
    uniforms: { uMask: { value: maskTex }, uTime: { value: 0 }, uTint: { value: new Color('#5fe0e4') }, uAmp: { value: 1 } },
  });
  const mesh = new Mesh(new PlaneGeometry(BOARD_W * SCALE, BOARD_H * SCALE), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.renderOrder = 1;

  // tekneler: iki yelkenli + bir vapur (Tophane-Üsküdar hattı)
  const group = new Group();
  const mats = [];
  const geos = [];
  const mk = (kind) => {
    const g = boatGeo(kind);
    const m = new MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.8 });
    mats.push(m);
    const mesh2 = new Mesh(g.matte, m);
    mesh2.castShadow = true; mesh2.receiveShadow = true;
    geos.push(g.matte);
    const holder = new Group(); holder.add(mesh2); group.add(holder);
    return holder;
  };
  const w = (x, y) => { const q = toWorld(x, y); return new Vector3(q.x, 0, q.z); };
  const routes = [
    { obj: mk('sail1'), a: w(420, 424), b: w(500, 426), speed: 0.028, bob: 0.012, phase: 0 },
    { obj: mk('sail2'), a: w(572, 120), b: w(592, 224), speed: 0.022, bob: 0.01, phase: 2.1 },
    { obj: mk('ferry'), curve: null, speed: 0.02, bob: 0.006, phase: 1 },
  ];
  // vapur eğrisi: tahta uzayında ikinci dereceden, dünyaya çevrilmiş kontrol noktası
  const f = routes[2];
  const cpt = toWorld((482 + 740) / 2, (128 + 262) / 2 - 16);
  f.curve = [w(482, 128), new Vector3(cpt.x, 0, cpt.z), w(740, 262)];

  const tmp = new Vector3(), tan = new Vector3();
  function place(r, t, y) {
    // 0..1..0 gidiş-dönüş
    const k = (1 - Math.cos(t * Math.PI * 2)) / 2;
    if (r.curve) {
      const [A, Cc, B] = r.curve;
      const u = 1 - k;
      tmp.set(u * u * A.x + 2 * u * k * Cc.x + k * k * B.x, 0, u * u * A.z + 2 * u * k * Cc.z + k * k * B.z);
      tan.set(2 * u * (Cc.x - A.x) + 2 * k * (B.x - Cc.x), 0, 2 * u * (Cc.z - A.z) + 2 * k * (B.z - Cc.z));
    } else {
      tmp.lerpVectors(r.a, r.b, k); tan.subVectors(r.b, r.a);
    }
    const dir = t % 1 < 0.5 ? 1 : -1;
    r.obj.position.set(tmp.x, y, tmp.z);
    r.obj.rotation.y = Math.atan2(-tan.z * dir, tan.x * dir);
  }

  return {
    mesh, boats: group,
    setEra(id) { mat.uniforms.uTint.value.set(ERA_TINT[id] || '#5fe0e4'); },
    setLevel(y) { mesh.position.y = y; routes.forEach((r) => { r.y = y + 0.005; }); },
    update(sec, still = false) {
      mat.uniforms.uTime.value = still ? 0 : sec;
      for (const r of routes) {
        const t = still ? 0.2 : (sec * r.speed + r.phase) % 1;
        place(r, t, (r.y || 0) + (still ? 0 : Math.sin(sec * 1.7 + r.phase) * r.bob * 0.4));
        r.obj.rotation.z = still ? 0 : Math.sin(sec * 1.3 + r.phase) * 0.04;
      }
    },
    dispose() {
      mesh.geometry.dispose(); mat.dispose(); maskTex.dispose();
      geos.forEach((g) => g.dispose()); mats.forEach((m) => m.dispose());
    },
  };
}
