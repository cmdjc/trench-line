// Geometry: trench coordinates, lanes, spawning and field arithmetic.
// Verbatim port of prototype lines 719–760; Math.random → seeded rng.

import { SEG, WH, TK, utOf, tkPrev } from '../data/units.js';
import { NAT } from '../data/nations.js';
import { MAPS } from '../data/maps.js';
import { rng } from '../core/rng.js';
import { G, isDbl } from './state.js';
import { infCap, startLineFor } from './base.js';
import { railSpawn } from './rail.js';

export const trenchX = (cx, y) => cx + ((Math.floor(y / SEG) % 2) ? 6 : -6);

export function posX(side, L, y, tank) {
  const dir = side ? -1 : 1, own = side ? G.HQI : 0, foe = G.HQI - own;
  if (L === own) return G.LX[own] + dir * (tank ? 52 + Math.abs(tank) : 55);
  if (L === foe) return G.LX[foe] - dir * (tank ? 72 + Math.abs(tank) : 85);
  return tank ? G.LX[L] + dir * tank : trenchX(G.LX[L] + (isDbl(L) ? ((Math.floor(y * 0.61) % 2) ? 14 : -14) : 0), y);
}

export const isTrench = L => L >= 1 && L <= G.NT;

export function pickLane(side, L) {
  let best = 150, bs = -1;
  for (let k = 0; k < 5; k++) {
    const y = 22 + rng.float() * (WH - 44); let near = 1e9;
    for (const u of G.units) if (u.side === side && u.line === L) near = Math.min(near, Math.abs(u.y - y));
    if (near > bs) { bs = near; best = y; }
  }
  return best;
}

/* A paratrooper, or one still falling or scrambling out of its harness after landing: no trench cover, no fort
   penalty for whoever shoots it, no healing, no bunker. */
export const exposed = u => u.fall > 0 || u.scramble > 0;

/* The furthest trench index a unit has physically reached, measured from its own HQ. A unit sitting on its
   ordered spot has reached its line; one on the move has reached every trench line it has crossed. */
export function reached(u) {
  const own = u.side ? G.HQI : 0, dir = u.side ? -1 : 1;
  const tx = u.tx !== undefined ? u.tx : posX(u.side, u.line, u.ly === undefined ? u.y : u.ly, u.park);
  if (u.settled && Math.abs(u.x - tx) <= 2) return u.line;
  let r = own;
  for (let L = own + dir; L >= 0 && L <= G.HQI; L += dir) { if ((u.x - G.LX[L]) * dir >= -6) r = L; else break; }
  return r;
}

/* The side's walking front: the furthest line its ground troops (not paratroopers, not fixed guns) have actually
   reached and are ordered to hold, so troops ordered forward count only once they get there. */
export function walkFront(side) {
  let f = null;
  for (const u of G.units) {
    if (u.side !== side || u.fixed || u.para || u.riding || u.hp <= 0) continue;
    const r = reached(u), at = side ? Math.max(u.line, r) : Math.min(u.line, r);
    f = f === null ? at : side ? Math.min(f, at) : Math.max(f, at);
  }
  return f === null ? (side ? G.HQI : 0) : f;
}

/* The furthest trench in an unbroken run of trenches the side holds, counting out from its own HQ. */
function heldFront(side) {
  const dir = side ? -1 : 1; let L = side ? G.HQI : 0;
  while (isTrench(L + dir) && G.owner[L + dir] === side) L += dir;
  return L;
}

/* on maps with a railhead, reinforcements appear one trench behind the line they are sent to, but never ahead of
   both the walking front and the unbroken run of held trenches (so an airborne drop is no railhead) */
export function startX(side, L, type) {
  const dir = side ? -1 : 1, own = side ? G.HQI : 0;
  const sl = type ? startLineFor(side, type, L) : null;
  if (sl !== null) return G.LX[sl] - dir * 14;
  if (!MAPS[G.MAP].rail) return G.LX[own] - dir * 14;
  const reach = side ? Math.min(walkFront(side), heldFront(side)) : Math.max(walkFront(side), heldFront(side));
  const at = side ? Math.max(L - dir, reach) : Math.min(L - dir, reach);
  return G.LX[Math.max(0, Math.min(G.HQI, at))] - dir * 14;
}

export const ut = (side, k) => utOf(G.nation[side], k);

export function spawn(side, type, L, placed) {
  const T = ut(side, type), m = G.M[side];
  let y = pickLane(side, L); if (T.big) y = Math.max(50, Math.min(WH - 50, y));
  const park = T.armor ? (T.rear ? -((T.park || 38) + 26) : (T.park || 38) + 4) : 0;
  const hp = T.hp * (T.armor ? m.tankHp : m.hp);
  const u = { id: G.uid++, side, type, T, cd2: 0, flash2: 0, gun: 1, tread: 0, puff: 0, line: L, y, aim: 0, park, x: placed ? posX(side, L, y, park) : startX(side, L, type), hp, max: hp, cd: rng.float() * T.cd, settled: !!placed, moving: false, walk: rng.float() * 6, flash: 0 };
  if (!placed && G.trains.length) railSpawn(u); // Long March: start at the HQ instead if the train is faster
  G.units.push(u); return u;
}

export const count = side => { let n = 0; for (const u of G.units) if (u.side === side && !u.T.armor && !u.fixed && !u.para) n++; return n; };
export const tanks = side => { let n = 0; for (const u of G.units) if (u.side === side && u.T.armor && !u.T.sup) n += u.T.w || 1; return n; };
export const anyTank = () => TK.some(k => G.S.unlocked[k] && ut(0, k));
export const tkCan = k => !!ut(0, k) && !G.S.unlocked[k] && (k === 'tkL' || !tkPrev(G.nation[0], k) || !!G.S.unlocked[tkPrev(G.nation[0], k)]);
export const full = (side, type) => { const T = ut(side, type); return T.armor ? tanks(side) + (T.w || 1) > NAT[G.nation[side]].tanks + 1e-6 : count(side) >= infCap(side); };
export const countAt = (side, L) => { let n = 0; for (const u of G.units) if (u.side === side && u.line === L && !u.fixed && !u.riding) n++; return n; };
export const power = (side, L) => { let p = 0; for (const u of G.units) if (u.side === side && u.line === L) p += u.T.cost; return p; };
export const cost = type => Math.round(ut(0, type).cost * G.M[0].cost[type]);
export const frontLine = () => { let f = 0; for (const u of G.units) if (u.side === 0 && !u.fixed && u.line > f) f = u.line; return f; };
