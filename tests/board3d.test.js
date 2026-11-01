import { describe, it, expect } from 'vitest';
import { createGame, startGame, act, currentPlayer, reachable } from '../src/game/engine.js';
import { LOCATIONS } from '../src/game/data/locations.js';
import { readFileSync } from 'node:fs';
import { snapshot, a11yHTML, toWorld, toBoard, toUV, uvToWorld, anchor, LOC_UV, BOARD_W, BOARD_H } from '../src/ui/board3d/model.js';
import { nearestLocation } from '../src/ui/board3d/pick.js';
import { drawWoodTexture, drawVignette, drawGlow, drawLabel, labelLayout, LABEL_CW, LABEL_CH } from '../src/ui/board3d/texture.js';

const players = Array.from({ length: 5 }, (_, i) => ({ name: `B${i}`, isBot: i > 0 }));
function dayGame() {
  const s = createGame({ seed: 77, mode: 'dedektif', players });
  startGame(s); act(s, { type: 'begin' }); act(s, { type: 'start-days' });
  return s;
}

// Her çağrıyı yutan sahte 2D bağlam (node'da canvas yok)
function fakeCtx() {
  const calls = [];
  const grad = { addColorStop() {} };
  const ctx = new Proxy({}, {
    get: (t, k) => {
      if (k === 'calls') return calls;
      if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => grad;
      return t[k] ?? ((...a) => { calls.push([k, a]); });
    },
    set: (t, k, v) => { t[k] = v; return true; },
  });
  return ctx;
}

// harita.webp boyutunu başlıktan okur (VP8 / VP8L / VP8X)
function webpSize(buf) {
  const t = buf.toString('ascii', 12, 16);
  if (t === 'VP8X') return { w: 1 + buf.readUIntLE(24, 3), h: 1 + buf.readUIntLE(27, 3) };
  if (t === 'VP8L') { const v = buf.readUInt32LE(21); return { w: 1 + (v & 0x3fff), h: 1 + ((v >> 14) & 0x3fff) }; }
  return { w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff };
}

describe('3D tahta: harita görseli ve mekân eşlemesi', () => {
  it('harita görseli kare ve doku sınırı (2048 px) içinde', () => {
    const { w, h } = webpSize(readFileSync('public/assets/harita.webp'));
    expect(w).toBe(h);
    expect(w).toBeLessThanOrEqual(2048);
    expect(BOARD_W).toBe(BOARD_H);
  });
  it('eşleme tablosu 16 mekânın hepsini kapsar; koordinatlar 0..1 ve daireler ayrık', () => {
    expect(Object.keys(LOC_UV).sort()).toEqual(Object.keys(LOCATIONS).sort());
    expect(Object.keys(LOC_UV)).toHaveLength(16);
    for (const [id, m] of Object.entries(LOC_UV)) {
      expect(m.u, id).toBeGreaterThan(0.05); expect(m.u, id).toBeLessThan(0.95);
      expect(m.v, id).toBeGreaterThan(0.05); expect(m.v, id).toBeLessThan(0.95);
      expect(['c', 'l', 'r']).toContain(m.a);
    }
    const ids = Object.keys(LOC_UV);
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
      const A = LOC_UV[ids[i]], B = LOC_UV[ids[j]];
      expect(Math.hypot(A.u - B.u, A.v - B.v), `${ids[i]}-${ids[j]}`).toBeGreaterThan(0.08);
    }
  });
  it('tahta <-> dünya <-> doku dönüşümleri çift yönlüdür', () => {
    const w = toWorld(123, 321);
    const b = toBoard(w.x, w.z);
    expect(b.x).toBeCloseTo(123); expect(b.y).toBeCloseTo(321);
    expect(toWorld(BOARD_W / 2, BOARD_H / 2)).toEqual({ x: 0, z: 0 });
    const t = toUV(w.x, w.z);
    const w2 = uvToWorld(t.u, t.v);
    expect(w2.x).toBeCloseTo(w.x); expect(w2.z).toBeCloseTo(w.z);
    expect(toUV(0, 0)).toEqual({ u: 0.5, v: 0.5 });
    const a = anchor('galata');
    expect(a.x).toBeCloseTo(LOC_UV.galata.u * BOARD_W);
  });
  it('pick: her mekânın kendi dairesi o mekânı seçer (dünya noktasından da)', () => {
    for (const [id, m] of Object.entries(LOC_UV)) {
      expect(nearestLocation(m.u, m.v), id).toBe(id);
      const w = uvToWorld(m.u + 0.01, m.v - 0.008);
      const t = toUV(w.x, w.z);
      expect(nearestLocation(t.u, t.v), id).toBe(id);
    }
  });
  it('yarıçap dışı ve yalnız-izinli filtre çalışır', () => {
    expect(nearestLocation(0.02, 0.02)).toBeNull();
    const m = LOC_UV.hipodrom;
    expect(nearestLocation(m.u + 0.01, m.v, 0.04, ['ayasofya'])).toBeNull();
    expect(nearestLocation(m.u + 0.01, m.v, 0.04, ['hipodrom'])).toBe('hipodrom');
  });
});

