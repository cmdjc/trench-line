import { describe, it, expect, beforeEach } from 'vitest';
import { newGame, G } from '../../src/sim/state.js';
import { spawn, count, full } from '../../src/sim/geometry.js';
import { stepUnits, hurt } from '../../src/sim/combat.js';
import { swBlock, useSW } from '../../src/sim/superweapons.js';
import { walkFront, validDrop, dropTarget, nearestDrop, spawnDrop } from '../../src/sim/drop.js';
import { startAiming, confirmAim, fireSuperweapon } from '../../src/sim/commands.js';
import { infCap } from '../../src/sim/base.js';
import { bus } from '../../src/core/events.js';

const toasts = [];
bus.on('toast', m => toasts.push(m));

/* US vs DE on a clean field: only side-0 units on line 1, owner[2..4] enemy, rest unset. */
function game() {
  newGame('us', 'de', 'open', 7);
  toasts.length = 0;
  G.units = G.units.filter(u => u.side === 0 && !u.fixed);
  G.units.forEach(u => { u.line = 1; });
  if (!G.units.length) spawn(0, 'rifle', 1, true);
  G.owner.fill(-1); G.owner[0] = 0; G.owner[1] = 0; G.owner[G.HQI] = 1;
  G.S.supplies = 1000; G.sw[0].cd = 0;
}
const paras = () => G.units.filter(u => u.para);

describe('walkFront / validDrop', () => {
  beforeEach(game);
  it('walkFront ignores paratroopers', () => {
    expect(walkFront(0)).toBe(1);
    const u = spawn(0, 'rifle', 4, true); u.para = true;
    expect(walkFront(0)).toBe(1);
    spawn(0, 'rifle', 2, true);
    expect(walkFront(0)).toBe(2);
  });
  it('side 1 walkFront mirrors and defaults to HQI', () => {
    expect(walkFront(1)).toBe(G.HQI);
    spawn(1, 'rifle', 5, true);
    expect(walkFront(1)).toBe(5);
  });
  it('validDrop: empty and enemy trenches in range', () => {
    expect(validDrop(0, 2)).toBe(true);
    G.owner[3] = 1;
    expect(validDrop(0, 3)).toBe(true);
    expect(validDrop(0, 4)).toBe(true);
  });
  it('validDrop rejects own trench, HQ, behind and out of range', () => {
    G.owner[2] = 0;
    expect(validDrop(0, 2)).toBe(false);
    expect(validDrop(0, 1)).toBe(false);
    expect(validDrop(0, 5)).toBe(false);
    expect(validDrop(0, G.HQI)).toBe(false);
    G.units.forEach(u => { u.line = G.NT - 1; });
    expect(validDrop(0, G.HQI)).toBe(false);
  });
  it('dropTarget scans from the front; nearestDrop picks by x', () => {
    G.owner[2] = 0;
    expect(dropTarget(0)).toBe(3);
    expect(nearestDrop(0, G.LX[4])).toBe(4);
    expect(nearestDrop(0, G.LX[2])).toBe(3);
  });
  it('side 1 range is mirrored', () => {
    G.units = G.units.filter(u => u.side === 0);
    spawn(1, 'rifle', 8, true);
    expect(validDrop(1, 7)).toBe(true);
    expect(validDrop(1, 5)).toBe(true);
    expect(validDrop(1, 4)).toBe(false);
    expect(validDrop(1, 8)).toBe(false);
    expect(dropTarget(1)).toBe(7);
  });
});

describe('spawnDrop', () => {
  beforeEach(game);
  it('adds 4 tommy, 2 rifle, 2 mg, all para, count unchanged', () => {
    const before = count(0);
    spawnDrop(0, 3);
    const p = paras(), n = k => p.filter(u => u.type === k).length;
    expect(p.length).toBe(8);
    expect([n('tommy'), n('rifle'), n('mg')]).toEqual([4, 2, 2]);
    expect(p.every(u => u.line === 3 && u.settled && u.fall >= 2)).toBe(true);
    expect(count(0)).toBe(before);
  });
  it('is cap exempt', () => {
    while (count(0) < infCap(0)) spawn(0, 'rifle', 1, true);
    expect(full(0, 'rifle')).toBe(true);
    spawnDrop(0, 3);
    expect(paras().length).toBe(8);
    expect(full(0, 'rifle')).toBe(true);
    expect(count(0)).toBe(infCap(0));
  });
  it('no leapfrog', () => {
    spawnDrop(0, 4);
    expect(walkFront(0)).toBe(1);
    expect(validDrop(0, 5)).toBe(false);
  });
});

