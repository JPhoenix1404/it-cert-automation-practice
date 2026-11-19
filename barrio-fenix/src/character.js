// Generador procedural de personajes estilo anime (cel-shading + contorno).
import * as THREE from '../vendor/three.module.min.js';
import { StaticBatch, toon, OUTLINE_MAT } from './toon.js';

const PI = Math.PI;
const SPH = new THREE.SphereGeometry(1, 18, 14);
const SPH_LO = new THREE.SphereGeometry(1, 12, 9);
const darker = (hex, k = 0.6) => { const c = new THREE.Color(hex); c.multiplyScalar(k); return '#' + c.getHexString(); };

// ---------------- Cara (textura en canvas) ----------------
function drawEye(ctx, cx, cy, iris, side, fem, expr) {
  ctx.save();
  ctx.translate(cx, cy);
  const lash = '#1a1214';
  if (expr === 'blink' || expr === 'happy') {
    ctx.strokeStyle = lash; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath();
    if (expr === 'happy') { ctx.moveTo(-18, 6); ctx.quadraticCurveTo(0, -14, 18, 6); }
    else { ctx.moveTo(-19, 2); ctx.quadraticCurveTo(0, 10, 19, 2); }
    ctx.stroke();
    if (fem) { ctx.beginPath(); ctx.moveTo(side * 18, expr === 'happy' ? 6 : 2); ctx.lineTo(side * 25, expr === 'happy' ? 0 : -3); ctx.stroke(); }
    ctx.restore();
    return;
  }
  const sy = expr === 'surprised' ? 1.12 : expr === 'angry' ? 0.82 : 1;
  ctx.scale(1, sy);
  // esclerótica
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.ellipse(0, 2, 19, 24, 0, 0, PI * 2); ctx.fill();
  ctx.save();
  ctx.beginPath(); ctx.ellipse(0, 2, 19, 24, 0, 0, PI * 2); ctx.clip();
  // iris
  const g = ctx.createLinearGradient(0, -20, 0, 26);
  g.addColorStop(0, darker(iris, 0.35)); g.addColorStop(0.55, iris); g.addColorStop(1, new THREE.Color(iris).lerp(new THREE.Color('#ffffff'), 0.45).getStyle());
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(side * -1, 5, 15, 21, 0, 0, PI * 2); ctx.fill();
  ctx.fillStyle = darker(iris, 0.25);
  ctx.beginPath(); ctx.ellipse(side * -1, 6, 7, 10, 0, 0, PI * 2); ctx.fill();
  // brillos
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(-6, -6, 5.5, 0, PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(6, 12, 2.6, 0, PI * 2); ctx.fill();
  // sombra del párpado
  ctx.fillStyle = 'rgba(40,20,40,0.18)';
  ctx.fillRect(-20, -24, 40, 10);
  ctx.restore();
  // pestaña superior
  ctx.strokeStyle = lash; ctx.lineCap = 'round';
  ctx.lineWidth = fem ? 6 : 4.5;
  ctx.beginPath(); ctx.moveTo(-21, -6); ctx.quadraticCurveTo(-4, -30, 21, -10); ctx.stroke();
  if (fem) { ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(side * 20, side > 0 ? -10 : -6); ctx.lineTo(side * 27, side > 0 ? -16 : -12); ctx.stroke(); }
  // párpado inferior
  ctx.lineWidth = 1.6; ctx.strokeStyle = 'rgba(30,20,30,0.6)';
  ctx.beginPath(); ctx.moveTo(-12, 25); ctx.quadraticCurveTo(0, 29, 12, 25); ctx.stroke();
  ctx.restore();
}

export function drawFace(ctx, look, expr = 'neutral', W = 256) {
  const s = W / 256;
  ctx.clearRect(0, 0, W, W);
  ctx.save(); ctx.scale(s, s);
  const fem = look.gender === 'f';
  const brow = darker(look.hairColor || '#333', 0.7);
  // Rubor
  if (expr === 'blush' || expr === 'happy') {
    ctx.fillStyle = expr === 'blush' ? 'rgba(255,90,120,0.55)' : 'rgba(255,120,140,0.35)';
    for (const x of [72, 184]) { ctx.beginPath(); ctx.ellipse(x, 158, 18, 9, 0, 0, PI * 2); ctx.fill(); }
    if (expr === 'blush') {
      ctx.strokeStyle = 'rgba(220,60,90,0.8)'; ctx.lineWidth = 2;
      for (const x of [72, 184]) for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(x + i * 8 - 3, 163); ctx.lineTo(x + i * 8 + 3, 153); ctx.stroke(); }
    }
  }
  // Ojos
  drawEye(ctx, 82, 124, look.eyes || '#5a3a2a', -1, fem, expr);
  drawEye(ctx, 174, 124, look.eyes || '#5a3a2a', 1, fem, expr);
  // Cejas
  ctx.strokeStyle = brow; ctx.lineWidth = fem ? 3.5 : 5; ctx.lineCap = 'round';
  const bAng = expr === 'angry' ? 1 : expr === 'sad' ? -1 : 0;
  for (const [x, side] of [[82, -1], [174, 1]]) {
    ctx.beginPath();
    ctx.moveTo(x - side * 18, 84 + bAng * 6 * 1);
    ctx.quadraticCurveTo(x, 76 - (expr === 'surprised' ? 6 : 0), x + side * 20, 84 - bAng * 6 * 0.4);
    ctx.stroke();
  }
  // Nariz (sutil)
  ctx.strokeStyle = 'rgba(120,60,50,0.45)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(128, 160); ctx.lineTo(125, 168); ctx.stroke();
  // Boca
  ctx.lineCap = 'round';
  if (expr === 'happy' || expr === 'talk') {
    ctx.fillStyle = '#6a1a26';
    ctx.beginPath(); ctx.moveTo(112, 186); ctx.quadraticCurveTo(128, expr === 'talk' ? 200 : 206, 144, 186); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ff8a9a';
    ctx.beginPath(); ctx.ellipse(128, expr === 'talk' ? 194 : 198, 7, 3.5, 0, 0, PI * 2); ctx.fill();
  } else if (expr === 'surprised') {
    ctx.fillStyle = '#6a1a26'; ctx.beginPath(); ctx.ellipse(128, 192, 6, 8, 0, 0, PI * 2); ctx.fill();
  } else if (expr === 'sad' || expr === 'angry') {
    ctx.strokeStyle = '#6a2a30'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(116, 194); ctx.quadraticCurveTo(128, 184, 140, 194); ctx.stroke();
  } else {
    ctx.strokeStyle = '#7a3a3a'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(118, 188); ctx.quadraticCurveTo(128, 194, 138, 188); ctx.stroke();
  }
  ctx.restore();
}

