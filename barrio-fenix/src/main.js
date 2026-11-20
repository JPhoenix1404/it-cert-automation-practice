// Arranque: título, aviso de edad, creador de personaje y bucle principal.
import * as THREE from '../vendor/three.module.min.js';
import { G, bus, sleep } from './game.js';
import { newState, loadState, saveState, hasSave, homeDirt, addEnergy } from './state.js';
import { World, BUILDINGS, OBJ } from './world.js';
import { Player, resolveLook } from './player.js';
import { NPCManager } from './npc.js';
import { Input } from './input.js';
import { UI, el } from './ui.js';
import { Quests, questEvent } from './quests.js';
import { buildCharacter } from './character.js';
import { CHARACTERS, CHAR_ORDER } from './data/characters.js';
import { BIOMES, CLOTHES } from './data/items.js';
import { initAudio, playMusic, sfx, applyVolumes } from './audio.js';
import { buildInteractables, talkTo, openMenu, buildingOpen, dailyTick } from './gameplay.js';
import { isNight, hourFloat } from './time.js';
import { toon } from './toon.js';
import { MiniMap, openFullMap } from './map.js';
import { loadPlayerBase, customizeVRM, playerColors } from './vrm.js';
import { preloadEnv } from './env.js';
import { preloadProps } from './props.js';
import { EffectComposer } from '../vendor/addons/postprocessing/EffectComposer.js';
import { RenderPass } from '../vendor/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from '../vendor/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from '../vendor/addons/postprocessing/OutputPass.js';
import { daylight } from './time.js';

const $ = (id) => document.getElementById(id);

// ---------------- Render ----------------
const canvas = $('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
let pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
renderer.setPixelRatio(pixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
G.renderer = renderer;
window.G = G; // útil para depurar desde la consola
const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.3, 900);
G.camera = camera;
window.addEventListener('resize', () => { renderer.setSize(window.innerWidth, window.innerHeight); camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); composer?.setSize(window.innerWidth, window.innerHeight); });
// Resplandor (bloom): farolas, farolillos, ventanas y el fénix brillan de noche
let composer = null, bloom = null;
function setupBloom(scene) {
  if (G.lowQuality) return;
  composer = new EffectComposer(renderer);
  composer.setPixelRatio(Math.min(pixelRatio, 1.5));
  composer.setSize(window.innerWidth, window.innerHeight);
  composer.addPass(new RenderPass(scene, camera));
  bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2), 0.6, 0.55, 0.88);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
}
G.lowQuality = /iPhone|Android/.test(navigator.userAgent);

