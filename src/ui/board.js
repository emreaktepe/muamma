// Oyun tahtası: 16 mekân, yollar, piyonlar, tılsımlar ve olay jetonları (SVG).
import { LOCATIONS, TILSIMLAR } from '../game/data/locations.js';
import { edges, isOpen, locName, era } from '../game/engine.js';

const C = { navy: '#14213D', turq: '#1E8C93', coral: '#B5332E', gold: '#C9A43A', parch: '#EFE3C8', ink: '#1A1A1A' };
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function star(x, y, r, fill, stroke = 'none') {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (Math.PI * i) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    pts.push(`${(x + rr * Math.cos(a)).toFixed(1)},${(y + rr * Math.sin(a)).toFixed(1)}`);
  }
  return `<polygon points="${pts.join(' ')}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`;
}

export function boardSVG(s, { reach = {}, currentId = null, showRuh = true } = {}) {
  const out = [];
  out.push(`<svg class="board" viewBox="0 0 840 440" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="İstanbul oyun tahtası">`);
  out.push(`<defs>
    <pattern id="waves" width="44" height="26" patternUnits="userSpaceOnUse"><path d="M4 13 q6 -5 12 0 q6 5 12 0" fill="none" stroke="#24375f" stroke-width="1.4"/></pattern>
    <radialGradient id="glow"><stop offset="0" stop-color="${C.gold}" stop-opacity=".55"/><stop offset="1" stop-color="${C.gold}" stop-opacity="0"/></radialGradient>
  </defs>`);
  out.push(`<rect width="840" height="440" fill="${C.navy}"/><rect width="840" height="440" fill="url(#waves)"/>`);
  const land = `fill="${C.parch}" stroke="#B9A57A" stroke-width="2"`;
  out.push(`<path d="M0 196 L300 184 L360 200 L432 214 L500 252 L512 300 L470 352 L398 394 L300 410 L170 414 L0 404 Z" ${land}/>`);
  out.push(`<path d="M0 0 L590 0 L596 30 L560 90 L528 160 L470 178 L400 168 L320 166 L200 170 L0 174 Z" ${land}/>`);
  out.push(`<path d="M840 0 L650 0 L640 60 L668 140 L650 220 L660 300 L640 380 L700 440 L840 440 Z" ${land}/>`);
  for (const [x, y, t, r] of [[150, 186, 'HALİÇ', 0], [612, 160, 'BOĞAZ', -78], [560, 424, 'MARMARA', 0]]) {
    out.push(`<text x="${x}" y="${y}" class="water" text-anchor="middle" transform="rotate(${r} ${x} ${y})">${t}</text>`);
  }
  // yollar
  for (const e of edges(s)) {
    const A = LOCATIONS[e.a], B = LOCATIONS[e.b];
    if (e.kind === 'land') out.push(`<line x1="${A.x}" y1="${A.y}" x2="${B.x}" y2="${B.y}" stroke="#8C7550" stroke-width="2" stroke-dasharray="2 5" stroke-linecap="round"/>`);
    else {
      const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2 - (e.kind === 'rail' ? -24 : 16);
      const col = e.kind === 'rail' ? '#d9a441' : C.turq;
      out.push(`<path d="M${A.x} ${A.y} Q${mx} ${my} ${B.x} ${B.y}" fill="none" stroke="${col}" stroke-width="2" stroke-dasharray="${e.kind === 'rail' ? '10 4' : '7 5'}"/>`);
    }
  }
  // mekânlar (etiketler en sonda, piyonların üstünde çizilir)
  const labels = [];
  for (const [id, L] of Object.entries(LOCATIONS)) {
    const open = isOpen(s, id);
    const canGo = id in reach;
    const [dx, dy, anc] = L.label;
    out.push(`<g class="node${canGo ? ' reach' : ''}${open ? '' : ' closed'}" data-act="node" data-loc="${id}">`);
    if (canGo) out.push(`<circle cx="${L.x}" cy="${L.y}" r="26" fill="url(#glow)"/>`);
    out.push(`<circle cx="${L.x}" cy="${L.y}" r="11" fill="${open ? C.parch : '#9b9488'}" stroke="${open ? C.gold : '#6b665e'}" stroke-width="3" ${open ? '' : 'stroke-dasharray="3 3"'}/>`);
    if (L.tilsim) {
      if (s.tilsim[id]) out.push(star(L.x, L.y, 6.5, s.protectedTilsim[id] ? C.gold : C.coral));
      else out.push(star(L.x, L.y, 6.5, 'none', '#8a8173'));
    }
    const name = open ? locName(s, id) : 'Henüz yok';
    labels.push(`<text x="${L.x + dx}" y="${L.y + dy}" text-anchor="${anc}" class="lbl${L.island ? ' light' : ''}${open ? '' : ' dim'}">${esc(name)}</text>`);
    if (L.tilsim) out.push(`<title>${esc(name)} — tılsım: ${esc(TILSIMLAR[id])}${s.tilsim[id] ? '' : ' (çalındı)'}</title>`);
    else out.push(`<title>${esc(name)}</title>`);
    out.push('</g>');
    // jetonlar
    let ty = L.y - 30;
    if (s.guards[id] !== undefined) { out.push(`<g class="tok"><rect x="${L.x + 12}" y="${ty}" width="14" height="16" rx="3" fill="${C.turq}" stroke="${C.parch}"/><title>Nöbet</title></g>`); }
    if (s.photos[id] !== undefined) { out.push(`<g class="tok"><rect x="${L.x - 26}" y="${ty}" width="16" height="12" rx="2" fill="${C.ink}" stroke="${C.gold}"/><circle cx="${L.x - 18}" cy="${ty + 6}" r="3" fill="${C.gold}"/><title>Fotoğraf</title></g>`); }
  }
  // cesetler
  for (const b of s.bodies) {
    const L = LOCATIONS[b.loc];
    out.push(`<g class="tok"><path d="M${L.x - 22} ${L.y + 8} l10 10 m0 -10 l-10 10" stroke="${C.coral}" stroke-width="3.5" stroke-linecap="round"/><title>Ceset${b.examined ? ` (iz: ${esc(b.iz.val)})` : ' — incelenmedi'}</title></g>`);
  }
  // piyonlar
  const byLoc = {};
  for (const p of s.players) {
    if (p.status === 'surgun' || p.status === 'ifsa') continue;
    if (p.status === 'ruh' && !showRuh) continue;
    (byLoc[p.loc] ||= []).push(p);
  }
  for (const [loc, ps] of Object.entries(byLoc)) {
    const L = LOCATIONS[loc];
    ps.forEach((p, i) => {
      const n = ps.length;
      const ang = (-Math.PI / 2) + (i - (n - 1) / 2) * 0.62;
      const r = n === 1 ? 0 : 30;
      const x = n === 1 ? L.x + 24 : L.x + r * Math.cos(ang) + 2;
      const y = n === 1 ? L.y - 18 : L.y - 6 + r * Math.sin(ang);
      const ruh = p.status === 'ruh';
      const cur = p.id === currentId;
      out.push(`<g class="pawn${ruh ? ' ruh' : ''}${cur ? ' cur' : ''}" opacity="${ruh ? 0.45 : 1}">
        <clipPath id="cp${p.id}"><circle cx="${x}" cy="${y}" r="12"/></clipPath>
        <image href="assets/avatar_${p.charId}.webp" x="${x - 12}" y="${y - 12}" width="24" height="24" clip-path="url(#cp${p.id})"/>
        <circle cx="${x}" cy="${y}" r="12.5" fill="none" stroke="${cur ? C.gold : ruh ? C.turq : C.ink}" stroke-width="${cur ? 3.5 : 2}" ${ruh ? 'stroke-dasharray="3 2"' : ''}/>
        <title>${esc(p.name)}${ruh ? ' (Ruh)' : ''}</title></g>`);
    });
  }
  out.push(`<g class="labels">${labels.join('')}</g>`);
  out.push(`<text x="828" y="20" text-anchor="end" class="eralbl">${esc(era(s).perde)} · ${esc(era(s).year)}</text>`);
  out.push('</svg>');
  return out.join('');
}