function drawCatFace(ctx, look, expr = 'neutral', W = 256) {
  ctx.clearRect(0, 0, W, W);
  const eye = look.eyes || '#8ad06a';
  for (const x of [84, 172]) {
    if (expr === 'blink' || expr === 'happy') {
      ctx.strokeStyle = '#1a1214'; ctx.lineWidth = 6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x - 18, 128); ctx.quadraticCurveTo(x, expr === 'happy' ? 112 : 138, x + 18, 128); ctx.stroke();
      continue;
    }
    ctx.fillStyle = eye; ctx.beginPath(); ctx.ellipse(x, 126, 20, 22, 0, 0, PI * 2); ctx.fill();
    ctx.strokeStyle = '#1a1214'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.ellipse(x, 126, 5, 17, 0, 0, PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x - 7, 117, 5, 0, PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#ff8aa0'; ctx.beginPath(); ctx.moveTo(120, 160); ctx.lineTo(136, 160); ctx.lineTo(128, 170); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#1a1214'; ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(128, 170); ctx.quadraticCurveTo(118, 184, 108, 174); ctx.moveTo(128, 170); ctx.quadraticCurveTo(138, 184, 148, 174); ctx.stroke();
  ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(30,20,20,0.7)';
  for (const sd of [-1, 1]) for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(128 + sd * 40, 168 + i * 7); ctx.lineTo(128 + sd * 92, 160 + i * 12); ctx.stroke(); }
  if (expr === 'blush' || expr === 'happy') { ctx.fillStyle = 'rgba(255,100,130,0.45)'; for (const x of [66, 190]) { ctx.beginPath(); ctx.ellipse(x, 160, 16, 8, 0, 0, PI * 2); ctx.fill(); } }
}

