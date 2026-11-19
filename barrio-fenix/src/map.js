// Minimapa (HUD) y mapa completo del barrio, dibujados en 2D a partir de los datos del mundo.
import { G } from './game.js';
import { RECTS, BUILDINGS, zoneAt } from './world.js';
import { BIOMES } from './data/items.js';
import { CHARACTERS } from './data/characters.js';
import { el } from './ui.js';
import { sfx } from './audio.js';
import { isNight } from './time.js';

const ZONE_COL = { casa: '#f3dcc0', super: '#cdeccd', trabajo: '#d4e0f4', restaurante: '#f6d2c0' };
const ZONE_ICON = { casa: '🏠', super: '🛒', trabajo: '💼', restaurante: '🔥' };
const NPC_COL = { lucia: '#4d8a5a', aiko: '#3aa05a', valeria: '#3a3a5a', marina: '#c8443a', nora: '#6a4aa8', ren: '#8a1a1a', kaito: '#c8a030', goro: '#5a7a4a', neko: '#e8742a' };

// Dibuja el barrio. view = { cx, cz, scale (px por metro), w, h, full }
function draw(ctx, view) {
  const { cx, cz, scale, w, h, full } = view;
  const X = (x) => w / 2 + (x - cx) * scale, Y = (z) => h / 2 + (z - cz) * scale;
  const rect = (r, fill, rad = 4) => { ctx.fillStyle = fill; ctx.beginPath(); ctx.roundRect(X(r[0]), Y(r[1]), (r[2] - r[0]) * scale, (r[3] - r[1]) * scale, rad); ctx.fill(); };
  ctx.fillStyle = isNight() ? '#2a3a3a' : '#8cc97a'; ctx.fillRect(0, 0, w, h);
  const st = G.state;
  // zonas y conectores
  for (const z of ['casa', 'super', 'trabajo', 'restaurante']) rect(RECTS[z], ZONE_COL[z], 6);
  rect(RECTS.plaza, '#efe2c8', 8);
  for (const k of ['casaConn', 'superConn', 'trabajoConn', 'restauranteConn']) rect(RECTS[k], '#e6d6b8', 0);
  // caminos
  ctx.fillStyle = 'rgba(200,180,150,0.7)';
  for (const r of [[-46, -4, -18, 4], [-4, -46, 4, -18], [18, -4, 46, 4], [-4, 18, 4, 46]]) rect(r, 'rgba(210,192,160,0.8)', 0);
  // fuente
  ctx.fillStyle = '#7fd0f0'; ctx.beginPath(); ctx.arc(X(0), Y(0), 3.8 * scale, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#f0b23a'; ctx.beginPath(); ctx.arc(X(0), Y(0), 1.2 * scale, 0, Math.PI * 2); ctx.fill();
  // edificios
  for (const [id, b] of Object.entries(BUILDINGS)) {
    rect(b.rect, b.roof, 3);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1.5; ctx.strokeRect(X(b.rect[0]), Y(b.rect[1]), (b.rect[2] - b.rect[0]) * scale, (b.rect[3] - b.rect[1]) * scale);
    ctx.fillStyle = '#ffe9a0'; ctx.fillRect(X(b.doorX) - 1.2 * scale, Y(b.rect[3]) - 0.4 * scale, 2.4 * scale, 0.8 * scale);
    if (full) {
      ctx.font = `bold ${Math.max(10, scale * 2.2)}px ui-rounded, system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff'; ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 3;
      const label = id === 'home' ? 'Tu casa' : b.name;
      const lx = X((b.rect[0] + b.rect[2]) / 2), ly = Y((b.rect[1] + b.rect[3]) / 2);
      ctx.strokeText(label, lx, ly); ctx.fillText(label, lx, ly);
    }
  }
  // zonas bloqueadas
  for (const z of ['super', 'trabajo', 'restaurante']) {
    if (st.unlocked[z]) continue;
    rect(RECTS[z], 'rgba(30,20,40,0.62)', 6);
    const r = RECTS[z];
    ctx.font = `${Math.max(14, scale * (full ? 4 : 5))}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('🔒', X((r[0] + r[2]) / 2), Y((r[1] + r[3]) / 2) - (full ? scale * 3 : 0));
    if (full) { ctx.font = `bold ${Math.max(11, scale * 2)}px ui-rounded, system-ui, sans-serif`; ctx.fillStyle = '#fff'; ctx.fillText(`${BIOMES[z].name} · ${BIOMES[z].cost} 🔥`, X((r[0] + r[2]) / 2), Y((r[1] + r[3]) / 2) + scale * 2); }
  }
  if (full) {
    ctx.font = `${Math.max(14, scale * 3)}px sans-serif`; ctx.textAlign = 'center';
    for (const z of ['casa', 'super', 'trabajo', 'restaurante']) { const r = RECTS[z]; if (st.unlocked[z]) ctx.fillText(ZONE_ICON[z], X(r[0] + 3), Y(r[1] + 3)); }
  }
  // plumas (misión secreta)
  if (st.quests.X1?.status === 'active') G.world.feathers.forEach((f, i) => {
    if (st.feathers[i] || !st.unlocked[zoneAt(f.position.x, f.position.z)]) return;
    ctx.font = `${full ? 16 : 12}px sans-serif`; ctx.fillText('🪶', X(f.position.x), Y(f.position.z));
  });
  // NPCs
  for (const n of G.npcs.list) {
    if (!n.visible || st.rel[n.id].state === 'desconocido' && !full) continue;
    if (!st.unlocked[zoneAt(n.pos.x, n.pos.z)]) continue;
    const x = X(n.pos.x), y = Y(n.pos.z), r = full ? 9 : 5;
    ctx.fillStyle = NPC_COL[n.id]; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    if (full) { ctx.fillStyle = '#fff'; ctx.font = 'bold 10px ui-rounded, system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(st.rel[n.id].state === 'desconocido' ? '?' : CHARACTERS[n.id].short[0], x, y + 0.5); }
  }
  // objetivo de misión
  const t = G.quests.tracked();
  const mp = t ? G.quests.markerPos(t.marker) : null;
  if (mp) {
    const x = X(mp.x), y = Y(mp.z), pulse = 1 + Math.sin(performance.now() / 250) * 0.15;
    ctx.fillStyle = '#ffd34d'; ctx.strokeStyle = '#c87a10'; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = (i % 2 ? 4 : 9) * pulse * (full ? 1.3 : 1); ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  // jugador
  const p = G.player.pos, hd = G.player.heading;
  ctx.save(); ctx.translate(X(p.x), Y(p.z)); ctx.rotate(-hd + Math.PI);
  ctx.fillStyle = '#ff5a3a'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5;
  const s = full ? 1.4 : 1;
  ctx.beginPath(); ctx.moveTo(0, -9 * s); ctx.lineTo(7 * s, 7 * s); ctx.lineTo(0, 3 * s); ctx.lineTo(-7 * s, 7 * s); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
}

export class MiniMap {
  constructor() {
    this.canvas = document.getElementById('minimap');
    this.ctx = this.canvas.getContext('2d');
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    const size = 170;
    this.canvas.width = this.canvas.height = size * this.dpr;
    this.canvas.style.width = this.canvas.style.height = size + 'px';
    this.size = size; this.t = 0;
    this.canvas.addEventListener('click', () => { if (!G.busy) { sfx('click'); openFullMap(); } });
  }
  update(dt) {
    this.t += dt; if (this.t < 0.15) return; this.t = 0;
    const c = this.ctx, S = this.size;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.save(); c.beginPath(); c.arc(S / 2, S / 2, S / 2 - 2, 0, Math.PI * 2); c.clip();
    draw(c, { cx: G.player.pos.x, cz: G.player.pos.z, scale: 2.6, w: S, h: S, full: false });
    c.restore();
    c.strokeStyle = '#fff'; c.lineWidth = 4; c.beginPath(); c.arc(S / 2, S / 2, S / 2 - 2, 0, Math.PI * 2); c.stroke();
    c.fillStyle = '#3a2a3a'; c.font = 'bold 13px ui-rounded, system-ui'; c.textAlign = 'center'; c.fillText('N', S / 2, 14);
  }
}

export function openFullMap() {
  let raf = 0;
  return G.ui.panel('Mapa de Barrio Fénix', (body) => {
    const wrap = el('div', 'mapwrap');
    const cv = el('canvas', 'fullmap');
    wrap.appendChild(cv); body.appendChild(wrap);
    const legend = el('div', 'maplegend');
    legend.innerHTML = '<span><b style="color:#ff5a3a">▲</b> Tú</span><span>⭐ Objetivo de misión</span><span>🔒 Bioma bloqueado</span>' +
      G.npcs.list.filter((n) => G.state.rel[n.id].state !== 'desconocido').map((n) => `<span><i style="background:${NPC_COL[n.id]}"></i>${CHARACTERS[n.id].short}${n.visible ? '' : ' (no está)'}</span>`).join('');
    body.appendChild(legend);
    const render = () => {
      if (!cv.isConnected) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = wrap.clientWidth, h = Math.min(window.innerHeight * 0.64, w * 0.75);
      if (cv.width !== Math.round(w * dpr)) { cv.width = w * dpr; cv.height = h * dpr; cv.style.width = w + 'px'; cv.style.height = h + 'px'; }
      const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(ctx, { cx: 0, cz: 0, scale: Math.min(w, h) / 93, w, h, full: true });
      raf = requestAnimationFrame(render);
    };
    requestAnimationFrame(render);
  }, { wide: true, onClose: () => cancelAnimationFrame(raf) });
}
