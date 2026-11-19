// Lógica de juego: interacciones, conversaciones, citas, trabajo, tiendas, tablón y menú.
import { G, bus, pick, shuffle, rand, gradeAtLeast, sleep, fmt } from './game.js';
import { CHARACTERS, CHAR_ORDER, TONES, tpl } from './data/characters.js';
import { QUESTS, QUEST_ORDER, INTERVIEW, BOARD_TASKS } from './data/quests.js';
import { ITEMS, RECIPES, CLOTHES, COLLECTIONS, DARING, UPGRADES, BIOMES, JOBS, GRADE_PAY, itemInfo, dishId } from './data/items.js';
import { addDeuros, addFenixios, addItem, hasItem, removeItem, addEnergy, hasEnergy, addBuff, addAttrXp, attr, ATTRS, homeIndex, homeDirt, saveState, deleteSave } from './state.js';
import { rel, hearts, addAff, toneDelta, giftDelta, romanceable, romanceBlock, currentPartner, infidelityCheck, applyCaught, breakUp, STATE_LABEL, prefMatches } from './relations.js';
import { questEvent } from './quests.js';
import { runMinigame } from './minigames/base.js';
import { OBJ, BUILDINGS, SPOTS } from './world.js';
import { dayIndex, hourFloat, inHours, isNight, skipHours, skipUntil, resetToRealTime, clockText } from './time.js';
import { sfx, playMusic, applyVolumes } from './audio.js';
import { el } from './ui.js';

const ui = () => G.ui;
const MG_ATTR = { windows: 'destreza', floor: 'destreza', street: 'destreza', rhythm: 'destreza', shopping: 'concentracion', restock: 'concentracion', barista: 'concentracion', documents: 'concentracion', cooking: 'cocina' };
const MG_COST = { windows: 10, floor: 10, street: 8, rhythm: 8, shopping: 8, restock: 10, barista: 10, documents: 12, cooking: 12 };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const heartsHtml = (n) => `<span class="hearts">${'♥'.repeat(Math.min(10, n))}<span class="off">${'♥'.repeat(Math.max(0, 10 - n))}</span></span>`;

// ---------------- Minijuego con coste de energía y XP ----------------
export async function playMG(type, opts = {}, { cost = MG_COST[type] } = {}) {
  if (!hasEnergy(cost)) { ui().toast('Estás sin energía. Come algo o descansa un rato.', '😩', 'bad'); sfx('error'); return null; }
  const r = await runMinigame(type, opts);
  addEnergy(-cost);
  addAttrXp(MG_ATTR[type], { S: 12, A: 9, B: 7, C: 5, D: 3 }[r.grade]);
  questEvent('minigame', r);
  bus.emit('save');
  return r;
}

// ---------------- Horarios ----------------
export function buildingOpen(id) {
  const b = BUILDINGS[id];
  if (!b.hours) return !b.closed;
  return inHours(hourFloat(), b.hours[0], b.hours[1]);
}
function hoursText(h) { return `${String(h[0]).padStart(2, '0')}:00–${String(h[1] % 24).padStart(2, '0')}:00`; }
export function scheduleText(id) {
  const c = CHARACTERS[id];
  const names = { lucia_garden: 'su jardín', lucia_porch: 'su porche', plaza_bench: 'la plaza', plaza_bench2: 'la plaza', plaza_fountain: 'la fuente', plaza_fountain2: 'la fuente', plaza_stage: 'la plaza', goro_garden: 'el jardín zen', neko_spot: 'tu puerta', super_checkout: 'la caja del Super', super_aisle: 'el Super', office_valeria: 'la oficina', office_ren: 'la oficina', llama_kitchen: 'la cocina de La Llama', llama_table: 'La Llama', home_in: 'tu casa' };
  return c.schedule.filter((s) => s[2]).map(([a, b, s]) => `${String(a).padStart(2, '0')}–${String(b % 24).padStart(2, '0')} h: ${names[s] || s}`).join(' · ');
}

// ---------------- Interactuables ----------------
function inZoneUnlocked(z) { return G.state.unlocked[z]; }
function jobHere(jobId) { const j = G.state.job; return j && j.id === jobId; }

export function buildInteractables() {
  const s = () => G.state;
  const list = [
    { id: 'fridge', label: () => 'Abrir la nevera', icon: '🧊', run: openFridge },
    { id: 'stove', label: () => 'Cocinar', icon: '🍳', run: () => cookFlow('home') },
    { id: 'windows', label: () => (homeDirt().windows ? 'Limpiar los cristales' : 'Repasar los cristales'), icon: '🪟', run: async () => { const r = await playMG('windows', { context: 'home' }); if (r) { s().home.windowsDay = dayIndex(); G.world.refreshHome(s(), homeDirt()); } } },
    { id: 'mop', label: () => (homeDirt().floor ? 'Fregar el suelo' : 'Repasar el suelo'), icon: '🧽', run: async () => { const r = await playMG('floor', { context: 'home' }); if (r) { s().home.floorDay = dayIndex(); G.world.refreshHome(s(), homeDirt()); } } },
    { id: 'bed', label: () => 'Dormir', icon: '🛏️', run: sleepFlow },
    { id: 'sofa', label: () => 'Echar una siesta (+2 h)', icon: '🛋️', run: napFlow },
    { id: 'wardrobe', label: () => 'Armario', icon: '👗', run: openWardrobe },
    { id: 'board', label: () => 'Tablón del barrio', icon: '📌', run: openBoard },
    { id: 'gate_super', label: () => `Desbloquear Supermercado (${BIOMES.super.cost} 🔥)`, icon: '🔒', enabled: () => !s().unlocked.super, run: () => unlockFlow('super') },
    { id: 'gate_trabajo', label: () => `Desbloquear Trabajo (${BIOMES.trabajo.cost} 🔥)`, icon: '🔒', enabled: () => !s().unlocked.trabajo, run: () => unlockFlow('trabajo') },
    { id: 'gate_restaurante', label: () => `Desbloquear Restaurante (${BIOMES.restaurante.cost} 🔥)`, icon: '🔒', enabled: () => !s().unlocked.restaurante, run: () => unlockFlow('restaurante') },
    { id: 'super_shop', label: () => 'Comprar en Super Fénix', icon: '🛍️', enabled: () => inZoneUnlocked('super'), run: () => openShop('super') },
    { id: 'moda', label: () => 'Rincón Moda', icon: '👠', enabled: () => inZoneUnlocked('super'), run: openModa },
    { id: 'super_cart', label: () => 'Coger un carro', icon: '🛒', enabled: () => G.quests.step('S1') != null, run: () => playMG('shopping', { context: 'S1' }) },
    { id: 'super_shelf', label: () => (jobHere('reponedor') ? 'Turno de trabajo: reponer' : 'Reponer la estantería'), icon: '📦', enabled: () => inZoneUnlocked('super') && (jobHere('reponedor') || G.quests.step('S2') != null), run: () => (jobHere('reponedor') ? shiftFlow() : playMG('restock', { context: 'S2' })) },
    { id: 'cafe_counter', label: () => (G.quests.step('T3') ? 'Preparar el café de Valeria' : jobHere('barista') ? 'Turno de trabajo: barista' : 'Café Ascua'), icon: '☕', enabled: () => inZoneUnlocked('trabajo'), run: cafeFlow },
    { id: 'work_desk', label: () => 'Turno de oficina', icon: '📂', enabled: () => jobHere('administrativo'), run: shiftFlow },
    { id: 'llama_stove', label: () => (jobHere('cocina') ? 'Fogón (turno o cocinar)' : 'Fogón de La Llama'), icon: '🔥', enabled: () => inZoneUnlocked('restaurante'), run: llamaStoveFlow },
  ];
  for (const it of list) { it.pos = OBJ[it.id]; it.r = it.id.startsWith('gate_') ? 2.6 : 1.7; }
  return list;
}

