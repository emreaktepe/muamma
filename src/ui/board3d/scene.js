// Sahne: masa, çerçeve, ışık, hazır harita görseli (tahta düzlemi), mekân etiketleri/kapakları, kamera (giriş animasyonu +
// yumuşak sınırlı orbit), ışın ile mekân seçimi. Render döngüsü: etkileşim/animasyon varken sürekli, aksi halde dururken sıfır iş.
import {
  WebGLRenderer, Scene, PerspectiveCamera, Color, Fog, SpotLight, HemisphereLight, DirectionalLight, PlaneGeometry,
  MeshStandardMaterial, MeshBasicMaterial, Mesh, CanvasTexture, SRGBColorSpace, PCFShadowMap, ACESFilmicToneMapping,
  Raycaster, Plane, Vector2, Vector3, RingGeometry, CircleGeometry, RepeatWrapping, AdditiveBlending, Group, ConeGeometry,
  TextureLoader, LinearMipmapLinearFilter,
} from 'three';
import { isOpen } from '../../game/engine.js';
import { SCALE, BOARD_W, BOARD_H, MAP_IMG, LOC_UV, toUV, uvToWorld } from './model.js';
import { drawWoodTexture, drawVignette, drawGlow, drawLabel, labelName, LABEL_CW, LABEL_CH, LABEL_WORLD_W, LABEL_WORLD_H, LABEL_DV } from './texture.js';
import { nearestLocation } from './pick.js';
import { Pieces, BOARD_Y } from './pieces.js';
import { Builder, PAL as P } from './builder.js';

const LAMP = { c532: '#ffb15c', c1580: '#ffc98a', c1933: '#ffdcae', bugun: '#fff0dd' };
const LAMP_I = 3.4;
const DEFAULT_VIEW = { az: 0, el: 1.0, zoom: 1 };
const INTRO_FROM = { az: -0.3, el: 1.42, zoom: 0.6 };
const MAX_AZ = (25 * Math.PI) / 180;
const LIM = { az: [-MAX_AZ, MAX_AZ], el: [0.62, 1.2], zoom: [0.75, 1.9] };
const FOV = 34;
// Çağa göre tahtaya çok hafif renk tonu (çarpan)
const ERA_TINT = { c532: '#f1e1f3', c1580: '#ffffff', c1933: '#ffe8c2', bugun: '#e6eef6' };
const CAP_R = 0.105; // kapalı mekân kapağı yarıçapı (dünya birimi; dairenin dış halkasını örter)
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const softLimit = (v, [lo, hi]) => (v < lo ? lo + (v - lo) * 0.3 : v > hi ? hi + (v - hi) * 0.3 : v);
const easeInOut = (k) => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2);

