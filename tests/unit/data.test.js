import { expect, it } from 'vitest';
import { NATS } from '../../src/data/nations.js';
import { STATS, tkList, SPECIAL, UT } from '../../src/data/units.js';
import { CARDS, CARDTXT } from '../../src/data/cards.js';
import { TECH, TECH_IDS } from '../../src/data/tech.js';
import { MAPS } from '../../src/data/maps.js';
import { BASE, baseIds } from '../../src/data/base.js';
import { NAT } from '../../src/data/nations.js';
import { SW } from '../../src/data/superweapons.js';

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
