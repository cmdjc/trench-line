// Airborne drop (US superweapon): paratroopers land in an enemy or empty trench
// up to DROP_RANGE trenches past the walking front. They are cap-exempt (count
// skips u.para) and fall for a moment before they can move or (mostly) fire.

import { G } from './state.js';
import { isTrench, spawn, posX, walkFront } from './geometry.js';
import { rng } from '../core/rng.js';
import { WH } from '../data/units.js';
import { DROP_MIX, DROP_RANGE, DROP_FALL, DROP_STAGGER } from '../data/drop.js';

export { walkFront }; // lives in geometry.js so the railhead (startX) can use it too

export function validDrop(side, L) {
  if (!isTrench(L)) return false;
  if (G.owner[L] !== 1 - side && G.owner[L] !== -1) return false;
  const w = walkFront(side), d = side ? w - L : L - w;
  return d >= 1 && d <= DROP_RANGE;
}

export function dropTarget(side) {
  const w = walkFront(side), dir = side ? -1 : 1;
  for (let i = 1; i <= DROP_RANGE; i++) if (validDrop(side, w + dir * i)) return w + dir * i;
  return -1;
}

export function nearestDrop(side, x) {
  let best = -1;
  for (let L = 1; L <= G.NT; L++) if (validDrop(side, L) && (best < 0 || Math.abs(G.LX[L] - x) < Math.abs(G.LX[best] - x))) best = L;
  return best;
}

export function spawnDrop(side, L) {
  const kinds = [];
  for (const [k, n] of DROP_MIX) for (let i = 0; i < n; i++) kinds.push(k);
  const n = kinds.length;
  kinds.forEach((k, i) => {
    const u = spawn(side, k, L, true);
    u.para = true;
    u.fall = DROP_FALL + i / n * DROP_STAGGER;
    u.y = 22 + (i + 0.5) / n * (WH - 44) + (rng.float() - 0.5) * 8;
    u.ly = u.y;
    u.x = posX(side, L, u.y, u.park);
  });
}
