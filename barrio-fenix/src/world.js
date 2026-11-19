// Construcción del barrio: terreno, edificios "casa de muñecas", props, cielo y luces.
import * as THREE from '../vendor/three.module.min.js';
import { StaticBatch, toon, canvasTexture, OUTLINE_MAT } from './toon.js';
import { mergeGeometries } from '../vendor/BufferGeometryUtils.js';
import { G, clamp, lerp } from './game.js';
import { skyAt, daylight, hourFloat } from './time.js';

const PI = Math.PI;
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------------- Diseño del mapa ----------------
export const RECTS = {
  plaza: [-14, -14, 14, 14],
  casa: [-46, -18, -18, 18], casaConn: [-18.2, -4, -13.8, 4],
  super: [-20, -46, 20, -18], superConn: [-4, -18.2, 4, -13.8],
  trabajo: [18, -18, 46, 18], trabajoConn: [13.8, -4, 18.2, 4],
  restaurante: [-20, 18, 20, 46], restauranteConn: [-4, 13.8, 4, 18.2],
};
export const ZONE_OF_CONN = { superConn: 'super', trabajoConn: 'trabajo', restauranteConn: 'restaurante' };
export const GATES = {
  super: { x: 0, z: -15.8, face: 0 },
  trabajo: { x: 15.8, z: 0, face: PI / 2 },
  restaurante: { x: 0, z: 15.8, face: 0 },
};

export const SPOTS = {
  home_in: V(-26, 0, -8), home_door: V(-26, 0, -3.5), neko_spot: V(-22.8, 0, -2.2),
  lucia_garden: V(-41, 0, -1.8), lucia_porch: V(-38.6, 0, -3.6),
  goro_garden: V(-31, 0, 9.5), plaza_bench: V(6.5, 0, 7.5), plaza_bench2: V(-7.5, 0, -7.2),
  plaza_fountain: V(3.8, 0, 3.6), plaza_fountain2: V(-4.2, 0, 3.2), plaza_stage: V(-7.8, 0, 7.8),
  board: V(8.5, 0, -9.5),
  super_checkout: V(-6, 0, -30.9), super_aisle: V(3.4, 0, -34.2), super_front: V(0, 0, -24),
  office_valeria: V(37, 0, -11.2), office_ren: V(33, 0, -9.2), cafe_counter: V(26.8, 0, -10.2), trabajo_front: V(27, 0, 4),
  llama_kitchen: V(12, 0, 24.6), llama_table: V(14.2, 0, 31.0), llama_terrace: V(6, 0, 38.5), cine: V(-12, 0, 31),
  feather_0: V(-38, 0, 15), feather_1: V(-11.5, 0, -11.5), feather_2: V(-16, 0, -21.5), feather_3: V(43, 0, 15), feather_4: V(-17, 0, 43),
};

export const OBJ = {
  fridge: V(-31.2, 0, -11.9), stove: V(-29.2, 0, -11.9), windows: V(-24.5, 0, -12.2), bed: V(-21.6, 0, -9.4),
  sofa: V(-28.6, 0, -6.4), wardrobe: V(-21.3, 0, -6.2), mop: V(-23.6, 0, -5.4),
  super_cart: V(3.2, 0, -29.4), super_shelf: V(-2.5, 0, -33), super_shop: V(-3.4, 0, -29.6), moda: V(6.6, 0, -35.4),
  cafe_counter: V(26.8, 0, -8.6), work_desk: V(35.6, 0, -7.2), llama_stove: V(8, 0, 25.6),
  board: V(8.5, 0, -8.6),
  gate_super: V(0, 0, -13.2), gate_trabajo: V(13.2, 0, 0), gate_restaurante: V(0, 0, 13.2),
};

// Edificios: footprint [x1,z1,x2,z2], puerta en el muro sur (doorX)
export const BUILDINGS = {
  home:   { rect: [-32, -13.5, -20, -4.5], doorX: -26, wall: '#f3e6d4', roof: '#c8565a', floor: '#c99a6a', zone: 'casa', name: 'Tu casa' },
  lucia:  { rect: [-45, -13.5, -35, -4.5], doorX: -39.5, wall: '#e8eef3', roof: '#4f6d8f', floor: '#bfa386', zone: 'casa', name: 'Casa de Lucía', closed: true },
  super:  { rect: [-10, -40, 10, -28], doorX: 0, wall: '#f6f2ea', roof: '#3a9a5a', floor: '#e6e6ea', zone: 'super', name: 'Super Fénix', hours: [7, 23], sign: 'SUPER FÉNIX', signColor: '#2f8a4f' },
  centro: { rect: [24, -13, 40, -1], doorX: 27, wall: '#e9ecf2', roof: '#5a6a8a', floor: '#d8d2c8', zone: 'trabajo', name: 'Centro Fénix', hours: [7, 22], sign: 'CENTRO FÉNIX · CAFÉ ASCUA', signColor: '#3a4a6a' },
  llama:  { rect: [3, 23, 17, 33], doorX: 8, wall: '#f2dcc2', roof: '#a8382a', floor: '#8a5a3a', zone: 'restaurante', name: 'La Llama', hours: [12, 1], sign: 'LA LLAMA', signColor: '#b8402a' },
};

export function zoneAt(x, z) {
  for (const k of ['casa', 'super', 'trabajo', 'restaurante']) {
    const r = RECTS[k];
    if (x >= r[0] && x <= r[2] && z >= r[1] && z <= r[3]) return k;
  }
  return 'casa'; // plaza y conectores pertenecen al bioma Casa
}
export function inRect(r, x, z, m = 0) { return x >= r[0] + m && x <= r[2] - m && z >= r[1] + m && z <= r[3] - m; }

// ---------------- Mundo ----------------
export class World {
  constructor(scene) {
    this.scene = scene;
    this.colliders = [];      // {type:'box', x1,z1,x2,z2} | {type:'circle', x,z,r}
    this.covers = {};         // id → {group, mats, opacity}
    this.doorBlocks = {};     // id → collider
    this.gateBlocks = {};     // zone → collider
    this.gateMeshes = {};
    this.glow = { lamps: toon('#ffe9a8', { emissive: '#ffcf6a', emissiveIntensity: 0, unique: true }), lanterns: toon('#ff7a4a', { emissive: '#ff5a2a', emissiveIntensity: 0, unique: true }), windows: toon('#9ad0ff', { emissive: '#ffc070', emissiveIntensity: 0, unique: true }) };
    this.strings = [];
    this.time = 0;
    this.build();
  }

  addBox(x1, z1, x2, z2) { const c = { type: 'box', x1: Math.min(x1, x2), z1: Math.min(z1, z2), x2: Math.max(x1, x2), z2: Math.max(z1, z2) }; this.colliders.push(c); return c; }
  addCircle(x, z, r) { const c = { type: 'circle', x, z, r }; this.colliders.push(c); return c; }

  build() {
    const S = this.scene;
    this.lampBulbs = []; this.lanternPos = [];
    this.buildSky();
    this.buildLights();
    this.buildGround();
    const B = new StaticBatch();
    this.B = B;
    this.buildHedges(B);
    this.buildPlaza(B);
    this.buildCasa(B);
    this.buildSuper(B);
    this.buildTrabajo(B);
    this.buildRestaurante(B);
    this.buildSurroundings(B);
    const stat = B.build();
    stat.name = 'static';
    S.add(stat);
    for (const id of Object.keys(BUILDINGS)) this.buildBuilding(id);
    this.buildGates();
    this.buildPetals();
    this.buildFeathers();
    this.buildFireflies();
  }