// ---------------- Retratos ----------------
function makePortrait(look, isCat = false) {
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a7a8a, 1.3));
  const dl = new THREE.DirectionalLight(0xffffff, 1.4); dl.position.set(1, 2, 3); scene.add(dl);
  const ch = buildCharacter(look);
  scene.add(ch.root);
  ch.setExpression('neutral');
  const h = isCat ? 0.78 : 1.86 * (look.height || 1);
  const cam = new THREE.OrthographicCamera(-0.62, 0.62, 0.62, -0.62, 0.1, 20);
  if (isCat) { cam.left = cam.bottom = -0.55; cam.right = cam.top = 0.55; cam.updateProjectionMatrix(); }
  cam.position.set(0.25, h + 0.05, 4); cam.lookAt(0, h - 0.05, 0);
  const S = 256;
  const rt = new THREE.WebGLRenderTarget(S, S, { samples: 4 });
  rt.texture.colorSpace = THREE.SRGBColorSpace;
  renderer.setRenderTarget(rt);
  renderer.setClearColor(0x000000, 0);
  renderer.clear();
  renderer.render(scene, cam);
  const px = new Uint8Array(S * S * 4);
  renderer.readRenderTargetPixels(rt, 0, 0, S, S, px);
  renderer.setRenderTarget(null);
  const c = document.createElement('canvas'); c.width = c.height = S;
  const ctx = c.getContext('2d'); const img = ctx.createImageData(S, S);
  for (let y = 0; y < S; y++) img.data.set(px.subarray((S - 1 - y) * S * 4, (S - y) * S * 4), y * S * 4);
  ctx.putImageData(img, 0, 0);
  rt.dispose(); ch.dispose();
  return c.toDataURL('image/png');
}
// Retrato a partir de un personaje ya cargado (p. ej. un VRM)
function portraitFromRig(ch) {
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a7a8a, 1.3));
  const dl = new THREE.DirectionalLight(0xffffff, 1.4); dl.position.set(1, 2, 3); scene.add(dl);
  const root = ch.root, parent = root.parent, pos = root.position.clone(), rot = root.rotation.y, vis = root.visible;
  scene.add(root); root.position.set(0, 0, 0); root.rotation.y = 0; root.visible = true; root.updateMatrixWorld(true);
  const hp = new THREE.Vector3();
  let half = 0.42;
  if (ch.vrm) ch.vrm.humanoid.getNormalizedBoneNode('head').getWorldPosition(hp);
  else { const bb = new THREE.Box3().setFromObject(root); hp.set(0, bb.max.y * 0.72, 0); half = (bb.max.y - bb.min.y) * 0.42; }
  const cam = new THREE.OrthographicCamera(-half, half, half, -half, 0.1, 20);
  cam.position.set(0.18, hp.y + 0.02, 4); cam.lookAt(0, hp.y - 0.06, 0);
  const S = 256, rt = new THREE.WebGLRenderTarget(S, S, { samples: 4 }); rt.texture.colorSpace = THREE.SRGBColorSpace;
  renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(scene, cam);
  const px = new Uint8Array(S * S * 4); renderer.readRenderTargetPixels(rt, 0, 0, S, S, px); renderer.setRenderTarget(null);
  const c = document.createElement('canvas'); c.width = c.height = S; const ctx = c.getContext('2d'); const img = ctx.createImageData(S, S);
  for (let y = 0; y < S; y++) img.data.set(px.subarray((S - 1 - y) * S * 4, (S - y) * S * 4), y * S * 4);
  ctx.putImageData(img, 0, 0); rt.dispose();
  parent.add(root); root.position.copy(pos); root.rotation.y = rot; root.visible = vis;
  return c.toDataURL('image/png');
}
G.portrait = (id) => (id === 'player' ? makePortrait(resolveLook(G.state.player)) : G.npcs?.get(id)?.hasVRM ? portraitFromRig(G.npcs.get(id).ch) : makePortrait(G.npcs ? G.npcs.get(id).look() : { ...CHARACTERS[id].look, gender: CHARACTERS[id].gender }, !!CHARACTERS[id].isCat));

// ---------------- Título y creador ----------------
const SKINS = ['#f6dcc6', '#f1d2b6', '#e2b48e', '#c98f6a', '#9a6a4a', '#6a4430'];
const HAIRS = [['short', 'Corto'], ['spiky', 'Puntas'], ['messy', 'Despeinado'], ['buzz', 'Rapado'], ['bob', 'Bob'], ['long', 'Largo'], ['ponytail', 'Coleta'], ['twintails', 'Dos coletas'], ['wavy', 'Ondulado']];
const HAIR_COLORS = ['#1e1a22', '#4a2e22', '#8a5a34', '#e8d27a', '#c8443a', '#f2a6c8', '#6a4aa8', '#5ab8e8', '#f2f2f2'];
const EYES = ['#5a3a2a', '#4a7ac8', '#4d8a5a', '#c0302a', '#8a4ac8', '#d8a030'];
const OUTFITS = [['ini_casual', 'Casual'], ['ini_sport', 'Deportivo'], ['ini_smart', 'Elegante']];

let previewScene = null, previewCh = null, previewSpin = 0;
function setupPreview() {
  previewScene = new THREE.Scene();
  previewScene.background = new THREE.Color('#ffe8ee');
  previewScene.add(new THREE.HemisphereLight(0xffffff, 0xd8a0b0, 1.2));
  const d = new THREE.DirectionalLight(0xffffff, 1.6); d.position.set(3, 6, 5); d.castShadow = true; previewScene.add(d);
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.45, 0.3, 40), toon('#ffffff')); ped.position.y = -0.15; ped.receiveShadow = true; previewScene.add(ped);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.36, 0.05, 8, 48), toon('#ff8a5a', { emissive: '#ff6a2a', emissiveIntensity: 0.6 })); ring.rotation.x = Math.PI / 2; previewScene.add(ring);
  for (let i = 0; i < 30; i++) { const p = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), toon('#ffb7cc')); p.position.set((Math.random() - 0.5) * 8, Math.random() * 4, -2 - Math.random() * 3); previewScene.add(p); }
}
// Vista previa: base VRoid del género elegido (si existe) teñida con los colores; si no, el modelo procedural
const previewBases = {};
function refreshPreview(p) {
  const base = previewBases[p.gender];
  if (previewCh && previewCh !== base) { previewScene.remove(previewCh.root); if (!previewCh.isVRM) previewCh.dispose(); }
  if (previewCh && previewCh.isVRM && previewCh !== base) previewScene.remove(previewCh.root);
  if (base) {
    customizeVRM(base, playerColors(p, resolveLook(p)));
    if (previewCh !== base) { previewScene.add(base.root); base.root.traverse((m) => { if (m.isMesh) m.castShadow = true; }); }
    previewCh = base;
  } else {
    previewCh = buildCharacter(resolveLook(p));
    previewScene.add(previewCh.root);
    previewCh.root.traverse((m) => { if (m.isMesh) m.castShadow = true; });
  }
}

