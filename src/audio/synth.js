// Saf (AudioContext gerektirmeyen) müzik mantığı: makam dizileri, perde hesabı,
// rastgele sayı üreteci, impuls cevabı, ses ayarı. Node'da test edilebilir.

// Perdeler, tampere yarım sesten cent farkıyla sapar (koma yaklaşımı). Kök: Re (D).
export const SCALES = {
  // Hicaz: Re Mib(düşük) Fa#(yüksek) Sol La Sib Do Re
  hicaz: [0, 90, 386, 498, 702, 792, 996, 1200],
  // Nihavent: Re Mi Fa Sol La Sib Do# Re (melodik minör hissi)
  nihavent: [0, 204, 294, 498, 702, 792, 1088, 1200],
};

export const ROOT_HZ = 73.416; // D2

export function centsToRatio(cents) { return Math.pow(2, cents / 1200); }

/** Kök frekanstan, dizi derecesi (oktav taşabilir, negatif olabilir) için Hz. */
export function degreeFreq(scaleName, degree, rootHz = ROOT_HZ) {
  const sc = SCALES[scaleName] || SCALES.hicaz;
  const n = sc.length - 1; // son perde oktavın tekrarı
  const oct = Math.floor(degree / n);
  const idx = ((degree % n) + n) % n;
  return rootHz * Math.pow(2, oct) * centsToRatio(sc[idx]);
}

/** Tohumlu, tekrarlanabilir rastgele sayı üreteci (0..1). */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Melodi yürüyüşü: çoğunlukla komşu perde, bazen sıçrama; [lo,hi] aralığında kalır. */
export function nextDegree(rng, prev, lo, hi) {
  const r = rng();
  let step;
  if (r < 0.34) step = 1; else if (r < 0.68) step = -1;
  else if (r < 0.78) step = 2; else if (r < 0.88) step = -2;
  else if (r < 0.93) step = 0; else step = rng() < 0.5 ? 3 : -3;
  let d = prev + step;
  if (d > hi) d = hi - 1 - Math.floor(rng() * 2);
  if (d < lo) d = lo + 1 + Math.floor(rng() * 2);
  return Math.max(lo, Math.min(hi, d));
}

/** 8 adımlı düm-tek kalıbı (aksak/usul hissi): D=düm, T=tek, t=hafif, .=sus */
export const DEF_PATTERN = ['D', '.', 't', 'T', 'D', '.', 'T', 't'];

export const MOODS = {
  menu:  { scale: 'hicaz',    level: 1.0,  pluck: 0.55, ney: 0.55, def: 0.45, drone: 1.0,  sea: 0.7 },
  game:  { scale: 'nihavent', level: 0.45, pluck: 0.28, ney: 0.22, def: 0.18, drone: 0.8,  sea: 0.5 },
  night: { scale: 'hicaz',    level: 0.38, pluck: 0.12, ney: 0.3,  def: 0.0,  drone: 1.0,  sea: 0.9 },
};

export function moodParams(name) { return MOODS[name] || MOODS.game; }

/** Üretilmiş reverb impulsu: üstel sönen, hafif karanlık gürültü. */
export function makeImpulse(seconds, sampleRate, rng, decay = 3) {
  const len = Math.max(1, Math.floor(seconds * sampleRate));
  const out = new Float32Array(len);
  let lp = 0;
  for (let i = 0; i < len; i++) {
    const env = Math.pow(1 - i / len, decay);
    lp += 0.35 * ((rng() * 2 - 1) - lp); // tek kutuplu alçak geçiren: tiz kısılsın
    out[i] = lp * env;
  }
  return out;
}

// ---- Kalıcı ayar ----
export const STORAGE_KEY = 'muamma.ses';
export const DEFAULT_SETTINGS = { volume: 0.7, muted: false };

export function clamp01(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0;
}

export function parseSettings(raw) {
  try {
    const o = JSON.parse(raw);
    if (!o || typeof o !== 'object') return { ...DEFAULT_SETTINGS };
    return {
      volume: o.volume === undefined ? DEFAULT_SETTINGS.volume : clamp01(o.volume),
      muted: !!o.muted,
    };
  } catch { return { ...DEFAULT_SETTINGS }; }
}

export function serializeSettings(s) {
  return JSON.stringify({ volume: clamp01(s.volume), muted: !!s.muted });
}

/** Ana kazanç: kullanıcı sesi * mood seviyesi * güvenli tavan (kırpılmayı önler). */
export const MASTER_CEIL = 0.5;
export function masterGain(settings, mood) {
  if (settings.muted) return 0;
  return clamp01(settings.volume) * moodParams(mood).level * MASTER_CEIL;
}
