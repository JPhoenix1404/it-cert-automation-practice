// Carga de personajes VRM (creados con VRoid Studio) con animación procedural:
// brazos en reposo, ciclo de caminar, respiración, parpadeo, expresiones y física de pelo/ropa.
import * as THREE from '../vendor/three.module.min.js';
import { GLTFLoader } from '../vendor/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils } from '../vendor/three-vrm.module.min.js';

// Modelos disponibles por personaje (los que aún no existen usan el modelo procedural)
export const VRM_MODELS = {
  lucia: 'assets/characters/prueba.vrm', // modelo de prueba: se sustituirá por lucia.vrm
};

const loader = new GLTFLoader();
loader.register((parser) => new VRMLoaderPlugin(parser));


// Expresiones del juego → expresiones VRM estándar
const EXPR = { neutral: {}, happy: { happy: 1 }, blush: { happy: 0.6, relaxed: 0.5 }, sad: { sad: 1 }, angry: { angry: 1 }, surprised: { surprised: 1 }, talk: {} };

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
