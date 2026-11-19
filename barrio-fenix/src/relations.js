// Relaciones: afinidad, estados, compatibilidad, regalos e infidelidad.
import { G, bus, clamp } from './game.js';
import { CHARACTERS, CHAR_ORDER } from './data/characters.js';
import { parseDish } from './data/items.js';
import { attr, addFenixios, addDeuros } from './state.js';
import { dayIndex } from './time.js';

export const STATE_LABEL = {
  desconocido: 'Desconocido', conocido: 'Conocido', amistad: 'Amistad', citas: 'Citas', pareja: 'Pareja', prometidos: 'Prometidos', casados: 'Casados', ex: 'Ex',
};

export const rel = (id) => G.state.rel[id];
export const hearts = (id) => Math.floor(rel(id).aff / 10);

export function prefMatches(id) {
  const c = CHARACTERS[id], p = G.state.player.pref;
  if (!c.romance) return false;
  if (p === 'both') return true;
  return (p === 'women' && c.gender === 'f') || (p === 'men' && c.gender === 'm');
}
export function romanceable(id) { return prefMatches(id); }

// ¿Por qué no se puede avanzar el romance? (null si se puede)
export function romanceBlock(id) {
  if (!romanceable(id)) return 'No encaja con tu preferencia romántica.';
  const r = rel(id);
  if (r.state === 'ex' && dayIndex() < r.exUntil) return `Aún está dolid${CHARACTERS[id].gender === 'f' ? 'a' : 'o'}. Dale unos días.`;
  if (id === 'valeria' && isSubordinateOfValeria() && ['conocido', 'amistad', 'ex'].includes(r.state)) return CHARACTERS.valeria.lockedRomance;
  return null;
}
export function isSubordinateOfValeria() { const j = G.state.job; return !!(j && j.id === 'administrativo' && j.rank < 2); }

export function affCap(id) {
  const r = rel(id);
  if (r.state === 'ex' && dayIndex() < r.exUntil) return 40;
  if (id === 'valeria' && isSubordinateOfValeria() && ['desconocido', 'conocido', 'amistad', 'ex'].includes(r.state)) return 50;
  if (!romanceable(id)) return 100; // amistad completa
  if (['desconocido', 'conocido', 'amistad'].includes(r.state)) return 69; // sin pareja no se pasa de 6,9♥
  if (r.state === 'citas') return 89;
  return 100;
}

export function addAff(id, n, { silent = false } = {}) {
  const r = rel(id);
  const before = hearts(id);
  const cap = affCap(id);
  if (n > 0) { if (r.aff < cap) r.aff = Math.min(cap, r.aff + n); }
  else r.aff = Math.max(0, r.aff + n);
  if (r.state === 'desconocido') r.state = 'conocido';
  if (r.state === 'conocido' && r.aff >= 30) r.state = 'amistad';
  if (r.state === 'ex' && dayIndex() >= r.exUntil && r.aff >= 30) r.state = 'amistad';
  if (!r.friendMilestone && r.aff >= 30) {
    r.friendMilestone = true;
    addFenixios(1, 'amistad');
    if (!silent) { const both = G.state.player.gender === 'f' && CHARACTERS[id].gender === 'f'; G.ui?.toast(`¡${CHARACTERS[id].short} y tú ya sois amig${both ? 'as' : 'os'}! +1 Fenixio`, '🤝', 'good'); }
  }
  const after = hearts(id);
  if (!silent && n !== 0) {
    if (after > before) { G.ui?.toast(`${CHARACTERS[id].short}: ${'♥'.repeat(after)}`, '💗', 'love'); bus.emit('sfx', { name: 'heart' }); }
    G.ui?.floatText(`${n > 0 ? '+' : ''}${n} ♥`, n > 0 ? 'love' : 'red');
  }
  bus.emit('rel', { id });
}

