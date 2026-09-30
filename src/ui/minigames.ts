// Two small touch-friendly interactions. Both report a 0–100 score; the story
// treats every result warmly, so the games are about feel rather than challenge.

import { h } from './dom';
import { t } from '../localization/i18n';
import { audio } from '../audio/audio';

export type MinigameId = 'rhythm' | 'sketch';

export function runMinigame(parent: HTMLElement, id: MinigameId, done: (score: number) => void) {
  if (id === 'rhythm') rhythm(parent, done);
  else sketch(parent, done);
}

// ---------------------------------------------------------------- rhythm
// Tap the pad on the beat. 16 beats, a visual ring closes in on each one.

function rhythm(parent: HTMLElement, done: (score: number) => void) {
  const BEATS = 16;
  const interval = 600; // ms (100 bpm)
  const pad = h('div', { class: 'rhythm-pad', role: 'button', 'aria-label': t('mg.rhythm_tap') }, h('div', { class: 'core' }));
  const feedback = h('div', { class: 'rhythm-feedback' });
  const counter = h('div', { class: 'muted' }, `0 / ${BEATS}`);
  const wrap = h('div', { class: 'minigame' }, h('div', { class: 'instr' }, t('mg.rhythm_instr')), pad, feedback, counter);
  parent.appendChild(wrap);

  let started = false;
  let beat = 0;
  let total = 0;
  let hits = 0;
  let nextBeatAt = 0;
  let lastJudged = -1;
  let timer = 0;

  const ring = () => {
    const r = h('div', { class: 'ring' });
    pad.appendChild(r);
    r.animate([{ transform: 'scale(2)', opacity: 0 }, { transform: 'scale(1)', opacity: 0.9 }], { duration: interval, easing: 'linear' }).onfinish = () => r.remove();
  };

  const finish = () => {
    clearInterval(timer);
    const score = Math.round((total / Math.max(1, BEATS)) * 100);
    feedback.textContent = score >= 80 ? t('mg.rhythm_great') : score >= 50 ? t('mg.rhythm_good') : t('mg.rhythm_ok');
    setTimeout(() => {
      wrap.remove();
      done(score);
    }, 1100);
  };

  const tick = () => {
    if (beat >= BEATS) {
      finish();
      return;
    }
    beat++;
    nextBeatAt = performance.now() + interval;
    ring();
    audio.sfx('click');
    counter.textContent = `${beat} / ${BEATS}`;
  };

  const tap = () => {
    if (!started) {
      started = true;
      feedback.textContent = '';
      tick();
      timer = window.setInterval(tick, interval);
      return;
    }
    if (beat === 0 || lastJudged === beat) return;
    const now = performance.now();
    const err = Math.abs(now - nextBeatAt);
    const errPrev = Math.abs(now - (nextBeatAt - interval));
    const e = Math.min(err, errPrev);
    lastJudged = beat;
    pad.classList.add('hit');
    setTimeout(() => pad.classList.remove('hit'), 90);
    if (e < 90) {
      total += 1;
      hits++;
      feedback.textContent = t('mg.rhythm_perfect');
    } else if (e < 180) {
      total += 0.6;
      hits++;
      feedback.textContent = t('mg.rhythm_nice');
    } else {
      total += 0.2;
      feedback.textContent = t('mg.rhythm_early');
    }
  };
  pad.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    tap();
  });
  const onKey = (e: KeyboardEvent) => {
    if (e.code === 'Space' || e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      tap();
    }
  };
  window.addEventListener('keydown', onKey, true);
  const cleanup = () => window.removeEventListener('keydown', onKey, true);
  const origFinish = finish;
  void origFinish;
  wrap.addEventListener('DOMNodeRemoved', cleanup);
  feedback.textContent = t('mg.rhythm_start');
}

// ---------------------------------------------------------------- sketch
// Colour a line drawing by dragging. Score = how much of the drawing got colour.

