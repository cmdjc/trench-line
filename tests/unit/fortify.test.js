import { describe, it, expect, beforeEach } from 'vitest';
import { newGame, G } from '../../src/sim/state.js';
import { spawn } from '../../src/sim/geometry.js';
import * as FT from '../../src/sim/fortify.js';
import { WH, SLOTS, FORT_COST } from '../../src/data/units.js';
import { bus } from '../../src/core/events.js';

const toasts = [];
bus.on('toast', m => toasts.push(m));

describe('freeSlot', () => {
  beforeEach(() => { newGame('gb', 'de', 'open', 1); toasts.length = 0; });

  it('offers 3 slots on a normal trench, filled by nests then jobs', () => {
    expect(FT.freeSlot(2)).toBe(0);
    G.units.push({ T: { nest: true }, line: 2, slot: 0 });
    expect(FT.freeSlot(2)).toBe(1);
    G.jobs.push({ line: 2, slot: 1 });
    expect(FT.freeSlot(2)).toBe(2);
    G.units.push({ T: { nest: true }, line: 2, slot: 2 });
    expect(FT.freeSlot(2)).toBe(-1);
    expect(FT.freeSlot(3)).toBe(0);
  });

  it('offers 5 slots on a double trench', () => {
    newGame('fr', 'de', 'plain', 1);
    expect(G.DBL).toContain(4);
    for (let i = 0; i < 4; i++) G.units.push({ T: { nest: true }, line: 4, slot: i });
    expect(FT.freeSlot(4)).toBe(4);
    G.units.push({ T: { nest: true }, line: 4, slot: 4 });
    expect(FT.freeSlot(4)).toBe(-1);
  });
});

describe('buildNest + stepJobs', () => {
  beforeEach(() => { newGame('gb', 'de', 'open', 1); toasts.length = 0; });

  it('spawns a sapper job at slot coords; gun team after 4s; completes when the gun settles', () => {
    expect(FT.buildNest(0, 2)).toBe(true);
    expect(G.jobs).toHaveLength(1);
    const j = G.jobs[0];
    expect(j).toMatchObject({ side: 0, line: 2, slot: 0, stage: 0, make: 'nest' });
    expect(j.x).toBeCloseTo(G.LX[2] - 30);
    expect(j.y).toBeCloseTo(WH * SLOTS[0]);
    const sap = G.units.find(u => u.type === 'carrier');
    expect(sap.carry).toBe('bags');
    expect(sap.tx).toBeCloseTo(j.x - 7);
    expect(sap.fixed).toBe(true);

    j.sap.settled = true; // arrival is normally driven by stepUnits (Task 9)
    FT.stepJobs(0.05);
    expect(j.stage).toBe(1);

    FT.stepJobs(4); // gun team spawns after 4s; build timer passes 3s
    expect(j.gun && j.gun.type).toBe('guncarrier');
    expect(j.gun.carry).toBe('gun');
    expect(j.gun.tx).toBeCloseTo(j.x - 3);
    expect(j.stage).toBe(2);

    j.gun.settled = true;
    FT.stepJobs(0.05);
    expect(G.jobs).toHaveLength(0);
    const nest = G.units.find(u => u.type === 'nest');
    expect(nest).toBeTruthy();
    expect(nest.slot).toBe(0);
    expect(nest.x).toBeCloseTo(j.x);
    expect(nest.y).toBeCloseTo(j.y);
    expect(nest.fixed).toBe(true);
    expect(G.units.some(u => u.type === 'carrier' || u.type === 'guncarrier')).toBe(false);
    expect(toasts.at(-1)).toBe('MG nest ready at trench 2.');
  });

  it('abandons the job when the sapper dies, with a toast', () => {
    FT.buildNest(0, 2);
    G.jobs[0].sap.hp = 0;
    FT.stepJobs(0.05);
    expect(G.jobs).toHaveLength(0);
    expect(toasts.at(-1)).toBe('The crew building at trench 2 was killed. The work is abandoned.');
    expect(G.units.some(u => u.type === 'carrier')).toBe(false);
  });
});