// ---------------- Nevera, comer ----------------
async function openFridge() {
  questEvent('interact', { id: 'fridge' });
  await openBag('Nevera y despensa', (id) => ['food', 'dish', 'ingredient'].includes(itemInfo(id).kind));
}
export function eat(id) {
  const info = itemInfo(id);
  if (!info.energy) return;
  if (!removeItem(id)) return;
  addEnergy(info.energy);
  for (const b of ITEMS[id]?.buff || []) addBuff(b.attr, b.amount, b.hours);
  sfx('good');
  ui().toast(`${info.name}: +${info.energy} energía`, info.icon, 'good');
}

// ---------------- Dormir / siesta ----------------
async function sleepFlow() {
  const h = hourFloat();
  if (!(h >= 20 || h < 7 || G.state.energy < 30)) {
    const ok = await ui().confirm('Aún es pronto para dormir. ¿Prefieres echar una siesta de 2 horas en la cama?', 'Siesta', 'Nada');
    if (ok) await napFlow(); return;
  }
  const spouse = G.state.spouse;
  await ui().fade('Zzz... 🌙', 1300);
  skipUntil(8);
  G.state.energy = 100; bus.emit('energy', {});
  if (spouse) {
    const c = CHARACTERS[spouse];
    await ui().say([[spouse, morningLine(spouse), 'happy']]);
    addAff(spouse, 3); addBuff('carisma', 1, 4);
  }
  ui().toast('¡Buenos días! Energía al máximo.', '☀️', 'good');
  bus.emit('save');
}
async function napFlow() {
  await ui().fade('Una siesta reparadora... 😴', 900);
  skipHours(2);
  addEnergy(G.state.upgrades.sofa ? 40 : 30);
  ui().toast(`Son las ${clockText()}. Energía recuperada.`, '😌', 'good');
  bus.emit('save');
}

function morningLine(id) {
  const c = CHARACTERS[id], r = rel(id);
  const list = Array.isArray(c.morning) ? c.morning : [c.morning || 'Buenos días.'];
  const fresh = list.filter((l) => l !== r.lastMorning);
  const l = pick(fresh.length ? fresh : list); r.lastMorning = l; return l;
}

// ---------------- Desbloqueo de biomas ----------------
async function unlockFlow(z) {
  const b = BIOMES[z];
  if (G.state.fenixios < b.cost) {
    await ui().say([['neko', `Para abrir ${b.name} necesitas ${b.cost} Fenixios. Tienes ${G.state.fenixios}. Completa misiones y haz amigos.`]]);
    return;
  }
  if (!(await ui().confirm(`¿Usar ${b.cost} Fenixios para desbloquear ${b.name}?`, 'Desbloquear', 'Ahora no'))) return;
  addFenixios(-b.cost, 'bioma');
  G.state.unlocked[z] = true;
  G.world.refreshGates(G.state.unlocked);
  sfx('fenix');
  await ui().banner(`¡${b.name} desbloqueado!`, 'Nuevos vecinos, nuevas misiones.', '🔓');
  questEvent('unlock', { zone: z });
  bus.emit('quests', {}); bus.emit('save');
}

// ---------------- Tiendas ----------------
function price(id) { const p = ITEMS[id].price || 0; return G.state.upgrades.tarjeta ? Math.ceil(p * 0.9) : p; }
function openShop(shop) {
  if (!buildingOpen('super')) { ui().toast(`Super Fénix está cerrado (${hoursText(BUILDINGS.super.hours)})`, '🔒'); return; }
  const cats = [['food', 'Comida y bebida'], ['ingredient', 'Ingredientes'], ['gift', 'Regalos']];
  return ui().panel('Super Fénix', (body, re) => {
    if (G.state.upgrades.tarjeta) body.appendChild(el('div', 'note', '💳 Tarjeta cliente: −10% en todo'));
    for (const [k, name] of cats) {
      body.appendChild(el('h3', '', name));
      const grid = el('div', 'grid');
      for (const [id, it] of Object.entries(ITEMS)) {
        if (it.shop !== shop || it.kind !== k) continue;
        const isF = !!it.priceF;
        const card = el('div', 'card item', `<div class="ic">${it.icon}</div><div class="nm">${it.name}</div><div class="ds">${it.desc || ''}</div><div class="own">Tienes: ${G.state.inventory[id] || 0}</div>`);
        const btn = el('button', 'buy', isF ? `${it.priceF} 🔥` : `${price(id)} D`);
        btn.onclick = () => {
          if (isF ? G.state.fenixios < it.priceF : G.state.deuros < price(id)) { sfx('error'); ui().toast('No te llega.', '💸', 'bad'); return; }
          if (isF) addFenixios(-it.priceF, 'compra'); else addDeuros(-price(id), 'compra');
          addItem(id, 1); sfx('coin'); questEvent('buy', { item: id }); re();
        };
        card.appendChild(btn); grid.appendChild(card);
      }
      body.appendChild(grid);
    }
  }, { wide: true });
}
function openModa() {
  if (!buildingOpen('super')) { ui().toast('Rincón Moda está cerrado.', '🔒'); return; }
  return ui().panel('Rincón Moda', (body, re) => {
    body.appendChild(el('h3', '', 'Complementos'));
    const g1 = el('div', 'grid');
    for (const id of ['gorra', 'gafas', 'anillo']) {
      const it = ITEMS[id];
      const card = el('div', 'card item', `<div class="ic">${it.icon}</div><div class="nm">${it.name}</div><div class="ds">${it.desc || ''}</div><div class="own">Tienes: ${G.state.inventory[id] || 0}</div>`);
      const b = el('button', 'buy', `${price(id)} D`);
      b.onclick = () => { if (G.state.deuros < price(id)) { sfx('error'); ui().toast('No te llega.', '💸', 'bad'); return; } addDeuros(-price(id)); addItem(id, 1); sfx('coin'); questEvent('buy', { item: id }); re(); };
      card.appendChild(b); g1.appendChild(card);
    }
    body.appendChild(g1);
    body.appendChild(el('h3', '', 'Colecciones +18'));
    const g2 = el('div', 'grid');
    for (const [cid, c] of Object.entries(COLLECTIONS)) {
      const open = G.state.collections[cid];
      const card = el('div', `card item${open ? '' : ' locked'}`, `<div class="ic">${{ noche: '🌙', playa: '🏖️', club: '🪩' }[cid]}</div><div class="nm">${c.name}</div><div class="ds">${c.desc}</div>`);
      if (!open) { const b = el('button', 'buy fire', `Desbloquear ${c.costF} 🔥`); b.onclick = () => { if (G.state.fenixios < c.costF) { sfx('error'); ui().toast('Te faltan Fenixios.', '🔥', 'bad'); return; } addFenixios(-c.costF); G.state.collections[cid] = true; sfx('fenix'); re(); }; card.appendChild(b); }
      else card.appendChild(el('div', 'own', '✔ Desbloqueada'));
      g2.appendChild(card);
    }
    body.appendChild(g2);
    body.appendChild(el('h3', '', 'Ropa'));
    const g3 = el('div', 'grid');
    for (const [id, c] of Object.entries(CLOTHES)) {
      if (!c.price) continue;
      if (c.collection && !G.state.collections[c.collection]) continue;
      const owned = G.state.wardrobe.includes(id);
      const sw = c.topColor || c.bottomColor || c.shoesColor;
      const card = el('div', 'card item', `<div class="swatch" style="background:${sw}"></div><div class="nm">${c.name}${DARING.has(id) ? ' <span class="tag18">+18</span>' : ''}</div><div class="ds">${{ top: 'Parte de arriba', bottom: 'Parte de abajo', shoes: 'Calzado', set: 'Conjunto' }[c.slot]}</div>`);
      if (owned) card.appendChild(el('div', 'own', '✔ En tu armario'));
      else { const b = el('button', 'buy', `${c.price} D`); b.onclick = () => { if (G.state.deuros < c.price) { sfx('error'); ui().toast('No te llega.', '💸', 'bad'); return; } addDeuros(-c.price); G.state.wardrobe.push(id); sfx('coin'); ui().toast('Guardado en el armario de casa.', '👗', 'good'); re(); }; card.appendChild(b); }
      g3.appendChild(card);
    }
    body.appendChild(g3);
  }, { wide: true });
}

