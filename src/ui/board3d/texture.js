// Prosedürel dokular (yeni görsel dosyası yok): tahta yüzeyi ve ahşap masa. three'siz; yalnız 2D canvas bağlamı ister.
import { LOCATIONS } from '../../game/data/locations.js';
import { edges, isOpen, locName, era } from '../../game/engine.js';
import { BOARD_W, BOARD_H } from './model.js';

export const TEX_SCALE = 2;
export const TEX_W = BOARD_W * TEX_SCALE;
export const TEX_H = BOARD_H * TEX_SCALE;

const C = { navy: '#14213D', turq: '#1E8C93', coral: '#B5332E', gold: '#C9A43A', parch: '#EFE3C8', ink: '#1A1A1A' };
// Çağa göre kâğıt/deniz tonu (çok hafif; ışık rengi sahnede ayrıca değişir)
const TINT = { c532: 'rgba(120,60,130,.10)', c1580: 'rgba(30,140,147,.08)', c1933: 'rgba(160,120,40,.16)', bugun: 'rgba(138,155,168,.10)' };

const LAND = [
  'M0 196 L300 184 L360 200 L432 214 L500 252 L512 300 L470 352 L398 394 L300 410 L170 414 L0 404 Z',
  'M0 0 L590 0 L596 30 L560 90 L528 160 L470 178 L400 168 L320 166 L200 170 L0 174 Z',
  'M840 0 L650 0 L640 60 L668 140 L650 220 L660 300 L640 380 L700 440 L840 440 Z',
];

