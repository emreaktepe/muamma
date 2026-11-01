// Açılış (title) ekranı: sisli İstanbul silueti, paralaks katmanlar, usturlap halkası, logo ve ana düğmeler.
// Görseller CSS/SVG ile üretilir; yalnızca mevcut logo_c.webp kullanılır. Stil: ./landing.css
import './landing.css';

const R = (n) => Math.round(n * 10) / 10;
const B = 300; // silüet taban çizgisi (viewBox yüksekliği)

// ---- silüet parçaları (hepsi tek bir path d dizgesi döndürür) ----
const rect = (x, y, w, h) => `M${R(x)} ${R(y)}h${R(w)}v${R(h)}h${R(-w)}z`;
function minaret(x, h, w = 5) {
  const top = B - h;
  return rect(x - w / 2, top, w, h)                       // gövde
    + rect(x - w * 1.25, top + h * 0.2, w * 2.5, 3.5)     // şerefe
    + `M${R(x - w * 0.9)} ${R(top)}L${R(x)} ${R(top - h * 0.3)}L${R(x + w * 0.9)} ${R(top)}z` // külah
    + rect(x - 0.6, top - h * 0.3 - 9, 1.2, 9);            // alem
}
function dome(cx, r, base, spire = true) {
  return `M${R(cx - r)} ${R(base)}A${R(r)} ${R(r)} 0 0 1 ${R(cx + r)} ${R(base)}z`
    + (spire ? rect(cx - 0.8, base - r - 10, 1.6, 10) : '');
}
function galata(x) {
  return rect(x - 16, 165, 32, 135) + rect(x - 21, 156, 42, 10) + rect(x - 18, 140, 36, 16)
    + `M${R(x - 21)} 140L${R(x)} 104L${R(x + 21)} 140z` + rect(x - 0.8, 90, 1.6, 15);
}
function cypress(x, h, w = 9) {
  return `M${R(x)} ${R(B - h)}C${R(x + w)} ${R(B - h * 0.55)} ${R(x + w)} ${R(B - 12)} ${R(x + 2)} ${B}H${R(x - 2)}C${R(x - w)} ${R(B - 12)} ${R(x - w)} ${R(B - h * 0.55)} ${R(x)} ${R(B - h)}z`;
}
function roofs(from, to, seed, hMin, hMax) {
  let d = '';
  let s = seed;
  for (let x = from; x < to;) {
    s = (s * 9301 + 49297) % 233280;
    const w = 18 + (s % 26);
    const h = hMin + ((s >> 3) % (hMax - hMin));
    d += rect(x, B - h, w, h);
    if (s % 5 === 0) d += `M${R(x - 2)} ${R(B - h)}L${R(x + w / 2)} ${R(B - h - 9)}L${R(x + w + 2)} ${R(B - h)}z`;
    x += w + (s % 3);
  }
  return d;
}
function ayasofya(cx) {
  return rect(cx - 150, B - 62, 300, 62)
    + dome(cx, 66, B - 78) + rect(cx - 66, B - 78, 132, 16)
    + dome(cx - 98, 40, B - 62, false) + dome(cx + 98, 40, B - 62, false)
    + dome(cx - 52, 26, B - 62, false) + dome(cx + 52, 26, B - 62, false)
    + rect(cx - 160, B - 90, 14, 90) + rect(cx + 146, B - 90, 14, 90)       // payandalar
    + minaret(cx - 178, 190, 6) + minaret(cx + 178, 200, 6)
    + minaret(cx - 205, 150, 5) + minaret(cx + 205, 156, 5);
}
function suleymaniye(cx) {
  return rect(cx - 120, B - 52, 240, 52) + dome(cx, 54, B - 66) + rect(cx - 54, B - 66, 108, 14)
    + dome(cx - 78, 28, B - 52, false) + dome(cx + 78, 28, B - 52, false)
    + minaret(cx - 140, 170, 5) + minaret(cx + 140, 170, 5) + minaret(cx - 158, 120, 4) + minaret(cx + 158, 120, 4);
}
function ship(x) {
  return `M${x} ${B}l8 -10h70l12 10z` + rect(x + 28, B - 24, 22, 14) + rect(x + 36, B - 36, 5, 12) + rect(x + 56, B - 18, 12, 8);
}
// Katmanlar: uzak (sisli), orta (anıtlar), yakın (çatılar, selvi, gemi)
const FAR = suleymaniye(330) + suleymaniye(1280) + roofs(0, 1600, 11, 20, 62) + minaret(120, 130, 4) + minaret(640, 150, 4) + minaret(980, 140, 4) + minaret(1480, 125, 4) + dome(760, 30, B - 44, false);
const MID = galata(250) + ayasofya(1250) + roofs(0, 200, 5, 28, 60) + roofs(300, 1000, 7, 26, 74) + roofs(1500, 1600, 3, 30, 70) + minaret(560, 140, 5) + minaret(900, 150, 5);
const NEAR = roofs(0, 1600, 29, 12, 40) + cypress(60, 110) + cypress(86, 80) + cypress(560, 100) + cypress(1000, 95) + cypress(1310, 120) + cypress(1340, 84) + cypress(1540, 105) + ship(380) + ship(1150);

// Pencere ışıkları (deterministik)
function lights() {
  let s = 7; let out = '';
  for (let i = 0; i < 46; i++) {
    s = (s * 9301 + 49297) % 233280;
    const x = (s % 1580) + 10; const y = B - 8 - ((s >> 4) % 52);
    out += `<circle cx="${x}" cy="${y}" r="${1 + (s % 2) * 0.5}" class="lt" style="animation-delay:${(s % 50) / 10}s"/>`;
  }
  return out;
}