// ---------------- Ropa → colores por pieza ----------------
function outfitColors(look) {
  const skin = look.skin, tc = look.topColor || '#ffffff', bc = look.bottomColor || '#333344';
  const top = look.top || 'tshirt', bottom = look.bottom || 'pants';
  const male = look.gender !== 'f';
  const c = { chest: tc, waist: tc, uArm: tc, fArm: skin, hips: bc, thigh: bc, shin: bc, shoes: look.shoesColor || '#333', skirt: null, skirtLen: 0 };
  switch (top) {
    case 'tshirt': break;
    case 'hoodie': case 'shirt': case 'suit': case 'gi': case 'apron': c.fArm = tc; break;
    case 'tank': c.uArm = skin; break;
    case 'croptop': c.waist = skin; c.uArm = skin; break;
    case 'open_shirt': c.fArm = tc; break;
    case 'dress': c.uArm = skin; c.hips = tc; c.skirt = tc; c.skirtLen = 0.52; c.thigh = skin; c.shin = skin; break;
    case 'swim':
      c.uArm = skin; c.waist = skin; c.thigh = skin; c.shin = skin;
      if (male) { c.chest = skin; c.hips = look.bottomColor || tc; } else { c.hips = tc; }
      break;
  }
  if (top !== 'dress' && top !== 'swim') {
    if (bottom === 'shorts') { c.shin = skin; }
    else if (bottom === 'skirt') { c.skirt = bc; c.skirtLen = 0.36; c.thigh = skin; c.shin = skin; }
  }
  return c;
}

// ---------------- Pelo ----------------
function addHair(B, style, color, headY, R) {
  const hc = color;
  const segCap = new THREE.SphereGeometry(R * 1.06, 20, 12, 0, PI * 2, 0, 1.2);
  const back = (thetaLen, scale = 1.06) => new THREE.SphereGeometry(R * scale, 20, 12, PI / 2 + 1.0, PI * 2 - 2.0, 0, thetaLen);
  const bang = (x, y, z, rx, rz, sx = 0.13, sy = 0.2, sz = 0.07) => B.geo(SPH_LO, hc, x, y, z, { rx, rz, sx, sy, sz });
  if (style === 'bald') {
    // corona lateral de pelo blanco
    B.geo(new THREE.TorusGeometry(R * 0.92, 0.07, 6, 18, PI * 1.3), hc, 0, headY - 0.02, -0.02, { rx: PI / 2, rz: -PI * 0.15 - PI * 0.5 });
    return;
  }
  B.geo(segCap, hc, 0, headY + 0.01, -0.01);
  if (style === 'buzz') { B.geo(back(1.7, 1.04), hc, 0, headY, 0); return; }
  const longBack = { short: 1.85, spiky: 1.8, messy: 1.9, bob: 2.35, long: 2.2, ponytail: 1.7, twintails: 1.9, wavy: 2.25 }[style] || 1.85;
  B.geo(back(longBack, style === 'bob' ? 1.1 : 1.07), hc, 0, headY, -0.01);
  const fy = headY + R * 0.62, fz = R * 0.78;
  if (style === 'spiky') {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * PI * 2;
      B.geo(new THREE.ConeGeometry(0.1, 0.34, 6), hc, Math.cos(a) * R * 0.55, headY + R * 0.7, Math.sin(a) * R * 0.55 - 0.08, { rx: Math.sin(a) * -0.9 - 0.4, rz: Math.cos(a) * 0.9 });
    }
    for (let i = -2; i <= 2; i++) B.geo(new THREE.ConeGeometry(0.075, 0.28, 5), hc, i * 0.1, fy - 0.02, fz + 0.02, { rx: PI - 0.5, rz: i * 0.25 });
  } else if (style === 'messy') {
    for (let i = -2; i <= 2; i++) bang(i * 0.11, fy - 0.03 - Math.abs(i) * 0.02, fz, 0.35, i * 0.35, 0.12, 0.2, 0.08);
    for (let i = 0; i < 5; i++) { const a = i * 1.3; B.geo(new THREE.ConeGeometry(0.08, 0.22, 5), hc, Math.cos(a) * 0.2, headY + R * 0.95, Math.sin(a) * 0.2 - 0.05, { rx: Math.sin(a) * -0.6, rz: Math.cos(a) * 0.6 }); }
  } else if (style === 'bob') {
    for (let i = -2; i <= 2; i++) bang(i * 0.11, fy - 0.04, fz + 0.01, 0.25, 0, 0.12, 0.17, 0.07);
    for (const sd of [-1, 1]) B.geo(SPH_LO, hc, sd * R * 0.86, headY - 0.14, 0.02, { sx: 0.13, sy: 0.3, sz: 0.24 });
  } else {
    // bangs estándar
    for (let i = -2; i <= 2; i++) bang(i * 0.105, fy - 0.03 - (i === 0 ? 0.02 : 0), fz, 0.3, i * 0.18);
    for (const sd of [-1, 1]) B.geo(SPH_LO, hc, sd * R * 0.88, headY - 0.1, 0.1, { sx: 0.08, sy: 0.24, sz: 0.1 });
  }
  if (style === 'long') {
    B.geo(new THREE.CapsuleGeometry(0.32, 0.5, 4, 12), hc, 0, headY - 0.5, -0.17, { sz: 0.45 });
    for (const sd of [-1, 1]) B.geo(new THREE.CapsuleGeometry(0.07, 0.42, 4, 8), hc, sd * R * 0.82, headY - 0.38, 0.1);
  } else if (style === 'wavy') {
    for (let i = 0; i < 4; i++) for (const sd of [-1, 0, 1]) B.geo(SPH_LO, hc, sd * 0.2, headY - 0.18 - i * 0.2, -0.2 + (sd === 0 ? -0.03 : 0.03), { sx: 0.2, sy: 0.16, sz: 0.14 });
    for (const sd of [-1, 1]) for (let i = 0; i < 3; i++) B.geo(SPH_LO, hc, sd * (R * 0.9 - i * 0.02), headY - 0.12 - i * 0.18, 0.08, { sx: 0.09, sy: 0.12, sz: 0.09 });
  } else if (style === 'ponytail') {
    B.geo(SPH_LO, hc, 0, headY + 0.18, -R * 0.95, { sx: 0.13, sy: 0.13, sz: 0.13 });
    B.geo(new THREE.ConeGeometry(0.16, 0.75, 10), hc, 0, headY - 0.22, -R * 1.12, { rx: PI + 0.25 });
  } else if (style === 'twintails') {
    for (const sd of [-1, 1]) {
      B.geo(SPH_LO, hc, sd * R * 0.98, headY + 0.14, -0.06, { sx: 0.1, sy: 0.1, sz: 0.1 });
      B.geo(new THREE.ConeGeometry(0.14, 0.85, 10), hc, sd * (R * 1.12), headY - 0.36, -0.08, { rx: PI, rz: sd * -0.12 });
    }
  } else if (style === 'short') {
    B.geo(SPH_LO, hc, 0, headY - 0.18, -R * 0.82, { sx: 0.24, sy: 0.16, sz: 0.12 });
  }
}