describe('buildDef', () => {
  beforeEach(() => { toasts.length = 0; });

  it('gb: wire entanglement in front of the trench', () => {
    newGame('gb', 'de', 'open', 1);
    expect(FT.buildDef(0, 2)).toBe(true);
    const f = G.fields[0];
    expect(f).toMatchObject({ type: 'wire', side: 0, line: 2, w: 46, hp: 140 });
    expect(f.x).toBeCloseTo(G.LX[2] + 54);
  });

  it('ru: 10 live mines spread in front of the trench, deterministic per seed', () => {
    newGame('ru', 'gb', 'open', 1);
    expect(FT.buildDef(0, 2)).toBe(true);
    const f = G.fields[0];
    expect(f.type).toBe('mines');
    expect(f.mines).toHaveLength(10);
    for (const mn of f.mines) {
      expect(mn.x).toBeGreaterThanOrEqual(G.LX[2] + 40);
      expect(mn.x).toBeLessThanOrEqual(G.LX[2] + 80);
      expect(mn.y).toBeGreaterThan(16);
      expect(mn.y).toBeLessThan(WH - 16);
      expect(mn.live).toBe(true);
    }
    newGame('ru', 'gb', 'open', 1); // same seed, identical draw
    FT.buildDef(0, 2);
    expect(G.fields[0].mines).toEqual(f.mines);
  });

  it('fr and it: gun pit jobs (pit75 / pit65)', () => {
    newGame('fr', 'de', 'open', 1);
    FT.buildDef(0, 2);
    expect(G.jobs[0].make).toBe('pit75');
    newGame('it', 'de', 'open', 1);
    FT.buildDef(0, 2);
    expect(G.jobs[0].make).toBe('pit65');
  });

  it('us: depot job; a second depot in the same trench is blocked by canDef', () => {
    newGame('us', 'de', 'open', 1);
    expect(FT.canDef(0, 2)).toBe(true);
    FT.buildDef(0, 2);
    expect(G.jobs[0].make).toBe('depot');
    expect(FT.canDef(0, 2)).toBe(false);
    expect(FT.canDef(0, 3)).toBe(true);
  });

  it('aq: bunker jobs capped at two per trench by canDef', () => {
    newGame('aq', 'de', 'open', 1);
    expect(FT.canDef(0, 2)).toBe(true);
    FT.buildDef(0, 2);
    FT.buildDef(0, 2);
    expect(FT.bunkerCount(0, 2)).toBe(2);
    expect(FT.canDef(0, 2)).toBe(false);
  });

  it('nations without field defences (de, ah) can never build one', () => {
    newGame('de', 'gb', 'open', 1);
    expect(FT.canDef(0, 2)).toBe(false);
    newGame('ah', 'gb', 'open', 1);
    expect(FT.canDef(0, 2)).toBe(false);
    expect(FT.canDef(0, 0)).toBe(false); // HQ lines are not trenches
  });
});

describe('buildSuper', () => {
  it('spawns pillbox/pit75/pillbox at slots 0/1/2 with 1.6x hp', () => {
    newGame('gb', 'de', 'march', 1);
    const L = G.SUPER;
    expect(L).toBe(23);
    FT.buildSuper(0);
    const guns = G.units.filter(u => u.line === L && u.fixed);
    expect(guns.map(g => g.type)).toEqual(['pillbox', 'pit75', 'pillbox']);
    guns.forEach((g, i) => {
      expect(g.x).toBeCloseTo(G.LX[L] - 30);
      expect(g.y).toBeCloseTo(WH * SLOTS[i]);
      expect(g.slot).toBe(i);
      expect(g.hp).toBeCloseTo(g.T.hp * G.M[0].hp * 1.6);
      expect(g.max).toBeCloseTo(g.hp);
    });
    FT.buildSuper(1);
    const foe = G.units.filter(u => u.line === L && u.side === 1 && u.fixed);
    expect(foe).toHaveLength(3);
    expect(foe[0].x).toBeCloseTo(G.LX[L] + 30);
  });
});

