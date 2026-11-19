// Interfaz HTML: HUD, diálogos, elecciones, paneles, avisos y fundidos.
import { G, bus, fmt, sleep } from './game.js';
import { CHARACTERS, TONES, tpl } from './data/characters.js';
import { clockText, phase, PHASE_LABEL, weekdayText } from './time.js';
import { sfx } from './audio.js';

const $ = (id) => document.getElementById(id);
export const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export class UI {
  constructor() {
    this.portraits = {};
    this.dialog = $('dialog'); this.dlgName = $('dlg-name'); this.dlgText = $('dlg-text'); this.dlgPortrait = $('dlg-portrait'); this.dlgChoices = $('dlg-choices'); this.dlgNext = $('dlg-next');
    this.panelEl = $('panel'); this.panelBody = $('panel-body'); this.panelTitle = $('panel-title');
    this.actionBtn = $('action-btn'); this.actionLabel = $('action-label');
    this.toasts = $('toasts'); this.fadeEl = $('fade'); this.fadeText = $('fade-text');
    this.questTracker = $('quest-tracker');
    this.onSpeak = null;
    $('panel-close').addEventListener('click', () => { sfx('click'); this.closePanel(); });
    document.addEventListener('ui:escape', () => { if (this.panelOpen) this.closePanel(); });
    this.actionBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); if (!G.busy) { G.input.actionPressed = true; } });
    $('menu-btn').addEventListener('click', () => { if (!G.busy) { sfx('click'); bus.emit('ui:menu'); } });
    bus.on('wallet', (e) => { this.updateHud(); if (e.d) this.floatText(`${e.d > 0 ? '+' : ''}${e.d} D`, e.d > 0 ? 'gold' : 'red'); if (e.f) this.floatText(`${e.f > 0 ? '+' : ''}${e.f} 🔥`, 'fire'); });
    bus.on('energy', () => this.updateHud());
    bus.on('attrUp', (e) => this.toast(`¡${{ carisma: 'Carisma', destreza: 'Destreza', concentracion: 'Concentración', cocina: 'Cocina' }[e.attr]} sube a ${e.value}!`, '⬆️', 'good'));
  }

  // ---------- HUD ----------
  updateHud() {
    const s = G.state; if (!s) return;
    $('hud-clock').textContent = clockText();
    $('hud-phase').textContent = `${weekdayText()} · ${PHASE_LABEL[phase()]}`;
    $('hud-phase-icon').textContent = { amanecer: '🌅', dia: '☀️', atardecer: '🌇', noche: '🌙' }[phase()];
    $('hud-deuros').textContent = fmt(s.deuros);
    $('hud-fenix').textContent = fmt(s.fenixios);
    const e = Math.round(s.energy);
    $('hud-energy-fill').style.width = `${e}%`;
    $('hud-energy-fill').style.background = e < 25 ? 'linear-gradient(90deg,#ff5a5a,#ff9a6a)' : 'linear-gradient(90deg,#4ad07a,#a8f07a)';
    $('hud-energy-val').textContent = e;
  }
  setAction(label, icon = '✋') {
    if (!label) { this.actionBtn.classList.add('hidden'); return; }
    this.actionBtn.classList.remove('hidden');
    this.actionLabel.textContent = label;
    $('action-icon').textContent = icon;
  }
  setTracker(html) { this.questTracker.innerHTML = html || ''; this.questTracker.style.display = html ? 'block' : 'none'; }

  // ---------- Avisos ----------
  toast(text, icon = '✨', kind = '') {
    const t = el('div', `toast ${kind}`, `<span class="ti">${icon}</span><span>${esc(text)}</span>`);
    this.toasts.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, 2800);
    while (this.toasts.children.length > 4) this.toasts.firstChild.remove();
  }
  floatText(text, kind) {
    const t = el('div', `float ${kind}`, esc(text));
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 1300);
  }
  banner(title, sub = '', icon = '🔥') {
    const b = el('div', 'banner', `<div class="bi">${icon}</div><div class="bt">${esc(title)}</div><div class="bs">${esc(sub)}</div>`);
    document.body.appendChild(b);
    sfx('fanfare');
    return new Promise((r) => setTimeout(() => { b.classList.add('out'); setTimeout(() => { b.remove(); r(); }, 500); }, 2300));
  }

  // ---------- Diálogo ----------
  speakerInfo(who) {
    if (who === 'you') return { name: G.state.player.name, portrait: this.portraits.player, cls: 'you' };
    if (who === 'narr') return { name: '', portrait: null, cls: 'narr' };
    const c = CHARACTERS[who];
    return { name: c ? c.short : who, portrait: this.portraits[who], cls: who };
  }
  showSpeaker(who) {
    const info = this.speakerInfo(who);
    this.dialog.className = `show ${info.cls}`;
    this.dlgName.textContent = info.name;
    this.dlgName.style.display = info.name ? 'block' : 'none';
    if (info.portrait) { this.dlgPortrait.style.backgroundImage = `url(${info.portrait})`; this.dlgPortrait.style.display = 'block'; }
    else this.dlgPortrait.style.display = 'none';
  }
  async type(text) {
    this.dlgText.textContent = '';
    this.dlgNext.style.visibility = 'hidden';
    let skip = false;
    const onTap = () => { skip = true; };
    this.dialog.addEventListener('pointerdown', onTap, { once: true });
    for (let i = 0; i < text.length; i++) {
      if (skip) { this.dlgText.textContent = text; break; }
      this.dlgText.textContent = text.slice(0, i + 1);
      if (i % 3 === 0) sfx('blip');
      await sleep(text[i] === '.' || text[i] === '?' || text[i] === '!' ? 60 : 18);
    }
    this.dialog.removeEventListener('pointerdown', onTap);
    this.dlgNext.style.visibility = 'visible';
  }
  waitTap() {
    return new Promise((r) => {
      const done = (e) => { e?.preventDefault?.(); this.dialog.removeEventListener('pointerup', done); document.removeEventListener('keydown', key); r(); };
      const key = (e) => { if (['Space', 'Enter', 'KeyE'].includes(e.code)) done(e); };
      setTimeout(() => { this.dialog.addEventListener('pointerup', done); document.addEventListener('keydown', key); }, 120);
    });
  }
  // lines: [[who, text, expr?], ...]
  async say(lines) {
    const wasBusy = G.busy; G.busy = true;
    for (const [who, raw, expr] of lines) {
      const text = tpl(raw, G.state);
      this.showSpeaker(who);
      this.dlgChoices.innerHTML = '';
      this.onSpeak?.(who, expr || 'talk');
      await this.type(text);
      await this.waitTap();
      sfx('click');
    }
    this.onSpeak?.(null);
    this.dialog.className = '';
    G.busy = wasBusy;
  }
  // options: [{label, tone, sub, disabled}]
  async choose(who, prompt, options, { cancel = null } = {}) {
    const wasBusy = G.busy; G.busy = true;
    this.showSpeaker(who || 'narr');
    this.onSpeak?.(who, 'neutral');
    if (prompt) await this.type(tpl(prompt, G.state)); else this.dlgText.textContent = '';
    this.dlgNext.style.visibility = 'hidden';
    const idx = await new Promise((resolve) => {
      this.dlgChoices.innerHTML = '';
      options.forEach((o, i) => {
        const t = o.tone ? TONES[o.tone] : null;
        const b = el('button', `choice${o.disabled ? ' disabled' : ''}`, `${t ? `<span class="tone" style="background:${t.color}">${t.icon} ${t.label}</span>` : ''}<span class="ct">${esc(tpl(o.label, G.state))}</span>${o.sub ? `<span class="cs">${esc(o.sub)}</span>` : ''}`);
        b.addEventListener('click', (e) => { e.stopPropagation(); if (o.disabled) { sfx('error'); if (o.why) this.toast(o.why, '🔒'); return; } sfx('select'); resolve(i); });
        this.dlgChoices.appendChild(b);
      });
      if (cancel) {
        const b = el('button', 'choice cancel', `<span class="ct">${esc(cancel)}</span>`);
        b.addEventListener('click', (e) => { e.stopPropagation(); sfx('click'); resolve(-1); });
        this.dlgChoices.appendChild(b);
      }
    });
    this.dlgChoices.innerHTML = '';
    this.onSpeak?.(null);
    this.dialog.className = '';
    G.busy = wasBusy;
    return idx;
  }
  async confirm(text, yes = 'Sí', no = 'No') { return (await this.choose('narr', text, [{ label: yes }], { cancel: no })) === 0; }

  // ---------- Panel modal ----------
  panel(title, render, { onClose, wide = false } = {}) {
    this.panelTitle.textContent = title;
    this.panelBody.innerHTML = '';
    this.panelEl.classList.toggle('wide', wide);
    this.panelEl.classList.add('show');
    this.panelOpen = true; this._wasBusy = G.busy; G.busy = true;
    this._onClose = onClose;
    const rerender = () => { const top = this.panelBody.scrollTop; this.panelBody.innerHTML = ''; render(this.panelBody, rerender); this.panelBody.scrollTop = top; };
    render(this.panelBody, rerender);
    return new Promise((r) => { this._panelResolve = r; });
  }
  closePanel(result) {
    if (!this.panelOpen) return;
    this.panelEl.classList.remove('show');
    this.panelOpen = false; G.busy = this._wasBusy || false;
    const cb = this._onClose; this._onClose = null; cb?.();
    const r = this._panelResolve; this._panelResolve = null; r?.(result);
  }

  // ---------- Fundidos ----------
  async fade(text = '', hold = 1200) {
    const wasBusy = G.busy; G.busy = true;
    this.fadeText.textContent = text;
    this.fadeEl.classList.add('show');
    await sleep(700 + hold);
    this.fadeEl.classList.remove('show');
    await sleep(600);
    G.busy = wasBusy;
  }
}
