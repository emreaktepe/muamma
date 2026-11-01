// 3D / "Basit görünüm" tercihi ve WebGL2 denetimi (three yüklenmeden çalışır, küçüktür).
const KEY = 'muamma.view';

export function canUse3D() {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2');
    if (!gl) return false;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

// Kayıtlı tercih varsa o; yoksa WebGL2 + en az 4 çekirdek ise 3d, değilse basit.
export function initialView(can3d = canUse3D()) {
  let saved = null;
  try { saved = localStorage.getItem(KEY); } catch { /* */ }
  if (saved === 'basit') return 'basit';
  if (!can3d) return 'basit';
  if (saved === '3d') return '3d';
  return (navigator.hardwareConcurrency || 4) >= 4 ? '3d' : 'basit';
}

export function saveView(v) {
  try { localStorage.setItem(KEY, v); } catch { /* */ }
}
