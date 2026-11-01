// Tahta düzlemindeki bir noktadan (840x440 uzayı) en yakın mekânı bulur. three'siz, test edilebilir.
import { LOCATIONS } from '../../game/data/locations.js';

export function nearestLocation(x, y, radius = 22, only = null) {
  let best = null;
  let bd = radius * radius;
  for (const [id, L] of Object.entries(LOCATIONS)) {
    if (only && !only.includes(id)) continue;
    const d = (L.x - x) ** 2 + (L.y - y) ** 2;
    if (d <= bd) { bd = d; best = id; }
  }
  return best;
}