describe('3D tahta: durum anlık görüntüsü', () => {
  it('piyonlar, tılsımlar ve ulaşılabilir mekânlar yansır', () => {
    const s = dayGame();
    const p = currentPlayer(s);
    const reach = reachable(s, p);
    const snap = snapshot(s, { reach, currentId: p.id });
    expect(snap.pawns).toHaveLength(5);
    expect(snap.pawns.filter((x) => x.cur)).toHaveLength(1);
    expect(snap.reach.sort()).toEqual(Object.keys(reach).sort());
    const ts = snap.tokens.filter((t) => t.kind === 'tilsim');
    expect(ts.length).toBeGreaterThan(0);
    expect(ts.every((t) => t.state === 'open')).toBe(true);
  });
  it('jeton ve ceset eklenince anahtarlı olarak görünür; çalınan tılsım "stolen"', () => {
    const s = dayGame();
    s.guards.hipodrom = 1; s.photos.hipodrom = 2;
    s.bodies.push({ loc: 'hipodrom', victimId: 3, era: 0, iz: { cat: 'renk', val: 'x' } });
    s.tilsim.hipodrom = false;
    const snap = snapshot(s);
    const keys = snap.tokens.map((t) => t.key);
    expect(keys).toEqual(expect.arrayContaining(['guard:hipodrom', 'photo:hipodrom', 'body:hipodrom:3', 'tilsim:hipodrom']));
    expect(snap.tokens.find((t) => t.key === 'tilsim:hipodrom').state).toBe('stolen');
  });
  it('sürgün/ifşa piyonlar gizlenir, ruh showRuh ile', () => {
    const s = dayGame();
    s.players[1].status = 'surgun'; s.players[2].status = 'ruh';
    expect(snapshot(s).pawns).toHaveLength(4);
    expect(snapshot(s, { showRuh: false }).pawns).toHaveLength(3);
  });
});

describe('3D tahta: erişilebilir metin', () => {
  it('ulaşılabilir mekânlar data-act="node" düğmesi olur, durum metinle listelenir', () => {
    const s = dayGame();
    const p = currentPlayer(s);
    const reach = reachable(s, p);
    const html = a11yHTML(s, { reach, currentId: p.id });
    expect(html).toContain('sr-only');
    for (const id of Object.keys(reach)) expect(html).toContain(`data-loc="${id}"`);
    expect((html.match(/data-act="node"/g) || []).length).toBe(Object.keys(reach).length);
    expect(html).toContain(p.name);
  });
  it('ulaşılabilir yer yoksa düğme listesi çıkmaz', () => {
    expect(a11yHTML(dayGame(), { reach: {} })).not.toContain('data-act="node"');
  });
});

describe('3D tahta: etiketler ve yardımcı dokular', () => {
  it('etiketler daire altında, harita içinde kalır ve birbirinin üstüne binmez (tüm çağlar)', () => {
    const s = dayGame();
    for (let i = 0; i < 4; i++) {
      s.eraIndex = i;
      const items = labelLayout(s);
      expect(items).toHaveLength(16);
      for (const it of items) {
        expect(it.cy).toBeGreaterThan(LOC_UV[it.id].v);
        expect(it.left, it.id).toBeGreaterThanOrEqual(0.06); expect(it.right, it.id).toBeLessThanOrEqual(0.94);
        expect(it.bottom, it.id).toBeLessThanOrEqual(0.94);
      }
      for (let a = 0; a < items.length; a++) for (let b = a + 1; b < items.length; b++) {
        const A = items[a], B = items[b];
        const overlap = A.left < B.right && B.left < A.right && A.top < B.bottom && B.top < A.bottom;
        expect(overlap, `${A.id} x ${B.id} (çağ ${i})`).toBe(false);
      }
    }
  });
  it('kapalı mekân etiketi "Henüz yok" olur, açık mekân çağa göre adını gösterir', () => {
    const s = dayGame();
    s.eraIndex = 0;
    const names = Object.fromEntries(labelLayout(s).map((l) => [l.id, l.name]));
    expect(names.suleymaniye).toBe('Henüz yok');
    expect(names.ayasofya).toBe('Ayasofya İnşaatı');
    s.eraIndex = 3;
    expect(labelLayout(s).find((l) => l.id === 'ayasofya').name).toBe('Ayasofya');
  });
  it('etiket dokusu üç hizada ve iki durumda hatasız çizilir', () => {
    for (const a of ['c', 'l', 'r']) for (const open of [true, false]) {
      const ctx = fakeCtx();
      expect(() => drawLabel(ctx, 'Sultanahmet Meydanı', { open, a })).not.toThrow();
      expect(ctx.calls.some(([k]) => k === 'fillText')).toBe(true);
      expect(ctx.calls.some(([k]) => k === 'clearRect')).toBe(true);
    }
    expect(LABEL_CW).toBeLessThanOrEqual(2048); expect(LABEL_CH).toBeLessThanOrEqual(2048);
  });
  it('ahşap, vinyet ve parlama dokuları çizilir', () => {
    for (const fn of [(c) => drawWoodTexture(c, 256, 128), (c) => drawVignette(c, 64, 64), (c) => drawGlow(c, 64, 64)]) {
      const ctx = fakeCtx();
      expect(() => fn(ctx)).not.toThrow();
      expect(ctx.calls.length).toBeGreaterThan(0);
    }
  });
});
