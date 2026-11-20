import { describe, it, expect, beforeEach } from 'vitest';
import { G, newGame } from '../../src/sim/state.js';
import { META } from '../../src/sim/meta.js';
import { BASE_HP } from '../../src/data/units.js';
import { startLineFor, tier, nextCost, raise, stepBase, infCap, baseIncome } from '../../src/sim/base.js';
import { incomeNow } from '../../src/sim/state.js';
import { aiStep } from '../../src/sim/ai.js';
import { AI_INCOME } from '../../src/data/nations.js';
import { TK } from '../../src/data/units.js';
import { ut, full, spawn, startX } from '../../src/sim/geometry.js';
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

describe('free troops and movers', () => {
  const mk = (a, b = 'de') => { META.tech = {}; newGame(a, b, 'open', 7); };
  const rifles = () => G.units.filter(u => u.side === 0 && u.type === 'rifle').length;
  it('conscripts trickle', () => {
    mk('ru'); raise(0, 'nat'); const n = rifles();
    stepBase(20);
    expect(rifles()).toBe(n + 1);
  });
  it('nothing owned means no timers', () => {
    mk('ru'); const n = G.units.length; stepBase(500);
    expect(G.units.length).toBe(n); expect(G.base[0].t).toBe(0);
  });
  it('respects caps', () => {
    mk('ru'); raise(0, 'nat');
    while (!full(0, 'rifle')) spawn(0, 'rifle', 1, true);
    const n = G.units.length; stepBase(20);
    expect(G.units.length).toBe(n);
  });
  it('fr T3 convoy', () => {
    mk('fr'); for (let i = 0; i < 3; i++) raise(0, 'nat');
    const n = rifles(); stepBase(45);
    expect(rifles()).toBe(n + 3);
    expect(G.base[0].convoyed).toBe(true);
  });
  it('teleferica', () => {
    mk('it'); G.owner[3] = 0; const old = startX(0, 3, 'rifle');
    raise(0, 'nat'); G.sel = 3;
    expect(startX(0, 3, 'rifle')).toBe(G.LX[3] - 14);
    expect(old).toBe(G.LX[0] - 14);
  });
  it('out of range walks', () => {
    mk('it'); raise(0, 'nat'); G.sel = 5;
    expect(startX(0, 5, 'rifle')).toBe(G.LX[0] - 14);
  });
  it('tanks need T3', () => {
    mk('it'); raise(0, 'nat');
    const tk = TK.find(k => ut(0, k));
    expect(startLineFor(0, tk, 3)).toBe(null);
    raise(0, 'nat'); raise(0, 'nat');
    G.owner[9] = 0; expect(startLineFor(0, tk, 9)).toBe(9);
    expect(startLineFor(0, 'rifle', 0)).toBe(null);
  });
  it('gb T3 tunnels infantry to the selected line', () => {
    mk('gb'); for (let i = 0; i < 3; i++) raise(0, 'nat'); G.owner[8] = 0;
    expect(startX(0, 8, 'rifle')).toBe(G.LX[8] - 14);
    const tk = TK.find(k => ut(0, k));
    expect(startLineFor(0, tk, 8)).toBe(null);
  });
  it('movers only deliver to held trenches', () => {
    mk('gb'); for (let i = 0; i < 3; i++) raise(0, 'nat');
    expect(startLineFor(0, 'rifle', G.HQI)).toBe(null);
    expect(startLineFor(0, 'rifle', G.NT)).toBe(null);
    mk('it'); for (let i = 0; i < 3; i++) raise(0, 'nat');
    expect(startLineFor(0, 'rifle', G.NT)).toBe(null);
    expect(startLineFor(0, 'rifle', G.HQI)).toBe(null);
  });
  it('AI side teleferica', () => {
    mk('de', 'it'); raise(1, 'nat');
    G.owner[G.HQI - 2] = 1;
    expect(startX(1, G.HQI - 2, 'rifle')).toBe(G.LX[G.HQI - 2] + 14);
    expect(startX(1, 0, 'rifle')).toBe(G.LX[G.HQI] + 14);
  });
  it('large dt spans several periods, bounded by cap', () => {
    mk('ru'); for (let i = 0; i < 3; i++) raise(0, 'nat');
    const n = rifles(); stepBase(24);
    expect(rifles()).toBe(n + 6);
    while (!full(0, 'rifle')) spawn(0, 'rifle', 1, true);
    const m = G.units.length; stepBase(60);
    expect(G.units.length).toBe(m);
  });
  it('convoy toast only if troops arrive', () => {
    mk('fr'); for (let i = 0; i < 3; i++) raise(0, 'nat');
    while (!full(0, 'rifle')) spawn(0, 'rifle', 1, true);
    stepBase(45);
    expect(G.base[0].convoyed).toBe(false);
  });
});