async function titleScreen() {
  const t = $('title');
  t.classList.add('show');
  $('btn-continue').style.display = hasSave() ? '' : 'none';
  return new Promise((resolve) => {
    $('btn-continue').onclick = () => { initAudio(); sfx('select'); resolve('continue'); };
    $('btn-new').onclick = async () => {
      initAudio(); sfx('select');
      if (hasSave() && !confirm('Ya tienes una partida guardada. ¿Empezar una nueva y sobrescribirla?')) return;
      resolve('new');
    };
  });
}

async function ageGate() {
  try { if (localStorage.getItem('barriofenix.age') === '1') return true; } catch {}
  const g = $('agegate'); g.classList.add('show');
  return new Promise((resolve) => {
    $('age-yes').onclick = () => { try { localStorage.setItem('barriofenix.age', '1'); } catch {} g.classList.remove('show'); resolve(true); };
    $('age-no').onclick = () => { $('age-msg').textContent = 'Este juego es solo para mayores de 18 años. ¡Vuelve cuando lo seas!'; };
  });
}

async function creator() {
  $('title').classList.remove('show');
  const c = $('creator'); c.classList.add('show');
  const p = { name: '', gender: 'm', skin: SKINS[1], hair: 'short', hairColor: HAIR_COLORS[0], eyes: EYES[0], pref: 'women', outfit: { set: 'ini_casual', top: null, bottom: null, shoes: null } };
  setupPreview(); refreshPreview(p);
  // las bases VRoid del creador se cargan aparte (no son las mismas instancias que usará el juego)
  for (const g of ['m', 'f']) fetch(`assets/characters/jugador_${g}.vrm`, { method: 'HEAD' }).then((r) => r.ok && import('./vrm.js').then((V) => V.loadVRMCharacter(`assets/characters/jugador_${g}.vrm`))).then((ch) => { if (ch) { previewBases[g] = ch; if (previewScene) { render(); refreshPreview(p); } } }).catch(() => {});
  const body = $('creator-body');
  const render = () => {
    body.innerHTML = '';
    const row = (label, content) => { const r = el('div', 'crow'); r.appendChild(el('div', 'clabel', label)); r.appendChild(content); body.appendChild(r); };
    const name = el('input', 'cname'); name.placeholder = 'Tu nombre'; name.maxLength = 14; name.value = p.name; name.oninput = () => (p.name = name.value);
    row('Nombre', name);
    const seg = (opts, cur, on) => { const w = el('div', 'seg'); for (const [v, l] of opts) { const b = el('button', v === cur ? 'on' : '', l); b.onclick = () => { sfx('click'); on(v); render(); refreshPreview(p); }; w.appendChild(b); } return w; };
    row('Sexo', seg([['m', '♂ Hombre'], ['f', '♀ Mujer']], p.gender, (v) => { p.gender = v; p.pref = v === 'm' ? 'women' : 'men'; if (v === 'f' && p.hair === 'short') p.hair = 'long'; if (v === 'm' && p.hair === 'long') p.hair = 'short'; }));
    const sw = (list, cur, on) => { const w = el('div', 'swatches'); for (const col of list) { const b = el('button', `sw${col === cur ? ' on' : ''}`); b.style.background = col; b.onclick = () => { sfx('click'); on(col); render(); refreshPreview(p); }; w.appendChild(b); } return w; };
    row('Piel', sw(SKINS, p.skin, (v) => (p.skin = v)));
    if (!previewBases[p.gender]) row('Peinado', seg(HAIRS, p.hair, (v) => (p.hair = v)));
    row('Color de pelo', sw(HAIR_COLORS, p.hairColor, (v) => (p.hairColor = v)));
    row('Ojos', sw(EYES, p.eyes, (v) => (p.eyes = v)));
    row('Ropa', seg(OUTFITS, p.outfit.set, (v) => (p.outfit.set = v)));
    row('Te interesan', seg([['women', 'Mujeres'], ['men', 'Hombres'], ['both', 'Ambos']], p.pref, (v) => (p.pref = v)));
  };
  render();
  return new Promise((resolve) => {
    $('btn-create').onclick = () => {
      if (!p.name.trim()) { sfx('error'); body.querySelector('.cname').focus(); body.querySelector('.cname').classList.add('err'); return; }
      sfx('fanfare');
      p.name = p.name.trim().slice(0, 14);
      c.classList.remove('show');
      previewScene = null;
      resolve(p);
    };
  });
}

