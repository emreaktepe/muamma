// Doku koordinatındaki (u,v: 0..1) bir noktadan en yakın mekânı bulur. three'siz, test edilebilir.
import { LOC_UV } from './model.js';

// radius: doku uzayında (0.04 ~ görselde 50 px)
export function nearestLocation(u, v, radius = 0.04, only = null) {
  let best = null;
  let bd = radius * radius;
  for (const [id, m] of Object.entries(LOC_UV)) {
    if (only && !only.includes(id)) continue;
    const d = (m.u - u) ** 2 + (m.v - v) ** 2;
    if (d <= bd) { bd = d; best = id; }
  }
  return best;
}
