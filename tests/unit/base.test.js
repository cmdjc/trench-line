import { describe, it, expect, beforeEach } from 'vitest';
import { G, newGame } from '../../src/sim/state.js';
import { META } from '../../src/sim/meta.js';
import { BASE_HP } from '../../src/data/units.js';
import { tier, nextCost, raise, stepBase, infCap, baseIncome } from '../../src/sim/base.js';
import { incomeNow } from '../../src/sim/state.js';
import { aiStep } from '../../src/sim/ai.js';
import { AI_INCOME } from '../../src/data/nations.js';
import { TK } from '../../src/data/units.js';
import { ut } from '../../src/sim/geometry.js';
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

describe('income, repair, caps, cost', () => {
  it('depot income', () => {
    const a = incomeNow(); raise(0, 'depot'); raise(0, 'depot');
    expect(incomeNow() - a).toBeCloseTo(1.2, 6);
  });
  it('enemy depot income', () => {
    newGame('gb', 'de', 'open', 7); G.ai.buyT = 999; G.ai.thinkT = 999; G.S.t = 0;
    raise(1, 'depot');
    const m0 = G.ai.money; aiStep(0.1);
    expect(G.ai.money - m0).toBeCloseTo((AI_INCOME + 0.6) * 0.1, 6);
  });
  it('enemy us T1 growth', () => {
    newGame('gb', 'de', 'open', 7); G.nation[1] = 'us'; G.S.t = 120;
    raise(1, 'nat');
    expect(baseIncome(1)).toBeCloseTo(0.6, 6);
  });
  it('walls T3 repairs', () => {
    for (let i = 0; i < 3; i++) raise(0, 'walls');
    G.bases[0].hp = 100; stepBase(1);
    expect(G.bases[0].hp).toBeCloseTo(104, 6);
    G.bases[0].hp = G.bases[0].max - 1; stepBase(1);
    expect(G.bases[0].hp).toBe(G.bases[0].max);
    G.bases[0].hp = 0; stepBase(1);
    expect(G.bases[0].hp).toBe(0);
  });
  it('ah T3 cap', () => {
    newGame('ah', 'de', 'open', 7);
    expect(infCap(0)).toBe(20);
    for (let i = 0; i < 3; i++) raise(0, 'nat');
    expect(infCap(0)).toBe(25);
  });
  it('us T3 enemy tank cost', () => {
    newGame('gb', 'us', 'open', 7);
    for (let i = 0; i < 3; i++) raise(1, 'nat');
    const k = TK.find(x => ut(1, x));
    const c = Math.round(ut(1, k).cost * 0.85);
    G.ai.thinkT = 999; G.ai.buyT = 0; G.ai.want = k; G.ai.money = c + 0.5; G.S.t = 0;
    const n = G.units.length; aiStep(0.001);
    expect(G.units.length).toBe(n + 1);
    expect(G.ai.money).toBeLessThan(1);
  });
});
