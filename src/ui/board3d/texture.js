// Prosedürel yardımcı dokular: mekân etiketleri (parşömen şerit), ahşap masa, vinyet, parlama.
// Harita görselinin kendisi hazır sanat dosyasıdır (model.js: MAP_IMG); burada çizilmez. three'siz; yalnız 2D canvas bağlamı ister.
import { LOCATIONS } from '../../game/data/locations.js';
import { isOpen, locName } from '../../game/engine.js';
import { LOC_UV, BOARD_W } from './model.js';

export function mulberry(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// ---- etiketler: dairenin altında, parşömen şeritli, çağa göre ad ----
export const LABEL_CW = 640; // etiket dokusu (px); düzlem dünya genişliği LABEL_WORLD_W
export const LABEL_CH = 80;
export const LABEL_WORLD_W = 2.1;
export const LABEL_WORLD_H = (LABEL_WORLD_W * LABEL_CH) / LABEL_CW;
const LABEL_FONT = 40;
const LABEL_PAD = 22;
export const LABEL_DV = 0.038; // etiket merkezi, daire merkezinin bu kadar (doku uzayı) altındadır

export const labelName = (s, id) => (isOpen(s, id) ? locName(s, id) : 'Henüz yok');

// Şerit genişliği (canvas px); ölçüm yoksa karakter başına kaba tahmin
export function labelStripWidth(text, measure = (t) => t.length * LABEL_FONT * 0.47) {
  const w = measure(text) + LABEL_PAD * 2;
  return Math.min(LABEL_CW - 4, w);
}

// Doku uzayında etiket kutuları (çakışma/sınır testi ve düzlem yerleşimi için)
export function labelLayout(s, measure) {
  const wUV = (LABEL_WORLD_W * 100) / BOARD_W; // tüm doku genişliğine oranı
  return Object.keys(LOCATIONS).map((id) => {
    const m = LOC_UV[id];
    const name = labelName(s, id);
    const sw = labelStripWidth(name, measure) / LABEL_CW * wUV;
    const cx = m.a === 'l' ? m.u + 0.025 - sw / 2 : m.a === 'r' ? m.u - 0.025 + sw / 2 : m.u;
    const cy = m.v + LABEL_DV;
    const hh = ((LABEL_FONT + 10) / LABEL_CH) * (LABEL_WORLD_H * 100 / BOARD_W) / 2;
    return { id, name, open: isOpen(s, id), cx, cy, left: cx - sw / 2, right: cx + sw / 2, top: cy - hh, bottom: cy + hh };
  });
}

// Tek etiket dokusu: şerit, canvas içinde hizaya göre yerleşir (a: c/l/r; l = şerit sağa yaslı)
export function drawLabel(ctx, name, { open = true, a = 'c' } = {}) {
  ctx.clearRect(0, 0, LABEL_CW, LABEL_CH);
  ctx.font = `700 ${LABEL_FONT}px "Cormorant Garamond", Georgia, serif`;
  const sw = labelStripWidth(name, (t) => ctx.measureText?.(t)?.width ?? t.length * LABEL_FONT * 0.47);
  const x = a === 'l' ? LABEL_CW - sw - 2 : a === 'r' ? 2 : (LABEL_CW - sw) / 2;
  const y = (LABEL_CH - (LABEL_FONT + 10)) / 2, h = LABEL_FONT + 10;
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  if (open) { g.addColorStop(0, '#f4e8c8'); g.addColorStop(1, '#dcc99a'); } else { g.addColorStop(0, '#a29c8e'); g.addColorStop(1, '#847e72'); }
  ctx.fillStyle = 'rgba(0,0,0,.3)';
  ctx.fillRect(x + 2, y + 3, sw, h);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, sw, h);
  ctx.strokeStyle = open ? '#9c7a2e' : '#5e5a52'; ctx.lineWidth = 2.5;
  ctx.strokeRect(x + 1, y + 1, sw - 2, h - 2);
  ctx.strokeStyle = open ? 'rgba(201,164,58,.8)' : 'rgba(120,115,105,.6)'; ctx.lineWidth = 1;
  ctx.strokeRect(x + 5, y + 5, sw - 10, h - 10);
  ctx.fillStyle = open ? '#1a1208' : '#4a463f';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(name, x + sw / 2, y + h / 2 + 2, sw - LABEL_PAD);
}

// Ahşap masa: boyuna damarlı tahtalar, çiviler arası dikişler.
export function drawWoodTexture(ctx, w, h, seed = 11) {
  const rnd = mulberry(seed);
  const planks = 6;
  const ph = h / planks;
  for (let p = 0; p < planks; p++) {
    const base = 46 + rnd() * 16;
    const y0 = p * ph;
    for (let y = 0; y < ph; y += 1) {
      const wob = Math.sin(y * 0.35 + p) * 3 + (rnd() - 0.5) * 7;
      const l = base + wob;
      ctx.fillStyle = `rgb(${(l * 1.5) | 0},${(l * 0.95) | 0},${(l * 0.52) | 0})`;
      ctx.fillRect(0, y0 + y, w, 1);
    }
    for (let i = 0; i < 70; i++) {
      const y = y0 + rnd() * ph;
      ctx.strokeStyle = `rgba(20,8,0,${(0.06 + rnd() * 0.12).toFixed(2)})`;
      ctx.lineWidth = 0.6 + rnd() * 1.2;
      ctx.beginPath(); ctx.moveTo(0, y);
      const amp = 1 + rnd() * 3, f = 0.004 + rnd() * 0.01;
      for (let x = 0; x <= w; x += 32) ctx.lineTo(x, y + Math.sin(x * f + i) * amp);
      ctx.stroke();
    }
    if (rnd() > 0.4) {
      const kx = rnd() * w, ky = y0 + ph * (0.25 + rnd() * 0.5);
      for (let r = 3; r < 26; r += 3) {
        ctx.strokeStyle = `rgba(30,12,0,${(0.28 - r * 0.01).toFixed(2)})`; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.ellipse(kx, ky, r * 2.2, r * 0.7, 0, 0, Math.PI * 2); ctx.stroke();
      }
    }
    ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(0, y0, w, 2);
    ctx.fillStyle = 'rgba(255,200,140,.08)'; ctx.fillRect(0, y0 + 2, w, 1);
  }
}

// Masa üstüne yumuşak ışık havuzu / kenar karartması (şeffaf kaplama dokusu)
export function drawVignette(ctx, w, h) {
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.12, w / 2, h / 2, Math.max(w, h) * 0.58);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.55, 'rgba(4,6,12,.28)'); g.addColorStop(1, 'rgba(2,3,8,.82)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
}

// Parlama dokusu: yumuşak radyal beyaz (tılsım ışıltısı, halkalar)
export function drawGlow(ctx, w, h) {
  const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
}
