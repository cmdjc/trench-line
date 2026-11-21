import { TRAINS, RAIL_Y, TRACK_COST, REPAIR_COST, TRAIN_SLOTS, TRIP_SUPPLY, WOUNDED, BIG_SPLASH, AI_RAIL_T, AI_RAIL_SHARE } from '../../src/data/rail.js';
import { WH, SLOTS, SLOTS5 } from '../../src/data/units.js';
import { expect, it } from 'vitest';
import { NATS, NAT } from '../../src/data/nations.js';
import { STATS, tkList, SPECIAL, UT } from '../../src/data/units.js';
import { CARDS, CARDTXT } from '../../src/data/cards.js';
import { TECH, TECH_IDS } from '../../src/data/tech.js';
import { MAPS } from '../../src/data/maps.js';
import { BASE, baseIds } from '../../src/data/base.js';
import { SW } from '../../src/data/superweapons.js';
import { GUNS } from '../../src/data/guns.js';

it('every nation has rifle, mg and at least one armour slot', () => {
  for (const n of NATS) {
    expect(STATS[n].rifle?.cost, n).toBeGreaterThan(0);
    expect(STATS[n].mg?.cost, n).toBeGreaterThan(0);
    expect(tkList(n).length, n).toBeGreaterThan(0);
  }
});
it('tkList is cheapest-first', () => {
  for (const n of NATS) { const l = tkList(n); for (let i = 1; i < l.length; i++) expect(STATS[n][l[i - 1]].cost).toBeLessThanOrEqual(STATS[n][l[i]].cost); }
});
it('card ids unique; CARDTXT keys are card ids; canId values known; TECH ids unique', () => {
  const ids = CARDS.map(c => c.id);
  expect(new Set(ids).size).toBe(ids.length);
  for (const n in CARDTXT) for (const id in CARDTXT[n]) expect(ids).toContain(id);
  for (const c of CARDS) if (c.canId) expect(['anyTank']).toContain(c.canId);
  const tids = TECH.flatMap(b => b.nodes.map(n => n.id));
  expect(new Set(tids).size).toBe(tids.length);
});
it('save-code mask order is pinned in full (append-only contract)', () => {
  expect(TECH_IDS()).toEqual(['marks','kit','craft','vets','deep','walls','guns','aid','stock','rail','econ','intel','mech','gunnery','works','corps','titan','bw1','bw2','bd1','bd2','bh1','bh2','bn1','bn2']);
});
it('every non-base damage unit declares atk or is a base type', () => {
  const base = new Set(Object.keys(UT));
  for (const n of NATS) for (const k in STATS[n]) { const T = STATS[n][k]; if (T?.dmg && !base.has(k)) expect(typeof T.atk, `${n}:${k}`).toBe('string'); }
  for (const k in SPECIAL) { const T = SPECIAL[k]; if (T.dmg && !base.has(k)) expect(typeof T.atk, k).toBe('string'); }
});
it('each nation has a superweapon; maps cover the four keys', () => {
  for (const n of NATS) expect(SW[n], n).toBeTruthy();
  expect(Object.keys(MAPS).sort()).toEqual(['march', 'open', 'plain', 'river']);
});

it('every nation has a base upgrade with 3 tier texts; baseIds lists shared + national', () => {
  for (const n of Object.keys(NAT)) {
    expect(BASE[n]?.name, n).toBeTruthy();
    expect(BASE[n].tiers.length).toBe(3);
    for (const t of BASE[n].tiers) expect(t).toMatch(/\.$/);
  }
  for (const k of ['walls', 'depot', 'hosp']) expect(BASE[k].tiers.length).toBe(3);
  expect(baseIds('ru')).toEqual(['walls', 'depot', 'hosp', 'ru']);
});

it('every nation has an HQ gun matching the design table', () => {
  const T = { gb: [3, 40, 8, 3], de: [6, 50, 10, 1], fr: [5, 60, 12, 4], us: [9, 90, 20, 1], ah: [4, 50, 10, 1], aq: [3, 35, 10, 5], it: [3, 120, 30, 1], ru: [5, 80, 25, 6] };
  expect(Object.keys(GUNS).sort()).toEqual(Object.keys(NAT).sort());
  for (const n in NAT) {
    const g = GUNS[n], [range, cost, cd, count] = T[n];
    expect(g.name, n).toBeTruthy();
    expect([g.range, g.cost, g.cd], n).toEqual([range, cost, cd]);
    expect(g.shells.length, n).toBe(count);
    for (const s of g.shells) for (const k of ['dmg', 'splash', 'cov', 'spread', 'delay', 'dur']) expect(typeof s[k], `${n}.${k}`).toBe('number');
  }
  expect(GUNS.it.shells[0]).toMatchObject({ dmg: 260, splash: 80 });
  expect(GUNS.ah.shells[0].cov).toBeGreaterThanOrEqual(0.9);
  expect(GUNS.ru.shells.every(s => s.spread >= 60)).toBe(true);
  expect(GUNS.gb.name).toBe('Stokes mortar battery');
});

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { ORDER } from '../../src/data/units.js';
import { AI_W } from '../../src/data/nations.js';
import { dropCost, DROP_MIX, DROP_MARKUP, DROP_RANGE, DROP_FALL, DROP_STAGGER, AI_DROP_T, DROP_SCRAMBLE, DROP_SCRAMBLE_ACC } from '../../src/data/drop.js';