function openWardrobe() {
  return ui().panel('Armario', (body, re) => {
    const o = G.state.player.outfit;
    body.appendChild(el('div', 'note', 'Un conjunto sustituye arriba y abajo. Puedes combinar prendas sueltas encima de un conjunto.'));
    for (const [slot, name] of [['set', 'Conjuntos'], ['top', 'Parte de arriba'], ['bottom', 'Parte de abajo'], ['shoes', 'Calzado']]) {
      body.appendChild(el('h3', '', name));
      const grid = el('div', 'grid');
      for (const id of G.state.wardrobe) {
        const c = CLOTHES[id]; if (!c || c.slot !== slot) continue;
        const on = slot === 'set' ? o.set === id : o[slot] === id;
        const card = el('div', `card item${on ? ' on' : ''}`, `<div class="swatch" style="background:${c.topColor || c.bottomColor || c.shoesColor}"></div><div class="nm">${c.name}${DARING.has(id) ? ' <span class="tag18">+18</span>' : ''}</div>`);
        const b = el('button', 'buy', on ? (slot === 'set' ? 'Puesto' : 'Quitar') : 'Ponerse');
        b.onclick = () => {
          if (slot === 'set') { o.set = id; o.top = null; o.bottom = null; }
          else o[slot] = on ? null : id;
          sfx('select'); G.player.rebuild(); G.ui.portraits.player = G.portrait?.('player'); re();
        };
        card.appendChild(b); grid.appendChild(card);
      }
      body.appendChild(grid);
    }
  }, { wide: true });
}
export function wearingDaring() { const o = G.state.player.outfit; return [o.set, o.top, o.bottom].some((id) => id && DARING.has(id)); }

// ---------------- Mochila ----------------
export function openBag(title = 'Mochila', filter = () => true) {
  return ui().panel(title, (body, re) => {
    const ids = Object.keys(G.state.inventory).filter((id) => G.state.inventory[id] > 0 && filter(id));
    if (!ids.length) body.appendChild(el('div', 'empty', 'No hay nada aquí. El Super Fénix tiene de todo.'));
    const grid = el('div', 'grid');
    for (const id of ids) {
      const info = itemInfo(id);
      const card = el('div', 'card item', `<div class="ic">${info.icon}</div><div class="nm">${info.name}</div><div class="own">x${G.state.inventory[id]}</div>${info.energy ? `<div class="ds">+${info.energy} energía</div>` : ''}`);
      if (info.energy) { const b = el('button', 'buy', 'Comer'); b.onclick = () => { eat(id); re(); }; card.appendChild(b); }
      grid.appendChild(card);
    }
    body.appendChild(grid);
  }, { wide: true });
}

// ---------------- Cocina ----------------
function canCook(r) { return Object.entries(RECIPES[r].needs).every(([k, n]) => hasItem(k, n)); }
async function chooseRecipe(allowFree) {
  const opts = Object.entries(RECIPES).map(([id, r]) => ({ id, label: `${r.icon} ${r.name}`, sub: Object.entries(r.needs).map(([k, n]) => `${ITEMS[k].icon}×${n}`).join(' '), disabled: !canCook(id), why: 'Te faltan ingredientes (Super Fénix).' }));
  if (allowFree) opts.push({ id: 'free', label: '🍲 Plato del día de La Llama', sub: 'Ingredientes de la casa · el plato se queda en el restaurante' });
  const i = await ui().choose('narr', '¿Qué vas a cocinar?', opts, { cancel: 'Nada' });
  return i < 0 ? null : opts[i].id;
}
async function cookFlow(place) {
  const r = await chooseRecipe(place === 'llama');
  if (!r) return null;
  const recipe = r === 'free' ? pick(Object.keys(RECIPES)) : r;
  if (!hasEnergy(MG_COST.cooking)) { ui().toast('Estás sin energía.', '😩', 'bad'); return null; }
  if (r !== 'free') for (const [k, n] of Object.entries(RECIPES[recipe].needs)) removeItem(k, n);
  const res = await playMG('cooking', { recipe, context: place });
  if (!res) return null;
  G.state.stats.dishes++;
  if (r !== 'free') { addItem(dishId(recipe, res.grade)); ui().toast(`${RECIPES[recipe].name} (${res.grade}) guardado en la mochila`, RECIPES[recipe].icon, 'good'); }
  questEvent('cook', { recipe, grade: res.grade, place });
  return res;
}
async function llamaStoveFlow() {
  if (!buildingOpen('llama')) { ui().toast('La Llama está cerrada.', '🔒'); return; }
  if (jobHere('cocina')) {
    const i = await ui().choose('narr', '¿Qué quieres hacer en el fogón?', [{ label: '👨‍🍳 Hacer mi turno de trabajo' }, { label: '🍳 Cocinar un plato' }], { cancel: 'Nada' });
    if (i === 0) return shiftFlow();
    if (i < 0) return;
  }
  return cookFlow('llama');
}
async function cafeFlow() {
  if (!buildingOpen('centro')) { ui().toast('Café Ascua está cerrado.', '🔒'); return; }
  if (G.quests.step('T3')) { await playMG('barista', { context: 'valeria' }); return; }
  const opts = [];
  if (jobHere('barista')) opts.push({ label: '☕ Hacer mi turno de barista', k: 'shift' });
  else opts.push({ label: '📝 Pedir trabajo de barista', k: 'job' });
  opts.push({ label: `🥤 Tomar un café (${price('cafe')} D)`, k: 'buy' });
  const i = await ui().choose('narr', 'Café Ascua huele a tostado y a canela.', opts, { cancel: 'Salir' });
  if (i < 0) return;
  const k = opts[i].k;
  if (k === 'shift') return shiftFlow();
  if (k === 'job') return applyJob('barista');
  if (k === 'buy') { if (G.state.deuros < price('cafe')) { ui().toast('No te llega.', '💸', 'bad'); return; } addDeuros(-price('cafe')); addItem('cafe'); eat('cafe'); }
}

