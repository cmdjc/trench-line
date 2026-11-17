// The simulation state container. Every piece of mutable state lives in the
// exported `G` object (the prototype's closure globals), so sim modules never
// hold their own copies. Port of prototype lines 234–241, 253, 623–639 (minus
// DOM), 653–693 (minus newGame/DOM). newGame arrives with geometry (Task 6).

import { MAPS } from '../data/maps.js';
import { NAT } from '../data/nations.js';
import { CARDS, CARDTXT } from '../data/cards.js';
import { ORDER, TK, utOf } from '../data/units.js';
import { DEPOT_RATE, DBL_RATE, SUPER_INC } from '../data/units.js';
import { bus } from '../core/events.js';
import { has } from './meta.js';

export const G = {
  /* layout (setLayout fills these in) */
  WW: 2600, NT: 9, HQI: 10, SUPER: -1, DBL: [],
  LX: (() => { const a = [150]; for (let i = 1; i <= 9; i++) a.push(150 + i * 230); a.push(2450); return a; })(),
  MAP: 'open', RIV: [],
  /* battle state (newGame builds these) */
  nation: ['gb', 'de'],
  S: null, M: null, units: null, bases: null, ai: null,
  sel: 1, owner: null,
  fort: new Array(11).fill(0), jobs: [], fields: [], garr: new Array(11).fill(0),
  sw: [{ cd: 0, tunnel: null }, { cd: 0, tunnel: null }],
  aim: null, planes: [], tracers: [], shells: [], booms: [], floats: [], scorch: [], smoke: [], wrecks: [],
  running: false, userPaused: false, speed: 1, uid: 1,
  shake: 0,
  offer: null,          /* card offer state machine (sim/cards.js) */
  reduceMotion: false,  /* UI sets this from matchMedia after boot */
};

export const fmt = x => String(Math.round(x * 10) / 10);
export const lineName = L => (L === 0 ? 'your HQ' : L === G.HQI ? 'the enemy HQ' : 'trench ' + L);
export const isDbl = L => G.DBL.indexOf(L) >= 0;
export const dblHeld = side => { let n = 0; for (const L of G.DBL) if (G.owner && G.owner[L] === side) n++; return n; };
export const depots = side => { let n = 0; for (const u of G.units) if (u.T.depot && u.side === side) n++; return n; };
export const incomeNow = () => G.M[0].income + G.M[0].growth * G.S.t / 60 + depots(0) * DEPOT_RATE + (G.owner && G.owner[G.SUPER] === 0 ? SUPER_INC : 0) + dblHeld(0) * DBL_RATE;
export const nestCost = side => utOf(G.nation[side], NAT[G.nation[side]].nest).cost;

export function setLayout(key) {
  const m = MAPS[key] || MAPS.open;
  G.LX.length = 0;
  if (m.belts) {
    const n = m.belts * m.per; let x = 150; G.LX.push(x);
    for (let i = 1; i <= n; i++) { x += i === 1 ? 230 : (((i - 1) % m.per) === 0 ? m.gap : m.tight); G.LX.push(x); }
    x += 230; G.LX.push(x); G.WW = x + 150; G.NT = n;
  } else {
    const n = m.n || 9; for (let i = 0; i <= n + 1; i++) G.LX.push(150 + i * 230); G.WW = G.LX[n + 1] + 150; G.NT = n;
  }
  G.HQI = G.NT + 1; G.SUPER = m.super ? Math.ceil(G.NT / 2) : -1; G.DBL = m.dbl || [];
}

export function mods() {
  const o = { dmg: {}, cd: {}, cost: {}, hp: 1, cover: 1, speed: 1, income: 3, growth: 0, bounty: 1, heal: 0, barrage: 0, tankHp: 1 };
  for (const k of ORDER.concat(['bunker', 'colossus', 'tsar', 'nest', 'pillbox', 'pit75', 'pit65', 'depot', 'char2c', 'carrier', 'guncarrier'])) { o.dmg[k] = 1; o.cd[k] = 1; o.cost[k] = 1; }
  return o;
}

export function applyTech() {
  const m = G.M[0];
  if (has('marks')) m.dmg.rifle *= 1.1;
  if (has('kit')) m.hp *= 1.1;
  if (has('craft')) m.speed *= 1.15;
  if (has('deep')) m.cover *= 0.92;
  if (has('walls')) { G.bases[0].max += 400; G.bases[0].hp += 400; }
  if (has('guns')) G.bases[0].dmg *= 1.4;
  if (has('aid')) m.heal += 1;
  if (has('stock')) G.S.supplies += 40;
  if (has('rail')) m.income += 0.4;
  if (has('econ')) m.bounty += 0.2;
  if (has('mech')) m.tankHp *= 1.1;
  if (has('gunnery')) { for (const k of TK) m.dmg[k] *= 1.1; m.dmg.mortar *= 1.1; }
  if (has('works')) for (const k of TK) m.cost[k] *= 0.9;
  if (has('titan')) G.S.unlocked.tkS = true;
}

/* Card relabelling per nation (prototype 1307–1320). Lives here, next to
 * G.nation, so sim/cards.js never needs to import state at module level. */
export function relabelCards() {
  for (const c of CARDS) { if (c.name0 === undefined) { c.name0 = c.name; c.text0 = c.text; } c.name = c.name0; c.text = c.text0; }
  const set = (id, name, text) => { const c = CARDS.find(x => x.id === id); if (name) c.name = name; c.text = text; };
  const r = utOf(G.nation[0], 'rifle'), cap = w => w[0].toUpperCase() + w.slice(1);
  set('draft', null, Math.round(80 / r.cost) + ' ' + r.pl + ' report to your HQ at once.');
  set('gunsec', null, '2 ' + utOf(G.nation[0], 'mg').pl + ' report to your HQ at once.');
  set('cheap', null, cap(r.pl) + ' cost 20% less.');
  set('musket', null, cap(r.pl) + ' and snipers deal 20% more damage.');
  const t = CARDTXT[G.nation[0]]; for (const id in t) set(id, t[id][0], t[id][1]);
  for (const [id, k, lab] of [['u_tkL', 'tkL', 'Light tank'], ['u_tkM', 'tkM', 'Medium-heavy tank'], ['u_tkH', 'tkH', 'Heavy tank'], ['u_tkS', 'tkS', 'Super-heavy tank']]) {
    const T = utOf(G.nation[0], k); if (!T) continue;
    set(id, (G.nation[0] === 'ah' ? 'Siege gun' : lab) + ': ' + T.name, 'Unlocks the ' + T.name + ': ' + T.role + ' It uses ' + fmt(T.w || 1) + ' of your ' + NAT[G.nation[0]].tanks + ' armour places.');
  }
}

/* sim→UI event shorthand used all over the port (prototype called toast()/refresh()/… directly) */
export const toast = msg => bus.emit('toast', msg);
