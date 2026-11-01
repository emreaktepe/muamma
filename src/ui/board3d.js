// 3D tahta yaşam döngüsü. main.js bunu yalnızca dinamik import ile yükler (three ayrı chunk).
// Canvas kalıcı bir host içinde yaşar; render() DOM'u yeniden yazsa da host slota taşınır, bağlam bozulmaz.
import { createScene } from './board3d/scene.js';
import { snapshot, a11yHTML } from './board3d/model.js';

export { a11yHTML };

async function loadFonts() {
  if (!document.fonts?.load) return;
  const wait = Promise.all([
    document.fonts.load('700 15px "Cormorant Garamond"'),
    document.fonts.load('400 14px Cinzel'),
    document.fonts.load('700 12px Cinzel'),
  ]).catch(() => {});
  await Promise.race([wait, new Promise((r) => setTimeout(r, 1500))]);
}

export async function createBoard3D({ onPick, onLost } = {}) {
  await loadFonts();
  const host = document.createElement('div');
  host.className = 'stage';
  host.hidden = true;
  const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
  document.body.appendChild(host);
  const scene = createScene(host, { onPick, onLost, coarse });

  const reset = document.createElement('button');
  reset.type = 'button';
  reset.className = 'btn small ghost stage-reset';
  reset.textContent = 'Tahtayı sıfırla';
  reset.title = 'Kamerayı varsayılan açıya döndür';
  host.appendChild(reset);
  let motion = 'normal';
  reset.addEventListener('click', () => scene.resetView(motion));
  const hint = document.createElement('div');
  hint.className = 'stage-hint';
  hint.textContent = 'Sürükle: döndür · Tekerlek / iki parmak: yakınlaştır · Mekâna dokun: yürü';
  host.appendChild(hint);

  let disposed = false;
  return {
    attach(slot) {
      if (disposed || !slot) return;
      if (host.parentNode !== slot) slot.appendChild(host);
      host.hidden = false;
      scene.resize();
    },
    detach() {
      if (disposed) return;
      host.hidden = true;
      if (host.parentNode !== document.body) document.body.appendChild(host);
    },
    update(s, opts = {}) {
      if (disposed) return;
      motion = opts.motion || 'normal';
      scene.update(snapshot(s, opts), s, { motion, gameKey: opts.gameKey ?? null });
    },
    dispose() {
      disposed = true;
      scene.dispose();
      host.remove();
    },
  };
}