// ---------------- Trabajo ----------------
export async function applyJob(jobId) {
  const j = JOBS[jobId], cur = G.state.job;
  if (cur && cur.id === jobId) { ui().toast(`Ya trabajas como ${j.ranks[cur.rank]}.`, '💼'); return false; }
  if (j.needsInterview && !G.state.interviewDone) { ui().toast('Primero tienes que pasar la entrevista con Valeria.', '💼'); return false; }
  if (cur) {
    const ok = await ui().confirm(`Solo puedes tener un trabajo. ¿Dejar tu puesto de ${JOBS[cur.id].ranks[cur.rank]} para ser ${j.name}?`, 'Cambiar de trabajo', 'No');
    if (!ok) return false;
    quitJob(true);
  }
  G.state.job = { id: jobId, rank: 0, shiftsAtRank: 0, shiftsDay: dayIndex(), shiftsToday: 0 };
  sfx('fanfare');
  await ui().banner('¡Nuevo trabajo!', `${j.name} en ${j.place} · ${j.pay[0]} D por turno`, '💼');
  questEvent('job', { job: jobId });
  bus.emit('save');
  return true;
}
export function quitJob(silent = false) {
  const cur = G.state.job; if (!cur) return;
  const j = JOBS[cur.id];
  if (j.bossIsBoss && j.boss) addAff(j.boss, -5, { silent });
  G.state.job = null;
  if (!silent) ui().toast(`Has dejado tu trabajo de ${j.name}.`, '📦');
  bus.emit('save');
}
async function shiftFlow() {
  const job = G.state.job; if (!job) return;
  const j = JOBS[job.id];
  if (job.shiftsDay !== dayIndex()) { job.shiftsDay = dayIndex(); job.shiftsToday = 0; }
  if (!inHours(hourFloat(), j.hours[0], j.hours[1])) { ui().toast(`Tu turno es de ${hoursText(j.hours)}.`, '⏰'); return; }
  if (job.shiftsToday >= 2) { ui().toast('Ya has hecho 2 turnos hoy. ¡A descansar!', '🛑'); return; }
  const cost = G.state.upgrades.silla && j.biome === 'trabajo' ? 18 : 25;
  if (!hasEnergy(cost)) { ui().toast(`Necesitas ${cost} de energía para un turno.`, '😩', 'bad'); return; }
  const r = await runMinigame(j.minigame, { context: 'shift', recipe: j.minigame === 'cooking' ? pick(Object.keys(RECIPES)) : undefined });
  addEnergy(-cost);
  addAttrXp('concentracion', 8);
  const pay = Math.round(j.pay[job.rank] * GRADE_PAY[r.grade]);
  addDeuros(pay, 'sueldo');
  job.shiftsToday++; G.state.stats.shifts++;
  ui().toast(`Turno completado (${r.grade}): +${pay} Deuros`, '💶', 'good');
  sfx('coin');
  if (job.id === 'administrativo' && rel('ren').state !== 'desconocido') {
    const renScore = Math.round(rand(1000, 1600));
    if (r.score > renScore) { addAff('ren', 6); ui().toast(`Has superado a Ren (${renScore}). Te mira de reojo...`, '😤'); }
    else { addAff('ren', -2, { silent: true }); ui().toast(`Ren ha hecho ${renScore} puntos. Sonríe con superioridad.`, '😏'); }
  }
  if (gradeAtLeast(r.grade, 'B')) {
    job.shiftsAtRank++;
    if (job.shiftsAtRank >= 4 && job.rank < 2) {
      job.rank++; job.shiftsAtRank = 0;
      await ui().banner('¡Ascenso!', `Ahora eres ${j.ranks[job.rank]} · ${j.pay[job.rank]} D por turno`, '📈');
      if (job.id === 'administrativo' && job.rank === 2) ui().toast('Ya no dependes directamente de Valeria...', '💼');
    }
  }
  questEvent('shift', { job: job.id, grade: r.grade });
  questEvent('minigame', { ...r, context: 'shift' });
  if (j.minigame === 'cooking') questEvent('cook', { recipe: 'turno', grade: r.grade, place: 'llama' });
  bus.emit('save');
}

// ---------------- Tablón ----------------
function refreshBoard() {
  const s = G.state, d = dayIndex();
  if (s.board.day === d) return;
  const pool = BOARD_TASKS.filter((t) => s.unlocked[t.biome]);
  s.board = { day: d, tasks: shuffle(pool).slice(0, 3).map((t) => ({ id: t.id, done: false, reward: Math.round(rand(t.reward[0], t.reward[1])), fenix: Math.random() < 0.2 })) };
}
function openBoard() {
  refreshBoard();
  return ui().panel('Tablón del barrio', (body, re) => {
    body.appendChild(el('div', 'note', 'Encargos de los vecinos. Se renuevan cada día a las 06:00.'));
    for (const task of G.state.board.tasks) {
      const def = BOARD_TASKS.find((t) => t.id === task.id);
      const night = def.night && !isNight();
      const card = el('div', `card row${task.done ? ' done' : ''}`, `<div class="ic">📌</div><div class="grow"><div class="nm">${def.title}</div><div class="ds">Recompensa: ${task.reward} D${task.fenix ? ' + 1 🔥' : ''}${def.night ? ' · solo de noche' : ''}</div></div>`);
      if (task.done) card.appendChild(el('div', 'own', '✔ Hecho'));
      else {
        const b = el('button', 'buy', night ? 'De noche' : 'Hacer');
        b.onclick = async () => {
          if (night) { sfx('error'); ui().toast('Esta tarea es de noche (20:00–07:00).', '🌙'); return; }
          ui().closePanel();
          const r = await playMG(def.minigame, { context: def.context });
          if (!r) return;
          if (gradeAtLeast(r.grade, 'C')) {
            task.done = true; addDeuros(task.reward, 'tablón'); if (task.fenix) addFenixios(1, 'tablón');
            ui().toast('¡Encargo completado!', '📌', 'good');
            if (def.id === 'concierto' && rel('nora').state !== 'desconocido') addAff('nora', 3);
          } else ui().toast('El vecino no ha quedado contento. Inténtalo otra vez.', '😕', 'bad');
          bus.emit('save');
        };
        card.appendChild(b);
      }
      body.appendChild(card);
    }
  });
}

// ================== CONVERSACIONES ==================
export async function talkTo(npc) {
  const id = npc.id, c = CHARACTERS[id], r = rel(id);
  npc.talkLock = true; G.player.faceTowards(npc.pos);
  try {
    if (r.state === 'desconocido') { r.state = 'conocido'; }
    questEvent('talk', { npc: id });
    // ¿boda pendiente?
    if (G.state.engaged === id && r.weddingDay != null && dayIndex() >= r.weddingDay) { await weddingFlow(id); return; }
    // misiones disponibles
    const avail = G.quests.availableFrom(id).filter((q) => !QUESTS[q].costF);
    if (avail.length) {
      const q = QUESTS[avail[0]];
      await ui().say(q.intro);
      G.quests.start(avail[0]);
      return;
    }
    await talkMenu(npc);
  } finally {
    npc.talkLock = false;
    bus.emit('save');
  }
}
async function secretQuest(id, qid) {
  const q = QUESTS[qid];
  await ui().say([[id, q.intro[0][1]]]);
  if (G.state.fenixios < q.costF) { await ui().say([[id, `Vuelve cuando tengas ${q.costF} Fenixios. Los secretos no se regalan.`]]); return; }
  if (await ui().confirm(`¿Pagar ${q.costF} Fenixios a Neko-san por el secreto del Fénix?`, 'Pagar', 'Más tarde')) { await ui().say(q.intro.slice(1)); G.quests.start(qid); }
}

