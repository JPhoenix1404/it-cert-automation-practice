// Motor de misiones: disponibilidad, progreso por eventos, recompensas y marcador.
import { G, bus } from './game.js';
import { QUESTS, QUEST_ORDER } from './data/quests.js';
import { CHARACTERS } from './data/characters.js';
import { addDeuros, addFenixios, addItem, addAttr } from './state.js';
import { addAff } from './relations.js';
import { OBJ, SPOTS, zoneAt } from './world.js';
import { BIOMES } from './data/items.js';
import { hourFloat, inHours } from './time.js';
import { sfx } from './audio.js';

export class Quests {
  constructor() {
    this.queue = Promise.resolve();
    bus.on('quest:event', (e) => this.handle(e.ev, e));
    bus.on('quest:inv', () => this.handle('inv', {}));
  }
  q(id) { return G.state.quests[id] || null; }
  status(id) {
    const st = this.q(id);
    if (st) return st.status;
    const d = QUESTS[id];
    if (!G.state.unlocked[d.biome]) return 'locked';
    if ((d.req || []).some((r) => this.q(r)?.status !== 'done')) return 'locked';
    return 'available';
  }
  availableFrom(npcId) { return QUEST_ORDER.filter((id) => QUESTS[id].giver === npcId && this.status(id) === 'available'); }
  active() { return QUEST_ORDER.filter((id) => this.q(id)?.status === 'active'); }
  step(id) { const st = this.q(id); return st ? QUESTS[id].steps[st.step] : null; }

  start(id) {
    const d = QUESTS[id];
    G.state.quests[id] = { status: 'active', step: 0, count: 0 };
    if (d.costF) addFenixios(-d.costF, 'misión');
    G.ui.toast(`Nueva misión: ${d.title}`, '📜', 'quest');
    sfx('select');
    bus.emit('quests', {});
    // por si el paso ya se cumple (p.ej. ya tienes los objetos)
    this.handle('inv', {});
    if (id === 'X1') G.world.feathers.forEach((f, i) => { f.visible = !G.state.feathers[i]; });
  }

  // Avanza los pasos que coincidan con el evento
  handle(ev, e) {
    for (const id of this.active()) {
      const st = this.q(id), d = QUESTS[id], step = d.steps[st.step];
      if (!step || step.ev !== ev) continue;
      if (!step.match(e, G.state)) continue;
      st.count = (st.count || 0) + 1;
      if (step.count && st.count < step.count) { G.ui.toast(`${step.desc} (${st.count}/${step.count})`, '✔️'); bus.emit('quests', {}); continue; }
      st.step++; st.count = 0;
      if (st.step >= d.steps.length) this.complete(id);
      else { G.ui.toast(d.steps[st.step].desc, '➡️', 'quest'); sfx('good'); }
      bus.emit('quests', {});
    }
  }

  complete(id) {
    const d = QUESTS[id], st = this.q(id);
    st.status = 'done';
    // la recompensa se entrega en el acto (si la app se cierra durante el diálogo no se pierde)
    const r = d.reward || {};
    if (r.d) addDeuros(r.d, 'misión');
    if (r.f) addFenixios(r.f, 'misión');
    if (r.items) for (const [k, n] of Object.entries(r.items)) addItem(k, n);
    if (r.aff) for (const [k, n] of Object.entries(r.aff)) addAff(k, n, { silent: true });
    if (r.attr) for (const [k, n] of Object.entries(r.attr)) addAttr(k, n);
    if (r.title) G.state.player.title = G.state.player.gender === 'f' ? 'Hija del Fénix' : 'Hijo del Fénix';
    bus.emit('save');
    this.queue = this.queue.then(async () => {
      while (G.busy) await new Promise((r) => setTimeout(r, 200));
      if (d.outro) await G.ui.say(d.outro);
      const parts = [r.d ? `+${r.d} Deuros` : '', r.f ? `+${r.f} Fenixio${r.f > 1 ? 's' : ''}` : ''].filter(Boolean).join(' · ');
      await G.ui.banner('¡Misión completada!', `${d.title}${parts ? ' — ' + parts : ''}`, '🏆');
      if (id === 'S3') { G.npcs.get('kaito').build(); G.ui.portraits.kaito = G.portrait('kaito'); }
      bus.emit('quests', {}); bus.emit('save');
    });
  }

  // Acciones de misión disponibles al hablar con un NPC
  talkActions(npcId) {
    const out = [];
    for (const id of this.active()) {
      const step = this.step(id);
      if (step?.talkAction && step.marker === `npc:${npcId}`) out.push({ quest: id, ...step.talkAction });
    }
    return out;
  }

  // Misión seguida (la primera activa) → texto y posición del marcador
  tracked() {
    const act = this.active();
    if (!act.length) {
      const avail = QUEST_ORDER.find((id) => this.status(id) === 'available' && !QUESTS[id].secret);
      if (avail) return { id: avail, title: QUESTS[avail].title, desc: `Habla con ${CHARACTERS[QUESTS[avail].giver].short}`, marker: `npc:${QUESTS[avail].giver}`, available: true };
      return null;
    }
    const reachable = act.find((id) => { const st = this.step(id); return st && this.markerPos(st.marker) && !this.markerHint(st.marker); });
    const id = reachable || act[0], d = QUESTS[id], st = this.q(id), step = d.steps[st.step];
    const hint = this.markerHint(step.marker);
    return { id, title: d.title + (act.length > 1 ? ` (+${act.length - 1})` : ''), desc: step.desc + (step.count ? ` (${st.count}/${step.count})` : '') + (hint ? ` · ${hint}` : ''), marker: step.marker };
  }
  // Pista cuando el objetivo no está disponible ahora
  markerHint(marker) {
    if (!marker || !marker.startsWith('npc:')) return '';
    const id = marker.slice(4), n = G.npcs.get(id);
    if (n && n.visible) {
      const z = zoneAt(n.pos.x, n.pos.z);
      return G.state.unlocked[z] ? '' : `está en ${BIOMES[z].name} (bloqueado)`;
    }
    const h = Math.floor(hourFloat());
    const sched = CHARACTERS[id].schedule.filter((s) => s[2]);
    let best = null;
    for (let k = 1; k <= 24 && best === null; k++) { const hh = (h + k) % 24; if (sched.some(([a, b]) => inHours(hh, a, b))) best = hh; }
    return best === null ? '' : `vuelve a las ${String(best).padStart(2, '0')}:00 · echa una siesta`;
  }
  markerPos(marker) {
    if (!marker) return null;
    const [kind, key] = marker.split(':');
    if (kind === 'npc') {
      const n = G.npcs.get(key); if (!n || !n.visible) return null;
      const z = zoneAt(n.pos.x, n.pos.z);
      return G.state.unlocked[z] ? n.pos : OBJ['gate_' + z] || null;
    }
    if (kind === 'obj' && OBJ[key]) { const z = zoneAt(OBJ[key].x, OBJ[key].z); if (!G.state.unlocked[z]) return OBJ['gate_' + z] || OBJ[key]; }
    if (kind === 'obj') return OBJ[key] || null;
    if (kind === 'spot') return SPOTS[key] || null;
    if (marker === 'feather') {
      let best = null, bd = 1e9;
      G.world.feathers.forEach((f, i) => { if (!G.state.feathers[i] && G.state.unlocked[zoneAt(f.position.x, f.position.z)]) { const d = f.position.distanceTo(G.player.pos); if (d < bd) { bd = d; best = f.position; } } });
      return best;
    }
    return null;
  }
}

export function questEvent(ev, payload = {}) { bus.emit('quest:event', { ev, ...payload }); }
