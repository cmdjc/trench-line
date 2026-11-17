// Shared 2D context + primitive helpers for all draw modules.
// `ctx` is a live binding: call setCtx() (draw/index.js binds the canvas).
export let ctx = null;
export const setCtx = c => { ctx = c; };

export const BAG = '#a8966c';
export const BAGD = '#77664a';
export const TR = '#241a11';

export function circle(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
export function oval(x, y, rx, ry) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); }
export function line(x1, y1, x2, y2, w, col) {
  ctx.strokeStyle = col; ctx.lineWidth = w;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
}
export function bagArc(x, y, r, a0, a1) {
  ctx.lineCap = 'butt'; ctx.beginPath(); ctx.arc(x, y, r, a0, a1);
  ctx.strokeStyle = BAGD; ctx.lineWidth = 7; ctx.stroke();
  ctx.setLineDash([6, 1.8]); ctx.strokeStyle = BAG; ctx.lineWidth = 6; ctx.stroke(); ctx.setLineDash([]);
}
export function at(x, y, flip, fn) {
  ctx.save(); ctx.translate(x, y); if (flip) ctx.scale(-1, 1); fn(); ctx.restore();
}
