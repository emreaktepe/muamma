// Piyonlar ve jetonlar: paylaşılan geometri/malzeme, anahtarlı eşitleme, küçük tween sistemi.
import {
  Group, Mesh, MeshStandardMaterial, CylinderGeometry, BoxGeometry, ExtrudeGeometry, Shape, TorusGeometry,
  TextureLoader, SRGBColorSpace, CircleGeometry, CanvasTexture, MeshBasicMaterial, AdditiveBlending,
} from 'three';
import { toWorld } from './model.js';
import { drawGlow } from './texture.js';

export const BOARD_Y = 0.105; // tahta yüzeyinin masadan yüksekliği

const PLAYER_COLORS = ['#c0392b', '#2e86c1', '#27ae60', '#d4ac0d', '#8e44ad', '#e67e22', '#16a085', '#7f8c8d'];
const ease = (k) => 1 - (1 - k) ** 3;

function starGeometry() {
  const sh = new Shape();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (Math.PI * i) / 5;
    const r = i % 2 ? 0.065 : 0.15;
    if (i === 0) sh.moveTo(r * Math.cos(a), r * Math.sin(a)); else sh.lineTo(r * Math.cos(a), r * Math.sin(a));
  }
  sh.closePath();
  const g = new ExtrudeGeometry(sh, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 1 });
  g.rotateX(Math.PI / 2); // yıldız yatsın (ön yüzü yukarı)
  g.translate(0, 0.03, 0);
  return g;
}