// Çerçeve + masa üstü eşyalar (tek seferlik, birleşik geometri)
function buildFrameAndProps() {
  const b = new Builder(11).at(0, 0, 1);
  const W = BOARD_W, H = BOARD_H, by = BOARD_Y * 100;
  // tahta altı + dış kasa + iç çıta + altın şerit
  b.box(0, 0, 0, W + 44, by - 0.1, H + 44, '#3b2412');
  for (const s of [-1, 1]) {
    b.box(0, 0, s * (H / 2 + 11), W + 44, 15, 22, '#4b2e18', { shade: 0.04 });
    b.box(s * (W / 2 + 11), 0, 0, 22, 15, H, '#4b2e18', { shade: 0.04 });
    b.box(0, 0, s * (H / 2 + 4), W + 8, 16.4, 8, '#6a4426', { shade: 0.04 });
    b.box(s * (W / 2 + 4), 0, 0, 8, 16.4, H, '#6a4426', { shade: 0.04 });
    b.box(0, 16.4, s * (H / 2 + 3.2), W + 6, 0.5, 1.5, P.gold, { metal: true, shade: 0 });
    b.box(s * (W / 2 + 3.2), 16.4, 0, 1.5, 0.5, H + 6, P.gold, { metal: true, shade: 0 });
    // dış kenar oluğu
    b.box(0, 15, s * (H / 2 + 19), W + 36, 0.6, 1.2, '#2b1a0c');
    b.box(s * (W / 2 + 19), 15, 0, 1.2, 0.6, H + 36, '#2b1a0c');
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    b.cyl(sx * (W / 2 + 15), 15, sz * (H / 2 + 15), 5.4, 6, 2, P.gold, { metal: true, seg: 12, shade: 0 });
    b.dome(sx * (W / 2 + 15), 17, sz * (H / 2 + 15), 5, P.gold, { metal: true, seg: 12, shade: 0 });
  }
  for (const s of [-1, 1]) for (const x of [-150, 0, 150]) b.dome(x, 15, s * (H / 2 + 15), 3.2, P.gold, { metal: true, shade: 0 });
  for (const s of [-1, 1]) for (const z of [-150, 0, 150]) b.dome(s * (W / 2 + 15), 15, z, 3.2, P.gold, { metal: true, shade: 0 });
  // şamdanlar
  for (const x of [-400, 400]) {
    b.cyl(x, 0, -265, 9, 12, 3, P.gold, { metal: true, seg: 12 });
    b.cyl(x, 3, -265, 2.2, 3, 22, P.gold, { metal: true, seg: 8 });
    b.cyl(x, 25, -265, 5.6, 3, 3, P.gold, { metal: true, seg: 12 });
    b.cyl(x, 28, -265, 3.2, 3.2, 18, P.white, { seg: 10 });
  }
  // tomar, mürekkep hokkası + kalem, bozuk paralar
  b.cyl(420, 4.5, 130, 4.5, 4.5, 90, P.white, { seg: 10, rx: Math.PI / 2, shade: 0.03 });
  b.cyl(420, 4.5, 85, 5.2, 5.2, 2, P.red, { seg: 10, rx: Math.PI / 2 });
  b.cyl(-420, 0, 40, 6, 7, 9, P.dark, { seg: 10 });
  b.box(-416, 9, 40, 1, 1, 34, P.white, { ry: 0.6 });
  for (let i = 0; i < 4; i++) b.cyl(-405, i * 1.6, 160, 5, 5, 1.5, P.gold, { metal: true, seg: 10 });
  b.cyl(-395, 0, 172, 5, 5, 1.5, P.gold, { metal: true, seg: 10, shade: 0 });
  return b.build();
}