describe('fortifyAt', () => {
  beforeEach(() => { newGame('gb', 'de', 'open', 1); toasts.length = 0; });

  it('charges FORT_COST once and raises the level on a held trench', () => {
    G.S.supplies = 500;
    FT.fortifyAt(1);
    expect(G.fort[1]).toBe(1);
    expect(G.S.supplies).toBe(500 - FORT_COST[0]);
    expect(toasts.at(-1)).toBe('Trench 1 fortified to level 1.');
  });

  it('rejects trenches you do not hold, without charging', () => {
    G.S.supplies = 500;
    FT.fortifyAt(2); // no man's land
    expect(G.fort[2]).toBe(0);
    expect(G.S.supplies).toBe(500);
    expect(toasts.at(-1)).toBe('You can only fortify a trench you hold.');
    G.owner[3] = 1;
    FT.fortifyAt(3);
    expect(G.fort[3]).toBe(0);
    expect(G.S.supplies).toBe(500);
  });

  it('rejects when supplies are short, without charging', () => {
    G.S.supplies = 10;
    FT.fortifyAt(1);
    expect(G.fort[1]).toBe(0);
    expect(G.S.supplies).toBe(10);
    expect(toasts.at(-1)).toBe('Fortifying trench 1 to level 1 needs 60 supplies.');
  });

  it('caps at level 3 (4 on the super trench)', () => {
    G.S.supplies = 9999;
    G.fort[1] = 3;
    FT.fortifyAt(1);
    expect(G.fort[1]).toBe(3);
    expect(toasts.at(-1)).toBe('Trench 1 is fully fortified.');

    newGame('gb', 'de', 'march', 1);
    toasts.length = 0;
    G.owner[G.SUPER] = 0;
    G.S.supplies = 9999;
    G.fort[G.SUPER] = 4;
    FT.fortifyAt(G.SUPER);
    expect(G.fort[G.SUPER]).toBe(4);
    expect(toasts.at(-1)).toBe('Trench 23 is fully fortified.');
    G.fort[G.SUPER] = 3;
    FT.fortifyAt(G.SUPER);
    expect(G.fort[G.SUPER]).toBe(4);
    expect(G.S.supplies).toBe(9999 - FORT_COST[3]);
  });

  it('ignores HQ lines and does nothing when the game is over', () => {
    G.S.supplies = 500;
    G.running = false;
    FT.fortifyAt(1);
    expect(toasts).toHaveLength(0);
    G.running = true;
    FT.fortifyAt(0);
    FT.fortifyAt(G.HQI);
    expect(toasts).toHaveLength(0);
    expect(G.S.supplies).toBe(500);
  });
});

describe('fields', () => {
  beforeEach(() => { newGame('ru', 'de', 'open', 1); toasts.length = 0; });

  it('mines detonate on nearby enemies with splash; dead fields are cleaned up', () => {
    FT.buildDef(0, 2);
    const f = G.fields[0];
    const mn = f.mines[0];
    const foe = spawn(1, 'rifle', 2);
    foe.x = mn.x + 1;
    foe.y = mn.y;
    const max = foe.hp;
    FT.stepFields();
    expect(mn.live).toBe(false);
    expect(foe.hp).toBeLessThan(max);
    expect(G.booms).toHaveLength(1);
    expect(f.mines.filter(m => m.live)).toHaveLength(9);
    for (const m of f.mines) m.live = false;
    FT.stepFields();
    expect(G.fields).toHaveLength(0);
  });

  it('wire slows enemies to 0.3 and is crushed by armour, then removed', () => {
    G.fields.push({ type: 'wire', side: 1, line: 5, x: 600, w: 46, hp: 140 });
    const inf = spawn(0, 'rifle', 5);
    inf.x = 600;
    expect(FT.wireSlow(inf)).toBeCloseTo(0.3);
    expect(FT.wireSlow({ side: 1, x: 600, T: {} })).toBe(1); // own wire
    expect(FT.wireSlow({ side: 0, x: 640, T: {} })).toBe(1); // outside w/2
    const tk = spawn(0, 'tkH', 5); // ru Mendeleev
    tk.x = 600;
    expect(FT.wireSlow(tk)).toBe(1); // armour is never slowed
    expect(G.fields[0].hp).toBe(0); // ...and crushes the wire
    FT.stepFields();
    expect(G.fields).toHaveLength(0);
  });
});

describe('stepBunkers', () => {
  it('settled troops shelter in a same-line bunker; a dead bunker frees them', () => {
    newGame('aq', 'de', 'open', 1);
    const b = spawn(0, 'bunker', 2, true);
    b.x = b.tx = G.LX[2];
    b.y = 100;
    b.fixed = true;
    b.slot = 0;
    const inf = spawn(0, 'rifle', 2, true);
    inf.y = 120;
    inf.settled = true;
    FT.stepBunkers();
    expect(inf.shelter).toBe(b);
    expect(b.occ).toBe(1);
    b.hp = 0;
    FT.stepBunkers();
    expect(inf.shelter).toBeFalsy();
  });
});
