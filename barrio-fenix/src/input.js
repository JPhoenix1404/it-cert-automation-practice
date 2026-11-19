// Entrada táctil (joystick flotante) + teclado para pruebas en escritorio.
import { G } from './game.js';

export class Input {
  constructor(root) {
    this.move = { x: 0, y: 0 };
    this.keys = new Set();
    this.actionPressed = false;
    this.joy = { id: null, ox: 0, oy: 0, x: 0, y: 0 };
    this.pinch = null;
    this.zoomDelta = 0;
    this.base = document.getElementById('joy-base');
    this.knob = document.getElementById('joy-knob');
    const area = document.getElementById('touch-area');
    area.addEventListener('pointerdown', (e) => this.down(e));
    window.addEventListener('pointermove', (e) => this.moveP(e));
    window.addEventListener('pointerup', (e) => this.up(e));
    window.addEventListener('pointercancel', (e) => this.up(e));
    area.addEventListener('touchstart', (e) => { if (e.touches.length === 2) this.pinch = this.dist(e.touches); }, { passive: true });
    area.addEventListener('touchmove', (e) => { if (e.touches.length === 2 && this.pinch) { const d = this.dist(e.touches); this.zoomDelta += (this.pinch - d) * 0.03; this.pinch = d; } }, { passive: true });
    area.addEventListener('touchend', () => { this.pinch = null; }, { passive: true });
    area.addEventListener('wheel', (e) => { this.zoomDelta += e.deltaY * 0.01; }, { passive: true });
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.keys.add(e.code);
      if ((e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter') && !G.busy) this.actionPressed = true;
      if (e.code === 'Escape') document.dispatchEvent(new CustomEvent('ui:escape'));
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => { this.keys.clear(); this.resetJoy(); });
  }
  dist(t) { return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY); }
  down(e) {
    if (G.busy || this.joy.id !== null) return;
    if (e.clientX > window.innerWidth * 0.6) return; // la mitad derecha queda para botones
    this.joy.id = e.pointerId; this.joy.ox = e.clientX; this.joy.oy = e.clientY; this.joy.x = 0; this.joy.y = 0;
    this.base.style.display = 'block';
    this.base.style.left = `${e.clientX}px`; this.base.style.top = `${e.clientY}px`;
    this.knob.style.transform = 'translate(-50%,-50%)';
  }
  moveP(e) {
    if (e.pointerId !== this.joy.id) return;
    const R = 56;
    let dx = e.clientX - this.joy.ox, dy = e.clientY - this.joy.oy;
    const l = Math.hypot(dx, dy);
    if (l > R) { dx = (dx / l) * R; dy = (dy / l) * R; }
    this.joy.x = dx / R; this.joy.y = dy / R;
    this.knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  }
  up(e) { if (e.pointerId === this.joy.id) this.resetJoy(); }
  resetJoy() { this.joy.id = null; this.joy.x = this.joy.y = 0; if (this.base) this.base.style.display = 'none'; }
  get vector() {
    if (G.busy) return { x: 0, y: 0 };
    let x = this.joy.x, y = this.joy.y;
    const k = this.keys;
    if (k.has('KeyW') || k.has('ArrowUp')) y -= 1;
    if (k.has('KeyS') || k.has('ArrowDown')) y += 1;
    if (k.has('KeyA') || k.has('ArrowLeft')) x -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) x += 1;
    const l = Math.hypot(x, y);
    if (l > 1) { x /= l; y /= l; }
    if (l < 0.12) return { x: 0, y: 0 };
    return { x, y };
  }
  consumeAction() { const a = this.actionPressed; this.actionPressed = false; return a; }
  consumeZoom() { const z = this.zoomDelta; this.zoomDelta = 0; return z; }
}
