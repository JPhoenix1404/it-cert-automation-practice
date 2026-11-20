// Props realistas (Poly Haven, CC0) dibujados con instancias: cada tipo de objeto
// cuesta una llamada de dibujo por malla, aunque haya muchas copias en el mapa.
import * as THREE from '../vendor/three.module.min.js';
import { GLTFLoader } from '../vendor/GLTFLoader.js';

const loader = new GLTFLoader();
const cache = new Map();
export const PROPS = { ready: false };
const LIST = ['street_lamp_01', 'painted_wooden_bench', 'planter_box_01', 'metal_trash_can', 'outdoor_table_chair_set_01', 'dining_table', 'wine_barrel_01', 'metal_office_desk', 'bar_chair_round_01', 'coffee_table_round_01', 'wooden_bookshelf_worn'];

function load(name) {
  if (!cache.has(name)) cache.set(name, new Promise((res, rej) => loader.load(`assets/props/${name}/${name}.gltf`, res, undefined, rej)));
  return cache.get(name);
}
export async function preloadProps() {
  try { await Promise.all(LIST.map(load)); PROPS.ready = true; }
  catch (e) { console.warn('Props no disponibles', e); PROPS.ready = false; }
  return PROPS.ready;
}

// Coloca varias copias de un prop. items: [x, y, z, ry, scale]
export async function placeProps(scene, name, items, { castShadow = true } = {}) {
  if (!items.length) return null;
  const g = await load(name);
  g.scene.updateMatrixWorld(true);
  const group = new THREE.Group();
  const place = new THREE.Matrix4(), m = new THREE.Matrix4();
  g.scene.traverse((o) => {
    if (!o.isMesh) return;
    const mat = o.material;
    if (mat.map) mat.map.anisotropy = 4;
    const inst = new THREE.InstancedMesh(o.geometry, mat, items.length);
    items.forEach(([x, y, z, ry = 0, s = 1], i) => {
      place.compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new THREE.Vector3(s, s, s));
      inst.setMatrixAt(i, m.multiplyMatrices(place, o.matrixWorld));
    });
    inst.instanceMatrix.needsUpdate = true;
    inst.castShadow = castShadow; inst.receiveShadow = true;
    inst.computeBoundingSphere();
    group.add(inst);
  });
  scene.add(group);
  return group;
}