function sketch(parent: HTMLElement, done: (score: number) => void) {
  const size = Math.min(320, Math.floor(window.innerWidth * 0.86));
  const canvas = h('canvas', { width: String(size * 2), height: String(size * 2), style: { width: `${size}px`, height: `${size}px` } });
  const g = canvas.getContext('2d')!;
  g.scale(2, 2);
  const colors = ['#8fd8cf', '#f6c27a', '#f3a0a8', '#9fb7ff', '#c9b6ff'];
  let color = colors[0];
  const swatches = h(
    'div',
    { class: 'sketch-tools' },
    ...colors.map((c, i) =>
      h('button', {
        class: `swatch${i === 0 ? ' on' : ''}`,
        style: { background: c },
        'aria-label': c,
        onclick: (e: Event) => {
          color = c;
          swatches.querySelectorAll('.swatch').forEach((s) => s.classList.remove('on'));
          (e.currentTarget as HTMLElement).classList.add('on');
        },
      }),
    ),
  );
  const doneBtn = h('button', { class: 'btn primary', onclick: () => finish() }, t('mg.sketch_done'));
  const wrap = h('div', { class: 'minigame' }, h('div', { class: 'instr' }, t('mg.sketch_instr')), canvas, swatches, doneBtn);
  parent.appendChild(wrap);

  // Paint layer under the line art
  const paint = document.createElement('canvas');
  paint.width = paint.height = size * 2;
  const pg = paint.getContext('2d')!;
  pg.scale(2, 2);
  pg.fillStyle = '#f7f4ec';
  pg.fillRect(0, 0, size, size);

  // The line drawing: the Studio 25 lounge — a sofa, a window with rain, a lamp.
  const lines = document.createElement('canvas');
  lines.width = lines.height = size * 2;
  const lg = lines.getContext('2d')!;
  lg.scale(2, 2);
  lg.strokeStyle = '#2f3438';
  lg.lineWidth = 2.2;
  lg.lineCap = 'round';
  const s = size / 320;
  const P = (x: number, y: number) => [x * s, y * s] as [number, number];
  const path = (pts: [number, number][], close = false) => {
    lg.beginPath();
    pts.forEach(([x, y], i) => (i ? lg.lineTo(x, y) : lg.moveTo(x, y)));
    if (close) lg.closePath();
    lg.stroke();
  };
  path([P(20, 60), P(150, 60), P(150, 170), P(20, 170)], true); // window
  path([P(85, 60), P(85, 170)]);
  path([P(20, 115), P(150, 115)]);
  for (let i = 0; i < 14; i++) path([P(28 + i * 9, 70 + (i % 3) * 20), P(24 + i * 9, 84 + (i % 3) * 20)]); // rain
  path([P(30, 270), P(30, 215), P(50, 200), P(230, 200), P(250, 215), P(250, 270)], true); // sofa
  path([P(50, 200), P(50, 240), P(230, 240), P(230, 200)]);
  path([P(30, 240), P(250, 240)]);
  path([P(140, 200), P(140, 240)]);
  path([P(275, 270), P(275, 150)]); // lamp
  path([P(250, 150), P(300, 150), P(290, 110), P(260, 110)], true);
  path([P(190, 60), P(300, 60), P(300, 95), P(190, 95)], true); // shelf
  for (let i = 0; i < 6; i++) path([P(196 + i * 17, 95), P(196 + i * 17, 66 + (i % 2) * 6), P(208 + i * 17, 66 + (i % 2) * 6), P(208 + i * 17, 95)]);
  path([P(0, 270), P(320, 270)]); // floor

  const draw = () => {
    g.clearRect(0, 0, size, size);
    g.drawImage(paint, 0, 0, size, size);
    g.drawImage(lines, 0, 0, size, size);
  };
  draw();

  let down = false;
  const pos = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * size, ((e.clientY - r.top) / r.height) * size];
  };
  let last: number[] | null = null;
  canvas.addEventListener('pointerdown', (e) => {
    down = true;
    last = pos(e);
    canvas.setPointerCapture(e.pointerId);
    stroke(last, last);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!down) return;
    const p = pos(e);
    stroke(last ?? p, p);
    last = p;
  });
  const up = () => {
    down = false;
    last = null;
  };
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  let strokes = 0;
  const stroke = (a: number[], b: number[]) => {
    pg.strokeStyle = color;
    pg.globalAlpha = 0.55;
    pg.lineWidth = 16;
    pg.lineCap = 'round';
    pg.beginPath();
    pg.moveTo(a[0], a[1]);
    pg.lineTo(b[0], b[1]);
    pg.stroke();
    pg.globalAlpha = 1;
    strokes++;
    if (strokes % 6 === 0) audio.sfx('pencil');
    draw();
  };

  const finish = () => {
    // coverage: sample the paint layer for non-paper pixels
    const data = pg.getImageData(0, 0, paint.width, paint.height).data;
    let painted = 0;
    let total = 0;
    for (let i = 0; i < data.length; i += 16 * 4) {
      total++;
      if (Math.abs(data[i] - 247) + Math.abs(data[i + 1] - 244) + Math.abs(data[i + 2] - 236) > 30) painted++;
    }
    const cover = painted / total; // ~0.6 = fully coloured in practice
    const score = Math.min(100, Math.round((cover / 0.55) * 100));
    wrap.remove();
    done(score);
  };
}
