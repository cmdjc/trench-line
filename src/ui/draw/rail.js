// Railways: laid track with sleepers, broken segments, and transport trains. No rng; pure drawing.
import { ctx, line, circle, BAG, BAGD } from './helpers.js';
import { G } from '../../sim/state.js';
import { NAT } from '../../data/nations.js';
import { RAIL_Y, BARRIER_R } from '../../data/rail.js';
import { segmentSpan, barrierAt } from '../../sim/rail.js';

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

/* sandbag wall along the rail, a bagArc-style double stroke */
function drawBagWall(cx, y) {
  const x0 = cx - BARRIER_R, x1 = cx + BARRIER_R;
  ctx.lineCap = 'butt'; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y);
  ctx.strokeStyle = BAGD; ctx.lineWidth = 5; ctx.stroke();
  ctx.setLineDash([6, 1.8]); ctx.strokeStyle = BAG; ctx.lineWidth = 4; ctx.stroke(); ctx.setLineDash([]);
}

const HQ_DOOR = 40;

export function drawTrack(vis) {
  for (let s = 0; s < 2; s++) {
    const t = G.track[s], dir = s ? -1 : 1;
    for (let k = 1; k <= t.end; k++) {
      let [a, b] = segmentSpan(s, k);
      if (!vis(a) && !vis(b) && !vis((a + b) / 2)) continue;
      if (k === 1) { const door = G.bases[s].x + dir * HQ_DOOR; if (s === 0) a = Math.max(a, door); else b = Math.min(b, door); }
      if (t.broken.has(k)) drawBreak(a, b, RAIL_Y); else drawSpan(a, b, RAIL_Y);
    }
    for (let L = 1; L <= G.NT; L++) {
      if (!barrierAt(s, L) || !vis(G.LX[L])) continue;
      drawBagWall(G.LX[L], RAIL_Y - 9); drawBagWall(G.LX[L], RAIL_Y + 9);
    }
  }
}

/* top-down locomotive (front) and open wagon (rear), facing +x (the caller flips the enemy's); riders as helmeted heads */
function drawTrain(t) {
  const N = NAT[G.nation[t.side]], body = N.body, dark = N.hat, K = '#1b1b14';
  ctx.fillStyle = K;                                                       // wheel tops poking out each side
  for (const wx of [-19, -9, 5, 18]) { ctx.fillRect(wx - 3, -6.5, 6, 1.6); ctx.fillRect(wx - 3, 4.9, 6, 1.6); }
  ctx.fillStyle = K; ctx.fillRect(-4, -1, 5, 2);                          // coupling bar
  ctx.fillStyle = dark; ctx.fillRect(-23, -5, 19, 10);                    // wagon walls
  ctx.fillStyle = '#6b5a40'; ctx.fillRect(-21.5, -3.5, 16, 7);            // wagon floor
  ctx.fillStyle = body;                                                    // boiler, rounded
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(0, -5, 23, 10, 4); else ctx.rect(0, -5, 23, 10);
  ctx.fill();
  ctx.fillStyle = dark; ctx.fillRect(1, -4.5, 7, 9);                       // cab roof at the rear of the loco
  ctx.fillStyle = K; circle(17.5, 0, 2.6);                                 // funnel
  ctx.fillStyle = dark; circle(12, 0, 2);                                  // dome
  const n = Math.min(t.riders.length, 8);
  for (let i = 0; i < n; i++) {
    const col = i >> 1, row = i & 1;
    ctx.fillStyle = t.riders[i].side ? '#a8947a' : '#d9c3a0'; circle(-6.5 - col * 4, row ? 2 : -2, 1.9);
    ctx.fillStyle = dark; circle(-6.5 - col * 4, row ? 2 : -2, 1.2);
  }
  if (t.hp < t.max) {
    ctx.fillStyle = 'rgba(20,20,14,.75)'; ctx.fillRect(-24, -12, 48, 4);
    ctx.fillStyle = t.side ? '#e0583e' : '#9fc05a'; ctx.fillRect(-23, -11, 46 * Math.max(0, t.hp / t.max), 2);
  }
}

export function drawTrains(vis) {
  for (const t of G.trains) {
    if (!vis(t.x)) continue;
    ctx.save(); ctx.translate(t.x, RAIL_Y);
    if (t.side === 1) ctx.scale(-1, 1);
    drawTrain(t);
    ctx.restore();
  }
}
