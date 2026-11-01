// 3D tahta için saf (three'siz) model: oyun durumundan "ne nerede" anlık görüntüsü.
// Hem sahne eşitlemesi hem erişilebilir metin listesi hem de testler bunu kullanır.
import { LOCATIONS, TILSIMLAR } from '../../game/data/locations.js';
import { isOpen, locName, era } from '../../game/engine.js';

// Tahta = hazır sanat görseli (public/assets/harita.webp, 1254x1254, kare). 1 tahta birimi = 0.01 dünya birimi.
export const BOARD_W = 580;
export const BOARD_H = 580;
export const SCALE = 0.01;
export const MAP_IMG = 'assets/harita.webp';

export const toWorld = (x, y) => ({ x: (x - BOARD_W / 2) * SCALE, z: (y - BOARD_H / 2) * SCALE });
export const toBoard = (wx, wz) => ({ x: wx / SCALE + BOARD_W / 2, y: wz / SCALE + BOARD_H / 2 });
// Dünya (x,z) <-> doku koordinatı (u,v: 0..1, v aşağı doğru; görselin sol üstü 0,0)
export const toUV = (wx, wz) => ({ u: wx / (BOARD_W * SCALE) + 0.5, v: wz / (BOARD_H * SCALE) + 0.5 });
export const uvToWorld = (u, v) => ({ x: (u - 0.5) * BOARD_W * SCALE, z: (v - 0.5) * BOARD_H * SCALE });

// Mekân -> görseldeki krem daire eşlemesi (yalnız 3B tahta için; 2D tahta ve src/game bunu kullanmaz).
// Daire merkezleri harita.webp üzerinde piksel analiziyle bulundu (1254x1254, krem dolgu bileşenleri) ve 1254'e bölündü.
// Görselde 17 daire var, oyunda 16 mekân: sağ alttaki (1031,974) Haydarpaşa dairesi kullanılmıyor. Eşleşme konuma/simgeye göre:
//   Galata Kulesi = kule dibindeki daire, Ayasofya = kubbe, Kız Kulesi = adadaki daire, Yerebatan = sütunlu sarnıç,
//   Hipodrom = dikilitaş/yılanlı sütun, Kapalıçarşı = kırmızı çatılı çarşı, Rumeli Hisarı = sağ üst hisar,
//   Süleymaniye = sol üst kubbeli cami, Pera = kuzeydeki büyük binalar, Tophane = vinçli rıhtım (Galata yakası),
//   Üsküdar = sağdaki camili yaka, Yenikapı = vinçli liman, Topkapı = doğu burnundaki kubbeli yapı,
//   Surlar = güney uçtaki sur kuleleri, Sirkeci = güney kıyı kapısı, Çemberlitaş = batıdaki kule/sur dairesi.
// a: etiket hizası (c: ortalı, l: sola, r: sağa doğru uzar); yakın daireler arasında etiket çakışmasını önler.
const px = (x, y, a = 'c') => ({ u: x / 1254, v: y / 1254, a });
export const LOC_UV = {
  pera: px(722, 138),
  rumelihisari: px(1085, 226, 'l'),
  galata: px(611, 279, 'l'),
  tophane: px(795, 299),
  suleymaniye: px(286, 405),
  ayasofya: px(749, 543),
  yerebatan: px(591, 601),
  kizkulesi: px(1014, 601),
  kapalicarsi: px(363, 610),
  cemberlitas: px(172, 671, 'r'),
  topkapi: px(802, 693),
  hipodrom: px(498, 773, 'l'),
  sirkeci: px(635, 796, 'r'),
  uskudar: px(1053, 831),
  yenikapi: px(340, 878),
  surlar: px(204, 976, 'r'),
};

// Mekânın tahta uzayındaki (0..580) merkezi
export function anchor(id) {
  const m = LOC_UV[id];
  return { x: m.u * BOARD_W, y: m.v * BOARD_H };
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
      const pos = pawnSlot(anchor(loc), i, ps.length);
      pawns.push({ id: p.id, charId: p.charId, name: p.name, loc, x: pos.x, y: pos.y, ruh: p.status === 'ruh', cur: p.id === currentId });
    });
  }
  const tokens = [];
  for (const [id, L0] of Object.entries(LOCATIONS)) {
    if (!isOpen(s, id)) continue;
    const L = anchor(id);
    if (L0.tilsim) {
      const state = !s.tilsim[id] ? 'stolen' : s.protectedTilsim[id] ? 'safe' : 'open';
      tokens.push({ key: `tilsim:${id}`, kind: 'tilsim', loc: id, state, x: L.x, y: L.y, level: 0 });
    }
    if (s.guards[id] !== undefined) tokens.push({ key: `guard:${id}`, kind: 'guard', loc: id, state: '', x: L.x + 19, y: L.y - 22, level: 0 });
    if (s.haunted && s.haunted[id] !== undefined) tokens.push({ key: `perili:${id}`, kind: 'perili', loc: id, state: '', x: L.x - 26, y: L.y + 2, level: 0 });
    if (s.photos[id] !== undefined) tokens.push({ key: `photo:${id}`, kind: 'photo', loc: id, state: '', x: L.x - 19, y: L.y - 22, level: 0 });
  }
  const bodyCount = {};
  for (const b of s.bodies) {
    const L = anchor(b.loc);
    const level = bodyCount[b.loc] || 0;
    bodyCount[b.loc] = level + 1;
    tokens.push({ key: `body:${b.loc}:${b.victimId}`, kind: 'body', loc: b.loc, state: b.examined ? 'examined' : 'fresh', x: L.x - 21, y: L.y + 6, level });
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
      perili: 'perili (bu gece suikast, hırsızlık ve sahte iz yok)',
      body: t.state === 'examined' ? 'ceset (incelendi)' : 'ceset (incelenmedi)',
    }[t.kind]));
    if (!here.length && !tok.length) continue;
    items.push(`<li>${esc(locName(s, id))}: ${[here.length ? `oyuncular ${esc(here.join(', '))}` : '', esc(tok.join(', '))].filter(Boolean).join('; ')}</li>`);
  }
  const reachBtns = snap.reach.filter((id) => isOpen(s, id))
    .map((id) => `<button class="btn small node reach" data-act="node" data-loc="${id}">${esc(locName(s, id))}</button>`).join('');
  return `<ul class="sr-only" aria-label="Tahtadaki durum">${items.join('')}</ul>
    ${reachBtns ? `<div class="reach-list"><span>${esc(opts.reachLabel || 'Gidilebilir')}:</span>${reachBtns}</div>` : ''}`;
}
