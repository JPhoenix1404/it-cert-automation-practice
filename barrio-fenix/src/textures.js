// Materiales con textura (Poly Haven, CC0) y proyección de UV en espacio de mundo,
// para que las texturas tengan el mismo tamaño real en cualquier pieza sin estirarse.
import * as THREE from '../vendor/three.module.min.js';
import { mergeGeometries } from '../vendor/BufferGeometryUtils.js';

const loader = new THREE.TextureLoader();
const cache = new Map();
function tex(file, srgb) {
  if (cache.has(file)) return cache.get(file);
  const t = loader.load(`assets/tex/${file}`);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  cache.set(file, t);
  return t;
}

// Material PBR con textura. `tint` multiplica el color (útil para paredes y tejados de colores).
export function texMat(name, { tint = '#ffffff', bright = 1, roughness = 0.92, normal = 1, transparent = false } = {}) {
  const m = new THREE.MeshStandardMaterial({
    map: tex(`${name}_d.jpg`, true),
    normalMap: tex(`${name}_n.jpg`, false),
    normalScale: new THREE.Vector2(normal, normal),
    color: new THREE.Color(tint), roughness, metalness: 0, transparent,
  });
  m.color.multiplyScalar(bright);
  return m;
}

// UV por proyección en caja (en metros): `size` = metros que cubre una repetición de la textura.
export function boxUV(geo, size = 2) {
  const p = geo.attributes.position, n = geo.attributes.normal;
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    let u, v;
    if (ay >= ax && ay >= az) { u = p.getX(i); v = p.getZ(i); }
    else if (ax >= az) { u = p.getZ(i); v = p.getY(i); }
    else { u = p.getX(i); v = p.getY(i); }
    uv[i * 2] = u / size; uv[i * 2 + 1] = v / size;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geo;
}

// Acumula piezas para un mismo material texturizado y las fusiona en una malla.
export class TexBatch {
  constructor(material, size = 2) { this.material = material; this.size = size; this.parts = []; }
  add(geometry, matrix) {
    let g = geometry.clone();
    if (g.index) g = g.toNonIndexed();
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal'].includes(k)) g.deleteAttribute(k);
    g.applyMatrix4(matrix);
    this.parts.push(boxUV(g, this.size));
    return this;
  }
  box(w, h, d, x, y, z, ry = 0) {
    const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new THREE.Vector3(1, 1, 1));
    return this.add(new THREE.BoxGeometry(w, h, d), m);
  }
  geo(geometry, x, y, z, { rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1 } = {}) {
    const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
    return this.add(geometry, m);
  }
  build({ castShadow = true, receiveShadow = true } = {}) {
    if (!this.parts.length) return new THREE.Group();
    const mesh = new THREE.Mesh(mergeGeometries(this.parts, false), this.material);
    mesh.castShadow = castShadow; mesh.receiveShadow = receiveShadow;
    this.parts.forEach((p) => p.dispose()); this.parts = [];
    return mesh;
  }
}
