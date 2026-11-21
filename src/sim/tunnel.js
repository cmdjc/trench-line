// Tunnel trenches (Long March). Pure sim, no browser APIs, no rng.
//
// Two ordinary trenches, round(NT/4) from each HQ, hold tunnel mouths. A side that holds one can send fresh
// infantry ordered to that trench or beyond it (toward the foe) through the tunnel: they vanish at their own HQ,
// spend TUNNEL_TRANSIT_T seconds hidden (u.tunnel = { t, exit }), then come out just behind the tunnel trench and walk on.
// Either side may use either tunnel; whoever holds the trench holds the tunnel.

import { G, hidden } from './state.js';
import { MAPS } from '../data/maps.js';
import { TUNNEL_TRANSIT_T, TUNNEL_DIV } from '../data/tunnel.js';
import { posX } from './geometry.js';
import { rideable, trainTime, walkSpeed } from './rail.js';

const homeOf = side => (side ? G.HQI : 0);
const fwdOf = side => (side ? -1 : 1);
/* where a unit leaving the tunnel at trench `exit` appears: just behind it, on its own side */
export const exitX = (side, exit) => G.LX[exit] - fwdOf(side) * 14;

/* the tunnel trenches of this map, [] where there are none */
export function tunnelLines() {
  if (!MAPS[G.MAP] || !MAPS[G.MAP].tunnels) return [];
  const k = Math.round(G.NT / TUNNEL_DIV);
  return [k, G.HQI - k];
}

/* the tunnel trench `side` holds that serves ordered line L (L at or beyond it, toward the foe); the nearest to L
   when several do; -1 when none */
export function tunnelFor(side, L) {
  let best = -1;
  for (const T of tunnelLines()) {
    if (G.owner[T] !== side || (L - T) * fwdOf(side) < 0) continue;
    if (best < 0 || Math.abs(L - T) < Math.abs(L - best)) best = T;
  }
  return best;
}

/* does the tunnel get this fresh unit to its ordered line strictly sooner than walking or the train? */
export function tunnelBeats(u) {
  if (u.hp <= 0 || hidden(u) || !rideable(u)) return false;
  const exit = tunnelFor(u.side, u.line); if (exit < 0) return false;
  const tx = posX(u.side, u.line, u.y, u.park), v = walkSpeed(u);
  const tunnel = TUNNEL_TRANSIT_T + Math.abs(tx - exitX(u.side, exit)) / v;
  return tunnel < Math.abs(tx - u.x) / v && tunnel < trainTime(u, tx);
}

/* into the tunnel: hidden, parked at its own HQ until it comes out */
export function enterTunnel(u, exit) {
  u.tunnel = { t: TUNNEL_TRANSIT_T, exit };
  u.x = G.LX[homeOf(u.side)];
  u.settled = false; u.moving = false; u.waiting = false;
}

/* out at the tunnel trench, or at its own HQ when the trench was lost meanwhile; then it walks to its line */
function leave(u) {
  const exit = u.tunnel.exit; u.tunnel = undefined;
  u.x = G.owner[exit] === u.side ? exitX(u.side, exit) : G.LX[homeOf(u.side)] - fwdOf(u.side) * 14;
  u.settled = false; u.moving = false;
}

export function stepTunnels(dt) {
  for (const u of G.units) {
    if (!u.tunnel || u.hp <= 0) continue;
    u.tunnel.t -= dt;
    if (u.tunnel.t <= 0) leave(u);
  }
}

/* route choice for a fresh, non-placed unit with no direct start line: tunnel if it is strictly fastest */
export function routeSpawn(u) {
  if (!tunnelLines().length || !tunnelBeats(u)) return;
  enterTunnel(u, tunnelFor(u.side, u.line));
}
