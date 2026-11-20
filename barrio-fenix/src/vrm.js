// Carga de personajes VRM (creados con VRoid Studio) con animación procedural:
// brazos en reposo, ciclo de caminar, respiración, parpadeo, expresiones y física de pelo/ropa.
import * as THREE from '../vendor/three.module.min.js';
import { GLTFLoader } from '../vendor/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils } from '../vendor/three-vrm.module.min.js';

// Busca el modelo de cada personaje: basta con subir assets/characters/<id>.vrm (p. ej. lucia.vrm).
// Si no existe, el personaje usa el modelo procedural.
const FALLBACK = {};
async function exists(url) {
  try { const r = await fetch(url, { method: 'HEAD', cache: 'no-cache' }); return r.ok; } catch { return false; }
}
export async function findModel(id) {
  const url = `assets/characters/${id}.vrm`;
  if (await exists(url)) return url;
  if (FALLBACK[id] && (await exists(FALLBACK[id]))) return FALLBACK[id];
  return null;
}

const loader = new GLTFLoader();
loader.register((parser) => new VRMLoaderPlugin(parser));


// Expresiones del juego → expresiones VRM estándar
const EXPR = { neutral: {}, happy: { happy: 1 }, blush: { happy: 0.6, relaxed: 0.5 }, sad: { sad: 1 }, angry: { angry: 1 }, surprised: { surprised: 1 }, talk: {} };

// Complementos que VRoid no ofrece (barba, cinta), pegados al hueso de la cabeza.
export const VRM_ACCESSORIES = { goro: ['beard', 'headband'] };
export function addAccessories(ch, list = []) {
  const head = ch.vrm.humanoid.getRawBoneNode('head');
  if (!head || !list.length) return;
  const toonMat = (c) => new THREE.MeshToonMaterial({ color: c });
  const g = new THREE.Group();
  // medidas en metros del modelo original (VRoid ≈ 1,6 m)
  const fwd = ch.accFwd ?? 0.068, chinY = ch.accChin ?? -0.025;
  for (const a of list) {
    if (a === 'beard') {
      const white = toonMat(0xf2f0ea);
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 12), white);
      b.scale.set(1.05, 1.25, 0.7); b.position.set(0, chinY - 0.01, fwd - 0.012); g.add(b);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.07, 10), white);
      tip.rotation.x = Math.PI; tip.position.set(0, chinY - 0.08, fwd - 0.008); g.add(tip);
      for (const sd of [-1, 1]) { const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.011, 0.045, 4, 8), white); m.rotation.z = sd * 1.35; m.position.set(sd * 0.02, chinY + 0.03, fwd + 0.006); m.scale.setScalar(0.85); g.add(m); }
    } else if (a === 'headband') {
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.098, 0.011, 8, 32), toonMat(0xd8344a));
      band.rotation.x = Math.PI / 2 - 0.18; band.position.set(0, 0.125, 0.005); g.add(band);
      const knot = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.07, 6), toonMat(0xd8344a));
      knot.rotation.x = -2.2; knot.position.set(0.02, 0.1, -0.1); g.add(knot);
    }
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  head.add(g);
  ch.accessories = g;
}

export async function loadVRMCharacter(url, { height = 1 } = {}) {
  // Cada personaje necesita su propia instancia: se vuelve a parsear (la descarga queda en caché)
  const gltf = await new Promise((res, rej) => loader.load(url, res, undefined, rej));
  const vrm = gltf.userData.vrm;
  VRMUtils.removeUnnecessaryVertices(gltf.scene);
  VRMUtils.combineSkeletons ? VRMUtils.combineSkeletons(gltf.scene) : null;
  if (vrm.meta?.metaVersion === '0') VRMUtils.rotateVRM0(vrm);
  vrm.scene.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
  const root = new THREE.Group();
  root.add(vrm.scene);
  // Escala: los modelos de VRoid miden ~1,6 m; el barrio está pensado para personajes de ~2 unidades
  const box = new THREE.Box3().setFromObject(vrm.scene);
  const h = box.max.y - box.min.y || 1.6;
  vrm.scene.scale.setScalar((2.05 / h) * height);
  // reiniciar la física de pelo y ropa con la nueva escala (si no, se dispara)
  vrm.scene.updateMatrixWorld(true);
  vrm.springBoneManager?.setInitState?.();
  vrm.springBoneManager?.reset?.();
  return new VRMRig(root, vrm);
}

