// Satır içi SVG simgeler (24x24, çizgi stili, currentColor). Dış kaynak yok.
const P = {
  eye: '<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M3 3l18 18"/><path d="M10.6 6.2A10 10 0 0 1 12 6c6.4 0 10 6 10 6a17 17 0 0 1-3.2 3.9M6.3 7.6C3.6 9.4 2 12 2 12s3.6 6 10 6c1.5 0 2.8-.3 4-.8"/>',
  lens: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/>',
  speech: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9.5h8M8 12.5h5"/>',
  puzzle: '<path d="M9 3h3v3a2 2 0 1 0 4 0V3h3v6h-3a2 2 0 1 0 0 4h3v8H9v-3a2 2 0 1 0-4 0v3H3V9h6z" transform="scale(.92) translate(1 .5)"/>',
  shield: '<path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6z"/><path d="M9 12l2.2 2.2L15.5 10"/>',
  star: '<path d="M12 2.8l2.7 6 6.5.6-4.9 4.3 1.5 6.4L12 16.8 6.2 20.1l1.5-6.4L2.8 9.4l6.5-.6z"/>',
  bolt: '<path d="M13 2L4.5 13.5H11L10 22l8.5-11.5H12z"/>',
  notes: '<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4M9 12h7M9 16h7"/>',
  hourglass: '<path d="M6 3h12M6 21h12M7 3c0 5 5 6 5 9s-5 4-5 9M17 3c0 5-5 6-5 9s5 4 5 9"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  skull: '<path d="M12 3C7.5 3 5 6 5 9.5c0 2.2 1 3.7 2.5 4.6V18h9v-3.9c1.5-.9 2.5-2.4 2.5-4.6C19 6 16.5 3 12 3z"/><circle cx="9.5" cy="10" r="1.2"/><circle cx="14.5" cy="10" r="1.2"/><path d="M10.5 18v2.5M13.5 18v2.5"/>',
  gavel: '<path d="M14 4l6 6M10.5 7.5l6 6M12 6l-6 6 3 3 6-6M3 21l7-7"/>',
  folder: '<path d="M3 6a1 1 0 0 1 1-1h5l2 2.5h9a1 1 0 0 1 1 1V19a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c.8-4.2 4-6 8-6s7.2 1.8 8 6"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.2-5.4 6.5-5.4s5.9 1.8 6.5 5.4"/><path d="M16 5a3.2 3.2 0 0 1 0 6.2M18.5 14.8c1.8.8 2.8 2.6 3 5.2"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',
  check: '<path d="M4 12.5l5 5L20 6.5"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  walk: '<circle cx="13" cy="4.5" r="1.8"/><path d="M10 21l2-6-2.5-2.5 1-4.5 3-.5 2 3 3 1M9.5 8.5L7 12M12 15l3.5 2.5.5 3.5"/>',
  footprint: '<path d="M8 3c2 0 3 2 3 5s-1 4-3 4-3-1-3-3 1-6 3-6zM9 15h-3c-.5 2 .5 5 2 5s2.5-2 1-5zM17 8c2 0 3 2 3 5s-1 4-3 4-3-1-3-3 1-6 3-6z"/>',
  scent: '<path d="M9 3h6v3H9zM8 6h8v4a5 5 0 0 1-8 0z"/><path d="M12 13v8M9 21h6"/>',
  key: '<circle cx="8" cy="12" r="4"/><path d="M12 12h9M18 12v4M15 12v3"/>',
  palette: '<path d="M12 3a9 9 0 1 0 0 18c1.5 0 2-1 1.5-2.2-.6-1.4.2-2.8 1.8-2.8H18a3 3 0 0 0 3-3A9 9 0 0 0 12 3z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="15" cy="7.5" r="1"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.6 2.6 0 1 1 3.6 2.4c-.8.4-1.1.9-1.1 1.8M12 17h.01"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/>',
  dream: '<path d="M7 18a4 4 0 0 1-.5-8A6 6 0 0 1 18 9.5a4 4 0 0 1 0 8.5z"/>',
  vote: '<rect x="4" y="11" width="16" height="9" rx="1.5"/><path d="M8 11V4h8v7M10.5 7.5l1.2 1.2 2.3-2.4"/>',
  dot: '<circle cx="12" cy="12" r="4"/>',
};

export function ico(name, cls = '') {
  const body = P[name] || P.dot;
  return `<svg class="ico ${cls}" viewBox="0 0 24 24" width="1.1em" height="1.1em" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
}

export const IZ_ICON = { ayakkabi: 'footprint', koku: 'scent', nesne: 'key', renk: 'palette' };
export const ICON_NAMES = Object.keys(P);
