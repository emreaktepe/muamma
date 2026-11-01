// Açılış (title) ekranı: hazır "Miniature Noir" İstanbul görseli (assets/acilis.webp), yavaş yakınlaşma, paralaks ve ana düğmeler.
// Stil: ./landing.css
import './landing.css';

export function landingView(saved, canInstall = !!window.MUAMMA_canInstall?.()) {
  const canResume = !!(saved && !saved.winner);
  return `<main class="land" id="land">
    <div class="l-bg" aria-hidden="true"><img src="assets/acilis.webp" alt="" decoding="async" fetchpriority="high"></div>
    <div class="l-glow" aria-hidden="true"></div>
    <div class="l-vignette" aria-hidden="true"></div>
    <div class="l-content">
      <p class="l-kicker">Dedektif kutu oyunu</p>
      <h1 class="l-logo">MUAMMA</h1>
      <p class="l-title">İstanbul'un Yedi Tılsımı</p>
      <p class="l-tag">Dört çağ, dört cinayet ve aranızda gizlenen bir Gölge.</p>
      <nav class="l-menu" aria-label="Ana menü">
        <button class="l-btn primary" data-act="land-start">Oyuna Başla</button>
        ${canResume ? '<button class="l-btn" data-act="resume">Devam Et</button>' : ''}
        <button class="l-btn ghost" data-act="help">Kurallar</button>
        ${canInstall ? '<button class="l-btn ghost" data-act="install">Uygulamayı yükle</button>' : ''}
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