async function talkMenu(npc) {
  const id = npc.id, c = CHARACTERS[id], r = rel(id), d = dayIndex();
  const romantic = ['pareja', 'prometidos', 'casados'].includes(r.state);
  let pool = romantic && c.greetLove ? c.greetLove : hearts(id) >= 3 && c.greetFriend ? c.greetFriend : c.greet;
  if (isNight() && c.greetNight && Math.random() < 0.5) pool = c.greetNight;
  if (isNight()) pool = pool.filter((l) => !/Buenos días/.test(l)).length ? pool.filter((l) => !/Buenos días/.test(l)) : c.greetNight || pool;
  const fresh = pool.filter((l) => l !== r.lastGreet);
  const greet = pick(fresh.length ? fresh : pool);
  r.lastGreet = greet;
  let first = true;
  while (true) {
    const opts = [];
    for (const a of G.quests.talkActions(id)) opts.push({ label: a.label, k: 'qa', a });
    for (const qid of G.quests.availableFrom(id).filter((q) => QUESTS[q].costF)) opts.push({ label: `🔥 ${QUESTS[qid].title} (${QUESTS[qid].costF} Fenixios)`, k: 'secret', qid });
    if (id === 'nora' && G.quests.status('C6') === 'done') opts.push({ label: r.lastConcertDay === d ? '🎸 Escuchar el concierto (ya hoy)' : '🎸 Escuchar el concierto', k: 'concert', disabled: r.lastConcertDay === d, why: 'Nora solo da un concierto por noche.' });
    opts.push({ label: r.lastTalkDay === d ? '💬 Charlar (ya habéis hablado hoy)' : '💬 Charlar', k: 'chat', disabled: r.lastTalkDay === d, why: 'Ya habéis charlado hoy. Vuelve mañana.' });
    const gifts = Object.keys(G.state.inventory).filter((k) => G.state.inventory[k] > 0 && itemInfo(k).kind !== 'key');
    opts.push({ label: r.lastGiftDay === d ? '🎁 Regalar (ya le has regalado hoy)' : '🎁 Regalar algo', k: 'gift', disabled: r.lastGiftDay === d || !gifts.length, why: r.lastGiftDay === d ? 'Un regalo al día es suficiente.' : 'No llevas nada para regalar.' });
    // trabajo
    if (id === 'aiko' && G.state.unlocked.super && !(G.state.job?.id === 'reponedor')) opts.push({ label: '📦 Pedir trabajo de reponedor', k: 'job', job: 'reponedor' });
    if (id === 'valeria' && G.state.interviewDone && !(G.state.job?.id === 'administrativo')) opts.push({ label: '💼 Pedir el puesto de administrativo', k: 'job', job: 'administrativo' });
    if (id === 'valeria' && !G.state.interviewDone && G.quests.status('T1') === 'done') opts.push({ label: '💼 Repetir la entrevista', k: 'interview' });
    if (id === 'marina' && G.state.unlocked.restaurante && !(G.state.job?.id === 'cocina')) opts.push({ label: '🔪 Pedir trabajo en la cocina', k: 'job', job: 'cocina' });
    // romance
    if (c.romance) {
      const block = romanceBlock(id), h = hearts(id), partner = currentPartner();
      if (['conocido', 'amistad', 'ex'].includes(r.state)) opts.push({ label: '🌹 Proponer una cita', k: 'ask', disabled: !!block || h < 5, why: block || `Necesitas 5 ♥ con ${c.short} (tienes ${h}).` });
      if (['citas', 'pareja', 'prometidos', 'casados'].includes(r.state)) opts.push({ label: r.lastDateDay === d ? '🌙 Quedar (ya habéis quedado hoy)' : '🌙 Quedar', k: 'date', disabled: r.lastDateDay === d || !!block, why: block || 'Ya habéis quedado hoy.' });
      if (r.state === 'citas') opts.push({ label: '💌 Declararte', k: 'confess', disabled: !!block || h < 7 || r.dates < 2 || (partner && partner !== id), why: partner && partner !== id ? `Ya tienes pareja (${CHARACTERS[partner].short}).` : `Necesitas 7 ♥ y 2 citas (tienes ${h} ♥ y ${r.dates} citas).` });
      if (r.state === 'pareja') opts.push({ label: '💍 Pedir matrimonio', k: 'propose', disabled: h < 9 || !hasItem('anillo'), why: !hasItem('anillo') ? 'Necesitas un anillo (Rincón Moda, 500 D).' : `Necesitas 9 ♥ (tienes ${h}).` });
      if (['citas', 'pareja', 'prometidos'].includes(r.state)) opts.push({ label: '💔 Romper', k: 'break' });
      if (r.state === 'casados') opts.push({ label: '📄 Pedir el divorcio', k: 'divorce' });
    }
    const i = await ui().choose(id, first ? greet : '¿Algo más?', opts, { cancel: 'Adiós' });
    first = false;
    if (i < 0) { await ui().say([[id, pick(c.bye || ['Hasta luego.', 'Nos vemos.', '¡Adiós!'])]]); return; }
    const o = opts[i];
    if (o.k === 'qa') await runTalkAction(id, o.a);
    else if (o.k === 'concert') {
      const res = await playMG('rhythm', { context: 'nora' });
      if (res) { r.lastConcertDay = d; const g = { S: 8, A: 6, B: 4, C: 2, D: 0 }[res.grade]; if (g) addAff(id, g); await ui().say([[id, g >= 6 ? 'Has seguido cada nota. Eso no lo hace nadie.' : g >= 2 ? 'Gracias por quedarte. Se nota cuando alguien escucha.' : 'Bueno... al menos has venido.', g >= 6 ? 'happy' : 'neutral']]); }
    }
    else if (o.k === 'secret') await secretQuest(id, o.qid);
    else if (o.k === 'chat') await chat(id);
    else if (o.k === 'gift') await giftFlow(id);
    else if (o.k === 'job') { if (id === 'valeria' && isRomanticWithValeria()) await ui().say([['valeria', 'Que conste: aquí dentro soy tu jefa. Nada más.']]); await applyJob(o.job); }
    else if (o.k === 'interview') await interviewFlow();
    else if (o.k === 'ask') await askDate(id);
    else if (o.k === 'date') await dateFlow(id);
    else if (o.k === 'confess') await confessFlow(id);
    else if (o.k === 'propose') await proposeFlow(id);
    else if (o.k === 'break') { if (await ui().confirm(`¿Seguro que quieres romper con ${c.short}?`, 'Romper', 'No')) { breakUp(id); sfx('heartbreak'); await ui().say([[id, c.breakup || 'Vale.', 'sad']]); return; } }
    else if (o.k === 'divorce') { if (await ui().confirm(`¿Divorciarte de ${c.short}? Perderás el 30% de tus Deuros.`, 'Divorciarme', 'No')) { breakUp(id, { divorce: true }); sfx('heartbreak'); await ui().say([[id, c.breakup || 'Vale.', 'sad']]); return; } }
  }
}
function isRomanticWithValeria() { return ['citas', 'pareja', 'prometidos', 'casados'].includes(rel('valeria').state); }

async function runTalkAction(id, a) {
  const run = a.run;
  if (run.minigame) await playMG(run.minigame, { context: run.context });
  else if (run.give) {
    if (!run.give.every((k) => hasItem(k))) { ui().toast('Te falta algo del encargo.', '❔'); return; }
    run.give.forEach((k) => removeItem(k));
    questEvent('give', { npc: id, item: run.as });
  } else if (run.interview) await interviewFlow();
}

async function interviewFlow() {
  let score = 0;
  for (const q of INTERVIEW) {
    const opts = shuffle(q.opts).map(([tone, label, pts]) => ({ label, tone, pts }));
    const i = await ui().choose('valeria', q.q, opts);
    score += opts[i].pts;
    await ui().say([['valeria', opts[i].pts >= 6 ? 'Bien.' : opts[i].pts >= 4 ? 'Aceptable.' : opts[i].pts >= 0 ? 'Hm.' : '...¿En serio?', opts[i].pts >= 6 ? 'happy' : 'neutral']]);
  }
  G.state.interviewDone = true;
  addAff('valeria', Math.max(0, Math.round(score / 3)), { silent: true });
  await ui().say([['valeria', score >= 15 ? 'Hacía tiempo que no hacía una entrevista tan buena. El puesto de administrativo es tuyo si lo quieres.' : 'No ha sido brillante, pero veo potencial. El puesto de administrativo es tuyo si lo quieres.']]);
  questEvent('interview', { score });
  const ok = await ui().confirm('¿Aceptas el puesto de Administrativo en Centro Fénix? (puedes pedirlo más tarde)', 'Aceptar', 'Ahora no');
  if (ok) await applyJob('administrativo');
}