export function createScene(host, { onPick, onLost, coarse }) {
  const canvas = document.createElement('canvas');
  canvas.className = 'stage-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  host.appendChild(canvas);

  const renderer = new WebGLRenderer({ canvas, antialias: !coarse, alpha: false, powerPreference: 'high-performance' });
  const dpr = Math.min(window.devicePixelRatio || 1, coarse ? 1.5 : 2);
  renderer.setPixelRatio(dpr);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const reduceMq = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;

  const scene = new Scene();
  scene.background = new Color('#080a10');
  scene.fog = new Fog('#080a10', 15, 30);
  const camera = new PerspectiveCamera(FOV, 4 / 3, 0.5, 80);
  const owned = []; // dispose edilecek geometri/malzeme/doku

  // ---- ışık: sıcak lamba (gölge), gök/zemin dolgusu, soğuk kenar ışığı ----
  scene.add(new HemisphereLight('#ffe9c7', '#1a120a', 0.7));
  const rim = new DirectionalLight('#7fb8e0', 0.45);
  rim.position.set(7, 5, -5);
  scene.add(rim);
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

  // ---- masa + ışık havuzu ----
  const woodCanvas = document.createElement('canvas');
  woodCanvas.width = 1024; woodCanvas.height = coarse ? 512 : 768;
  drawWoodTexture(woodCanvas.getContext('2d'), woodCanvas.width, woodCanvas.height);
  const woodTex = new CanvasTexture(woodCanvas);
  woodTex.colorSpace = SRGBColorSpace; woodTex.anisotropy = Math.min(8, maxAniso);
  woodTex.wrapS = woodTex.wrapT = RepeatWrapping;
  const table = new Mesh(new PlaneGeometry(26, 17), new MeshStandardMaterial({ map: woodTex, roughness: 0.62, metalness: 0.02 }));
  table.rotation.x = -Math.PI / 2; table.receiveShadow = true;
  scene.add(table);
  const vCanvas = document.createElement('canvas');
  vCanvas.width = 256; vCanvas.height = 168;
  drawVignette(vCanvas.getContext('2d'), 256, 168);
  const vTex = new CanvasTexture(vCanvas); vTex.colorSpace = SRGBColorSpace;
  const vig = new Mesh(new PlaneGeometry(26, 17), new MeshBasicMaterial({ map: vTex, transparent: true, depthWrite: false }));
  vig.rotation.x = -Math.PI / 2; vig.position.y = 0.004; vig.renderOrder = 0;
  scene.add(vig);
  owned.push(woodTex, vTex, table, vig);

  // ---- çerçeve ve masa üstü eşyalar ----
  const fp = buildFrameAndProps();
  const frameGroup = new Group();
  const frameMats = [];
  for (const [geo, metal] of [[fp.matte, false], [fp.metal, true]]) {
    if (!geo) continue;
    const m = new MeshStandardMaterial({ vertexColors: true, roughness: metal ? 0.32 : 0.5, metalness: metal ? 0.6 : 0.05, flatShading: false });
    frameMats.push(m);
    const mesh = new Mesh(geo, m);
    mesh.castShadow = true; mesh.receiveShadow = true;
    frameGroup.add(mesh);
  }
  scene.add(frameGroup);
  owned.push({ dispose() { frameGroup.children.forEach((c) => c.geometry.dispose()); frameMats.forEach((m) => m.dispose()); } });

  // mum alevleri (titrer)
  const gCanvas = document.createElement('canvas');
  gCanvas.width = gCanvas.height = 64;
  drawGlow(gCanvas.getContext('2d'), 64, 64);
  const glowTex = new CanvasTexture(gCanvas);
  const flameGeo = new ConeGeometry(0.035, 0.12, 6);
  const flameMat = new MeshBasicMaterial({ color: '#ffd37a' });
  const haloGeo = new PlaneGeometry(0.9, 0.9);
  const haloMat = new MeshBasicMaterial({ map: glowTex, color: '#ffb35a', transparent: true, opacity: 0.55, depthWrite: false, blending: AdditiveBlending });
  const flames = [];
  for (const x of [-4, 4]) {
    const f = new Mesh(flameGeo, flameMat);
    f.position.set(x, 0.5, -2.65);
    const h = new Mesh(haloGeo, haloMat);
    h.position.set(x, 0.52, -2.65); h.rotation.x = -Math.PI / 2; h.position.y = 0.011;
    scene.add(f, h);
    flames.push({ f, h, ph: x });
  }
  owned.push(glowTex, flameGeo, flameMat, haloGeo, haloMat);

  // ---- tahta yüzeyi: hazır sanat görseli (kare), sRGB, anisotropy ----
  const boardTex = new TextureLoader().load(MAP_IMG, () => request());
  boardTex.colorSpace = SRGBColorSpace;
  boardTex.anisotropy = Math.min(8, maxAniso);
  boardTex.minFilter = LinearMipmapLinearFilter;
  boardTex.generateMipmaps = true;
  const boardMat = new MeshStandardMaterial({ map: boardTex, roughness: 0.85, metalness: 0, emissive: '#ffffff', emissiveMap: boardTex, emissiveIntensity: 0.22 });
  const boardMesh = new Mesh(new PlaneGeometry(BOARD_W * SCALE, BOARD_H * SCALE), boardMat);
  boardMesh.rotation.x = -Math.PI / 2; boardMesh.position.y = BOARD_Y + 0.002; boardMesh.receiveShadow = true;
  scene.add(boardMesh);
  owned.push(boardTex, boardMat, boardMesh);
  const boardPlane = new Plane(new Vector3(0, 1, 0), -BOARD_Y);

  // ---- mekân etiketleri (dairenin altında, parşömen şerit) ve kapalı mekân kapakları ----
  const labelGeo = new PlaneGeometry(LABEL_WORLD_W, LABEL_WORLD_H);
  const capGeo = new CircleGeometry(CAP_R, 28);
  const capMat = new MeshBasicMaterial({ color: '#0a0f1e', transparent: true, opacity: 0.84, depthWrite: false });
  owned.push(labelGeo, capGeo, capMat);
  const labels = {};
  const labelGroup = new Group();
  scene.add(labelGroup);
  for (const [id, m] of Object.entries(LOC_UV)) {
    const cvs = document.createElement('canvas');
    cvs.width = LABEL_CW; cvs.height = LABEL_CH;
    const tex = new CanvasTexture(cvs);
    tex.colorSpace = SRGBColorSpace; tex.anisotropy = Math.min(8, maxAniso);
    const mat = new MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
    const mesh = new Mesh(labelGeo, mat);
    const shift = LABEL_WORLD_W / 2 - 0.025 * BOARD_W * SCALE; // 'l'/'r' hizada şerit daireden bu kadar yana kayar
    const w = uvToWorld(m.u, m.v + LABEL_DV);
    mesh.position.set(w.x + (m.a === 'l' ? -shift : m.a === 'r' ? shift : 0), BOARD_Y + 0.012, w.z);
    mesh.rotation.x = -Math.PI / 2; mesh.renderOrder = 4;
    const cap = new Mesh(capGeo, capMat);
    const c = uvToWorld(m.u, m.v);
    cap.position.set(c.x, BOARD_Y + 0.008, c.z); cap.rotation.x = -Math.PI / 2; cap.renderOrder = 3; cap.visible = false;
    labelGroup.add(mesh, cap);
    labels[id] = { cvs, tex, mat, cap, key: '' };
  }
  owned.push({ dispose() { Object.values(labels).forEach((l) => { l.tex.dispose(); l.mat.dispose(); }); } });
  // Çağ değişince: etiket adları, kapalı mekân kapakları, hafif ton
  function applyEra(id, st) {
    boardMat.color.set(ERA_TINT[id] || '#ffffff');
    for (const [lid, l] of Object.entries(labels)) {
      const open = isOpen(st, lid);
      const name = labelName(st, lid);
      l.cap.visible = !open;
      const key = `${name}|${open}`;
      if (key === l.key) continue;
      l.key = key;
      drawLabel(l.cvs.getContext('2d'), name, { open, a: LOC_UV[lid].a });
      l.tex.needsUpdate = true;
    }
  }

  const pieces = new Pieces(scene, () => request());

  // ---- mekân vurguları: ulaşılabilir (altın, nabız + dalga halkası), aktif oyuncu mekânı (turkuaz) ----
  const ringGeo = new RingGeometry(0.15, 0.185, 40);
  const rippleGeo = new RingGeometry(0.165, 0.18, 40);
  const glowGeo = new CircleGeometry(0.24, 32);
  const auraGeo = new RingGeometry(0.22, 0.245, 48);
  owned.push(ringGeo, rippleGeo, glowGeo, auraGeo);
  const rings = {};
  function ringFor(id) {
    if (rings[id]) return rings[id];
    const g = new Group();
    const ring = new Mesh(ringGeo, new MeshBasicMaterial({ color: '#ffd24a', transparent: true, opacity: 0.95, depthWrite: false }));
    const glow = new Mesh(glowGeo, new MeshBasicMaterial({ map: glowTex, color: '#ffb300', transparent: true, opacity: 0.55, depthWrite: false, blending: AdditiveBlending }));
    const ripple = new Mesh(rippleGeo, new MeshBasicMaterial({ color: '#ffe38a', transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending }));
    glow.position.z = -0.001; ripple.position.z = 0.001;
    g.add(glow, ring, ripple);
    const w = uvToWorld(LOC_UV[id].u, LOC_UV[id].v);
    g.rotation.x = -Math.PI / 2; g.position.set(w.x, BOARD_Y + 0.014, w.z);
    g.visible = false; g.userData = { ring, glow, ripple, ph: Math.random() * 6 };
    scene.add(g);
    rings[id] = g;
    return g;
  }
  const aura = new Group();
  const auraRing = new Mesh(auraGeo, new MeshBasicMaterial({ color: '#4fd1d6', transparent: true, opacity: 0.9, depthWrite: false }));
  const auraGlow = new Mesh(glowGeo, new MeshBasicMaterial({ map: glowTex, color: '#2fb8c0', transparent: true, opacity: 0.5, depthWrite: false, blending: AdditiveBlending }));
  auraGlow.scale.setScalar(1.35);
  aura.add(auraGlow, auraRing);
  aura.rotation.x = -Math.PI / 2; aura.position.y = BOARD_Y + 0.011; aura.visible = false;
  scene.add(aura);
  owned.push(auraRing.material, auraGlow.material);
  let reachIds = [];
  let curLoc = null;
  let hover = null;
  function applyRings() {
    for (const id of Object.keys(LOC_UV)) {
      const on = reachIds.includes(id);
      if (!on && !rings[id]) continue;
      const r = ringFor(id);
      r.visible = on;
      r.userData.hover = on && hover === id;
      r.userData.ring.material.color.set(r.userData.hover ? '#ffffff' : '#ffd24a');
    }
    aura.visible = !!curLoc;
    if (curLoc) { const w = uvToWorld(LOC_UV[curLoc].u, LOC_UV[curLoc].v); aura.position.x = w.x; aura.position.z = w.z; }
  }
  function animateHighlights(sec) {
    for (const g of Object.values(rings)) {
      if (!g.visible) continue;
      const u = g.userData;
      const pulse = 1 + 0.08 * Math.sin(sec * 3.2 + u.ph);
      g.scale.setScalar((u.hover ? 1.25 : 1) * pulse);
      u.glow.material.opacity = 0.3 + 0.18 * Math.sin(sec * 3.2 + u.ph);
      const k = ((sec * 0.8 + u.ph) % 1);
      u.ripple.scale.setScalar(1 + k * 0.9);
      u.ripple.material.opacity = (1 - k) * 0.55;
    }
    if (aura.visible) { auraRing.material.opacity = 0.7 + 0.25 * Math.sin(sec * 2); aura.rotation.z = sec * 0.25; }
  }
  owned.push({ dispose() { Object.values(rings).forEach((g) => { g.userData.ring.material.dispose(); g.userData.glow.material.dispose(); g.userData.ripple.material.dispose(); }); } });

  // ---- kamera ----
  const cam = { ...INTRO_FROM };
  let camTarget = { ...DEFAULT_VIEW };
  let intro = null;
  let introPending = true;
  let size = { w: 0, h: 0 };
  function baseDistance() {
    const t = Math.tan((FOV * Math.PI) / 360);
    const aspect = size.w / Math.max(1, size.h);
    const dW = 3.5 / (t * aspect);
    const dH = 3.55 / t;
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
  function startIntro(motion) {
    introPending = false;
    if (motion === 'kapali' || reduceMq?.matches) { Object.assign(cam, DEFAULT_VIEW); camTarget = { ...DEFAULT_VIEW }; return; }
    Object.assign(cam, INTRO_FROM);
    camTarget = { ...DEFAULT_VIEW };
    intro = { t: 0, dur: motion === 'hizli' ? 900 : 1900, from: { ...INTRO_FROM } };
  }

  // ---- döngü ----
  let raf = 0;
  let last = 0;
  let lampTween = null;
  let disposed = false;
  let motionMode = 'normal';
  let dragging = false;
  const ambientOn = () => motionMode !== 'kapali' && !reduceMq?.matches;
  const paused = () => host.hidden || document.hidden || !size.w;
  function camBusy() { return !!intro || ['az', 'el', 'zoom'].some((k) => Math.abs(camTarget[k] - cam[k]) > 1e-4); }
  function request() { if (!raf && !disposed) raf = requestAnimationFrame(tick); }
  function tick(now) {
    raf = 0;
    if (disposed) return;
    if (paused()) { last = 0; return; } // görünür olunca attach/resize/visibilitychange yeniden uyandırır
    const elapsed = last ? now - last : 99;
    const busy = pieces.busy || camBusy() || !!lampTween || dragging || vel.az || vel.el;
    const minGap = busy ? 14 : (coarse ? 32 : 19);
    if (elapsed < minGap) { raf = requestAnimationFrame(tick); return; }
    const dt = Math.min(64, last ? elapsed : 16);
    last = now;
    const sec = now / 1000;
    let active = pieces.step(dt);
    if (intro) {
      intro.t += dt;
      const k = easeInOut(Math.min(1, intro.t / intro.dur));
      for (const key of ['az', 'el', 'zoom']) cam[key] = intro.from[key] + (DEFAULT_VIEW[key] - intro.from[key]) * k;
      if (intro.t >= intro.dur) intro = null;
      active = true;
    } else {
      const f = 1 - Math.exp(-dt / 85);
      for (const k of ['az', 'el', 'zoom']) {
        const diff = camTarget[k] - cam[k];
        if (Math.abs(diff) > 1e-4) { cam[k] += diff * f; active = true; } else cam[k] = camTarget[k];
      }
    }
    if (!dragging && (vel.az || vel.el)) { // bırakıldıktan sonra yumuşak savrulma
      camTarget.az = clamp(camTarget.az + vel.az * dt, ...LIM.az); camTarget.el = clamp(camTarget.el + vel.el * dt, ...LIM.el);
      const decay = Math.exp(-dt / 160);
      vel.az *= decay; vel.el *= decay;
      if (Math.abs(vel.az) < 1e-5) vel.az = 0;
      if (Math.abs(vel.el) < 1e-5) vel.el = 0;
      active = true;
    }
    if (lampTween) {
      lampTween.t += dt;
      lampTween.fn(Math.min(1, lampTween.t / lampTween.dur));
      if (lampTween.t >= lampTween.dur) lampTween = null; else active = true;
    }
    const amb = ambientOn();
    if (amb) {
      pieces.animate(sec);
      animateHighlights(sec);
      for (const { f, h, ph } of flames) { const fl = 1 + 0.18 * Math.sin(sec * 11 + ph) + 0.1 * Math.sin(sec * 17 + ph * 2); f.scale.set(1, fl, 1); h.material.opacity = 0.45 + 0.12 * Math.sin(sec * 9 + ph); }
    }
    placeCamera();
    renderer.render(scene, camera);
    if (active || amb) request(); else last = 0;
  }

  function resize() {
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    if (w !== size.w || h !== size.h) {
      size = { w, h };
      renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.updateProjectionMatrix();
    }
    if (introPending && !host.hidden) startIntro(motionMode);
    request();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(host);
  const onVis = () => { if (!document.hidden) { last = 0; request(); } };
  document.addEventListener('visibilitychange', onVis);

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
    const t = toUV(hit.x, hit.z);
    return nearestLocation(t.u, t.v, coarse ? 0.058 : 0.04, only);
  }

  // ---- işaretçi: sürükle = döndür (sınırda lastik gibi direnir, bırakınca yerine döner), iki parmak/tekerlek = yakınlaştır, dokun = seç ----
  const pts = new Map();
  const vel = { az: 0, el: 0 };
  const raw = { az: 0, el: 0 };
  let moved = 0, pinch0 = 0, zoom0 = 1, lastT = 0;
  canvas.style.touchAction = 'none';
  function cancelIntro() { if (intro) { intro = null; camTarget = { ...cam }; } }
  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture?.(e.pointerId);
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    moved = 0; vel.az = 0; vel.el = 0; lastT = e.timeStamp;
    cancelIntro();
    raw.az = camTarget.az; raw.el = camTarget.el;
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
      if (pinch0) camTarget.zoom = clamp(zoom0 * (d / pinch0), ...LIM.zoom);
    } else if (moved > 6) {
      dragging = true;
      raw.az = clamp(raw.az - dx * 0.006, LIM.az[0] - 0.5, LIM.az[1] + 0.5);
      raw.el = clamp(raw.el + dy * 0.004, LIM.el[0] - 0.4, LIM.el[1] + 0.4);
      camTarget.az = softLimit(raw.az, LIM.az); camTarget.el = softLimit(raw.el, LIM.el);
      const gap = Math.max(8, e.timeStamp - lastT); lastT = e.timeStamp;
      vel.az = vel.az * 0.6 + ((-dx * 0.006) / gap) * 0.4; vel.el = vel.el * 0.6 + ((dy * 0.004) / gap) * 0.4;
    }
    request();
  });
  const endPtr = (e) => {
    const had = pts.has(e.pointerId);
    pts.delete(e.pointerId);
    if (!had || pts.size) return;
    if (dragging) { // sınır ötesindeyse yerine dön; savrulma hızı sınırlı
      dragging = false;
      camTarget.az = clamp(camTarget.az, ...LIM.az); camTarget.el = clamp(camTarget.el, ...LIM.el);
      vel.az = clamp(vel.az, -0.0012, 0.0012); vel.el = clamp(vel.el, -0.0008, 0.0008);
      if (e.type !== 'pointerup' || e.timeStamp - lastT > 90) { vel.az = 0; vel.el = 0; }
      request();
    }
    if (e.type === 'pointerup' && moved <= 6) {
      const id = locationAt(e.clientX, e.clientY);
      if (id) onPick?.(id);
    }
  };
  canvas.addEventListener('pointerup', endPtr);
  canvas.addEventListener('pointercancel', endPtr);
  canvas.addEventListener('pointerleave', () => { if (hover) { hover = null; canvas.style.cursor = ''; applyRings(); request(); } });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    cancelIntro();
    camTarget.zoom = clamp(camTarget.zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1), ...LIM.zoom);
    request();
  }, { passive: false });
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); onLost?.(); });

  let eraId = null;
  let swapping = false;
  function setEra(id, motion, redrawState) {
    const apply = () => {
      applyEra(id, redrawState());
      lamp.color.set(LAMP[id] || '#ffc98a');
      eraId = id; swapping = false;
      request();
    };
    if (eraId === null || motion === 'kapali') { apply(); return; }
    // ışık kısılır, doku/yapılar değişir, ışık geri gelir
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

  let gameKeySeen;
  return {
    canvas,
    update(snap, state, { motion, gameKey }) {
      motionMode = motion || 'normal';
      if (gameKeySeen !== undefined && gameKey !== gameKeySeen) introPending = true;
      gameKeySeen = gameKey;
      if (snap.era !== eraId && !swapping) setEra(snap.era, motion, () => state);
      pieces.sync(snap, { motion, gameKey });
      reachIds = snap.reach;
      curLoc = snap.pawns.find((p) => p.cur && !p.ruh)?.loc ?? null;
      if (hover && !reachIds.includes(hover)) hover = null;
      applyRings();
      resize();
      request();
    },
    resetView(motion) {
      cancelIntro();
      vel.az = 0; vel.el = 0;
      camTarget = { ...DEFAULT_VIEW };
      if (motion === 'kapali') Object.assign(cam, DEFAULT_VIEW);
      request();
    },
    resize, request,
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      pieces.dispose();
      owned.forEach((o) => { o.geometry?.dispose?.(); o.material?.dispose?.(); o.dispose?.(); });
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
