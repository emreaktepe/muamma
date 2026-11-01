// Mekânların küçük 3D simgesel yapıları (prosedürel, düşük poligon). Çağa göre değişir; tümü iki geometride birleşir.
import { Mesh, Group, MeshStandardMaterial } from 'three';
import { LOCATIONS } from '../../game/data/locations.js';
import { Builder, PAL as P } from './builder.js';
import { landmarkAnchor, toWorld } from './model.js';

// ---- ortak parçalar ----
function minaret(b, x, z, h, col = P.white) {
  b.cyl(x, 0, z, 1.5, 2.2, 3, col);                       // kaide
  b.cyl(x, 3, z, 1.2, 1.5, h * 0.62, col);                 // gövde
  b.cyl(x, h * 0.62 + 3, z, 2.6, 2.6, 1.2, P.stoneD);      // şerefe
  b.cyl(x, h * 0.62 + 4.2, z, 1.0, 1.2, h * 0.24, col);
  b.cone(x, h * 0.86 + 4.2, z, 1.9, h * 0.2, P.lead);       // kurşun külah
  b.sphere(x, h * 1.05 + 4.4, z, 0.7, P.gold, { metal: true });
}
function house(b, x, z, w, h, d, wall = P.white, roof = P.red, ry = 0) {
  b.box(x, 0, z, w, h, d, wall, { ry });
  b.pyr(x, h, z, w * 1.15, h * 0.55, d * 1.15, roof, { ry });
}
function tree(b, x, z, s = 1, col = P.green) { b.cyl(x, 0, z, 0.5 * s, 0.6 * s, 2.5 * s, P.wood, { seg: 4 }); b.cone(x, 2 * s, z, 3 * s, 7 * s, col, { seg: 5 }); }
function cypress(b, x, z, s = 1) { b.cone(x, 0, z, 1.8 * s, 11 * s, P.green, { seg: 5 }); }
function crenTower(b, x, z, w, h, col = P.stone) {
  b.box(x, 0, z, w, h, w, col);
  b.box(x, h, z, w + 1.4, 1.6, w + 1.4, P.stoneD);
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.box(x + dx * w * 0.42, h + 1.6, z + dz * w * 0.42, 1.8, 1.8, 1.8, col);
}
function boat(b, x, z, ry = 0, s = 1) {
  b.box(x, 0, z, 9 * s, 2.2 * s, 3.4 * s, P.wood, { ry });
  b.cyl(x, 2, z, 0.35 * s, 0.35 * s, 8 * s, P.dark, { seg: 4 });
  b.box(x + 0.8 * s, 3.2 * s, z, 0.4, 5 * s, 4 * s, P.white, { ry });
}
function pier(b, x, z, w, d = 4, col = P.wood) {
  b.box(x, 0, z, w, 1.6, d, col);
  for (let i = 0; i <= 3; i++) b.cyl(x - w / 2 + (w * i) / 3, -1, z + d / 2, 0.5, 0.5, 3, P.dark, { seg: 4 });
}

