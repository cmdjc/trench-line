// Base upgrade tiers. Browser-free, no rng draws. `id` is a shared id
// (walls, depot, hosp) or 'nat' for the nation's own track.

import { bus } from '../core/events.js';
import { DEPOT_INC, VOIE_INC, LIB_DEPOT, WALLS_REPAIR, KUK_CAP, BASE_COST, WALLS_HP, HOSP_HEAL, LIB_GROWTH, LIB_TANK, KUK_DMG, KUK_HP, VOIE_SPEED, TELE_RANGE, CONSCRIPT, CONVOY_T, CONVOY_N } from '../data/base.js';
import { ORDER, TK, DEPOT_RATE } from '../data/units.js';
import { NAT } from '../data/nations.js';
import { G, depots, toast } from './state.js';
import { spawn, full, ut, isTrench } from './geometry.js';

export const tier = (side, id) => G.base[side][id];
export const nextCost = (side, id) => { const t = tier(side, id); return t >= 3 ? null : BASE_COST[t]; };

export function raise(side, id) {
  const t = tier(side, id);
  if (t >= 3) return false;
  G.base[side][id] = t + 1;
  const m = G.M[side], b = G.bases[side];
  if (id === 'walls') { b.max += WALLS_HP; b.hp += WALLS_HP; }
  else if (id === 'hosp') m.heal += HOSP_HEAL;
  else if (id === 'nat') {
    const n = G.nation[side], T = t + 1;
    if (n === 'us' && T === 1 && side === 0) m.growth += LIB_GROWTH;
    else if (n === 'us' && T === 3) for (const k of TK) m.cost[k] = (m.cost[k] ?? 1) * LIB_TANK;
    else if (n === 'ah' && T === 1) for (const k of ORDER) { if (!TK.includes(k)) m.dmg[k] = (m.dmg[k] ?? 1) * KUK_DMG; }
    else if (n === 'ah' && T === 2) {
      m.hp *= KUK_HP;
      for (const u of G.units) if (u.side === side && !TK.includes(u.type)) { u.hp *= KUK_HP; u.max *= KUK_HP; }
    }
    else if (n === 'fr' && T === 1) m.speed *= VOIE_SPEED;
  }
  bus.emit('hud');
  return true;
}

// Extra supplies/s from base upgrades. The player's us T1 growth is already in
// G.M[0].growth; the AI has its own income formula, so it gets that term here.
export function baseIncome(side) {
  const n = G.nation[side];
  let v = DEPOT_INC * tier(side, 'depot');
  if (n === 'fr' && tier(side, 'nat') >= 2) v += VOIE_INC;
  if (n === 'us' && tier(side, 'nat') >= 2) v += depots(side) * DEPOT_RATE * (LIB_DEPOT - 1);
  if (side === 1 && n === 'us' && tier(side, 'nat') >= 1) v += LIB_GROWTH * G.S.t / 60;
  return v;
}

export const infCap = side => NAT[G.nation[side]].inf + (G.nation[side] === 'ah' && tier(side, 'nat') >= 3 ? KUK_CAP : 0);

// The line a fresh unit appears at (it teleferica, gb tunnels), or null to start from the HQ.
export function startLineFor(side, type, L) {
  if (!isTrench(L) || G.owner[L] !== side) return null;
  const n = G.nation[side], t = tier(side, 'nat'), inf = !ut(side, type).armor;
  if (n === 'it' && t >= 1 && (side ? G.HQI - L : L) <= TELE_RANGE[t] && (inf || t >= 3)) return L;
  if (n === 'gb' && t >= 3 && inf) return L;
  return null;
}

function freeRifles(side, n) {
  let k = 0;
  for (let i = 0; i < n; i++) if (!full(side, 'rifle')) { spawn(side, 'rifle', side ? G.ai.F : G.sel); k++; }
  return k;
}

export function stepBase(dt) {
  for (const side of [0, 1]) {
    const b = G.bases[side], bs = G.base[side], n = G.nation[side], t = tier(side, 'nat');
    if (tier(side, 'walls') >= 3 && b.hp > 0) b.hp = Math.min(b.max, b.hp + WALLS_REPAIR * dt);
    if (n === 'ru' && t >= 1) {
      bs.t += dt;
      const c = CONSCRIPT[t];
      while (bs.t >= c.t) { bs.t -= c.t; freeRifles(side, c.n); }
    }
    if (n === 'fr' && t >= 3) {
      bs.conv += dt;
      while (bs.conv >= CONVOY_T) {
        bs.conv -= CONVOY_T;
        if (freeRifles(side, CONVOY_N) && side === 0 && !G.base[0].convoyed) { G.base[0].convoyed = true; toast('A lorry convoy has brought fresh troops up the Voie Sacrée.'); }
      }
    }
  }
}