// ---------------- Juego ----------------
let interactables = [], current = null, marker = null, edgeArrow = $('edge-arrow');
let hudT = 0, hoursT = 0, saveT = 0, perfT = 0, perfFrames = 0, insideHome = false, lastMusic = null;

async function startGame() {
  $('loading').classList.add('show');
  await Promise.all([preloadEnv(), preloadProps()]);
  $('loading').classList.remove('show');
  const scene = new THREE.Scene();
  G.scene = scene;
  G.world = new World(scene);
  setupBloom(scene);
  G.forceBloom = () => { G.noBloomAdapt = true; setupBloom(scene); };
  G.player = new Player(scene);
  G.npcs = new NPCManager(scene);
  G.quests = new Quests();
  G.input = new Input();
  G.world.refreshGates(G.state.unlocked);
  G.world.refreshHome(G.state, homeDirt());
  if (G.state.quests.X1?.status === 'active') G.world.feathers.forEach((f, i) => (f.visible = !G.state.feathers[i]));
  interactables = buildInteractables();
  // retratos
  G.ui.portraitOf = (ch) => portraitFromRig(ch);
  G.ui.refreshPortrait = (id) => { const n = G.npcs.get(id); if (n?.hasVRM) G.ui.portraits[id] = portraitFromRig(n.ch); };
  G.ui.portraits.player = G.portrait('player');
  for (const id of CHAR_ORDER) G.ui.portraits[id] = G.portrait(id);
  // marcador de misión
  marker = new THREE.Mesh(new THREE.OctahedronGeometry(0.32), toon('#ffd34d', { emissive: '#ffb020', emissiveIntensity: 0.8, unique: true }));
  marker.scale.y = 1.5; marker.renderOrder = 5; scene.add(marker);
  // hablar: expresión y gesto
  G.ui.onSpeak = (who, expr) => {
    for (const n of G.npcs.list) n.ch.talking = 0;
    if (!who || who === 'narr') return;
    if (who === 'you') { G.player.ch.talking = 2; return; }
    const n = G.npcs.get(who); if (!n) return;
    n.ch.talking = 2.5;
    if (expr && expr !== 'talk') n.ch.setExpression(expr, 4);
  };
  bus.on('save', () => saveState());
  bus.on('sfx', (e) => sfx(e.name));
  bus.on('ui:menu', () => openMenu());
  bus.on('quests', () => updateTracker());
  bus.on('rel', () => updateIndicators());
  bus.on('time:skip', () => { G.ui.updateHud(); for (const n of G.npcs.list) n.place(true); G.world.refreshHome(G.state, homeDirt()); });
  window.addEventListener('pagehide', () => saveState());
  document.addEventListener('visibilitychange', () => { if (document.hidden) saveState(); });
  $('hud').classList.add('show');
  G.minimap = new MiniMap();
  window.addEventListener('keydown', (e) => { if (e.code === 'KeyM' && !G.busy) openFullMap(); });
  G.ui.updateHud();
  updateTracker(); updateIndicators();
  applyVolumes();
  requestAnimationFrame(loop);
}

function updateTracker() {
  const t = G.quests.tracked();
  G.ui.setTracker(t ? `<div class="qt-title">${t.available ? '❗' : '📜'} ${t.title}</div><div class="qt-desc">${t.desc}</div>` : '');
  updateIndicators();
}
function updateIndicators() {
  for (const n of G.npcs.list) {
    const avail = G.quests.availableFrom(n.id).filter((q) => !['X1'].includes(q));
    const step = G.quests.active().some((q) => G.quests.step(q)?.marker === `npc:${n.id}`);
    n.setIndicator(avail.length ? 'quest' : step ? 'step' : null);
  }
}

