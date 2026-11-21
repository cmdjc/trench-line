// Railways: laid track with sleepers, broken segments, and transport trains. No rng; pure drawing.
import { ctx, line, circle } from './helpers.js';
import { G } from '../../sim/state.js';
import { NAT } from '../../data/nations.js';
import { RAIL_Y } from '../../data/rail.js';
import { segmentSpan } from '../../sim/rail.js';

const RAIL = '#8a8576', SLEEPER = '#4a3722', GAP = 26;

function drawSpan(a, b, y) {
  ctx.fillStyle = SLEEPER;
  for (let x = Math.ceil(a / 9) * 9; x < b; x += 9) ctx.fillRect(x - 1.5, y - 4, 3, 8);
  line(a, y - 2, b, y - 2, 1.4, RAIL); line(a, y + 2, b, y + 2, 1.4, RAIL);
}

/* the bent, torn ends of a break: rails curl up on one side and droop on the other */
function drawBreak(a, b, y) {
  const m = (a + b) / 2, h = GAP / 2;
  drawSpan(a, m - h, y); drawSpan(m + h, b, y);
  for (const dy of [-2, 2]) {
    line(m - h, y + dy, m - h + 7, y + dy - 6 - dy, 1.4, RAIL);
    line(m + h, y + dy, m + h - 6, y + dy + 5 + dy, 1.4, RAIL);
  }
  ctx.fillStyle = SLEEPER; ctx.save(); ctx.translate(m + 2, y + 5); ctx.rotate(0.7); ctx.fillRect(-4, -1.5, 8, 3); ctx.restore();
}

export function drawTrack(vis) {
  for (let s = 0; s < 2; s++) {
    const t = G.track[s];
    for (let k = 1; k <= t.end; k++) {
      const [a, b] = segmentSpan(s, k);
      if (!vis(a) && !vis(b) && !vis((a + b) / 2)) continue;
      if (t.broken.has(k)) drawBreak(a, b, RAIL_Y); else drawSpan(a, b, RAIL_Y);
    }
  }
}

/* locomotive and wagon, drawn facing +x (the caller flips the enemy's); riders as small heads in the wagon */
function drawTrain(t) {
  const N = NAT[G.nation[t.side]], body = N.body, dark = N.hat;
  ctx.fillStyle = dark; ctx.fillRect(-30, -9, 26, 9);                      // wagon
  ctx.fillStyle = '#1b1b14'; ctx.fillRect(-30, -9, 26, 1.5);
  ctx.fillStyle = body; ctx.fillRect(-2, -12, 18, 12);                    // locomotive boiler/cab
  ctx.fillStyle = dark; ctx.fillRect(-2, -15, 7, 3); ctx.fillRect(11, -16, 3, 4); // cab roof, funnel
  ctx.fillStyle = '#1b1b14'; ctx.fillRect(-4, -5, 3, 2);                  // coupling
  for (const wx of [-24, -10, 2, 12]) { ctx.fillStyle = '#1b1b14'; circle(wx, 0, 3); ctx.fillStyle = RAIL; circle(wx, 0, 1.2); }
  const n = t.riders.length;
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = t.riders[i].side ? '#a8947a' : '#d9c3a0'; circle(-27 + (i % 6) * 4, -11, 2);
    ctx.fillStyle = dark; ctx.fillRect(-29 + (i % 6) * 4, -14, 4, 2);
  }
  if (t.hp < t.max) {
    ctx.fillStyle = 'rgba(20,20,14,.75)'; ctx.fillRect(-31, -20, 34, 4);
    ctx.fillStyle = t.side ? '#e0583e' : '#9fc05a'; ctx.fillRect(-30, -19, 32 * Math.max(0, t.hp / t.max), 2);
  }
}

export function drawTrains(vis) {
  for (const t of G.trains) {
    if (!vis(t.x)) continue;
    ctx.save(); ctx.translate(t.x, RAIL_Y + 3);
    if (t.side === 1) ctx.scale(-1, 1);
    drawTrain(t);
    ctx.restore();
  }
}