class VRMRig {
  constructor(root, vrm) {
    this.root = root; this.vrm = vrm; this.isVRM = true;
    this.phase = Math.random() * 10; this.walkAmt = 0; this.talking = 0;
    this.blinkT = 2 + Math.random() * 3; this.blinkV = 0;
    this.expr = 'neutral'; this.baseExpr = 'neutral'; this.exprTimer = 0;
    const H = vrm.humanoid;
    this.b = (name) => H.getNormalizedBoneNode(name);
    this.parts = {};
  }
  setExpression(e, duration = 0) {
    if (duration > 0) this.exprTimer = duration; else this.baseExpr = e;
    this.expr = e;
  }
  applyExpression(dt) {
    const em = this.vrm.expressionManager; if (!em) return;
    const want = EXPR[this.expr] || {};
    for (const k of ['happy', 'sad', 'angry', 'surprised', 'relaxed']) {
      const cur = em.getValue(k) ?? 0, tgt = want[k] || 0;
      em.setValue(k, cur + (tgt - cur) * Math.min(1, dt * 8));
    }
    // boca al hablar
    const aa = this.talking > 0 ? (Math.sin(this.phase * 14) * 0.5 + 0.5) * 0.7 : 0;
    em.setValue('aa', aa);
    // parpadeo (no al sonreír con los ojos cerrados)
    this.blinkT -= dt;
    if (this.blinkT <= 0) { this.blinkV = 1; this.blinkT = 2.5 + Math.random() * 3.5; }
    this.blinkV = Math.max(0, this.blinkV - dt * 7);
    em.setValue('blink', this.expr === 'happy' ? 0 : Math.min(1, this.blinkV * 1.5));
  }
  update(dt, speed = 0) {
    const b = this.b;
    this.walkAmt += ((speed > 0.1 ? 1 : 0) - this.walkAmt) * Math.min(1, dt * 10);
    this.phase += dt * (speed > 0.1 ? 2.2 + speed * 1.6 : 1.6);
    const w = this.walkAmt, sw = Math.sin(this.phase * (speed > 0.1 ? 2.2 : 1)) * w;
    const breath = Math.sin(this.phase) * 0.02 * (1 - w);
    // brazos: de pose T a reposo, con balanceo al caminar
    const armDown = 1.2;
    const lUA = b('leftUpperArm'), rUA = b('rightUpperArm'), lLA = b('leftLowerArm'), rLA = b('rightLowerArm');
    if (lUA) lUA.rotation.set(0, 0, -armDown + breath);
    if (rUA) rUA.rotation.set(0, 0, armDown - breath);
    if (lUA) lUA.rotateY(sw * 0.5);
    if (rUA) rUA.rotateY(sw * 0.5);
    if (lLA) lLA.rotation.set(0, -0.15 - Math.max(0, -sw) * 0.4, 0);
    if (rLA) rLA.rotation.set(0, 0.15 + Math.max(0, sw) * 0.4, 0);
    // gesto al hablar
    if (this.talking > 0) {
      this.talking -= dt;
      if (rUA) { rUA.rotation.set(-0.5 + Math.sin(this.phase * 3) * 0.15, 0, armDown - 0.4); }
      if (rLA) rLA.rotation.set(0, 1.1, 0);
    }
    // piernas
    const lUL = b('leftUpperLeg'), rUL = b('rightUpperLeg'), lLL = b('leftLowerLeg'), rLL = b('rightLowerLeg');
    if (lUL) lUL.rotation.set(-sw * 0.55, 0, 0);
    if (rUL) rUL.rotation.set(sw * 0.55, 0, 0);
    if (lLL) lLL.rotation.set(Math.max(0, sw) * 0.8, 0, 0);
    if (rLL) rLL.rotation.set(Math.max(0, -sw) * 0.8, 0, 0);
    // columna y cabeza
    const spine = b('spine'), chest = b('chest') || b('upperChest'), head = b('head'), hips = b('hips');
    if (spine) spine.rotation.set(0.04 * w, -sw * 0.08, 0);
    if (chest) chest.rotation.set(breath * 0.5, 0, 0);
    if (head) head.rotation.set(0, Math.sin(this.phase * 0.37) * 0.08 * (1 - w), 0);
    if (hips) { if (this.hipsY === undefined) this.hipsY = hips.position.y; hips.position.y = this.hipsY + Math.abs(sw) * 0.02; }
    if (this.exprTimer > 0) { this.exprTimer -= dt; if (this.exprTimer <= 0) this.expr = this.baseExpr; }
    this.applyExpression(dt);
    this.vrm.update(dt);
  }
  dispose() { VRMUtils.deepDispose(this.vrm.scene); }
}