const tmpV = new THREE.Vector3();
function updateMarker(dt) {
  const t = G.quests.tracked();
  const pos = t ? G.quests.markerPos(t.marker) : null;
  if (!pos || G.busy) { marker.visible = false; edgeArrow.style.display = 'none'; return; }
  const isNpc = t.marker.startsWith('npc:');
  const npc = isNpc ? G.npcs.get(t.marker.slice(4)) : null;
  marker.visible = !isNpc; // los NPCs ya llevan su icono
  marker.position.set(pos.x, 2.4 + Math.sin(performance.now() / 300) * 0.15, pos.z);
  marker.rotation.y += dt * 2;
  tmpV.set(pos.x, isNpc ? (npc?.def.isCat ? 1 : 2.6) : 2.4, pos.z).project(camera);
  const onScreen = tmpV.z < 1 && Math.abs(tmpV.x) < 0.92 && Math.abs(tmpV.y) < 0.88;
  if (onScreen) { edgeArrow.style.display = 'none'; return; }
  let x = tmpV.x, y = tmpV.y; if (tmpV.z > 1) { x = -x; y = -y; }
  const a = Math.atan2(-y, x);
  const m = Math.max(Math.abs(x) / 0.9, Math.abs(y) / 0.82);
  const sx = (x / m * 0.5 + 0.5) * window.innerWidth, sy = (-y / m * 0.5 + 0.5) * window.innerHeight;
  edgeArrow.style.display = 'block';
  edgeArrow.style.left = `${sx}px`; edgeArrow.style.top = `${sy}px`;
  edgeArrow.style.transform = `translate(-50%,-50%) rotate(${a}rad)`;
}

function pickInteraction() {
  const p = G.player.pos;
  let best = null, bd = 1e9;
  const npc = G.npcs.nearest(p, 2.4);
  if (npc) { best = { npc }; bd = npc.pos.distanceTo(p) - 0.3; }
  for (const it of interactables) {
    if (!it.pos || (it.enabled && !it.enabled())) continue;
    const d = Math.hypot(it.pos.x - p.x, it.pos.z - p.z);
    if (d < it.r && d < bd) { bd = d; best = { it }; }
  }
  return best;
}

async function doInteract(target) {
  if (!target) return;
  sfx('click');
  try {
    if (target.npc) await talkTo(target.npc);
    else await target.it.run();
  } catch (e) { console.error(e); G.ui.toast('Algo ha fallado. Inténtalo de nuevo.', '⚠️'); G.busy = false; }
  updateTracker();
  G.ui.updateHud();
}

function musicFor(zone) {
  if (zone === 'casa' && isNight()) return 'noche';
  return BIOMES[zone]?.music || 'casa';
}

