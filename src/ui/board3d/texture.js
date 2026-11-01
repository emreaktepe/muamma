// Prosedürel dokular (yeni görsel dosyası yok): boyalı harita tahtası, su maskesi ve ahşap masa.
// three'siz; yalnız 2D canvas bağlamı ister. Minyatür Noir paleti: lacivert, turkuaz, mercan, altın, parşömen.
import { LOCATIONS } from '../../game/data/locations.js';
import { edges, isOpen, locName, era } from '../../game/engine.js';
import { BOARD_W, BOARD_H, landmarkAnchor } from './model.js';

export const TEX_SCALE = 2.4; // 840x440 -> 2016x1056 (en çok 2048)
export const TEX_W = Math.round(BOARD_W * TEX_SCALE);
export const TEX_H = Math.round(BOARD_H * TEX_SCALE);
export const LABEL_PX = 20;

const C = { navy: '#14213D', navyD: '#0c1630', turq: '#1E8C93', turqL: '#4fd1d6', coral: '#B5332E', gold: '#C9A43A', goldL: '#e6c565', parch: '#EFE3C8', ink: '#1A1208' };
const TINT = { c532: 'rgba(120,60,130,.10)', c1580: 'rgba(30,140,147,.07)', c1933: 'rgba(160,120,40,.16)', bugun: 'rgba(138,155,168,.10)' };
const DENSITY = { c532: 0.3, c1580: 0.65, c1933: 0.95, bugun: 1 };

export function mulberry(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// ---- kıyı çizgisi: kaba çokgenler (eski 2D tahta ile aynı yer), ince bölünüp doğal biçimde oynatılır ----
const ROUGH = [
  [[0, 196], [300, 184], [360, 200], [432, 214], [500, 252], [512, 300], [470, 352], [398, 394], [300, 410], [170, 414], [0, 404]], // Tarihi Yarımada
  [[0, 0], [590, 0], [596, 30], [560, 90], [528, 160], [470, 178], [400, 168], [320, 166], [200, 170], [0, 174]],                 // Galata / Beyoğlu
  [[840, 0], [650, 0], [640, 60], [668, 140], [650, 220], [660, 300], [640, 380], [700, 440], [840, 440]],                          // Anadolu yakası
];
const onEdge = (p) => p[0] <= 0 || p[0] >= BOARD_W || p[1] <= 0 || p[1] >= BOARD_H;
const alongBorder = (a, b) => (a[0] === b[0] && (a[0] === 0 || a[0] === BOARD_W)) || (a[1] === b[1] && (a[1] === 0 || a[1] === BOARD_H));

function jitter(pts, seed) {
  const rnd = mulberry(seed);
  const out = [];
  pts.forEach((a, i) => {
    const b = pts[(i + 1) % pts.length];
    out.push(a);
    if (alongBorder(a, b)) return;
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n = Math.max(1, Math.round(len / 24));
    const nx = -(b[1] - a[1]) / len, ny = (b[0] - a[0]) / len;
    for (let k = 1; k < n; k++) {
      const t = k / n;
      const j = (rnd() - 0.5) * 6 + Math.sin(t * Math.PI * 2 + i * 1.7) * 2.2;
      out.push([a[0] + (b[0] - a[0]) * t + nx * j, a[1] + (b[1] - a[1]) * t + ny * j]);
    }
  });
  return out;
}
function blob(cx, cy, rx, ry, seed, n = 14) {
  const rnd = mulberry(seed);
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const r = 0.82 + rnd() * 0.3;
    return [cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r];
  });
}

// Her şekil: çokgen + bayraklar. big: ana kara, rock: Kız Kulesi kayalığı, islet: süs adaları
export const SHAPES = [
  ...ROUGH.map((p, i) => ({ pts: jitter(p, 31 + i * 7), big: true })),
  { pts: blob(612, 299, 23, 16, 5), rock: true },
  { pts: blob(516, 406, 8, 5, 8, 9), islet: true }, { pts: blob(531, 412, 5, 3.6, 9, 8), islet: true }, { pts: blob(506, 414, 3.6, 2.6, 10, 7), islet: true },
];