// ---------------- Personalización del jugador (bases VRoid) ----------------
// Tiñe pelo, ojos, piel y ropa de un VRM. Las regiones de cada parte se obtienen
// dibujando los triángulos de su material en una máscara (sirve para cualquier atlas).
function rgb2hsl(r, g, b) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min, s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}
function kindOf(name = '') {
  if (/HAIR/i.test(name)) return 'hair';
  if (/CLOTH/i.test(name)) return 'cloth';
  if (/FaceMouth|EyeIris|_EYE\b/i.test(name) && !/Highlight/i.test(name)) return 'eye';
  if (/SKIN/i.test(name)) return 'skin';
  return null;
}
function prepare(ch) {
  if (ch._custom) return ch._custom;
  const info = { textures: new Map(), skinMats: [] };
  ch.vrm.scene.traverse((o) => {
    if (!o.isMesh) return;
    for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
      const kind = kindOf(m.name);
      if (kind === 'skin') { info.skinMats.push(m); continue; }
      if (!kind || !m.map || !m.map.image) continue;
      const img = m.map.image, key = m.map.uuid;
      if (!info.textures.has(key)) {
        const W = img.width, H = img.height;
        const orig = document.createElement('canvas'); orig.width = W; orig.height = H;
        orig.getContext('2d').drawImage(img, 0, 0);
        const out = document.createElement('canvas'); out.width = W; out.height = H;
        const tex = new THREE.CanvasTexture(out); tex.flipY = false; tex.colorSpace = THREE.SRGBColorSpace;
        info.textures.set(key, { orig, out, tex, masks: {}, mats: new Set(), W, H, src: m.map });
      }
      const T = info.textures.get(key);
      T.mats.add(m);
      // máscara de la región de este material
      const mask = T.masks[kind] || (T.masks[kind] = (() => { const c = document.createElement('canvas'); c.width = T.W; c.height = T.H; return c; })());
      const mc = mask.getContext('2d'); mc.fillStyle = '#fff';
      const uv = o.geometry.attributes.uv, idx = o.geometry.index;
      if (!uv) continue;
      const n = idx ? idx.count : uv.count;
      mc.beginPath();
      for (let i = 0; i < n; i += 3) {
        for (let k = 0; k < 3; k++) {
          const v = idx ? idx.getX(i + k) : i + k;
          const x = uv.getX(v) * T.W, y = uv.getY(v) * T.H;
          if (k === 0) mc.moveTo(x, y); else mc.lineTo(x, y);
        }
        mc.closePath();
      }
      mc.fill();
    }
  });
  for (const m of info.skinMats) { m.userData.baseColor = m.color.clone(); if (m.shadeColorFactor) m.userData.baseShade = m.shadeColorFactor.clone(); }
  ch._custom = info;
  return info;
}
export function customizeVRM(ch, { hair, eyes, skin, clothes } = {}) {
  const info = prepare(ch);
  const C = { hair: hair && new THREE.Color(hair), eye: eyes && new THREE.Color(eyes), cloth: clothes && new THREE.Color(clothes) };
  for (const T of info.textures.values()) {
    const ctx = T.out.getContext('2d', { willReadFrequently: true });
    if (!T.origData) T.origData = T.orig.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, T.W, T.H);
    ctx.putImageData(T.origData, 0, 0);
    const data = ctx.getImageData(0, 0, T.W, T.H), d = data.data;
    for (const [kind, mask] of Object.entries(T.masks)) {
      const col = C[kind]; if (!col) continue;
      T.maskData = T.maskData || {};
      const md = T.maskData[kind] || (T.maskData[kind] = mask.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, T.W, T.H).data);
      // luminosidad máxima de la región para normalizar
      let maxL = 0.01;
      for (let i = 0; i < d.length; i += 4) if (md[i + 3] > 0 && d[i + 3] > 0) { const l = (d[i] + d[i + 1] + d[i + 2]) / 765; if (l > maxL) maxL = l; }
      for (let i = 0; i < d.length; i += 4) {
        if (md[i + 3] === 0 || d[i + 3] === 0) continue;
        const r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255;
        if (kind === 'eye') {
          const [h, s] = rgb2hsl(r, g, b);
          if (s < 0.22 || h < 45 || h > 330) continue; // sólo el iris (no boca, pestañas ni blanco)
        }
        const l = Math.min(1, (r + g + b) / 3 / maxL);
        const k = kind === 'eye' ? 0.25 + l * 1.1 : 0.22 + l * 0.98;
        d[i] = Math.min(255, col.r * k * 255); d[i + 1] = Math.min(255, col.g * k * 255); d[i + 2] = Math.min(255, col.b * k * 255);
      }
    }
    ctx.putImageData(data, 0, 0);
    T.tex.needsUpdate = true;
    // sustituir la textura en todos los materiales que usan este atlas
    ch.vrm.scene.traverse((o) => {
      if (!o.isMesh) return;
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
        if (m.map === T.src || m.map === T.tex) m.map = T.tex;
        if (m.shadeMultiplyTexture === T.src || m.shadeMultiplyTexture === T.tex) m.shadeMultiplyTexture = T.tex;
      }
    });
  }
  // piel: multiplicar el color del material
  if (skin) {
    const s = new THREE.Color(skin), ref = new THREE.Color('#f6dcc6');
    const f = new THREE.Color(Math.min(1.1, s.r / ref.r), Math.min(1.1, s.g / ref.g), Math.min(1.1, s.b / ref.b));
    for (const m of info.skinMats) {
      m.color.copy(m.userData.baseColor).multiply(f);
      if (m.shadeColorFactor && m.userData.baseShade) m.shadeColorFactor.copy(m.userData.baseShade).multiply(f);
    }
  }
}

// Bases del jugador: assets/characters/jugador_m.vrm y jugador_f.vrm
export function playerColors(p, look) {
  return { hair: p.hairColor, eyes: p.eyes, skin: p.skin, clothes: look.topColor };
}
const baseCache = {};
export function loadPlayerBase(gender) {
  const url = `assets/characters/jugador_${gender === 'f' ? 'f' : 'm'}.vrm`;
  if (!baseCache[url]) baseCache[url] = fetch(url, { method: 'HEAD' }).then((r) => (r.ok ? loadVRMCharacter(url) : null)).catch(() => null);
  return baseCache[url];
}
export function dropPlayerBase(gender) { delete baseCache[`assets/characters/jugador_${gender === 'f' ? 'f' : 'm'}.vrm`]; }
