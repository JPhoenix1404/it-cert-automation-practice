// Jugador: modelo, movimiento con colisiones y cámara.
import * as THREE from '../vendor/three.module.min.js';
import { G, bus, clamp } from './game.js';
import { buildCharacter } from './character.js';
import { loadPlayerBase, customizeVRM, playerColors } from './vrm.js';
import { CLOTHES } from './data/items.js';
import { RECTS, zoneAt } from './world.js';

// Combina el aspecto base del jugador con la ropa equipada.
export function resolveLook(p) {
  const o = p.outfit || {};
  const set = CLOTHES[o.set] || CLOTHES.ini_casual;
  const look = { gender: p.gender, skin: p.skin, hair: p.hair, hairColor: p.hairColor, eyes: p.eyes, top: set.top, topColor: set.topColor, bottom: set.bottom, bottomColor: set.bottomColor || set.topColor, shoesColor: '#3a3a44', acc: [], height: p.gender === 'f' ? 0.97 : 1.02 };
  if (o.top && CLOTHES[o.top]) { look.top = CLOTHES[o.top].top; look.topColor = CLOTHES[o.top].topColor; if (look.bottom === 'none') { look.bottom = 'pants'; look.bottomColor = '#3b5b8c'; } }
  if (o.bottom && CLOTHES[o.bottom]) { look.bottom = CLOTHES[o.bottom].bottom; look.bottomColor = CLOTHES[o.bottom].bottomColor; if (look.top === 'dress' || look.top === 'swim') { look.top = 'tshirt'; look.topColor = '#f4f1ea'; } }
  if (o.shoes && CLOTHES[o.shoes]) look.shoesColor = CLOTHES[o.shoes].shoesColor;
  return look;
}

const WALK_RECTS = Object.values(RECTS);
const RADIUS = 0.35;

export class Player {
  constructor(scene) {
    this.scene = scene;
    this.pos = new THREE.Vector3();
    this.heading = 0; // 0 = mirando hacia la cámara (+z)
    this.speed = 0;
    this.camDist = 14;
    this.camTarget = new THREE.Vector3();
    this.rebuild();
    const p = G.state.player.pos;
    this.pos.set(p[0], 0, p[1]);
    this.camTarget.copy(this.pos);
    this.lastZone = zoneAt(this.pos.x, this.pos.z);
    // Modelo VRoid del jugador (si existe la base de su género)
    loadPlayerBase(G.state.player.gender).then((ch) => { if (ch) this.useVRM(ch); });
  }
  useVRM(ch) {
    customizeVRM(ch, playerColors(G.state.player, resolveLook(G.state.player)));
    const old = this.ch;
    this.vrmCh = ch; this.ch = ch;
    this.scene.add(ch.root); ch.root.position.copy(this.pos); ch.root.rotation.y = this.heading;
    this.scene.remove(old.root); old.dispose();
    ch.update(0.016, 0);
    if (G.ui?.portraitOf) G.ui.portraits.player = G.ui.portraitOf(ch);
  }
  rebuild() {
    if (this.vrmCh) { customizeVRM(this.vrmCh, playerColors(G.state.player, resolveLook(G.state.player))); return; }
    const old = this.ch;
    this.ch = buildCharacter(resolveLook(G.state.player));
    this.scene.add(this.ch.root);
    if (old) { this.scene.remove(old.root); old.dispose(); }
    this.ch.root.position.copy(this.pos);
  }
  walkable(x, z) {
    for (const r of WALK_RECTS) if (x >= r[0] + RADIUS && x <= r[2] - RADIUS && z >= r[1] + RADIUS && z <= r[3] - RADIUS) return true;
    // conectores (bordes compartidos): tolerancia
    for (const r of WALK_RECTS) if (x >= r[0] - 0.01 && x <= r[2] + 0.01 && z >= r[1] - 0.01 && z <= r[3] + 0.01) return true;
    return false;
  }
  blocked(x, z) {
    if (!this.walkable(x, z)) return true;
    for (const c of G.world.colliders) {
      if (c.off) continue;
      if (c.type === 'box') {
        const cx = clamp(x, c.x1, c.x2), cz = clamp(z, c.z1, c.z2);
        if ((x - cx) ** 2 + (z - cz) ** 2 < RADIUS * RADIUS) return true;
      } else if ((x - c.x) ** 2 + (z - c.z) ** 2 < (RADIUS + c.r) ** 2) return true;
    }
    return false;
  }
  update(dt, input, camera) {
    const v = input.vector;
    const mag = Math.hypot(v.x, v.y);
    const maxSpeed = 5.6 * (G.state.energy < 10 ? 0.7 : 1);
    const target = mag * maxSpeed;
    this.speed += (target - this.speed) * Math.min(1, dt * 12);
    if (mag > 0) {
      const ang = Math.atan2(v.x, v.y);
      let d = ang - this.heading;
      while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
      this.heading += d * Math.min(1, dt * 14);
      const step = this.speed * dt;
      const dx = (v.x / mag) * step, dz = (v.y / mag) * step;
      const nx = this.pos.x + dx, nz = this.pos.z + dz;
      if (!this.blocked(nx, nz)) { this.pos.x = nx; this.pos.z = nz; }
      else if (!this.blocked(nx, this.pos.z)) this.pos.x = nx;
      else if (!this.blocked(this.pos.x, nz)) this.pos.z = nz;
    }
    // desatascar si un collider aparece encima (puertas al cerrar)
    if (this.blocked(this.pos.x, this.pos.z)) this.unstick();
    this.ch.root.position.copy(this.pos);
    this.ch.root.rotation.y = this.heading;
    this.ch.update(dt, this.speed);
    // cámara
    this.camDist = clamp(this.camDist + input.consumeZoom(), 8, 24);
    this.camTarget.lerp(this.pos, Math.min(1, dt * 6));
    const tilt = 0.5 + ((this.camDist - 8) / 16) * 0.45;
    camera.position.set(this.camTarget.x, this.camTarget.y + this.camDist * tilt, this.camTarget.z + this.camDist * 0.9);
    camera.lookAt(this.camTarget.x, this.camTarget.y + 1.4, this.camTarget.z);
    G.state.player.pos = [Math.round(this.pos.x * 100) / 100, Math.round(this.pos.z * 100) / 100];
    const z = zoneAt(this.pos.x, this.pos.z);
    if (z !== this.lastZone) { this.lastZone = z; bus.emit('zone', { zone: z }); }
  }
  unstick() {
    for (let r = 0.3; r < 6; r += 0.3) for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
      const x = this.pos.x + Math.cos(a) * r, z = this.pos.z + Math.sin(a) * r;
      if (!this.blocked(x, z)) { this.pos.x = x; this.pos.z = z; return; }
    }
  }
  teleport(v) { this.pos.set(v.x, 0, v.z); this.camTarget.copy(this.pos); if (this.blocked(this.pos.x, this.pos.z)) this.unstick(); }
  faceTowards(v) { this.heading = Math.atan2(v.x - this.pos.x, v.z - this.pos.z); this.ch.root.rotation.y = this.heading; }
}