// ---- mekân tanımları: (b, era) ----
const BUILD = {
  surlar(b, era) {
    if (era === 'c1580') { // Yedikule Hisarı
      b.wall(-14, 0, 14, 0, 11, 3.2, P.stoneD);
      for (const x of [-14, 0, 14]) { b.cyl(x, 0, x ? 0 : 6, 5, 5.6, 22, P.stone, { seg: 9 }); b.cone(x, 22, x ? 0 : 6, 6, 9, P.lead, { seg: 9 }); }
      return;
    }
    const ruin = era !== 'c532';
    b.wall(-17, 0, 17, 0, ruin ? 11 : 13, 3.6, P.stoneD);
    for (const x of [-17, 0, 17]) crenTower(b, x, 0, 7, ruin ? 15 : 19, P.stone);
    b.box(-8.5, 0, 1.5, 6, 8, 1.6, P.dark); // kapı
    if (ruin) { tree(b, 10, 6, 1.1, P.greenL); tree(b, -11, 7, 0.9, P.greenL); house(b, 20, 7, 6, 4, 5, P.white, P.brick); }
  },
  yenikapi(b, era) {
    if (era === 'c532') { // Theodosius Limanı
      b.box(0, 0, 10, 30, 1.6, 5, P.wood);
      boat(b, -9, 3, 0.2); boat(b, 5, 2, -0.3, 1.2); boat(b, 14, 5, 0.1, 0.9);
      house(b, -8, -7, 10, 5, 7, P.stone, P.redD);
      b.box(6, 0, -6, 8, 4, 6, P.stoneD);
    } else if (era === 'c1580') { // bostanlar
      for (const [x, z] of [[-9, 0], [-3, 6], [4, -2], [10, 5], [0, -8]]) tree(b, x, z, 1, P.greenL);
      house(b, 12, -5, 6, 4, 5, P.white, P.brick);
    } else if (era === 'c1933') {
      house(b, -10, 0, 8, 6, 7, P.stone, P.brick); house(b, 1, -3, 7, 8, 6, P.white, P.red, 0.15); house(b, 11, 2, 7, 5, 6, P.ochre, P.redD);
    } else { // Marmaray kazısı
      b.box(-2, -1.5, 0, 22, 1.6, 14, P.stoneD);
      b.box(-2, 0, 0, 20, 0.6, 12, P.dark);
      b.box(11, 0, -6, 1.6, 30, 1.6, P.crane); b.box(2, 29, -6, 20, 1.4, 1.6, P.crane); b.box(-8, 24, -6, 1.2, 5, 1.2, P.dark);
      b.box(-12, 0, -8, 5, 4, 4, P.turq);
    }
  },
  suleymaniye(b) {
    b.box(0, 0, 0, 24, 11, 24, P.stone);
    b.dome(0, 11, 0, 10.5, P.lead, { sy: 0.95 });
    b.sphere(0, 21.5, 0, 1, P.gold, { metal: true });
    for (const z of [-1, 1]) { b.dome(0, 8, z * 13.5, 6.6, P.lead, { sy: 0.8 }); b.box(0, 0, z * 13.5, 12, 8, 4, P.stoneD); }
    for (const [x, z] of [[-9, -9], [9, -9], [-9, 9], [9, 9]]) b.dome(x, 11, z, 3.6, P.lead);
    minaret(b, -15, 15, 38); minaret(b, 15, 15, 38); minaret(b, -15, -15, 30); minaret(b, 15, -15, 30);
  },
  kapalicarsi(b) {
    b.box(0, 0, 0, 36, 6, 24, P.stoneD);
    for (const x of [-12, 0, 12]) for (const z of [-6, 6]) b.dome(x, 6, z, 4.6, P.lead, { sy: 0.7 });
    b.box(0, 0, 14, 10, 9, 5, P.ochre); b.dome(0, 9, 14, 5, P.lead, { sy: 0.8 });
    b.cyl(-15, 6, -10, 1.6, 1.8, 5, P.brick, { seg: 5 });
  },
  cemberlitas(b, era) {
    b.box(0, 0, 0, 20, 2, 20, P.stoneD); b.box(0, 2, 0, 15, 2, 15, P.stone); b.box(0, 4, 0, 11, 2.5, 11, P.stoneD);
    b.cyl(0, 6.5, 0, 3.2, 4, 32, P.stone, { seg: 10 });
    for (const y of [12, 22, 31]) b.torus(0, y, 0, 3.7, 0.55, era === 'c532' ? P.stoneD : P.dark, { metal: era !== 'c532' });
    b.cyl(0, 38.5, 0, 4.6, 3.4, 2.2, P.stoneD, { seg: 10 });
    if (era === 'c532') { b.cyl(0, 40.5, 0, 0.7, 1.4, 6, P.gold, { metal: true, seg: 6 }); b.sphere(0, 47, 0, 1.4, P.gold, { metal: true }); }
    else b.sphere(0, 42, 0, 1.6, P.gold, { metal: true });
    if (era === 'c532') for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; b.cyl(Math.cos(a) * 15, 0, Math.sin(a) * 15, 0.8, 1, 8, P.white, { seg: 6 }); }
  },
  hipodrom(b, era) {
    if (era === 'c532') { // araba yarışı pisti
      b.torus(0, 0, 0, 16, 2, P.stoneD, { sx: 1.6, sy: 0.9, sz: 1.5, seg: 18 });
    }
    // spina: Dikilitaş, Yılanlı Sütun, Örme Sütun
    b.box(-12, 0, 0, 5, 2.5, 5, P.stoneD);
    b.cyl(-12, 2.5, 0, 1.0, 1.9, 24, P.ochre, { seg: 4, ry: Math.PI / 4 }); b.cone(-12, 26.5, 0, 1.4, 3.5, P.gold, { seg: 4, metal: true });
    b.cyl(0, 0, 0, 1.2, 1.5, 3, P.stoneD);
    for (const y of [3, 6.5, 10]) b.torus(0, y, 0, 1.55, 0.7, P.gold, { metal: true, seg: 8 });
    for (const a of [0, 2.1, 4.2]) b.sphere(Math.cos(a) * 1.1, 14.5, Math.sin(a) * 1.1, 1.1, P.gold, { metal: true });
    b.box(12, 0, 0, 4.6, 2.2, 4.6, P.stoneD); b.cyl(12, 2.2, 0, 1.7, 2.2, 22, P.stone, { seg: 6 }); b.box(12, 24, 0, 4.2, 1.4, 4.2, P.stoneD);
    if (era === 'c1933' || era === 'bugun') { b.cyl(0, 0, 11, 3, 3.4, 5, P.stone, { seg: 8 }); b.cone(0, 5, 11, 4.6, 4, P.lead, { seg: 8 }); } // Alman Çeşmesi
  },
  yerebatan(b, era) {
    if (era === 'c532') { // sarnıç inşaatı
      b.cyl(0, -1.2, 4, 12, 12, 1.4, P.dark, { seg: 12 });
      b.cyl(-9, 0, -4, 0.8, 0.8, 22, P.wood, { seg: 5, rx: 0 }); b.cyl(9, 0, -4, 0.8, 0.8, 22, P.wood, { seg: 5 });
      b.box(0, 21, -4, 20, 1.2, 1.2, P.wood); b.box(-6, 14, -4, 1, 8, 1, P.dark);
      b.box(0, 0, 8, 10, 4, 6, P.stoneD);
    } else if (era === 'c1580') {
      house(b, -8, 0, 8, 7, 7, P.white, P.brick, 0.2); house(b, 5, -3, 9, 8, 7, P.ochre, P.redD, -0.15); house(b, 10, 7, 6, 5, 5, P.stone, P.brick);
    } else {
      b.box(0, 0, 0, 16, 8, 12, P.stone); b.pyr(0, 8, 0, 18, 5, 13, P.lead);
      b.box(0, 0, 6.1, 5, 6, 0.8, P.dark);
      b.cyl(14, 0, 4, 9, 9, 0.8, P.turq, { seg: 14, metal: true });
      for (const [x, z] of [[11, 1], [17, 1], [11, 7], [17, 7]]) b.cyl(x, 0.8, z, 0.8, 0.9, 4, P.stone, { seg: 6 });
    }
  },
  ayasofya(b, era) {
    const built = era !== 'c532';
    if (!built) { // inşaat: yarım kubbe + iskele
      b.box(0, 0, 0, 24, 9, 18, P.ochre); b.dome(0, 9, 0, 9, P.stoneD, { sy: 0.55 });
      for (const [x, z] of [[-15, -11], [15, -11], [-15, 11], [15, 11]]) b.cyl(x, 0, z, 0.7, 0.7, 20, P.wood, { seg: 5 });
      for (const y of [8, 15]) { b.box(0, y, -11, 30, 0.9, 0.9, P.wood); b.box(0, y, 11, 30, 0.9, 0.9, P.wood); b.box(-15, y, 0, 0.9, 0.9, 22, P.wood); b.box(15, y, 0, 0.9, 0.9, 22, P.wood); }
      b.box(20, 0, 8, 7, 4, 5, P.stoneD);
      return;
    }
    b.box(0, 0, 0, 24, 10, 18, P.ochre);
    b.dome(0, 10, 0, 10.4, P.lead, { sy: 0.9 }); b.torus(0, 10.2, 0, 10.4, 0.6, P.gold, { metal: true, seg: 16 });
    b.cone(0, 19.2, 0, 1.2, 4, P.gold, { metal: true, seg: 6 });
    for (const x of [-1, 1]) { b.box(x * 14, 0, 0, 7, 7, 12, P.ochre); b.dome(x * 14, 7, 0, 7, P.lead, { sy: 0.75 }); }
    for (const [x, z] of [[-12, -9], [12, -9], [-12, 9], [12, 9]]) b.box(x, 0, z, 4, 12, 3.4, P.stoneD); // payandalar
    for (const [x, z] of [[-19, -8], [19, -8], [-19, 9], [19, 9]]) minaret(b, x, z, 30, P.stone);
  },
  topkapi(b, era) {
    if (era === 'c532') { // Akropolis: tapınak
      b.box(0, 0, 0, 26, 2, 15, P.stone);
      for (let i = 0; i < 6; i++) b.cyl(-10 + i * 4, 2, 6, 1.1, 1.3, 13, P.white, { seg: 6 });
      b.box(0, 15, 3, 25, 2, 7, P.stoneD); b.pyr(0, 17, 3, 26, 5, 8, P.redD);
      return;
    }
    b.box(0, 0, 4, 38, 7, 12, P.wall);
    for (const x of [-12, 0, 12]) b.dome(x, 7, 4, 5, P.lead, { sy: 0.75 });
    b.box(-17, 0, -6, 7, 11, 7, P.stone); b.pyr(-17, 11, -6, 8, 8, 8, P.lead);              // Adalet Kulesi
    b.box(10, 0, -7, 14, 8, 8, P.ochre); b.dome(10, 8, -7, 4.2, P.lead);
    b.box(19, 0, 9, 8, 9, 5, P.stone); b.cone(16, 9, 9, 2.4, 6, P.lead, { seg: 6 }); b.cone(22, 9, 9, 2.4, 6, P.lead, { seg: 6 }); // kapı kuleleri
    b.cyl(-6, 7, 0, 1, 1.4, 7, P.brick, { seg: 6 });
  },
  sirkeci(b, era) {
    if (era === 'c532') { // Prosphorion limanı
      pier(b, 0, 8, 30, 4); boat(b, -9, 14, 0.1); boat(b, 5, 15, -0.2, 1.1); b.box(-6, 0, -2, 10, 5, 7, P.stoneD); b.pyr(-6, 5, -2, 11, 4, 8, P.redD);
      b.box(8, 0, -3, 7, 8, 6, P.stone);
    } else if (era === 'c1580') {
      pier(b, 0, 8, 26, 4); b.box(-6, 1.6, 8, 8, 5, 4, P.white); b.pyr(-6, 6.6, 8, 9, 4, 5, P.red); boat(b, 8, 14, 0.3); b.box(8, 0, -4, 8, 6, 6, P.stoneD);
    } else { // Sirkeci Garı
      b.box(0, 0, 0, 34, 10, 13, P.stone); b.pyr(0, 10, 0, 36, 5, 15, P.lead);
      b.box(-14, 0, 8, 7, 24, 7, P.stoneD); b.pyr(-14, 24, 8, 8, 8, 8, P.lead);
      b.cyl(-14, 18, 15.4, 2, 2, 0.6, P.white, { rx: Math.PI / 2, seg: 10 });
      b.box(0, 0, 7.2, 16, 5, 2, P.stoneD);
      if (era === 'bugun') b.box(12, 0, 8, 5, 4, 2, P.turq);
    }
  },
  galata(b, era) {
    if (era === 'c532') { // Sykai: küçük yerleşim
      house(b, -6, -2, 7, 5, 6, P.stone, P.redD, 0.2); house(b, 5, 2, 6, 4, 6, P.white, P.brick); house(b, 12, -5, 5, 4, 5, P.stoneD, P.redD);
      tree(b, -12, 6, 1, P.greenL); tree(b, 0, 9, 1.1, P.greenL); cypress(b, 15, 4);
      return;
    }
    b.cyl(0, 0, 0, 8, 9.2, 36, P.stone, { seg: 12 });
    for (const y of [10, 22]) b.torus(0, y, 0, 8.4, 0.5, P.stoneD, { seg: 12 });
    b.cyl(0, 36, 0, 10.4, 8.4, 4, P.stoneD, { seg: 12 });              // şerefe
    b.cyl(0, 40, 0, 8.2, 8.2, 5.5, P.wall, { seg: 12 });
    b.cone(0, 45.5, 0, 10, 13, P.lead, { seg: 12 });
    b.sphere(0, 58.8, 0, 1, P.gold, { metal: true });
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; b.box(Math.sin(a) * 8.1, 14 + (i % 3) * 7, Math.cos(a) * 8.1, 1.8, 3.4, 1, P.dark, { ry: a }); }
    if (era === 'bugun') b.box(0, 0, 11, 10, 3, 4, P.coral);
  },
  tophane(b, era) {
    if (era === 'c532') {
      b.box(0, 0, 6, 16, 1.4, 4, P.wood); house(b, -6, -3, 7, 4, 5, P.stone, P.redD); for (let i = 0; i < 5; i++) b.cone(-10 + i * 6, 0, -9, 2, 5, P.greenL, { seg: 5 });
    } else if (era === 'c1580') { // Rasathane
      b.cyl(0, 0, 0, 5, 6, 24, P.stone, { seg: 8 }); b.dome(0, 24, 0, 6.2, P.lead);
      b.torus(0, 33, 0, 3, 0.4, P.gold, { metal: true, seg: 10 }); b.torus(0, 33, 0, 3, 0.4, P.gold, { metal: true, seg: 10, rz: 0, rx: 0.3 });
      b.sphere(0, 33, 0, 1, P.gold, { metal: true }); house(b, 14, 3, 7, 5, 6, P.white, P.brick);
    } else if (era === 'c1933') { // top dökümhanesi: depolar + cami
      b.box(-8, 0, 0, 16, 8, 10, P.wall); b.pyr(-8, 8, 0, 17, 4, 11, P.redD);
      b.box(10, 0, 2, 12, 7, 11, P.stone); b.dome(10, 7, 2, 5.4, P.lead); minaret(b, 17, 8, 24, P.stone); minaret(b, 3, 8, 24, P.stone);
    } else { // sanat mekânları
      b.box(-8, 0, 0, 16, 9, 10, P.stoneD); b.box(-8, 9, 0, 17, 1, 11, P.turq);
      b.box(9, 0, 1, 12, 7, 11, P.coral); b.box(9, 7, 1, 13, 1, 12, P.dark);
      b.box(0, 0, 9, 8, 3, 3, P.white);
    }
  },
  pera(b, era) {
    if (era === 'c532') { for (let i = 0; i < 6; i++) b.cone(-12 + i * 5, 0, (i % 2) * 6 - 3, 2.4, 6, P.greenL, { seg: 5 }); house(b, 14, 0, 6, 4, 5, P.stone, P.redD); return; }
    if (era === 'c1580') { house(b, -8, -2, 8, 7, 7, P.white, P.brick, 0.1); house(b, 3, -4, 9, 9, 7, P.ochre, P.redD); house(b, 11, 4, 7, 6, 6, P.stone, P.brick, -0.2); cypress(b, -14, 6); return; }
    if (era === 'c1933') { // Pera Palas
      b.box(0, 0, 0, 30, 14, 14, P.ochre); b.box(0, 14, 0, 31, 1.2, 15, P.stoneD);
      for (const x of [-12, 12]) { b.box(x, 15, 0, 7, 8, 8, P.stone); b.pyr(x, 23, 0, 8, 7, 9, P.lead); }
      b.pyr(0, 15.2, 0, 14, 5, 12, P.redD); b.box(0, 0, 7.2, 9, 5, 2, P.dark);
      return;
    }
    b.box(-11, 0, 0, 9, 14, 9, P.stone); b.box(-1, 0, 1, 9, 10, 8, P.ochre); b.box(9, 0, 0, 9, 16, 9, P.wall);
    for (const x of [-11, -1, 9]) b.pyr(x, x > 5 ? 16 : x < -5 ? 14 : 10, 0, 10, 3.5, 10, P.lead);
    b.box(-4, 0, 9, 12, 3, 3.4, P.coral); b.box(-4, 3, 9, 12.6, 0.8, 4, P.white); // tarihi tramvay
  },
  rumelihisari(b) {
    b.wall(-16, 4, 16, -4, 9, 3, P.stoneD);
    b.wall(-16, 4, -14, 14, 9, 3, P.stoneD);
    b.cyl(-16, 0, 4, 6.5, 7, 28, P.stone, { seg: 10 }); b.cone(-16, 28, 4, 7.6, 10, P.lead, { seg: 10 });
    b.cyl(16, 0, -4, 5.2, 5.8, 32, P.stone, { seg: 8 }); b.cone(16, 32, -4, 6.2, 10, P.lead, { seg: 8 });
    b.cyl(-14, 0, 14, 5, 5.5, 24, P.stone, { seg: 12 }); b.cone(-14, 24, 14, 6, 8, P.lead, { seg: 12 });
    for (let i = 0; i < 6; i++) b.box(-12 + i * 5, 9, 3 - i * 1.3, 1.8, 1.6, 1.8, P.stone);
    cypress(b, 4, 10); cypress(b, 8, 6, 1.2);
  },
  kizkulesi(b, era) {
    b.cyl(0, -1, 14, 11, 14, 3, P.stoneD, { seg: 10 });          // kayalık (anchor etiketin tersine kayık: ada merkezi z=+14)
    b.cyl(0, 2, 14, 9, 11, 1.2, P.stone, { seg: 10 });
    if (era === 'c532') { b.cone(-3, 3, 12, 4, 6, P.dark, { seg: 5 }); b.cone(4, 3, 16, 3, 4, P.stoneD, { seg: 5 }); return; }
    if (era === 'c1933') { // fener: kırmızı-beyaz şeritli
      for (let i = 0; i < 4; i++) b.cyl(0, 3 + i * 6, 14, 3.4 - i * 0.2, 3.9 - i * 0.2, 6, i % 2 ? P.red : P.white, { seg: 10 });
      b.cyl(0, 27, 14, 4.4, 4, 1.4, P.gold, { seg: 10, metal: true });
      b.sphere(0, 30.5, 14, 2.3, '#ffe9a0', { metal: true }); b.cone(0, 32, 14, 3, 3, P.red, { seg: 8 });
      return;
    }
    b.box(0, 3, 17, 13, 6, 8, P.white); b.pyr(0, 9, 17, 14, 4, 9, P.red);
    b.cyl(0, 3, 12, 3.8, 4.6, 22, P.white, { seg: 10 });
    b.cyl(0, 25, 12, 5.6, 5.6, 1.4, P.stoneD, { seg: 10 });
    b.cyl(0, 26.4, 12, 3.4, 3.4, 4, P.white, { seg: 10 });
    b.cone(0, 30.4, 12, 4.6, 7, P.lead, { seg: 10 });
    b.sphere(0, 38, 12, 0.8, P.gold, { metal: true });
  },
  uskudar(b, era) {
    if (era === 'c532') { house(b, -6, 0, 8, 5, 7, P.stone, P.redD, 0.1); house(b, 6, -3, 7, 4, 6, P.white, P.brick); b.box(0, 0, 8, 20, 1.4, 4, P.wood); tree(b, 12, 4, 1, P.greenL); return; }
    if (era === 'c1933') { // Haydarpaşa Garı
      b.box(0, 0, 0, 38, 13, 12, P.stone); b.pyr(0, 13, 0, 36, 5, 11, P.lead);
      for (const x of [-17, 17]) { b.box(x, 0, 5, 9, 11, 9, P.stoneD); b.box(x, 11, 5, 10, 1.2, 10, P.stone); b.pyr(x, 12.2, 5, 9, 9, 9, P.lead); }
      b.box(0, 0, 6.4, 10, 17, 3, P.stoneD); b.pyr(0, 17, 6.4, 10.4, 6, 4, P.lead);
      b.box(0, 0, 14, 26, 1.4, 4, P.wood);
      return;
    }
    // Mihrimah Sultan Camii (1580, bugün)
    b.box(0, 0, 0, 22, 10, 18, P.stone); b.dome(0, 10, 0, 9.4, P.lead, { sy: 0.95 }); b.sphere(0, 19.5, 0, 0.9, P.gold, { metal: true });
    for (const x of [-1, 1]) b.dome(x * 12, 7, 0, 4.4, P.lead);
    minaret(b, -14, 12, 32); minaret(b, 14, 12, 32);
    if (era === 'bugun') b.box(0, 0, 18, 24, 1.4, 4, P.wood);
  },
};

