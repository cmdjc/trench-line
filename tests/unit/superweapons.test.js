import { describe, it, expect } from 'vitest';
import { newGame, G } from '../../src/sim/state.js';
import { spawn, tanks } from '../../src/sim/geometry.js';
import { targetFor, aimPoint, swBlock, useSW, detonate, stepSW, swCost } from '../../src/sim/superweapons.js';
import { WH } from '../../src/data/units.js';
import { raise } from '../../src/sim/base.js';
import { fireSuperweapon } from '../../src/sim/commands.js';
import { bus } from '../../src/core/events.js';

const toasts = [];
bus.on('toast', m => toasts.push(m));

function game(mine, theirs, map = 'open', seed = 7) {
  newGame(mine, theirs, map, seed);
  toasts.length = 0;
  G.shake = 0;
  G.reduceMotion = false;
}

/* Enemy starters from newGame sit settled on line NT — that keeps targetFor(0) === NT. */
const NT = () => G.NT;

describe('targetFor', () => {
  it('player: nearest settled enemy line ahead of sel, else HQI', () => {
    game('gb', 'de');
    G.units = G.units.filter(u => u.side === 0);
    expect(targetFor(0)).toBe(G.HQI);
    spawn(1, 'rifle', 3, true);
    spawn(1, 'rifle', 6, true);
    G.sel = 2;
    expect(targetFor(0)).toBe(3);
    G.sel = 4;
    expect(targetFor(0)).toBe(6);
  });

  it('enemy: nearest settled player line below ai.F, else 0', () => {
    game('gb', 'de');
    G.units = G.units.filter(u => u.side === 1);
    G.ai.F = G.NT;
    expect(targetFor(1)).toBe(0);
    spawn(0, 'rifle', 2, true);
    spawn(0, 'rifle', 5, true);
    expect(targetFor(1)).toBe(5);
    G.ai.F = 4;
    expect(targetFor(1)).toBe(2);
  });
});

describe('aimPoint', () => {
  it('picks the richest 85px cluster of the foe', () => {
    game('de', 'gb');
    G.units = [];
    const a = [spawn(1, 'rifle', 5, true), spawn(1, 'rifle', 5, true), spawn(1, 'rifle', 5, true)];
    a.forEach((u, i) => { u.x = 900 + i * 10; u.y = 60; });
    const tank = spawn(1, 'tank', 5, true);
    tank.x = 1600; tank.y = 140;
    const p = aimPoint(0); // foe = 1
    expect(p.x).toBe(tank.x);
    expect(p.y).toBe(tank.y);
  });

  it('falls back to the foe HQ when no units', () => {
    game('de', 'gb');
    G.units = [];
    expect(aimPoint(0)).toEqual({ x: G.bases[1].x, y: WH / 2 });
  });
});

describe('de Paris Gun', () => {
  it('fires one huge shell at a chosen point, clamped into the field', () => {
    game('de', 'gb');
    const before = G.S.supplies;
    expect(useSW(0, { x: -50, y: -20 })).toBe(true);
    expect(G.shells).toHaveLength(1);
    const s = G.shells[0];
    expect(s).toMatchObject({ side: 0, type: 'barrage', dmg: 700, splash: 90, cov: 0.8, rz: 80, arc: 3.2, big: true, huge: true, dur: 4.5, t: 0 });
    expect(s.x0).toBe(G.bases[0].x);
    expect(s.x1).toBe(0);
    expect(s.y1).toBe(0);
    expect(G.sw[0].cd).toBe(90);
    expect(G.S.supplies).toBe(before); // callers deduct, not useSW
    expect(useSW(0, { x: 100, y: 100 })).toBe(false);
    expect(swBlock(0)).toBe('Ready again in 90 seconds.');
  });

  it('clamps the far corner too', () => {
    game('de', 'gb');
    useSW(0, { x: G.WW + 100, y: WH + 100 });
    expect(G.shells[0].x1).toBe(G.WW);
    expect(G.shells[0].y1).toBe(WH);
  });

  it('enemy shot warns which trench it is near', () => {
    game('gb', 'de');
    const money = G.ai.money;
    expect(useSW(1)).toBe(true);
    expect(G.ai.money).toBe(money);
    expect(toasts[0]).toMatch(/^The enemy Paris Gun has fired at the area near trench \d+\. Look for the red circle\.$/);
    expect(G.shells).toHaveLength(1);
    expect(G.shells[0].side).toBe(1);
  });
});

