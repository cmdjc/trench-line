// Base upgrade tiers. Browser-free, no rng draws. `id` is a shared id
// (walls, depot, hosp) or 'nat' for the nation's own track.

import { bus } from '../core/events.js';
import { BASE_COST, WALLS_HP, HOSP_HEAL, LIB_GROWTH, LIB_TANK, KUK_DMG, KUK_HP, VOIE_SPEED } from '../data/base.js';
import { ORDER, TK } from '../data/units.js';
import { G } from './state.js';

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