  // ---------- Cielo ----------
  buildSky() {
    const geo = new THREE.SphereGeometry(420, 32, 16);
    this.skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: new THREE.Color() }, horizon: { value: new THREE.Color() } },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);} ',
      fragmentShader: 'uniform vec3 top; uniform vec3 horizon; varying vec3 vP;\nvoid main(){ float h = clamp(vP.y*1.6+0.08,0.0,1.0); gl_FragColor = vec4(mix(horizon, top, pow(h,0.7)),1.0);\n#include <colorspace_fragment>\n}',
    });
    this.sky = new THREE.Mesh(geo, this.skyMat);
    this.sky.renderOrder = -10;
    this.scene.add(this.sky);
    // estrellas
    const n = 700, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const th = Math.random() * PI * 2, ph = Math.acos(Math.random() * 0.9 + 0.08);
      pos[i * 3] = Math.cos(th) * Math.sin(ph) * 400; pos[i * 3 + 1] = Math.cos(ph) * 400; pos[i * 3 + 2] = Math.sin(th) * Math.sin(ph) * 400;
    }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, fog: false });
    this.stars = new THREE.Points(sg, this.starMat);
    this.scene.add(this.stars);
    // luna y sol (sprites)
    const disc = (inner, outer) => canvasTexture(128, 128, (c) => { const g = c.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, inner); g.addColorStop(0.35, inner); g.addColorStop(0.45, outer); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, 128, 128); });
    this.moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: disc('#fffbe8', 'rgba(255,250,220,0.25)'), transparent: true, depthWrite: false, fog: false }));
    this.moon.scale.set(60, 60, 1); this.scene.add(this.moon);
    this.sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: disc('#fff6d0', 'rgba(255,220,150,0.35)'), transparent: true, depthWrite: false, fog: false }));
    this.sunSprite.scale.set(90, 90, 1); this.scene.add(this.sunSprite);
    // nubes
    this.clouds = new THREE.Group();
    const cm = toon('#ffffff', { unique: true });
    this.cloudMat = cm;
    for (let i = 0; i < 9; i++) {
      const g = new THREE.Group();
      for (let j = 0; j < 4; j++) { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), cm); m.position.set(j * 5 - 7, Math.random() * 2, Math.random() * 3); m.scale.set(6 + Math.random() * 3, 3 + Math.random() * 1.5, 4); g.add(m); }
      const a = (i / 9) * PI * 2;
      g.position.set(Math.cos(a) * 180, 70 + Math.random() * 25, Math.sin(a) * 180 - 40);
      this.clouds.add(g);
    }
    this.scene.add(this.clouds);
  }

  buildLights() {
    this.hemi = new THREE.HemisphereLight(0xffffff, 0x8a7a6a, 0.9);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xffffff, 1.3);
    this.sun.castShadow = true;
    const q = G.lowQuality ? 1024 : 2048;
    this.sun.shadow.mapSize.set(q, q);
    const sc = this.sun.shadow.camera; sc.left = -28; sc.right = 28; sc.top = 28; sc.bottom = -28; sc.near = 1; sc.far = 120;
    this.sun.shadow.bias = -0.0006; this.sun.shadow.normalBias = 0.03;
    this.scene.add(this.sun); this.scene.add(this.sun.target);
    // farolas de la plaza (pocas luces reales; el resto es emisivo)
    this.nightLights = [];
    for (const [x, z, col] of [[0, 0, 0xff9a5a], [-30, -2.5, 0xffd090]]) {
      const l = new THREE.PointLight(col, 0, 16, 1.6); l.position.set(x, 3.2, z); this.scene.add(l); this.nightLights.push(l);
    }
    this.scene.fog = new THREE.Fog(0xc8d8f0, 70, 240);
  }

  buildGround() {
    // Hierba con ligera variación (textura de canvas)
    const tex = canvasTexture(256, 256, (c) => {
      c.fillStyle = '#86c96f'; c.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 1400; i++) { c.fillStyle = Math.random() < 0.5 ? 'rgba(70,140,60,0.25)' : 'rgba(170,220,120,0.25)'; c.fillRect(Math.random() * 256, Math.random() * 256, 2, 3 + Math.random() * 3); }
    });
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(40, 40);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), toon('#ffffff', { map: tex, unique: true }));
    ground.rotation.x = -PI / 2; ground.receiveShadow = true;
    this.scene.add(ground);
    // Pavimentos
    const B = new StaticBatch();
    const pave = (r, color, y = 0.02) => B.box(r[2] - r[0], 0.04, r[3] - r[1], color, (r[0] + r[2]) / 2, y, (r[1] + r[3]) / 2, 0, { outline: false });
    // plaza circular
    B.geo(new THREE.CylinderGeometry(13, 13, 0.05, 48), '#e9dcc4', 0, 0.025, 0, { outline: false });
    B.geo(new THREE.CylinderGeometry(9, 9, 0.06, 48), '#dccbb0', 0, 0.03, 0, { outline: false });
    for (const k of ['casaConn', 'superConn', 'trabajoConn', 'restauranteConn']) pave(RECTS[k], '#d8ccb6');
    // caminos interiores
    pave([-46, -4, -18, 4], '#d8ccb6', 0.015); pave([-28, -4.5, -24, -3.6], '#cbbba0', 0.03); pave([-41.5, -4.5, -37.5, -3.6], '#cbbba0', 0.03);
    pave([-4, -46, 4, -18], '#d8ccb6', 0.03); pave([-20, -28, 20, -18], '#b9b3ad', 0.015);
    for (let x = -18; x <= 18; x += 4) if (Math.abs(x) > 5) B.box(0.15, 0.05, 4, '#f4f0e6', x, 0.05, -21, 0, { outline: false });
    pave([18, -4, 46, 4], '#d8ccb6', 0.015); pave([22, -1, 34, 10], '#cfc4b0', 0.03);
    pave([-4, 18, 4, 46], '#d8ccb6', 0.015); pave([1, 34, 19, 43], '#b88a60', 0.03); pave([-18, 26, -6, 36], '#c8bca8', 0.03);
    const g = B.build({ castShadow: false });
    this.scene.add(g);
  }

  buildHedges(B) {
    const H = 0.85, T = 0.8, col = '#4f9a54';
    const line = (x1, z1, x2, z2, gaps = []) => {
      const horiz = z1 === z2;
      const a = horiz ? x1 : z1, b = horiz ? x2 : z2;
      let segs = [[a, b]];
      for (const [g1, g2] of gaps) segs = segs.flatMap(([s, e]) => (g2 <= s || g1 >= e) ? [[s, e]] : [[s, Math.max(s, g1)], [Math.min(e, g2), e]].filter(([p, q]) => q - p > 0.1));
      for (const [s, e] of segs) {
        const len = e - s, mid = (s + e) / 2;
        if (horiz) { B.box(len, H, T, col, mid, H / 2, z1, 0, { thickness: 0.05 }); this.addBox(s, z1 - T / 2, e, z1 + T / 2); }
        else { B.box(T, H, len, col, x1, H / 2, mid, 0, { thickness: 0.05 }); this.addBox(x1 - T / 2, s, x1 + T / 2, e); }
      }
    };
    const R = RECTS;
    // plaza
    line(-14, -14, 14, -14, [[-4, 4]]); line(-14, 14, 14, 14, [[-4, 4]]);
    line(-14, -14, -14, 14, [[-4, 4]]); line(14, -14, 14, 14, [[-4, 4]]);
    // conectores
    line(-18, -4, -14, -4); line(-18, 4, -14, 4);
    line(14, -4, 18, -4); line(14, 4, 18, 4);
    line(-4, -18, -4, -14); line(4, -18, 4, -14);
    line(-4, 14, -4, 18); line(4, 14, 4, 18);
    // zonas
    const z = (r, gapSide, gap) => {
      line(r[0], r[1], r[2], r[1], gapSide === 'n' ? [gap] : []);
      line(r[0], r[3], r[2], r[3], gapSide === 's' ? [gap] : []);
      line(r[0], r[1], r[0], r[3], gapSide === 'w' ? [gap] : []);
      line(r[2], r[1], r[2], r[3], gapSide === 'e' ? [gap] : []);
    };
    z(R.casa, 'e', [-4, 4]); z(R.super, 's', [-4, 4]); z(R.trabajo, 'w', [-4, 4]); z(R.restaurante, 'n', [-4, 4]);
  }

  tree(B, x, z, kind = 'sakura', s = 1, collide = true) {
    const trunk = '#7a5236', o = this.cheap ? { outline: false } : {};
    B.geo(new THREE.CylinderGeometry(0.18 * s, 0.28 * s, 2.2 * s, 7), trunk, x, 1.1 * s, z, o);
    if (kind === 'pine') {
      for (let i = 0; i < 3; i++) B.geo(new THREE.ConeGeometry((1.8 - i * 0.45) * s, 1.8 * s, 8), '#2f7a4a', x, (2.2 + i * 1.1) * s, z, o);
    } else {
      const col = kind === 'sakura' ? ['#ffb7cc', '#ffc9d8', '#f6a2bd'] : ['#5aa85a', '#6cba62', '#4c9a50'];
      const blobs = [[0, 3.0, 0, 1.5], [0.9, 2.6, 0.3, 1.1], [-0.9, 2.7, -0.2, 1.15], [0.2, 3.6, -0.5, 1.0], [-0.3, 2.5, 0.9, 1.0]];
      blobs.forEach(([bx, by, bz, r], i) => B.geo(new THREE.IcosahedronGeometry(1, this.cheap ? 0 : 1), col[i % 3], x + bx * s, by * s, z + bz * s, { sx: r * s, sy: r * s * 0.85, sz: r * s, ...o }));
    }
    if (collide) this.addCircle(x, z, 0.45 * s);
  }
  lamp(B, x, z, collide = true) {
    B.geo(new THREE.CylinderGeometry(0.07, 0.1, 3.2, 8), '#2e2e38', x, 1.6, z);
    B.geo(new THREE.CylinderGeometry(0.26, 0.18, 0.1, 8), '#2e2e38', x, 3.3, z);
    this.lampBulbs.push([x, 3.12, z]);
    if (collide) this.addCircle(x, z, 0.2);
  }
  bench(B, x, z, ry = 0) {
    B.box(2.0, 0.12, 0.6, '#a8703e', x, 0.5, z, ry);
    B.box(2.0, 0.5, 0.1, '#a8703e', x - Math.sin(ry) * 0.28, 0.8, z - Math.cos(ry) * 0.28, ry);
    for (const s of [-0.8, 0.8]) B.box(0.1, 0.5, 0.5, '#3a3a44', x + Math.cos(ry) * s, 0.25, z - Math.sin(ry) * s, ry, { outline: false });
    const w = Math.abs(Math.cos(ry)) > 0.5 ? [1.0, 0.35] : [0.35, 1.0];
    this.addBox(x - w[0], z - w[1], x + w[0], z + w[1]);
  }
  chair(B, x, z, ry = 0) {
    B.box(0.45, 0.06, 0.45, '#8a5a34', x, 0.45, z, ry, { outline: false });
    B.box(0.45, 0.45, 0.06, '#8a5a34', x - Math.sin(ry) * 0.2, 0.7, z - Math.cos(ry) * 0.2, ry, { outline: false });
    B.box(0.38, 0.44, 0.38, '#3a3a40', x, 0.22, z, ry, { outline: false });
  }
  car(B, x, z, color, ry = 0) {
    B.box(1.8, 0.7, 3.8, color, x, 0.55, z, ry, { thickness: 0.03 });
    B.box(1.6, 0.6, 2.0, '#dfe8f2', x, 1.15, z + (Math.cos(ry) > 0 ? -0.2 : 0.2), ry, { thickness: 0.03 });
    for (const sx of [-0.9, 0.9]) for (const sz of [-1.2, 1.2]) B.geo(new THREE.CylinderGeometry(0.33, 0.33, 0.25, 12), '#1e1e24', x + sx, 0.33, z + sz, { rz: PI / 2, outline: false });
    this.addBox(x - 1, z - 2, x + 1, z + 2);
  }
  flowers(B, x, z, w, d, colors = ['#ff6a8a', '#ffd34d', '#ffffff', '#b07aff']) {
    B.box(w, 0.3, d, '#7a5a3a', x, 0.15, z, 0, { outline: false });
    for (let i = 0; i < w * d * 3; i++) B.geo(new THREE.IcosahedronGeometry(0.14, 0), colors[i % colors.length], x + (Math.random() - 0.5) * (w - 0.3), 0.42, z + (Math.random() - 0.5) * (d - 0.3), { outline: false });
    this.addBox(x - w / 2, z - d / 2, x + w / 2, z + d / 2);
  }

  buildPlaza(B) {
    // Fuente del Fénix
    B.geo(new THREE.CylinderGeometry(3.6, 3.8, 0.6, 32), '#c9b9a0', 0, 0.3, 0);
    B.geo(new THREE.CylinderGeometry(3.2, 3.2, 0.3, 32), '#8a9aa8', 0, 0.2, 0, { outline: false });
    B.geo(new THREE.CylinderGeometry(0.6, 0.9, 1.6, 12), '#c9b9a0', 0, 1.0, 0);
    this.addCircle(0, 0, 3.9);
    const water = new THREE.Mesh(new THREE.CylinderGeometry(3.15, 3.15, 0.1, 32), toon('#7fd0f0', { transparent: true, opacity: 0.8, unique: true }));
    water.position.y = 0.48; this.scene.add(water); this.water = water;
    this.buildJet();
    // Fénix (estatua dorada)
    const fenix = new StaticBatch();
    const gold = '#f0b23a', fire = '#ff6a3a';
    fenix.geo(new THREE.SphereGeometry(1, 12, 10), gold, 0, 2.3, 0, { sx: 0.45, sy: 0.6, sz: 0.4 });
    fenix.geo(new THREE.SphereGeometry(1, 12, 10), gold, 0, 3.05, 0.15, { sx: 0.28, sy: 0.28, sz: 0.28 });
    fenix.geo(new THREE.ConeGeometry(0.1, 0.35, 6), '#ffd27a', 0, 3.0, 0.5, { rx: PI / 2 });
    for (const sd of [-1, 1]) {
      fenix.geo(new THREE.ConeGeometry(0.5, 2.2, 6), gold, sd * 1.1, 2.9, -0.1, { rz: sd * -1.0, sz: 0.25 });
      fenix.geo(new THREE.ConeGeometry(0.35, 1.6, 6), fire, sd * 1.7, 3.4, -0.1, { rz: sd * -0.6, sz: 0.2 });
    }
    for (let i = -1; i <= 1; i++) fenix.geo(new THREE.ConeGeometry(0.22, 1.6, 6), i === 0 ? fire : gold, i * 0.3, 1.9, -0.7, { rx: -2.3, rz: i * 0.3 });
    fenix.geo(new THREE.ConeGeometry(0.15, 0.5, 6), fire, 0, 3.45, -0.05, { rx: -0.4 });
    this.fenixMat = toon('#ffffff', { vc: true, emissive: '#ff7a2a', emissiveIntensity: 0, unique: true });
    const fg = fenix.build({ material: this.fenixMat });
    this.scene.add(fg); this.fenix = fg;
    // bancos, farolas, árboles, tablón, escenario
    this.bench(B, 6.5, 9, 0); this.bench(B, -7.5, -9, PI); this.bench(B, 9.5, 3, -PI / 2); this.bench(B, -9.5, -3, PI / 2);
    for (const [x, z] of [[-9, 9], [9, -9], [9, 9], [-9, -9], [-12, 5], [12, -5]]) this.lamp(B, x, z);
    for (const [x, z, k] of [[-11.5, 11.5, 'sakura'], [11.5, 11.5, 'sakura'], [11.5, -11.5, 'sakura'], [-11.8, -11.5, 'green']]) this.tree(B, x, z, k, 0.9);
    this.flowers(B, 6, -4.5, 2, 1); this.flowers(B, -5.5, 5.5, 1.2, 1.2, ['#ff6a8a', '#ffb3c6']);
    // tablón del barrio
    B.box(2.6, 1.6, 0.15, '#8a5a34', 8.5, 1.6, -10, 0);
    for (const sx of [-1.2, 1.2]) B.box(0.15, 2.4, 0.15, '#6a4224', 8.5 + sx, 1.2, -10, 0);
    for (let i = 0; i < 5; i++) B.box(0.5, 0.6, 0.02, ['#fffbe8', '#ffe0e8', '#e0f0ff'][i % 3], 8.5 - 0.9 + i * 0.45, 1.6 + (i % 2) * 0.2 - 0.1, -9.9, (i - 2) * 0.05, { outline: false });
    this.addBox(7.1, -10.3, 9.9, -9.7);
    // escenario de Nora
    B.geo(new THREE.CylinderGeometry(1.6, 1.7, 0.25, 20), '#8a6a8a', -8.4, 0.12, 8.4, { outline: false });
    B.box(0.5, 0.9, 0.5, '#2a2a30', -9.6, 0.45, 9.4, 0.3);
    // farolillos de papel entre farolas
    const string = (a, b) => { const pts = []; for (let i = 0; i <= 8; i++) { const t = i / 8; const x = lerp(a[0], b[0], t), z = lerp(a[1], b[1], t); const y = 3.45 - Math.sin(t * PI) * 0.7; pts.push(new THREE.Vector3(x, y + 0.22, z)); if (i > 0 && i < 8) this.lanternPos.push([x, y, z]); } this.strings.push(pts); };
    string([-9, 9], [9, 9]); string([9, -9], [-9, -9]); string([-9, -9], [-9, 9]); string([9, -9], [9, 9]);
  }

  buildCasa(B) {
    // Jardín de Lucía, buzón, jardín de Goro, árboles
    this.flowers(B, -43, -2, 3, 1.4, ['#a6c8ff', '#d8b8ff', '#ffffff']);
    this.flowers(B, -36.5, -2, 2, 1.4, ['#a6c8ff', '#ffffff']);
    B.box(0.4, 1.1, 0.3, '#3a6ac8', -34.5, 0.55, -3.5, 0); this.addCircle(-34.5, -3.5, 0.3);
    B.box(0.4, 1.1, 0.3, '#d8344a', -21, 0.55, -3.5, 0); this.addCircle(-21, -3.5, 0.3);
    // jardín zen de Goro
    B.box(9, 0.08, 6, '#efe6d0', -31, 0.05, 11, 0, { outline: false });
    for (let i = 0; i < 6; i++) B.box(8.6, 0.02, 0.06, '#d8cdb4', -31, 0.1, 8.6 + i * 0.9, 0, { outline: false });
    for (const [x, z, s] of [[-34, 12, 0.6], [-28.5, 12.6, 0.45], [-32, 9.2, 0.35]]) { B.geo(new THREE.DodecahedronGeometry(1, 0), '#8a8a90', x, s * 0.6, z, { sx: s * 1.3, sy: s, sz: s }); this.addCircle(x, z, s * 1.1); }
    this.tree(B, -26.5, 12.5, 'pine', 0.6); this.tree(B, -35.5, 14.5, 'sakura', 0.7);
    this.flowers(B, -27, 8, 1.6, 1, ['#ff3a5a', '#ff8a9a']); this.flowers(B, -35, 8, 1.6, 1, ['#ff3a5a', '#ffe0e0']);
    B.geo(new THREE.CylinderGeometry(0.35, 0.45, 0.9, 6), '#9a9a9a', -36, 0.45, 11.5); B.geo(new THREE.ConeGeometry(0.6, 0.45, 6), '#9a9a9a', -36, 1.12, 11.5); this.addCircle(-36, 11.5, 0.5);
    for (const [x, z, k] of [[-44, 3, 'green'], [-44, 16, 'sakura'], [-20, 16, 'green'], [-20, 8, 'sakura'], [-44, 9, 'pine'], [-19.5, -16, 'pine'], [-33.5, -16.5, 'green']]) this.tree(B, x, z, k, 0.85);
    for (const [x, z] of [[-30, -2.5], [-37, 4.5], [-23, 4.5], [-42, 4.5]]) this.lamp(B, x, z);
    this.bench(B, -24, 10.5, -PI / 2);
  }

  buildSuper(B) {
    // aparcamiento y adornos
    for (const [x, z] of [[-14, -24], [14, -24], [-14, -42], [14, -42]]) this.lamp(B, x, z);
    for (const [x, z, k] of [[-18, -44, 'pine'], [18, -44, 'pine'], [-18, -30, 'green'], [18, -30, 'sakura']]) this.tree(B, x, z, k, 0.85);
    B.box(1.2, 1.9, 0.9, '#d8344a', 12, 0.95, -27.4, 0); B.box(0.9, 1.0, 0.05, '#ffe0a0', 12, 1.25, -26.94, 0, { outline: false }); this.addBox(11.4, -27.9, 12.6, -26.9);
    this.car(B, -15, -21.5, '#e8443a'); this.car(B, 7.5, -21.5, '#4a8ad8'); this.car(B, 15.5, -21.5, '#f2f2f2');
    B.box(1.0, 1.9, 0.9, '#3a8ad8', 13.4, 0.95, -27.4, 0); B.box(0.7, 1.0, 0.05, '#cfe8ff', 13.4, 1.25, -26.94, 0, { outline: false }); this.addBox(12.9, -27.9, 13.9, -26.9);
    for (let i = 0; i < 4; i++) B.box(0.8, 0.9, 1.2, '#9aa0aa', -13 + i * 0.25, 0.5, -26.5 + i * 0.05, 0, { thickness: 0.02 });
    this.addBox(-13.5, -27.2, -11.8, -25.8);
  }

  buildTrabajo(B) {
    for (const [x, z] of [[21, 6], [33, 6], [44, 6], [21, -6]]) this.lamp(B, x, z);
    for (const [x, z, k] of [[44, 16, 'green'], [44, -16, 'pine'], [36, 15, 'sakura'], [20, 15, 'green'], [42, -2, 'green']]) this.tree(B, x, z, k, 0.85);
    this.flowers(B, 36, 2.4, 6, 1.2, ['#ffd34d', '#ff8a5a']);
    this.bench(B, 31, 9.5, 0); this.bench(B, 38, 9.5, 0);
    // fuente moderna
    B.geo(new THREE.CylinderGeometry(1.6, 1.7, 0.5, 20), '#c0c6d0', 40, 0.25, 11); this.addCircle(40, 11, 1.7);
    B.geo(new THREE.CylinderGeometry(1.4, 1.4, 0.06, 20), '#7fd0f0', 40, 0.5, 11, { outline: false });
    B.geo(new THREE.TorusKnotGeometry(0.45, 0.12, 48, 8), '#e8b84a', 40, 1.5, 11);
    for (const [x, z] of [[24, 12], [26, 12], [42, 4.5]]) { B.geo(new THREE.CylinderGeometry(0.5, 0.4, 0.7, 10), '#8a8a94', x, 0.35, z); B.geo(new THREE.IcosahedronGeometry(0.6, 1), '#4c9a50', x, 1.0, z); this.addCircle(x, z, 0.55); }
    for (let i = 0; i < 4; i++) { B.geo(new THREE.TorusGeometry(0.35, 0.05, 6, 14), '#2a2a30', 34 + i * 0.9, 0.4, 14, { outline: false }); B.geo(new THREE.TorusGeometry(0.35, 0.05, 6, 14), '#2a2a30', 34 + i * 0.9, 0.4, 15.2, { outline: false }); B.box(0.06, 0.06, 1.2, ['#e8443a', '#4a8ad8', '#ffd34d', '#7ad07a'][i], 34 + i * 0.9, 0.75, 14.6, 0, { outline: false }); }
    this.addBox(33.5, 13.6, 37.4, 15.6);
  }

  buildRestaurante(B) {
    for (const [x, z] of [[-6, 22], [-16, 22], [-6, 40], [18, 36]]) this.lamp(B, x, z);
    for (const [x, z, k] of [[-18, 44, 'sakura'], [18, 44, 'sakura'], [-18, 20, 'green'], [19, 20, 'pine']]) this.tree(B, x, z, k, 0.85);
    // terraza
    for (const [x, z] of [[5.5, 37], [10, 38.5], [14.5, 37], [7.5, 41.5], [13, 41.8]]) {
      B.geo(new THREE.CylinderGeometry(0.6, 0.6, 0.08, 14), '#f4efe4', x, 0.8, z); B.geo(new THREE.CylinderGeometry(0.06, 0.06, 0.8, 6), '#3a3a40', x, 0.4, z, { outline: false });
      B.geo(new THREE.ConeGeometry(1.5, 0.6, 10), x % 2 > 1 ? '#c8443a' : '#f4efe4', x, 2.5, z); B.geo(new THREE.CylinderGeometry(0.04, 0.04, 2.3, 5), '#3a3a40', x, 1.6, z, { outline: false });
      this.addCircle(x, z, 0.7);
    }
    { const pts = []; for (let i = 0; i < 10; i++) { const y = 3.1 - Math.sin((i / 9) * PI) * 0.5; this.lanternPos.push([3 + i * 1.5, y, 34.6]); pts.push(new THREE.Vector3(3 + i * 1.5, y + 0.22, 34.6)); } this.strings.push(pts); }
    for (const [x, z] of [[5.5, 37], [10, 38.5], [14.5, 37], [7.5, 41.5], [13, 41.8]]) for (const a of [0, 2.1, 4.2]) this.chair(B, x + Math.cos(a) * 1.0, z + Math.sin(a) * 1.0, -a + PI / 2);
    // cine al aire libre
    B.box(8, 4, 0.2, '#f6f6f6', -12, 2.6, 25.5, 0); B.box(8.4, 4.4, 0.15, '#2a2a30', -12, 2.6, 25.4, 0, { outline: false });
    for (const sx of [-4, 4]) B.box(0.25, 4.8, 0.25, '#2a2a30', -12 + sx, 2.4, 25.4, 0);
    this.addBox(-16.2, 25.2, -7.8, 25.8);
    this.bench(B, -14, 30, PI); this.bench(B, -10, 30, PI); this.bench(B, -14, 33, PI); this.bench(B, -10, 33, PI);
  }

  buildSurroundings(B) {
    // anillo de árboles fuera de los límites + edificios lejanos
    const inside = (x, z) => Object.values(RECTS).some((r) => x > r[0] - 2 && x < r[2] + 2 && z > r[1] - 2 && z < r[3] + 2);
    let n = 0;
    const FB = new StaticBatch(); this.cheap = true;
    for (let i = 0; i < 900 && n < 120; i++) {
      const x = (Math.random() - 0.5) * 130, z = (Math.random() - 0.5) * 130;
      if (inside(x, z)) continue;
      this.tree(FB, x, z, ['sakura', 'green', 'pine', 'green'][n % 4], 0.8 + Math.random() * 0.6, false); n++;
    }
    this.cheap = false;
    this.scene.add(FB.build({ castShadow: false }));
    // cables de los farolillos
    for (const pts of this.strings) B.geo(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.025, 4), '#2a2226', 0, 0, 0, { outline: false });
    // charcos de luz bajo las farolas (una sola malla aditiva)
    const poolTex = canvasTexture(64, 64, (c) => { const g = c.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,200,120,0.9)'); g.addColorStop(1, 'rgba(255,170,80,0)'); c.fillStyle = g; c.fillRect(0, 0, 64, 64); });
    const discs = this.lampBulbs.map(([x, , z]) => { const g = new THREE.CircleGeometry(3.2, 20); g.rotateX(-PI / 2); g.translate(x, 0.09, z); return g; });
    this.poolMat = new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    const pools = new THREE.Mesh(mergeGeometries(discs), this.poolMat); pools.renderOrder = 1;
    this.scene.add(pools);
    // edificios del horizonte
    const tex = canvasTexture(128, 256, (c) => {
      c.fillStyle = '#ffffff'; c.fillRect(0, 0, 128, 256);
      for (let y = 8; y < 256; y += 22) for (let x = 8; x < 128; x += 20) { c.fillStyle = Math.random() < 0.45 ? '#ffe9a0' : '#1a2030'; c.fillRect(x, y, 12, 14); }
    });
    this.skyTex = tex;
    const winTex = canvasTexture(128, 256, (c) => {
      c.fillStyle = '#000'; c.fillRect(0, 0, 128, 256);
      for (let y = 8; y < 256; y += 22) for (let x = 8; x < 128; x += 20) if (Math.random() < 0.45) { c.fillStyle = '#ffd37a'; c.fillRect(x, y, 12, 14); }
    });
    this.skylineMat = new THREE.MeshLambertMaterial({ color: 0xb8c0d0, map: null, emissive: 0xffffff, emissiveMap: winTex, emissiveIntensity: 0 });
    const sk = new THREE.Group();
    for (let i = 0; i < 46; i++) {
      const a = (i / 46) * PI * 2 + Math.random() * 0.05, r = 95 + Math.random() * 30;
      const h = 12 + Math.random() * 30, w = 8 + Math.random() * 8;
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), this.skylineMat);
      m.position.set(Math.cos(a) * r, h / 2, Math.sin(a) * r);
      const c = new THREE.Color().setHSL(0.6 + Math.random() * 0.1, 0.15, 0.55 + Math.random() * 0.2);
      m.material = this.skylineMat;
      sk.add(m);
    }
    this.scene.add(sk);
    // montañas
    const mm = toon('#8ea2c8', { unique: true });
    this.mountainMat = mm;
    for (let i = 0; i < 12; i++) { const a = (i / 12) * PI * 2 + 0.2; const m = new THREE.Mesh(new THREE.ConeGeometry(40 + Math.random() * 20, 50 + Math.random() * 30, 6), mm); m.position.set(Math.cos(a) * 200, 20, Math.sin(a) * 200); this.scene.add(m); }
    // bombillas de farolas y farolillos (dos mallas emisivas)
    const lb = new StaticBatch();
    for (const [x, y, z] of this.lampBulbs) lb.geo(new THREE.SphereGeometry(0.2, 10, 8), '#ffffff', x, y, z, { outline: false });
    this.scene.add(lb.build({ material: this.glow.lamps, castShadow: false }));
    const ln = new StaticBatch();
    this.lanternPos.forEach(([x, y, z], i) => ln.geo(new THREE.SphereGeometry(0.15, 10, 8), ['#ffffff', '#ffd0a0', '#ffb0b0'][i % 3], x, y, z, { sy: 1.35, outline: false }));
    this.lanternMesh = ln.build({ material: toon('#ffffff', { vc: true, emissive: '#ff6a2a', emissiveIntensity: 0, unique: true }), castShadow: false });
    this.glow.lanterns = this.lanternMesh.userData.mesh.material;
    this.scene.add(this.lanternMesh);
  }

  // ---------- Edificios ----------
  buildBuilding(id) {
    const b = BUILDINGS[id];
    const [x1, z1, x2, z2] = b.rect;
    const W = x2 - x1, D = z2 - z1, cx = (x1 + x2) / 2, cz = (z1 + z2) / 2;
    const H = 3.4, T = 0.3, doorW = 2.4;
    const shell = new StaticBatch();
    shell.box(W, 0.12, D, b.floor, cx, 0.06, cz, 0, { outline: false });
    shell.box(W, H, T, b.wall, cx, H / 2, z1, 0, { thickness: 0.05 });
    shell.box(T, H, D, b.wall, x1, H / 2, cz, 0, { thickness: 0.05 });
    shell.box(T, H, D, b.wall, x2, H / 2, cz, 0, { thickness: 0.05 });
    shell.box(W, 0.35, T + 0.04, darkerHex(b.wall), cx, 0.17, z1, 0, { outline: false });
    this.scene.add(shell.build());
    this.addBox(x1 - T / 2, z1 - T / 2, x2 + T / 2, z1 + T / 2);
    this.addBox(x1 - T / 2, z1, x1 + T / 2, z2);
    this.addBox(x2 - T / 2, z1, x2 + T / 2, z2);
    // muro sur con hueco de puerta (forma parte de la "cubierta" que se desvanece)
    const cover = new StaticBatch();
    const dl = b.doorX - doorW / 2, dr = b.doorX + doorW / 2;
    cover.box(dl - x1, H, T, b.wall, (x1 + dl) / 2, H / 2, z2, 0, { thickness: 0.05 });
    cover.box(x2 - dr, H, T, b.wall, (dr + x2) / 2, H / 2, z2, 0, { thickness: 0.05 });
    cover.box(doorW, H - 2.4, T, b.wall, b.doorX, 2.4 + (H - 2.4) / 2, z2, 0, { thickness: 0.05 });
    cover.box(W, 0.35, T + 0.04, darkerHex(b.wall), cx, 0.17, z2, 0, { outline: false });
    // ventanas en fachada
    const winB = new StaticBatch();
    for (let wx = x1 + 1.6; wx < x2 - 1; wx += 3) if (Math.abs(wx - b.doorX) > 2) {
      winB.box(1.4, 1.1, 0.05, '#ffffff', wx, 1.9, z2 + 0.18, 0, { outline: false });
      cover.box(1.6, 0.1, 0.12, '#ffffff', wx, 1.3, z2 + 0.2, 0, { outline: false });
    }
    // marco puerta
    cover.box(doorW + 0.3, 0.2, T + 0.1, '#6a4a34', b.doorX, 2.45, z2, 0, { outline: false });
    // tejado a dos aguas
    const roofH = 1.8;
    const roofGeo = new THREE.CylinderGeometry(0.01, 1, 1, 4, 1, false, PI / 4);
    cover.geo(roofGeo, b.roof, cx, H + roofH / 2, cz, { sx: W * 0.78, sy: roofH, sz: D * 0.78, thickness: 0.06 });
    cover.box(W + 0.6, 0.25, D + 0.6, darkerHex(b.roof), cx, H + 0.05, cz, 0, { thickness: 0.04 });
    this.addBox(x1, z2 - T / 2, dl, z2 + T / 2);
    this.addBox(dr, z2 - T / 2, x2, z2 + T / 2);
    const coverMat = toon('#ffffff', { vc: true, unique: true, transparent: true, opacity: 1 });
    const outMat = OUTLINE_MAT.clone(); outMat.transparent = true;
    const cg = cover.build({ material: coverMat });
    if (cg.userData.outline) cg.userData.outline.material = outMat;
    const wg = winB.build({ material: this.glow.windows, castShadow: false }); cg.add(wg); cg.userData.win = wg;
    // letrero
    if (b.sign) {
      const tex = canvasTexture(512, 96, (c) => {
        c.fillStyle = b.signColor; c.beginPath(); c.roundRect(4, 4, 504, 88, 20); c.fill();
        c.fillStyle = '#ffffff'; c.font = 'bold 50px ui-rounded, "Hiragino Maru Gothic ProN", system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText(b.sign, 256, 52, 480);
      });
      const signMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
      const sh = 0.8, sw = Math.min(W - 1, sh * 512 / 96 * 1.3);
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(sw, sw * 96 / 512), signMat);
      sign.position.set(cx, 2.95, z2 + 0.22);
      cg.add(sign); cg.userData.sign = signMat;
    }
    // puerta (cerrada si fuera de horario)
    const doorMat = toon('#6a4a34', { unique: true, transparent: true });
    const door = new THREE.Mesh(new THREE.BoxGeometry(doorW, 2.4, 0.12), doorMat);
    door.position.set(b.doorX, 1.2, z2); door.castShadow = true; door.visible = !!b.closed;
    cg.add(door);
    this.scene.add(cg);
    this.covers[id] = { group: cg, mat: coverMat, out: outMat, opacity: 1, door, doorMat };
    this.doorBlocks[id] = this.addBox(dl, z2 - 0.3, dr, z2 + 0.3); this.doorBlocks[id].off = !b.closed;
    // interior
    const I = new StaticBatch();
    this.furnish(id, I, b);
    const ig = I.build();
    this.scene.add(ig);
  }

  furnish(id, I, b) {
    const box = (w, h, d, col, x, y, z, ry = 0, coll = true, o) => { I.box(w, h, d, col, x, y, z, ry, o); if (coll) this.addBox(x - w / 2, z - d / 2, x + w / 2, z + d / 2); };
    if (id === 'home') {
      // cocina
      box(4.2, 0.95, 0.9, '#f2f2f2', -29.8, 0.48, -12.8);
      I.box(4.2, 0.06, 0.95, '#b8b0a8', -29.8, 0.98, -12.8, 0, { outline: false });
      box(1.0, 2.1, 0.9, '#e8eef6', -31.4, 1.05, -12.8);
      I.box(0.06, 0.6, 0.04, '#9aa0aa', -31.0, 1.4, -12.3, 0, { outline: false });
      I.box(0.8, 0.05, 0.6, '#2a2a30', -29.2, 1.02, -12.8, 0, { outline: false });
      // ventanas (cristales sucios/limpios)
      this.homeGlassMat = toon('#9ad0ff', { unique: true, transparent: true, opacity: 0.85 });
      for (const wx of [-25.5, -23]) {
        I.box(1.8, 1.4, 0.08, '#ffffff', wx, 1.9, -13.32, 0, { outline: false });
        const glass = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.2, 0.06), this.homeGlassMat);
        glass.position.set(wx, 1.9, -13.26); this.scene.add(glass);
      }
      // cama
      box(2.0, 0.5, 3.0, '#8a6a4a', -21.3, 0.25, -11.5);
      I.box(1.9, 0.25, 2.9, '#f6f2ee', -21.3, 0.6, -11.5, 0, { outline: false });
      I.box(1.9, 0.2, 1.8, '#6a8acc', -21.3, 0.75, -11.0, 0, { outline: false });
      I.box(1.2, 0.2, 0.5, '#ffffff', -21.3, 0.82, -12.6, 0, { outline: false });
      // sofá + mesa + alfombra + TV
      this.sofaGroup = new StaticBatch();
      this.addBox(-30.3, -7.8, -29.3, -5.4);
      for (const [fx, c] of [[-27.5, '#ffb7cc'], [-21.5, '#7ec8ff']]) { I.box(1.0, 0.75, 0.05, '#6a4a34', fx, 2.2, -13.3, 0, { outline: false }); I.box(0.85, 0.6, 0.06, c, fx, 2.2, -13.27, 0, { outline: false }); }
      I.box(0.06, 0.5, 1.6, '#8a5a34', -31.8, 1.8, -9.5, 0, { outline: false }); for (let i = 0; i < 5; i++) I.box(0.25, 0.32, 0.12, ['#e8443a', '#4a8ad8', '#ffd34d', '#7ad07a', '#b07aff'][i], -31.65, 2.2, -10.1 + i * 0.28, 0, { outline: false });
      I.box(4, 0.03, 3, '#e8d4a8', -27.2, 0.14, -7.4, 0, { outline: false });
      box(0.9, 0.4, 1.4, '#a07a4a', -27.6, 0.2, -6.8);
      box(0.4, 1.0, 1.8, '#2a2a30', -24.9, 0.5, -6.8);
      I.box(0.06, 0.9, 1.6, '#3a4a6a', -25.12, 1.3, -6.8, 0, { outline: false });
      // mesa y sillas
      box(1.4, 0.75, 1.0, '#a8805a', -26.5, 0.38, -10.6);
      for (const sx of [-0.9, 0.9]) I.box(0.5, 0.45, 0.5, '#8a6a4a', -26.5 + sx, 0.23, -10.6, 0);
      // armario + espejo
      box(0.7, 2.2, 1.6, '#e8d8c0', -20.6, 1.1, -6.2);
      I.box(0.05, 1.6, 0.7, '#cfe8ff', -20.98, 1.3, -6.2, 0, { outline: false });
      // cubo de fregar
      I.geo(new THREE.CylinderGeometry(0.3, 0.25, 0.5, 10), '#3a8ad8', -23.6, 0.25, -5.4);
      I.geo(new THREE.CylinderGeometry(0.03, 0.03, 1.6, 5), '#c8a070', -23.3, 0.85, -5.4, { rz: 0.25, outline: false });
      this.addCircle(-23.6, -5.4, 0.35);
      // mejoras opcionales (plantas/lámpara) se crean en refreshUpgrades
      this.homeExtras = new THREE.Group(); this.scene.add(this.homeExtras);
    } else if (id === 'lucia') {
      // interior no visitable
    } else if (id === 'super') {
      const shelf = (x, z, w) => {
        box(w, 2.0, 0.9, '#e0e4ea', x, 1.0, z);
        const cols = ['#ff6a5a', '#ffd34d', '#5ac8ff', '#7ad07a', '#ff9ad0', '#b07aff', '#ffffff', '#ffa040'];
        for (let lvl = 0; lvl < 3; lvl++) for (let i = 0; i < w / 0.45; i++) for (const sd of [-1, 1]) I.box(0.34, 0.4, 0.3, cols[(i + lvl * 3 + (sd > 0 ? 1 : 0)) % cols.length], x - w / 2 + 0.25 + i * 0.45, 0.35 + lvl * 0.6, z + sd * 0.32, 0, { outline: false });
      };
      shelf(-3, -39.3, 13); shelf(-2.5, -36, 10); shelf(-2.5, -32.4, 10);
      // cajas
      box(2.6, 1.0, 0.8, '#3aa05a', -6, 0.5, -29.9);
      I.box(0.6, 0.4, 0.5, '#2a2a30', -6.6, 1.2, -29.9, 0);
      box(2.6, 1.0, 0.8, '#3aa05a', -2.8, 0.5, -29.9);
      // carros
      for (let i = 0; i < 3; i++) { I.box(0.8, 0.7, 1.1, '#b8c0cc', 4.2 + i * 0.25, 0.6, -29.4, 0, { thickness: 0.02 }); }
      this.addBox(3.6, -30, 5.2, -28.8);
      // Rincón Moda
      I.box(4.6, 0.04, 9.6, '#ffe0ec', 7.6, 0.14, -34.6, 0, { outline: false });
      for (const z of [-37.8, -34.6]) {
        box(3.4, 0.1, 0.5, '#c0c0c8', 7.6, 1.9, z, 0, false);
        for (const sx of [-1.6, 1.6]) I.box(0.08, 1.9, 0.08, '#8a8a94', 7.6 + sx, 0.95, z, 0, { outline: false });
        this.addBox(5.9, z - 0.3, 9.3, z + 0.3);
        ['#ff6a8a', '#5a8aff', '#ffd34d', '#1a1a1a', '#ffffff', '#a0142c', '#2fb3c4'].forEach((c, i) => I.box(0.4, 1.0, 0.08, c, 6.2 + i * 0.45, 1.35, z, 0.5, { outline: false }));
      }
      box(0.1, 2.2, 1.2, '#cfe8ff', 9.8, 1.1, -31.2);
    } else if (id === 'centro') {
      // tabique café / oficina
      box(0.25, 3.4, 6.5, '#d8dce6', 30.5, 1.7, -9.75);
      // Café Ascua
      I.box(6, 0.05, 11.6, '#a8805a', 27.3, 0.14, -7, 0, { outline: false });
      box(5, 1.05, 0.9, '#6a4a34', 27, 0.52, -9.4);
      I.box(5, 0.06, 0.95, '#2a2a30', 27, 1.06, -9.4, 0, { outline: false });
      I.box(0.9, 0.7, 0.6, '#c0c6d0', 25.4, 1.4, -9.5, 0);
      I.box(0.6, 0.4, 0.5, '#d8344a', 26.6, 1.3, -9.5, 0);
      box(5, 2.2, 0.5, '#4a3424', 27, 1.1, -12.6);
      for (let i = 0; i < 6; i++) I.geo(new THREE.CylinderGeometry(0.12, 0.1, 0.3, 8), ['#f4f4f4', '#d8b080', '#8a5a3a'][i % 3], 25 + i * 0.8, 2.4, -12.5, { outline: false });
      for (const [x, z] of [[25.5, -4], [28.5, -4]]) for (const sx of [-0.8, 0.8]) this.chair(I, x + sx, z, sx > 0 ? -PI / 2 : PI / 2);
      for (const [x, z] of [[25.5, -4], [28.5, -4]]) { I.geo(new THREE.CylinderGeometry(0.5, 0.5, 0.06, 14), '#f4efe4', x, 0.78, z); I.geo(new THREE.CylinderGeometry(0.06, 0.06, 0.78, 6), '#3a3a40', x, 0.39, z, { outline: false }); this.addCircle(x, z, 0.55); }
      // Oficina
      I.box(9.4, 0.04, 11.6, '#9aa8b8', 35.3, 0.14, -7, 0, { outline: false });
      const desk = (x, z, big) => { box(big ? 2.6 : 1.8, 0.78, 0.9, big ? '#4a3a30' : '#e8e8ea', x, 0.39, z); I.box(0.8, 0.5, 0.06, '#1e2230', x, 1.05, z - 0.25, 0, { outline: false }); I.box(0.5, 0.5, 0.5, '#2a2a34', x, 0.25, z + 0.8, 0, { outline: false }); };
      desk(37, -12, true); desk(33, -8.2); desk(35.6, -8.2); desk(38.2, -8.2); desk(33, -4.6); desk(35.6, -4.6);
      box(0.6, 1.4, 0.6, '#c0dcff', 39.4, 0.7, -2.2);
      box(1.0, 1.0, 0.7, '#d0d0d4', 31.2, 0.5, -2.0);
      I.box(3, 1.6, 0.06, '#ffffff', 34, 2.0, -12.8, 0, { outline: false });
      I.geo(new THREE.IcosahedronGeometry(0.5, 1), '#4c9a50', 39.3, 1.3, -12.3); I.geo(new THREE.CylinderGeometry(0.3, 0.25, 0.7, 8), '#d8c8b0', 39.3, 0.35, -12.3); this.addCircle(39.3, -12.3, 0.4);
    } else if (id === 'llama') {
      // cocina abierta
      box(10.5, 1.0, 0.9, '#c0c6d0', 10, 0.5, 23.9);
      I.box(10.5, 0.06, 0.95, '#7a7a84', 10, 1.02, 23.9, 0, { outline: false });
      for (const x of [7, 8.5]) I.geo(new THREE.CylinderGeometry(0.28, 0.28, 0.06, 12), '#1a1a1a', x, 1.07, 23.9, { outline: false });
      I.geo(new THREE.CylinderGeometry(0.3, 0.26, 0.25, 12), '#3a3a44', 8, 1.2, 23.9);
      box(10.5, 0.9, 0.5, '#8a5a3a', 10, 1.1, 26.3);
      I.box(10.5, 0.06, 0.6, '#d8c8a8', 10, 1.57, 26.3, 0, { outline: false });
      // mesas con velas
      for (const [x, z] of [[6, 29.6], [10, 29.6], [14, 29.6], [6, 31.8], [10, 31.8]]) {
        box(1.2, 0.76, 1.2, '#5a3a26', x, 0.38, z);
        I.box(1.25, 0.03, 1.25, '#f4f0e6', x, 0.78, z, 0, { outline: false });
        I.geo(new THREE.CylinderGeometry(0.05, 0.05, 0.18, 6), '#fff0c8', x, 0.88, z, { outline: false });
        for (const sx of [-0.85, 0.85]) this.chair(I, x + sx, z, sx > 0 ? -PI / 2 : PI / 2);
      }
      this.candles = [[6, 29.6], [10, 29.6], [14, 29.6], [6, 31.8], [10, 31.8]];
    }
  }

  // ---------- Chorro de la fuente ----------
  buildJet() {
    const n = 90, pos = new Float32Array(n * 3);
    this.jetV = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { pos[i * 3 + 1] = -10; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.jet = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xcfefff, size: 0.16, transparent: true, opacity: 0.85, depthWrite: false }));
    this.jet.frustumCulled = false; this.scene.add(this.jet); this.jetI = 0;
  }
  updateJet(dt) {
    const p = this.jet.geometry.attributes.position, v = this.jetV;
    for (let k = 0; k < 3; k++) { const i = this.jetI++ % p.count; const a = Math.random() * PI * 2; p.setXYZ(i, Math.cos(a) * 0.5, 1.9, Math.sin(a) * 0.5); v[i * 3] = Math.cos(a) * 1.4; v[i * 3 + 1] = 1.2 + Math.random(); v[i * 3 + 2] = Math.sin(a) * 1.4; }
    for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y < 0.4) continue; v[i * 3 + 1] -= 6 * dt; p.setXYZ(i, p.getX(i) + v[i * 3] * dt, y + v[i * 3 + 1] * dt, p.getZ(i) + v[i * 3 + 2] * dt); }
    p.needsUpdate = true;
  }

  // ---------- Barreras de biomas bloqueados ----------
  buildGates() {
    const mk = (zone, r) => {
      const [x1, z1, x2, z2] = r;
      const horiz = (x2 - x1) > (z2 - z1);
      const len = horiz ? x2 - x1 : z2 - z1;
      const g = new THREE.Group();
      const mat = new THREE.MeshBasicMaterial({ color: 0xff8a3a, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false });
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(len, 3), mat);
      plane.position.set((x1 + x2) / 2, 1.5, (z1 + z2) / 2);
      if (!horiz) plane.rotation.y = PI / 2;
      g.add(plane);
      const post = toon('#3a2a2a');
      for (const s of [-1, 1]) {
        const p = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 3.4, 8), post);
        p.position.set(horiz ? (x1 + x2) / 2 + s * len / 2 : (x1 + x2) / 2, 1.7, horiz ? (z1 + z2) / 2 : (z1 + z2) / 2 + s * len / 2);
        p.castShadow = true; g.add(p);
      }
      const fb = new StaticBatch();
      for (let i = 0; i <= 4; i++) { const t = -len / 2 + (i * len) / 4; fb.box(0.18, 1.2, 0.18, '#8a5a34', horiz ? (x1 + x2) / 2 + t : (x1 + x2) / 2, 0.6, horiz ? (z1 + z2) / 2 : (z1 + z2) / 2 + t, 0); }
      for (const y of [0.45, 0.95]) fb.box(horiz ? len : 0.1, 0.14, horiz ? 0.1 : len, '#a8703e', (x1 + x2) / 2, y, (z1 + z2) / 2, 0);
      g.add(fb.build());
      const label = { super: 'Supermercado', trabajo: 'Trabajo', restaurante: 'Restaurante' }[zone];
      const cost = { super: 3, trabajo: 6, restaurante: 10 }[zone];
      const tex = canvasTexture(512, 160, (c) => { c.fillStyle = '#fff8ec'; c.beginPath(); c.roundRect(6, 6, 500, 148, 26); c.fill(); c.lineWidth = 8; c.strokeStyle = '#ff7a45'; c.stroke(); c.fillStyle = '#3a2a3a'; c.font = 'bold 46px ui-rounded, system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('🔒 ' + label, 256, 56); c.fillStyle = '#c8443a'; c.fillText(cost + ' 🔥 Fenixios', 256, 112); });
      const sign = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true })); sign.scale.set(3.6, 1.12, 1);
      sign.position.set((x1 + x2) / 2, 2.6, (z1 + z2) / 2); g.add(sign);
      mat.opacity = 0.2;
      this.scene.add(g);
      this.gateMeshes[zone] = { group: g, mat };
      this.gateBlocks[zone] = this.addBox(x1, z1, x2, z2);
    };
    mk('super', [-4, -16.4, 4, -15.6]);
    mk('trabajo', [15.6, -4, 16.4, 4]);
    mk('restaurante', [-4, 15.6, 4, 16.4]);
  }
  refreshGates(unlocked) {
    for (const z of Object.keys(this.gateMeshes)) {
      const open = !!unlocked[z];
      this.gateMeshes[z].group.visible = !open;
      this.gateBlocks[z].off = open;
    }
  }

  // ---------- Pétalos, plumas y luciérnagas ----------
  buildPetals() {
    const n = G.lowQuality ? 120 : 260;
    const pos = new Float32Array(n * 3);
    this.petalVel = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { pos[i * 3] = (Math.random() - 0.5) * 50; pos[i * 3 + 1] = Math.random() * 12; pos[i * 3 + 2] = (Math.random() - 0.5) * 50; this.petalVel[i * 3] = 0.3 + Math.random() * 0.5; this.petalVel[i * 3 + 1] = -(0.4 + Math.random() * 0.5); this.petalVel[i * 3 + 2] = Math.random() * 0.3; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const tex = canvasTexture(32, 32, (c) => { c.fillStyle = '#ffc2d4'; c.beginPath(); c.ellipse(16, 16, 12, 7, 0.6, 0, PI * 2); c.fill(); c.fillStyle = '#ff9ab8'; c.beginPath(); c.ellipse(16, 16, 5, 3, 0.6, 0, PI * 2); c.fill(); });
    this.petals = new THREE.Points(g, new THREE.PointsMaterial({ map: tex, size: 0.32, transparent: true, depthWrite: false, alphaTest: 0.1 }));
    this.petals.frustumCulled = false;
    this.scene.add(this.petals);
  }
  buildFeathers() {
    this.feathers = [];
    const mat = toon('#ffc040', { emissive: '#ff7a1a', emissiveIntensity: 0.6, unique: true });
    for (let i = 0; i < 5; i++) {
      const p = SPOTS['feather_' + i];
      const g = new THREE.Group();
      const f = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.9, 6), mat); f.scale.z = 0.3; g.add(f);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.35, 6), toon('#ff5a2a', { emissive: '#ff3a1a', emissiveIntensity: 0.8 })); tip.position.y = 0.55; tip.scale.z = 0.3; g.add(tip);
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTexture(64, 64, (c) => { const gr = c.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,200,90,0.9)'); gr.addColorStop(1, 'rgba(255,120,40,0)'); c.fillStyle = gr; c.fillRect(0, 0, 64, 64); }), transparent: true, depthWrite: false }));
      halo.scale.set(2, 2, 1); g.add(halo);
      g.position.set(p.x, 1.2, p.z); g.rotation.z = 0.4; g.visible = false;
      this.scene.add(g); this.feathers.push(g);
    }
    this.featherMat = mat;
  }
  buildFireflies() {
    const n = 40, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { pos[i * 3] = -31 + (Math.random() - 0.5) * 14; pos[i * 3 + 1] = 0.5 + Math.random() * 2; pos[i * 3 + 2] = 10 + (Math.random() - 0.5) * 10; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.fireflyBase = pos.slice();
    this.fireflies = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xfff08a, size: 0.35, map: canvasTexture(32, 32, (c) => { const gr = c.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, '#fff'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, 32, 32); }), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.scene.add(this.fireflies);
  }

  // ---------- Hogar / mejoras ----------
  refreshHome(state, dirt) {
    if (this.homeGlassMat) {
      this.homeGlassMat.color.set(dirt.windows ? '#8a7a5a' : '#bfe6ff');
      this.homeGlassMat.opacity = dirt.windows ? 0.92 : 0.6;
    }
    if (this.homeExtras) {
      this.homeExtras.clear();
      const B = new StaticBatch();
      if (state.upgrades.plantas) for (const [x, z] of [[-31.4, -5.2], [-20.9, -8.4], [-26.4, -12.9]]) { B.geo(new THREE.CylinderGeometry(0.25, 0.2, 0.45, 8), '#d8a070', x, 0.23, z); B.geo(new THREE.IcosahedronGeometry(0.42, 1), '#4caa54', x, 0.8, z); }
      if (state.upgrades.lampara) { B.geo(new THREE.CylinderGeometry(0.04, 0.04, 1.5, 6), '#3a3a40', -31.3, 0.75, -8.4); B.geo(new THREE.ConeGeometry(0.35, 0.4, 10, 1, true), '#ffe0a0', -31.3, 1.6, -8.4); }
      if (state.upgrades.sofa) { B.box(1.05, 0.55, 2.5, '#5a7ac8', -29.8, 0.28, -6.6, 0); B.box(0.32, 0.95, 2.5, '#4a6ab8', -30.25, 0.62, -6.6, 0); B.box(0.5, 0.3, 0.5, '#ffd34d', -29.6, 0.7, -5.8, 0.3); }
      else { B.box(1.0, 0.5, 2.4, '#c8705a', -29.8, 0.25, -6.6, 0); B.box(0.3, 0.9, 2.4, '#b8604a', -30.25, 0.6, -6.6, 0); }
      if (!dirt.floor) { /* suelo brillante: sin manchas */ } else for (const [x, z, s] of [[-27, -9, 0.5], [-24.2, -11, 0.4], [-28.8, -10.8, 0.35], [-22.5, -7.6, 0.45]]) B.geo(new THREE.CylinderGeometry(s, s, 0.02, 12), '#7a6040', x, 0.13, z, { outline: false });
      const g = B.build({ castShadow: false });
      this.homeExtras.add(g);
      if (state.upgrades.lampara) { if (!this.homeLamp) { this.homeLamp = new THREE.PointLight(0xffc880, 0, 7, 1.5); this.homeLamp.position.set(-31.3, 1.7, -8.4); this.scene.add(this.homeLamp); } }
    }
  }

  setOpenState(id, open) {
    const c = this.covers[id], b = BUILDINGS[id];
    if (!c || b.closed) return;
    c.door.visible = !open;
    this.doorBlocks[id].off = open;
  }

  // ---------- Actualización por frame ----------
  update(dt, playerPos) {
    this.time += dt;
    const h = hourFloat();
    const sky = skyAt(h), day = daylight(h);
    this.skyMat.uniforms.top.value.setHex(sky.top);
    this.skyMat.uniforms.horizon.value.setHex(sky.horizon);
    this.scene.fog.color.setHex(sky.horizon);
    // sol: arco este → oeste entre 07 y 20
    const t = clamp((h - 6.5) / 14, 0, 1);
    const ang = t * PI;
    const sunDir = new THREE.Vector3(Math.cos(ang) * 0.9, Math.max(0.15, Math.sin(ang)), 0.55).normalize();
    const night = 1 - day;
    const dir = day > 0.02 ? sunDir : new THREE.Vector3(-0.4, 0.8, 0.5).normalize(); // luz de luna
    this.sun.color.setHex(sky.sun);
    this.sun.intensity = sky.sunIntensity;
    const tgt = playerPos || new THREE.Vector3();
    this.sun.position.copy(tgt).addScaledVector(dir, 60);
    this.sun.target.position.copy(tgt);
    this.hemi.color.setHex(sky.ambient);
    this.hemi.groundColor.setHex(day > 0.5 ? 0x8a7a6a : 0x2a2440);
    this.hemi.intensity = 0.55 + day * 0.45;
    this.sunSprite.position.copy(sunDir).multiplyScalar(380); this.sunSprite.material.opacity = day;
    this.moon.position.set(-150, 220, -250); this.moon.material.opacity = night;
    this.starMat.opacity = night * 0.95;
    this.cloudMat.color.setHex(day > 0.5 ? 0xffffff : 0x6a6a9a);
    this.mountainMat.color.setHex(day > 0.5 ? 0x8ea2c8 : 0x2a3058);
    this.clouds.rotation.y += dt * 0.004;
    // brillo nocturno
    const glow = clamp(night * 1.3, 0, 1);
    this.glow.lamps.emissiveIntensity = glow * 1.6;
    this.glow.lanterns.emissiveIntensity = glow * 1.4 + 0.05;
    this.skylineMat.emissiveIntensity = glow * 0.9;
    this.skylineMat.color.setHex(day > 0.5 ? 0xb8c0d0 : 0x3a4060);
    this.fenixMat.emissiveIntensity = 0.15 + glow * 0.45 + Math.sin(this.time * 2) * 0.05;
    for (const l of this.nightLights) l.intensity = glow * 14;
    this.poolMat.opacity = glow * 0.75;
    this.glow.windows.emissiveIntensity = glow * 0.9;
    this.glow.windows.color.setHex(glow > 0.3 ? 0xffe0a0 : 0x9ad0ff);
    // luz cálida de interior cuando el jugador está dentro de un edificio
    const inside = !!playerPos && Object.values(BUILDINGS).some((b) => { const r = b.rect; return playerPos.x > r[0] - 0.2 && playerPos.x < r[2] + 0.2 && playerPos.z > r[1] - 0.2 && playerPos.z < r[3] + 0.6; });
    this.interiorK = (this.interiorK || 0) + ((inside ? 1 : 0) - (this.interiorK || 0)) * Math.min(1, dt * 4);
    const ik = this.interiorK * Math.max(0.35, night);
    if (ik > 0.01) {
      this.hemi.color.lerp(new THREE.Color(0xffe6c8), ik * 0.85);
      this.hemi.groundColor.lerp(new THREE.Color(0xa08060), ik * 0.7);
      this.hemi.intensity = lerp(this.hemi.intensity, 1.15, ik);
      this.sun.intensity *= 1 - ik * 0.6;
    }
    this.petals.visible = !inside;
    if (this.homeLamp) this.homeLamp.intensity = glow * 8;
    this.fireflies.material.opacity = glow * 0.9;
    if (glow > 0.05) { const p = this.fireflies.geometry.attributes.position; for (let i = 0; i < p.count; i++) { p.setY(i, this.fireflyBase[i * 3 + 1] + Math.sin(this.time * 1.3 + i) * 0.3); p.setX(i, this.fireflyBase[i * 3] + Math.sin(this.time * 0.7 + i * 2) * 0.4); } p.needsUpdate = true; }
    // agua
    this.water.position.y = 0.48 + Math.sin(this.time * 2) * 0.01;
    this.updateJet(dt);
    // pétalos alrededor del jugador
    const pp = this.petals.geometry.attributes.position;
    for (let i = 0; i < pp.count; i++) {
      let x = pp.getX(i) + this.petalVel[i * 3] * dt, y = pp.getY(i) + this.petalVel[i * 3 + 1] * dt, z = pp.getZ(i) + this.petalVel[i * 3 + 2] * dt + Math.sin(this.time + i) * 0.004;
      if (y < 0) { y = 10 + Math.random() * 3; x = tgt.x + (Math.random() - 0.5) * 50; z = tgt.z + (Math.random() - 0.5) * 50; }
      if (x - tgt.x > 25) x -= 50; if (x - tgt.x < -25) x += 50; if (z - tgt.z > 25) z -= 50; if (z - tgt.z < -25) z += 50;
      pp.setXYZ(i, x, y, z);
    }
    pp.needsUpdate = true;
    // barreras palpitantes
    for (const g of Object.values(this.gateMeshes)) g.mat.opacity = 0.14 + Math.sin(this.time * 2.5) * 0.06;
    // plumas
    for (const f of this.feathers) if (f.visible) { f.rotation.y += dt * 1.5; f.position.y = 1.2 + Math.sin(this.time * 2 + f.position.x) * 0.15; }
    this.featherMat.emissiveIntensity = 0.5 + glow * 1.2;
    // cubiertas de edificios: se desvanecen cuando el jugador está dentro
    for (const [id, c] of Object.entries(this.covers)) {
      const r = BUILDINGS[id].rect;
      const inside = playerPos && playerPos.x > r[0] - 0.2 && playerPos.x < r[2] + 0.2 && playerPos.z > r[1] - 0.2 && playerPos.z < r[3] + 0.6;
      const behind = playerPos && playerPos.x > r[0] - 1 && playerPos.x < r[2] + 1 && playerPos.z > r[1] - 7 && playerPos.z <= r[1] + 0.2;
      const target = inside ? 0 : behind ? 0.25 : 1;
      c.opacity += (target - c.opacity) * Math.min(1, dt * 6);
      c.mat.opacity = c.opacity; c.out.opacity = c.opacity;
      c.mat.depthWrite = c.opacity > 0.95;
      c.group.visible = c.opacity > 0.02;
      if (c.group.userData.sign) c.group.userData.sign.opacity = c.opacity;
      c.doorMat.opacity = c.opacity;
      if (c.group.userData.win) c.group.userData.win.visible = c.opacity > 0.6;
    }
  }
}

function darkerHex(hex) { const c = new THREE.Color(hex); c.multiplyScalar(0.75); return '#' + c.getHexString(); }
