// Animasyon hızı ayarı (kart çevirme ve 3D tahta ortak kullanır).
// Değerler: 'hizli' | 'normal' | 'kapali'. Kullanıcı seçmediyse sistem tercihi (prefers-reduced-motion) belirler.
export const ANIM_MODES = ['hizli', 'normal', 'kapali'];
export const ANIM_LABELS = { hizli: 'Hızlı', normal: 'Normal', kapali: 'Kapalı' };
const KEY = 'muamma.anim';

const hasWindow = typeof window !== 'undefined';

export function reducedMotion() {
  try {
    return hasWindow && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch { return false; }
}

function stored() {
  try {
    const v = hasWindow ? window.localStorage.getItem(KEY) : null;
    return ANIM_MODES.includes(v) ? v : null;
  } catch { return null; }
}

// Seçili mod (kayıtlı ayar yoksa sistem tercihi).
export function getAnim() {
  return stored() || (reducedMotion() ? 'kapali' : 'normal');
}

// Hareket kapalı mı? (Kullanıcı "Kapalı" seçtiyse ya da seçim yok ve sistem "azalt" diyorsa.)
export function motionOff() {
  return getAnim() === 'kapali';
}

// Süre çarpanı: hizli 0.5, normal 1, kapali 0
export function animScale(mode = getAnim()) {
  return mode === 'kapali' ? 0 : mode === 'hizli' ? 0.5 : 1;
}

export function applyAnim(mode = getAnim()) {
  if (hasWindow && typeof document !== 'undefined' && document.documentElement) {
    document.documentElement.dataset.anim = mode;
    document.documentElement.style.setProperty('--anim-scale', String(animScale(mode)));
  }
  return mode;
}

export function setAnim(mode) {
  if (!ANIM_MODES.includes(mode)) return getAnim();
  try { window.localStorage.setItem(KEY, mode); } catch { /* tarayıcı izin vermiyorsa geç */ }
  return applyAnim(mode);
}

// Sistem tercihi değişirse (kullanıcı seçmediyse) yeniden uygula.
export function watchSystemMotion() {
  try {
    if (!hasWindow || typeof window.matchMedia !== 'function') return;
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', () => applyAnim());
  } catch { /* eski tarayıcı */ }
}
