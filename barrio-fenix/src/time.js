// Reloj del juego: hora local real + desfase guardado (siestas / dormir).
import { G, bus, clamp, lerp } from './game.js';

const HOUR = 3600000;

export function now() {
  return new Date(Date.now() + (G.state ? G.state.timeOffset : 0));
}
export function hourFloat(d = now()) {
  return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
}
// Día de juego: cambia a las 06:00 locales.
export function dayIndex(d = now()) {
  const local = d.getTime() - d.getTimezoneOffset() * 60000 - 6 * HOUR;
  return Math.floor(local / 86400000);
}
export function clockText(d = now()) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
export function weekdayText(d = now()) { return DIAS[d.getDay()]; }

// Fases según el diseño: amanecer 07-08, día 08-18, atardecer 18-20, noche 20-07
export function phase(h = hourFloat()) {
  if (h >= 7 && h < 8) return 'amanecer';
  if (h >= 8 && h < 18) return 'dia';
  if (h >= 18 && h < 20) return 'atardecer';
  return 'noche';
}
export const PHASE_LABEL = { amanecer: 'Amanecer', dia: 'Día', atardecer: 'Atardecer', noche: 'Noche' };
export function isNight(h = hourFloat()) { return h >= 20 || h < 7; }

// "Luz del día" 0..1 continua: 0 de noche, 1 de día.
export function daylight(h = hourFloat()) {
  if (h >= 8 && h < 18) return 1;
  if (h >= 7 && h < 8) return h - 7;
  if (h >= 18 && h < 20) return 1 - (h - 18) / 2;
  return 0;
}

// ¿Está abierto un horario [open, close)? Admite cierres después de medianoche.
export function inHours(h, open, close) {
  if (open <= close) return h >= open && h < close;
  return h >= open || h < close;
}

// Avanza el reloj `hours` horas.
export function skipHours(hours) {
  G.state.timeOffset += hours * HOUR;
  bus.emit('time:skip', { hours });
}
// Avanza hasta la próxima vez que sean las `targetHour` (p.ej. 8 → mañana a las 08:00)
export function skipUntil(targetHour) {
  const h = hourFloat();
  let diff = targetHour - h;
  if (diff <= 0.05) diff += 24;
  skipHours(diff);
  return diff;
}
export function resetToRealTime() { G.state.timeOffset = 0; bus.emit('time:skip', { hours: 0 }); }

// Paleta del cielo interpolada en función de la hora.
const KEYS = [
  // h, cielo arriba, horizonte, sol color, intensidad sol, ambiente, niebla
  [0, 0x0b1030, 0x1b2350, 0x8aa0ff, 0.22, 0x2a3060],
  [5.5, 0x0e1438, 0x2a2a5a, 0x8aa0ff, 0.2, 0x2a3060],
  [7, 0x3b4a8a, 0xffa27a, 0xffb07a, 0.6, 0x8a7a9a],
  [8, 0x5fa8ff, 0xffd9b0, 0xfff0d8, 1.25, 0xc8d8f0],
  [12, 0x4aa0ff, 0xbfe4ff, 0xffffff, 1.45, 0xd8e8ff],
  [17, 0x5c9cf0, 0xffe0b8, 0xfff0d0, 1.25, 0xd0d8ee],
  [18.5, 0x6a6ac8, 0xff9a6a, 0xff9a5a, 0.85, 0xb08aa0],
  [20, 0x241e5a, 0x7a3a6a, 0xa080ff, 0.35, 0x40386a],
  [21.5, 0x0d1236, 0x1f2452, 0x8aa0ff, 0.22, 0x2a3060],
  [24, 0x0b1030, 0x1b2350, 0x8aa0ff, 0.22, 0x2a3060],
];
function lerpColor(a, b, t) {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  return (Math.round(lerp(ar, br, t)) << 16) | (Math.round(lerp(ag, bg, t)) << 8) | Math.round(lerp(ab, bb, t));
}
export function skyAt(h = hourFloat()) {
  let i = 0;
  while (i < KEYS.length - 2 && KEYS[i + 1][0] <= h) i++;
  const a = KEYS[i], b = KEYS[i + 1];
  const t = clamp((h - a[0]) / (b[0] - a[0]), 0, 1);
  return {
    top: lerpColor(a[1], b[1], t),
    horizon: lerpColor(a[2], b[2], t),
    sun: lerpColor(a[3], b[3], t),
    sunIntensity: lerp(a[4], b[4], t),
    ambient: lerpColor(a[5], b[5], t),
  };
}
