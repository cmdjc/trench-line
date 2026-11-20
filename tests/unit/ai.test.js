// Task 11 — enemy commander (prototype 1197–1261): income ramp, buy caps,
// want state machine, aiThink gather/advance/retreat rules.
import { describe, it, expect } from 'vitest';
import { rng } from '../../src/core/rng.js';
import { bus } from '../../src/core/events.js';
import { G, newGame, nestCost } from '../../src/sim/state.js';
import { spawn, count, tanks } from '../../src/sim/geometry.js';
import { aiStep, aiThink } from '../../src/sim/ai.js';
import { NAT, AI_INCOME, AI_RAMP } from '../../src/data/nations.js';
import { SW } from '../../src/data/superweapons.js';
import { DEPOT_RATE, SUPER_INC } from '../../src/data/units.js';

const toasts = [];
bus.on('toast', m => toasts.push(m));

function game(mine = 'de', theirs = 'de', map = 'open') { newGame(mine, theirs, map, 7); toasts.length = 0; }
function quiet() { G.ai.buyT = 999; G.ai.thinkT = 999; } // silence buy/think so only income runs
function tick(dt = 0.001) { G.ai.buyT = 0; aiStep(dt); } // force one buy-block run
function clearEnemy() { G.units = G.units.filter(u => u.side !== 1); }
// find a seed whose first draws satisfy the predicates (gates consume draws in order)
function seedWhere(...preds) {
  for (let k = 1; k < 50000; k++) { rng.reseed(k); if (preds.every(p => p(rng.float()))) return k; }
  throw new Error('no seed found');
}

describe('enemy income', () => {
  it('accrues the base ramp AI_INCOME·(1+t/AI_RAMP)', () => {
    game(); quiet();
    for (const t of [0, 300]) {
      G.S.t = t; const m0 = G.ai.money; aiStep(0.1);
      expect(G.ai.money - m0).toBeCloseTo(AI_INCOME * (1 + t / AI_RAMP) * 0.1, 6);
    }
  });
  it('us enemy ramps with min(1.8, 0.75+t/400)', () => {
    game('de', 'us'); quiet();
    for (const t of [100, 1000]) {
      G.S.t = t; const m0 = G.ai.money; aiStep(0.1);
      expect(G.ai.money - m0).toBeCloseTo(AI_INCOME * (1 + t / AI_RAMP) * Math.min(1.8, 0.75 + t / 400) * 0.1, 6);
    }
  });
  it('aq enemy ramps with min(2, 0.6+t/300)', () => {
    game('de', 'aq'); quiet();
    for (const t of [180, 1200]) {
      G.S.t = t; const m0 = G.ai.money; aiStep(0.1);
      expect(G.ai.money - m0).toBeCloseTo(AI_INCOME * (1 + t / AI_RAMP) * Math.min(2, 0.6 + t / 300) * 0.1, 6);
    }
  });
  it('adds depot and doubled-trench income on plain', () => {
    game('de', 'de', 'plain'); quiet();
    spawn(1, 'depot', G.NT, true); G.owner[4] = 1; G.S.t = 0;
    const m0 = G.ai.money; aiStep(0.1);
    expect(G.ai.money - m0).toBeCloseTo((AI_INCOME + DEPOT_RATE + 1) * 0.1, 6);
  });
  it('adds super-trench income on march', () => {
    game('de', 'de', 'march'); quiet();
    G.owner[G.SUPER] = 1; G.S.t = 0;
    const m0 = G.ai.money; aiStep(0.1);
    expect(G.ai.money - m0).toBeCloseTo((AI_INCOME + SUPER_INC) * 0.1, 6);
  });
});

describe('enemy purchases respect caps', () => {
  it('never exceeds infantry or armour caps across many seeded ticks', () => {
    game(); clearEnemy(); G.owner[9] = 0; // kill canBuild so no nest/def spawns pollute counts
    for (let i = 0; i < NAT.de.inf; i++) spawn(1, 'rifle', G.NT, true);
    expect(count(1)).toBe(NAT.de.inf);
    G.S.t = 9999; G.ai.money = 99999; G.ai.thinkT = 999; rng.reseed(42);
    for (let i = 0; i < 80; i++) {
      tick(0.1);
      expect(count(1)).toBeLessThanOrEqual(NAT.de.inf);
      expect(tanks(1)).toBeLessThanOrEqual(NAT.de.tanks);
    }
    expect(count(1)).toBe(NAT.de.inf);   // no infantry slipped through
    expect(tanks(1)).toBeGreaterThan(0); // armour path exercised
  });
});

