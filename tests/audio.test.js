import { describe, it, expect } from 'vitest';
import {
  SCALES, degreeFreq, centsToRatio, mulberry32, nextDegree, makeImpulse,
  parseSettings, serializeSettings, masterGain, moodParams, ROOT_HZ,
} from '../src/audio/synth.js';

describe('makam dizileri', () => {
  it('diziler 0 ile başlar, 1200 ile biter, artan sıradadır', () => {
    for (const s of Object.values(SCALES)) {
      expect(s[0]).toBe(0); expect(s.at(-1)).toBe(1200);
      for (let i = 1; i < s.length; i++) expect(s[i]).toBeGreaterThan(s[i - 1]);
    }
  });
  it('hicaz bozuk perde içerir (tampere olmayan cent)', () => {
    expect(SCALES.hicaz.some((c) => c % 100 !== 0)).toBe(true);
  });
  it('oktav ve kök frekansı doğru', () => {
    expect(degreeFreq('hicaz', 0)).toBeCloseTo(ROOT_HZ, 5);
    expect(degreeFreq('hicaz', 7)).toBeCloseTo(ROOT_HZ * 2, 5);
    expect(degreeFreq('nihavent', -7)).toBeCloseTo(ROOT_HZ / 2, 5);
    expect(centsToRatio(1200)).toBeCloseTo(2, 9);
  });
});

describe('rastgelelik ve melodi', () => {
  it('tohumlu üreteç tekrarlanabilir ve 0..1', () => {
    const a = mulberry32(5), b = mulberry32(5);
    for (let i = 0; i < 50; i++) { const x = a(); expect(x).toBe(b()); expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThan(1); }
  });
  it('melodi yürüyüşü aralıkta kalır', () => {
    const r = mulberry32(1); let d = 8;
    for (let i = 0; i < 500; i++) { d = nextDegree(r, d, 4, 12); expect(d).toBeGreaterThanOrEqual(4); expect(d).toBeLessThanOrEqual(12); }
  });
});

describe('impuls ve ayarlar', () => {
  it('impuls sınırlı ve sönümlü', () => {
    const imp = makeImpulse(1, 8000, mulberry32(2));
    expect(imp.length).toBe(8000);
    expect(Math.max(...imp.map(Math.abs))).toBeLessThanOrEqual(1);
    const e = (a, b) => imp.slice(a, b).reduce((s, v) => s + v * v, 0);
    expect(e(0, 2000)).toBeGreaterThan(e(6000, 8000));
  });
  it('ayar ayrıştırma bozuk girdiyi varsayılana çevirir', () => {
    expect(parseSettings('{x')).toEqual({ volume: 0.7, muted: false });
    expect(parseSettings(null).muted).toBe(false);
    expect(parseSettings('{"volume":5,"muted":1}')).toEqual({ volume: 1, muted: true });
    expect(parseSettings(serializeSettings({ volume: 0.3, muted: true }))).toEqual({ volume: 0.3, muted: true });
  });
  it('ana kazanç: sessizde 0, oyunda menüden düşük, tavan altında', () => {
    expect(masterGain({ volume: 1, muted: true }, 'menu')).toBe(0);
    expect(masterGain({ volume: 1, muted: false }, 'game')).toBeLessThan(masterGain({ volume: 1, muted: false }, 'menu'));
    expect(masterGain({ volume: 1, muted: false }, 'menu')).toBeLessThanOrEqual(0.5);
    expect(moodParams('yok')).toBe(moodParams('game'));
  });
});
