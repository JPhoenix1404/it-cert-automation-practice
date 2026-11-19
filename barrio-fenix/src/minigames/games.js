// Los 9 minijuegos táctiles del juego.
import { attr } from '../state.js';
import { sfx } from '../audio.js';
import { shuffle, pick, rand, clamp } from '../game.js';
import { RECIPES } from '../data/items.js';

const PI = Math.PI;
const FONT = 'ui-rounded, "Hiragino Maru Gothic ProN", system-ui, sans-serif';
function rr(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }
function text(g, s, x, y, size = 20, color = '#3a2a3a', align = 'center', weight = '700') { g.font = `${weight} ${size}px ${FONT}`; g.fillStyle = color; g.textAlign = align; g.textBaseline = 'middle'; g.fillText(s, x, y); }
function emoji(g, e, x, y, size) { g.font = `${size}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(e, x, y); }

class Particles {
  constructor() { this.p = []; }
  burst(x, y, n, color, speed = 160, life = 0.6, size = 4) { for (let i = 0; i < n; i++) { const a = rand(0, PI * 2), s = rand(0.3, 1) * speed; this.p.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life, max: life, color, size }); } }
  update(dt) { for (const q of this.p) { q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 200 * dt; q.life -= dt; } this.p = this.p.filter((q) => q.life > 0); }
  draw(g) { for (const q of this.p) { g.globalAlpha = q.life / q.max; g.fillStyle = q.color; g.beginPath(); g.arc(q.x, q.y, q.size, 0, PI * 2); g.fill(); } g.globalAlpha = 1; }
}
function sparkle(g, x, y, s, a) { g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = '#fff'; g.beginPath(); for (let i = 0; i < 4; i++) { g.rotate(PI / 2); g.moveTo(0, 0); g.lineTo(s * 0.25, s * 0.25); g.lineTo(0, s); g.lineTo(-s * 0.25, s * 0.25); } g.fill(); g.restore(); }

// ======================= 1. Cristales =======================
const windows = {
  icon: '🪟', title: (o) => (o.context === 'board' ? 'Escaparate reluciente' : 'Cristal de luna'),
  instructions: () => 'Desliza el dedo sobre el cristal para <b>quitar toda la suciedad</b> antes de que acabe el tiempo.<br>Cuanto antes termines, mejor nota.',
  create({ W, H }) {
    const fw = Math.min(W * 0.8, 820), fh = Math.min(H * 0.72, 560), fx = (W - fw) / 2, fy = (H - fh) / 2 + 20;
    const dirt = document.createElement('canvas'); dirt.width = fw; dirt.height = fh;
    const d = dirt.getContext('2d');
    for (let i = 0; i < 70; i++) { const x = rand(0, fw), y = rand(0, fh), r = rand(30, 90); const gr = d.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(120,95,60,0.95)'); gr.addColorStop(1, 'rgba(140,110,70,0.0)'); d.fillStyle = gr; d.fillRect(x - r, y - r, r * 2, r * 2); }
    d.fillStyle = 'rgba(130,105,70,0.55)'; d.fillRect(0, 0, fw, fh);
    for (let i = 0; i < 25; i++) { d.fillStyle = 'rgba(90,70,40,0.6)'; d.beginPath(); d.ellipse(rand(0, fw), rand(0, fh), rand(4, 12), rand(3, 8), rand(0, PI), 0, PI * 2); d.fill(); }
    const GX = 32, GY = 22; const grid = new Uint8Array(GX * GY); let cleaned = 0;
    const brush = 34 + attr('destreza') * 2.5;
    const parts = new Particles(); let last = null; let sparkT = 0;
    const duration = 22 * (1 + attr('destreza') * 0.05);
    const self = {
      duration, done: false, finishT: null,
      wipe(x, y) {
        const lx = x - fx, ly = y - fy;
        d.globalCompositeOperation = 'destination-out';
        const pts = last ? Math.ceil(Math.hypot(lx - last[0], ly - last[1]) / 10) : 1;
        for (let i = 0; i < pts; i++) {
          const px = last ? last[0] + ((lx - last[0]) * (i + 1)) / pts : lx, py = last ? last[1] + ((ly - last[1]) * (i + 1)) / pts : ly;
          d.beginPath(); d.arc(px, py, brush, 0, PI * 2); d.fill();
          const cx0 = Math.floor(((px - brush) / fw) * GX), cx1 = Math.floor(((px + brush) / fw) * GX), cy0 = Math.floor(((py - brush) / fh) * GY), cy1 = Math.floor(((py + brush) / fh) * GY);
          for (let cy = Math.max(0, cy0); cy <= Math.min(GY - 1, cy1); cy++) for (let cx = Math.max(0, cx0); cx <= Math.min(GX - 1, cx1); cx++) {
            const ccx = ((cx + 0.5) / GX) * fw, ccy = ((cy + 0.5) / GY) * fh;
            if (!grid[cy * GX + cx] && Math.hypot(ccx - px, ccy - py) < brush * 0.95) { grid[cy * GX + cx] = 1; cleaned++; }
          }
        }
        d.globalCompositeOperation = 'source-over';
        last = [lx, ly];
        if (Math.random() < 0.3) sfx('swipe');
        if (Math.random() < 0.25) parts.burst(x, y, 2, '#ffffff', 80, 0.4, 3);
      },
      pointer(type, x, y) { if (type === 'down') { last = null; this.wipe(x, y); this.dragging = true; } else if (type === 'move' && this.dragging) this.wipe(x, y); else if (type === 'up') { this.dragging = false; last = null; } },
      update(dt, t) { parts.update(dt); sparkT += dt; if (cleaned / grid.length > 0.985 && !this.done) { this.done = true; this.finishT = t; sfx('good'); } },
      draw(g, t) {
        // vista exterior
        const sky = g.createLinearGradient(0, fy, 0, fy + fh); sky.addColorStop(0, '#7ec8ff'); sky.addColorStop(1, '#ffe2c8');
        g.fillStyle = '#f6e8d8'; g.fillRect(0, 0, W, H);
        g.save(); rr(g, fx, fy, fw, fh, 10); g.clip();
        g.fillStyle = sky; g.fillRect(fx, fy, fw, fh);
        g.fillStyle = '#ffb7cc'; for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(fx + 60 + i * fw / 6, fy + fh - 60, 55, 0, PI * 2); g.fill(); }
        g.fillStyle = '#9aa8c8'; for (let i = 0; i < 8; i++) g.fillRect(fx + i * fw / 8 + 8, fy + fh * 0.45 + (i % 3) * 30, fw / 10, fh);
        g.restore();
        g.drawImage(dirt, fx, fy);
        // brillos donde ya está limpio
        if (cleaned / grid.length > 0.5) for (let i = 0; i < 5; i++) sparkle(g, fx + ((i * 173) % fw), fy + ((i * 97) % fh), 10 + Math.sin(sparkT * 4 + i) * 5, sparkT);
        // marco
        g.lineWidth = 22; g.strokeStyle = '#ffffff'; rr(g, fx, fy, fw, fh, 10); g.stroke();
        g.lineWidth = 12; g.beginPath(); g.moveTo(fx + fw / 2, fy); g.lineTo(fx + fw / 2, fy + fh); g.moveTo(fx, fy + fh / 2); g.lineTo(fx + fw, fy + fh / 2); g.stroke();
        g.lineWidth = 3; g.strokeStyle = '#2a2030'; rr(g, fx - 11, fy - 11, fw + 22, fh + 22, 14); g.stroke();
        parts.draw(g);
      },
      scoreText() { return `Limpio: ${Math.round((cleaned / grid.length) * 100)}%`; },
      result(t) {
        const cov = cleaned / grid.length;
        const timeBonus = this.finishT ? clamp(1 - this.finishT / duration, 0, 1) : 0;
        const ratio = cov >= 0.95 ? 0.8 + timeBonus * 0.5 : cov * 0.82;
        return { ratio, score: Math.round(ratio * 1000), summary: `Superficie limpia: <b>${Math.round(cov * 100)}%</b>${this.finishT ? ` · Tiempo: <b>${this.finishT.toFixed(1)} s</b>` : ''}` };
      },
    };
    return self;
  },
};

// ======================= 2. Fregar =======================
const floor = {
  icon: '🧽', title: (o) => (o.context === 'board' ? 'Suelo impecable' : 'Huellas en el parqué'),
  instructions: () => 'Haz <b>círculos</b> con el dedo sobre cada mancha hasta que desaparezca.<br>Las manchas oscuras necesitan más esfuerzo.',
  create({ W, H }) {
    const stains = [];
    const n = 9;
    for (let i = 0; i < n; i++) {
      let x, y, ok;
      for (let k = 0; k < 40; k++) { x = rand(W * 0.12, W * 0.88); y = rand(H * 0.2, H * 0.88); ok = stains.every((s) => Math.hypot(s.x - x, s.y - y) > 120); if (ok) break; }
      const hp = pick([1, 1, 2, 2, 3]);
      stains.push({ x, y, r: rand(42, 70), hp, need: 340 * hp, prog: 0, rot: rand(0, PI), done: false, blobs: Array.from({ length: 5 }, () => [rand(-0.5, 0.5), rand(-0.5, 0.5), rand(0.4, 0.8)]) });
    }
    const parts = new Particles(); let last = null; let bubbles = [];
    const duration = 28 * (1 + attr('destreza') * 0.05);
    return {
      duration, done: false, finishT: null,
      pointer(type, x, y) {
        if (type === 'down') { last = [x, y]; return; }
        if (type === 'up') { last = null; return; }
        if (!last) return;
        const dist = Math.hypot(x - last[0], y - last[1]); last = [x, y];
        for (const s of stains) if (!s.done && Math.hypot(x - s.x, y - s.y) < s.r + 25) {
          s.prog += dist * (1 + attr('destreza') * 0.06);
          if (Math.random() < 0.3) bubbles.push({ x: x + rand(-20, 20), y: y + rand(-20, 20), r: rand(4, 10), life: 0.8 });
          if (Math.random() < 0.15) sfx('scrub');
          if (s.prog >= s.need) { s.done = true; sfx('pop'); parts.burst(s.x, s.y, 16, '#bfe8ff', 220, 0.7, 5); }
        }
      },
      update(dt, t) { parts.update(dt); bubbles.forEach((b) => (b.life -= dt)); bubbles = bubbles.filter((b) => b.life > 0); if (!this.done && stains.every((s) => s.done)) { this.done = true; this.finishT = t; } },
      draw(g, t) {
        // parqué
        g.fillStyle = '#c99a6a'; g.fillRect(0, 0, W, H);
        for (let y = 0; y < H; y += 48) for (let x = -((y / 48) % 2) * 90; x < W; x += 180) { g.fillStyle = ((x + y) / 48) % 3 < 1 ? '#c49262' : '#cfa274'; g.fillRect(x + 2, y + 2, 176, 44); }
        for (const s of stains) {
          if (s.done) { sparkle(g, s.x, s.y, 14 + Math.sin(t * 6) * 4, t); continue; }
          const a = 1 - s.prog / s.need;
          g.save(); g.translate(s.x, s.y); g.rotate(s.rot);
          for (const [bx, by, br] of s.blobs) { g.fillStyle = `rgba(${s.hp === 3 ? '60,40,25' : s.hp === 2 ? '90,65,40' : '120,95,60'},${0.85 * a})`; g.beginPath(); g.ellipse(bx * s.r, by * s.r, s.r * br, s.r * br * 0.8, 0, 0, PI * 2); g.fill(); }
          g.restore();
          g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 4; g.beginPath(); g.arc(s.x, s.y, s.r + 14, -PI / 2, -PI / 2 + (s.prog / s.need) * PI * 2); g.stroke();
        }
        for (const b of bubbles) { g.globalAlpha = b.life; g.strokeStyle = '#ffffff'; g.lineWidth = 2; g.beginPath(); g.arc(b.x, b.y - (0.8 - b.life) * 30, b.r, 0, PI * 2); g.stroke(); }
        g.globalAlpha = 1; parts.draw(g);
      },
      scoreText() { return `Manchas: ${stains.filter((s) => s.done).length}/${stains.length}`; },
      result() {
        const part = stains.reduce((a, s) => a + Math.min(1, s.prog / s.need), 0) / stains.length;
        const timeBonus = this.finishT ? clamp(1 - this.finishT / duration, 0, 1) : 0;
        const ratio = this.finishT ? 0.8 + timeBonus * 0.5 : part * 0.82;
        return { ratio, summary: `Manchas eliminadas: <b>${stains.filter((s) => s.done).length}/${stains.length}</b>` };
      },
    };
  },
};

// ======================= 3. Ayudar en la calle (atrapar) =======================
const street = {
  icon: '🧺', title: (o) => (o.context === 'petals' ? 'Lluvia de pétalos' : o.context === 'lucia' ? '¡Las naranjas de Lucía!' : 'Ayuda en la calle'),
  instructions: (o) => (o.context === 'petals' ? 'Arrastra la cesta para <b>recoger los pétalos</b> antes de que toquen el suelo.' : 'Se ha roto la bolsa de la compra. Arrastra la cesta para <b>atrapar todo lo que cae</b>.<br>¡Cuidado con los huevos!'),
  create({ W, H, opts }) {
    const petals = opts.context === 'petals';
    const items = petals ? ['🌸'] : ['🍊', '🍊', '🍎', '🥖', '🥚', '🍋', '🥫', '🧀'];
    const basket = { x: W / 2, y: H - 90, w: 150 + attr('destreza') * 6 };
    const falling = []; let spawnT = 0, caught = 0, spawned = 0, missed = 0, dropped = 0;
    const parts = new Particles();
    const duration = 30;
    return {
      duration,
      pointer(type, x) { if (type !== 'up') basket.x = clamp(x, basket.w / 2, W - basket.w / 2); },
      update(dt, t) {
        parts.update(dt);
        spawnT -= dt;
        const rate = petals ? 0.45 : Math.max(0.45, 1.1 - t * 0.022);
        if (spawnT <= 0 && t < duration - 1.5) {
          spawnT = rate; spawned++;
          falling.push({ x: rand(40, W - 40), y: -30, vy: petals ? rand(90, 140) : rand(160, 230) + t * 6, vx: petals ? rand(-40, 40) : 0, e: pick(items), rot: 0, sway: rand(0, 6) });
        }
        for (const f of falling) {
          f.y += f.vy * dt; f.vy += (petals ? 10 : 120) * dt; f.rot += dt * 2;
          if (petals) f.x += Math.sin(t * 2 + f.sway) * 60 * dt + f.vx * dt;
          if (!f.gone && f.y > basket.y - 20 && f.y < basket.y + 25 && Math.abs(f.x - basket.x) < basket.w / 2) { f.gone = true; caught++; sfx('catch'); parts.burst(f.x, basket.y - 10, 8, petals ? '#ffb7cc' : '#ffd34d', 150, 0.5, 4); }
          if (!f.gone && f.y > H + 20) { f.gone = true; missed += f.e === '🥚' ? 2 : 1; dropped++; if (!petals) sfx('error'); }
        }
        for (let i = falling.length - 1; i >= 0; i--) if (falling[i].gone) falling.splice(i, 1);
      },
      draw(g) {
        const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#ffe2c8'); sky.addColorStop(1, '#ffd0d8');
        g.fillStyle = sky; g.fillRect(0, 0, W, H);
        g.fillStyle = '#f2b0c4'; for (let i = 0; i < 7; i++) { g.beginPath(); g.arc(i * W / 6, H * 0.55, 90, 0, PI * 2); g.fill(); }
        g.fillStyle = '#d8ccb6'; g.fillRect(0, H - 60, W, 60);
        for (const f of falling) { g.save(); g.translate(f.x, f.y); g.rotate(petals ? f.rot : Math.sin(f.rot) * 0.3); emoji(g, f.e, 0, 0, petals ? 34 : 50); g.restore(); }
        // cesta
        g.fillStyle = '#b07a42'; rr(g, basket.x - basket.w / 2, basket.y - 10, basket.w, 50, 14); g.fill();
        g.strokeStyle = '#8a5a2a'; g.lineWidth = 4; for (let i = 1; i < 6; i++) { g.beginPath(); g.moveTo(basket.x - basket.w / 2 + (basket.w * i) / 6, basket.y - 8); g.lineTo(basket.x - basket.w / 2 + (basket.w * i) / 6, basket.y + 38); g.stroke(); }
        g.strokeStyle = '#2a2030'; g.lineWidth = 3; rr(g, basket.x - basket.w / 2, basket.y - 10, basket.w, 50, 14); g.stroke();
        parts.draw(g);
      },
      scoreText() { return `Atrapados: ${caught}`; },
      result() { const ratio = spawned ? caught / Math.max(1, caught + missed) : 0; return { ratio: ratio * 1.04, score: caught * 50, summary: `Atrapados: <b>${caught}</b> · Al suelo: <b>${dropped}</b>` }; },
    };
  },
};

// ======================= 4. Hacer la compra =======================
const PRODUCTS = [['🍚', 'Arroz'], ['🥚', 'Huevos'], ['🥬', 'Verduras'], ['🐟', 'Pescado'], ['🥩', 'Carne'], ['🍫', 'Chocolate'], ['🍎', 'Manzana'], ['🥛', 'Leche'], ['🧀', 'Queso'], ['🍞', 'Pan'], ['🥕', 'Zanahoria'], ['🍌', 'Plátano'], ['🧈', 'Mantequilla'], ['🍅', 'Tomate'], ['🥔', 'Patata'], ['🍋', 'Limón'], ['🧃', 'Zumo'], ['🍪', 'Galletas'], ['🥫', 'Conserva'], ['🍯', 'Miel'], ['🫑', 'Pimiento'], ['🧅', 'Cebolla'], ['🍇', 'Uvas'], ['🥐', 'Cruasán']];
const shopping = {
  icon: '🛒', title: () => 'Despensa vacía',
  instructions: () => 'Toca en la estantería los <b>productos de la lista</b>.<br>Cada error te quita 2 segundos.',
  create({ W, H }) {
    const list = shuffle(PRODUCTS).slice(0, 6);
    let grid = [];
    const COLS = 8, ROWS = 4;
    const refill = () => {
      const pool = shuffle(PRODUCTS);
      grid = [];
      const needLeft = list.filter((p) => !p.found);
      const slots = shuffle([...Array(COLS * ROWS).keys()]);
      needLeft.forEach((p, i) => (grid[slots[i]] = p));
      let k = 0;
      for (let i = 0; i < COLS * ROWS; i++) if (!grid[i]) { while (list.includes(pool[k % pool.length])) k++; grid[i] = pool[k % pool.length]; k++; }
    };
    list.forEach((p) => (p.found = false));
    refill();
    const parts = new Particles(); let penalty = 0, wrongs = 0, flash = 0, shuffleT = 9;
    const shelfX = W * 0.27, shelfW = W * 0.7, shelfY = 90, shelfH = H - 140, cw = shelfW / COLS, ch = shelfH / ROWS;
    const duration = 32;
    return {
      duration, done: false, finishT: null,
      pointer(type, x, y) {
        if (type !== 'down') return;
        const c = Math.floor((x - shelfX) / cw), r = Math.floor((y - shelfY) / ch);
        if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return;
        const p = grid[r * COLS + c];
        const target = list.find((q) => q === p && !q.found);
        if (target) { target.found = true; sfx('good'); parts.burst(x, y, 12, '#7ad07a', 200, 0.6, 5); grid[r * COLS + c] = null; }
        else if (p) { penalty += 2; wrongs++; flash = 0.3; sfx('error'); }
      },
      update(dt, t) {
        parts.update(dt); flash -= dt; shuffleT -= dt;
        if (shuffleT <= 0) { shuffleT = 9; refill(); }
        if (!this.done && list.every((p) => p.found)) { this.done = true; this.finishT = t + penalty; }
        if (t + penalty >= duration) this.done = true;
      },
      draw(g, t) {
        g.fillStyle = '#eef2f6'; g.fillRect(0, 0, W, H);
        // lista
        g.fillStyle = '#fffbe8'; rr(g, 16, 80, W * 0.23, H - 120, 16); g.fill(); g.strokeStyle = '#d8c8a0'; g.lineWidth = 2; g.stroke();
        text(g, '📝 Lista', 16 + W * 0.115, 108, 22);
        list.forEach((p, i) => { const y = 150 + i * 52; emoji(g, p[0], 50, y, 30); text(g, p[1], 76, y, 20, p.found ? '#9aa' : '#3a2a3a', 'left'); if (p.found) { g.strokeStyle = '#e8445a'; g.lineWidth = 3; g.beginPath(); g.moveTo(70, y); g.lineTo(70 + W * 0.13, y); g.stroke(); } });
        // estantería
        for (let r = 0; r < ROWS; r++) {
          g.fillStyle = '#ffffff'; g.fillRect(shelfX, shelfY + r * ch, shelfW, ch - 6);
          g.fillStyle = '#c0c6d0'; g.fillRect(shelfX, shelfY + (r + 1) * ch - 10, shelfW, 10);
          for (let c = 0; c < COLS; c++) { const p = grid[r * COLS + c]; if (p) emoji(g, p[0], shelfX + c * cw + cw / 2, shelfY + r * ch + ch / 2 - 6, Math.min(cw, ch) * 0.55); }
        }
        if (flash > 0) { g.fillStyle = `rgba(255,60,80,${flash})`; g.fillRect(0, 0, W, H); }
        parts.draw(g);
        text(g, `La estantería se reordena en ${Math.ceil(shuffleT)} s`, shelfX + shelfW / 2, H - 30, 16, '#6a6a7a');
      },
      scoreText() { return `${list.filter((p) => p.found).length}/${list.length}${penalty ? ` · −${penalty}s` : ''}`; },
      result() {
        const found = list.filter((p) => p.found).length / list.length;
        const ratio = this.finishT ? 0.75 + clamp(1 - this.finishT / duration, 0, 1) * 0.6 - wrongs * 0.03 : found * 0.7;
        return { ratio, summary: `Productos: <b>${list.filter((p) => p.found).length}/${list.length}</b> · Errores: <b>${wrongs}</b>` };
      },
    };
  },
};

// ======================= 5. Reponer =======================
const restock = {
  icon: '📦', title: () => 'Reponer estanterías',
  instructions: () => 'Arrastra cada producto a la <b>balda de su color</b>.<br>¡Rápido, que se acumulan las cajas!',
  create({ W, H }) {
    const COLORS = [['#ff6a5a', 'Rojo'], ['#ffd34d', 'Amarillo'], ['#5ab8ff', 'Azul'], ['#7ad07a', 'Verde']];
    const EM = [['🥫', '🍅', '🌶️'], ['🧀', '🍌', '🍋'], ['🥛', '🧴', '🫐'], ['🥬', '🥒', '🍏']];
    const shelfH = (H - 220) / 4;
    const queue = []; let held = null, ok = 0, bad = 0, spawnT = 0;
    const parts = new Particles();
    const mk = () => { const c = Math.floor(Math.random() * 4); return { c, e: pick(EM[c]), x: W / 2 + (queue.length - 1) * 80, y: H - 70 }; };
    for (let i = 0; i < 3; i++) queue.push(mk());
    const duration = 30;
    const layout = () => queue.forEach((q, i) => { if (q !== held) { q.x += ((W / 2 - 80 + i * 80) - q.x) * 0.3; q.y += ((H - 70) - q.y) * 0.3; } });
    return {
      duration,
      pointer(type, x, y) {
        if (type === 'down') { const q = queue.find((q) => Math.hypot(q.x - x, q.y - y) < 50); if (q) { held = q; sfx('click'); } }
        else if (type === 'move' && held) { held.x = x; held.y = y; }
        else if (type === 'up' && held) {
          const row = Math.floor((held.y - 90) / shelfH);
          if (row >= 0 && row < 4 && held.y < H - 130) {
            if (row === held.c) { ok++; sfx('good'); parts.burst(held.x, held.y, 10, COLORS[row][0], 180, 0.5, 5); }
            else { bad++; sfx('error'); }
            queue.splice(queue.indexOf(held), 1);
          }
          held = null;
        }
      },
      update(dt) {
        parts.update(dt); spawnT -= dt;
        if (spawnT <= 0 && queue.length < 5) { spawnT = 1.2; queue.push(mk()); }
        layout();
      },
      draw(g) {
        g.fillStyle = '#f2f0ec'; g.fillRect(0, 0, W, H);
        COLORS.forEach(([c, n], i) => {
          const y = 90 + i * shelfH;
          g.fillStyle = '#ffffff'; g.fillRect(W * 0.08, y, W * 0.84, shelfH - 8);
          g.fillStyle = c; g.fillRect(W * 0.08, y + shelfH - 22, W * 0.84, 14);
          text(g, n, W * 0.08 + 14, y + 22, 18, c, 'left');
          for (let k = 0; k < 9; k++) emoji(g, EM[i][k % 3], W * 0.2 + k * W * 0.075, y + shelfH / 2 - 4, 30);
        });
        g.fillStyle = '#c8a070'; rr(g, W / 2 - 230, H - 120, 460, 110, 18); g.fill();
        for (const q of queue) { g.fillStyle = COLORS[q.c][0]; rr(g, q.x - 38, q.y - 38, 76, 76, 14); g.fill(); g.strokeStyle = '#2a2030'; g.lineWidth = 3; g.stroke(); emoji(g, q.e, q.x, q.y, 44); }
        parts.draw(g);
      },
      scoreText() { return `Bien: ${ok} · Mal: ${bad}`; },
      result() { const ratio = (ok - bad * 1.5) / 18; return { ratio, score: ok * 100 - bad * 50, summary: `Colocados: <b>${ok}</b> · Errores: <b>${bad}</b>` }; },
    };
  },
};

// ======================= 6. Ritmo =======================
const rhythm = {
  icon: '🎸', title: (o) => (o.context === 'nora' ? 'Bajo las farolas' : 'Concierto en la plaza'), duck: false,
  instructions: () => 'Toca cada carril cuando la nota llegue a la <b>línea brillante</b>.<br>Perfecto = en el centro. ¡No te dejes ninguna!',
  create({ W, H }) {
    const bpm = 104, beat = 60 / bpm, lanes = 3, lw = Math.min(160, W / 5), lx = W / 2 - (lw * lanes) / 2, hitY = H - 140, speed = 380;
    const notes = []; let t0 = 2.0;
    const pattern = [0, 1, 2, 1, 0, 2, 1, 1, 0, 1, 2, 2, 1, 0, 0, 2];
    for (let i = 0, t = t0; t < 32; i++, t += beat * (i % 8 === 7 ? 1 : 0.5 + (i % 3 === 0 ? 0.5 : 0))) notes.push({ lane: pattern[i % pattern.length], t, hit: null });
    let perfect = 0, good = 0, miss = 0, strays = 0, combo = 0, best = 0, flash = [0, 0, 0], label = null;
    const parts = new Particles(); let now = 0;
    const win = 0.13 + attr('destreza') * 0.006;
    return {
      duration: 34,
      pointer(type, x) {
        if (type !== 'down') return;
        const lane = Math.floor((x - lx) / lw);
        if (lane < 0 || lane >= lanes) return;
        flash[lane] = 0.15; sfx(['note1', 'note2', 'note3'][lane]);
        let n = null, bd = 1;
        for (const q of notes) if (q.lane === lane && !q.hit) { const d = Math.abs(q.t - now); if (d < bd) { bd = d; n = q; } }
        if (!n || bd >= win) { strays++; combo = 0; label = { s: 'FALLO', t: 0.4, lane }; return; }
        if (n && bd < win) {
          n.hit = bd < win * 0.45 ? 'perfect' : 'good';
          if (n.hit === 'perfect') perfect++; else good++;
          combo++; best = Math.max(best, combo);
          label = { s: n.hit === 'perfect' ? '¡PERFECTO!' : 'BIEN', t: 0.5, lane };
          parts.burst(lx + lane * lw + lw / 2, hitY, 12, n.hit === 'perfect' ? '#ffd34d' : '#7ec8ff', 200, 0.5, 5);
        }
      },
      update(dt, t) { now = t; parts.update(dt); flash = flash.map((f) => f - dt); if (label) label.t -= dt; for (const q of notes) if (!q.hit && t - q.t > win) { q.hit = 'miss'; miss++; combo = 0; } },
      draw(g, t) {
        const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#1b1840'); bg.addColorStop(1, '#4a2a5a'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
        for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(255,255,255,${0.3 + Math.sin(t * 2 + i) * 0.2})`; g.fillRect((i * 137) % W, (i * 71) % (H * 0.6), 2, 2); }
        for (let l = 0; l < lanes; l++) { g.fillStyle = flash[l] > 0 ? 'rgba(255,220,150,0.35)' : 'rgba(255,255,255,0.08)'; rr(g, lx + l * lw + 6, 60, lw - 12, H - 100, 16); g.fill(); }
        g.fillStyle = '#ffd37a'; g.shadowColor = '#ffb040'; g.shadowBlur = 20; g.fillRect(lx, hitY - 3, lw * lanes, 6); g.shadowBlur = 0;
        const cols = ['#ff6a8a', '#7ec8ff', '#b07aff'];
        for (const q of notes) {
          if (q.hit && q.hit !== 'miss') continue;
          const y = hitY - (q.t - t) * speed; if (y < 40 || y > H) continue;
          g.fillStyle = cols[q.lane]; g.beginPath(); g.arc(lx + q.lane * lw + lw / 2, y, 26, 0, PI * 2); g.fill();
          g.strokeStyle = '#fff'; g.lineWidth = 4; g.stroke(); emoji(g, '♪', lx + q.lane * lw + lw / 2, y + 1, 26);
        }
        parts.draw(g);
        if (label && label.t > 0) text(g, label.s, lx + label.lane * lw + lw / 2, hitY - 60, 24, '#ffffff');
        if (combo > 2) text(g, `Combo x${combo}`, W / 2, 40, 22, '#ffd37a');
      },
      scoreText() { return `Perfectos: ${perfect} · Fallos: ${miss}`; },
      result() { const total = notes.length; const ratio = (perfect + good * 0.65) / (total + strays * 0.5); return { ratio: ratio * 1.05, score: perfect * 100 + good * 60, summary: `Perfectos: <b>${perfect}</b> · Bien: <b>${good}</b> · Fallos: <b>${miss + strays}</b> · Mejor combo: <b>${best}</b>` }; },
    };
  },
};

