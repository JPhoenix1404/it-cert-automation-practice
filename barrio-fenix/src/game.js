// Contexto global compartido y bus de eventos.
export const G = {
  state: null,      // partida guardada (ver state.js)
  scene: null, camera: null, renderer: null,
  world: null, player: null, npcs: null,
  ui: null, audio: null, quests: null,
  busy: false,      // true mientras hay diálogo/minijuego/menú modal
  zone: 'casa',
};

const listeners = new Map();
export const bus = {
  on(type, fn) {
    if (!listeners.has(type)) listeners.set(type, new Set());
    listeners.get(type).add(fn);
    return () => listeners.get(type).delete(fn);
  },
  emit(type, payload = {}) {
    const set = listeners.get(type);
    if (set) for (const fn of [...set]) { try { fn(payload); } catch (e) { console.error('[bus]', type, e); } }
    const any = listeners.get('*');
    if (any) for (const fn of [...any]) { try { fn({ type, ...payload }); } catch (e) { console.error('[bus*]', e); } }
  },
};

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const rand = (a, b) => a + Math.random() * (b - a);
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const shuffle = (arr) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const fmt = (n) => Math.round(n).toLocaleString('es-ES');

// Nota a partir de un ratio 0..1
export function gradeFrom(ratio) {
  if (ratio >= 0.92) return 'S';
  if (ratio >= 0.78) return 'A';
  if (ratio >= 0.6) return 'B';
  if (ratio >= 0.4) return 'C';
  return 'D';
}
export const GRADE_ORDER = { S: 5, A: 4, B: 3, C: 2, D: 1 };
export const gradeAtLeast = (g, min) => (GRADE_ORDER[g] || 0) >= GRADE_ORDER[min];
