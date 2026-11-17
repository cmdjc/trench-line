// Frame loop (prototype 2258–2271). Pause is computed ONCE per frame from
// overlay visibility (an offer opened mid-frame pauses the NEXT frame); dt is
// clamped to 0.1s, simulated in ≤0.04s substeps scaled by speed.

import { tick } from '../sim/tick.js';
import { G } from '../sim/state.js';
import { refresh } from './hud.js';
import { draw } from './draw/index.js';
import { cam } from './camera.js';
import { dragging } from './input.js';
import { $ } from './dom.js';

let last = 0, uiT = 0;

const overlayOpen = id => { const el = $(id); return el ? !el.hidden : false; };

export function startLoop(now) {
  last = now ?? performance.now();
  requestAnimationFrame(frame);
}

export function frame(now) {
  let dt = (now - last) / 1000; last = now;
  if (dt > 0.1) dt = 0.1; if (dt < 0) dt = 0;
  const paused = G.userPaused || overlayOpen('cardOv') || overlayOpen('startOv') || overlayOpen('endOv');
  if (!paused) { let left = dt * G.speed; while (left > 0) { const d = Math.min(0.04, left); tick(d); left -= d; } }
  if (G.shake > 0) G.shake = Math.max(0, G.shake - dt * 16);
  if (!dragging()) cam.x += (cam.tx - cam.x) * Math.min(1, dt * 7);
  draw();
  uiT += dt; if (uiT >= 0.25) { uiT = 0; refresh(); }
  requestAnimationFrame(frame);
}

export function initMotion() {
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    G.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
}
