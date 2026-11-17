// Card behaviour (prototype 1262–1342): pool gates, weighted offers as sim-side
// state, and take() effects. The overlay itself is UI; the sim announces each
// offer with exactly one `cards:offer` event and re-offers while choices stay
// pending. relabelCards lives in state.js (Task 5).
import { CARDS } from '../data/cards.js';
import { G } from './state.js';
import { ut, spawn, tkCan, anyTank } from './geometry.js';
import { has } from './meta.js';
import { rng } from '../core/rng.js';
import { bus } from '../core/events.js';

/* Offer gates keyed by card id (prototype `can` closures, 1270–1285).
 * data/cards.js keeps the declarative `canId` hint on plate; the u_tk* gates
 * follow the id convention. */
const CAN = {
  plate: anyTank,
  u_tkL: () => tkCan('tkL'),
  u_tkM: () => tkCan('tkM'),
  u_tkH: () => tkCan('tkH'),
  u_tkS: () => tkCan('tkS'),
};

export function cardPool() {
  return CARDS.filter(c => !(c.once && G.S.taken[c.id])
    && !(CAN[c.id] && !CAN[c.id]())
    && !(c.id === 'u_tank' && G.S.unlocked.tank));
}

/* take() effects (prototype 1264–1286). buildBuy() → dirty:buy. */
const TAKE = {
  draft: () => { for (let i = 0, n = Math.round(80 / ut(0, 'rifle').cost); i < n; i++) spawn(0, 'rifle', G.sel); },
  gunsec: () => { for (let i = 0; i < 2; i++) spawn(0, 'mg', G.sel); },
  u_raider: () => { G.S.unlocked.raider = true; spawn(0, 'raider', G.sel); spawn(0, 'raider', G.sel); bus.emit('dirty:buy'); },
  u_sniper: () => { G.S.unlocked.sniper = true; spawn(0, 'sniper', G.sel); bus.emit('dirty:buy'); },
  u_mortar: () => { G.S.unlocked.mortar = true; spawn(0, 'mortar', G.sel); bus.emit('dirty:buy'); },
  u_tank: () => { G.S.unlocked.tank = true; bus.emit('dirty:buy'); },
  u_tkL: () => { G.S.unlocked.tkL = true; bus.emit('dirty:buy'); },
  u_tkM: () => { G.S.unlocked.tkM = true; bus.emit('dirty:buy'); },
  u_tkH: () => { G.S.unlocked.tkH = true; bus.emit('dirty:buy'); },
  u_tkS: () => { G.S.unlocked.tkS = true; bus.emit('dirty:buy'); },
  bonds: () => { G.M[0].income += 1.5; },
  spoils: () => { G.M[0].bounty += 0.5; },
  musket: () => { G.M[0].dmg.rifle *= 1.2; G.M[0].dmg.sniper *= 1.2; },
  dugout: () => { G.M[0].cover *= 0.8; },
  helmet: () => { G.M[0].hp *= 1.2; for (const u of G.units) if (u.side === 0 && !u.T.armor) { u.hp *= 1.2; u.max *= 1.2; } },
  march: () => { G.M[0].speed *= 1.2; },
  belt: () => { G.M[0].cd.mg *= 0.8; },
  cheap: () => { G.M[0].cost.rifle *= 0.8; bus.emit('dirty:buy'); },
  hq: () => { G.bases[0].max += 500; G.bases[0].hp += 500; G.bases[0].dmg *= 1.3; },
  barrage: () => { G.M[0].barrage += G.M[0].barrage ? 2 : 3; },
  medic: () => { G.M[0].heal += 1.5; },
  plate: () => { G.M[0].tankHp *= 1.3; for (const u of G.units) if (u.side === 0 && u.T.armor) { u.hp *= 1.3; u.max *= 1.3; } },
  train: () => { G.S.supplies += 150; },
};

/* Weighted pick without replacement (prototype 1321–1329). Pure: takes the
 * rng so tests can walk exact weight boundaries. Returns card ids. */
export function buildOffer(rngLike = rng) {
  const pool = cardPool();
  const out = [], want = has('intel') ? 4 : 3;
  if (has('corps') && G.S.cards === 0) {
    const i = pool.findIndex(c => c.id === 'u_tank');
    if (i >= 0) out.push(pool.splice(i, 1)[0]);
  }
  while (out.length < want && pool.length) {
    let tot = 0;
    for (const c of pool) tot += c.w;
    let r = rngLike.float() * tot, i = 0;
    for (; i < pool.length - 1; i++) { r -= pool[i].w; if (r <= 0) break; }
    out.push(pool.splice(i, 1)[0]);
  }
  return out.map(c => c.id);
}

/* Offer state machine: exactly one live offer at a time; the tick re-opens
 * offers while choices stay pending. Announced once per offer via cards:offer. */
export function offerCards(rngLike = rng) {
  if (G.offer) return G.offer.ids;
  const ids = buildOffer(rngLike);
  G.offer = { ids };
  bus.emit('cards:offer', ids);
  return ids;
}

/* True when the tick should open a new offer (prototype 1571:
 * `S.pending > 0 && card overlay hidden`). */
export const pendingOffer = () => G.S.pending > 0 && !G.offer;

export function takeCard(id) {
  if (!G.offer || !G.offer.ids.includes(id)) return false;
  TAKE[id]();
  G.S.taken[id] = (G.S.taken[id] || 0) + 1;
  G.S.cards++;
  G.S.pending--;
  G.offer = null;
  bus.emit('hud');
  if (G.S.pending > 0) offerCards();
  return true;
}
