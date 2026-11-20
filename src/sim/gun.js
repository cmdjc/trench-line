// Aimable HQ gun: each side's HQ fires scattered, base-safe shells at a point
// in range. fireGun never charges; callers (commands.js) own the purse.

import { GUNS } from '../data/guns.js';
import { WH } from '../data/units.js';
import { G } from './state.js';
import { rng } from '../core/rng.js';

/* furthest reachable x: the range line plus half the gap to the next line toward the foe */
export function gunMaxX(side) {
  const r = Math.min(GUNS[G.nation[side]].range, G.NT);
  if (side === 0) return G.LX[r] + (G.LX[r + 1] - G.LX[r]) / 2;
  const L = G.HQI - r;
  return G.LX[L] - (G.LX[L] - G.LX[L - 1]) / 2;
}

export function clampAim(side, x) {
  const own = G.bases[side].x, m = gunMaxX(side);
  return Math.max(Math.min(own, m), Math.min(Math.max(own, m), x));
}

export function gunBlock(side) {
  const cd = G.gun[side].cd;
  return cd > 0 ? 'Reloading: ready in ' + Math.ceil(cd) + ' seconds.' : '';
}

export function fireGun(side, x, y) {
  const d = GUNS[G.nation[side]];
  if (!d || gunBlock(side)) return false;
  const own = G.bases[side], ax = clampAim(side, x), ay = Math.max(0, Math.min(WH, y));
  for (const s of d.shells) {
    G.shells.push({
      x0: own.x, y0: WH / 2,
      x1: ax + (rng.float() - 0.5) * 2 * s.spread, y1: ay + (rng.float() - 0.5) * 2 * s.spread,
      t: -s.delay, dur: s.dur, side, type: 'barrage', dmg: s.dmg, splash: s.splash, cov: s.cov, arc: s.arc, big: !!s.big, noBase: true,
    });
  }
  G.gun[side].cd = d.cd;
  return true;
}

export function stepGun(dt) {
  for (const g of G.gun) if (g.cd > 0) g.cd -= dt;
}

/* Richest cluster of foe units inside this side's reach (same 85 px cost-weighted score as aimPoint). */
export function bestTarget(side) {
  const foe = 1 - side, own = G.bases[side].x, m = gunMaxX(side), lo = Math.min(own, m), hi = Math.max(own, m);
  const pool = G.units.filter(u => u.side === foe && u.hp > 0 && !u.fixed && u.x >= lo && u.x <= hi);
  let best = null, bs = 0;
  for (const c of pool) {
    let sc = 0;
    for (const e of pool) if (Math.hypot(e.x - c.x, e.y - c.y) < 85) sc += e.T.cost;
    if (sc > bs) { bs = sc; best = c; }
  }
  return best ? { x: best.x, y: best.y, value: bs } : null;
}
