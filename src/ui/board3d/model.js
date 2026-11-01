// 3D tahta için saf (three'siz) model: oyun durumundan "ne nerede" anlık görüntüsü.
// Hem sahne eşitlemesi hem erişilebilir metin listesi hem de testler bunu kullanır.
import { LOCATIONS, TILSIMLAR } from '../../game/data/locations.js';
import { isOpen, locName, era } from '../../game/engine.js';

export const BOARD_W = 840;
export const BOARD_H = 440;
export const SCALE = 0.01; // 1 tahta birimi = 0.01 dünya birimi

export const toWorld = (x, y) => ({ x: (x - BOARD_W / 2) * SCALE, z: (y - BOARD_H / 2) * SCALE });
export const toBoard = (wx, wz) => ({ x: wx / SCALE + BOARD_W / 2, y: wz / SCALE + BOARD_H / 2 });

// Simgesel yapının oturduğu nokta (tahta uzayı): etiketin tersi yönde ~14 birim; piyon/jeton ve etiket açık kalır.
export function landmarkAnchor(id) {
  const L = LOCATIONS[id];
  const [dx, dy] = L.label;
  const n = Math.hypot(dx, dy) || 1;
  return { x: L.x - (dx / n) * 17, y: L.y - (dy / n) * 17 };
}

const esc =(t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Aynı mekândaki piyonların yerleşimi (2D tahta ile aynı düzen).
function pawnSlot(L, i, n) {
  const ang = -Math.PI / 2 + (i - (n - 1) / 2) * (n > 3 ? 0.9 : 0.62 + 0.2 * (n - 2));
  const r = n === 1 ? 0 : 44;
  return {
    x: n === 1 ? L.x + 24 : L.x + r * Math.cos(ang) + 2,
    y: n === 1 ? L.y - 18 : L.y - 6 + r * Math.sin(ang),
  };
}

export function snapshot(s, { reach = {}, currentId = null, showRuh = true } = {}) {
  const pawns = [];
  const byLoc = {};
  for (const p of s.players) {
    if (p.status === 'surgun' || p.status === 'ifsa') continue;
    if (p.status === 'ruh' && !showRuh) continue;
    (byLoc[p.loc] ||= []).push(p);
  }
  for (const [loc, ps] of Object.entries(byLoc)) {
    ps.forEach((p, i) => {
      const pos = pawnSlot(LOCATIONS[loc], i, ps.length);
      pawns.push({ id: p.id, charId: p.charId, name: p.name, loc, x: pos.x, y: pos.y, ruh: p.status === 'ruh', cur: p.id === currentId });
    });
  }
  const tokens = [];
  for (const [id, L] of Object.entries(LOCATIONS)) {
    if (!isOpen(s, id)) continue;
    if (L.tilsim) {
      const state = !s.tilsim[id] ? 'stolen' : s.protectedTilsim[id] ? 'safe' : 'open';
      tokens.push({ key: `tilsim:${id}`, kind: 'tilsim', loc: id, state, x: L.x, y: L.y, level: 0 });
    }
    if (s.guards[id] !== undefined) tokens.push({ key: `guard:${id}`, kind: 'guard', loc: id, state: '', x: L.x + 19, y: L.y - 22, level: 0 });
    if (s.photos[id] !== undefined) tokens.push({ key: `photo:${id}`, kind: 'photo', loc: id, state: '', x: L.x - 19, y: L.y - 22, level: 0 });
  }
  const bodyCount = {};
  for (const b of s.bodies) {
    const L = LOCATIONS[b.loc];
    const level = bodyCount[b.loc] || 0;
    bodyCount[b.loc] = level + 1;
    tokens.push({ key: `body:${b.loc}:${b.victimId}`, kind: 'body', loc: b.loc, state: b.examined ? 'examined' : 'fresh', x: L.x - 18, y: L.y + 16, level });
  }
  return { era: era(s).id, reach: Object.keys(reach), pawns, tokens };
}

// Ekran okuyucu metni + (görünür) klavye/dokunma yedek düğmeleri.
export function a11yHTML(s, opts = {}) {
  const snap = snapshot(s, opts);
  const items = [];
  for (const id of Object.keys(LOCATIONS)) {
    if (!isOpen(s, id)) continue;
    const here = snap.pawns.filter((p) => p.loc === id).map((p) => p.name + (p.ruh ? ' (Ruh)' : ''));
    const tok = snap.tokens.filter((t) => t.loc === id).map((t) => ({
      tilsim: `tılsım ${TILSIMLAR[id]}${t.state === 'stolen' ? ' (çalındı)' : t.state === 'safe' ? ' (korunuyor)' : ''}`,
      guard: 'nöbet jetonu',
      photo: 'fotoğraf jetonu',
      body: t.state === 'examined' ? 'ceset (incelendi)' : 'ceset (incelenmedi)',
    }[t.kind]));
    if (!here.length && !tok.length) continue;
    items.push(`<li>${esc(locName(s, id))}: ${[here.length ? `oyuncular ${esc(here.join(', '))}` : '', esc(tok.join(', '))].filter(Boolean).join('; ')}</li>`);
  }
  const reachBtns = snap.reach.filter((id) => isOpen(s, id))
    .map((id) => `<button class="btn small node reach" data-act="node" data-loc="${id}">${esc(locName(s, id))}</button>`).join('');
  return `<ul class="sr-only" aria-label="Tahtadaki durum">${items.join('')}</ul>
    ${reachBtns ? `<div class="reach-list"><span>Gidilebilir:</span>${reachBtns}</div>` : ''}`;
}