describe('want state machine', () => {
  it('fort: sets want on the 5% gate, saves while poor, then charges and raises the level', () => {
    game(); quiet(); G.S.t = 100; G.ai.money = 30; // gate needs money·2+80 ≥ 60; too poor to build yet
    rng.reseed(seedWhere(d => d < 0.05, d => d < 0.5)); tick();
    expect(G.ai.want).toBe('fort'); expect(G.fort[9]).toBe(0);
    G.ai.money = 500; tick();
    expect(G.ai.want).toBeNull(); expect(G.fort[9]).toBe(1);
    expect(G.ai.money).toBeCloseTo(500 - 60, 1);
  });
  it('fort: abandons without spending when it can no longer build', () => {
    game(); quiet(); G.ai.want = 'fort'; G.owner[9] = 0;
    const m0 = G.ai.money; tick();
    expect(G.ai.want).toBeNull(); expect(G.fort[9]).toBe(0);
    expect(G.ai.money).toBeCloseTo(m0, 1);
  });
  it('def (fr): builds a gun pit and charges the def cost', () => {
    game('de', 'fr'); quiet(); G.S.t = 100; G.ai.money = 30;
    rng.reseed(seedWhere(d => d < 0.05, d => d >= 0.5, d => d < 0.5)); tick();
    expect(G.ai.want).toBe('def'); // saving up (pit costs 130)
    G.ai.money = 500; tick();
    expect(G.ai.want).toBeNull();
    expect(G.jobs).toHaveLength(1); expect(G.jobs[0].make).toBe('pit75'); expect(G.jobs[0].line).toBe(9);
    expect(G.ai.money).toBeCloseTo(500 - NAT.fr.def.cost, 1);
  });
  it('nest (de): queues a pillbox job and charges the nest cost', () => {
    game(); quiet(); G.S.t = 100; G.ai.money = 30;
    rng.reseed(seedWhere(d => d < 0.05, d => d >= 0.5)); tick();
    expect(G.ai.want).toBe('nest'); // saving up (pillbox costs 170)
    G.ai.money = 500; tick();
    expect(G.ai.want).toBeNull();
    expect(G.jobs).toHaveLength(1); expect(G.jobs[0].make).toBe('pillbox');
    expect(G.ai.money).toBeCloseTo(500 - nestCost(1), 1);
  });
  it('sw (de, cost<1500): wants, fires the Paris Gun and charges it', () => {
    game(); quiet(); G.ai.baseT = 1e9; G.owner[9] = 0; G.S.t = 300; G.ai.money = 600;
    expect(SW.de.cost).toBeLessThan(1500);
    rng.reseed(seedWhere(d => d < 0.025)); tick();
    expect(G.ai.want).toBeNull();
    expect(G.shells).toHaveLength(1); expect(G.shells[0].huge).toBe(true);
    expect(G.sw[1].cd).toBe(SW.de.cd);
    expect(toasts.some(m => m.includes('Paris Gun'))).toBe(true);
  });
  it('sw 60% rule (aq): wants only at cost·0.6, saves, then fires the Colossus', () => {
    game('de', 'aq'); quiet(); G.owner[9] = 0; G.S.t = 300;
    expect(SW.aq.cost).toBeGreaterThanOrEqual(1500);
    G.ai.money = SW.aq.cost * 0.6 - 1;
    rng.reseed(seedWhere(d => d < 0.025)); tick();
    expect(G.ai.want).toBeNull(); // gate failed: not rich enough to even want it
    G.ai.money = SW.aq.cost * 0.6;
    rng.reseed(seedWhere(d => d < 0.025)); tick();
    expect(G.ai.want).toBe('sw'); // saving up, cannot fire yet
    expect(G.units.some(u => u.type === 'colossus')).toBe(false);
    G.ai.money = SW.aq.cost; tick();
    expect(G.ai.want).toBeNull();
    expect(G.units.some(u => u.type === 'colossus')).toBe(true);
    expect(toasts.some(m => m.includes('Southern Colossus'))).toBe(true);
    expect(G.ai.money).toBeCloseTo(0, 1);
  });
});