describe('gb Messines mine', () => {
  it('is blocked without an enemy-held trench ahead of sel', () => {
    game('gb', 'de');
    G.units = G.units.filter(u => u.side === 0);
    expect(swBlock(0)).toBe('No enemy-held trench ahead of the selected one.');
    expect(useSW(0)).toBe(false);
  });

  it('tunnels 25 s, then kills occupants within 70 px, razes, booms, shakes', () => {
    game('gb', 'de');
    const L = NT();
    const inf = spawn(1, 'rifle', L, true); inf.x = G.LX[L] - 55;
    const nest = spawn(1, 'nest', L, true); nest.x = G.LX[L] + 5; nest.hp = nest.max = 500;
    const tank = spawn(1, 'tank', L, true); tank.x = G.LX[L] + 10; tank.hp = tank.max = 1000;
    const far = spawn(1, 'rifle', L, true); far.x = G.LX[L] + 200; far.hp = far.max = 500;
    const mine = spawn(0, 'rifle', L, true); mine.x = G.LX[L];
    G.fort[L] = 3;
    G.fields.push({ side: 1, line: L, hp: 100 }, { side: 0, line: L, hp: 100 });
    const booms = G.booms.length;

    expect(useSW(0)).toBe(true);
    expect(G.sw[0].tunnel).toEqual({ line: L, t: 25 });
    expect(swBlock(0)).toBe(`Tunnelling under trench ${L}: 25 seconds to go.`);
    stepSW(10);
    expect(swBlock(0)).toBe(`Tunnelling under trench ${L}: 15 seconds to go.`);
    stepSW(15);

    expect(G.sw[0].tunnel).toBeNull();
    expect(inf.hp).toBeLessThanOrEqual(0);
    expect(nest.hp).toBe(100);       // 500 - 400
    expect(tank.hp).toBe(700);       // 1000 - 300
    expect(far.hp).toBe(500);        // outside 70 px
    expect(mine.hp).toBe(mine.max);  // own side untouched
    expect(G.fort[L]).toBe(0);
    expect(G.fields).toEqual([{ side: 0, line: L, hp: 100 }]);
    expect(G.booms.length).toBe(booms + 8);
    expect(G.shake).toBe(9);
    expect(toasts[0]).toBe(`Your mine has gone up under trench ${L}.`);
    expect(G.sw[0].cd).toBe(95); // 120 set on useSW, minus the 25 s of tunnelling
  });

  it('reports an empty trench and respects reduceMotion', () => {
    game('gb', 'de');
    const L = NT();
    G.units = G.units.filter(u => u.side === 0);
    const sentry = spawn(1, 'rifle', L, true); sentry.x = G.LX[L] + 200; // keeps targetFor, out of blast
    G.reduceMotion = true;
    useSW(0);
    stepSW(25);
    expect(G.shake).toBe(0);
    expect(toasts[0]).toBe(`Your mine has gone up under trench ${L}, but nobody was in it.`);
  });

  it('leaves forts alone when the miner already holds the trench', () => {
    game('gb', 'de');
    const L = NT();
    G.owner[L] = 0;
    G.fort[L] = 2;
    useSW(0);
    stepSW(25);
    expect(G.fort[L]).toBe(2);
  });
});

