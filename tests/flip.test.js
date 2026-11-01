import { describe, it, expect, beforeEach } from 'vitest';
import { flipCard, activateFlips, resetFlips, isFlipped } from '../src/ui/flip.js';
import { ANIM_MODES, animScale, getAnim, motionOff } from '../src/ui/anim.js';

// Node ortamında DOM yok: activateFlips için asgari sahte kök.
function fakeRoot(html) {
  const ids = [...html.matchAll(/data-flip-id="([^"]+)"[^>]*data-flip-new="1"/g)].map((m) => m[1]);
  const els = ids.map((id) => ({
    dataset: { flipId: id },
    classes: new Set(),
    attrs: new Set(['data-flip-new']),
    removeAttribute(a) { this.attrs.delete(a); },
    hasAttribute() { return false; },
    classList: { add: (c) => els.find((e) => e.dataset.flipId === id).classes.add(c) },
  }));
  return { els, querySelectorAll: () => els };
}

describe('flipCard', () => {
  beforeEach(() => resetFlips());

  it('ilk çizimde arka yüzle başlar ve yeni olarak işaretlenir', () => {
    const h = flipCard({ id: 'a', front: '<b>GİZLİ</b>' });
    expect(h).toContain('data-flip-new="1"');
    expect(h).not.toContain('is-flipped');
    expect(h).toContain('assets/kart_arkasi.webp');
    expect(h).toContain('flip-back" aria-hidden="true"');
    expect(h).toContain('<b>GİZLİ</b>');
  });

  it('activateFlips sonrası aynı kart doğrudan çevrilmiş gelir (animasyon tekrarlanmaz)', () => {
    const root = fakeRoot(flipCard({ id: 'a', front: 'x' }));
    expect(activateFlips(root)).toBe(1);
    expect(isFlipped('a')).toBe(true);
    const again = flipCard({ id: 'a', front: 'x' });
    expect(again).toContain('is-flipped');
    expect(again).not.toContain('data-flip-new');
  });

  it('farklı kimlik yeniden animasyon yapar; yeni oyun sıfırlar', () => {
    activateFlips(fakeRoot(flipCard({ id: 'a', front: 'x' })));
    expect(flipCard({ id: 'b', front: 'x' })).toContain('data-flip-new');
    resetFlips();
    expect(flipCard({ id: 'a', front: 'x' })).toContain('data-flip-new');
  });

  it('toggle kartı klavye erişilebilir, kimlik ve gecikme güvenle yazılır', () => {
    const h = flipCard({ id: 'r"<1', front: 'x', toggle: true, label: 'Rol', delay: 250.4, tag: 'span' });
    expect(h).toContain('tabindex="0"');
    expect(h).toContain('role="button"');
    expect(h).toContain('aria-pressed="false"');
    expect(h).toContain('--flip-delay:250ms');
    expect(h).not.toContain('r"<1');
    expect(h.startsWith('<span ')).toBe(true);
  });
});

describe('anim', () => {
  it('modlar ve çarpanlar', () => {
    expect(ANIM_MODES).toEqual(['hizli', 'normal', 'kapali']);
    expect(animScale('kapali')).toBe(0);
    expect(animScale('hizli')).toBeLessThan(animScale('normal'));
  });
  it('tarayıcı dışında varsayılan normal, hareket açık', () => {
    expect(getAnim()).toBe('normal');
    expect(motionOff()).toBe(false);
  });
});
