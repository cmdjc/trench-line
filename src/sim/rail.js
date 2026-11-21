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
import { TRACK_COST, REPAIR_COST, BIG_SPLASH, RAIL_Y, TRAINS, TRAIN_SLOTS, TRIP_SUPPLY, WOUNDED } from '../data/rail.js';
import { ARM } from '../data/units.js';
import { MAPS } from '../data/maps.js';

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

const DWELL = 1;    // seconds a train holds at the HQ after its first rider boards, for stragglers
const HQ_ZONE = 60; // px forward of the HQ that still counts as "at the HQ" (spawn point and HQ post)
const homeOf = side => (side ? G.HQI : 0);
const fwdOf = side => (side ? -1 : 1);

/* foot soldiers only: no armour, emplacements, fixed jobs or paratroopers */
const rideable = u => !u.T.armor && !u.T.nest && !u.T.bunker && !u.T.depot && !u.fixed && !u.para && u.T.speed > 0;

/* seconds until train t, wherever it is now, has carried a unit waiting at the HQ out to the end (farD px) */
function trainETA(t, farD) {
  const fwd = fwdOf(t.side), p = (t.x - G.LX[homeOf(t.side)]) * fwd;
  let back;
  if (t.dir !== fwd) back = p;
  else if (p <= 0) back = t.riders.length >= t.T.cap ? 2 * farD : 0;
  else back = p < farD ? 2 * farD - p : p;
  return (back + farD) / t.T.speed + DWELL;
}

/* Should this unit wait for a train instead of walking? Only when riding gets it to the end of the track strictly
   sooner than walking there, so laying track never slows reinforcements. */
export function shouldRide(u) {
  if (u.hp <= 0 || u.riding || !rideable(u)) return false;
  const s = u.side, fwd = fwdOf(s), end = trackEnd(s);
  if (end <= 0 || !G.trains.some(t => t.side === s)) return false;
  const eL = lineOfSegment(s, end), ex = G.LX[eL], home = G.LX[homeOf(s)];
  if ((u.line - eL) * fwd < 0 || (u.x - ex) * fwd >= 0) return false;
  const fresh = MAPS[G.MAP].rail && u.id >= (G.railSeen || 0); // just spawned at a railhead
  if ((u.x - home) * fwd > HQ_ZONE && !u.waiting && !fresh) return false;
  const walk = Math.abs(ex - u.x) / (u.T.speed * G.M[s].speed), farD = Math.abs(ex - home);
  let best = Infinity;
  for (const t of G.trains) if (t.side === s && t.hp > 0) best = Math.min(best, trainETA(t, farD));
  return best < walk;
}

/* mark units that should wait for a train; release the ones that no longer gain by waiting */
function updateWaiting() {
  for (const u of G.units) {
    if (u.riding) continue;
    if (shouldRide(u)) { u.waiting = true; u.moving = false; } else if (u.waiting) u.waiting = false;
  }
  G.railSeen = G.uid;
}

function board(t, u) {
  u.riding = t.id; u.waiting = false; u.settled = false; u.moving = false;
  if (u.shelter) { u.shelter = null; u.tx = undefined; if (u.ly0 !== undefined) u.ly = u.ly0; }
  u.x = t.x; u.y = RAIL_Y;
  t.riders.push(u); t.carried = true;
}

function getOff(u, x) { u.riding = undefined; u.x = x; u.y = RAIL_Y; u.settled = false; u.moving = false; }

/* riders heading out (not wounded heading home) */
const outbound = t => t.riders.length > 0 && t.riders[0].homeLine === undefined;

/* at the end of the track: riders get off and walk on; settled wounded in that trench board for home */
function atEnd(t, end) {
  for (const u of t.riders) getOff(u, t.x);
  t.riders = [];
  if (end <= 0) return;
  const L = lineOfSegment(t.side, end);
  for (const u of G.units) {
    if (t.riders.length >= t.T.cap) break;
    if (u.side !== t.side || u.line !== L || !u.settled || u.riding || u.hp <= 0 || u.hp >= WOUNDED * u.max || !rideable(u)) continue;
    u.homeLine = u.line; board(t, u);
  }
}

/* wounded reach the HQ: healed, then sent back to their old line, or to the current orders if it was lost */
function atHome(t) {
  const rs = t.riders; t.riders = [];
  for (const u of rs) {
    getOff(u, t.x); u.hp = u.max;
    u.line = G.owner[u.homeLine] === t.side ? u.homeLine : t.side ? G.ai.F : G.sel;
    u.homeLine = undefined;
  }
}

/* the train was destroyed: riders get off where it stood, at full strength */
export function dismountAll(train) {
  for (const u of train.riders) { getOff(u, train.x); u.hp = u.max; u.homeLine = undefined; }
  train.riders = [];
}

/* a side may buy a train: track runs, a slot is free */
export function canBuyTrain(side) {
  return G.trains.filter(t => t.side === side).length < TRAIN_SLOTS && trackEnd(side) > 0;
}

/* spawns the side's national train at its own HQ; the caller charges the cost */
export function buyTrain(side) {
  if (!canBuyTrain(side)) return false;
  const T = TRAINS[G.nation[side]];
  if (!G.trains.length) G.railSeen = G.uid; // units already on the march are not fresh railhead spawns
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
  updateWaiting();
  for (const t of G.trains) {
    if (t.hp <= 0) continue;
    const fwd = fwdOf(t.side), home = G.LX[homeOf(t.side)];
    const end = trackEnd(t.side), farD = end > 0 ? Math.abs(G.LX[lineOfSegment(t.side, end)] - home) : 0;
    let p = (t.x - home) * fwd;
    if (t.dir === fwd && p <= 0) {
      /* at the HQ, outbound: take waiting troops; once anyone is aboard, hold briefly unless full */
      if (end > 0) for (const u of G.units) {
        if (t.riders.length >= t.T.cap) break;
        if (u.waiting && u.side === t.side && !u.riding && u.hp > 0) board(t, u);
      }
      if (t.riders.length && t.riders.length < t.T.cap && (t.dwell = (t.dwell || 0) + dt) < DWELL) continue;
      t.dwell = 0;
    }
    if (t.dir === fwd && p >= farD) t.dir = -fwd; // the end moved behind the train: turn back
    p += (t.dir === fwd ? 1 : -1) * t.T.speed * dt;
    if (t.dir === fwd && p >= farD) { p = Math.max(farD, 0); t.dir = -fwd; t.x = home + p * fwd; atEnd(t, end); }
    else if (t.dir !== fwd) {
      /* cut off: riders heading out ride back to the new end and get off there */
      if (outbound(t) && p <= farD) { p = Math.max(farD, 0); t.x = home + p * fwd; atEnd(t, end); }
      if (p <= 0) {
        p = 0; t.dir = fwd; t.x = home;
        if (t.carried) {
          if (t.side) G.ai.money += TRIP_SUPPLY; else G.S.supplies += TRIP_SUPPLY;
        }
        t.carried = false;
        atHome(t);
      }
    }
    t.x = home + p * fwd;
    for (const u of t.riders) { u.x = t.x; u.y = RAIL_Y; }
  }
  const n = G.trains.length;
  for (const t of G.trains) if (t.hp <= 0) dismountAll(t);
  G.trains = G.trains.filter(t => t.hp > 0);
  if (G.trains.length !== n) updateWaiting();
}

export { TRACK_COST, REPAIR_COST };
