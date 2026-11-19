// NPCs: horarios, desplazamiento por el barrio, indicadores sobre la cabeza.
import * as THREE from '../vendor/three.module.min.js';
import { G } from './game.js';
import { CHARACTERS, CHAR_ORDER } from './data/characters.js';
import { buildCharacter } from './character.js';
import { SPOTS, BUILDINGS, zoneAt } from './world.js';
import { hourFloat, inHours } from './time.js';
import { canvasTexture } from './toon.js';

const GATE_PT = { casa: new THREE.Vector3(-16, 0, 0), super: new THREE.Vector3(0, 0, -16), trabajo: new THREE.Vector3(16, 0, 0), restaurante: new THREE.Vector3(0, 0, 16) };
const RING_ANG = { casa: Math.PI, super: -Math.PI / 2, trabajo: 0, restaurante: Math.PI / 2 };

function buildingAt(v) {
  for (const [id, b] of Object.entries(BUILDINGS)) { const r = b.rect; if (v.x > r[0] && v.x < r[2] && v.z > r[1] && v.z < r[3]) return id; }
  return null;
}
function doorOut(id) { const b = BUILDINGS[id]; return new THREE.Vector3(b.doorX, 0, b.rect[3] + 1.4); }
function doorIn(id) { const b = BUILDINGS[id]; return new THREE.Vector3(b.doorX, 0, b.rect[3] - 1.2); }

function makePath(from, to) {
  const pts = [];
  const bf = buildingAt(from), bt = buildingAt(to);
  if (bf && bf !== bt) { pts.push(doorIn(bf), doorOut(bf)); }
  const zf = zoneAt(from.x, from.z), zt = zoneAt(to.x, to.z);
  const inPlaza = (v) => Math.abs(v.x) < 14.5 && Math.abs(v.z) < 14.5;
  const zoneKey = (v, z) => (inPlaza(v) ? 'plaza' : z);
  const kf = zoneKey(bf ? doorOut(bf) : from, zf), kt = zoneKey(bt ? doorOut(bt) : to, zt);
  if (kf !== kt) {
    if (kf !== 'plaza') pts.push(GATE_PT[kf].clone());
    // rodear la fuente por un anillo de radio 6.5
    const a0 = kf === 'plaza' ? Math.atan2((bf ? doorOut(bf) : from).z, (bf ? doorOut(bf) : from).x) : RING_ANG[kf];
    const a1 = kt === 'plaza' ? Math.atan2((bt ? doorOut(bt) : to).z, (bt ? doorOut(bt) : to).x) : RING_ANG[kt];
    let d = a1 - a0; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
    const steps = Math.max(1, Math.ceil(Math.abs(d) / (Math.PI / 4)));
    for (let i = 0; i <= steps; i++) { const a = a0 + (d * i) / steps; pts.push(new THREE.Vector3(Math.cos(a) * 6.8, 0, Math.sin(a) * 6.8)); }
    if (kt !== 'plaza') pts.push(GATE_PT[kt].clone());
  }
  if (bt && bt !== bf) { pts.push(doorOut(bt), doorIn(bt)); }
  pts.push(to.clone());
  return pts;
}

function iconTexture(text, bg) {
  return canvasTexture(128, 128, (c) => {
    c.fillStyle = bg; c.strokeStyle = '#ffffff'; c.lineWidth = 8;
    c.beginPath(); c.arc(64, 60, 46, 0, Math.PI * 2); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(50, 100); c.lineTo(64, 122); c.lineTo(78, 100); c.fill();
    c.fillStyle = '#ffffff'; c.font = 'bold 64px ui-rounded, system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(text, 64, 64);
  });
}
const ICONS = {};
function icon(kind) {
  if (!ICONS[kind]) ICONS[kind] = new THREE.SpriteMaterial({ map: iconTexture({ quest: '!', step: '?', star: '★', heart: '♥' }[kind], { quest: '#ff9a1a', step: '#3aa0ff', star: '#c050ff', heart: '#ff4f8a' }[kind]), depthTest: false, transparent: true });
  return ICONS[kind];
}

