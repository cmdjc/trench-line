// Battlefield pointer input (prototype 2228–2255): drag to pan, tap to
// select the nearest line, double-tap an owned trench to fortify it, taps
// while aiming place the aim target, arrow keys scroll.

import { bus } from '../core/events.js';
import { WH } from '../data/units.js';
import { G } from '../sim/state.js';
import { posX } from '../sim/geometry.js';
import { clampAim } from '../sim/gun.js';
import * as commands from '../sim/commands.js';
import { cam, clampCam, metrics } from './camera.js';
import { $ } from './dom.js';

let drag = null, lastTap = { L: -1, t: 0 };

export const dragging = () => !!drag;

export function initInput() {
  const cv = $('field');
  cv.addEventListener('pointerdown', ev => { drag = { x: ev.clientX, cam: cam.x, moved: false }; try { cv.setPointerCapture(ev.pointerId); } catch { } });
  cv.addEventListener('pointermove', ev => {
    if (!drag) return; const dx = ev.clientX - drag.x;
    if (Math.abs(dx) > 6) drag.moved = true;
    if (drag.moved) cam.x = cam.tx = clampCam(drag.cam - dx / metrics().K);
  });
  function endDrag(ev) {
    if (!drag) return;
    if (!drag.moved && ev.type === 'pointerup') {
      const r = cv.getBoundingClientRect(), wx = cam.x + (ev.clientX - r.left) / metrics().K;
      if (G.aim) { { const ax = Math.max(0, Math.min(G.WW, wx)); G.aim.x = G.aim.kind === 'gun' ? clampAim(0, ax) : ax; } G.aim.y = Math.max(0, Math.min(WH, (ev.clientY - r.top) / metrics().K)); bus.emit('hud'); drag = null; return; }
      let best = -1, bd = 70;
      for (let L = 0; L <= G.HQI; L++) { const d = Math.abs(posX(0, L, 150, false) - wx); if (d < bd) { bd = d; best = L; } }
      if (best >= 0) {
        const now = performance.now();
        if (lastTap.L === best && now - lastTap.t < 420) { commands.fortifyAt(best); lastTap.t = 0; }
        else { commands.select(best); lastTap = { L: best, t: now }; }
      }
    }
    drag = null;
  }
  cv.addEventListener('pointerup', endDrag);
  cv.addEventListener('pointercancel', endDrag);
  cv.addEventListener('keydown', ev => {
    if (ev.key === 'ArrowRight') { cam.tx = clampCam(cam.tx + 120); ev.preventDefault(); }
    else if (ev.key === 'ArrowLeft') { cam.tx = clampCam(cam.tx - 120); ev.preventDefault(); }
  });
}
