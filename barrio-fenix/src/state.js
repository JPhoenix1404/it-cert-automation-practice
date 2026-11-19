// Estado de la partida + guardado en localStorage.
import { G, bus, clamp } from './game.js';
import { CHAR_ORDER } from './data/characters.js';
import { UPGRADES } from './data/items.js';
import { dayIndex, now } from './time.js';

const KEY = 'barriofenix.save.v1';
export const ATTRS = { carisma: 'Carisma', destreza: 'Destreza', concentracion: 'Concentración', cocina: 'Cocina' };

export function newState(player) {
  const rel = {};
  for (const id of CHAR_ORDER) rel[id] = { aff: 0, state: 'desconocido', dates: 0, lastTalkDay: -1, lastGiftDay: -1, lastDateDay: -1, suspicion: 0, exUntil: -1, lastTone: null, lastToneDay: -1, facts: [], friendMilestone: false, talks: 0, usedTopics: [] };
  return {
    version: 1,
    created: Date.now(),
    player: {
      name: 'Alex', gender: 'm', skin: '#f1d2b6', hair: 'short', hairColor: '#2b2220', eyes: '#5a3a2a', pref: 'women',
      outfit: { set: 'ini_casual', top: null, bottom: null, shoes: null }, ...player,
      pos: [-22, 6], title: null,
    },
    deuros: 60, fenixios: 0, energy: 100,
    attrs: { carisma: 1, destreza: 1, concentracion: 1, cocina: 1 },
    attrXp: { carisma: 0, destreza: 0, concentracion: 0, cocina: 0 },
    buffs: [],
    timeOffset: 0,
    unlocked: { casa: true, super: false, trabajo: false, restaurante: false },
    upgrades: {},
    inventory: { onigiri: 2, cafe: 1 },
    wardrobe: ['ini_casual', 'ini_sport', 'ini_smart'],
    collections: {},
    home: { windowsDay: -99, floorDay: -99 },
    job: null, // { id, rank, shiftsAtRank, shiftsDay, shiftsToday }
    interviewDone: false,
    rel,
    partner: null, spouse: null, engaged: null,
    quests: {},
    board: { day: -1, tasks: [] },
    feathers: [false, false, false, false, false],
    stats: { shifts: 0, minigames: 0, dishes: 0 },
    flags: { ageOk: true, tutorialSeen: false, lastBreakfastDay: -1 },
    settings: { music: 0.7, sfx: 0.8, quality: 'auto' },
    lastSave: 0,
  };
}

export function hasSave() {
  try { return !!localStorage.getItem(KEY); } catch { return false; }
}
export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    // Migraciones/defaults suaves
    const def = newState(s.player);
    for (const k of Object.keys(def)) if (s[k] === undefined) s[k] = def[k];
    for (const id of CHAR_ORDER) s.rel[id] = { ...def.rel[id], ...(s.rel[id] || {}) };
    return s;
  } catch (e) { console.warn('No se pudo cargar la partida', e); return null; }
}
export function saveState() {
  if (!G.state) return false;
  try {
    G.state.lastSave = Date.now();
    localStorage.setItem(KEY, JSON.stringify(G.state));
    return true;
  } catch (e) { console.warn('No se pudo guardar', e); return false; }
}
export function deleteSave() { try { localStorage.removeItem(KEY); } catch {} }

// ---------- Monedas ----------
export function addDeuros(n, reason = '') {
  G.state.deuros = Math.max(0, Math.round(G.state.deuros + n));
  bus.emit('wallet', { d: n, reason });
}
export function addFenixios(n, reason = '') {
  G.state.fenixios = Math.max(0, G.state.fenixios + n);
  bus.emit('wallet', { f: n, reason });
}
export function canAfford(d = 0, f = 0) { return G.state.deuros >= d && G.state.fenixios >= f; }

// ---------- Inventario ----------
export function addItem(id, n = 1) {
  G.state.inventory[id] = (G.state.inventory[id] || 0) + n;
  if (G.state.inventory[id] <= 0) delete G.state.inventory[id];
  bus.emit('inv', { id, n });
  bus.emit('quest:inv', {});
}
export function hasItem(id, n = 1) { return (G.state.inventory[id] || 0) >= n; }
export function removeItem(id, n = 1) { if (!hasItem(id, n)) return false; addItem(id, -n); return true; }

// ---------- Energía ----------
export function addEnergy(n) {
  G.state.energy = clamp(G.state.energy + n, 0, 100);
  bus.emit('energy', { n });
}
export function hasEnergy(n) { return G.state.energy >= n; }

// ---------- Atributos y buffs ----------
export function attr(name) {
  const t = now().getTime();
  G.state.buffs = G.state.buffs.filter((b) => b.until > t);
  let v = G.state.attrs[name];
  for (const b of G.state.buffs) if (b.attr === name) v += b.amount;
  return clamp(v, 0, 13);
}
export function addBuff(a, amount, hours) {
  G.state.buffs.push({ attr: a, amount, until: now().getTime() + hours * 3600000 });
  bus.emit('buffs', {});
}
export function addAttrXp(a, xp) {
  const s = G.state;
  if (s.attrs[a] >= 10) return;
  s.attrXp[a] += xp;
  const need = 20 + s.attrs[a] * 15;
  if (s.attrXp[a] >= need) {
    s.attrXp[a] -= need;
    s.attrs[a] = Math.min(10, s.attrs[a] + 1);
    bus.emit('attrUp', { attr: a, value: s.attrs[a] });
  }
}
export function addAttr(a, n) {
  G.state.attrs[a] = clamp(G.state.attrs[a] + n, 1, 10);
  bus.emit('attrUp', { attr: a, value: G.state.attrs[a] });
}

// ---------- Hogar ----------
export function homeIndex() {
  const s = G.state, d = dayIndex();
  let v = 0;
  if (d - s.home.windowsDay < 2) v += 20;
  if (d - s.home.floorDay < 1) v += 20;
  for (const [id, u] of Object.entries(UPGRADES)) if (u.home && s.upgrades[id]) v += u.home;
  return clamp(v, 0, 100);
}
export function homeDirt() {
  const s = G.state, d = dayIndex();
  return { windows: d - s.home.windowsDay >= 2, floor: d - s.home.floorDay >= 1 };
}