function tracePath(ctx, pts) {
  const n = pts.length;
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const s = mid(pts[n - 1], pts[0]);
  ctx.beginPath();
  ctx.moveTo(s[0], s[1]);
  for (let i = 0; i < n; i++) {
    const p = pts[i], m = mid(p, pts[(i + 1) % n]);
    if (onEdge(p)) { ctx.lineTo(p[0], p[1]); ctx.lineTo(m[0], m[1]); } else ctx.quadraticCurveTo(p[0], p[1], m[0], m[1]);
  }
  ctx.closePath();
}

function inPoly(x, y, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
export const isLand = (x, y) => SHAPES.some((s) => inPoly(x, y, s.pts));

// Su maskesi (shader için): kırmızı kanal = deniz. three'siz.
export function drawWaterMask(ctx, w, h) {
  ctx.save();
  ctx.scale(w / BOARD_W, h / BOARD_H);
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, BOARD_W, BOARD_H);
  ctx.fillStyle = '#000';
  for (const sh of SHAPES) { tracePath(ctx, sh.pts); ctx.fill(); }
  ctx.restore();
}

// ---- etiket yerleşimi (çizim ve test ortak) ----
// 20 px etiketlerde çakışan mekânlar için 3B tahtaya özgü yerleşim ([dx, dy, çapa]); 2D tahta etkilenmez
const LABEL_OVR = { sirkeci: [12, -22, 'start'], yerebatan: [-14, -20, 'end'], ayasofya: [14, 30, 'start'], yenikapi: [-22, 24, 'middle'] };
export function labelLayout(s, measure = (t, px) => t.length * px * 0.44) {
  const out = [];
  for (const [lid, L] of Object.entries(LOCATIONS)) {
    const open = isOpen(s, lid);
    const name = open ? locName(s, lid) : 'Henüz yok';
    const [dx0, dy0, anc] = LABEL_OVR[lid] || L.label;
    const w = measure(name, LABEL_PX);
    let x = L.x + dx0;
    const y = L.y + dy0;
    let left = anc === 'middle' ? x - w / 2 : anc === 'end' ? x - w : x;
    const clamped = Math.min(BOARD_W - 20 - w, Math.max(20, left));
    x += clamped - left; left = clamped;
    out.push({ id: lid, name, open, x, y, anc, w, left, right: left + w, top: y - LABEL_PX * 0.8, bottom: y + LABEL_PX * 0.25, island: !!L.island });
  }
  return out;
}

// ---- yardımcı çizimler ----
function mid(A, B, kind) {
  const c = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 - (kind === 'rail' ? -24 : 16) };
  return { c, p: { x: 0.25 * A.x + 0.5 * c.x + 0.25 * B.x, y: 0.25 * A.y + 0.5 * c.y + 0.25 * B.y } };
}

