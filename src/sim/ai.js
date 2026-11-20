// Enemy commander. Verbatim port of prototype lines 1197–1261; Math.random →
// seeded rng so every AI decision replays identically for a given seed.

import { NAT, AI_UNLOCK, AI_INCOME, AI_RAMP, AI_W } from '../data/nations.js';
import { SW } from '../data/superweapons.js';
import { ORDER, FORT_COST, maxFort, DEPOT_RATE, SUPER_INC, DBL_RATE } from '../data/units.js';
import { G, depots, dblHeld, nestCost, toast } from './state.js';
import { isTrench, ut, full, spawn, frontLine, power } from './geometry.js';
import { canDef, freeSlot, buildNest, buildDef } from './fortify.js';
import { swBlock, useSW, swCost } from './superweapons.js';
import { rng } from '../core/rng.js';
import { bus } from '../core/events.js';
import { baseIncome, tier, nextCost, raise } from './base.js';
import { gunBlock, fireGun, bestTarget } from './gun.js';
import { GUNS, AI_GUN_SHARE } from '../data/guns.js';
import { BASE, AI_BASE_SHARE } from '../data/base.js';

const aiCost = k => Math.round(ut(1, k).cost * G.M[1].cost[k]);

export function aiStep(dt) {
  const ai = G.ai;
  const inc = (AI_INCOME * (1 + G.S.t / AI_RAMP) * (G.nation[1] === 'us' ? Math.min(1.8, 0.75 + G.S.t / 400) : G.nation[1] === 'aq' ? Math.min(2, 0.6 + G.S.t / 300) : 1) + depots(1) * DEPOT_RATE + (G.owner[G.SUPER] === 1 ? SUPER_INC : 0) + dblHeld(1) * DBL_RATE + baseIncome(1)) * dt;
  const share = G.S.t >= 150 && BASE_ROT.some(i => tier(1, i) < 3) ? AI_BASE_SHARE : 0;
  const gshare = G.S.t >= 60 && GUNS[G.nation[1]] ? AI_GUN_SHARE : 0;
  ai.fund += inc * share; ai.money += inc * (1 - share - gshare);
  if (gshare) {
    const d = GUNS[G.nation[1]]; ai.gunFund += inc * gshare;
    if (ai.gunFund > d.cost * 2) { ai.money += ai.gunFund - d.cost * 2; ai.gunFund = d.cost * 2; }
  }
  ai.buyT -= dt;
  if (ai.buyT <= 0) {
    ai.buyT = 0.5;
    if (!aiBase()) {
      const F = ai.F, canBuild = isTrench(F) && G.owner[F] === 1;
      if (!ai.want && G.S.t > 60 && canBuild && rng.float() < 0.05) {
        if (G.fort[F] < maxFort(F) && FORT_COST[G.fort[F]] <= ai.money * 2 + 80 && rng.float() < 0.5) ai.want = 'fort';
        else if (canDef(1, F) && rng.float() < 0.5) ai.want = 'def';
        else if (freeSlot(F) >= 0) ai.want = 'nest';
      }
      if (!ai.want && G.S.t > 240 && SW[G.nation[1]] && !swBlock(1) && (SW[G.nation[1]].cost < 1500 || ai.money >= swCost(1) * 0.6) && rng.float() < 0.025) ai.want = 'sw';
      if (ai.want === 'sw') {
        if (swBlock(1)) ai.want = null;
        else if (ai.money >= swCost(1)) { if (useSW(1)) ai.money -= swCost(1); ai.want = null; }
      } else if (ai.want === 'fort') {
        if (!canBuild || G.fort[F] >= maxFort(F)) ai.want = null;
        else if (ai.money >= FORT_COST[G.fort[F]]) { ai.money -= FORT_COST[G.fort[F]]; G.fort[F]++; ai.want = null; }
      } else if (ai.want === 'nest') {
        if (!canBuild || freeSlot(F) < 0) ai.want = null;
        else if (ai.money >= nestCost(1)) { ai.money -= nestCost(1); buildNest(1, F); ai.want = null; }
      } else if (ai.want === 'def') {
        const dc = NAT[G.nation[1]].def.cost;
        if (!canBuild || !canDef(1, F)) ai.want = null;
        else if (ai.money >= dc) { ai.money -= dc; buildDef(1, F); ai.want = null; }
      } else {
        if (!ai.want) {
          let tot = 0; const ok = ORDER.filter(k => ut(1, k) && G.S.t >= AI_UNLOCK[k] && !full(1, k) && aiCost(k) <= ai.money * 2 + 60);
          for (const k of ok) tot += AI_W[k];
          let r = rng.float() * tot; for (const k of ok) { r -= AI_W[k]; if (r <= 0) { ai.want = k; break; } }
        }
        if (!ai.want || full(1, ai.want)) ai.want = null;
        else if (ai.money >= aiCost(ai.want)) { ai.money -= aiCost(ai.want); spawn(1, ai.want, aiLine()); ai.want = null; }
      }
    }
    aiGun();
  }
  ai.thinkT -= dt;
  if (ai.thinkT <= 0) { ai.thinkT = 3; aiThink(); }
}

