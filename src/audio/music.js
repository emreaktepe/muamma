// Üretken İstanbul müziği: Web Audio ile sentezlenir, ses dosyası yoktur.
// Dışa açık API: start, stop, setVolume, toggleMute, isMuted, setMood. window.MUAMMA_audio.
import './audio.css';
import {
  degreeFreq, mulberry32, nextDegree, DEF_PATTERN, moodParams, makeImpulse,
  STORAGE_KEY, parseSettings, serializeSettings, clamp01, masterGain,
} from './synth.js';

const LOOKAHEAD = 0.35;   // sn
const TICK_MS = 120;
const STEP = 0.42;        // sn; sekizlik adım (~71 bpm)

let settings = load();
let mood = 'menu';
let ctx = null, nodes = null, timer = null, running = false;
let nextTime = 0, step = 0, degree = 7, rng = mulberry32((Date.now() & 0xffffffff) ^ 0x9e3779b9);
let btn = null;

function load() {
  try { return parseSettings(localStorage.getItem(STORAGE_KEY)); } catch { return parseSettings(null); }
}
function save() { try { localStorage.setItem(STORAGE_KEY, serializeSettings(settings)); } catch { /* yoksay */ } }

function noiseBuffer(c, seconds) {
  const b = c.createBuffer(1, Math.floor(c.sampleRate * seconds), c.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = rng() * 2 - 1;
  return b;
}

function build() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return false;
  ctx = new AC();
  const master = ctx.createGain(); master.gain.value = 0;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -20; comp.knee.value = 20; comp.ratio.value = 4;
  comp.attack.value = 0.01; comp.release.value = 0.3;
  const bus = ctx.createGain(); bus.gain.value = 0.8;       // kuru
  const send = ctx.createGain(); send.gain.value = 0.55;    // reverb gönderimi
  const verb = ctx.createConvolver();
  const imp = makeImpulse(4.5, ctx.sampleRate, rng);
  const ib = ctx.createBuffer(2, imp.length, ctx.sampleRate);
  ib.getChannelData(0).set(imp);
  ib.getChannelData(1).set(makeImpulse(4.5, ctx.sampleRate, rng));
  verb.buffer = ib;
  const wet = ctx.createGain(); wet.gain.value = 0.9;
  bus.connect(comp); bus.connect(send); send.connect(verb); verb.connect(wet); wet.connect(comp);
  comp.connect(master); master.connect(ctx.destination);
  nodes = { master, bus, noise: noiseBuffer(ctx, 2), drone: null, sea: null };
  startDrone();
  startSea();
  return true;
}

function startDrone() {
  const c = ctx, out = c.createGain(); out.gain.value = 0;
  const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 380; lp.Q.value = 0.7;
  const lfo = c.createOscillator(); lfo.frequency.value = 0.07;
  const lfoG = c.createGain(); lfoG.gain.value = 120; lfo.connect(lfoG); lfoG.connect(lp.frequency); lfo.start();
  [[1, -4], [1, 5], [1.5, 0], [2, 3]].forEach(([mul, det], i) => {
    const o = c.createOscillator(); o.type = i < 2 ? 'sawtooth' : 'sine';
    o.frequency.value = degreeFreq('hicaz', 0) * mul; o.detune.value = det;
    const g = c.createGain(); g.gain.value = i < 2 ? 0.07 : 0.05;
    o.connect(g); g.connect(lp); o.start();
  });
  lp.connect(out); out.connect(nodes.bus);
  nodes.drone = out;
}

function startSea() {
  const c = ctx, src = c.createBufferSource(); src.buffer = nodes.noise; src.loop = true;
  const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500;
  const g = c.createGain(); g.gain.value = 0;
  const lfo = c.createOscillator(); lfo.frequency.value = 0.11;
  const lfoG = c.createGain(); lfoG.gain.value = 0.02;
  lfo.connect(lfoG); lfoG.connect(g.gain); lfo.start();
  src.connect(lp); lp.connect(g); g.connect(nodes.bus); src.start();
  nodes.sea = g;
}

function applyMood(ramp = 2.5) {
  if (!ctx) return;
  const t = ctx.currentTime, p = moodParams(mood);
  nodes.master.gain.cancelScheduledValues(t);
  nodes.master.gain.setTargetAtTime(masterGain(settings, mood), t, ramp / 3);
  nodes.drone.gain.setTargetAtTime(0.5 * p.drone, t, 1.5);
  nodes.sea.gain.setTargetAtTime(0.05 * p.sea, t, 1.5);
}

// ---- sesler ----
function pluck(t, freq, vel = 1) {
  const c = ctx;
  const o1 = c.createOscillator(), o2 = c.createOscillator();
  o1.type = 'sawtooth'; o2.type = 'triangle';
  o1.frequency.value = freq; o2.frequency.value = freq * 2; o1.detune.value = rng() * 6 - 3;
  const f = c.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 2;
  f.frequency.setValueAtTime(Math.min(freq * 7, 5000), t);
  f.frequency.exponentialRampToValueAtTime(Math.max(freq * 1.2, 200), t + 0.5);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.16 * vel, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
  const g2 = c.createGain(); g2.gain.value = 0.35;
  o1.connect(f); o2.connect(g2); g2.connect(f); f.connect(g); g.connect(nodes.bus);
  o1.start(t); o2.start(t); o1.stop(t + 1.7); o2.stop(t + 1.7);
}