export class Pieces {
  constructor(parent, requestRender) {
    this.parent = parent;
    this.request = requestRender;
    this.pawns = new Map();
    this.tokens = new Map();
    this.tweens = [];
    this.first = true;
    this.gameKey = null;
    this.loader = new TextureLoader();
    this.avatarTex = new Map();
    const gc = document.createElement('canvas');
    gc.width = gc.height = 64;
    drawGlow(gc.getContext('2d'), 64, 64);
    this.glowTex = new CanvasTexture(gc);
    const glow = (color, opacity) => new MeshBasicMaterial({ map: this.glowTex, color, transparent: true, opacity, depthWrite: false, blending: AdditiveBlending });

    const std = (color, extra = {}) => new MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.1, ...extra });
    this.mat = {
      gold: std('#e0b83c', { metalness: 0.75, roughness: 0.3, emissive: '#3a2a00' }),
      coral: std('#c0392b', { emissive: '#3a0a06' }),
      turq: std('#1E8C93', { roughness: 0.4 }),
      ink: std('#1a1a1a', { roughness: 0.35 }),
      cream: std('#efe3c8'),
      stolen: std('#7d7869', { transparent: true, opacity: 0.5, roughness: 0.9 }),
      pawnSide: std('#2a2018', { roughness: 0.6 }),
      ring: new MeshStandardMaterial({ color: '#ffd24a', emissive: '#ffb300', emissiveIntensity: 0.9, roughness: 0.3 }),
      glowOpen: glow('#ff7a5a', 0.7),
      glowSafe: glow('#ffd24a', 0.8),
      ghost: new MeshStandardMaterial({ color: '#7fe3d6', emissive: '#2bb3a3', emissiveIntensity: 0.6, transparent: true, opacity: 0.6, roughness: 0.4 }),
    };
    this.geo = {
      star: starGeometry(),
      base: new CylinderGeometry(0.16, 0.2, 0.09, 24),
      disc: new CylinderGeometry(0.17, 0.17, 0.035, 28),
      guard: new BoxGeometry(0.2, 0.28, 0.07),
      guardTop: new BoxGeometry(0.26, 0.05, 0.1),
      photo: new BoxGeometry(0.3, 0.025, 0.22),
      lens: new CylinderGeometry(0.05, 0.05, 0.03, 16),
      body: new CylinderGeometry(0.17, 0.17, 0.035, 24),
      bar: new BoxGeometry(0.22, 0.012, 0.045),
      ring: new TorusGeometry(0.2, 0.022, 8, 28),
      glow: new CircleGeometry(0.42, 28),
      ghost: new CylinderGeometry(0.07, 0.13, 0.3, 20),
    };
  }

  avatar(charId) {
    let t = this.avatarTex.get(charId);
    if (!t) {
      t = this.loader.load(`assets/avatar_${charId}.webp`, () => this.request());
      t.colorSpace = SRGBColorSpace;
      t.anisotropy = 4;
      this.avatarTex.set(charId, t);
    }
    return t;
  }

  // ---- piyon ----
  makePawn(p) {
    const g = new Group();
    const inner = new Group(); inner.scale.setScalar(0.7); g.add(inner); // piyon, harita dairelerine göre küçük dursun
    const col = PLAYER_COLORS[p.id % PLAYER_COLORS.length];
    const baseMat = new MeshStandardMaterial({ color: col, roughness: 0.4, metalness: 0.2, transparent: true });
    const base = new Mesh(this.geo.base, baseMat);
    base.position.y = 0.05; base.castShadow = true; base.receiveShadow = true;
    inner.add(base);
    const faceMat = new MeshStandardMaterial({ map: this.avatar(p.charId), roughness: 0.5, transparent: true });
    const sideMat = this.mat.pawnSide.clone(); sideMat.transparent = true;
    const stand = new Group();
    const disc = new Mesh(this.geo.disc, [sideMat, faceMat, sideMat]);
    disc.castShadow = true;
    stand.add(disc);
    stand.scale.setScalar(1);
    stand.position.set(0, 0.33, 0);
    stand.rotation.x = Math.PI / 2 - 0.62; // yüz, kameraya doğru eğik
    stand.rotation.order = 'XYZ';
    inner.add(stand);
    // taşıyıcı ayak
    const post = new Mesh(new CylinderGeometry(0.03, 0.03, 0.18, 8), sideMat);
    post.position.y = 0.17; inner.add(post);
    const ring = new Mesh(this.geo.ring, this.mat.ring);
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.1; ring.visible = false;
    inner.add(ring);
    g.userData = { baseMat, faceMat, sideMat, ring, stand };
    this.parent.add(g);
    return g;
  }

  // ---- jeton ----
  makeToken(t) {
    const g = new Group();
    const m = this.mat;
    const add = (geo, mat, y = 0, x = 0, z = 0) => { const mesh = new Mesh(geo, mat); mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; g.add(mesh); return mesh; };
    if (t.kind === 'tilsim') {
      g.userData.star = add(this.geo.star, m.coral);
      const gl = new Mesh(this.geo.glow, m.glowOpen);
      gl.rotation.x = -Math.PI / 2; gl.position.y = 0.012; gl.renderOrder = 3;
      g.add(gl);
      g.userData.glow = gl;
    } else if (t.kind === 'guard') {
      add(this.geo.guard, m.turq, 0.14);
      add(this.geo.guardTop, m.gold, 0.3);
    } else if (t.kind === 'photo') {
      add(this.geo.photo, m.ink, 0.015);
      add(this.geo.lens, m.gold, 0.035);
      g.rotation.y = 0.35;
    } else if (t.kind === 'perili') {
      add(this.geo.ghost, m.ghost, 0.15);
    } else if (t.kind === 'body') {
      add(this.geo.body, m.coral, 0.018);
      const a = add(this.geo.bar, m.cream, 0.04); a.rotation.y = Math.PI / 4;
      const b = add(this.geo.bar, m.cream, 0.04); b.rotation.y = -Math.PI / 4;
    }
    this.parent.add(g);
    return g;
  }

  applyToken(entry, t) {
    if (t.kind === 'tilsim') {
      const star = entry.group.userData.star;
      star.material = t.state === 'stolen' ? this.mat.stolen : t.state === 'safe' ? this.mat.gold : this.mat.coral;
      star.scale.y = t.state === 'stolen' ? 0.4 : 1;
      star.castShadow = t.state !== 'stolen';
      if (t.state === 'stolen') { star.position.y = 0; star.rotation.y = 0; }
      const gl = entry.group.userData.glow;
      gl.visible = t.state !== 'stolen';
      gl.material = t.state === 'safe' ? this.mat.glowSafe : this.mat.glowOpen;
    }
  }

  tokenY(t) { return BOARD_Y + 0.005 + t.level * 0.05; }

  // Boşta süren hafif animasyonlar (tılsım yıldızı dönüşü/ışıltısı, aktif piyon halkası); sec: saniye
  animate(sec) {
    this.mat.glowOpen.opacity = 0.5 + 0.3 * Math.sin(sec * 2.4);
    this.mat.glowSafe.opacity = 0.62 + 0.18 * Math.sin(sec * 1.8 + 1);
    for (const e of this.tokens.values()) {
      const u = e.group.userData;
      if (!u.star || e.state === 'stolen') continue;
      u.star.rotation.y = sec * 0.9;
      u.star.position.y = 0.05 + Math.sin(sec * 2 + e.group.position.x) * 0.018;
      u.glow.scale.setScalar(1 + 0.12 * Math.sin(sec * 2.4));
    }
    for (const e of this.pawns.values()) {
      if (!e.cur) continue;
      const r = e.group.userData.ring;
      r.scale.setScalar(1 + 0.07 * Math.sin(sec * 4));
    }
  }
  get ambientActive() { for (const e of this.tokens.values()) if (e.state !== 'stolen' && e.group.userData.star) return true; return [...this.pawns.values()].some((e) => e.cur); }

  // ---- tween ----
  tween(dur, fn, done) {
    if (dur <= 0) { fn(1); done?.(); return; }
    this.tweens.push({ dur, t: 0, fn, done });
  }
  step(dtMs) {
    for (const tw of this.tweens) {
      tw.t = Math.min(tw.dur, tw.t + dtMs);
      tw.fn(ease(tw.t / tw.dur));
    }
    const finished = this.tweens.filter((t) => t.t >= t.dur);
    this.tweens = this.tweens.filter((t) => t.t < t.dur);
    finished.forEach((t) => t.done?.());
    return this.tweens.length > 0;
  }
  get busy() { return this.tweens.length > 0; }

  clear() {
    for (const e of [...this.pawns.values(), ...this.tokens.values()]) this.parent.remove(e.group);
    this.pawns.clear(); this.tokens.clear(); this.tweens = [];
  }

  // ---- eşitleme ----
  sync(snap, { motion = 'normal', gameKey = null } = {}) {
    if (gameKey !== this.gameKey) { this.clear(); this.first = true; this.gameKey = gameKey; }
    const instant = this.first || motion === 'kapali';
    const walk = motion === 'hizli' ? 260 : 620;
    const drop = motion === 'hizli' ? 220 : 480;

    const seenP = new Set();
    for (const p of snap.pawns) {
      seenP.add(p.id);
      const w = toWorld(p.x, p.y);
      let e = this.pawns.get(p.id);
      const target = { x: w.x, z: w.z };
      if (!e) {
        e = { group: this.makePawn(p), pos: { ...target }, target };
        e.group.position.set(target.x, BOARD_Y, target.z);
        this.pawns.set(p.id, e);
        if (!instant) {
          e.group.scale.setScalar(0.01);
          this.tween(drop, (k) => e.group.scale.setScalar(0.01 + 0.99 * k));
        }
      } else if (Math.abs(e.target.x - target.x) > 1e-4 || Math.abs(e.target.z - target.z) > 1e-4) {
        const from = { ...e.pos };
        e.target = target;
        e.moveId = (e.moveId || 0) + 1;
        const id = e.moveId;
        this.tween(instant ? 0 : walk, (k) => {
          if (e.moveId !== id) return;
          e.pos.x = from.x + (target.x - from.x) * k;
          e.pos.z = from.z + (target.z - from.z) * k;
          e.group.position.set(e.pos.x, BOARD_Y + Math.sin(k * Math.PI * 3) * 0.06 * (1 - k * 0.3), e.pos.z);
        });
      }
      const u = e.group.userData;
      const op = p.ruh ? 0.42 : 1;
      u.baseMat.opacity = op; u.faceMat.opacity = op; u.sideMat.opacity = op;
      u.ring.visible = p.cur;
      e.group.renderOrder = p.ruh ? 2 : 0;
      e.cur = p.cur;
    }
    for (const [id, e] of [...this.pawns]) {
      if (seenP.has(id)) continue;
      this.pawns.delete(id);
      const g = e.group;
      this.tween(instant ? 0 : drop, (k) => g.scale.setScalar(Math.max(0.01, 1 - k)), () => this.parent.remove(g));
      if (instant) this.parent.remove(g);
    }

    const seenT = new Set();
    for (const t of snap.tokens) {
      seenT.add(t.key);
      const w = toWorld(t.x, t.y);
      let e = this.tokens.get(t.key);
      if (!e) {
        e = { group: this.makeToken(t), kind: t.kind };
        e.group.position.set(w.x, this.tokenY(t), w.z);
        this.tokens.set(t.key, e);
        if (!instant) {
          const y1 = this.tokenY(t);
          e.group.scale.setScalar(0.01);
          this.tween(drop * 1.3, (k) => { e.group.position.y = y1 + (1 - k) * 1.6; e.group.scale.setScalar(0.01 + 0.99 * Math.min(1, k * 2)); });
        }
      }
      if (e.state !== t.state) { this.applyToken(e, t); e.state = t.state; }
    }
    for (const [key, e] of [...this.tokens]) {
      if (seenT.has(key)) continue;
      this.tokens.delete(key);
      const g = e.group;
      const y0 = g.position.y;
      if (instant) this.parent.remove(g);
      else this.tween(drop, (k) => { g.position.y = y0 + k * 0.8; g.scale.setScalar(Math.max(0.01, 1 - k)); }, () => this.parent.remove(g));
    }
    this.first = false;
    this.request();
  }

  dispose() {
    this.clear();
    Object.values(this.geo).forEach((g) => g.dispose());
    Object.values(this.mat).forEach((m) => m.dispose());
    this.avatarTex.forEach((t) => t.dispose());
    this.glowTex.dispose();
  }
}

