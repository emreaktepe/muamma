import { describe, it, expect } from 'vitest';
import {
  createGame, startGame, act, reachable, nightOptions, player, golgeler, tilsimCount, RULES, currentPlayer, charOf,
} from '../src/game/engine.js';
import { CHARACTERS } from '../src/game/data/characters.js';
import { playToEnd } from '../src/game/autoplay.js';

const bots = (n) => Array.from({ length: n }, (_, i) => ({ name: `B${i}`, isBot: true }));
const humans = (n) => Array.from({ length: n }, (_, i) => ({ name: `H${i}`, isBot: false }));

function toDay(s) {
  startGame(s);
  act(s, { type: 'begin' });
  act(s, { type: 'start-days' });
}

describe('iz sistemi', () => {
  it('her değer tam iki karakterde, iki karakter en fazla bir izi paylaşır', () => {
    const counts = {};
    for (const c of CHARACTERS) for (const [k, v] of Object.entries(c.iz)) counts[`${k}:${v}`] = (counts[`${k}:${v}`] || 0) + 1;
    expect(Object.values(counts).every((n) => n === 2)).toBe(true);
    for (const a of CHARACTERS) for (const b of CHARACTERS) {
      if (a === b) continue;
      const shared = Object.keys(a.iz).filter((k) => a.iz[k] === b.iz[k]).length;
      expect(shared).toBeLessThanOrEqual(1);
    }
  });
});

describe('kurulum', () => {
  it('oyuncu sayısına göre Gölge sayısı', () => {
    expect(golgeler(createGame({ seed: 1, players: bots(4) })).length).toBe(1);
    expect(golgeler(createGame({ seed: 1, players: bots(6) })).length).toBe(1);
    expect(golgeler(createGame({ seed: 1, players: bots(7) })).length).toBe(2);
    expect(golgeler(createGame({ seed: 1, mode: 'cirak', players: bots(5) })).length).toBe(0);
  });
  it('karakterler benzersiz', () => {
    const s = createGame({ seed: 3, players: bots(8) });
    expect(new Set(s.players.map((p) => p.charId)).size).toBe(8);
  });
});

describe('hareket', () => {
  it('532\'de Kapalıçarşı kapalı; deniz geçişi yürüyüşün tamamı', () => {
    const s = createGame({ seed: 2, players: humans(4) });
    toDay(s);
    const p = s.players.find((x) => x.charId !== 'yorgo');
    p.loc = 'sirkeci';
    const r = reachable(s, p);
    expect(r.kapalicarsi).toBeUndefined();
    expect(r.galata).toBe(2);
    expect(r.pera).toBeUndefined();
  });
  it('Kayıkçı Yorgo denizden tek adımda geçer ve 3 adım gider', () => {
    const s = createGame({ seed: 2, players: [{ name: 'Y', charId: 'yorgo' }, ...humans(3)] });
    toDay(s);
    const y = s.players[0];
    y.loc = 'sirkeci';
    const r = reachable(s, y);
    expect(r.galata).toBe(1);
    expect(r.pera).toBe(2);
    expect(r.tophane).toBe(2);
    expect(r.uskudar).toBe(3);
    expect(r.rumelihisari).toBeUndefined(); // 532'de henüz yok
  });
});

describe('gizli inceleme ve yalan', () => {
  it('yalan iddia, aynı mekânın açık incelemesiyle çürütülür', () => {
    const s = createGame({ seed: 5, players: humans(4) });
    toDay(s);
    const a = currentPlayer(s);
    a.loc = 'hipodrom';
    act(s, { type: 'investigate', playerId: a.id, mode: 'gizli' });
    expect(s.pending.type).toBe('claim');
    act(s, { type: 'claim', playerId: a.id, claim: 'sahte' });
    act(s, { type: 'end-turn', playerId: a.id });
    const b = currentPlayer(s);
    b.loc = 'hipodrom';
    act(s, { type: 'investigate', playerId: b.id, mode: 'acik' });
    expect(player(s, a.id).liesCaught).toBe(1);
    expect(s.defter.some((e) => e.type === 'curutuldu')).toBe(true);
  });
});

describe('gece', () => {
  it('suikast yalnız aynı ya da komşu mekâna; fotoğraf korur', () => {
    const s = createGame({ seed: 9, players: humans(5) });
    toDay(s);
    const g = golgeler(s)[0];
    const others = s.players.filter((p) => p.id !== g.id);
    g.loc = 'hipodrom';
    others[0].loc = 'ayasofya';   // komşu
    others[1].loc = 'galata';     // uzak
    others[2].loc = 'cemberlitas';
    others[3].loc = 'cemberlitas';
    s.photos.cemberlitas = 99;
    const o = nightOptions(s);
    const targets = o.kills.map((k) => k.target);
    expect(targets).toContain(others[0].id);
    expect(targets).not.toContain(others[1].id);
    expect(targets).not.toContain(others[2].id);
  });
  it('en az iki Muhafız ayakta kalır', () => {
    const s = createGame({ seed: 9, players: humans(4) });
    toDay(s);
    const g = golgeler(s)[0];
    s.players.filter((p) => p.id !== g.id)[0].status = 'ruh';
    for (const p of s.players) p.loc = 'hipodrom';
    expect(RULES.MIN_MUHAFIZ_ALIVE).toBe(2);
    expect(nightOptions(s).kills.length).toBe(0);
  });
});

describe('Perde IV ipuçları', () => {
  it('her kazı ipucu Gölge\'nin gerçek izini içerir', () => {
    for (let seed = 1; seed < 30; seed++) {
      const s = createGame({ seed, players: bots(5) });
      const iz = charOf(golgeler(s)[0]).iz;
      for (const fc of Object.values(s.finalClues)) expect(fc.vals).toContain(iz[fc.cat]);
    }
  });
});

describe('tam oyun', () => {
  it('bot oyunları her oyuncu sayısında takılmadan biter', () => {
    for (const n of [4, 5, 6, 7, 8]) {
      for (let seed = 1; seed <= 15; seed++) {
        const s = createGame({ seed: seed * 31 + n, players: bots(n) });
        playToEnd(s);
        expect(['muhafiz', 'golge']).toContain(s.winner);
        expect(tilsimCount(s)).toBeGreaterThanOrEqual(0);
      }
    }
  });
  it('aynı tohum aynı oyunu üretir', () => {
    const a = createGame({ seed: 77, players: bots(6) });
    const b = createGame({ seed: 77, players: bots(6) });
    playToEnd(a); playToEnd(b);
    expect(a.winner).toBe(b.winner);
    expect(a.defter.length).toBe(b.defter.length);
  });
  it('çırak modu Gölge\'siz biter', () => {
    const s = createGame({ seed: 4, mode: 'cirak', players: bots(5) });
    playToEnd(s);
    expect(s.winReason).toMatch(/Çırak/);
  });
});