// ---- Charla diaria ----
async function chat(id) {
  const c = CHARACTERS[id], r = rel(id), d = dayIndex();
  const npc = G.npcs.get(id);
  r.lastTalkDay = d; r.talks++;
  // Aiko: pregunta de memoria
  if (id === 'aiko' && r.facts.length && Math.random() < 0.35) {
    const fact = pick(r.facts);
    const opts = shuffle([fact.a, ...fact.wrong]).map((l) => ({ label: l }));
    const i = await ui().choose(id, fact.q, opts);
    if (opts[i].label === fact.a) { r.facts.splice(r.facts.indexOf(fact), 1); addAff(id, 12); npc?.ch.setExpression('blush', 3); await ui().say([[id, c.quizRight, 'blush']]); }
    else { addAff(id, -2); npc?.ch.setExpression('sad', 3); await ui().say([[id, c.quizWrong, 'sad']]); }
    addAttrXp('carisma', 4);
    return;
  }
  const all = c.topics.concat(hearts(id) >= 5 && c.topicsClose ? c.topicsClose : []);
  const pool = all.map((t, i) => i).filter((i) => !r.usedTopics.includes(i));
  // al llegar a 5♥ se priorizan los temas íntimos aún no vistos
  const closePool = pool.filter((i) => i >= c.topics.length);
  const ti = closePool.length && Math.random() < 0.6 ? pick(closePool) : pool.length ? pick(pool) : pick(all.map((t, i) => i));
  r.usedTopics.push(ti); if (r.usedTopics.length > Math.max(1, all.length - 2)) r.usedTopics.shift();
  const topic = all[ti];
  let opts = topic.opts.map(([tone, label]) => ({ tone, label }));
  if (topic.fact && !r.facts.find((f) => f.q === topic.fact.q)) r.facts.push(topic.fact);
  const i = await ui().choose(id, topic.line, opts);
  const tone = opts[i].tone;
  const res = toneDelta(id, tone);
  let delta = res.d;
  // Lucía: ojo de arquitecta
  if (id === 'lucia' && delta > 0) delta = Math.round(delta * (0.7 + homeIndex() / 100 * 0.6));
  // infidelidad al coquetear
  if (tone === 'atrevido' && romanceable(id)) { const chk = infidelityCheck(id); if (chk.partner && chk.caught) { await caughtScene(chk.partner, id); return; } }
  r.lastTone = tone; r.lastToneDay = d;
  addAff(id, delta);
  addAttrXp('carisma', 5);
  let line;
  if (tone === 'incognito') line = c.incognitoReact;
  else if (res.routine && c.routine) line = c.routine;
  else line = pick(c.react[res.kind]);
  const expr = res.kind === 'love' ? (tone === 'atrevido' && hearts(id) >= 4 ? 'blush' : 'happy') : res.kind === 'hate' ? (['marina', 'ren', 'valeria'].includes(id) ? 'angry' : 'sad') : 'neutral';
  npc?.ch.setExpression(expr, 3);
  await ui().say([[id, line, expr]]);
  // comentarios extra
  if (id === 'lucia') {
    const hi = homeIndex();
    if (hi >= 60 && Math.random() < 0.5) { await ui().say([[id, c.homeGood, 'happy']]); addAff(id, 2, { silent: true }); }
    else if (hi < 20 && Math.random() < 0.5) { await ui().say([[id, c.homeBad]]); addAff(id, -1, { silent: true }); }
  }
  if (wearingDaring() && r.lastOutfitDay !== d) {
    r.lastOutfitDay = d;
    if (['nora', 'marina'].includes(id)) { await ui().say([[id, id === 'nora' ? 'Bonito conjunto. Te queda... peligroso.' : '¡Uy! Vas que quemas hoy, ¿eh?', 'blush']]); addAff(id, 2); }
    else if (id === 'valeria' && inHours(hourFloat(), 8, 20)) { await ui().say([[id, c.daringWork, 'angry']]); addAff(id, -2); }
  }
}

// ---- Regalos ----
async function giftFlow(id) {
  const c = CHARACTERS[id], r = rel(id);
  const ids = Object.keys(G.state.inventory).filter((k) => G.state.inventory[k] > 0 && itemInfo(k).kind !== 'key');
  const opts = ids.map((k) => ({ label: `${itemInfo(k).icon} ${itemInfo(k).name}`, sub: `x${G.state.inventory[k]}`, id: k }));
  const i = await ui().choose('narr', `¿Qué le regalas a ${c.short}?`, opts, { cancel: 'Nada' });
  if (i < 0) return;
  const itemId = opts[i].id;
  removeItem(itemId);
  r.lastGiftDay = dayIndex();
  const g = giftDelta(id, itemId);
  addAff(id, g.d);
  const npc = G.npcs.get(id);
  let line = (c.gift && c.gift[g.kind]) || { love: '¡¿Para mí?! ¡Me encanta!', like: '¡Qué detalle! Muchas gracias.', neutral: 'Ah... gracias.', hate: 'Eh... gracias, supongo.' }[g.kind];
  if (id === 'marina' && itemInfo(itemId).kind === 'dish') line = g.kind === 'love' ? c.dishLove : g.kind === 'hate' ? c.dishHate : 'Comible. Tiene margen de mejora.';
  npc?.ch.setExpression(g.kind === 'love' ? 'happy' : g.kind === 'hate' ? 'sad' : 'neutral', 3);
  await ui().say([[id, line, g.kind === 'love' ? 'happy' : 'neutral']]);
  if (g.kind === 'love') sfx('heart');
}

