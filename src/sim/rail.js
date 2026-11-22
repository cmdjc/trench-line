// Railways, stage 1: track laying, repair, capture and big-shell breaks.
// Pure sim, no browser APIs. rng is drawn only by armoured trains (fireArmor):
// a game with transport trains alone never touches it.
//
// Representation: G.track[side] = { end, broken: Set }.
//   - `end` counts segments laid from that side's OWN HQ; segment k (1-based) is
//     the k-th stretch of rail leaving that HQ.
//   - Side 0: segment k spans G.LX[k-1]..G.LX[k] and ends at trench k.
//   - Side 1 (mirrored): segment k spans G.LX[HQI-k]..G.LX[HQI-k+1] and ends at
//     trench HQI-k.
//   - `broken` holds segment numbers (same numbering) cut by big shells.
// A side "holds" a segment when G.owner[trench it ends at] === side.

import { G, toast, hidden } from './state.js';
import { TRACK_COST, REPAIR_COST, BIG_SPLASH, BARRIER_R, RAIL_Y, TRAINS, ARMOR_TRAINS, TRAIN_SLOTS, TRIP_SUPPLY, TRIP_FULL, WOUNDED } from '../data/rail.js';
import { ARM } from '../data/units.js';
import { hurt, accVs, tracer, puff } from './combat.js';
import { rng } from '../core/rng.js';

/* trench a segment of `side` ends at */
export const lineOfSegment = (side, k) => (side === 0 ? k : G.HQI - k);
/* segment number of `side` that ends at trench L (<= 0 or > NT means none) */
export const segmentIndexFor = (side, L) => (side === 0 ? L : G.HQI - L);
/* x-span of a segment */
export function segmentSpan(side, k) {
  return side === 0 ? [G.LX[k - 1], G.LX[k]] : [G.LX[G.HQI - k], G.LX[G.HQI - k + 1]];
}

export const hasTrack = () => !!G.track && (G.track[0].end > 0 || G.track[1].end > 0);

/* HQ-gun shells (noBase) never break track, however big */
export function isBigShell(s) {
  return !s.noBase && !!(s.big || s.huge || s.raze || s.siege || s.splash >= BIG_SPLASH);
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
  G.track[side].end++; G.track[side].cut = false; return true;
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
  t.end = Math.max(0, Math.min(t.end, k - 1)); t.cut = true;
  for (const b of [...t.broken]) if (b > t.end) t.broken.delete(b);
}

/* does `side` have sandbags shielding the rail at trench L? Only trenches with track laid to them, never the HQ */
export function barrierAt(side, L) {
  const k = segmentIndexFor(side, L);
  return L >= 1 && L <= G.NT && k >= 1 && k <= G.track[side].end;
}

/* a big shell landed: break every segment its splash overlaps (both sides' track), except where a barrier shields it */
export function breakAt(x, y, splash, shell) {
  if (!hasTrack() || (shell && !isBigShell(shell))) return;
  if (Math.abs(y - RAIL_Y) > splash) return;
  for (let side = 0; side < 2; side++) {
    const t = G.track[side];
    for (let k = 1; k <= t.end; k++) {
      const shielded = [lineOfSegment(side, k - 1), lineOfSegment(side, k)]
        .some(L => barrierAt(side, L) && Math.abs(x - G.LX[L]) <= BARRIER_R);
      if (shielded) continue;
      const [a, b] = segmentSpan(side, k);
      if (b >= x - splash && a <= x + splash) t.broken.add(k);
    }
  }
}

/* ---- transport and armoured trains: own entities in G.trains, never units ---- */
let trainId = 0;

/* a train entry is an armoured train rather than a transport one; bare entries (no kind) count as transport */
export const isArmor = t => t.kind === 'armor';

const DWELL = 1;    // seconds a train holds at the HQ after its first rider boards, for stragglers
const HQ_ZONE = 60; // px forward of the HQ that still counts as "at the HQ" (spawn point and HQ post)
const homeOf = side => (side ? G.HQI : 0);
const fwdOf = side => (side ? -1 : 1);
/* distance along the rail from the side's HQ to the far end of its segment k */
const segDist = (side, k) => Math.abs(G.LX[lineOfSegment(side, k)] - G.LX[homeOf(side)]);