const clock = new THREE.Clock();
function loop() {
  const dt = Math.min(0.05, clock.getDelta());
  const s = G.state;
  if (!G.busy) G.player.update(dt, G.input, camera);
  else { G.player.ch.update(dt, 0); G.input.consumeZoom(); }
  G.npcs.update(dt, G.player.pos);
  G.world.update(dt, G.player.pos);
  // interacción
  if (!G.busy) {
    current = pickInteraction();
    if (current?.npc) G.ui.setAction(`Hablar con ${current.npc.def.short}`, '💬');
    else if (current?.it) G.ui.setAction(current.it.label(), current.it.icon);
    else G.ui.setAction(null);
    if (G.input.consumeAction() && current) doInteract(current);
  } else { G.ui.setAction(null); G.input.consumeAction(); }
  // entrar en casa (misión C1) y plumas
  const hr = BUILDINGS.home.rect, pp = G.player.pos;
  const inHome = pp.x > hr[0] && pp.x < hr[2] && pp.z > hr[1] && pp.z < hr[3];
  if (inHome && !insideHome) { questEvent('interact', { id: 'enter:home' }); sfx('door'); }
  insideHome = inHome;
  if (s.quests.X1?.status === 'active') G.world.feathers.forEach((f, i) => {
    if (!s.feathers[i] && f.visible && f.position.distanceTo(tmpV.set(pp.x, 1.2, pp.z)) < 1.6) {
      s.feathers[i] = true; f.visible = false; sfx('fenix');
      G.ui.toast(`¡Pluma de fénix! (${s.feathers.filter(Boolean).length}/5)`, '🪶', 'good');
      questEvent('feather', { count: s.feathers.filter(Boolean).length });
      saveState();
    }
  });
  updateMarker(dt);
  G.minimap.update(dt);
  // ticks lentos
  hudT += dt; hoursT += dt; saveT += dt;
  if (hudT > 1) { hudT = 0; G.ui.updateHud(); dailyTick(); }
  if (hoursT > 2) {
    hoursT = 0;
    for (const id of Object.keys(BUILDINGS)) {
      if (!BUILDINGS[id].hours) continue;
      const r = BUILDINGS[id].rect, inside = pp.x > r[0] - 0.5 && pp.x < r[2] + 0.5 && pp.z > r[1] - 0.5 && pp.z < r[3] + 0.3;
      G.world.setOpenState(id, buildingOpen(id) || inside);
    }
    const m = musicFor(G.player.lastZone);
    if (m !== lastMusic) { lastMusic = m; playMusic(m); }
    updateIndicators();
  }
  if (saveT > 10) { saveT = 0; saveState(); }
  // rendimiento adaptativo
  perfT += dt; perfFrames++;
  if (perfT > 4) {
    const fps = perfFrames / perfT; perfT = 0; perfFrames = 0;
    if (fps < 42 && pixelRatio > 1.2) { pixelRatio = Math.max(1.2, pixelRatio - 0.3); renderer.setPixelRatio(pixelRatio); composer?.setPixelRatio(Math.min(pixelRatio, 1.5)); }
    else if (fps < 34 && composer && !G.noBloomAdapt) { composer = null; bloom = null; } // sin resplandor si el iPad va justo
    G.fps = fps;
  }
  if (composer) { const night = 1 - daylight(); bloom.strength = 0.1 + night * 0.55; bloom.threshold = 0.93 - night * 0.13; composer.render(); }
  else renderer.render(G.scene, camera);
  requestAnimationFrame(loop);
}

// Bucle del creador (vista previa giratoria)
function previewLoop() {
  if (!previewScene) return;
  const dt = 1 / 60;
  previewSpin += dt * 0.6;
  if (previewCh) { previewCh.root.rotation.y = Math.sin(previewSpin) * 0.6; previewCh.update(dt, 0); }
  const cam = camera;
  const wide = window.innerWidth > window.innerHeight;
  cam.position.set(wide ? 1.6 : 0, 1.5, 5.2); cam.lookAt(wide ? 1.6 : 0, 1.15, 0);
  renderer.render(previewScene, cam);
  requestAnimationFrame(previewLoop);
}

// ---------------- Inicio ----------------
async function boot() {
  G.ui = new UI();
  $('loading').classList.remove('show');
  const mode = await titleScreen();
  playMusic('menu');
  if (mode === 'continue') {
    G.state = loadState();
    if (!G.state) { alert('No se pudo cargar la partida. Empezamos una nueva.'); return location.reload(); }
    $('title').classList.remove('show');
    await startGame();
    G.ui.toast(`¡Hola de nuevo, ${G.state.player.name}!`, '🔥');
    return;
  }
  await ageGate();
  // creador: usar estado temporal para resolveLook
  G.state = newState({});
  const looping = () => previewLoop();
  setTimeout(looping, 0);
  const p = await creator();
  G.state = newState(p);
  saveState();
  await startGame();
  await sleep(400);
  await G.ui.fade('Con dos maletas y muchas dudas, llegas a Barrio Fénix...', 1800);
  await G.ui.say([['narr', 'Nueva casa. Nuevo barrio. Nueva vida.'], ['narr', 'Busca al gato con bufanda que te mira desde la puerta. Parece que quiere decirte algo.']]);
  updateTracker();
}

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  // Al publicar una versión nueva: si aún estamos en el título, recargar solo; si no, avisar.
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) return;
    if (!G.state || document.getElementById('title').classList.contains('show')) { location.reload(); return; }
    saveState();
    const b = document.createElement('button');
    b.className = 'update-btn'; b.textContent = '✨ Hay una versión nueva del juego · Toca para actualizar';
    b.onclick = () => { saveState(); location.reload(); };
    document.body.appendChild(b);
  });
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then((r) => r.update()).catch((e) => console.warn('SW', e)));
}
boot().catch((e) => { console.error(e); $('loading').innerHTML = `<div class="err">Error al iniciar: ${e.message}</div>`; });