function addAccessories(B, acc, look, headY, R, chestY) {
  for (const a of acc || []) {
    if (a === 'glasses') {
      for (const sd of [-1, 1]) B.geo(new THREE.TorusGeometry(0.085, 0.012, 5, 14), '#2a2226', sd * 0.13, headY - 0.02, R * 0.97, { outline: false });
      B.box(0.08, 0.015, 0.015, '#2a2226', 0, headY - 0.0, R * 0.99, 0, { outline: false });
    } else if (a === 'hairclip') {
      B.geo(new THREE.OctahedronGeometry(0.06), '#ffd34d', R * 0.62, headY + R * 0.55, R * 0.5, { outline: false });
    } else if (a === 'earrings') {
      for (const sd of [-1, 1]) B.geo(SPH_LO, '#e8c35a', sd * R * 0.98, headY - 0.14, 0.02, { sx: 0.03, sy: 0.03, sz: 0.03, outline: false });
    } else if (a === 'bandana') {
      B.geo(new THREE.TorusGeometry(R * 1.02, 0.045, 6, 22), '#d8344a', 0, headY + 0.12, 0, { rx: PI / 2 - 0.15 });
    } else if (a === 'headband') {
      B.geo(new THREE.TorusGeometry(R * 1.0, 0.035, 6, 22), '#d8344a', 0, headY + 0.08, 0, { rx: PI / 2 - 0.1 });
    } else if (a === 'choker') {
      B.geo(new THREE.TorusGeometry(0.075, 0.018, 6, 14), '#111', 0, chestY + 0.27, 0, { rx: PI / 2 });
    } else if (a === 'beard') {
      B.geo(SPH_LO, look.hairColor || '#eee', 0, headY - R * 0.72, R * 0.42, { sx: 0.2, sy: 0.22, sz: 0.14 });
    } else if (a === 'mask') {
      B.geo(new THREE.SphereGeometry(R * 1.015, 16, 8, PI / 2 - 0.75, 1.5, 1.72, 0.55), '#f4f6f8', 0, headY, 0);
    } else if (a === 'cap') {
      B.geo(new THREE.SphereGeometry(R * 1.1, 18, 8, 0, PI * 2, 0, 1.25), '#2b3a5a', 0, headY + 0.04, 0);
      B.box(0.36, 0.03, 0.26, '#2b3a5a', 0, headY + R * 0.42, R * 0.98, 0);
    } else if (a === 'guitar') {
      B.geo(SPH_LO, '#8a4a22', 0.08, chestY - 0.25, -0.3, { sx: 0.24, sy: 0.3, sz: 0.07, rz: 0.5 });
      B.box(0.06, 0.7, 0.04, '#3a2414', -0.12, chestY + 0.15, -0.3, 0);
    }
  }
}

