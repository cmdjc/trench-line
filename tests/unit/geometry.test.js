import { expect, it, beforeEach } from 'vitest';
import { G, setLayout, newGame } from '../../src/sim/state.js';
import { trenchX, posX, startX, spawn, tanks, full, countAt, power, cost, frontLine, count, ut } from '../../src/sim/geometry.js';
import { NAT } from '../../src/data/nations.js';

beforeEach(() => newGame('gb', 'de', 'open', 42));

it('trench posX zigzag is the same for both sides, alternating per SEG band', () => {
  setLayout('open');
  for (const y of [0, 22, 45, 90, 150, 211, 299]) {
    expect(posX(0, 3, y, 0)).toBe(trenchX(G.LX[3], y));
    expect(posX(1, 3, y, 0)).toBe(trenchX(G.LX[3], y));
  }
  // ±6 alternating per band of SEG=WH/7
  expect(trenchX(100, 0)).toBe(94); expect(trenchX(100, 45)).toBe(106);
});
it('double trench offsets by ±14 via the y*0.61 parity; HQ lines use the foot/park offsets', () => {
  setLayout('plain');                       // DBL = [4, 14]
  expect(posX(0, 4, 10, 0)).toBe(trenchX(G.LX[4] - 14, 10));   // floor(10*.61)=6 even → -14
  expect(posX(0, 4, 5, 0)).toBe(trenchX(G.LX[4] + 14, 5));     // floor(5*.61)=3 odd → +14
  setLayout('open');
  expect(posX(0, 0, 100, 0)).toBe(G.LX[0] + 55);               // player HQ foot
  expect(posX(0, 0, 100, 30)).toBe(G.LX[0] + 52 + 30);         // vehicle park
  expect(posX(1, G.HQI, 100, 0)).toBe(G.LX[G.HQI] - 55);       // enemy HQ foot (own line)
  expect(posX(1, G.HQI, 100, 30)).toBe(G.LX[G.HQI] - 52 - 30); // enemy HQ vehicle park (own line uses 52)
  expect(posX(0, G.HQI, 100, 0)).toBe(G.LX[G.HQI] - 85);       // attacking foe HQ from the west
  expect(posX(1, 0, 100, 0)).toBe(G.LX[0] + 85);               // foe attacking player HQ from the east
});
it('startX: open map rallies at own HQ; march railhead spawns one trench behind the target', () => {
  setLayout('open');
  expect(startX(0, 5)).toBe(G.LX[0] - 14);
  expect(startX(1, 5)).toBe(G.LX[G.HQI] + 14);
  G.MAP = 'march'; setLayout('march');      // setLayout alone does not change G.MAP
  expect(startX(0, 5)).toBe(G.LX[4] - 14);
  expect(startX(0, 0)).toBe(G.LX[0] - 14);                     // clamped to own HQ
  expect(startX(1, 5)).toBe(G.LX[6] + 14);
});
it('spawn places settled units at posX with full hp and randomised cooldown', () => {
  const u = spawn(0, 'rifle', 3, true);
  expect(u.settled).toBe(true);
  expect(u.x).toBe(posX(0, 3, u.y, 0));
  expect(u.hp).toBe(u.max); expect(u.hp).toBe(40);
  expect(u.cd).toBeGreaterThanOrEqual(0); expect(u.cd).toBeLessThanOrEqual(1.2);
  const v = spawn(0, 'mg', 2, false);
  expect(v.settled).toBe(false); expect(v.x).toBe(startX(0, 2));
});
it('tanks() sums armour weights skipping sup; caps respected by full()', () => {
  expect(tanks(0)).toBe(0);
  while (!full(0, 'tank')) spawn(0, 'tank', 1, true);
  expect(tanks(0) + 1).toBeGreaterThan(NAT.gb.tanks);           // adding one more would exceed 8
  expect(tanks(0)).toBeLessThanOrEqual(NAT.gb.tanks);
  while (!full(0, 'rifle')) spawn(0, 'rifle', 1, true);
  expect(count(0)).toBe(NAT.gb.inf);                            // 40 infantry cap
});
it('countAt/power/cost/frontLine read the field with modifiers', () => {
  expect(countAt(0, 1)).toBe(6);                                 // opening riflemen of newGame
  spawn(0, 'rifle', 2, true); spawn(0, 'sniper', 2, true);
  expect(countAt(0, 2)).toBe(2);
  expect(power(0, 2)).toBe(20 + 55);
  expect(cost('rifle')).toBe(20);
  G.M[0].cost.rifle = 0.5;
  expect(cost('rifle')).toBe(10);
  expect(frontLine()).toBe(2);
  expect(ut(0, 'rifle').name).toBe('Rifleman');
  expect(ut(1, 'mg').name).toBe('MG 08 team');
});
it('newGame spawns opening infantry, sets ownership and traits', () => {
  expect(G.units.filter(u => u.side === 0)).toHaveLength(6);      // round(120/20)
  expect(G.units.filter(u => u.side === 1)).toHaveLength(6);      // AI_START*20 / 20 (de rifle)
  expect(G.owner[0]).toBe(0); expect(G.owner[1]).toBe(0);
  expect(G.owner[G.NT]).toBe(1); expect(G.owner[G.HQI]).toBe(1);
  expect(G.sel).toBe(1); expect(G.running).toBe(true);
  expect(G.sw).toEqual([{ cd: 0, tunnel: null }, { cd: 0, tunnel: null }]);
  expect(G.aim).toBeNull(); expect(G.tracers).toEqual([]);
  expect(G.M[0].cd.rifle).toBe(0.85);                             // gb trait
  expect(G.S.supplies).toBe(40);
  newGame('aq', 'gb', 'open', 7);
  expect(G.M[0].income).toBe(2); expect(G.M[0].growth).toBe(0.7);
  expect(G.S.supplies).toBe(15);
  newGame('us', 'de', 'open', 8);
  expect(G.M[0].income).toBe(2.3); expect(G.M[0].growth).toBe(0.4);
  newGame('it', 'de', 'open', 9);
  expect(G.M[0].cover).toBeCloseTo(0.85);
});
it('newGame is deterministic per seed', () => {
  const snap = () => G.units.map(u => [u.type, Math.round(u.x * 10), Math.round(u.y * 10)]);
  newGame('de', 'fr', 'river', 99); const a = snap();
  newGame('de', 'fr', 'river', 99); const b = snap();
  expect(b).toEqual(a);
  newGame('de', 'fr', 'river', 100);
  expect(snap()).not.toEqual(a);
});