// Kapalı mekân (çağda yok) için yapı çizilmez.
export function landmarkIds(openIds) { return openIds.filter((id) => BUILD[id]); }

// Tüm yapılar iki geometride (mat/metal) birleşir.
export function buildLandmarks(eraId, openIds) {
  const b = new Builder(5);
  for (const id of landmarkIds(openIds)) {
    const a = landmarkAnchor(id);
    const w = toWorld(a.x, a.y);
    const scale = id === 'kizkulesi' ? 1 : id === 'uskudar' && eraId === 'c1933' ? 1.1 : id === 'ayasofya' || id === 'suleymaniye' ? 1.3 : 1.4;
    b.at(w.x / 0.01, w.z / 0.01, scale);
    BUILD[id](b, eraId);
  }
  const geos = b.build();
  const group = new Group();
  const mats = [];
  const make = (geo, metal) => {
    if (!geo) return;
    const m = new MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: metal ? 0.38 : 0.82, metalness: metal ? 0.45 : 0, emissive: metal ? '#2a1f05' : '#000000' });
    mats.push(m);
    const mesh = new Mesh(geo, m);
    mesh.castShadow = true; mesh.receiveShadow = true;
    group.add(mesh);
  };
  make(geos.matte, false); make(geos.metal, true);
  return {
    group,
    dispose() { group.children.forEach((c) => c.geometry.dispose()); mats.forEach((m) => m.dispose()); },
  };
}

export { BUILD as LANDMARK_BUILDERS };
export const hasLandmark = (id) => !!BUILD[id] && !!LOCATIONS[id];
