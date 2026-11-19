// Música (pistas generadas con Suno, con fundido cruzado) + efectos sintetizados con WebAudio.
import { G } from './game.js';

const TRACKS = {
  menu: 'assets/music/menu.mp3',
  casa: 'assets/music/casa.mp3',
  super: 'assets/music/super.mp3',
  trabajo: 'assets/music/trabajo.mp3',
  restaurante: 'assets/music/restaurante.mp3',
  noche: 'assets/music/noche.mp3',
};

let ctx = null, master = null, musicBus = null, sfxBus = null;
const players = {};
let current = null;

export function initAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain(); master.connect(ctx.destination);
  musicBus = ctx.createGain(); musicBus.connect(master);
  sfxBus = ctx.createGain(); sfxBus.connect(master);
  applyVolumes();
  // iOS: desbloquear con un buffer vacío
  const b = ctx.createBuffer(1, 1, 22050); const s = ctx.createBufferSource(); s.buffer = b; s.connect(ctx.destination); s.start(0);
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) { ctx.suspend(); } else { ctx.resume(); }
  });
}
export function applyVolumes() {
  if (!ctx || !G.state) return;
  musicBus.gain.value = G.state.settings.music * 0.55;
  sfxBus.gain.value = G.state.settings.sfx * 0.7;
}

function getPlayer(name) {
  if (players[name]) return players[name];
  const a = new Audio(TRACKS[name]);
  a.loop = true; a.preload = 'auto'; a.crossOrigin = 'anonymous';
  a.setAttribute('playsinline', '');
  const src = ctx.createMediaElementSource(a);
  const g = ctx.createGain(); g.gain.value = 0;
  src.connect(g); g.connect(musicBus);
  a.addEventListener('error', () => console.warn('Música no disponible:', name));
  players[name] = { a, g };
  return players[name];
}

export function playMusic(name) {
  if (!ctx || !TRACKS[name] || current === name) return;
  const t = ctx.currentTime;
  if (current && players[current]) {
    const old = players[current];
    old.g.gain.cancelScheduledValues(t); old.g.gain.setValueAtTime(old.g.gain.value, t); old.g.gain.linearRampToValueAtTime(0, t + 1.6);
    setTimeout(() => { if (current !== Object.keys(players).find((k) => players[k] === old)) old.a.pause(); }, 1800);
  }
  current = name;
  const p = getPlayer(name);
  p.a.play().catch(() => {});
  p.g.gain.cancelScheduledValues(t); p.g.gain.setValueAtTime(p.g.gain.value, t); p.g.gain.linearRampToValueAtTime(1, t + 1.6);
}
export function duckMusic(on) {
  if (!ctx) return;
  const t = ctx.currentTime;
  musicBus.gain.cancelScheduledValues(t);
  musicBus.gain.linearRampToValueAtTime((G.state?.settings.music ?? 0.7) * 0.55 * (on ? 0.35 : 1), t + 0.4);
}
export function currentTrack() { return current; }
export function musicElement(name) { return ctx ? getPlayer(name).a : null; }

// ---------- Efectos ----------
function tone(freq, dur, type = 'sine', vol = 0.3, slide = 0, delay = 0) {
  if (!ctx) return;
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur, vol = 0.2, freq = 1200) {
  if (!ctx) return;
  const t = ctx.currentTime, n = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = ctx.createBufferSource(); s.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq;
  const g = ctx.createGain(); g.gain.value = vol;
  s.connect(f); f.connect(g); g.connect(sfxBus); s.start(t);
}
let lastBlip = 0;
export function sfx(name) {
  if (!ctx) return;
  switch (name) {
    case 'click': tone(660, 0.06, 'triangle', 0.15); break;
    case 'select': tone(520, 0.07, 'triangle', 0.18); tone(780, 0.09, 'triangle', 0.15, 0, 0.05); break;
    case 'blip': { const n = performance.now(); if (n - lastBlip > 45) { lastBlip = n; tone(900 + Math.random() * 120, 0.03, 'square', 0.025); } break; }
    case 'coin': tone(988, 0.08, 'square', 0.12); tone(1319, 0.18, 'square', 0.12, 0, 0.07); break;
    case 'fenix': tone(660, 0.12, 'triangle', 0.2); tone(880, 0.12, 'triangle', 0.2, 0, 0.1); tone(1320, 0.3, 'triangle', 0.2, 0, 0.2); break;
    case 'good': tone(700, 0.08, 'sine', 0.2); tone(1050, 0.14, 'sine', 0.18, 0, 0.06); break;
    case 'bad': tone(300, 0.18, 'sawtooth', 0.12, -120); break;
    case 'error': tone(220, 0.12, 'square', 0.1); break;
    case 'swipe': noise(0.12, 0.12, 2200); break;
    case 'scrub': noise(0.08, 0.08, 900); break;
    case 'pop': tone(500, 0.06, 'sine', 0.2, 400); break;
    case 'catch': tone(620, 0.06, 'triangle', 0.2, 300); break;
    case 'heart': tone(784, 0.1, 'sine', 0.18); tone(1047, 0.2, 'sine', 0.16, 0, 0.09); break;
    case 'heartbreak': tone(400, 0.2, 'sine', 0.18, -180); tone(300, 0.3, 'sine', 0.14, -120, 0.15); break;
    case 'door': noise(0.15, 0.1, 400); tone(180, 0.12, 'sine', 0.1); break;
    case 'step': noise(0.04, 0.03, 600); break;
    case 'chop': noise(0.05, 0.25, 3000); tone(200, 0.04, 'square', 0.08); break;
    case 'sizzle': noise(0.4, 0.1, 5000); break;
    case 'note1': tone(523, 0.15, 'triangle', 0.22); break;
    case 'note2': tone(659, 0.15, 'triangle', 0.22); break;
    case 'note3': tone(784, 0.15, 'triangle', 0.22); break;
    case 'fanfare': [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.16, 0, i * 0.09)); break;
    case 'tick': tone(1400, 0.03, 'square', 0.05); break;
  }
}