describe('one-at-a-time supers', () => {
  it('fr char2c spawns at sel and blocks a second while alive', () => {
    game('fr', 'de');
    const t0 = tanks(0);
    expect(useSW(0)).toBe(true);
    const u = G.units.find(x => x.type === 'char2c');
    expect(u).toBeTruthy();
    expect(u.side).toBe(0);
    expect(u.line).toBe(G.sel);
    expect(tanks(0)).toBe(t0); // sup units skip armour accounting
    stepSW(60); // cd 60 → ready again
    expect(swBlock(0)).toBe('Already in the field.');
    u.hp = 0;
    G.units = G.units.filter(x => x.hp > 0);
    expect(swBlock(0)).toBe('');
  });

  it('ru tsar spawns at sel', () => {
    game('ru', 'gb');
    useSW(0);
    expect(G.units.some(u => u.type === 'tsar' && u.side === 0 && u.line === G.sel)).toBe(true);
  });

  it('aq colossus spawns at sel', () => {
    game('aq', 'gb');
    useSW(0);
    expect(G.units.some(u => u.type === 'colossus' && u.side === 0 && u.line === G.sel)).toBe(true);
  });

  it('enemy char2c warns the player', () => {
    game('gb', 'fr');
    useSW(1);
    expect(G.units.some(u => u.type === 'char2c' && u.side === 1 && u.line === G.ai.F)).toBe(true);
    expect(toasts[0]).toBe('The enemy has sent out a Char 2C.');
  });
});

describe('us Kettering Bugs', () => {
  it('four diving shells staggered over the target trench', () => {
    game('us', 'de');
    const tx = G.LX[NT()];
    const dur = Math.min(7, Math.max(1.5, Math.abs(tx - G.bases[0].x) / 230));
    expect(useSW(0)).toBe(true);
    expect(G.shells).toHaveLength(4);
    G.shells.forEach((s, i) => {
      expect(s.t).toBeCloseTo(-i * 0.7, 10);
      expect(s.dur).toBeCloseTo(dur, 10);
      expect(s).toMatchObject({ side: 0, type: 'barrage', dmg: 110, splash: 42, cov: 0.7, arc: 0, plane: true, base: false });
      expect(Math.abs(s.x1 - tx)).toBeLessThanOrEqual(22); // (rng-0.5)*44
    });
    expect(G.sw[0].cd).toBe(75);
  });

  it('targets the HQ with weaker base shells when no trench is held ahead', () => {
    game('us', 'de');
    G.units = G.units.filter(u => u.side === 0);
    const tx = G.bases[1].x - 24;
    const dur = Math.min(7, Math.max(1.5, Math.abs(tx - G.bases[0].x) / 230));
    useSW(0);
    G.shells.forEach(s => {
      expect(s.dmg).toBe(70);
      expect(s.base).toBe(true);
      expect(s.dur).toBeCloseTo(dur, 10);
    });
  });
});

describe('it Caproni bombers', () => {
  it('one plane, eight bombs down the trench column', () => {
    game('it', 'de');
    const tx = G.LX[NT()];
    expect(useSW(0)).toBe(true);
    expect(G.planes).toHaveLength(1);
    const p = G.planes[0];
    expect(p).toMatchObject({ x: tx, y: -50, vy: 110, side: 0, t: 0, dur: (WH + 100) / 110 });
    expect(G.shells).toHaveLength(8);
    G.shells.forEach((s, i) => {
      const y = 22 + i * (WH - 44) / 7;
      expect(s.y1).toBeCloseTo(y, 10);
      expect(s.t).toBeCloseTo(-(y + 50) / 110, 10);
      expect(s).toMatchObject({ side: 0, type: 'barrage', dmg: 75, splash: 32, cov: 0.7, arc: 2, base: false, dur: 0.9 });
      expect(Math.abs(s.x1 - tx)).toBeLessThanOrEqual(7); // (rng-0.5)*14
    });
    stepSW(0.5);
    expect(G.planes[0].y).toBeCloseTo(5, 10);
    expect(G.planes[0].t).toBeCloseTo(0.5, 10);
  });

  it('bombs the HQ with base shells when no trench is held ahead', () => {
    game('it', 'de');
    G.units = G.units.filter(u => u.side === 0);
    useSW(0);
    expect(G.planes[0].x).toBe(G.bases[1].x - 24);
    G.shells.forEach(s => { expect(s.dmg).toBe(50); expect(s.base).toBe(true); });
  });
});