// Efecto del tono de conversación
export function toneDelta(id, tone) {
  const c = CHARACTERS[id], r = rel(id), h = hearts(id);
  const t = c.tones;
  let kind = 'neutral', d = 2;
  if (tone === 'incognito') { kind = 'hate'; d = -8; }
  else if (tone === 'atrevido' && t.publicShy && G.npcs && G.npcs.list.some((n) => n.id !== id && n.visible && G.npcs.get(id) && n.pos.distanceTo(G.npcs.get(id).pos) < 8)) { kind = 'hate'; d = -3; }
  else if (t.fav.includes(tone)) { kind = 'love'; d = 5; }
  else if (t.hate.includes(tone)) { kind = 'hate'; d = -3; }
  else if (tone === 'atrevido' && h < 5 && !['marina', 'nora'].includes(id)) { kind = 'hate'; d = -3; }
  else if ((t.hateEarly || []).includes(tone) && h < 5) { kind = 'hate'; d = -3; }
  // atrevido sin interés romántico: neutro como mucho
  if (tone === 'atrevido' && !romanceable(id) && kind === 'love') { kind = 'neutral'; d = 1; }
  // anti-rutina de Nora
  let routine = false;
  if (t.antiRoutine && r.lastTone === tone && r.lastToneDay === dayIndex() - 1) { d -= 4; routine = true; if (kind === 'love') kind = 'neutral'; }
  if (d > 0) d += Math.floor(attr('carisma') / 3);
  return { kind, d, routine };
}

// Regalos
function matchGift(list, itemId) {
  const dish = parseDish(itemId);
  for (const g of list || []) {
    if (g === itemId) return true;
    if (dish && g.startsWith('plato:')) {
      const [, r, grade] = g.split(':');
      if ((r === '*' || r === dish.recipe) && (!grade || grade === dish.grade)) return true;
    }
  }
  return false;
}
export function giftDelta(id, itemId) {
  const g = CHARACTERS[id].gifts;
  if (id === 'kaito' && itemId === 'gafas' && G.state.quests.S3?.status === 'done') return { kind: 'hate', d: -6 };
  if (matchGift(g.love, itemId)) return { kind: 'love', d: 15 };
  if (matchGift(g.hate, itemId)) return { kind: 'hate', d: -6 };
  if (matchGift(g.like, itemId)) return { kind: 'like', d: 8 };
  return { kind: 'neutral', d: 3 };
}

// Pareja actual (pareja, prometidos o casados)
export function currentPartner() {
  for (const id of CHAR_ORDER) if (['pareja', 'prometidos', 'casados'].includes(rel(id).state)) return id;
  return null;
}

// Riesgo de infidelidad al hacer algo romántico con `id`. Devuelve true si te pillan.
export function infidelityCheck(id) {
  const partner = currentPartner();
  if (!partner || partner === id) return { caught: false, partner: null };
  const pr = rel(partner);
  let risk = 0.2;
  const pn = G.npcs?.get(partner);
  if (pn && pn.visible && G.player && pn.pos.distanceTo(G.player.pos) < 15) risk += 0.3;
  if (pr.state === 'casados') risk += 0.15;
  const caught = Math.random() < risk;
  if (!caught) { pr.suspicion = (pr.suspicion || 0) + 1; if (pr.suspicion >= 3) return { caught: true, partner, bySuspicion: true }; }
  return { caught, partner };
}
export function applyCaught(partner) {
  const r = rel(partner);
  const wasMarried = r.state === 'casados';
  addAff(partner, -40, { silent: true });
  breakUp(partner, { divorce: wasMarried });
  for (const id of CHAR_ORDER) if (id !== partner && rel(id).state !== 'desconocido') addAff(id, -3, { silent: true });
  return wasMarried;
}
export function breakUp(id, { divorce = false } = {}) {
  const r = rel(id);
  if (divorce) addDeuros(-Math.round(G.state.deuros * 0.3), 'divorcio');
  r.state = 'ex'; r.exUntil = dayIndex() + 3; r.dates = 0; r.suspicion = 0;
  r.aff = Math.min(r.aff, 40);
  if (G.state.spouse === id) G.state.spouse = null;
  if (G.state.engaged === id) G.state.engaged = null;
  bus.emit('rel', { id });
}