function drawBorder(ctx) {
  const m = 13;
  ctx.save();
  ctx.fillStyle = C.navyD;
  ctx.fillRect(0, 0, BOARD_W, m); ctx.fillRect(0, BOARD_H - m, BOARD_W, m); ctx.fillRect(0, 0, m, BOARD_H); ctx.fillRect(BOARD_W - m, 0, m, BOARD_H);
  ctx.strokeStyle = C.gold; ctx.lineWidth = 1.4;
  ctx.strokeRect(m, m, BOARD_W - 2 * m, BOARD_H - 2 * m);
  ctx.strokeStyle = 'rgba(201,164,58,.6)'; ctx.lineWidth = 0.8;
  ctx.strokeRect(m - 4.5, m - 4.5, BOARD_W - 2 * m + 9, BOARD_H - 2 * m + 9);
  ctx.fillStyle = C.gold;
  for (let x = 40; x < BOARD_W - 30; x += 28) for (const y of [m / 2, BOARD_H - m / 2]) { ctx.beginPath(); ctx.moveTo(x, y - 2.6); ctx.lineTo(x + 2.6, y); ctx.lineTo(x, y + 2.6); ctx.lineTo(x - 2.6, y); ctx.fill(); }
  for (let y = 40; y < BOARD_H - 30; y += 28) for (const x of [m / 2, BOARD_W - m / 2]) { ctx.beginPath(); ctx.moveTo(x, y - 2.6); ctx.lineTo(x + 2.6, y); ctx.lineTo(x, y + 2.6); ctx.lineTo(x - 2.6, y); ctx.fill(); }
  // köşe lale/yıldız süsleri
  for (const [cx, cy] of [[m, m], [BOARD_W - m, m], [m, BOARD_H - m], [BOARD_W - m, BOARD_H - m]]) {
    ctx.fillStyle = C.navyD; ctx.beginPath(); ctx.arc(cx, cy, 11, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = C.gold; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.fillStyle = C.coral;
    for (let i = 0; i < 4; i++) { const a = (i * Math.PI) / 2; ctx.beginPath(); ctx.ellipse(cx + Math.cos(a) * 4.2, cy + Math.sin(a) * 4.2, 3.4, 1.8, a, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = C.turq; ctx.beginPath(); ctx.arc(cx, cy, 2, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawCompass(ctx, x, y, r) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = 'rgba(230,197,101,.7)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, r * 0.72, 0, Math.PI * 2); ctx.stroke();
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 - Math.PI / 2, long = i % 2 === 0;
    const R = long ? r * 1.15 : r * 0.72, w = long ? 0.2 : 0.15;
    ctx.fillStyle = long ? (i === 0 ? C.coral : C.goldL) : C.turqL;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * R, Math.sin(a) * R);
    ctx.lineTo(Math.cos(a + Math.PI / 2) * r * w, Math.sin(a + Math.PI / 2) * r * w);
    ctx.lineTo(0, 0);
    ctx.lineTo(Math.cos(a - Math.PI / 2) * r * w, Math.sin(a - Math.PI / 2) * r * w);
    ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = C.goldL; ctx.font = '700 9px Cinzel, Georgia, serif'; ctx.textAlign = 'center';
  ctx.fillText('K', 0, -r * 1.15 - 2);
  ctx.restore();
}

function drawHouse(ctx, x, y, col, s = 1) {
  ctx.fillStyle = 'rgba(40,25,10,.25)'; ctx.fillRect(x + 1, y + 1.4 * s, 4.2 * s, 2.6 * s);
  ctx.fillStyle = '#e6d5a8'; ctx.fillRect(x, y + 1.2 * s, 4 * s, 2.4 * s);
  ctx.fillStyle = col; ctx.fillRect(x - 0.4, y, 4.8 * s, 1.5 * s);
}

export function drawBoardTexture(ctx, s, scale = TEX_SCALE) {
  const id = era(s).id;
  ctx.save();
  ctx.scale(scale, scale);
  const rnd = mulberry(7);

  // 1) deniz: derin lacivert, boyalı lekeler, kazıma dalga işaretleri
  const sea = ctx.createLinearGradient(0, 0, BOARD_W, BOARD_H);
  sea.addColorStop(0, '#2a4a82'); sea.addColorStop(0.5, '#21407a'); sea.addColorStop(1, '#183368');
  ctx.fillStyle = sea;
  ctx.fillRect(0, 0, BOARD_W, BOARD_H);
  for (let i = 0; i < 26; i++) {
    const x = rnd() * BOARD_W, y = rnd() * BOARD_H, r = 40 + rnd() * 90;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const tint = rnd() > 0.5 ? '40,170,176' : '12,24,60';
    g.addColorStop(0, `rgba(${tint},.22)`); g.addColorStop(1, `rgba(${tint},0)`);
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.strokeStyle = 'rgba(150,190,235,.3)'; ctx.lineWidth = 1.2;
  for (let y = 4; y < BOARD_H + 26; y += 22) {
    for (let x = (y / 22) % 2 ? 4 : -18; x < BOARD_W; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, y + 11); ctx.quadraticCurveTo(x + 5, y + 6, x + 10, y + 11); ctx.quadraticCurveTo(x + 15, y + 16, x + 20, y + 11); ctx.stroke();
    }
  }
  // 2) sığ su: kıyıya yakın turkuaz halkalar
  ctx.lineJoin = 'round';
  for (const [w, a] of [[40, 0.06], [26, 0.09], [15, 0.12], [7, 0.16]]) {
    ctx.strokeStyle = `rgba(52,178,184,${a})`; ctx.lineWidth = w;
    for (const sh of SHAPES) { tracePath(ctx, sh.pts); ctx.stroke(); }
  }

  // 3) kara: parşömen, gölge, leke, kıyı çizgisi
  for (const sh of SHAPES) {
    tracePath(ctx, sh.pts);
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 2.5;
    ctx.fillStyle = '#dcc89a'; ctx.fill();
    ctx.restore();
    ctx.save();
    tracePath(ctx, sh.pts); ctx.clip();
    const g = ctx.createRadialGradient(300, 260, 30, 300, 260, 620);
    g.addColorStop(0, 'rgba(255,240,200,.18)'); g.addColorStop(0.6, 'rgba(200,165,105,.2)'); g.addColorStop(1, 'rgba(130,95,45,.5)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, BOARD_W, BOARD_H);
    // yeşil bahçe/orman lekeleri
    for (const [gx, gy, gr, ga] of [[700, 90, 90, 0.34], [770, 360, 80, 0.3], [90, 80, 80, 0.3], [520, 60, 60, 0.26], [150, 330, 55, 0.22], [250, 130, 50, 0.2], [720, 200, 60, 0.25]]) {
      const gg = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr);
      gg.addColorStop(0, `rgba(104,138,84,${ga})`); gg.addColorStop(1, 'rgba(104,138,84,0)');
      ctx.fillStyle = gg; ctx.fillRect(gx - gr, gy - gr, gr * 2, gr * 2);
    }
    for (let i = 0; i < 700; i++) {
      ctx.fillStyle = `rgba(120,90,40,${(rnd() * 0.07).toFixed(3)})`;
      ctx.fillRect(rnd() * BOARD_W, rnd() * BOARD_H, 1 + rnd() * 5, 0.8 + rnd());
    }
    ctx.restore();
    tracePath(ctx, sh.pts);
    ctx.strokeStyle = '#8c7648'; ctx.lineWidth = 2.2; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,248,225,.55)'; ctx.lineWidth = 0.9; ctx.stroke();
  }

  // 4) mahalle: çatılar ve ağaçlar (mekânlardan uzak, kara üzerinde)
  const density = DENSITY[id] ?? 1;
  const farFromNodes = (x, y, d) => Object.values(LOCATIONS).every((L) => (L.x - x) ** 2 + (L.y - y) ** 2 > d * d);
  const roofs = ['#b5443a', '#a8553a', '#b9794e', '#3a7f86'];
  for (let i = 0; i < 420; i++) {
    const x = 14 + rnd() * (BOARD_W - 28), y = 14 + rnd() * (BOARD_H - 28), keep = rnd(), rc = roofs[(rnd() * roofs.length) | 0], sz = 1.5 + rnd() * 0.7;
    if (keep > density || !isLand(x, y) || !isLand(x + 5, y + 4) || !farFromNodes(x, y, 30)) continue;
    drawHouse(ctx, x, y, rc, sz);
  }
  for (let i = 0; i < 240; i++) {
    const x = 14 + rnd() * (BOARD_W - 28), y = 14 + rnd() * (BOARD_H - 28), keep = rnd(), cyp = rnd() > 0.55;
    if (keep > 1.15 - density * 0.5 || !isLand(x, y) || !isLand(x, y + 4) || !farFromNodes(x, y, 24)) continue;
    ctx.fillStyle = 'rgba(30,50,38,.28)'; ctx.beginPath(); ctx.ellipse(x + 1, y + 3, 2.6, 1, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = cyp ? '#2f5a43' : '#4c7a50';
    if (cyp) { ctx.beginPath(); ctx.ellipse(x, y, 1.2, 4.2, 0, 0, Math.PI * 2); ctx.fill(); } else { ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = 'rgba(190,220,140,.35)'; ctx.beginPath(); ctx.arc(x - 0.7, y - 0.8, 1.2, 0, Math.PI * 2); ctx.fill(); }
  }
  // kara surları: batı kenarında kuleli sur çizgisi
  ctx.strokeStyle = 'rgba(70,52,30,.7)'; ctx.lineWidth = 3.4; ctx.lineCap = 'butt';
  ctx.beginPath(); ctx.moveTo(40, 206); ctx.bezierCurveTo(52, 260, 40, 320, 48, 408); ctx.stroke();
  ctx.strokeStyle = '#cdb98c'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = '#8c7648';
  for (let t = 0; t <= 1; t += 0.1) { const yy = 212 + t * 190; ctx.fillRect(40 + Math.sin(t * 5) * 5 - 2.4, yy - 2.4, 4.8, 4.8); }

  ctx.fillStyle = TINT[id] || 'rgba(0,0,0,0)';
  ctx.fillRect(0, 0, BOARD_W, BOARD_H);

  // 5) su adları (açık turkuaz, harf aralıklı)
  ctx.font = '700 13px Cinzel, Georgia, serif';
  ctx.fillStyle = 'rgba(160,226,224,.85)';
  ctx.textAlign = 'center';
  for (const [x, y, t, r] of [[150, 186, 'HALİÇ', 0], [600, 150, 'BOĞAZ', -78], [596, 414, 'MARMARA', 0]]) {
    ctx.save(); ctx.translate(x, y); ctx.rotate((r * Math.PI) / 180);
    if (ctx.letterSpacing !== undefined) ctx.letterSpacing = '5px';
    ctx.fillText(t, 0, 0); ctx.restore();
  }
  drawCompass(ctx, 520, 376, 17);

  // 6) yollar: kara = patika (çift çizgi), deniz = turkuaz kesik hat + vapur, ray = tramvay traverslerli
  const list = edges(s);
  ctx.lineCap = 'round';
  for (const e of list) {
    const A = LOCATIONS[e.a], B = LOCATIONS[e.b];
    ctx.beginPath();
    if (e.kind === 'land') {
      ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y);
      ctx.setLineDash([]); ctx.strokeStyle = 'rgba(90,64,28,.5)'; ctx.lineWidth = 5.4; ctx.stroke();
      ctx.strokeStyle = '#ecd9a6'; ctx.lineWidth = 3.4; ctx.stroke();
      ctx.setLineDash([1.2, 5]); ctx.strokeStyle = '#7a5a2a'; ctx.lineWidth = 1.5; ctx.stroke();
    } else {
      const { c } = mid(A, B, e.kind);
      ctx.moveTo(A.x, A.y); ctx.quadraticCurveTo(c.x, c.y, B.x, B.y);
      if (e.kind === 'rail') {
        ctx.setLineDash([]); ctx.strokeStyle = 'rgba(20,12,4,.65)'; ctx.lineWidth = 5.6; ctx.stroke();
        ctx.setLineDash([1.6, 3.4]); ctx.strokeStyle = '#efe3c8'; ctx.lineWidth = 5.6; ctx.stroke();
        ctx.setLineDash([]); ctx.strokeStyle = C.goldL; ctx.lineWidth = 1.6; ctx.stroke();
      } else {
        ctx.setLineDash([]); ctx.strokeStyle = 'rgba(79,209,214,.18)'; ctx.lineWidth = 8; ctx.stroke();
        ctx.setLineDash([8, 6]); ctx.strokeStyle = '#6fe0e4'; ctx.lineWidth = 2.6; ctx.stroke();
      }
    }
  }
  ctx.setLineDash([]);
  for (const e of list) { // yol simgeleri (orta nokta)
    if (e.kind === 'land') continue;
    const { p } = mid(LOCATIONS[e.a], LOCATIONS[e.b], e.kind);
    ctx.save(); ctx.translate(p.x, p.y);
    ctx.fillStyle = C.navyD; ctx.beginPath(); ctx.arc(0, 0, 6.6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = e.kind === 'rail' ? C.goldL : C.turqL; ctx.lineWidth = 1.3; ctx.stroke();
    if (e.kind === 'rail') { ctx.fillStyle = C.goldL; ctx.fillRect(-3.4, -2.6, 6.8, 4.4); ctx.fillStyle = C.navyD; ctx.fillRect(-2.4, -1.6, 1.8, 1.6); ctx.fillRect(0.6, -1.6, 1.8, 1.6); ctx.fillRect(-3.4, 2.4, 6.8, 0.8); }
    else { ctx.fillStyle = C.turqL; ctx.beginPath(); ctx.moveTo(-4, 0.4); ctx.lineTo(4, 0.4); ctx.lineTo(2.2, 3); ctx.lineTo(-2.2, 3); ctx.closePath(); ctx.fill(); ctx.fillRect(-0.4, -3.6, 0.8, 4); ctx.beginPath(); ctx.moveTo(0.8, -3.4); ctx.lineTo(3.2, -0.4); ctx.lineTo(0.8, -0.4); ctx.fill(); }
    ctx.restore();
  }

  // 7) mekânlar: simgesel yapının oturduğu kaide + altın halkalı düğüm
  for (const [lid, L] of Object.entries(LOCATIONS)) {
    if (!isOpen(s, lid)) continue;
    const a = landmarkAnchor(lid);
    const pad = ctx.createRadialGradient(a.x, a.y + 2, 1, a.x, a.y + 2, 20);
    pad.addColorStop(0, 'rgba(60,40,15,.38)'); pad.addColorStop(1, 'rgba(60,40,15,0)');
    ctx.fillStyle = pad; ctx.fillRect(a.x - 22, a.y - 18, 44, 40);
    void L;
  }
  for (const [lid, L] of Object.entries(LOCATIONS)) {
    const open = isOpen(s, lid);
    ctx.beginPath(); ctx.arc(L.x, L.y, 13, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fill();
    ctx.beginPath(); ctx.arc(L.x, L.y, 12, 0, Math.PI * 2);
    ctx.fillStyle = open ? C.parch : '#9b9488'; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = open ? C.gold : '#6b665e';
    ctx.setLineDash(open ? [] : [3, 3]); ctx.stroke(); ctx.setLineDash([]);
    if (open) { ctx.lineWidth = 0.9; ctx.strokeStyle = 'rgba(120,80,20,.6)'; ctx.beginPath(); ctx.arc(L.x, L.y, 9, 0, Math.PI * 2); ctx.stroke(); }
    if (L.tilsim && open) {
      ctx.beginPath(); ctx.arc(L.x, L.y, 7.5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(80,60,30,.35)'; ctx.fill();
    }
  }

  // 8) etiketler: kalın parşömen/lacivert halo ile okunur
  ctx.font = `700 ${LABEL_PX}px "Cormorant Garamond", Georgia, serif`;
  ctx.lineJoin = 'round';
  const items = labelLayout(s, (t) => ctx.measureText?.(t)?.width ?? t.length * LABEL_PX * 0.5);
  for (const it of items) {
    ctx.textAlign = 'left';
    ctx.lineWidth = 6.5;
    ctx.strokeStyle = it.island ? 'rgba(12,22,48,.95)' : 'rgba(244,234,208,.96)';
    ctx.fillStyle = !it.open ? '#7d776b' : it.island ? C.parch : C.ink;
    ctx.strokeText(it.name, it.left, it.y);
    ctx.fillText(it.name, it.left, it.y);
  }

  // 9) çağ künyesi (sol altta, denizin üzerinde) + çerçeve
  ctx.font = '400 11.5px Cinzel, Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(8,14,32,.82)'; ctx.fillRect(352, 408, 146, 15);
  ctx.strokeStyle = C.gold; ctx.lineWidth = 0.9; ctx.strokeRect(352, 408, 146, 15);
  ctx.fillStyle = C.goldL;
  ctx.fillText(`${era(s).perde} · ${era(s).year}`, 425, 419);
  drawBorder(ctx);
  ctx.restore();
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