// HQ gun: after 60 s, when ready and the gun fund covers the shot, fire at the richest cluster in reach.
// Cheap checks first; the only rng draw is the last gate.
function aiGun() {
  const ai = G.ai, d = GUNS[G.nation[1]];
  if (!d || G.S.t < 60 || gunBlock(1) || ai.gunFund < d.cost) return;
  const t = bestTarget(1);
  if (!t || t.value < d.cost || rng.float() >= 0.25) return;
  ai.gunFund -= d.cost; fireGun(1, t.x, t.y);
}

const BASE_GAP = 90; // seconds between enemy base purchases
const BASE_ROT = ['walls', 'nat', 'depot', 'hosp'];
// Level base upgrades, paid from a separate fund that takes a share of income after 150 s, so
// unit buying never pauses. Buys the lowest tier in rotation when the fund covers it. No rng.
function aiBase() {
  const ai = G.ai;
  if (G.S.t < ai.baseT) return false;
  const low = Math.min(...BASE_ROT.map(i => tier(1, i)));
  const id = BASE_ROT.find(i => tier(1, i) === low);
  const cost = nextCost(1, id);
  if (cost === null || ai.fund < cost) return false;
  ai.fund -= cost; raise(1, id); bus.emit('hud'); ai.baseT = G.S.t + BASE_GAP;
  const name = id === 'nat' ? BASE[G.nation[1]].name : BASE[id].name;
  toast('The enemy has raised its ' + name + ' to tier ' + tier(1, id) + '.');
  return true;
}

export function aiLine() { return G.ai.F; }

export function aiThink() {
  const ai = G.ai;
  const pf = frontLine();
  let held = 0, ps = 0; for (const u of G.units) if (u.line === ai.F && u.settled && !u.fixed) { if (u.side) held++; else ps++; }
  if (!held && G.S.t - ai.lastAdv > 12 && (ps > 0 || pf > ai.F)) ai.F = Math.min(G.HQI, pf + 1);
  const F = ai.F, us = G.units.filter(u => u.side === 1 && !u.fixed);
  for (const u of us) u.line = F;
  let engaged = 0; for (const u of G.units) if (u.side === 0 && u.line === F && Math.abs(u.x - G.LX[F]) < 260) engaged++;
  if (!us.length || F <= 0 || engaged > 0) return;
  let ready = 0, mine = 0;
  for (const u of us) { if (u.settled) ready++; mine += u.T.cost; }
  const T = F - 1, foe = power(0, T) + (T === 0 ? 140 : 0), beyond = T > 0 ? power(0, T - 1) : 0, since = G.S.t - ai.lastAdv;
  if (foe > 0 && F < G.HQI && since > 8 && mine < foe * 0.45) { ai.F = F + 1; for (const u of us) u.line = F + 1; ai.lastAdv = G.S.t; return; }
  if (ready < us.length * 0.7) return;
  let go;
  if (foe > 0) go = mine > foe * Math.max(1, ai.aggr - G.S.t / 300) && since > 15;
  else if (beyond > 0) go = mine >= beyond * 0.8 && since > 20;
  else go = mine >= 80 && since > 10;
  if (!go) return;
  ai.F = T; for (const u of us) u.line = T;
  ai.lastAdv = G.S.t; ai.aggr = 2 + rng.float() * 0.9;
  if (foe > 0) toast(T === 0 ? 'The enemy is storming your HQ.' : 'The enemy is attacking trench ' + T + '.');
}