// ======================= 7. Cocina =======================
const cooking = {
  icon: '🍳', title: (o) => `Cocinar: ${RECIPES[o.recipe]?.name || 'Plato del día'}`,
  instructions: () => 'Tres fases:<br>1) <b>Pica</b> tocando rápido la tabla.<br>2) <b>Remueve</b> haciendo círculos en la sartén.<br>3) <b>Punto exacto:</b> toca cuando la aguja esté en la zona verde.',
  create({ W, H, opts }) {
    const r = RECIPES[opts.recipe] || RECIPES.curry;
    let phase = 0, chops = 0, angle = 0, lastA = null, needle = 0, dir = 1, stopped = null, phaseT = 0, scores = [0, 0, 0];
    const parts = new Particles();
    const chopTarget = 16, stirTarget = PI * 2 * 5;
    const zone = 0.1 + attr('cocina') * 0.012, zc = rand(0.3, 0.7);
    const cx = W / 2, cy = H / 2 + 20;
    const PH = 8;
    return {
      duration: 27, done: false,
      next() { phase++; phaseT = 0; sfx('good'); if (phase === 2) sfx('sizzle'); },
      pointer(type, x, y) {
        if (phase === 0 && type === 'down') { chops++; sfx('chop'); parts.burst(x, y, 4, pick(['#7ad07a', '#ff8a5a', '#ffd34d']), 160, 0.4, 5); if (chops >= chopTarget) { scores[0] = clamp(1.25 - phaseT / PH, 0, 1); this.next(); } }
        else if (phase === 1) {
          if (type === 'down') lastA = Math.atan2(y - cy, x - cx);
          else if (type === 'move' && lastA !== null) {
            const a = Math.atan2(y - cy, x - cx); let d = a - lastA; while (d > PI) d -= PI * 2; while (d < -PI) d += PI * 2;
            angle += Math.abs(d); lastA = a; if (Math.random() < 0.1) sfx('sizzle');
            if (angle >= stirTarget) { scores[1] = clamp(1.25 - phaseT / PH, 0, 1); this.next(); }
          } else if (type === 'up') lastA = null;
        } else if (phase === 2 && type === 'down' && stopped === null) {
          stopped = needle; const d = Math.abs(needle - zc);
          scores[2] = d < zone / 2 ? 1 : d < zone ? 0.7 : d < zone * 2 ? 0.35 : 0.05;
          sfx(scores[2] > 0.6 ? 'fanfare' : 'bad');
          setTimeout(() => (this.done = true), 700);
        }
      },
      update(dt) {
        parts.update(dt); phaseT += dt;
        if (phase < 2 && phaseT > PH) { scores[phase] = phase === 0 ? (chops / chopTarget) * 0.6 : (angle / stirTarget) * 0.6; this.next(); }
        if (phase === 2 && stopped === null) { needle += dir * dt * 0.75; if (needle > 1) { needle = 1; dir = -1; } if (needle < 0) { needle = 0; dir = 1; } if (phaseT > 9) { stopped = needle; scores[2] = 0; this.done = true; } }
      },
      draw(g, t) {
        g.fillStyle = '#fff3e0'; g.fillRect(0, 0, W, H);
        g.fillStyle = '#e8d8c0'; g.fillRect(0, H * 0.7, W, H * 0.3);
        text(g, ['1 · ¡Pica!', '2 · ¡Remueve!', '3 · ¡Punto exacto!'][phase], W / 2, 90, 34, '#c8443a');
        emoji(g, r.icon, W - 80, 90, 54);
        if (phase === 0) {
          g.fillStyle = '#c8955a'; rr(g, cx - 220, cy - 120, 440, 240, 24); g.fill(); g.strokeStyle = '#8a5a2a'; g.lineWidth = 4; g.stroke();
          emoji(g, ['🥕', '🧅', '🥬'][Math.floor(chops / 8) % 3], cx, cy, 110);
          emoji(g, '🔪', cx + 120, cy - 60 + (chops % 2) * 20, 80);
          g.fillStyle = '#ddd'; rr(g, cx - 200, cy + 150, 400, 22, 11); g.fill(); g.fillStyle = '#7ad07a'; rr(g, cx - 200, cy + 150, 400 * Math.min(1, chops / chopTarget), 22, 11); g.fill();
        } else if (phase === 1) {
          g.fillStyle = '#2a2a30'; g.beginPath(); g.arc(cx, cy, 170, 0, PI * 2); g.fill(); g.fillStyle = '#3a3a44'; g.beginPath(); g.arc(cx, cy, 150, 0, PI * 2); g.fill();
          for (let i = 0; i < 9; i++) { const a = angle * 0.8 + i * 0.7; emoji(g, ['🥕', '🥬', '🧅'][i % 3], cx + Math.cos(a) * (50 + (i % 3) * 30), cy + Math.sin(a) * (50 + (i % 3) * 30), 34); }
          g.strokeStyle = '#7ad07a'; g.lineWidth = 10; g.beginPath(); g.arc(cx, cy, 190, -PI / 2, -PI / 2 + (angle / stirTarget) * PI * 2); g.stroke();
        } else {
          const bx = W * 0.15, bw = W * 0.7, by = cy - 20;
          g.fillStyle = '#ffd8c8'; rr(g, bx, by, bw, 50, 25); g.fill();
          g.fillStyle = '#ffd34d'; g.fillRect(bx + (zc - zone) * bw, by, zone * 2 * bw, 50);
          g.fillStyle = '#4ad07a'; g.fillRect(bx + (zc - zone / 2) * bw, by, zone * bw, 50);
          g.strokeStyle = '#2a2030'; g.lineWidth = 3; rr(g, bx, by, bw, 50, 25); g.stroke();
          const nx = bx + (stopped ?? needle) * bw; g.fillStyle = '#c8243a'; g.fillRect(nx - 4, by - 20, 8, 90);
          emoji(g, '🍳', cx, by + 160, 90);
          if (Math.random() < 0.5) parts.burst(cx + rand(-40, 40), by + 120, 1, 'rgba(255,255,255,0.8)', 60, 0.8, 6);
        }
        g.fillStyle = '#c8443a'; rr(g, W / 2 - 160, H - 50, 320 * Math.max(0, 1 - phaseT / (phase === 2 ? 9 : PH)), 10, 5); g.fill();
        parts.draw(g);
      },
      scoreText() { return ['Picado', 'Removido', 'Punto'][phase] || ''; },
      result() { const ratio = (scores[0] + scores[1] + scores[2] * 1.2) / 3.2 * 1.05; return { ratio, summary: `Picado: <b>${Math.round(scores[0] * 100)}%</b> · Removido: <b>${Math.round(scores[1] * 100)}%</b> · Punto: <b>${Math.round(scores[2] * 100)}%</b>`, extra: { recipe: opts.recipe } }; },
    };
  },
};