describe('ah Škoda 42 cm', () => {
  it('three big razing shells staggered 1.3 s', () => {
    game('ah', 'de');
    const tx = G.LX[NT()];
    expect(useSW(0)).toBe(true);
    expect(G.shells).toHaveLength(3);
    G.shells.forEach((s, i) => {
      expect(s.t).toBeCloseTo(-i * 1.3, 10);
      expect(s).toMatchObject({ side: 0, type: 'barrage', dmg: 180, splash: 70, cov: 0.85, arc: 3, big: true, raze: true, base: false, dur: 3 });
      expect(Math.abs(s.x1 - tx)).toBeLessThanOrEqual(8); // (rng-0.5)*16
    });
    expect(G.sw[0].cd).toBe(90);
  });

  it('enemy battery announces the target', () => {
    game('gb', 'ah');
    G.units = G.units.filter(u => u.side === 1); // no player units → target = player HQ
    useSW(1);
    expect(toasts[0]).toBe('42 cm shells are falling on your HQ.');
  });
});

describe('swBlock misc', () => {
  it('reports none for a nation without a superweapon', () => {
    game('gb', 'de');
    G.nation[0] = 'zz';
    expect(swBlock(0)).toBe('none');
  });
});

describe('stepSW bookkeeping', () => {
  it('ages planes out and cools both sides down', () => {
    game('it', 'de');
    useSW(0);
    G.sw[1].cd = 5;
    stepSW(1000);
    expect(G.planes).toHaveLength(0);
    expect(G.sw[0].cd).toBeLessThanOrEqual(0);
    expect(G.sw[1].cd).toBeLessThanOrEqual(0);
  });
});

describe('detonate (direct)', () => {
  it('can be driven directly for tests', () => {
    game('gb', 'de');
    const L = 3;
    const e = spawn(1, 'rifle', L, true); e.x = G.LX[L] + 2;
    detonate(0, L);
    expect(e.hp).toBeLessThanOrEqual(0);
  });
});

describe('national superweapon upgrades', () => {
  const up = (n, k = 'nat') => { for (let i = 0; i < n; i++) raise(0, k); };

  it('de T1 cooldown is 65; T3 fires two shells 1.5 s apart', () => {
    game('de', 'gb'); up(1);
    G.shells = [];
    expect(useSW(0, { x: 300, y: 100 })).toBe(true);
    expect(G.sw[0].cd).toBe(65);
    expect(G.shells).toHaveLength(1);
    expect(G.shells[0].dmg).toBe(700);
    game('de', 'gb'); up(3);
    G.shells = [];
    useSW(0, { x: 300, y: 100 });
    expect(G.shells).toHaveLength(2);
    expect(G.shells[0].dmg).toBe(900); expect(G.shells[0].splash).toBe(110);
    expect(G.shells[1].t).toBe(-1.5);
    expect(G.shells[1].dmg).toBe(900);
  });

  it('gb T1 tunnel is 15 s and costs 360; T2 blast is wider and stronger', () => {
    game('gb', 'de'); up(1);
    expect(swCost(0)).toBe(360);
    G.S.supplies = 1000; const before = G.S.supplies;
    expect(fireSuperweapon()).toBe(true);
    expect(G.S.supplies).toBe(before - 360);
    expect(G.sw[0].tunnel.t).toBe(15);
    game('gb', 'de');
    expect(swCost(0)).toBe(450);
    game('gb', 'de'); up(2);
    const L = 3, t = spawn(1, 'tkH', L, true); t.x = G.LX[L] + 90; t.hp = 1000;
    detonate(0, L);
    expect(t.hp).toBe(500);
  });

  it('aq T2 Colossus has max hp 11700; T3 sets damage and scale', () => {
    game('aq', 'gb'); up(2);
    useSW(0);
    let c = G.units.find(u => u.type === 'colossus');
    expect(c.max).toBe(11700); expect(c.hp).toBe(11700);
    expect(G.sw[0].cd).toBe(100);
    expect(c.dmgMul).toBeUndefined();
    game('aq', 'gb'); up(3);
    useSW(0);
    c = G.units.find(u => u.type === 'colossus');
    expect(c.dmgMul).toBe(1.3); expect(c.scale).toBe(1.15);
  });

  it('the bonus survives buying before 4:00', () => {
    game('de', 'gb'); G.S.t = 10; up(1);
    G.S.t = 300; G.shells = [];
    expect(useSW(0, { x: 300, y: 100 })).toBe(true);
    expect(G.sw[0].cd).toBe(65);
  });
});
