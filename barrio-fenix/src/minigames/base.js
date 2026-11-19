// Marco común de minijuegos: tarjeta de instrucciones, temporizador, nota final.
import { G, gradeFrom, sleep } from '../game.js';
import { sfx, duckMusic } from '../audio.js';
import { GAMES } from './games.js';

const $ = (id) => document.getElementById(id);

export async function runMinigame(type, opts = {}) {
  const def = GAMES[type];
  if (!def) throw new Error('Minijuego desconocido: ' + type);
  const wasBusy = G.busy; G.busy = true;
  const root = $('mg'), canvas = $('mg-canvas'), intro = $('mg-intro'), res = $('mg-result');
  const hudTitle = $('mg-title'), hudScore = $('mg-score'), timerFill = $('mg-timer-fill');
  root.classList.add('show');
  hudTitle.textContent = def.title(opts);
  hudScore.textContent = '';
  timerFill.style.width = '100%';
  res.classList.remove('show');
  // tamaño
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = window.innerWidth, H = window.innerHeight;
  canvas.width = W * dpr; canvas.height = H * dpr; canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  const g = canvas.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const game = def.create({ W, H, g, opts, state: G.state });
  // instrucciones
  $('mg-intro-title').textContent = def.title(opts);
  $('mg-intro-text').innerHTML = def.instructions(opts);
  $('mg-intro-icon').textContent = def.icon;
  intro.classList.add('show');
  game.draw(g, 0);
  await new Promise((r) => { const b = $('mg-start'); const h = () => { b.removeEventListener('click', h); sfx('select'); r(); }; b.addEventListener('click', h); });
  intro.classList.remove('show');
  duckMusic(def.duck !== false);
  // cuenta atrás
  for (const n of ['3', '2', '1', '¡Ya!']) { $('mg-count').textContent = n; $('mg-count').classList.add('show'); sfx('tick'); await sleep(450); }
  $('mg-count').classList.remove('show');
  // bucle
  const duration = game.duration;
  let t = 0, last = performance.now(), ended = false;
  const toLocal = (e) => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  const pd = (e) => { e.preventDefault(); canvas.setPointerCapture?.(e.pointerId); game.pointer?.('down', ...toLocal(e), e.pointerId); };
  const pm = (e) => { e.preventDefault(); game.pointer?.('move', ...toLocal(e), e.pointerId); };
  const pu = (e) => { e.preventDefault(); game.pointer?.('up', ...toLocal(e), e.pointerId); };
  canvas.addEventListener('pointerdown', pd); canvas.addEventListener('pointermove', pm); canvas.addEventListener('pointerup', pu); canvas.addEventListener('pointercancel', pu);
  await new Promise((resolve) => {
    const frame = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (!ended) {
        t += dt;
        game.update(dt, t);
        game.draw(g, t);
        const left = Math.max(0, duration - t);
        timerFill.style.width = `${(left / duration) * 100}%`;
        timerFill.style.background = left < 5 ? '#ff5a5a' : '';
        hudScore.textContent = game.scoreText ? game.scoreText() : '';
        if (t >= duration || game.done) { ended = true; resolve(); return; }
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
  canvas.removeEventListener('pointerdown', pd); canvas.removeEventListener('pointermove', pm); canvas.removeEventListener('pointerup', pu); canvas.removeEventListener('pointercancel', pu);
  // resultado
  const out = game.result(t);
  const ratio = Math.max(0, Math.min(1, out.ratio));
  const grade = gradeFrom(ratio);
  const result = { type, grade, ratio, score: Math.round(out.score ?? ratio * 1000), context: opts.context, ...out.extra };
  sfx(['S', 'A', 'B'].includes(grade) ? 'fanfare' : 'bad');
  $('mg-grade').textContent = grade;
  $('mg-grade').className = `grade g${grade}`;
  $('mg-result-text').innerHTML = out.summary || '';
  $('mg-result-sub').innerHTML = { S: '¡Perfecto!', A: '¡Excelente!', B: 'Bien hecho', C: 'Aceptable', D: 'Hay que practicar...' }[grade];
  res.classList.add('show');
  await new Promise((r) => { const b = $('mg-continue'); const h = () => { b.removeEventListener('click', h); sfx('click'); r(); }; setTimeout(() => b.addEventListener('click', h), 400); });
  res.classList.remove('show');
  root.classList.remove('show');
  duckMusic(false);
  G.busy = wasBusy;
  G.state.stats.minigames++;
  return result;
}