// ======================= 8. Barista =======================
const ING = { expreso: ['☕', 'Expreso'], leche: ['🥛', 'Leche'], avena: ['🌾', 'Leche de avena'], azucar: ['🍬', 'Azúcar'], canela: ['🟤', 'Canela'], cacao: ['🍫', 'Cacao'], hielo: ['🧊', 'Hielo'], vainilla: ['🌼', 'Vainilla'] };
const barista = {
  icon: '☕', title: (o) => (o.context === 'valeria' ? 'Café para la jefa' : 'Turno en Café Ascua'),
  instructions: (o) => (o.context === 'valeria' ? 'Prepara exactamente lo que pidió Valeria:<br><b>doble de expreso, leche de avena, sin azúcar y con canela</b>.<br>Toca los ingredientes y luego «Servir».' : 'Memoriza el pedido mientras se muestra.<br>Después toca los ingredientes correctos y pulsa <b>«Servir»</b>.'),
  create({ W, H, opts }) {
    const val = opts.context === 'valeria';
    const keys = Object.keys(ING);
    let orders = val ? [['expreso', 'expreso', 'avena', 'canela']] : Array.from({ length: 4 }, (_, i) => Array.from({ length: 3 + Math.min(2, i) }, () => pick(keys)));
    const memo = (o) => 1.4 + o.length * 0.7;
    let idx = 0, showT = val ? 0 : memo(orders[0]), cup = [], results = [], partial = [], feedback = null;
    const btns = keys.map((k, i) => ({ k, x: W * 0.1 + (i % 4) * W * 0.2 + W * 0.1, y: H * 0.62 + Math.floor(i / 4) * 110 }));
    const serve = { x: W - 130, y: H * 0.38, w: 200, h: 70 }, clear = { x: W - 130, y: H * 0.38 + 90, w: 200, h: 56 };
    const parts = new Particles();
    const same = (a, b) => a.length === b.length && [...a].sort().join() === [...b].sort().join();
    return {
      duration: val ? 30 : 48, done: false,
      pointer(type, x, y) {
        if (type !== 'down' || showT > 0 || feedback) return;
        for (const b of btns) if (Math.hypot(b.x - x, b.y - y) < 50) { if (cup.length < 6) { cup.push(b.k); sfx('pop'); } return; }
        if (Math.abs(x - serve.x) < serve.w / 2 && Math.abs(y - serve.y) < serve.h / 2) {
          const ok = same(cup, orders[idx]); results.push(ok);
          { const left = [...orders[idx]]; let hit = 0; for (const k of cup) { const j = left.indexOf(k); if (j >= 0) { left.splice(j, 1); hit++; } } partial.push(ok ? 1 : (hit / Math.max(cup.length, orders[idx].length)) * 0.7); }
          feedback = { ok, t: 0.9 }; sfx(ok ? 'fanfare' : 'bad');
          if (ok) parts.burst(W / 2, H * 0.32, 20, '#ffd34d', 260, 0.7, 6);
        }
        if (Math.abs(x - clear.x) < clear.w / 2 && Math.abs(y - clear.y) < clear.h / 2) { cup = []; sfx('click'); }
      },
      update(dt) {
        parts.update(dt);
        if (showT > 0) showT -= dt;
        if (feedback) { feedback.t -= dt; if (feedback.t <= 0) { feedback = null; cup = []; idx++; if (idx >= orders.length) this.done = true; else showT = val ? 0 : memo(orders[idx]); } }
      },
      draw(g) {
        g.fillStyle = '#f4e8dc'; g.fillRect(0, 0, W, H);
        g.fillStyle = '#6a4a34'; g.fillRect(0, H * 0.5, W, H * 0.5);
        text(g, val ? 'Pedido de Valeria' : `Pedido ${Math.min(idx + 1, orders.length)}/${orders.length}`, W / 2, 80, 26);
        const o = orders[Math.min(idx, orders.length - 1)];
        if (showT > 0) { g.fillStyle = '#fffbe8'; rr(g, W / 2 - 260, 110, 520, 120, 20); g.fill(); o.forEach((k, i) => emoji(g, ING[k][0], W / 2 - ((o.length - 1) * 90) / 2 + i * 90, 170, 56)); text(g, `Memoriza... ${Math.ceil(showT)}`, W / 2, 250, 18, '#8a6a5a'); }
        else if (val) text(g, 'Doble expreso · avena · sin azúcar · canela', W / 2, 130, 20, '#8a6a5a');
        else text(g, '¿Qué llevaba el pedido?', W / 2, 130, 20, '#8a6a5a');
        // taza
        g.fillStyle = '#ffffff'; rr(g, W / 2 - 90, H * 0.24, 180, 140, 30); g.fill(); g.strokeStyle = '#2a2030'; g.lineWidth = 3; g.stroke();
        cup.forEach((k, i) => emoji(g, ING[k][0], W / 2 - 60 + (i % 3) * 60, H * 0.24 + 40 + Math.floor(i / 3) * 55, 40));
        for (const b of btns) { g.fillStyle = '#fffbe8'; g.beginPath(); g.arc(b.x, b.y, 46, 0, PI * 2); g.fill(); g.strokeStyle = '#c8a070'; g.lineWidth = 3; g.stroke(); emoji(g, ING[b.k][0], b.x, b.y - 6, 40); text(g, ING[b.k][1], b.x, b.y + 58, 14, '#ffffff'); }
        g.fillStyle = '#4ad07a'; rr(g, serve.x - serve.w / 2, serve.y - serve.h / 2, serve.w, serve.h, 20); g.fill(); text(g, 'Servir ☕', serve.x, serve.y, 26, '#fff');
        g.fillStyle = '#c0c6d0'; rr(g, clear.x - clear.w / 2, clear.y - clear.h / 2, clear.w, clear.h, 18); g.fill(); text(g, 'Vaciar', clear.x, clear.y, 20, '#3a2a3a');
        if (feedback) text(g, feedback.ok ? '¡Perfecto!' : 'No era eso...', W / 2, H * 0.24 - 30, 30, feedback.ok ? '#2a9a5a' : '#c8243a');
        parts.draw(g);
      },
      scoreText() { return `Aciertos: ${results.filter(Boolean).length}`; },
      result() { const ok = results.filter(Boolean).length; const ratio = partial.reduce((a, b) => a + b, 0) / orders.length; return { ratio: ratio * 1.02, score: ok * 300, summary: `Pedidos correctos: <b>${ok}/${orders.length}</b>`, extra: { exact: val && results[0] === true } }; },
    };
  },
};

