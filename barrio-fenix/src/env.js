// Modelos de entorno (KayKit, CC0) y del gato (Vuena, CC0).
// Se precargan al iniciar la partida; las piezas estáticas se fusionan por material
// para que todo un barrio de edificios cueste muy pocas llamadas de dibujo.
import * as THREE from '../vendor/three.module.min.js';
import { GLTFLoader } from '../vendor/GLTFLoader.js';
import { mergeGeometries } from '../vendor/BufferGeometryUtils.js';
import { gradientMap } from './toon.js';

const loader = new GLTFLoader();
const cache = new Map();
export const ENV = { ready: false };

const CITY = ['building_A', 'building_B', 'building_C', 'building_D', 'building_E', 'building_F', 'building_G', 'building_H', 'bush', 'car_sedan', 'car_hatchback', 'car_stationwagon', 'car_taxi', 'firehydrant', 'trash_A', 'box_A', 'dumpster', 'watertower'];
const FURN = ['bed_double_A', 'couch', 'couch_pillows', 'table_low', 'table_medium', 'chair_A_wood', 'cabinet_medium_decorated', 'shelf_B_large_decorated', 'lamp_standing', 'rug_rectangle_stripes_A', 'cactus_medium_A', 'cactus_small_B', 'pictureframe_large_A', 'pictureframe_medium', 'armchair_pillows', 'book_set', 'lamp_table'];

function load(path) {
  if (!cache.has(path)) cache.set(path, new Promise((res, rej) => loader.load(path, res, undefined, rej)));
  return cache.get(path);
}
export async function preloadEnv() {
  try {
    const jobs = [...CITY.map((n) => load(`assets/env/city/${n}.gltf`)), ...FURN.map((n) => load(`assets/env/furniture/${n}.gltf`)), load('assets/env/animals/animal_cat.glb')];
    await Promise.all(jobs);
    ENV.ready = true;
  } catch (e) { console.warn('Modelos de entorno no disponibles; se usa el entorno procedural', e); ENV.ready = false; }
  return ENV.ready;
}
const pathOf = (name) => (CITY.includes(name) ? `assets/env/city/${name}.gltf` : `assets/env/furniture/${name}.gltf`);
async function gltfOf(name) { return load(pathOf(name)); }

const toonCache = new Map();
function toToon(m) {
  const key = m.map ? m.map.uuid : m.color.getHexString();
  if (!toonCache.has(key)) toonCache.set(key, new THREE.MeshToonMaterial({ map: m.map || null, color: m.map ? 0xffffff : m.color.clone(), gradientMap: gradientMap() }));
  return toonCache.get(key);
}

// Acumula piezas estáticas y las fusiona por material.
export class KitBatch {
  constructor() { this.items = []; }
  add(name, x, y, z, ry = 0, s = 1) { this.items.push({ name, x, y, z, ry, s }); return this; }
  async build({ castShadow = true, receiveShadow = true } = {}) {
    const groups = new Map();
    const tmp = new THREE.Matrix4();
    for (const it of this.items) {
      const g = await gltfOf(it.name);
      const root = g.scene;
      root.updateMatrixWorld(true);
      const place = new THREE.Matrix4().compose(new THREE.Vector3(it.x, it.y, it.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, it.ry, 0)), new THREE.Vector3(it.s, it.s, it.s));
      root.traverse((o) => {
        if (!o.isMesh) return;
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        const mat = toToon(mats[0]);
        let geo = o.geometry.clone();
        for (const k of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv'].includes(k)) geo.deleteAttribute(k);
        if (geo.index) geo = geo.toNonIndexed();
        if (!geo.attributes.uv) geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
        geo.applyMatrix4(tmp.multiplyMatrices(place, o.matrixWorld));
        if (!groups.has(mat)) groups.set(mat, []);
        groups.get(mat).push(geo);
      });
    }
    const out = new THREE.Group();
    for (const [mat, geos] of groups) {
      const mesh = new THREE.Mesh(mergeGeometries(geos, false), mat);
      mesh.castShadow = castShadow; mesh.receiveShadow = receiveShadow;
      out.add(mesh);
      geos.forEach((g) => g.dispose());
    }
    return out;
  }
}

// ---------------- Gato animado (Neko-san de día) ----------------
export async function loadCat() {
  const g = await load('assets/env/animals/animal_cat.glb');
  const scene = g.scene; // una sola instancia en el juego
  const root = new THREE.Group();
  root.add(scene);
  scene.scale.setScalar(2.4);
  scene.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
  // bufanda roja en el cuello
  let neck = null;
  scene.traverse((o) => { if (o.isBone && !neck && /neck|head/i.test(o.name)) neck = o; });
  const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.025, 8, 20), new THREE.MeshToonMaterial({ color: 0xd8344a, gradientMap: gradientMap() }));
  scarf.castShadow = true;
  if (neck) { scarf.rotation.x = Math.PI / 2; neck.add(scarf); neck.updateMatrixWorld(true); }
  return new CatRig(root, scene, g.animations, scarf);
}

class CatRig {
  constructor(root, scene, clips, scarf) {
    this.root = root; this.scene = scene; this.isCat = true; this.isGLB = true; this.talking = 0; this.scarf = scarf;
    this.mixer = new THREE.AnimationMixer(scene);
    this.actions = {};
    for (const c of clips) this.actions[c.name] = this.mixer.clipAction(c);
    this.current = null; this.idleT = 0; this.mood = 'idle';
    this.play('idle');
  }
  play(name, fade = 0.25) {
    const a = this.actions[name]; if (!a || this.current === a) return;
    a.reset().fadeIn(fade).play();
    if (this.current) this.current.fadeOut(fade);
    this.current = a;
  }
  setExpression(e) { if (e === 'happy' || e === 'blush') this.play('sit'); }
  update(dt, speed = 0) {
    if (speed > 3.5) this.play('run');
    else if (speed > 0.1) this.play('walk');
    else if (this.talking > 0) { this.talking -= dt; this.play(this.talking > 1.5 ? 'call' : 'sit'); }
    else {
      // en reposo alterna estar sentado, mirar y, de vez en cuando, dormir
      this.idleT -= dt;
      if (this.idleT <= 0) { this.idleT = 6 + Math.random() * 8; this.mood = Math.random() < 0.15 ? 'sleep' : Math.random() < 0.5 ? 'sit' : 'idle_alt'; }
      this.play(this.mood);
    }
    this.mixer.update(dt);
  }
  dispose() {}
}
