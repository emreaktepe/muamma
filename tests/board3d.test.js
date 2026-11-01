import { describe, it, expect } from 'vitest';
import { createGame, startGame, act, currentPlayer, reachable } from '../src/game/engine.js';
import { LOCATIONS } from '../src/game/data/locations.js';
import { snapshot, a11yHTML, toWorld, toBoard } from '../src/ui/board3d/model.js';
import { nearestLocation } from '../src/ui/board3d/pick.js';
import { drawBoardTexture, drawWoodTexture } from '../src/ui/board3d/texture.js';

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

describe('3D tahta: koordinatlar ve seçim', () => {
  it('tahta <-> dünya dönüşümü çift yönlüdür', () => {
    const w = toWorld(123, 321);
    const b = toBoard(w.x, w.z);
    expect(b.x).toBeCloseTo(123); expect(b.y).toBeCloseTo(321);
    expect(toWorld(420, 220)).toEqual({ x: 0, z: 0 });
  });
  it('her mekânın kendi merkezi o mekânı seçer', () => {
    for (const [id, L] of Object.entries(LOCATIONS)) expect(nearestLocation(L.x, L.y)).toBe(id);
  });
  it('yarıçap dışı ve yalnız-izinli filtre çalışır', () => {
    expect(nearestLocation(0, 0, 22)).toBeNull();
    const L = LOCATIONS.hipodrom;
    expect(nearestLocation(L.x + 5, L.y, 22, ['ayasofya'])).toBeNull();
    expect(nearestLocation(L.x + 5, L.y, 22, ['hipodrom'])).toBe('hipodrom');
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

describe('3D tahta: dokular', () => {
  it('tahta dokusu her çağda hatasız çizilir', () => {
    globalThis.Path2D = globalThis.Path2D || class { constructor(d) { this.d = d; } };
    const s = dayGame();
    for (let i = 0; i < 4; i++) {
      s.eraIndex = i;
      const ctx = fakeCtx();
      expect(() => drawBoardTexture(ctx, s)).not.toThrow();
      expect(ctx.calls.filter(([k]) => k === 'fillText' || k === 'strokeText').length).toBeGreaterThan(16);
    }
  });
  it('ahşap dokusu çizilir', () => {
    const ctx = fakeCtx();
    expect(() => drawWoodTexture(ctx, 256, 128)).not.toThrow();
    expect(ctx.calls.length).toBeGreaterThan(100);
  });
});
