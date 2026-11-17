import { expect, it } from 'vitest';
import { G, mods, setLayout, applyTech } from '../../src/sim/state.js';
import { META } from '../../src/sim/meta.js';

it('setLayout per map: open=9 trenches, plain=17, march=45', () => {
  for (const [map, n] of [['open', 9], ['plain', 17], ['march', 45]]) {
    setLayout(map);
    expect(G.NT, map).toBe(n); expect(G.LX.length).toBe(n + 2);
    expect(G.HQI).toBe(n + 1); expect(G.WW).toBeGreaterThan(G.LX[G.HQI]);
  }
});
it('march marks the middle super trench; plain marks two double trenches', () => {
  setLayout('march'); expect(G.SUPER).toBe(23); expect(G.DBL).toEqual([]);
  setLayout('plain'); expect(G.SUPER).toBe(-1); expect(G.DBL).toEqual([4, 14]);
});
it('mods() covers every ORDER key plus specials', () => {
  const m = mods();
  for (const k of ['rifle','mg','raider','sniper','mortar','tank','tkL','tkM','tkH','tkS','bunker','colossus','tsar','nest','pillbox','pit75','pit65','depot','char2c','carrier','guncarrier']) {
    expect(m.dmg[k], k).toBe(1); expect(m.cd[k], k).toBe(1); expect(m.cost[k], k).toBe(1);
  }
});
it('applyTech applies exactly the owned nodes', () => {
  // minimal hand-built state (newGame not required)
  G.M = [mods(), mods()]; G.S = { supplies: 0, unlocked: {} }; G.bases = [{ max: 2500, hp: 2500, dmg: 1 }, { max: 2500, hp: 2500, dmg: 1 }];
  META.tech = { marks: 1, walls: 1, stock: 1, rail: 1, titan: 1 };
  applyTech();
  expect(G.M[0].dmg.rifle).toBeCloseTo(1.1);
  expect(G.bases[0].max).toBe(2900);
  expect(G.S.supplies).toBe(40);
  expect(G.M[0].income).toBeCloseTo(3.4);
  expect(G.S.unlocked.tkS).toBe(true);
});