// ---------------- Construcción ----------------
export function buildCharacter(look, { faceSize = 256 } = {}) {
  if (look.fur) return buildCat(look, faceSize);
  const fem = look.gender === 'f';
  const c = outfitColors(look);
  const root = new THREE.Group();
  const rig = new THREE.Group(); root.add(rig);
  const hipY = 0.86, chestY = 1.3, headY = 1.86, R = 0.36;
  const shoulderW = fem ? 0.255 : 0.29;

  // ---- Cuerpo (una sola malla) ----
  const B = new StaticBatch();
  const o = { thickness: 0.022 };
  B.geo(SPH, c.hips, 0, hipY + 0.04, 0, { sx: fem ? 0.25 : 0.23, sy: 0.16, sz: 0.17, ...o });
  B.geo(new THREE.CylinderGeometry(fem ? 0.17 : 0.2, fem ? 0.22 : 0.22, 0.26, 16), c.waist, 0, 1.07, 0, o);
  B.geo(SPH, c.chest, 0, chestY, 0, { sx: shoulderW, sy: 0.24, sz: fem ? 0.19 : 0.18, ...o });
  if (fem && c.chest !== look.skin) for (const sd of [-1, 1]) B.geo(SPH_LO, c.chest, sd * 0.09, chestY - 0.04, 0.12, { sx: 0.1, sy: 0.09, sz: 0.08, outline: false });
  if (look.top === 'open_shirt') B.box(0.12, 0.32, 0.02, look.skin, 0, chestY - 0.02, 0.18, 0, { outline: false });
  if (look.top === 'suit') { B.box(0.1, 0.3, 0.02, '#f2f2f2', 0, chestY - 0.02, 0.178, 0, { outline: false }); B.box(0.035, 0.26, 0.02, '#a8283a', 0, chestY - 0.05, 0.19, 0, { outline: false }); }
  if (look.top === 'gi') B.box(0.42, 0.06, 0.38, '#1e1e24', 0, 1.0, 0, 0, { outline: false });
  if (look.top === 'apron') B.box(0.36, 0.5, 0.03, '#2a2a30', 0, 1.0, 0.2, 0, { outline: false });
  if (look.top === 'hoodie') B.geo(new THREE.TorusGeometry(0.15, 0.05, 6, 14), look.topColor, 0, chestY + 0.2, -0.06, { rx: PI / 2 + 0.4 });
  if (c.skirt) B.geo(new THREE.CylinderGeometry(0.21, 0.36, c.skirtLen, 18), c.skirt, 0, hipY + 0.04 - c.skirtLen / 2 + 0.12, 0, o);
  B.geo(new THREE.CylinderGeometry(0.07, 0.08, 0.18, 10), look.skin, 0, 1.56, 0, { outline: false });
  // Cabeza
  B.geo(SPH, look.skin, 0, headY, 0, { sx: R, sy: R * 0.98, sz: R * 0.96, thickness: 0.026 });
  // orejas
  for (const sd of [-1, 1]) B.geo(SPH_LO, look.skin, sd * R * 0.95, headY - 0.04, 0, { sx: 0.05, sy: 0.08, sz: 0.06, outline: false });
  addHair(B, look.hair, look.hairColor, headY, R);
  addAccessories(B, look.acc, look, headY, R, chestY);
  const body = B.build();
  rig.add(body);

  // ---- Cara ----
  const fc = document.createElement('canvas'); fc.width = fc.height = faceSize;
  const fctx = fc.getContext('2d');
  const faceTex = new THREE.CanvasTexture(fc); faceTex.colorSpace = THREE.SRGBColorSpace; faceTex.anisotropy = 4;
  const faceGeo = new THREE.SphereGeometry(R * 1.005, 28, 16, PI / 2 - 0.9, 1.8, 0.9, 1.4);
  const faceMat = new THREE.MeshToonMaterial({ map: faceTex, transparent: true, depthWrite: false, gradientMap: body.userData.mesh.material.gradientMap });
  const face = new THREE.Mesh(faceGeo, faceMat);
  face.position.set(0, headY, 0); face.scale.set(1, 0.98, 0.96);
  face.renderOrder = 2;
  rig.add(face);

  // ---- Extremidades ----
  const limb = (parts) => { const b = new StaticBatch(); for (const p of parts) b.geo(p[0], p[1], p[2], p[3], p[4], { ...(p[5] || {}), thickness: 0.018 }); return b.build(); };
  const arm = (sd) => {
    const g = new THREE.Group(); g.position.set(sd * (shoulderW + 0.05), 1.42, 0);
    g.add(limb([
      [new THREE.CapsuleGeometry(fem ? 0.062 : 0.072, 0.2, 4, 10), c.uArm, 0, -0.15, 0],
      [new THREE.CapsuleGeometry(fem ? 0.055 : 0.064, 0.2, 4, 10), c.fArm, 0, -0.42, 0],
      [SPH_LO, look.skin, 0, -0.6, 0.01, { sx: 0.065, sy: 0.075, sz: 0.06 }],
    ]));
    g.rotation.z = sd * 0.08;
    rig.add(g); return g;
  };
  const leg = (sd) => {
    const g = new THREE.Group(); g.position.set(sd * 0.115, hipY, 0);
    g.add(limb([
      [new THREE.CapsuleGeometry(fem ? 0.095 : 0.1, 0.24, 4, 10), c.thigh, 0, -0.18, 0],
      [new THREE.CapsuleGeometry(fem ? 0.075 : 0.085, 0.26, 4, 10), c.shin, 0, -0.52, 0],
      [new THREE.BoxGeometry(0.15, 0.1, 0.26), c.shoes, 0, -0.78, 0.04],
    ]));
    rig.add(g); return g;
  };
  const armL = arm(-1), armR = arm(1), legL = leg(-1), legR = leg(1);
  root.traverse((m) => { if (m.isMesh && m.material !== faceMat && m.material !== OUTLINE_MAT) { m.castShadow = true; } });
  root.scale.setScalar(look.height || 1);

  const ch = new CharacterRig(root, rig, { armL, armR, legL, legR, face, body }, (expr) => { drawFace(fctx, look, expr, faceSize); faceTex.needsUpdate = true; });
  ch.setExpression('neutral');
  return ch;
}