// ======================= 9. Documentos =======================
const documents = {
  icon: '📂', title: (o) => (o.context === 'ren' ? 'Reto: Ren vs. tú' : 'Turno de oficina'),
  instructions: (o) => `Arrastra cada documento a la <b>bandeja de su color</b>.<br>Los <b style="color:#e8445a">urgentes (rojos)</b> valen el doble. Un error resta puntos.${o.context === 'ren' ? '<br><br>🎯 Objetivo: <b>más de 1.200 puntos</b>.' : ''}`,
  create({ W, H, opts }) {
    const TR = [['#e8445a', 'Urgente', 200], ['#5ab8ff', 'Facturas', 100], ['#7ad07a', 'Contratos', 100], ['#ffd34d', 'Archivo', 100]];
    const trays = [{ x: W * 0.14, y: H * 0.3 }, { x: W * 0.86, y: H * 0.3 }, { x: W * 0.14, y: H * 0.78 }, { x: W * 0.86, y: H * 0.78 }];
    let docs = [], held = null, score = 0, spawnT = 0, okN = 0, badN = 0;
    const parts = new Particles(); const pops = [];
    const bonus = 1 + attr('concentracion') * 0.04;
    return {
      duration: 40,
      pointer(type, x, y) {
        if (type === 'down') { for (let i = docs.length - 1; i >= 0; i--) { const d = docs[i]; if (Math.abs(d.x - x) < 60 && Math.abs(d.y - y) < 75) { held = d; d.ox = x - d.x; d.oy = y - d.y; docs.splice(i, 1); docs.push(d); sfx('click'); break; } } }
        else if (type === 'move' && held) { held.x = x - held.ox; held.y = y - held.oy; }
        else if (type === 'up' && held) {
          const ti = trays.findIndex((t) => Math.hypot(t.x - held.x, t.y - held.y) < 110);
          if (ti >= 0) {
            if (ti === held.c) { const p = Math.round(TR[ti][2] * bonus); score += p; okN++; sfx('good'); parts.burst(held.x, held.y, 10, TR[ti][0], 180, 0.5, 5); pops.push({ x: held.x, y: held.y, s: `+${p}`, t: 0.8 }); }
            else { score = Math.max(0, score - 50); badN++; sfx('error'); pops.push({ x: held.x, y: held.y, s: '−50', t: 0.8 }); }
            docs.splice(docs.indexOf(held), 1);
          }
          held = null;
        }
      },
      update(dt, t) {
        parts.update(dt); pops.forEach((p) => (p.t -= dt));
        spawnT -= dt;
        if (spawnT <= 0 && docs.length < 6) { spawnT = Math.max(0.7, 1.4 - t * 0.015); const c = Math.random() < 0.25 ? 0 : 1 + Math.floor(Math.random() * 3); docs.push({ c, x: W / 2 + rand(-80, 80), y: H / 2 + rand(-60, 60), rot: rand(-0.2, 0.2) }); }
      },
      draw(g) {
        g.fillStyle = '#dfe4ea'; g.fillRect(0, 0, W, H);
        g.fillStyle = '#a88a6a'; rr(g, W * 0.25, H * 0.15, W * 0.5, H * 0.75, 20); g.fill();
        trays.forEach((t, i) => { g.fillStyle = TR[i][0]; rr(g, t.x - 95, t.y - 70, 190, 140, 18); g.fill(); g.fillStyle = 'rgba(255,255,255,0.35)'; rr(g, t.x - 80, t.y - 55, 160, 110, 12); g.fill(); text(g, TR[i][1], t.x, t.y, 22, '#ffffff'); });
        for (const d of docs) {
          g.save(); g.translate(d.x, d.y); g.rotate(d === held ? 0 : d.rot);
          g.shadowColor = 'rgba(0,0,0,0.25)'; g.shadowBlur = d === held ? 20 : 6;
          g.fillStyle = '#ffffff'; g.fillRect(-55, -70, 110, 140); g.shadowBlur = 0;
          g.fillStyle = TR[d.c][0]; g.fillRect(-55, -70, 110, 26);
          g.fillStyle = '#c8ccd4'; for (let i = 0; i < 5; i++) g.fillRect(-42, -30 + i * 18, 84 - (i % 2) * 24, 6);
          if (d.c === 0) text(g, '¡URGENTE!', 0, -57, 14, '#fff');
          g.restore();
        }
        for (const p of pops) if (p.t > 0) text(g, p.s, p.x, p.y - (0.8 - p.t) * 60, 26, p.s.startsWith('+') ? '#2a9a5a' : '#c8243a');
        parts.draw(g);
        if (opts.context === 'ren') { text(g, `Ren: 1.200`, W / 2, 60, 22, '#c0302a'); g.fillStyle = '#ddd'; rr(g, W / 2 - 200, 80, 400, 14, 7); g.fill(); g.fillStyle = score > 1200 ? '#4ad07a' : '#ff9a3a'; rr(g, W / 2 - 200, 80, 400 * Math.min(1, score / 1200), 14, 7); g.fill(); }
      },
      scoreText() { return `Puntos: ${score}`; },
      result() { return { ratio: score / 2300, score, summary: `Puntos: <b>${score}</b> · Correctos: <b>${okN}</b> · Errores: <b>${badN}</b>${opts.context === 'ren' ? `<br>${score > 1200 ? '🏆 ¡Has superado a Ren!' : '😤 Ren sigue por delante...'}` : ''}` }; },
    };
  },
};

export const GAMES = { windows, floor, street, shopping, restock, rhythm, cooking, barista, documents };