export class NPC {
  constructor(id, scene) {
    this.id = id; this.def = CHARACTERS[id]; this.scene = scene;
    this.pos = new THREE.Vector3(); this.heading = 0; this.path = []; this.speed = 0;
    this.visible = false; this.spot = null; this.wanderT = 3 + Math.random() * 4; this.talkLock = false;
    this.build();
    this.indicator = new THREE.Sprite(icon('quest')); this.indicator.scale.set(0.8, 0.8, 1); this.indicator.renderOrder = 10; this.indicator.visible = false;
    this.ch.root.add(this.indicator); this.indicator.position.y = this.def.isCat ? 1.05 : 2.75;
    this.place(true);
  }
  look() {
    const L = { ...this.def.look, gender: this.def.gender };
    if (this.id === 'kaito' && G.state.quests.S3?.status === 'done') { L.acc = ['cap']; }
    return L;
  }
  build() {
    const old = this.ch;
    this.ch = buildCharacter(this.look());
    this.scene.add(this.ch.root);
    if (old) { this.ch.root.add(this.indicator); this.scene.remove(old.root); old.dispose(); }
    this.ch.root.position.copy(this.pos);
  }
  scheduledSpot() {
    const s = G.state;
    const h = hourFloat();
    if (s.spouse === this.id && inHours(h, 21, 8)) return 'home_in';
    if (this.forceSpot) return this.forceSpot;
    for (const [a, b, spot] of this.def.schedule) if (inHours(h, a, b === 24 ? 24 : b)) return spot;
    return null;
  }
  place(instant = false) {
    const spot = this.scheduledSpot();
    if (spot === this.spot && !instant) return;
    const prev = this.spot; this.spot = spot;
    if (!spot) { this.visible = false; this.ch.root.visible = false; this.path = []; return; }
    const target = SPOTS[spot].clone();
    if (instant || !this.visible || !prev) {
      this.pos.copy(target); this.path = []; this.visible = true; this.ch.root.visible = true;
      this.ch.root.position.copy(this.pos);
      this.heading = 0;
    } else {
      this.path = makePath(this.pos, target);
    }
    this.home = target.clone();
  }
  get available() { return this.visible && this.path.length === 0; }
  update(dt, playerPos) {
    this.place();
    if (!this.visible) return;
    let speed = 0;
    if (this.talkLock) {
      const a = Math.atan2(playerPos.x - this.pos.x, playerPos.z - this.pos.z);
      this.turnTo(a, dt);
    } else if (this.path.length) {
      const t = this.path[0];
      const dx = t.x - this.pos.x, dz = t.z - this.pos.z, d = Math.hypot(dx, dz);
      if (d < 0.25) this.path.shift();
      else { speed = 3.0; this.pos.x += (dx / d) * speed * dt; this.pos.z += (dz / d) * speed * dt; this.turnTo(Math.atan2(dx, dz), dt); }
    } else {
      // pequeño deambular fuera de los edificios
      this.wanderT -= dt;
      if (this.wanderT <= 0 && !buildingAt(this.home) && !this.def.isCat) {
        this.wanderT = 5 + Math.random() * 6;
        const a = Math.random() * Math.PI * 2;
        this.path = [new THREE.Vector3(this.home.x + Math.cos(a) * 0.9, 0, this.home.z + Math.sin(a) * 0.9)];
      } else if (this.wanderT <= 0) this.wanderT = 6;
      // mirar al jugador si está cerca
      const pd = this.pos.distanceTo(playerPos);
      if (pd < 4) this.turnTo(Math.atan2(playerPos.x - this.pos.x, playerPos.z - this.pos.z), dt * 0.5);
    }
    this.ch.root.position.copy(this.pos);
    this.ch.root.rotation.y = this.heading;
    // ocultar NPCs lejanos para ahorrar
    const far = this.pos.distanceToSquared(playerPos) > 55 * 55;
    this.ch.root.visible = !far;
    if (!far) this.ch.update(dt, speed);
  }
  turnTo(a, dt) {
    let d = a - this.heading; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
    this.heading += d * Math.min(1, dt * 8);
  }
  setIndicator(kind) {
    if (!kind) { this.indicator.visible = false; return; }
    this.indicator.material = icon(kind); this.indicator.visible = true;
  }
}

export class NPCManager {
  constructor(scene) {
    this.list = CHAR_ORDER.map((id) => new NPC(id, scene));
    this.byId = Object.fromEntries(this.list.map((n) => [n.id, n]));
    this.t = 0;
  }
  update(dt, playerPos) {
    this.t += dt;
    for (const n of this.list) {
      n.update(dt, playerPos);
      if (n.indicator.visible) n.indicator.position.y = (n.def.isCat ? 1.05 : 2.75) + Math.sin(this.t * 3) * 0.08;
    }
  }
  nearest(pos, maxD = 2.4) {
    let best = null, bd = maxD;
    for (const n of this.list) {
      if (!n.available || !n.ch.root.visible) continue;
      const d = Math.hypot(n.pos.x - pos.x, n.pos.z - pos.z);
      if (d < bd) { bd = d; best = n; }
    }
    return best;
  }
  get(id) { return this.byId[id]; }
}
