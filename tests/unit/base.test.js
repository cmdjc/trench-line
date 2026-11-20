import { describe, it, expect, beforeEach } from 'vitest';
import { G, newGame } from '../../src/sim/state.js';
import { META } from '../../src/sim/meta.js';
import { BASE_HP } from '../../src/data/units.js';
import { tier, nextCost } from '../../src/sim/base.js';
import { buyBase } from '../../src/sim/commands.js';

beforeEach(() => { META.tech = {}; newGame('gb', 'de', 'open', 7); });

describe('base upgrades', () => {
  it('buys and charges once', () => {
    G.S.supplies = 1000;
    expect(buyBase('walls')).toBe(true);
    expect(G.S.supplies).toBe(700);
    expect(tier(0, 'walls')).toBe(1);
    expect(G.bases[0].max).toBe(BASE_HP + 500);
    expect(nextCost(0, 'walls')).toBe(550);
  });
  it('rejects', () => {
    G.S.supplies = 299;
    expect(buyBase('walls')).toBe(false);
    expect(G.S.supplies).toBe(299);
    expect(tier(0, 'walls')).toBe(0);
    G.S.supplies = 5000;
    buyBase('walls'); buyBase('walls'); buyBase('walls');
    const s = G.S.supplies;
    expect(buyBase('walls')).toBe(false);
    expect(G.S.supplies).toBe(s);
    expect(nextCost(0, 'walls')).toBe(null);
  });
  it('hospital stacks with aid', () => {
    META.tech.aid = 1; newGame('gb', 'de', 'open', 7);
    G.S.supplies = 1000; buyBase('hosp');
    expect(G.M[0].heal).toBeCloseTo(1.8);
  });
  it('research start tiers', () => {
    META.tech = { bw1: 1, bw2: 1, bn1: 1 }; newGame('gb', 'de', 'open', 7);
    expect(G.base[0]).toMatchObject({ walls: 2, nat: 1, depot: 0, hosp: 0 });
    expect(G.base[1]).toMatchObject({ walls: 0, nat: 0, depot: 0, hosp: 0 });
  });
  it('ah officer school', () => {
    newGame('ah', 'de', 'open', 7);
    const u = G.units.find(x => x.side === 0 && x.type === 'rifle');
    const m = u.max;
    G.S.supplies = 5000; buyBase('nat'); buyBase('nat');
    expect(u.max).toBeCloseTo(m * 1.15);
    expect(G.M[0].hp).toBeCloseTo(1.15);
  });
});
