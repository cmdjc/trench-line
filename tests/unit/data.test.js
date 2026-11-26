import { TRAINS, ARMOR_TRAINS, AI_ARMOR_END, RAIL_Y, TRACK_COST, REPAIR_COST, TRAIN_SLOTS, TRIP_SUPPLY, WOUNDED, BIG_SPLASH, AI_RAIL_T, AI_RAIL_SHARE } from '../../src/data/rail.js';
import { WH, SLOTS, SLOTS5 } from '../../src/data/units.js';
import { expect, it } from 'vitest';
import { NATS, NAT } from '../../src/data/nations.js';
import { STATS, tkList, tkPrev, SPECIAL, UT, NU, CHILL_MULT, CHILL_DUR, WORKSHOP_HEAL } from '../../src/data/units.js';
import { CARDS, CARDTXT } from '../../src/data/cards.js';
import { TECH, TECH_IDS } from '../../src/data/tech.js';
import { MAPS } from '../../src/data/maps.js';
import { BASE, baseIds, FOUNDRY_HEAL, FOUNDRY_CD, FOUNDRY_HP } from '../../src/data/base.js';
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
  const T = { gb: [3, 40, 8, 3], de: [6, 50, 10, 1], fr: [5, 60, 12, 4], us: [9, 90, 20, 1], ah: [4, 50, 10, 1], aq: [3, 35, 10, 5], it: [3, 120, 30, 1], ru: [5, 80, 25, 6], sx: [5, 70, 16, 2] };
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
  sx: 'Sächsische Feldbahn',
};
it('rail constants have the agreed values', () => {
  expect({ TRACK_COST, REPAIR_COST, TRAIN_SLOTS, TRIP_SUPPLY, WOUNDED, BIG_SPLASH, AI_RAIL_T, AI_RAIL_SHARE })
    .toEqual({ TRACK_COST: 20, REPAIR_COST: 20, TRAIN_SLOTS: 3, TRIP_SUPPLY: 15, WOUNDED: 0.4, BIG_SPLASH: 60, AI_RAIL_T: 90, AI_RAIL_SHARE: 0.15 });
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

const ARMOR_BASE = { cost: 380, hp: 600, speed: 138, dmg: 25, cd: 1.6, range: 260, splash: 20 };
const ARMOR_MG_BASE = { dmg: 5, cd: 0.2, range: 280 };
const ARMOR_NAMES = {
  gb: 'Naval armoured train', de: 'Panzerzug', fr: 'Train blindé', ru: 'Zaamurets armoured train',
  us: 'Liberty armored train', ah: 'k.u.k. Panzerzug', it: 'Treno armato', aq: 'Iron Penguin',
  sx: 'Sächsischer Panzerzug',
};
it('every nation has an armoured train entry', () => {
  for (const n of NATS) expect(ARMOR_TRAINS[n], n).toBeTruthy();
  expect(Object.keys(ARMOR_TRAINS).sort()).toEqual([...NATS].sort());
});
it('armoured train names match the national names', () => {
  for (const n of NATS) expect(ARMOR_TRAINS[n].name, n).toBe(ARMOR_NAMES[n]);
});
it('armoured train stats are within 15% of base', () => {
  for (const n of NATS) {
    const T = ARMOR_TRAINS[n];
    for (const k in ARMOR_BASE) {
      expect(typeof T[k], `${n}.${k}`).toBe('number');
      expect(T[k], `${n}.${k}`).toBeGreaterThanOrEqual(ARMOR_BASE[k] * 0.85);
      expect(T[k], `${n}.${k}`).toBeLessThanOrEqual(ARMOR_BASE[k] * 1.15);
    }
    for (const k in ARMOR_MG_BASE) {
      expect(typeof T.mg[k], `${n}.mg.${k}`).toBe('number');
      expect(T.mg[k], `${n}.mg.${k}`).toBeGreaterThanOrEqual(ARMOR_MG_BASE[k] * 0.85);
      expect(T.mg[k], `${n}.mg.${k}`).toBeLessThanOrEqual(ARMOR_MG_BASE[k] * 1.15);
    }
    expect(Number.isInteger(T.cost), `${n} cost integer`).toBe(true);
    expect(T.shell, n).toBe(0.25);
    expect(T.mg.acc, n).toBe(0.5);
  }
});
it('AI_ARMOR_END is 2', () => {
  expect(AI_ARMOR_END).toBe(2);
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
it('chill constants', () => {
  expect([CHILL_MULT, CHILL_DUR]).toEqual([0.6, 4]);
});
it('antarctica heavy tanks are detuned', () => {
  expect(STATS.aq.tkM).toEqual(expect.objectContaining({ cost: 650, hp: 1400, dmg: 40, splash: 24, speed: 18, cd: 1.4, range: 260, w: 3.5 }));
  expect(STATS.aq.tkH).toEqual(expect.objectContaining({ cost: 850, hp: 2100, dmg: 52, splash: 27, speed: 16, cd: 1.8, range: 280, w: 5, big: true }));
  expect(STATS.aq.tkS).toEqual(expect.objectContaining({ cost: 1650, hp: 4900, dmg: 90, splash: 36, speed: 13, cd: 2.3, range: 360, w: 8, big: true }));
});
it('ross and weddell are untouched', () => {
  expect(STATS.aq.tkL).toEqual(expect.objectContaining({ cost: 160, hp: 380, dmg: 6, cd: 0.17, range: 270, speed: 30, w: 1, atk: 'mg', shell: 0, splash: 0 }));
  expect(STATS.aq.tank).toEqual(expect.objectContaining({ cost: 460, hp: 950, dmg: 36, cd: 1.5, range: 240, splash: 22, speed: 20, w: 2, atk: 'tank', shell: 0.25, mg: { dmg: 5, cd: 0.22, range: 210, acc: 0.5 } }));
});
it('southern colossus is untouched', () => {
  expect(SPECIAL.colossus).toEqual(expect.objectContaining({ cost: 2500, hp: 9000, dmg: 120, cd: 2.0, range: 400, splash: 50, speed: 9, atk: 'tank', shell: 0.25 }));
});
it('antarctica tank line keeps its unlock order', () => {
  expect(tkList('aq')).toEqual(['tkL', 'tank', 'tkM', 'tkH', 'tkS']);
});
it('the pole stays the toughest tank in the game', () => {
  const classes = ['tkL', 'tank', 'tkM', 'tkH', 'tkS'];
  for (const n of NATS) {
    if (n === 'aq') continue;
    const max = Math.max(...classes.filter(k => STATS[n][k]).map(k => STATS[n][k].hp));
    expect(STATS.aq.tkS.hp, n).toBeGreaterThan(max);
  }
  expect(STATS.de.tkS.hp).toBe(4500);
  expect(STATS.aq.tkS.hp).toBe(4900);
});
it('antarctica blurb describes the chill', () => {
  expect(NAT.aq.blurb).toBe('Defence: bunkers, two to a trench, that shelter six troops each. The bunker must be destroyed before they can be hurt. Only 20 fragile infantry, but 20 places for big snow-white tanks whose shells chill whatever they hit, infantry and tanks alike, slowing it down for a few seconds. Starts poor, but income grows faster than anyone’s. Superweapon: ' + (SW.aq ? SW.aq.name : 'Tsar Tank') + '.');
});

it('saxony is the ninth nation', () => {
  expect(NATS.at(-1)).toBe('sx');
  expect(NATS.length).toBe(9);
  expect(NAT.sx).toEqual(expect.objectContaining({
    name: 'Saxon Dominion', style: 'stahl', inf: 20, tanks: 8, nest: 'nest',
    def: { kind: 'workshop', label: 'Repair workshop', cost: 110 },
  }));
  expect(NAT.sx.blurb).toBe(
    'Defence: repair workshops that mend mechs dug in at their trench. Only 20 infantry, tougher and slower than most, and the Rammstoßtrupp lobs mortar bombs at range and rams anything that gets inside them. Its armour walks: boxy mechs on jointed legs, from the little Kobold through the long-range Erlkönig to the Eisenhans fortress.' +
    ' Superweapon: Rübezahl.'
  );
});

it('saxon infantry stay within 15% of base', () => {
  for (const k of ['rifle', 'mg', 'sniper', 'mortar']) {
    for (const f in NU.sx[k]) {
      if (typeof NU.sx[k][f] !== 'number') continue;
      expect(STATS.sx[k][f], `sx.${k}.${f}`).toBeGreaterThanOrEqual(UT[k][f] * 0.85);
      expect(STATS.sx[k][f], `sx.${k}.${f}`).toBeLessThanOrEqual(UT[k][f] * 1.15);
    }
  }
  expect(STATS.sx.rifle).toEqual(expect.objectContaining({ name: 'Grenadier', pl: 'Grenadiers', cost: 22, hp: 46, speed: 40 }));
  expect(STATS.sx.mg).toEqual(expect.objectContaining({ name: 'Dreyse gunner', pl: 'Dreyse gunners', cost: 64, hp: 51, speed: 28 }));
  expect(STATS.sx.sniper).toEqual(expect.objectContaining({ name: 'Jäger', pl: 'Jäger', cost: 60, hp: 34, speed: 37 }));
  expect(STATS.sx.mortar).toEqual(expect.objectContaining({ name: 'Granatwerfer crew', pl: 'Granatwerfer crews', cost: 98, hp: 40, speed: 27 }));
});

it('the rammstosstrupp is a mortar with a ram for its dead zone', () => {
  expect(STATS.sx.raider).toEqual(expect.objectContaining({ atk: 'mortar', min: 90, shell: 1.1, splash: 28, arc: 1, shield: 0.7, hp: 90, cost: 70 }));
  const T = STATS.sx.raider;
  expect(T.ram).toEqual({ dmg: 24, cd: 1.2, range: 90, acc: 0.8, atk: 'raider', heavy: 2 });
  expect(T.ram.range).toBe(T.min);
  expect(T.moveFire).toBeFalsy();
  for (const n of NATS) for (const k in STATS[n]) if (k !== 'raider' || n !== 'sx') expect(STATS[n][k].ram, `${n}.${k}`).toBeUndefined();
  for (const k in SPECIAL) expect(SPECIAL[k].ram, k).toBeUndefined();
});

it('no saxon text says raider', () => {
  expect(STATS.sx.raider.name).not.toMatch(/raider/i);
  expect(STATS.sx.raider.pl).not.toMatch(/raider/i);
  expect(STATS.sx.raider.role).not.toMatch(/raider/i);
  expect(CARDTXT.sx.u_raider[0]).not.toMatch(/raider/i);
  expect(CARDTXT.sx.u_raider[1]).not.toMatch(/raider/i);
});

it('saxon mechs', () => {
  expect(STATS.sx.tkL).toEqual(expect.objectContaining({ name: 'Kobold', pl: 'Kobolds', cost: 85, hp: 160, dmg: 5, cd: 0.2, range: 220, speed: 44, w: 0.5, armor: true, atk: 'mg', shell: 0 }));
  expect(STATS.sx.tank).toEqual(expect.objectContaining({ name: 'Krampus', pl: 'Krampus mechs', cost: 300, hp: 650, dmg: 30, cd: 1.5, range: 240, splash: 22, speed: 19, w: 1, armor: true }));
  expect(STATS.sx.tkM).toEqual(expect.objectContaining({ name: 'Erlkönig', pl: 'Erlkönig mechs', cost: 430, hp: 360, dmg: 60, cd: 4.2, range: 620, splash: 36, speed: 16, w: 1.5, atk: 'mortar', min: 140, shell: 1.8, arc: 2, cov: 0.75, moveFire: false, armor: true }));
  expect(STATS.sx.tkH).toEqual(expect.objectContaining({ name: 'Eisenhans', pl: 'Eisenhans mechs', cost: 720, hp: 2000, dmg: 46, cd: 1.6, range: 260, splash: 26, speed: 11, w: 3, armor: true }));
  expect(tkList('sx')).toEqual(['tkL', 'tank', 'tkM', 'tkH']);
  expect(tkPrev('sx', 'tkM')).toBe('tank');
  expect(tkPrev('sx', 'tkH')).toBe('tkM');
  for (const k of ['tkL', 'tank', 'tkM', 'tkH']) {
    expect(STATS.sx[k].big, k).toBeFalsy();
    expect(STATS.sx[k].draw.tr).toEqual([]);
    expect(STATS.sx[k].draw.legs.length).toBeGreaterThan(0);
  }
});

it('rübezahl', () => {
  expect(SPECIAL.ruebezahl).toEqual(expect.objectContaining({
    name: 'Rübezahl', cost: 1800, hp: 6000, dmg: 95, cd: 2.0, range: 360, splash: 42, speed: 9, big: true, sup: true,
    crush: 54, crushDps: 120, armor: true, atk: 'tank', shell: 0.25,
  }));
  expect(SPECIAL.ruebezahl.hp).toBeGreaterThan(SPECIAL.tsar.hp);
  expect(SPECIAL.ruebezahl.hp).toBeLessThan(SPECIAL.colossus.hp);
  expect(SW.sx).toEqual({ kind: 'ruebezahl', name: 'Rübezahl', cost: 1800, cd: 140, text: SW.sx.text });
  expect(SW.sx.text).toContain((6000).toLocaleString('en'));
});

it('workshop', () => {
  expect(SPECIAL.workshop).toEqual({ name: 'Repair workshop', cost: 110, hp: 240, dmg: 0, cd: 9, range: 0, acc: 0, speed: 0, nest: true, noFire: true, workshop: true });
  expect(WORKSHOP_HEAL).toBe(6);
});

it('sx base tier, foundry constants', () => {
  expect(BASE.sx.name).toBe('Ore Mountain Foundry');
  expect([FOUNDRY_HEAL, FOUNDRY_CD, FOUNDRY_HP]).toEqual([1.5, 100, 1.3]);
});