// ---- Romance ----
async function askDate(id) {
  const c = CHARACTERS[id], r = rel(id);
  const chk = infidelityCheck(id);
  if (chk.partner && chk.caught) { await caughtScene(chk.partner, id); return; }
  r.state = 'citas';
  sfx('heart');
  await ui().say([[id, c.askDate.yes, 'blush']]);
  if (await ui().confirm(`¿Quedar ahora con ${c.short}?`, 'Vamos', 'Otro día')) await dateFlow(id, true);
}
async function dateFlow(id, skipCheck = false) {
  const c = CHARACTERS[id], r = rel(id), d = dayIndex();
  if (!skipCheck) { const chk = infidelityCheck(id); if (chk.partner && chk.caught) { await caughtScene(chk.partner, id); return; } }
  if (!hasEnergy(10)) { ui().toast('Estás demasiado cansad' + (G.state.player.gender === 'f' ? 'a' : 'o') + ' para una cita.', '😩', 'bad'); return; }
  const places = [{ label: '⛲ Paseo por la plaza', k: 'plaza' }];
  if (G.state.unlocked.restaurante) places.push({ label: '🕯️ Cena en La Llama', k: 'llama', disabled: !buildingOpen('llama'), why: 'La Llama abre de 12:00 a 01:00.' }, { label: '🎬 Cine al aire libre', k: 'cine', disabled: !isNight(), why: 'El cine es por la noche (20:00–07:00).' });
  places.push({ label: '🏠 Noche en tu casa', k: 'casa', disabled: !isNight(), why: 'Mejor por la noche.' });
  const pi = await ui().choose('narr', `¿Adónde vas con ${c.short}?`, places, { cancel: 'Mejor otro día' });
  if (pi < 0) return;
  const place = places[pi].k;
  addEnergy(-10);
  await ui().fade({ plaza: 'Paseáis bajo los cerezos...', llama: 'Una mesa para dos en La Llama...', cine: 'Empieza la película...', casa: 'En tu casa, con la luz baja...' }[place], 900);
  const target = { plaza: SPOTS.plaza_fountain, llama: SPOTS.llama_table, cine: SPOTS.cine, casa: SPOTS.home_in }[place];
  G.player.teleport(target);
  const npc = G.npcs.get(id);
  let gain = 6;
  const prompts = shuffle(c.date).slice(0, 2);
  for (const p of prompts) {
    const opts = p.opts.map(([tone, label]) => ({ tone, label }));
    const i = await ui().choose(id, p.line, opts);
    const res = toneDelta(id, opts[i].tone);
    gain += Math.round(res.d * 1.3);
    npc?.ch.setExpression(res.kind === 'love' ? 'blush' : res.kind === 'hate' ? 'sad' : 'neutral', 3);
    await ui().say([[id, pick(c.react[res.kind]), res.kind === 'love' ? 'blush' : 'neutral']]);
  }
  if (place === 'llama' && G.state.upgrades.mesa) gain += 4;
  gain = Math.max(6, Math.min(18, gain));
  r.dates++; r.lastDateDay = d;
  addAff(id, gain);
  addAttrXp('carisma', 8);
  // quedarse a dormir
  if (['pareja', 'prometidos', 'casados'].includes(r.state) && isNight()) {
    const ok = await ui().choose(id, 'Se está haciendo tarde...', [{ label: '¿Te quedas a dormir?', tone: 'atrevido' }], { cancel: 'Buenas noches (despedirse)' });
    if (ok === 0) {
      await ui().say([[id, c.sleepover, 'blush']]);
      await ui().fade('❤️', 1800);
      skipUntil(8);
      G.state.energy = 100; bus.emit('energy', {});
      G.player.teleport(SPOTS.home_in);
      await ui().say([[id, morningLine(id), 'happy']]);
      addAff(id, 5);
    }
  } else await ui().say([[id, pick(c.afterDate || ['Me lo he pasado muy bien.']), 'happy']]);
  bus.emit('save');
}
async function confessFlow(id) {
  const c = CHARACTERS[id], r = rel(id);
  await ui().fade('Respiras hondo...', 500);
  r.state = 'pareja'; r.suspicion = 0; G.state.partner = id;
  sfx('heart');
  await ui().say([[id, c.confess.yes, 'blush']]);
  await ui().banner(`¡${c.short} y tú sois pareja!`, 'Cuidado con lo que haces por el barrio...', '💞');
}
async function proposeFlow(id) {
  const c = CHARACTERS[id], r = rel(id);
  removeItem('anillo');
  r.state = 'prometidos'; G.state.engaged = id; r.weddingDay = dayIndex() + 1;
  sfx('fanfare');
  await ui().say([[id, c.propose.yes, 'blush']]);
  await ui().banner('¡Os habéis prometido!', 'La boda será mañana. Habla con tu pareja para celebrarla.', '💍');
}
async function weddingFlow(id) {
  const c = CHARACTERS[id], r = rel(id);
  await ui().fade('El barrio entero se reúne en la plaza bajo los cerezos...', 1600);
  G.player.teleport(SPOTS.plaza_fountain);
  await ui().say([
    ['goro', 'Me han pedido que oficie esto. Seré breve: el amor es como el bambú. Se dobla, pero no se rompe.'],
    ['neko', 'Y si se rompe, hay pescado en el banquete. Miau.'],
    [id, c.vows || '{name}... Sí, quiero.', 'blush'],
    ['you', 'Sí, quiero.'],
  ]);
  r.state = 'casados'; G.state.spouse = id; G.state.engaged = null; r.weddingDay = null;
  addAff(id, 10, { silent: true });
  await ui().banner('¡Recién casados!', `${c.short} se muda a tu casa (21:00–08:00).`, '💒');
  for (const o of CHAR_ORDER) if (o !== id && rel(o).state !== 'desconocido') addAff(o, 2, { silent: true });
}
async function caughtScene(partner, other) {
  const pc = CHARACTERS[partner];
  sfx('heartbreak');
  await ui().say([['narr', `${pc.short} lo ha visto todo...`], [partner, pc.caught, 'angry']]);
  const married = applyCaught(partner);
  await ui().banner(married ? 'Divorcio' : 'Ruptura', married ? `Pierdes el 30% de tus Deuros. Los rumores corren por el barrio.` : 'Los rumores corren por el barrio.', '💔');
  G.state.partner = null;
}