function ney(t, freq, dur) {
  const c = ctx;
  const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = freq;
  const vib = c.createOscillator(); vib.frequency.value = 4.8 + rng();
  const vg = c.createGain(); vg.gain.setValueAtTime(0, t); vg.gain.linearRampToValueAtTime(freq * 0.008, t + dur * 0.6);
  vib.connect(vg); vg.connect(o.frequency);
  const n = c.createBufferSource(); n.buffer = nodes.noise; n.loop = true;
  const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = freq * 2; bp.Q.value = 6;
  const ng = c.createGain(); ng.gain.value = 0.35;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.1, t + 0.35);
  g.gain.setTargetAtTime(0.0001, t + dur, 0.35);
  o.connect(g); n.connect(bp); bp.connect(ng); ng.connect(g); g.connect(nodes.bus);
  o.start(t); vib.start(t); n.start(t);
  const end = t + dur + 2;
  o.stop(end); vib.stop(end); n.stop(end);
}

function def(t, kind) {
  const c = ctx, n = c.createBufferSource(); n.buffer = nodes.noise;
  const f = c.createBiquadFilter(), g = c.createGain();
  const low = kind === 'D';
  f.type = low ? 'lowpass' : 'bandpass';
  f.frequency.value = low ? 160 : 2200; f.Q.value = low ? 1 : 1.5;
  const v = kind === 'D' ? 0.5 : kind === 'T' ? 0.22 : 0.1;
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + (low ? 0.25 : 0.1));
  n.connect(f); f.connect(g); g.connect(nodes.bus);
  n.start(t, rng() * 1.5, 0.3);
}

function gull(t) {
  const c = ctx, o = c.createOscillator(), g = c.createGain();
  o.type = 'sine';
  const f0 = 1500 + rng() * 400;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(f0 * 0.6, t + 0.5);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.02, t + 0.08);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
  o.connect(g); g.connect(nodes.bus); o.start(t); o.stop(t + 0.7);
}

function scheduleStep(t) {
  const p = moodParams(mood), s = step % 8;
  if (step % 16 === 0 && rng() < p.ney) { // uzun ney cümlesi
    const nd = nextDegree(rng, degree, 8, 13);
    ney(t, degreeFreq(p.scale, nd), STEP * (4 + Math.floor(rng() * 5)));
  }
  if (rng() < p.pluck * (s % 2 === 0 ? 1.2 : 0.7)) {
    degree = nextDegree(rng, degree, 4, 12);
    pluck(t, degreeFreq(p.scale, degree), 0.7 + rng() * 0.5);
  }
  const k = DEF_PATTERN[s];
  if (k !== '.' && rng() < p.def) def(t, k);
  if (step % 24 === 7 && rng() < 0.35 * p.sea) gull(t + rng());
  step++;
}

function tick() {
  if (!ctx || ctx.state !== 'running') return;
  if (nextTime < ctx.currentTime - 1) nextTime = ctx.currentTime + 0.05; // sekme uykudan döndü
  while (nextTime < ctx.currentTime + LOOKAHEAD) { scheduleStep(nextTime); nextTime += STEP; }
}

// ---- API ----
export function start() {
  if (settings.muted) return false;
  if (!ctx && !build()) return false;
  if (ctx.state === 'suspended') ctx.resume();
  if (!running) {
    running = true; nextTime = ctx.currentTime + 0.2;
    timer = setInterval(tick, TICK_MS);
  }
  applyMood();
  return true;
}

export function stop() {
  running = false; clearInterval(timer); timer = null;
  if (ctx) {
    const t = ctx.currentTime;
    nodes.master.gain.cancelScheduledValues(t);
    nodes.master.gain.setTargetAtTime(0, t, 0.15);
    setTimeout(() => { if (!running && ctx) ctx.suspend(); }, 900);
  }
}

export function setVolume(v) {
  settings.volume = clamp01(v); save(); applyMood(0.3); syncBtn();
}

export function isMuted() { return settings.muted; }

export function toggleMute() {
  settings.muted = !settings.muted; save();
  if (settings.muted) stop(); else start();
  syncBtn();
  return settings.muted;
}

export function setMood(m) {
  if (!['menu', 'game', 'night'].includes(m) || m === mood) return;
  mood = m; applyMood();
}

// ---- düğme ve otomatik başlatma ----
function syncBtn() {
  if (!btn) return;
  const m = settings.muted;
  btn.textContent = m ? '🔇' : '🔊';
  btn.setAttribute('aria-pressed', String(m));
  const label = m ? 'Müziği aç' : 'Müziği kapat';
  btn.setAttribute('aria-label', label); btn.title = label;
}

let slider = null;
function mountBtn() {
  if (btn || typeof document === 'undefined' || !document.body) return;
  const box = document.createElement('div');
  box.className = 'audio-box';
  slider = document.createElement('input');
  slider.type = 'range'; slider.min = '0'; slider.max = '100'; slider.step = '5';
  slider.className = 'audio-vol'; slider.setAttribute('aria-label', 'Müzik sesi');
  slider.value = String(Math.round((settings.volume ?? 1) * 100));
  slider.addEventListener('input', () => {
    setVolume(Number(slider.value) / 100);
    if (settings.muted && Number(slider.value) > 0) toggleMute();
  });
  btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'audio-fab';
  btn.addEventListener('click', (e) => { e.stopPropagation(); toggleMute(); });
  box.append(slider, btn);
  document.body.appendChild(box);
  syncBtn();
}

function init() {
  if (typeof window === 'undefined') return;
  window.MUAMMA_audio = { start, stop, setVolume, toggleMute, isMuted, setMood };
  mountBtn();
  const first = () => {
    window.removeEventListener('pointerdown', first, true);
    window.removeEventListener('keydown', first, true);
    start();
  };
  window.addEventListener('pointerdown', first, true);
  window.addEventListener('keydown', first, true);
}

if (typeof document !== 'undefined') {
  if (document.body) init(); else document.addEventListener('DOMContentLoaded', init, { once: true });
}