it('US superweapon is the Airborne drop', () => {
  expect(SW.us.kind).toBe('drop');
  expect(SW.us.cost).toBe(341);
  expect(SW.us.cd).toBe(30);
  expect(SW.us.cost).toBe(dropCost());
});
it('drop constants and cost', () => {
  expect(DROP_MIX).toEqual([['tommy', 4], ['rifle', 2], ['mg', 2]]);
  expect([DROP_MARKUP, DROP_RANGE, DROP_FALL, DROP_STAGGER, AI_DROP_T, DROP_SCRAMBLE, DROP_SCRAMBLE_ACC]).toEqual([1.1, 3, 4, 1, 120, 5, 0.3]);
  expect(dropCost()).toBe(341);
});
it('Thompson gunner is a special, fall-firing, unbuyable unit', () => {
  expect(SPECIAL.tommy.fallFire).toBe(true);
  expect(SPECIAL.tommy.speed).toBe(STATS.us.rifle.speed);
  expect(ORDER).not.toContain('tommy');
  expect(Object.keys(AI_W)).not.toContain('tommy');
});
it('no source file mentions the bugs or Kettering', () => {
  const walk = d => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
  for (const f of walk('src')) {
    const s = readFileSync(f, 'utf8');
    expect(/['"`]bugs['"`]/.test(s), f).toBe(false);
    expect(/kettering/i.test(s), f).toBe(false);
  }
});

it('the drop range in the button text and the blocked reason both follow DROP_RANGE', async () => {
  expect(SW.us.text).toContain('up to ' + DROP_RANGE + ' trenches past your front');
  const { newGame, G } = await import('../../src/sim/state.js');
  const { swBlock } = await import('../../src/sim/superweapons.js');
  newGame('us', 'de', 'open', 7);
  G.units = G.units.filter(u => u.side === 0 && !u.fixed);
  for (let L = 1; L <= G.NT; L++) G.owner[L] = 0;
  expect(swBlock(0)).toBe('No enemy or empty trench within ' + DROP_RANGE + ' trenches of your front.');
});


const RAIL_BASE = { cost: 150, hp: 300, cap: 6, speed: 3 * STATS.gb.rifle.speed };
const RAIL_NAMES = {
  gb: 'Simplex light railway', de: 'Heeresfeldbahn', fr: 'Decauville train', us: 'Baldwin trench locomotive',
  ah: 'k.u.k. Feldbahn', it: 'Ferrovia da campo', ru: 'Narrow-gauge field train', aq: 'Penguin Express',
};
it('rail constants have the agreed values', () => {
  expect({ TRACK_COST, REPAIR_COST, TRAIN_SLOTS, TRIP_SUPPLY, WOUNDED, BIG_SPLASH, AI_RAIL_T, AI_RAIL_SHARE })
    .toEqual({ TRACK_COST: 20, REPAIR_COST: 20, TRAIN_SLOTS: 3, TRIP_SUPPLY: 15, WOUNDED: 0.4, BIG_SPLASH: 60, AI_RAIL_T: 90, AI_RAIL_SHARE: 0.10 });
});
it('every nation has a train entry', () => {
  for (const n of NATS) expect(TRAINS[n], n).toBeTruthy();
  expect(Object.keys(TRAINS).sort()).toEqual([...NATS].sort());
});
it('train names match the national names', () => {
  for (const n of NATS) expect(TRAINS[n].name, n).toBe(RAIL_NAMES[n]);
});
it('train stats are integers where required and within 15% of base', () => {
  for (const n of NATS) {
    const T = TRAINS[n];
    for (const k of ['cost', 'hp', 'cap', 'speed']) {
      expect(typeof T[k], `${n}.${k}`).toBe('number');
      expect(T[k], `${n}.${k}`).toBeGreaterThanOrEqual(RAIL_BASE[k] * 0.85);
      expect(T[k], `${n}.${k}`).toBeLessThanOrEqual(RAIL_BASE[k] * 1.15);
    }
    expect(Number.isInteger(T.cost), `${n} cost integer`).toBe(true);
    expect(Number.isInteger(T.cap), `${n} cap integer`).toBe(true);
  }
});
it('base train speed is three times the rifle walking speed', () => {
  expect(RAIL_BASE.speed).toBe(138);
});
it('RAIL_Y lies on the field, in the middle', () => {
  expect(RAIL_Y).toBeGreaterThanOrEqual(0);
  expect(RAIL_Y).toBeLessThanOrEqual(WH);
  expect(RAIL_Y).toBe(WH / 2);
});
it('emplacement slots clear the rail lane and stay on the field', () => {
  expect(SLOTS.length).toBe(3); expect(SLOTS5.length).toBe(5);
  for (const S of [SLOTS, SLOTS5]) {
    const ys = S.map(f => WH * f), m = (S.length - 1) / 2;
    for (let i = 1; i < ys.length; i++) expect(ys[i]).toBeGreaterThan(ys[i - 1]);
    expect(Math.abs(ys[m] - RAIL_Y)).toBeGreaterThanOrEqual(26);
    for (const i of [m - 1, m + 1]) expect(Math.abs(ys[m] - ys[i])).toBeGreaterThanOrEqual(24);
    for (const y of ys) { expect(y).toBeGreaterThanOrEqual(22); expect(y).toBeLessThanOrEqual(278); }
  }
});