// ---------------- Menú principal ----------------
export function openMenu(tab = 'misiones') {
  let cur = tab;
  return ui().panel('Menú', (body, re) => {
    const tabs = el('div', 'tabs');
    for (const [k, n] of [['misiones', '📜 Misiones'], ['mochila', '🎒 Mochila'], ['relaciones', '💞 Relaciones'], ['trabajo', '💼 Trabajo'], ['mejoras', '🏠 Mejoras'], ['ajustes', '⚙️ Ajustes']]) {
      const b = el('button', `tab${k === cur ? ' on' : ''}`, n); b.onclick = () => { cur = k; sfx('click'); re(); }; tabs.appendChild(b);
    }
    body.appendChild(tabs);
    const box = el('div', 'tabbody'); body.appendChild(box);
    ({ misiones: tabQuests, mochila: tabBag, relaciones: tabRel, trabajo: tabJob, mejoras: tabUpg, ajustes: tabSettings })[cur](box, re);
  }, { wide: true });
}
function tabQuests(box) {
  const act = G.quests.active(), av = QUEST_ORDER.filter((id) => G.quests.status(id) === 'available'), done = QUEST_ORDER.filter((id) => G.quests.status(id) === 'done');
  box.appendChild(el('h3', '', 'En curso'));
  if (!act.length) box.appendChild(el('div', 'empty', 'Ninguna. Busca a los vecinos con un ❗ sobre la cabeza.'));
  for (const id of act) { const q = QUESTS[id], st = G.state.quests[id], step = q.steps[st.step]; box.appendChild(el('div', 'card row', `<div class="ic">${q.star ? '⭐' : '📜'}</div><div class="grow"><div class="nm">${q.title}</div><div class="ds">➡️ ${esc(step.desc)}${step.count ? ` (${st.count}/${step.count})` : ''}</div><div class="ds dim">De: ${CHARACTERS[q.giver].short} · Paso ${st.step + 1}/${q.steps.length}</div></div><div class="rw">${q.reward.d ? q.reward.d + ' D ' : ''}${q.reward.f ? q.reward.f + ' 🔥' : ''}</div>`)); }
  box.appendChild(el('h3', '', 'Disponibles'));
  if (!av.length) box.appendChild(el('div', 'empty', 'No hay nuevas. Desbloquea biomas o completa misiones.'));
  for (const id of av) { const q = QUESTS[id]; box.appendChild(el('div', 'card row', `<div class="ic">❗</div><div class="grow"><div class="nm">${q.title}${q.secret ? ' (secreta)' : ''}</div><div class="ds">Habla con ${CHARACTERS[q.giver].short}${q.night ? ' (solo de noche)' : ''}${q.costF ? ` · Cuesta ${q.costF} 🔥` : ''}</div><div class="ds dim">${esc(scheduleText(q.giver))}</div></div>`)); }
  const locked = QUEST_ORDER.filter((id) => G.quests.status(id) === 'locked' && !G.state.unlocked[QUESTS[id].biome]);
  if (locked.length) box.appendChild(el('div', 'note', `🔒 ${locked.length} misiones esperan en biomas bloqueados.`));
  box.appendChild(el('div', 'note', `🏆 Completadas: ${done.length}/${QUEST_ORDER.length}`));
}
function tabBag(box, re) {
  const s = G.state;
  box.appendChild(el('div', 'stats', Object.entries(ATTRS).map(([k, n]) => `<div class="stat"><span>${n}</span><b>${attr(k)}</b>${attr(k) !== s.attrs[k] ? `<i>(${attr(k) > s.attrs[k] ? '+' : ''}${attr(k) - s.attrs[k]})</i>` : ''}</div>`).join('') + `<div class="stat"><span>Índice de hogar</span><b>${homeIndex()}</b></div>${s.player.title ? `<div class="stat"><span>Título</span><b>${s.player.title}</b></div>` : ''}`));
  const ids = Object.keys(s.inventory).filter((id) => s.inventory[id] > 0);
  const grid = el('div', 'grid');
  if (!ids.length) box.appendChild(el('div', 'empty', 'Mochila vacía.'));
  for (const id of ids) {
    const info = itemInfo(id);
    const card = el('div', 'card item', `<div class="ic">${info.icon}</div><div class="nm">${info.name}</div><div class="own">x${s.inventory[id]}</div>`);
    if (info.energy) { const b = el('button', 'buy', 'Comer'); b.onclick = () => { eat(id); re(); }; card.appendChild(b); }
    grid.appendChild(card);
  }
  box.appendChild(grid);
}
function tabRel(box) {
  const s = G.state;
  const grid = el('div', 'relgrid');
  for (const id of CHAR_ORDER) {
    const c = CHARACTERS[id], r = s.rel[id];
    if (r.state === 'desconocido') { grid.appendChild(el('div', 'card rel unknown', `<div class="pt q">?</div><div class="nm">???</div><div class="ds">Aún no os conocéis.</div>`)); continue; }
    const d = dayIndex();
    const romance = c.romance ? (prefMatches(id) ? '💗 Romance posible' : '🤝 Solo amistad (preferencia)') : '🤝 Amistad';
    grid.appendChild(el('div', 'card rel', `<div class="pt" style="background-image:url(${G.ui.portraits[id] || ''})"></div><div class="grow"><div class="nm">${c.name}${c.star ? ' <span class="star">★</span>' : ''}</div><div class="ds">${c.role}</div>${heartsHtml(hearts(id))}<div class="ds"><b>${STATE_LABEL[r.state]}</b> · ${romance}${r.dates ? ` · Citas: ${r.dates}` : ''}</div><div class="ds">${r.lastTalkDay === d ? '✔ Charla' : '○ Charla'} · ${r.lastGiftDay === d ? '✔ Regalo' : '○ Regalo'}</div><div class="ds dim">${esc(c.bio)}</div><div class="ds mech">✨ ${esc(c.mechanic)}</div><div class="ds dim">🕒 ${esc(scheduleText(id))}</div></div>`));
  }
  box.appendChild(grid);
}
function tabJob(box, re) {
  const j = G.state.job;
  if (j) {
    const J = JOBS[j.id];
    box.appendChild(el('div', 'card row', `<div class="ic">💼</div><div class="grow"><div class="nm">${J.ranks[j.rank]}</div><div class="ds">${J.place} · ${J.pay[j.rank]} D por turno · Horario ${hoursText(J.hours)}</div><div class="ds">Ascenso: ${j.rank < 2 ? `${j.shiftsAtRank}/4 turnos con nota B o mejor` : 'rango máximo'}</div><div class="ds">Turnos hoy: ${j.shiftsDay === dayIndex() ? j.shiftsToday : 0}/2</div></div>`));
    const b = el('button', 'buy danger', 'Dejar el trabajo');
    b.onclick = async () => { ui().closePanel(); if (await ui().confirm(`¿Seguro que quieres dejar tu trabajo de ${J.name}?${J.bossIsBoss ? ' A tu jefa no le hará gracia.' : ''}`, 'Dejarlo', 'No')) quitJob(); };
    box.appendChild(b);
  } else box.appendChild(el('div', 'empty', 'No tienes trabajo. ¡Los Deuros no crecen en los cerezos!'));
  box.appendChild(el('h3', '', 'Empleos del barrio'));
  for (const [id, J] of Object.entries(JOBS)) {
    const where = { reponedor: 'Habla con Aiko en el Super Fénix', barista: 'Pregunta en la barra de Café Ascua', administrativo: 'Entrevista con Valeria (Centro Fénix)', cocina: 'Habla con Marina en La Llama' }[id];
    box.appendChild(el('div', `card row${G.state.unlocked[J.biome] ? '' : ' locked'}`, `<div class="ic">${{ reponedor: '📦', barista: '☕', administrativo: '📂', cocina: '🔪' }[id]}</div><div class="grow"><div class="nm">${J.name}</div><div class="ds">${J.pay.join(' / ')} D por turno · ${hoursText(J.hours)}</div><div class="ds dim">${G.state.unlocked[J.biome] ? where : '🔒 Desbloquea ' + BIOMES[J.biome].name}</div></div>`));
  }
}
function tabUpg(box, re) {
  box.appendChild(el('div', 'note', `Índice de hogar actual: <b>${homeIndex()}</b>/100. A Lucía le importa mucho.`));
  const grid = el('div', 'grid');
  for (const [id, u] of Object.entries(UPGRADES)) {
    const owned = G.state.upgrades[id], avail = G.state.unlocked[u.biome];
    const card = el('div', `card item${avail ? '' : ' locked'}`, `<div class="ic">${{ sofa: '🛋️', plantas: '🪴', lampara: '💡', tarjeta: '💳', silla: '🪑', mesa: '🕯️' }[id]}</div><div class="nm">${u.name}</div><div class="ds">${u.desc}</div>`);
    if (owned) card.appendChild(el('div', 'own', '✔ Comprado'));
    else if (!avail) card.appendChild(el('div', 'own', `🔒 ${BIOMES[u.biome].name}`));
    else { const b = el('button', 'buy', `${u.price} D`); b.onclick = () => { if (G.state.deuros < u.price) { sfx('error'); ui().toast('No te llega.', '💸', 'bad'); return; } addDeuros(-u.price); G.state.upgrades[id] = true; sfx('fanfare'); G.world.refreshHome(G.state, homeDirt()); re(); }; card.appendChild(b); }
    grid.appendChild(card);
  }
  box.appendChild(grid);
}
function tabSettings(box, re) {
  const s = G.state;
  const slider = (label, key) => {
    const row = el('div', 'setrow', `<span>${label}</span>`);
    const inp = el('input'); inp.type = 'range'; inp.min = 0; inp.max = 1; inp.step = 0.05; inp.value = s.settings[key];
    inp.oninput = () => { s.settings[key] = +inp.value; applyVolumes(); };
    row.appendChild(inp); box.appendChild(row);
  };
  slider('🎵 Música', 'music'); slider('🔊 Efectos', 'sfx');
  const btn = (label, cls, fn) => { const b = el('button', `buy ${cls}`, label); b.onclick = fn; box.appendChild(b); };
  box.appendChild(el('div', 'note', `🕒 Hora del juego: <b>${clockText()}</b>${s.timeOffset ? ` (adelantada ${Math.round(s.timeOffset / 3600000)} h respecto a la real)` : ' (hora real)'}`));
  btn('🕒 Sincronizar con la hora real', '', async () => { ui().closePanel(); if (await ui().confirm('¿Volver a la hora real del iPad? El reloj del juego retrocederá.', 'Sincronizar', 'No')) { resetToRealTime(); ui().toast(`Son las ${clockText()}`, '🕒'); } });
  btn('💾 Guardar ahora', '', () => { saveState(); ui().toast('Partida guardada', '💾', 'good'); });
  btn('🗑️ Borrar partida', 'danger', async () => { ui().closePanel(); if (await ui().confirm('¿Borrar la partida? No se puede deshacer.', 'Borrar', 'No') && await ui().confirm('¿Seguro del todo?', 'Sí, borrar', 'No')) { deleteSave(); location.reload(); } });
  box.appendChild(el('div', 'credits', 'Barrio Fénix · v1.0<br>Personajes y mundo originales. Música original generada con Suno.<br>Motor: three.js (MIT).'));
}

// ---------------- Eventos diarios ----------------
let lastDay = null;
export function dailyTick() {
  const d = dayIndex();
  if (lastDay === null) { lastDay = d; refreshBoard(); return; }
  if (d !== lastDay) {
    lastDay = d;
    refreshBoard();
    G.world.refreshHome(G.state, homeDirt());
    ui().toast('Nuevo día en Barrio Fénix', '🌅');
    if (G.state.engaged) ui().toast(`¡Hoy es tu boda con ${CHARACTERS[G.state.engaged].short}! Ve a hablar con tu pareja.`, '💒', 'love');
  }
}