/* A train at distance p from its HQ is stranded when a broken segment of its own laid track starts behind it: it
   may not cross that segment, so it can get no nearer home than the break's forward edge. Returns that edge, or -1. */
function breakBehind(side, p) {
  let k = 0;
  for (const b of G.track[side].broken) if (b > k && b <= G.track[side].end && (b > 1 ? segDist(side, b - 1) : 0) < p) k = b;
  return k ? segDist(side, k) : -1;
}

/* foot soldiers only: no armour, emplacements, fixed jobs or paratroopers */
export const rideable = u => !u.T.armor && !u.T.nest && !u.T.bunker && !u.T.depot && !u.T.noFire && !u.fixed && !u.para && u.T.speed > 0;

/* seconds until train t, wherever it is now, has carried a unit waiting at the HQ out to the end (farD px) */
function trainETA(t, farD) {
  const fwd = fwdOf(t.side), p = (t.x - G.LX[homeOf(t.side)]) * fwd;
  let back;
  if (t.dir !== fwd) back = p;
  else if (p <= 0) back = t.riders.length >= t.T.cap ? 2 * farD : 0;
  else back = p < farD ? 2 * farD - p : p;
  return (back + farD) / t.T.speed + DWELL;
}

/* Seconds a waiting unit of `side` at the HQ needs to reach the end of the track by train (best train), and the
   end's x; null when the side has no usable track or train. */
function rideTime(side) {
  const end = trackEnd(side);
  if (end <= 0 || !G.trains.some(t => t.side === side && !isArmor(t))) return null;
  const ex = G.LX[lineOfSegment(side, end)], farD = Math.abs(ex - G.LX[homeOf(side)]);
  let best = Infinity;
  for (const t of G.trains) if (t.side === side && !isArmor(t) && t.hp > 0 && !t.stranded) best = Math.min(best, trainETA(t, farD));
  return { best, ex, eL: lineOfSegment(side, end) };
}

/* a foot soldier's walking pace, px/s */
export const walkSpeed = u => u.T.speed * G.M[u.side].speed;

/* does riding from the HQ beat walking to the end of the track, for a unit ordered to its line? */
function rideBeats(u) {
  if (u.hp <= 0 || hidden(u) || !rideable(u)) return false;
  const r = rideTime(u.side); if (!r) return false;
  const fwd = fwdOf(u.side);
  if ((u.line - r.eL) * fwd < 0) return false;
  if ((u.x - r.ex) * fwd >= 0) return false;
  return r.best < Math.abs(r.ex - u.x) / walkSpeed(u);
}

/* Seconds this unit needs to reach x `tx` by train (ride to the end of the track, walk the rest), or Infinity
   when it would not take the train. */
export function trainTime(u, tx) {
  if (!rideBeats(u)) return Infinity;
  const r = rideTime(u.side);
  return r.best + Math.abs(tx - r.ex) / walkSpeed(u);
}

/* Should this unit, standing at the HQ, wait for a train instead of walking? Only when riding gets it to the end
   of the track strictly sooner than walking there, so laying track never slows reinforcements. Units anywhere
   else (troops on the march) never board. */
export function shouldRide(u) {
  const fwd = fwdOf(u.side);
  if ((u.x - G.LX[homeOf(u.side)]) * fwd > HQ_ZONE) return false;
  return rideBeats(u);
}

