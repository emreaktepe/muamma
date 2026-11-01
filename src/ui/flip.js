// Kart çevirme (CSS 3D, DOM). render() tüm DOM'u yeniden yazdığından durum burada tutulur:
// bir kart ilk kez çizildiğinde arka yüzle başlar ve bir sonraki karede çevrilir; sonraki
// çizimlerde doğrudan son durumda gelir (animasyon tekrarlanmaz).
import { motionOff } from './anim.js';

const state = new Map(); // id -> true (ön yüz açık) | false (arka yüz)

const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function resetFlips() { state.clear(); }
export function isFlipped(id) { return state.get(id) === true; }

/**
 * flipCard({ id, front, cls, delay, slow, toggle, label, tag })
 *  id     : kart kimliği (oyun/oyuncu bazlı olmalı; aynı id ikinci kez animasyon yapmaz)
 *  front  : ön yüz HTML'i (metin DOM'da kalır; arka yüz açıkken görünmez/odaklanamaz)
 *  delay  : ms, sıralı açılış için
 *  slow   : daha yavaş çevirme (rol ifşası)
 *  toggle : klavye/fare ile geri çevrilebilir (Enter/Boşluk)
 *  tag    : 'div' (varsayılan) ya da 'span' (satır içi)
 */
export function flipCard({ id, front, cls = '', delay = 0, slow = false, toggle = false, label = 'Kartı çevir', tag = 'div' }) {
  const off = motionOff();
  if (!state.has(id) && off) state.set(id, true);
  const known = state.has(id);
  const open = known ? state.get(id) : false;
  const fresh = !known;
  const attrs = [
    `class="flip ${cls} ${open ? 'is-flipped' : ''} ${slow ? 'slow' : ''}"`,
    `data-flip-id="${esc(id)}"`,
    fresh ? 'data-flip-new="1"' : '',
    delay ? `style="--flip-delay:${Math.round(delay)}ms"` : '',
    toggle ? `data-flip-toggle="1" tabindex="0" role="button" aria-pressed="${open}" aria-label="${esc(label)}"` : '',
  ].filter(Boolean).join(' ');
  return `<${tag} ${attrs}><${tag} class="flip-tilt"><${tag} class="flip-inner">`
    + `<${tag} class="flip-face flip-front">${front}</${tag}>`
    + `<${tag} class="flip-face flip-back" aria-hidden="true"><img src="assets/kart_arkasi.webp" alt="" draggable="false"></${tag}>`
    + `</${tag}></${tag}></${tag}>`;
}

// render() sonrası çağrılır: yeni kartları bir sonraki karede çevirir.
export function activateFlips(root) {
  if (!root?.querySelectorAll) return 0;
  const fresh = [...root.querySelectorAll('.flip[data-flip-new]')];
  fresh.forEach((el) => { state.set(el.dataset.flipId, true); el.removeAttribute('data-flip-new'); });
  if (!fresh.length) return 0;
  const go = () => fresh.forEach((el) => {
    el.classList.add('is-flipped');
    if (el.hasAttribute('aria-pressed')) el.setAttribute('aria-pressed', 'true');
  });
  if (typeof requestAnimationFrame === 'function') {
    // Başlangıç durumunun boyanması için iki kare bekle.
    requestAnimationFrame(() => requestAnimationFrame(go));
  } else go();
  return fresh.length;
}

function toggleEl(el) {
  const next = !el.classList.contains('is-flipped');
  state.set(el.dataset.flipId, next);
  el.classList.toggle('is-flipped', next);
  el.setAttribute('aria-pressed', String(next));
}

// Fare eğimi, tıklama/klavye ile geri çevirme. Bir kez, document üzerinde kurulur.
let wired = false;
export function initFlip(doc = typeof document !== 'undefined' ? document : null) {
  if (wired || !doc) return;
  wired = true;
  doc.addEventListener('pointermove', (ev) => {
    if (ev.pointerType && ev.pointerType !== 'mouse' && ev.pointerType !== 'pen') return;
    if (motionOff()) return;
    const el = ev.target.closest?.('.flip');
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const px = (ev.clientX - r.left) / r.width - 0.5;
    const py = (ev.clientY - r.top) / r.height - 0.5;
    const tilt = el.querySelector('.flip-tilt');
    if (!tilt) return;
    tilt.style.setProperty('--ry', (px * 16).toFixed(2) + 'deg');
    tilt.style.setProperty('--rx', (-py * 16).toFixed(2) + 'deg');
    tilt.style.setProperty('--sx', (-px * 14).toFixed(1));
    tilt.style.setProperty('--sy', (10 - py * 8).toFixed(1));
  });
  doc.addEventListener('pointerout', (ev) => {
    const el = ev.target.closest?.('.flip');
    if (!el || el.contains(ev.relatedTarget)) return;
    const tilt = el.querySelector('.flip-tilt');
    ['--ry', '--rx', '--sx', '--sy'].forEach((k) => tilt?.style.removeProperty(k));
  });
  doc.addEventListener('click', (ev) => {
    const el = ev.target.closest?.('.flip[data-flip-toggle]');
    if (el) toggleEl(el);
  });
  doc.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Enter' && ev.key !== ' ') return;
    const el = ev.target.closest?.('.flip[data-flip-toggle]');
    if (el && ev.target === el) { ev.preventDefault(); toggleEl(el); }
  });
}
