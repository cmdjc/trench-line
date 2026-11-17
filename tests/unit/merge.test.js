// Parity port of legacy/tests/merge.js — Wide open plain rules: double "super"
// trenches, hedgehogs, five emplacement slots, and Russia's line-up
// (Vezdekhod tank, Mendeleev heavy, Tsar Tank superweapon).
import { describe, expect, it } from 'vitest';
import { newGame, G, incomeNow, nestCost } from '../../src/sim/state.js';
import { tick } from '../../src/sim/tick.js';
import { spawn, tanks } from '../../src/sim/geometry.js';
import { tkList, DBL_RATE } from '../../src/data/units.js';
import { NAT } from '../../src/data/nations.js';
import { SW } from '../../src/data/superweapons.js';
import { swBlock } from '../../src/sim/superweapons.js';
import { fireSuperweapon, buildNestAt } from '../../src/sim/commands.js';

// One second of battle with the legacy harness quieteners: broke AI, no queued
// cards, player HQ always full.
const run = (n) => {
  for (let i = 0; i < n; i++) {
    G.ai.money = 0;
    G.S.pending = 0;
    G.offer = null;
    G.bases[0].hp = G.bases[0].max;
    tick(1);
  }
};

describe('merge parity: plain map and Russia', () => {
  it('Russia fields Vezdekhod then Mendeleev; Tsar Tank is the superweapon', () => {
    newGame('ru', 'de', 'plain', 7);
    expect(tkList('ru').join(',')).toBe('tank,tkH');
    expect(G.S.unlocked.tank || false).toBe(false);
    expect(NAT.ru.tanks).toBe(10);
    expect(SW.ru.kind).toBe('tsar');
    expect(G.NT).toBe(17);
    expect(G.LX.length).toBe(19);
  });

  it('one Tsar Tank at a time, and it never touches the armour limit', () => {
    newGame('ru', 'de', 'plain', 7);
    G.S.supplies = 5000;
    expect(fireSuperweapon()).toBe(true);
    expect(G.units.filter((u) => u.type === 'tsar').length).toBe(1);
    expect(tanks(0)).toBe(0);
    // fired just now: the cooldown gate reports first
    expect(swBlock(0)).toBe('Ready again in 60 seconds.');
    expect(fireSuperweapon()).toBe(false);
    // cooldown spent but the tank still rolling: field-presence gate
    G.sw[0].cd = 0;
    expect(swBlock(0)).toBe('Already in the field.');
    expect(fireSuperweapon()).toBe(false);
  });

  it('hedgehogs hold tanks at a lost super trench until infantry take it', () => {
    newGame('ru', 'de', 'plain', 7);
    const LX = G.LX;
    G.ai.money = 0;
    const hold = spawn(1, 'rifle', 14);
    hold.hp = hold.max = 1e7;
    G.owner[14] = 1;
    const tk = spawn(0, 'tank', 13);
    tk.hp = tk.max = 1e7;
    tk.line = 15;
    tk.x = LX[13] + 60;
    const ts = spawn(0, 'tsar', 13);
    ts.hp = ts.max = 1e7;
    ts.line = 15;
    ts.x = LX[13] + 60;
    run(45);
    expect(tk.x).toBeGreaterThan(LX[13]);
    expect(tk.x).toBeLessThan(LX[14] - 94);
    expect(ts.x).toBeGreaterThan(LX[14]);
    // infantry take the trench: the tanks roll through
    hold.hp = 0;
    tick(0.1);
    const mine = spawn(0, 'rifle', 14);
    mine.hp = mine.max = 1e7;
    G.owner[14] = 0;
    run(45);
    expect(tk.x).toBeGreaterThan(LX[14]);
  });

  it('a super trench takes 5 emplacements and pays one extra supply a second', () => {
    newGame('ru', 'de', 'plain', 7);
    G.owner[14] = 0;
    G.S.supplies = 5000;
    let built = 0;
    for (let i = 0; i < 7; i++) {
      tick(0.1);
      if (G.S.supplies >= nestCost(0) && buildNestAt(14)) built++;
    }
    expect(built).toBe(5);
    expect(incomeNow()).toBeCloseTo(3 + DBL_RATE, 5);
  });
});