/* mark units that should wait for a train; release the ones that no longer gain by waiting */
function updateWaiting() {
  for (const u of G.units) {
    if (hidden(u)) continue;
    if (shouldRide(u)) { u.waiting = true; u.moving = false; } else if (u.waiting) u.waiting = false;
  }
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
    if (u.side !== t.side || u.line !== L || !u.settled || hidden(u) || u.hp <= 0 || u.hp >= WOUNDED * u.max || !rideable(u)) continue;
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

/* the train was destroyed: riders get off where it stood, unhurt by the wreck (wounded stay wounded) */
export function dismountAll(train) {
  for (const u of train.riders) { getOff(u, train.x); u.homeLine = undefined; }
  train.riders = [];
}

/* stranded behind a break: riders heading out get off and walk on, wounded get off and walk home; the trip is void */
function strand(t) {
  for (const u of t.riders) {
    getOff(u, t.x);
    if (u.homeLine !== undefined) { u.line = homeOf(t.side); u.homeLine = undefined; }
  }
  t.riders = []; t.carried = false; t.stranded = true;
}

/* a side may buy a train: track runs, a slot is free. Shared by transport and armoured trains */
export function canBuyTrain(side) {
  return G.trains.filter(t => t.side === side).length < TRAIN_SLOTS && trackEnd(side) > 0;
}

/* spawns the side's national train at its own HQ; the caller charges the cost */
export function buyTrain(side) {
  if (!canBuyTrain(side)) return false;
  const T = TRAINS[G.nation[side]];
  G.trains.push({ id: ++trainId, side, kind: 'transport', x: G.LX[side ? G.HQI : 0], hp: T.hp, max: T.hp, dir: side ? -1 : 1, riders: [], carried: false, far: 0, T });
  return true;
}

/* spawns the side's national armoured train at its own HQ; the caller charges the cost. It never rides with
   troops; `riders` stays [] forever so dismountAll and the draw code stay generic. */
export function buyArmor(side) {
  if (!canBuyTrain(side)) return false;
  const A = ARMOR_TRAINS[G.nation[side]];
  G.trains.push({ id: ++trainId, kind: 'armor', side, x: G.LX[side ? G.HQI : 0], hp: A.hp, max: A.hp, cd: 0, cd2: 0, flash: 0, flash2: 0, aim: 0, puff: 0, moving: false, shots: 0, mgShots: 0, riders: [], T: A });
  return true;
}

/* advance to the end of the track and hold there; retreat behind a lost trench or a break; never shuttles */
function moveArmor(t, dt) {
  const fwd = fwdOf(t.side), home = G.LX[homeOf(t.side)], end = trackEnd(t.side);
  let goal = end > 0 ? segDist(t.side, end) : 0, p = (t.x - home) * fwd;
  const fence = breakBehind(t.side, p);
  if (fence >= 0) goal = Math.max(goal, Math.min(fence, p)); // never cross a break behind it, and never advance past a break just appeared under it
  const step = t.T.speed * dt;
  t.moving = Math.abs(goal - p) > 1e-6;
  p = p < goal ? Math.min(goal, p + step) : Math.max(goal, p - step);
  t.x = home + p * fwd;
}

/* an armoured train's weapons: a tank-like cannon (shell/splash) and machine guns (instant tracer hit), with a
   fallback that shells the enemy base when nothing else is in range. Mirrors stepUnits' armour branch (combat.js
   lines 75-90 and 139-183), but armoured trains are G.trains entries, never G.units ones, so this stays here.
   Reuses hurt/accVs/tracer/puff rather than its own damage math; national stats are already baked into
   ARMOR_TRAINS, so (unlike stepUnits) there is no G.M multiplier and no minR. */
function fireArmor(t, dt) {
  const T = t.T, fwd = fwdOf(t.side), dir = fwd;
  let best = null, bd = 1e9;
  for (const e of G.units) {
    if (e.side === t.side || e.hp <= 0 || hidden(e)) continue;
    const d = Math.hypot(e.x - t.x, e.y - RAIL_Y);
    if (d < bd) { bd = d; best = e; }
  }
  for (const tr of G.trains) {
    if (tr.side === t.side || tr.hp <= 0) continue;
    const d = Math.abs(tr.x - t.x);
    if (d < bd) { bd = d; best = { x: tr.x, y: RAIL_Y, hp: tr.hp, settled: false, T: {}, train: tr }; }
  }

  t.cd -= dt; t.cd2 -= dt; t.flash -= dt; t.flash2 -= dt; t.puff -= dt;
  if (t.puff <= 0) {
    const hurtBad = t.hp < t.max * 0.33;
    t.puff = hurtBad ? 0.1 : t.moving ? 0.16 : 0.5;
    puff(t.x - dir * 22, RAIL_Y, hurtBad);
  }

  if (t.cd2 <= 0 && best && bd <= T.mg.range) {
    t.cd2 = T.mg.cd * (0.8 + rng.float() * 0.4); t.flash2 = 0.07;
    const sy = best.y < RAIL_Y ? -6 : 6;
    if (rng.float() < T.mg.acc * accVs(t, best)) { tracer(t.x, RAIL_Y + sy, best.x, best.y, 1, '#ffd76a'); hurt(best, T.mg.dmg, 'mg', t); }
    else tracer(t.x, RAIL_Y + sy, best.x + (rng.float() - 0.5) * 30, best.y + (rng.float() - 0.5) * 30, 0.8, 'rgba(255,215,106,.6)');
    t.mgShots++;
  }

  if (t.cd <= 0) {
    const hit = best && bd <= T.range, gx = hit ? best.x : G.bases[1 - t.side].x, gy = hit ? best.y : RAIL_Y;
    t.aim = Math.atan2(gy - RAIL_Y, (gx - t.x) * fwd);
    if (hit) {
      t.cd = T.cd * (0.85 + rng.range(0, 0.3)); t.flash = 0.08;
      G.shells.push({ x0: t.x + dir * 14, y0: RAIL_Y, x1: best.x, y1: best.y, t: 0, dur: T.shell, side: t.side, type: 'tank', dmg: T.dmg, splash: T.splash, arc: 0.1 });
      t.shots++;
    } else {
      const b = G.bases[1 - t.side], d = Math.abs(b.x - t.x);
      if (d <= T.range) {
        t.cd = T.cd * (0.85 + rng.range(0, 0.3)); t.flash = 0.08;
        const by = RAIL_Y + (rng.float() - 0.5) * 70;
        G.shells.push({ x0: t.x + dir * 14, y0: RAIL_Y, x1: b.x - dir * 20, y1: by, t: 0, dur: T.shell, side: t.side, type: 'tank', dmg: T.dmg * 1.5, base: true, arc: 0.1 });
        t.shots++;
      }
    }
  }
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
  let armorFired = false;
  for (const t of G.trains) {
    if (t.hp <= 0) continue;
    if (isArmor(t)) { moveArmor(t, dt); fireArmor(t, dt); armorFired = true; continue; }
    const fwd = fwdOf(t.side), home = G.LX[homeOf(t.side)];
    const end = trackEnd(t.side), farD = end > 0 ? Math.abs(G.LX[lineOfSegment(t.side, end)] - home) : 0;
    let p = (t.x - home) * fwd;
    const fence = breakBehind(t.side, p);
    if (fence >= 0) {
      /* a break behind the train: it heads for the break's forward edge and waits there for the repair */
      if (!t.stranded || t.riders.length) strand(t);
      t.dir = -fwd; t.dwell = 0;
      if (p > fence) p = Math.max(fence, p - t.T.speed * dt);
      t.x = home + p * fwd;
      continue;
    }
    t.stranded = false;
    if (t.dir === fwd && p <= 0) {
      /* at the HQ, outbound: take waiting troops; once anyone is aboard, hold briefly unless full */
      if (end > 0) for (const u of G.units) {
        if (t.riders.length >= t.T.cap) break;
        if (u.waiting && u.side === t.side && !hidden(u) && u.hp > 0) board(t, u);
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
          const pay = Math.round(TRIP_SUPPLY * Math.min(1, t.far / TRIP_FULL)); // pay scales with the trip's length
          if (t.side) G.ai.money += pay; else G.S.supplies += pay;
        }
        t.carried = false; t.far = 0;
        atHome(t);
      }
    }
    t.x = home + p * fwd; t.far = Math.max(t.far || 0, p);
    for (const u of t.riders) { u.x = t.x; u.y = RAIL_Y; }
  }
  if (armorFired) G.units = G.units.filter(u => u.hp > 0);
  const n = G.trains.length;
  for (const t of G.trains) if (t.hp <= 0) {
    dismountAll(t);
    G.wrecks.push({ x: t.x, y: RAIL_Y, side: t.side, nat: G.nation[t.side], t: 0, puff: 0, d: isArmor(t) ? { L: 26, W: 7 } : { L: 18, W: 6 } });
    if (G.wrecks.length > 10) G.wrecks.shift();
    if (t.side === 0) toast(t.T.name + ' was destroyed.');
  }
  G.trains = G.trains.filter(t => t.hp > 0);
  if (G.trains.length !== n) updateWaiting();
}

export { TRACK_COST, REPAIR_COST };
