// Railways, stage 1: track laying, repair, capture and big-shell breaks.
// Pure sim, no browser APIs, no rng.
//
// Representation: G.track[side] = { end, broken: Set }.
//   - `end` counts segments laid from that side's OWN HQ; segment k (1-based) is
//     the k-th stretch of rail leaving that HQ.
//   - Side 0: segment k spans G.LX[k-1]..G.LX[k] and ends at trench k.
//   - Side 1 (mirrored): segment k spans G.LX[HQI-k]..G.LX[HQI-k+1] and ends at
//     trench HQI-k.
//   - `broken` holds segment numbers (same numbering) cut by big shells.
// A side "holds" a segment when G.owner[trench it ends at] === side.

import { G } from './state.js';
import { TRACK_COST, REPAIR_COST, BIG_SPLASH, RAIL_Y, TRAINS, TRAIN_SLOTS, TRIP_SUPPLY } from '../data/rail.js';
import { ARM } from '../data/units.js';

/* trench a segment of `side` ends at */
export const lineOfSegment = (side, k) => (side === 0 ? k : G.HQI - k);
/* segment number of `side` that ends at trench L (<= 0 or > NT means none) */
export const segmentIndexFor = (side, L) => (side === 0 ? L : G.HQI - L);
/* x-span of a segment */
export function segmentSpan(side, k) {
  return side === 0 ? [G.LX[k - 1], G.LX[k]] : [G.LX[G.HQI - k], G.LX[G.HQI - k + 1]];
}

export const hasTrack = () => !!G.track && (G.track[0].end > 0 || G.track[1].end > 0);

export function isBigShell(s) {
  return !!(s.big || s.huge || s.raze || s.siege || s.splash >= BIG_SPLASH);
}

/* furthest segment L with 1..L all present, unbroken and held; 0 if none */
export function trackEnd(side) {
  const t = G.track[side]; let k = 0;
  while (k < t.end) {
    const n = k + 1;
    if (t.broken.has(n) || G.owner[lineOfSegment(side, n)] !== side) break;
    k = n;
  }
  return k;
}

export const nextSegment = side => G.track[side].end + 1;

/* '' when `side` can lay its next segment, else a reason sentence */
export function canLay(side) {
  const t = G.track[side], n = t.end + 1;
  if (n > G.NT) return 'The track already reaches the far end.';
  if (t.broken.size) return 'Repair the broken track first.';
  const L = lineOfSegment(side, n);
  if (G.owner[L] !== side) return 'Trench ' + L + ' is not held.';
  return '';
}

export function layTrack(side) {
  if (canLay(side)) return false;
  G.track[side].end++; return true;
}

/* repairs the break nearest the HQ */
export function repairTrack(side) {
  const t = G.track[side]; let min = 0;
  for (const k of t.broken) if (!min || k < min) min = k;
  if (!min) return false;
  t.broken.delete(min); return true;
}

/* a side lost the trench ending segment k: segment k and all beyond are destroyed */
export function cutTrack(side, k) {
  const t = G.track[side]; if (t.end < k) return;
  t.end = Math.max(0, Math.min(t.end, k - 1));
  for (const b of [...t.broken]) if (b > t.end) t.broken.delete(b);
}

/* a big shell landed: break every segment its splash overlaps (both sides' track) */
export function breakAt(x, y, splash, shell) {
  if (!hasTrack() || (shell && !isBigShell(shell))) return;
  if (Math.abs(y - RAIL_Y) > splash) return;
  for (let side = 0; side < 2; side++) {
    const t = G.track[side];
    for (let k = 1; k <= t.end; k++) {
      const [a, b] = segmentSpan(side, k);
      if (b >= x - splash && a <= x + splash) t.broken.add(k);
    }
  }
}

/* ---- transport trains: own entities in G.trains, never units ---- */
let trainId = 0;

/* Task 4 fills this in: riders get off where the train stood */
export function dismountAll(train) { train.riders = []; }

/* a side may buy a train: track runs, a slot is free */
export function canBuyTrain(side) {
  return G.trains.length < TRAIN_SLOTS && trackEnd(side) > 0;
}

/* spawns the side's national train at its own HQ; the caller charges the cost */
export function buyTrain(side) {
  if (!canBuyTrain(side)) return false;
  const T = TRAINS[G.nation[side]];
  G.trains.push({ id: ++trainId, side, x: G.LX[side ? G.HQI : 0], hp: T.hp, max: T.hp, dir: side ? -1 : 1, riders: [], carried: false, T });
  return true;
}

/* train damage: armour like a light tank (thin plating doubles weak-fire damage), same as hurt() for units */
export function hurtTrain(t, dmg, atk) {
  if (t.hp <= 0) return;
  const a = ARM[atk] ?? 1;
  t.hp -= dmg * a * (a < 0.5 ? 2 : 1);
}

export function stepTrains(dt) {
  if (!G.trains.length) return;
  for (const t of G.trains) {
    const fwd = t.side ? -1 : 1, home = G.LX[t.side ? G.HQI : 0];
    const end = trackEnd(t.side), farD = end > 0 ? Math.abs(G.LX[lineOfSegment(t.side, end)] - home) : 0;
    let p = (t.x - home) * fwd;
    if (t.dir === fwd && p >= farD) t.dir = -fwd;
    p += (t.dir === fwd ? 1 : -1) * t.T.speed * dt;
    if (t.dir === fwd && p >= farD) { p = Math.max(farD, 0); t.dir = -fwd; }
    else if (t.dir !== fwd && p <= 0) {
      p = 0; t.dir = fwd;
      if (t.carried) {
        if (t.side) G.ai.money += TRIP_SUPPLY; else G.S.supplies += TRIP_SUPPLY;
      }
      t.carried = false;
    }
    t.x = home + p * fwd;
  }
  for (const t of G.trains) if (t.hp <= 0) dismountAll(t);
  G.trains = G.trains.filter(t => t.hp > 0);
}

export { TRACK_COST, REPAIR_COST };