function mulberry(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export function drawBoardTexture(ctx, s) {
  const id = era(s).id;
  ctx.save();
  ctx.scale(TEX_SCALE, TEX_SCALE);
  // deniz
  const sea = ctx.createLinearGradient(0, 0, BOARD_W, BOARD_H);
  sea.addColorStop(0, '#1a2d52'); sea.addColorStop(1, '#101c38');
  ctx.fillStyle = sea;
  ctx.fillRect(0, 0, BOARD_W, BOARD_H);
  ctx.strokeStyle = 'rgba(80,110,170,.35)';
  ctx.lineWidth = 1.3;
  for (let y = 4; y < BOARD_H + 26; y += 26) {
    for (let x = (y / 26) % 2 ? 4 : -18; x < BOARD_W; x += 44) {
      ctx.beginPath(); ctx.moveTo(x, y + 13); ctx.quadraticCurveTo(x + 6, y + 8, x + 12, y + 13); ctx.quadraticCurveTo(x + 18, y + 18, x + 24, y + 13); ctx.stroke();
    }
  }
  // kara: kâğıt dokusu + kıyı gölgesi
  const rnd = mulberry(7);
  for (const d of LAND) {
    const p = new Path2D(d);
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 3;
    ctx.fillStyle = C.parch; ctx.fill(p);
    ctx.restore();
    ctx.save();
    ctx.clip(p);
    const g = ctx.createRadialGradient(300, 250, 40, 300, 250, 600);
    g.addColorStop(0, 'rgba(255,248,225,.35)'); g.addColorStop(1, 'rgba(150,120,70,.28)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, BOARD_W, BOARD_H);
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = `rgba(120,90,40,${(rnd() * 0.06).toFixed(3)})`;
      ctx.fillRect(rnd() * BOARD_W, rnd() * BOARD_H, 1 + rnd() * 5, 1 + rnd());
    }
    ctx.restore();
    ctx.strokeStyle = '#B9A57A'; ctx.lineWidth = 2; ctx.stroke(p);
  }
  ctx.fillStyle = TINT[id] || 'rgba(0,0,0,0)';
  ctx.fillRect(0, 0, BOARD_W, BOARD_H);
  // su adları
  ctx.font = '700 12px Cinzel, Georgia, serif';
  ctx.fillStyle = '#2aa0a8';
  ctx.textAlign = 'center';
  for (const [x, y, t, r] of [[150, 186, 'HALİÇ', 0], [612, 160, 'BOĞAZ', -78], [560, 424, 'MARMARA', 0]]) {
    ctx.save(); ctx.translate(x, y); ctx.rotate((r * Math.PI) / 180);
    if (ctx.letterSpacing !== undefined) ctx.letterSpacing = '4px';
    ctx.fillText(t, 0, 0); ctx.restore();
  }
  // yollar
  for (const e of edges(s)) {
    const A = LOCATIONS[e.a], B = LOCATIONS[e.b];
    ctx.beginPath(); ctx.lineCap = 'round';
    if (e.kind === 'land') {
      ctx.setLineDash([2, 6]); ctx.strokeStyle = '#7a6440'; ctx.lineWidth = 2.4;
      ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y);
    } else {
      const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2 - (e.kind === 'rail' ? -24 : 16);
      ctx.setLineDash(e.kind === 'rail' ? [10, 4] : [7, 5]);
      ctx.strokeStyle = e.kind === 'rail' ? '#e0aa48' : '#38b0b8'; ctx.lineWidth = 2.4;
      ctx.moveTo(A.x, A.y); ctx.quadraticCurveTo(mx, my, B.x, B.y);
    }
    ctx.stroke();
  }
  ctx.setLineDash([]);
  // mekânlar
  for (const [lid, L] of Object.entries(LOCATIONS)) {
    const open = isOpen(s, lid);
    ctx.beginPath(); ctx.arc(L.x, L.y, 12, 0, Math.PI * 2);
    ctx.fillStyle = open ? C.parch : '#9b9488'; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = open ? C.gold : '#6b665e';
    ctx.setLineDash(open ? [] : [3, 3]); ctx.stroke(); ctx.setLineDash([]);
    if (L.tilsim && open) { // tılsım yuvası: 3B yıldız bunun üstüne oturur
      ctx.beginPath(); ctx.arc(L.x, L.y, 7.5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(80,60,30,.35)'; ctx.fill();
    }
  }
  // etiketler (en üstte)
  ctx.font = '700 17px "Cormorant Garamond", Georgia, serif';
  ctx.lineJoin = 'round'; ctx.lineWidth = 4.5;
  for (const [lid, L] of Object.entries(LOCATIONS)) {
    const open = isOpen(s, lid);
    const [dx, dy, anc] = L.label;
    ctx.textAlign = anc === 'middle' ? 'center' : anc === 'end' ? 'right' : 'left';
    const name = open ? locName(s, lid) : 'Henüz yok';
    ctx.strokeStyle = L.island ? C.navy : C.parch;
    ctx.fillStyle = !open ? '#8b8478' : L.island ? C.parch : C.ink;
    ctx.strokeText(name, L.x + dx, L.y + dy);
    ctx.fillText(name, L.x + dx, L.y + dy);
  }
  ctx.fillStyle = C.gold;
  ctx.font = '400 14px Cinzel, Georgia, serif';
  ctx.textAlign = 'right';
  ctx.fillText(`${era(s).perde} · ${era(s).year}`, 828, 20);
  ctx.restore();
}

// Ahşap masa: boyuna damarlı tahtalar, çiviler arası dikişler.
export function drawWoodTexture(ctx, w, h, seed = 11) {
  const rnd = mulberry(seed);
  const planks = 6;
  const ph = h / planks;
  for (let p = 0; p < planks; p++) {
    const base = 52 + rnd() * 16;
    const y0 = p * ph;
    for (let y = 0; y < ph; y += 1) {
      const wob = Math.sin(y * 0.35 + p) * 3 + (rnd() - 0.5) * 7;
      const l = base + wob;
      ctx.fillStyle = `rgb(${(l * 1.55) | 0},${(l * 0.98) | 0},${(l * 0.52) | 0})`;
      ctx.fillRect(0, y0 + y, w, 1);
    }
    // damarlar
    for (let i = 0; i < 70; i++) {
      const y = y0 + rnd() * ph;
      ctx.strokeStyle = `rgba(20,8,0,${(0.06 + rnd() * 0.12).toFixed(2)})`;
      ctx.lineWidth = 0.6 + rnd() * 1.2;
      ctx.beginPath(); ctx.moveTo(0, y);
      const amp = 1 + rnd() * 3, f = 0.004 + rnd() * 0.01;
      for (let x = 0; x <= w; x += 32) ctx.lineTo(x, y + Math.sin(x * f + i) * amp);
      ctx.stroke();
    }
    // budak
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
