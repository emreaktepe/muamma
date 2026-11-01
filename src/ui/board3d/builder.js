// Düşük poligonlu prosedürel yapı kurucu: parçalar köşe rengiyle tek geometride birleşir (mat + metal = en çok 2 çizim).
// Koordinatlar "tahta birimi"dir (1 birim = 0.01 dünya birimi), x doğu, z güney (tahta y'si), y yukarı.
import {
  BoxGeometry, CylinderGeometry, ConeGeometry, SphereGeometry, TorusGeometry, Matrix4, Color, Float32BufferAttribute,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const U = 0.01;

export const PAL = {
  stone: '#d8c7a0', stoneD: '#b09c78', wall: '#a38f6a', ochre: '#c47a50', red: '#b5332e', redD: '#8f2a26',
  lead: '#5a6f8c', turq: '#2c8f94', gold: '#d6ad3a', white: '#efe3c8', dark: '#3b2f22', green: '#3f6e4b',
  greenL: '#5f8a4f', wood: '#6b4a2b', blue: '#1f3a6b', brick: '#a8553a', crane: '#d6a23a', coral: '#d0584a',
};

export class Builder {
  constructor(seed = 3) {
    this.parts = { matte: [], metal: [] };
    this.base = new Matrix4();
    this.seed = seed;
  }

  // Sonraki parçalar için taban dönüşümü: konum (tahta birimi), ölçek, y dönüşü
  at(x = 0, z = 0, scale = 1, ry = 0) {
    this.base = new Matrix4().makeTranslation(x * U, 0, z * U)
      .multiply(new Matrix4().makeRotationY(ry))
      .multiply(new Matrix4().makeScale(scale, scale, scale));
    return this;
  }

  rnd() { this.seed = (this.seed * 16807) % 2147483647; return this.seed / 2147483647; }

  push(geo, x, y, z, col, { metal = false, ry = 0, rx = 0, sx = 1, sy = 1, sz = 1, shade = 0.07 } = {}) {
    const local = new Matrix4().makeTranslation(x * U, y * U, z * U);
    if (ry) local.multiply(new Matrix4().makeRotationY(ry));
    if (rx) local.multiply(new Matrix4().makeRotationX(rx));
    if (sx !== 1 || sy !== 1 || sz !== 1) local.multiply(new Matrix4().makeScale(sx, sy, sz));
    geo.applyMatrix4(new Matrix4().multiplyMatrices(this.base, local));
    const c = new Color(col);
    const j = 1 + (this.rnd() - 0.5) * 2 * shade;
    const pos = geo.attributes.position;
    const arr = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      // sahte çevre kararması: aşağısı koyu, tepesi açık
      const k = 0.7 + 0.3 * Math.min(1, pos.getY(i) / 0.26);
      arr[i * 3] = c.r * j * k; arr[i * 3 + 1] = c.g * j * k; arr[i * 3 + 2] = c.b * j * k;
    }
    geo.setAttribute('color', new Float32BufferAttribute(arr, 3));
    this.parts[metal ? 'metal' : 'matte'].push(geo);
    return this;
  }

  box(x, y, z, w, h, d, col, o) { return this.push(new BoxGeometry(w * U, h * U, d * U).translate(0, (h / 2) * U, 0), x, y, z, col, o); }
  cyl(x, y, z, rt, rb, h, col, o = {}) { return this.push(new CylinderGeometry(rt * U, rb * U, h * U, o.seg || 8, 1).translate(0, (h / 2) * U, 0), x, y, z, col, o); }
  cone(x, y, z, r, h, col, o = {}) { return this.push(new ConeGeometry(r * U, h * U, o.seg || 8, 1).translate(0, (h / 2) * U, 0), x, y, z, col, o); }
  pyr(x, y, z, w, h, d, col, o = {}) { return this.push(new ConeGeometry(0.7071 * U, h * U, 4, 1).translate(0, (h / 2) * U, 0), x, y, z, col, { ...o, ry: (o.ry || 0) + Math.PI / 4, sx: w, sz: d }); }
  dome(x, y, z, r, col, o = {}) { return this.push(new SphereGeometry(r * U, o.seg || 10, 5, 0, Math.PI * 2, 0, Math.PI / 2), x, y, z, col, { ...o, sy: o.sy || 1 }); }
  sphere(x, y, z, r, col, o = {}) { return this.push(new SphereGeometry(r * U, 8, 6), x, y, z, col, o); }
  torus(x, y, z, R, r, col, o = {}) { return this.push(new TorusGeometry(R * U, r * U, 5, o.seg || 14), x, y, z, col, { rx: Math.PI / 2, ...o }); }
  // iki nokta arasında uzanan duvar parçası
  wall(x1, z1, x2, z2, h, t, col, o) {
    const len = Math.hypot(x2 - x1, z2 - z1);
    return this.box((x1 + x2) / 2, 0, (z1 + z2) / 2, len, h, t, col, { ...o, ry: -Math.atan2(z2 - z1, x2 - x1) });
  }

  // Birleştirilmiş geometriler (boş olabilir)
  build() {
    const out = {};
    for (const k of ['matte', 'metal']) {
      const list = this.parts[k];
      out[k] = list.length ? mergeGeometries(list, false) : null;
      list.forEach((g) => g.dispose());
      this.parts[k] = [];
    }
    return out;
  }
}
