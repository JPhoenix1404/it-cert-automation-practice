// Motor de misiones: disponibilidad, progreso por eventos, recompensas y marcador.
import { G, bus } from './game.js';
import { QUESTS, QUEST_ORDER } from './data/quests.js';
import { CHARACTERS } from './data/characters.js';
import { addDeuros, addFenixios, addItem, addAttr } from './state.js';
import { addAff } from './relations.js';
import { OBJ, SPOTS } from './world.js';
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
    this.queue = this.queue.then(async () => {
      while (G.busy) await new Promise((r) => setTimeout(r, 200));
      if (d.outro) await G.ui.say(d.outro);
      const r = d.reward || {};
      if (r.d) addDeuros(r.d, 'misión');
      if (r.f) addFenixios(r.f, 'misión');
      if (r.items) for (const [k, n] of Object.entries(r.items)) addItem(k, n);
      if (r.aff) for (const [k, n] of Object.entries(r.aff)) addAff(k, n);
      if (r.attr) for (const [k, n] of Object.entries(r.attr)) addAttr(k, n);
      if (r.title) G.state.player.title = G.state.player.gender === 'f' ? 'Hija del Fénix' : 'Hijo del Fénix';
      const parts = [r.d ? `+${r.d} Deuros` : '', r.f ? `+${r.f} Fenixio${r.f > 1 ? 's' : ''}` : ''].filter(Boolean).join(' · ');
      await G.ui.banner('¡Misión completada!', `${d.title}${parts ? ' — ' + parts : ''}`, '🏆');
      if (id === 'S3') G.npcs.get('kaito').build();
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
    const id = act[0], d = QUESTS[id], st = this.q(id), step = d.steps[st.step];
    return { id, title: d.title, desc: step.desc + (step.count ? ` (${st.count}/${step.count})` : ''), marker: step.marker };
  }
  markerPos(marker) {
    if (!marker) return null;
    const [kind, key] = marker.split(':');
    if (kind === 'npc') { const n = G.npcs.get(key); return n && n.visible ? n.pos : null; }
    if (kind === 'obj') return OBJ[key] || null;
    if (kind === 'spot') return SPOTS[key] || null;
    if (marker === 'feather') {
      let best = null, bd = 1e9;
      G.world.feathers.forEach((f, i) => { if (!G.state.feathers[i]) { const d = f.position.distanceTo(G.player.pos); if (d < bd) { bd = d; best = f.position; } } });
      return best;
    }
    return null;
  }
}

export function questEvent(ev, payload = {}) { bus.emit('quest:event', { ev, ...payload }); }
