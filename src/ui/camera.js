// Canvas metrics and camera (prototype drawing head 1575–1595 plus
// focusLine 1350). Kept DOM-free apart from reading the canvas box, so the
// renderer (draw/) and the input/loop modules can share it.

import { WH } from '../data/units.js';
import { G } from '../sim/state.js';
import { posX } from '../sim/geometry.js';

export const cam = { x: 0, tx: 0 };     // camera position and eased target
let CW = 360, CH = 300, DPR = 1, K = 1;

export const metrics = () => ({ CW, CH, DPR, K });
export const vw = () => CW / K;

export function resize() {
  const cv = document.getElementById('field');
  if (!cv) return;
  const r = cv.getBoundingClientRect();
  if (!r.width) return;
  DPR = Math.min(window.devicePixelRatio || 1, 2); CW = r.width; CH = r.height;
  cv.width = Math.round(CW * DPR); cv.height = Math.round(CH * DPR); K = CH / WH;
  cam.x = Math.max(0, Math.min(G.WW - vw(), cam.x));
  cam.tx = Math.max(0, Math.min(G.WW - vw(), cam.tx));
}

export function focusLine(L) {
  cam.tx = Math.max(0, Math.min(G.WW - vw(), posX(0, L, 150, false) - vw() * 0.42));
}

export function initCamera() {
  window.addEventListener('resize', resize);
}