// Yıldızlar: tek bir elemanın box-shadow listesi
function stars(n, seed) {
  let s = seed; const out = [];
  for (let i = 0; i < n; i++) {
    s = (s * 9301 + 49297) % 233280; const x = (s % 1000) / 10;
    s = (s * 9301 + 49297) % 233280; const y = (s % 800) / 10;
    out.push(`${x}vw ${y}vh 0 ${(s % 3) * 0.25}px rgba(255,236,190,${0.45 + (s % 5) / 10})`);
  }
  return out.join(',');
}

// Usturlap halkası: ince altın daireler, 7 tılsım düğümü, derece çizgileri
function astrolabe() {
  let ticks = ''; let nodes = '';
  for (let i = 0; i < 72; i++) {
    const a = (i * 5 * Math.PI) / 180; const long = i % 6 === 0;
    const r1 = 196; const r2 = long ? 183 : 190;
    ticks += `M${R(200 + Math.sin(a) * r1)} ${R(200 - Math.cos(a) * r1)}L${R(200 + Math.sin(a) * r2)} ${R(200 - Math.cos(a) * r2)}`;
  }
  for (let i = 0; i < 7; i++) {
    const a = (i * 2 * Math.PI) / 7; const x = R(200 + Math.sin(a) * 168); const y = R(200 - Math.cos(a) * 168);
    nodes += `<path class="node" d="M${x} ${y - 7}L${R(x + 2)} ${y - 2}L${x + 7} ${y}L${R(x + 2)} ${y + 2}L${x} ${y + 7}L${R(x - 2)} ${y + 2}L${x - 7} ${y}L${R(x - 2)} ${y - 2}z"/>`;
  }
  return `<svg class="astro" viewBox="0 0 400 400" aria-hidden="true" focusable="false">
    <g class="ring a"><circle cx="200" cy="200" r="198"/><path d="${ticks}"/><circle cx="200" cy="200" r="180" class="thin"/></g>
    <g class="ring b"><circle cx="200" cy="200" r="150" class="thin dash"/>${nodes}
      <path class="thin" d="M200 52V348M52 200H348M95 95L305 305M305 95L95 305"/></g>
  </svg>`;
}

const sky = (inner, cls) => `<svg class="sil ${cls}" viewBox="0 0 1600 ${B}" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">${inner}</svg>`;

export function landingView(saved, canInstall = !!window.MUAMMA_canInstall?.()) {
  const canResume = !!(saved && !saved.winner);
  return `<main class="land" id="land">
    <div class="l-sky"></div>
    <div class="l-stars" style="box-shadow:${stars(46, 3)}"></div>
    <div class="l-stars b" style="box-shadow:${stars(34, 17)}"></div>
    <div class="l-moon" aria-hidden="true"></div>
    <div class="l-layer d1"><svg class="sil far" viewBox="0 0 1600 ${B}" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false"><path d="${FAR}"/></svg></div>
    <div class="l-fog f1"></div>
    <div class="l-layer d2">${sky(`<path d="${MID}"/>${lights()}`, 'mid')}</div>
    <div class="l-fog f2"></div>
    <div class="l-layer d3">${sky(`<path d="${NEAR}"/>`, 'near')}</div>
    <div class="l-water" aria-hidden="true"><i></i><i></i><i></i></div>
    <div class="l-vignette"></div>
    <div class="l-content">
      <div class="l-emblem">${astrolabe()}<img class="l-logo" src="assets/logo_c.webp" alt="MUAMMA" width="900" height="900" decoding="async" fetchpriority="high"></div>
      <h1 class="l-title">İstanbul'un Yedi Tılsımı</h1>
      <p class="l-tag">Dört çağ, dört cinayet ve aranızda gizlenen bir Gölge.</p>
      <nav class="l-menu" aria-label="Ana menü">
        <button class="l-btn primary" data-act="land-start">Oyuna Başla</button>
        ${canResume ? '<button class="l-btn" data-act="resume">Devam Et</button>' : ''}
        <div class="l-row">
          <button class="l-btn ghost" data-act="help">Kurallar</button>
          ${canInstall ? '<button class="l-btn ghost" data-act="install">Uygulamayı yükle</button>' : ''}
        </div>
      </nav>
      <p class="l-foot">Dijital prototip v0.1</p>
    </div>
  </main>`;
}

// ---- etkileşim (tek seferlik, modül yüklenince) ----
if (typeof document !== 'undefined') {
  // İlk kullanıcı etkileşiminde müzik (ses modülü varsa) başlasın; yoksa sessizce geç.
  const kick = () => { try { window.MUAMMA_audio?.start?.(); } catch { /* ses yoksa sorun değil */ } };
  document.addEventListener('pointerdown', kick, { once: true });
  document.addEventListener('keydown', kick, { once: true });

  // Paralaks: işaretçi konumu -1..1 olarak CSS değişkenlerine yazılır.
  const off = () => document.documentElement.dataset.anim === 'kapali'; // kullanıcı ya da sistem hareketi azalt (anim.js)
  let raf = 0; let px = 0; let py = 0;
  document.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch' || off()) return;
    px = (e.clientX / window.innerWidth) * 2 - 1; py = (e.clientY / window.innerHeight) * 2 - 1;
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      const el = document.getElementById('land');
      if (el) { el.style.setProperty('--px', px.toFixed(3)); el.style.setProperty('--py', py.toFixed(3)); }
    });
  }, { passive: true });
}
