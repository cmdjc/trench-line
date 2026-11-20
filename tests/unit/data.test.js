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
