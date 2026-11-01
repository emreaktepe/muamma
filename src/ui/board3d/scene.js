// Sahne: masa, ışık, kamera denetleyici, talep üzerine render döngüsü, ışın ile mekân seçimi.
import {
  WebGLRenderer, Scene, PerspectiveCamera, Color, Fog, SpotLight, HemisphereLight, PlaneGeometry, BoxGeometry,
  MeshStandardMaterial, MeshBasicMaterial, Mesh, CanvasTexture, SRGBColorSpace, PCFShadowMap, ACESFilmicToneMapping,
  Raycaster, Plane, Vector2, Vector3, RingGeometry, CircleGeometry, RepeatWrapping, AdditiveBlending,
} from 'three';
import { LOCATIONS } from '../../game/data/locations.js';
import { SCALE, BOARD_W, BOARD_H, toWorld, toBoard } from './model.js';
import { drawBoardTexture, drawWoodTexture, TEX_W, TEX_H } from './texture.js';
import { nearestLocation } from './pick.js';
import { Pieces, BOARD_Y } from './pieces.js';

const LAMP = { c532: '#ffb15c', c1580: '#ffc98a', c1933: '#ffdcae', bugun: '#fff0dd' };
const LAMP_I = 3.4;
const DEFAULT_VIEW = { az: 0, el: 1.0, zoom: 1 };
const MAX_AZ = (25 * Math.PI) / 180;
const FOV = 34;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export function createScene(host, { onPick, onLost, coarse }) {
  const canvas = document.createElement('canvas');
  canvas.className = 'stage-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  host.appendChild(canvas);

  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  const dpr = Math.min(window.devicePixelRatio || 1, coarse ? 1.75 : 2);
  renderer.setPixelRatio(dpr);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const maxAniso = renderer.capabilities.getMaxAnisotropy();

  const scene = new Scene();
  scene.background = new Color('#0b0907');
  scene.fog = new Fog('#0b0907', 17, 30);
  const camera = new PerspectiveCamera(FOV, 4 / 3, 0.5, 80);

  // ---- ışık ----
  const hemi = new HemisphereLight('#ffe9c7', '#1a120a', 0.75);
  scene.add(hemi);
  const lamp = new SpotLight('#ffc98a', LAMP_I, 0, 0.75, 0.85, 0);
  lamp.position.set(-2.5, 10, 3.5);
  lamp.target.position.set(0, 0, 0.2);
  lamp.castShadow = true;
  lamp.shadow.mapSize.set(coarse ? 1024 : 2048, coarse ? 1024 : 2048);
  lamp.shadow.bias = -0.0004;
  lamp.shadow.normalBias = 0.02;
  lamp.shadow.radius = 4;
  lamp.shadow.camera.near = 4; lamp.shadow.camera.far = 20;
  scene.add(lamp, lamp.target);

  // ---- masa ----
  const woodCanvas = document.createElement('canvas');
  woodCanvas.width = 1024; woodCanvas.height = coarse ? 512 : 768;
  drawWoodTexture(woodCanvas.getContext('2d'), woodCanvas.width, woodCanvas.height);
  const woodTex = new CanvasTexture(woodCanvas);
  woodTex.colorSpace = SRGBColorSpace; woodTex.anisotropy = Math.min(8, maxAniso);
  woodTex.wrapS = woodTex.wrapT = RepeatWrapping;
  const table = new Mesh(new PlaneGeometry(26, 17), new MeshStandardMaterial({ map: woodTex, roughness: 0.62, metalness: 0.02 }));
  table.rotation.x = -Math.PI / 2; table.receiveShadow = true;
  scene.add(table);

  // ---- tahta ----
  const frameMat = new MeshStandardMaterial({ color: '#3a2412', roughness: 0.45, metalness: 0.05 });
  const frame = new Mesh(new BoxGeometry(BOARD_W * SCALE + 0.4, BOARD_Y, BOARD_H * SCALE + 0.4), frameMat);
  frame.position.y = BOARD_Y / 2; frame.castShadow = true; frame.receiveShadow = true;
  scene.add(frame);
  const boardCanvas = document.createElement('canvas');
  boardCanvas.width = TEX_W; boardCanvas.height = TEX_H;
  const boardTex = new CanvasTexture(boardCanvas);
  boardTex.colorSpace = SRGBColorSpace; boardTex.anisotropy = Math.min(8, maxAniso);
  const boardMesh = new Mesh(new PlaneGeometry(BOARD_W * SCALE, BOARD_H * SCALE), new MeshStandardMaterial({ map: boardTex, roughness: 0.82, metalness: 0 }));
  boardMesh.rotation.x = -Math.PI / 2; boardMesh.position.y = BOARD_Y + 0.002; boardMesh.receiveShadow = true;
  scene.add(boardMesh);
  const boardPlane = new Plane(new Vector3(0, 1, 0), -BOARD_Y);

  const pieces = new Pieces(scene, () => request());

  // ---- ulaşılabilir mekân halkaları ----
  const ringGeo = new RingGeometry(0.22, 0.27, 40);
  const glowGeo = new CircleGeometry(0.36, 32);
  const rings = {};
  function ringFor(id) {
    if (rings[id]) return rings[id];
    const g = new Mesh(ringGeo, new MeshBasicMaterial({ color: '#ffd24a', transparent: true, opacity: 0.95, depthWrite: false }));
    const glow = new Mesh(glowGeo, new MeshBasicMaterial({ color: '#ffb300', transparent: true, opacity: 0.1, depthWrite: false, blending: AdditiveBlending }));
    g.add(glow);
    const w = toWorld(LOCATIONS[id].x, LOCATIONS[id].y);
    g.rotation.x = -Math.PI / 2; g.position.set(w.x, BOARD_Y + 0.012, w.z);
    g.visible = false; scene.add(g);
    rings[id] = g;
    return g;
  }
  let reachIds = [];
  let hover = null;
  function applyRings() {
    for (const id of Object.keys(LOCATIONS)) {
      const on = reachIds.includes(id);
      if (!on && !rings[id]) continue;
      const r = ringFor(id);
      r.visible = on;
      const h = on && hover === id;
      r.scale.setScalar(h ? 1.25 : 1);
      r.material.color.set(h ? '#ffffff' : '#ffd24a');
    }
  }

  // ---- kamera ----
  const cam = { ...DEFAULT_VIEW };
  let camTarget = { ...DEFAULT_VIEW };
  let size = { w: 0, h: 0 };
  function baseDistance() {
    const t = Math.tan((FOV * Math.PI) / 360);
    const aspect = size.w / Math.max(1, size.h);
    const dW = 4.75 / (t * aspect);
    const dH = 3.3 / t;
    return Math.max(dW, dH) * 1.02;
  }
  const look = new Vector3(0, 0.1, 0.35);
  function placeCamera() {
    const d = baseDistance() / cam.zoom;
    camera.position.set(
      look.x + d * Math.sin(cam.az) * Math.cos(cam.el),
      look.y + d * Math.sin(cam.el),
      look.z + d * Math.cos(cam.az) * Math.cos(cam.el),
    );
    camera.lookAt(look);
  }

  // ---- döngü ----
  let raf = 0;
  let last = 0;
  let lampTween = null;
  let disposed = false;
  function request() { if (!raf && !disposed) raf = requestAnimationFrame(tick); }
  function tick(now) {
    raf = 0;
    const dt = last ? Math.min(64, now - last) : 16;
    last = now;
    let active = pieces.step(dt);
    for (const k of ['az', 'el', 'zoom']) {
      const diff = camTarget[k] - cam[k];
      if (Math.abs(diff) > 1e-4) { cam[k] += diff * Math.min(1, dt / 90); active = true; } else cam[k] = camTarget[k];
    }
    if (lampTween) {
      lampTween.t += dt;
      lampTween.fn(Math.min(1, lampTween.t / lampTween.dur));
      if (lampTween.t >= lampTween.dur) lampTween = null; else active = true;
    }
    placeCamera();
    renderer.render(scene, camera);
    if (active) request(); else last = 0;
  }

  function resize() {
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h || (w === size.w && h === size.h)) return;
    size = { w, h };
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    request();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(host);

  // ---- ışın ile mekân bulma ----
  const ray = new Raycaster();
  const ndc = new Vector2();
  const hit = new Vector3();
  function locationAt(clientX, clientY, only = null) {
    const r = canvas.getBoundingClientRect();
    if (!r.width) return null;
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    if (!ray.ray.intersectPlane(boardPlane, hit)) return null;
    const b = toBoard(hit.x, hit.z);
    return nearestLocation(b.x, b.y, coarse ? 30 : 22, only);
  }

  // ---- işaretçi: sürükle = döndür, iki parmak/tekerlek = yakınlaştır, dokun = seç ----
  const pts = new Map();
  let moved = 0, pinch0 = 0, zoom0 = 1;
  canvas.style.touchAction = 'none';
  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture?.(e.pointerId);
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    moved = 0;
    if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); zoom0 = camTarget.zoom; }
  });
  canvas.addEventListener('pointermove', (e) => {
    const p = pts.get(e.pointerId);
    if (!p) {
      const id = locationAt(e.clientX, e.clientY, reachIds);
      if (id !== hover) { hover = id; canvas.style.cursor = id ? 'pointer' : ''; applyRings(); request(); }
      return;
    }
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    moved += Math.abs(dx) + Math.abs(dy);
    if (pts.size === 2) {
      const [a, b] = [...pts.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch0) camTarget.zoom = cam.zoom = clamp(zoom0 * (d / pinch0), 0.75, 1.9);
    } else if (moved > 6) {
      camTarget.az = cam.az = clamp(cam.az - dx * 0.006, -MAX_AZ, MAX_AZ);
      camTarget.el = cam.el = clamp(cam.el + dy * 0.004, 0.62, 1.2);
    }
    request();
  });
  const endPtr = (e) => {
    const had = pts.has(e.pointerId);
    pts.delete(e.pointerId);
    if (had && e.type === 'pointerup' && moved <= 6 && pts.size === 0) {
      const id = locationAt(e.clientX, e.clientY);
      if (id) onPick?.(id);
    }
  };
  canvas.addEventListener('pointerup', endPtr);
  canvas.addEventListener('pointercancel', endPtr);
  canvas.addEventListener('pointerleave', () => { if (hover) { hover = null; canvas.style.cursor = ''; applyRings(); request(); } });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    camTarget.zoom = clamp(camTarget.zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1), 0.75, 1.9);
    request();
  }, { passive: false });
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); onLost?.(); });

  let eraId = null;
  let swapping = false;
  function setEra(id, motion, redrawState) {
    const apply = () => {
      drawBoardTexture(boardCanvas.getContext('2d'), redrawState());
      boardTex.needsUpdate = true;
      lamp.color.set(LAMP[id] || '#ffc98a');
      eraId = id; swapping = false;
      request();
    };
    if (eraId === null || motion === 'kapali') { apply(); return; }
    // ışık kısılır, doku değişir, ışık geri gelir
    swapping = true;
    const dur = motion === 'hizli' ? 300 : 800;
    let swapped = false;
    lampTween = { t: 0, dur, fn: (k) => {
      if (k >= 0.5 && !swapped) { swapped = true; apply(); swapping = true; }
      lamp.intensity = LAMP_I * (0.25 + 0.75 * Math.abs(k * 2 - 1));
      if (k >= 1) { lamp.intensity = LAMP_I; swapping = false; }
    } };
    request();
  }

  return {
    canvas,
    update(snap, state, { motion, gameKey }) {
      if (snap.era !== eraId && !swapping) setEra(snap.era, motion, () => state);
      pieces.sync(snap, { motion, gameKey });
      reachIds = snap.reach;
      if (hover && !reachIds.includes(hover)) hover = null;
      applyRings();
      resize();
      request();
    },
    resetView(motion) {
      camTarget = { ...DEFAULT_VIEW };
      if (motion === 'kapali') Object.assign(cam, DEFAULT_VIEW);
      request();
    },
    resize, request,
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      pieces.dispose();
      [woodTex, boardTex].forEach((t) => t.dispose());
      [table, frame, boardMesh, ...Object.values(rings)].forEach((m) => { m.geometry.dispose?.(); m.material.dispose?.(); });
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