describe('aiThink', () => {
  it('gathers all enemy units at the focus line', () => {
    game(); clearEnemy(); spawn(1, 'rifle', 3); G.ai.F = 5;
    aiThink();
    expect(G.ai.F).toBe(5);
    for (const u of G.units) if (u.side === 1) expect(u.line).toBe(5);
    expect(toasts).toHaveLength(0);
  });
  it('jumps the focus to frontLine+1 when nothing holds it', () => {
    game(); clearEnemy(); G.ai.F = 6; spawn(0, 'rifle', 8, true); G.S.t = 20;
    aiThink();
    expect(G.ai.F).toBe(9);
  });
  it('attacks the next trench when it outpowers the defence, with a toast', () => {
    game(); clearEnemy(); G.ai.F = 5;
    for (let i = 0; i < 6; i++) spawn(1, 'rifle', 5, true);
    for (let i = 0; i < 5; i++) spawn(0, 'rifle', 4, true);
    G.S.t = 300; aiThink();
    expect(G.ai.F).toBe(4); expect(G.ai.lastAdv).toBe(300);
    expect(toasts).toContain('The enemy is attacking trench 4.');
    for (const u of G.units) if (u.side === 1) expect(u.line).toBe(4);
  });
  it('falls back a line when badly outpowered', () => {
    game(); clearEnemy(); G.ai.F = 5;
    for (let i = 0; i < 2; i++) spawn(1, 'rifle', 5, true);
    for (let i = 0; i < 10; i++) spawn(0, 'rifle', 4, true);
    G.S.t = 100; aiThink();
    expect(G.ai.F).toBe(6); expect(G.ai.lastAdv).toBe(100);
    expect(toasts).toHaveLength(0);
    for (const u of G.units) if (u.side === 1) expect(u.line).toBe(6);
  });
  it('storms the HQ with the HQ toast', () => {
    game(); G.units = []; G.ai.F = 1; // empty field: starters at line 1 would count as engaged
    for (let i = 0; i < 20; i++) spawn(1, 'rifle', 1, true);
    for (let i = 0; i < 7; i++) spawn(0, 'rifle', 0, true);
    G.S.t = 500; aiThink();
    expect(G.ai.F).toBe(0);
    expect(toasts).toContain('The enemy is storming your HQ.');
  });
});

describe('enemy base upgrades', () => {
  const calm = () => { G.ai.want = null; G.ai.thinkT = 999; };
  it('does not buy before t=150', () => {
    game(); calm(); G.S.t = 100; G.ai.money = 1000; tick();
    expect(G.base[1].walls).toBe(0);
  });
  it('buys walls T1 at t=150, pays 300 and toasts', () => {
    game(); calm(); G.S.t = 150; G.ai.money = 1000; const m0 = G.ai.money; tick();
    expect(G.base[1].walls).toBe(1);
    expect(m0 - G.ai.money).toBeGreaterThan(299); expect(m0 - G.ai.money).toBeLessThan(301);
    expect(toasts.some(m => m.startsWith('The enemy has raised its') && m.endsWith('to tier 1.'))).toBe(true);
  });
  it('waits 90s then rotates to nat', () => {
    game(); calm(); G.S.t = 150; G.ai.money = 5000; tick();
    G.S.t = 239; tick(); expect(G.base[1].nat).toBe(0);
    G.S.t = 240; tick(); expect(G.base[1].nat).toBe(1); expect(G.base[1].walls).toBe(1);
  });
  it('draws no rng on a base purchase', () => {
    game(); calm(); G.S.t = 150; G.ai.money = 1000; rng.reseed(5); tick();
    const a = rng.float(); rng.reseed(5); expect(a).toBe(rng.float());
  });
});