describe('commands', () => {
  beforeEach(game);
  it('blocked with no valid trench', () => {
    for (let L = 2; L <= 4; L++) G.owner[L] = 0;
    expect(swBlock(0)).toBe('No enemy or empty trench within 3 trenches of your front.');
    expect(startAiming()).toBe(false);
  });
  it('charges once, sets cooldown, toasts', () => {
    expect(startAiming()).toBe(true);
    expect(G.aim).toEqual({ kind: 'drop', x: null, y: null, line: -1 });
    G.aim.line = 3;
    expect(confirmAim()).toBe(true);
    expect(G.S.supplies).toBe(1000 - 341);
    expect(G.sw[0].cd).toBe(30);
    expect(G.aim).toBe(null);
    expect(paras().length).toBe(8);
    expect(toasts).toContain('Paratroopers are jumping over trench 3.');
  });
  it('revalidates on confirm', () => {
    startAiming(); G.aim.line = 3;
    G.owner[3] = 0;
    expect(confirmAim()).toBe(false);
    expect(G.S.supplies).toBe(1000);
    expect(G.aim).not.toBe(null);
    expect(paras().length).toBe(0);
  });
  it('fireSuperweapon does not fire drop', () => {
    expect(fireSuperweapon()).toBe(false);
    expect(G.S.supplies).toBe(1000);
  });
  it('useSW falls back to dropTarget; enemy toast', () => {
    G.units = [];
    spawn(1, 'rifle', 8, true);
    G.owner[7] = 1; G.owner[6] = 0;
    G.nation[1] = 'us';
    expect(useSW(1, { line: 99 })).toBe(true);
    expect(paras().every(u => u.side === 1 && u.line === 6)).toBe(true);
    expect(toasts).toContain('Enemy paratroopers are landing at trench 6.');
  });
});

describe('falling', () => {
  beforeEach(game);
  function setup(type) {
    G.units = [];
    const a = spawn(0, type, 3, true); a.para = true; a.fall = 5; a.cd = 0;
    const e = spawn(1, 'rifle', 3, true); e.cd = 99; e.x = a.x + 30; e.y = a.y; e.hp = e.max = 1e6;
    G.tracers.length = 0;
    return { a, e };
  }
  it('falling rifle does not fire; falling tommy does', () => {
    let { a } = setup('rifle');
    stepUnits(0.1);
    expect(a.cd).toBeLessThanOrEqual(0);
    expect(G.tracers.length).toBe(0);
    ({ a } = setup('tommy'));
    stepUnits(0.1);
    expect(a.cd).toBeGreaterThan(0);
    expect(G.tracers.length).toBeGreaterThan(0);
  });
  it('falling units do not move, count down, and can be hurt', () => {
    const { a, e } = setup('rifle');
    a.line = 5; const x = a.x;
    stepUnits(0.5);
    expect(a.x).toBe(x);
    expect(a.fall).toBeCloseTo(4.5);
    const hp = a.hp;
    hurt(a, 5, 'rifle', e);
    expect(a.hp).toBeLessThan(hp);
  });
});

describe('landing and ownership', () => {
  beforeEach(game);
  it('empty trench stays unowned while all are falling, then flips once they land', () => {
    spawnDrop(0, 3);
    expect(G.owner[3]).toBe(-1);
    for (let i = 0; i < 15; i++) stepUnits(0.1);
    expect(paras().some(u => u.fall > 0)).toBe(true);
    expect(G.owner[3]).toBe(-1);
    for (let i = 0; i < 20; i++) stepUnits(0.1);
    expect(paras().every(u => !(u.fall > 0))).toBe(true);
    expect(G.owner[3]).toBe(0);
  });
  it('a falling tommy fires over several ticks, a falling rifle never does', () => {
    G.units = [];
    const t = spawn(0, 'tommy', 3, true), r = spawn(0, 'rifle', 3, true);
    for (const u of [t, r]) { u.para = true; u.fall = 5; u.cd = 0; }
    const e = spawn(1, 'rifle', 3, true); e.cd = 99; e.x = t.x + 30; e.y = t.y; e.hp = e.max = 1e6;
    r.y = t.y; r.x = t.x;
    let shots = 0, last = t.cd;
    for (let i = 0; i < 20; i++) { stepUnits(0.1); if (t.cd > last) shots++; last = t.cd; expect(r.cd).toBeLessThanOrEqual(0); }
    expect(shots).toBeGreaterThan(2);
  });
});
