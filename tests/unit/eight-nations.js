// Guard-fixture helper (not a test file). Pins the eight nations' data and a
// handful of seeded replays from the pre-Saxony tree, so later tasks that add
// the ninth nation (Saxon Dominion) can prove the existing eight stay
// byte-identical. See tests/unit/eight-nations.test.js.

import { STATS, SPECIAL, UT, TKB, ARM, COV, NESTCOV } from '../../src/data/units.js';
import { NAT, AI_W, AI_UNLOCK } from '../../src/data/nations.js';
import { SW } from '../../src/data/superweapons.js';
import { GUNS } from '../../src/data/guns.js';
import { TRAINS, ARMOR_TRAINS } from '../../src/data/rail.js';
import { CARDTXT } from '../../src/data/cards.js';
import { BASE } from '../../src/data/base.js';
import { newGame, G } from '../../src/sim/state.js';
import { tick } from '../../src/sim/tick.js';
import { rng } from '../../src/core/rng.js';

export const OLD = ['gb', 'de', 'fr', 'ru', 'us', 'ah', 'it', 'aq'];

const SPECIAL_KEYS = ['tommy', 'carrier', 'guncarrier', 'nest', 'pillbox', 'tsar', 'char2c', 'depot', 'pit75', 'pit65', 'bunker', 'colossus'];
const BASE_KEYS = ['walls', 'depot', 'hosp', ...OLD];

function pick(obj, keys) {
  const o = {};
  for (const k of keys) o[k] = obj[k];
  return o;
}

export function dataSnapshot() {
  return JSON.parse(JSON.stringify({
    STATS: pick(STATS, OLD),
    NAT: pick(NAT, OLD),
    SW: pick(SW, OLD),
    GUNS: pick(GUNS, OLD),
    TRAINS: pick(TRAINS, OLD),
    ARMOR_TRAINS: pick(ARMOR_TRAINS, OLD),
    CARDTXT: pick(CARDTXT, OLD),
    SPECIAL: pick(SPECIAL, SPECIAL_KEYS),
    BASE: pick(BASE, BASE_KEYS),
    UT,
    TKB,
    ARM,
    COV,
    NESTCOV,
    AI_W,
    AI_UNLOCK,
  }));
}

export function replayDigest(me, foe, map, seed, secs) {
  newGame(me, foe, map, seed);
  const steps = Math.round(secs / 0.04);
  for (let i = 0; i < steps; i++) tick(0.04);
  return {
    t: G.S.t,
    bases: G.bases.map(b => b.hp),
    owner: [...G.owner],
    units: G.units.map(u => [u.type, u.side, u.line, u.x, u.y, u.hp]),
    next: rng.float(),
  };
}

export function guard() {
  const data = dataSnapshot();
  return {
    data,
    replays: {
      'gb-de-open-7': replayDigest('gb', 'de', 'open', 7, 120),
      'aq-it-river-3': replayDigest('aq', 'it', 'river', 3, 120),
      'ru-fr-plain-5': replayDigest('ru', 'fr', 'plain', 5, 120),
      'us-ah-march-2': replayDigest('us', 'ah', 'march', 2, 120),
    },
  };
}