function buildCat(look, faceSize) {
  const root = new THREE.Group();
  const rig = new THREE.Group(); root.add(rig);
  const B = new StaticBatch();
  const fur = look.fur, o = { thickness: 0.02 };
  B.geo(SPH, fur, 0, 0.32, -0.05, { sx: 0.22, sy: 0.2, sz: 0.3, ...o });
  B.geo(SPH, fur, 0, 0.62, 0.18, { sx: 0.24, sy: 0.21, sz: 0.21, ...o });
  B.geo(SPH_LO, '#fff4e6', 0, 0.55, 0.33, { sx: 0.11, sy: 0.07, sz: 0.06, outline: false });
  for (const sd of [-1, 1]) {
    B.geo(new THREE.ConeGeometry(0.08, 0.16, 4), fur, sd * 0.13, 0.82, 0.16, { rz: sd * -0.3, ...o });
    B.geo(new THREE.ConeGeometry(0.045, 0.09, 4), '#ffb0b8', sd * 0.13, 0.81, 0.2, { rz: sd * -0.3, outline: false });
  }
  B.geo(new THREE.TorusGeometry(0.16, 0.05, 6, 16), look.scarf, 0, 0.46, 0.12, { rx: PI / 2 + 0.3 });
  B.box(0.08, 0.16, 0.03, look.scarf, 0.1, 0.36, 0.24, 0.3, { outline: false });
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.3, -0.32), new THREE.Vector3(0, 0.45, -0.5), new THREE.Vector3(0.08, 0.7, -0.52), new THREE.Vector3(0.14, 0.78, -0.42)]);
  B.geo(new THREE.TubeGeometry(curve, 12, 0.045, 6), fur, 0, 0, 0, o);
  const body = B.build();
  rig.add(body);
  const fc = document.createElement('canvas'); fc.width = fc.height = faceSize;
  const fctx = fc.getContext('2d');
  const faceTex = new THREE.CanvasTexture(fc); faceTex.colorSpace = THREE.SRGBColorSpace;
  const face = new THREE.Mesh(new THREE.SphereGeometry(1.01, 24, 14, PI / 2 - 0.9, 1.8, 0.9, 1.4), new THREE.MeshToonMaterial({ map: faceTex, transparent: true, depthWrite: false }));
  face.position.set(0, 0.62, 0.18); face.scale.set(0.24, 0.21, 0.21); face.renderOrder = 2;
  rig.add(face);
  const leg = (x, z) => { const g = new THREE.Group(); g.position.set(x, 0.22, z); const b = new StaticBatch(); b.geo(new THREE.CapsuleGeometry(0.05, 0.14, 3, 8), fur, 0, -0.1, 0, { thickness: 0.015 }); g.add(b.build()); rig.add(g); return g; };
  const legL = leg(-0.1, 0.12), legR = leg(0.1, 0.12), armL = leg(-0.1, -0.2), armR = leg(0.1, -0.2);
  root.traverse((m) => { if (m.isMesh && m.material !== OUTLINE_MAT) m.castShadow = true; });
  root.scale.setScalar(1.25);
  const ch = new CharacterRig(root, rig, { armL, armR, legL, legR, face, body }, (expr) => { drawCatFace(fctx, look, expr, faceSize); faceTex.needsUpdate = true; });
  ch.isCat = true;
  ch.setExpression('neutral');
  return ch;
}

