// Materiales cel-shading, contornos (inverted hull) y fusión de geometría estática.
import * as THREE from '../vendor/three.module.min.js';
import { mergeGeometries } from '../vendor/BufferGeometryUtils.js';

let gradient = null;
export function gradientMap() {
  if (gradient) return gradient;
  const data = new Uint8Array([90, 90, 90, 255, 170, 170, 170, 255, 235, 235, 235, 255, 255, 255, 255, 255]);
  gradient = new THREE.DataTexture(data, 4, 1, THREE.RGBAFormat);
  gradient.minFilter = gradient.magFilter = THREE.NearestFilter;
  gradient.generateMipmaps = false;
  gradient.needsUpdate = true;
  return gradient;
}

const matCache = new Map();
export function toon(color, opts = {}) {
  const key = `${color}|${opts.emissive || ''}|${opts.vc ? 1 : 0}|${opts.transparent ? opts.opacity : ''}|${opts.side || ''}`;
  if (!opts.unique && matCache.has(key)) return matCache.get(key);
  const m = new THREE.MeshToonMaterial({
    color: opts.vc ? 0xffffff : new THREE.Color(color),
    gradientMap: gradientMap(),
    vertexColors: !!opts.vc,
    emissive: opts.emissive ? new THREE.Color(opts.emissive) : new THREE.Color(0x000000),
    emissiveIntensity: opts.emissiveIntensity ?? 1,
    transparent: !!opts.transparent,
    opacity: opts.opacity ?? 1,
    side: opts.side ?? THREE.FrontSide,
    map: opts.map || null,
  });
  if (!opts.unique) matCache.set(key, m);
  return m;
}

export const OUTLINE_MAT = new THREE.MeshBasicMaterial({ color: 0x1a1420, side: THREE.BackSide });

// Crea un contorno "inverted hull" para una geometría.
export function outlineFor(geometry, thickness = 0.035) {
  const g = geometry.clone();
  g.computeVertexNormals();
  const pos = g.attributes.position, nor = g.attributes.normal;
  for (let i = 0; i < pos.count; i++) {
    pos.setXYZ(i, pos.getX(i) + nor.getX(i) * thickness, pos.getY(i) + nor.getY(i) * thickness, pos.getZ(i) + nor.getZ(i) * thickness);
  }
  const m = new THREE.Mesh(g, OUTLINE_MAT);
  m.raycast = () => {};
  return m;
}

// Pinta una geometría con color de vértice uniforme (para fusionar por material único).
export function paint(geometry, color) {
  const g = geometry.index ? geometry.toNonIndexed() : geometry;
  const c = new THREE.Color(color);
  const n = g.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  // dejar sólo atributos estándar para que se puedan fusionar
  for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'color'].includes(k)) g.deleteAttribute(k);
  return g;
}

// Acumulador de geometría estática: añade piezas con color y transformación, y luego
// genera un único Mesh (más un contorno opcional) → muy pocas draw calls.
export class StaticBatch {
  constructor() { this.parts = []; this.outlineParts = []; }
  add(geometry, color, matrix, { outline = true, thickness = 0.04 } = {}) {
    const g = paint(geometry.clone(), color);
    g.applyMatrix4(matrix);
    this.parts.push(g);
    if (outline) {
      const o = geometry.clone();
      o.computeVertexNormals();
      const pos = o.attributes.position, nor = o.attributes.normal;
      for (let i = 0; i < pos.count; i++) pos.setXYZ(i, pos.getX(i) + nor.getX(i) * thickness, pos.getY(i) + nor.getY(i) * thickness, pos.getZ(i) + nor.getZ(i) * thickness);
      const on = o.index ? o.toNonIndexed() : o;
      for (const k of Object.keys(on.attributes)) if (!['position', 'normal'].includes(k)) on.deleteAttribute(k);
      on.applyMatrix4(matrix);
      this.outlineParts.push(on);
    }
  }
  box(w, h, d, color, x, y, z, ry = 0, opts) {
    const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new THREE.Vector3(1, 1, 1));
    this.add(new THREE.BoxGeometry(w, h, d), color, m, opts);
  }
  geo(geometry, color, x, y, z, { rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1, ...opts } = {}) {
    const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
    this.add(geometry, color, m, opts);
  }
  build({ castShadow = true, receiveShadow = true, material } = {}) {
    const group = new THREE.Group();
    if (this.parts.length) {
      const g = mergeGeometries(this.parts, false);
      const mesh = new THREE.Mesh(g, material || toon('#ffffff', { vc: true }));
      mesh.castShadow = castShadow; mesh.receiveShadow = receiveShadow;
      group.add(mesh);
      group.userData.mesh = mesh;
    }
    if (this.outlineParts.length) {
      const og = mergeGeometries(this.outlineParts, false);
      const om = new THREE.Mesh(og, OUTLINE_MAT);
      om.raycast = () => {};
      group.add(om);
      group.userData.outline = om;
    }
    this.parts.forEach((p) => p.dispose());
    this.outlineParts.forEach((p) => p.dispose());
    this.parts = []; this.outlineParts = [];
    return group;
  }
}

export function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  draw(ctx, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