class CharacterRig {
  constructor(root, rig, parts, redraw) {
    this.root = root; this.rig = rig; this.parts = parts; this.redraw = redraw;
    this.phase = Math.random() * 10; this.blinkT = 2 + Math.random() * 3; this.expr = null; this.baseExpr = 'neutral';
    this.exprTimer = 0; this.talking = 0; this.walkAmt = 0;
  }
  setExpression(e, duration = 0) {
    if (duration > 0) { this.exprTimer = duration; } else this.baseExpr = e;
    if (this.expr !== e) { this.expr = e; this.redraw(e); }
  }
  update(dt, speed = 0) {
    const p = this.parts;
    this.walkAmt += ((speed > 0.1 ? 1 : 0) - this.walkAmt) * Math.min(1, dt * 10);
    this.phase += dt * (speed > 0.1 ? 2.2 + speed * 1.6 : 1.6);
    const sw = Math.sin(this.phase * (speed > 0.1 ? 2.2 : 1)) * this.walkAmt;
    if (this.isCat) {
      p.legL.rotation.x = sw * 0.8; p.legR.rotation.x = -sw * 0.8; p.armL.rotation.x = -sw * 0.8; p.armR.rotation.x = sw * 0.8;
      this.rig.position.y = Math.abs(sw) * 0.03;
    } else {
      p.legL.rotation.x = sw * 0.7; p.legR.rotation.x = -sw * 0.7;
      p.armL.rotation.x = -sw * 0.6; p.armR.rotation.x = sw * 0.6;
      const idle = (1 - this.walkAmt) * Math.sin(this.phase) * 0.012;
      this.rig.position.y = Math.abs(sw) * 0.05 + idle;
      if (this.talking > 0) { this.talking -= dt; p.armR.rotation.x = -0.4 + Math.sin(this.phase * 3) * 0.25; p.armR.rotation.z = 0.25; }
      else p.armR.rotation.z = 0.08;
    }
    // parpadeo
    this.blinkT -= dt;
    if (this.exprTimer > 0) { this.exprTimer -= dt; if (this.exprTimer <= 0) this.setExpression(this.baseExpr); }
    if (this.blinkT <= 0 && this.exprTimer <= 0) {
      if (this.expr !== 'blink') { this._pre = this.expr; this.expr = 'blink'; this.redraw('blink'); this.blinkT = 0.12; }
      else { this.expr = this._pre || this.baseExpr; this.redraw(this.expr); this.blinkT = 2.5 + Math.random() * 3.5; }
    }
  }
  dispose() {
    this.root.traverse((m) => { if (m.isMesh) { m.geometry.dispose(); if (m.material.map) m.material.map.dispose(); } });
  }
}
