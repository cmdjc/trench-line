import { describe, it, expect, beforeEach } from 'vitest';
import { newGame, G } from '../../src/sim/state.js';
import { spawn, count, full, exposed } from '../../src/sim/geometry.js';
import { stepUnits, hurt, accVs } from '../../src/sim/combat.js';
import { stepBunkers } from '../../src/sim/fortify.js';
import { swBlock, useSW } from '../../src/sim/superweapons.js';
import { walkFront, validDrop, dropTarget, nearestDrop, spawnDrop } from '../../src/sim/drop.js';
import { startAiming, confirmAim, fireSuperweapon, select, buyUnit } from '../../src/sim/commands.js';
import { infCap } from '../../src/sim/base.js';
import { DROP_FALL, DROP_STAGGER, DROP_SCRAMBLE, DROP_SCRAMBLE_ACC, DROP_RANGE } from '../../src/data/drop.js';
import { FORTA } from '../../src/data/units.js';
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
    for (let i = 0; i < (DROP_FALL + DROP_STAGGER) * 10 + 5; i++) stepUnits(0.1);
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
  it('defenders in the drop trench shoot paratroopers while they are still falling', () => {
    G.units = [];
    G.fort[3] = 1; G.owner[3] = 1;
    for (let i = 0; i < 6; i++) spawn(1, 'rifle', 3, true);
    spawnDrop(0, 3);
    const hp0 = paras().reduce((a, u) => a + u.hp, 0);
    let hit = false;
    for (let i = 0; i < 40 && !hit; i++) {
      stepUnits(0.1);
      hit = paras().some(u => u.fall > 0 && u.hp < u.max);
    }
    expect(hit).toBe(true);
    expect(paras().reduce((a, u) => a + u.hp, 0)).toBeLessThan(hp0);
  });
});

describe('landing scramble', () => {
  beforeEach(game);
  /* damage a settled defender-side man takes from a rifle shot fired from another trench */
  const shot = e => { const h = e.hp; hurt(e, 10, 'rifle', null); return h - e.hp; };
  it('has no cover while falling and for DROP_SCRAMBLE seconds after landing, then normal cover', () => {
    G.units = []; G.fort[3] = 1;
    const u = spawn(0, 'rifle', 3, true); u.para = true; u.hp = u.max = 1e6;
    const covered = shot(u);
    expect(covered).toBeLessThan(10);
    u.fall = 0.1;
    expect(shot(u)).toBe(10); // falling: no cover either
    stepUnits(0.2);
    expect(u.scramble).toBe(DROP_SCRAMBLE);
    expect(shot(u)).toBe(10);
    stepUnits(DROP_SCRAMBLE - 0.5);
    expect(shot(u)).toBe(10);
    stepUnits(1);
    expect(u.scramble).toBeLessThanOrEqual(0);
    expect(shot(u)).toBeCloseTo(covered, 6);
  });
  it('fires at DROP_SCRAMBLE_ACC of its normal accuracy', () => {
    const hits = scr => {
      G.units = [];
      const a = spawn(0, 'rifle', 3, true), b = spawn(1, 'rifle', 3, true);
      b.hp = b.max = 1e9; b.cd = 1e9; b.y = a.y; b.x = a.x + 40;
      a.scramble = scr ? 1e9 : 0;
      let n = 0;
      for (let i = 0; i < 4000; i++) { a.cd = 0; const h = b.hp; stepUnits(0.001); if (b.hp < h) n++; }
      return n;
    };
    const normal = hits(false), scr = hits(true);
    expect(normal).toBeGreaterThan(1500);
    expect(scr / normal).toBeGreaterThan(DROP_SCRAMBLE_ACC - 0.08);
    expect(scr / normal).toBeLessThan(DROP_SCRAMBLE_ACC + 0.08);
  });
  it('does not touch units that never fell', () => {
    G.units = []; G.fort[3] = 1;
    const u = spawn(0, 'rifle', 3, true);
    stepUnits(1);
    expect(u.scramble).toBeUndefined();
    expect(shot(u)).toBeLessThan(10);
  });
});

describe('walking front is measured by position (no leapfrog via fresh orders)', () => {
  beforeEach(game);
  it('a unit ordered forward counts only for the trenches it has physically crossed', () => {
    const u = spawn(0, 'rifle', 1, true);
    u.line = 4; u.settled = false;          // ordered on, still standing at trench 1
    expect(walkFront(0)).toBe(1);
    u.x = (G.LX[2] + G.LX[3]) / 2;          // walked past trench 2
    expect(walkFront(0)).toBe(2);
    u.x = G.LX[4];
    expect(walkFront(0)).toBe(4);
  });
  it('mirrors for side 1', () => {
    G.units = [];
    const u = spawn(1, 'rifle', 8, true);
    u.line = 5; u.settled = false;
    expect(walkFront(1)).toBe(8);
    u.x = (G.LX[6] + G.LX[7]) / 2;
    expect(walkFront(1)).toBe(7);
  });
  it('a rifle bought for the drop trench does not grow drop range until it gets there (open)', () => {
    G.owner[2] = 1; G.owner[3] = 1;
    startAiming(); G.aim.line = 4; expect(confirmAim()).toBe(true);
    expect(select(4)).toBe(true);
    expect(buyUnit('rifle')).toBe(true);
    const r = G.units[G.units.length - 1];
    G.sw[0].cd = 0;
    expect(walkFront(0)).toBe(1);
    expect(validDrop(0, 5)).toBe(false);
    for (let i = 0; i < 2000 && !r.settled; i++) stepUnits(0.1);
    expect(Math.abs(r.x - G.LX[4])).toBeLessThan(10);
    expect(walkFront(0)).toBe(4);
    expect(validDrop(0, 4 + DROP_RANGE)).toBe(true);
  });
  it('on march a unit bought for the drop trench still starts at the HQ', () => {
    newGame('us', 'de', 'march', 7);
    G.units = []; spawn(0, 'rifle', 1, true);
    G.owner.fill(-1); G.owner[0] = 0; G.owner[1] = 0; G.owner[G.HQI] = 1;
    G.owner[2] = 1; G.owner[3] = 1;
    G.S.supplies = 1000; G.sw[0].cd = 0;
    startAiming(); G.aim.line = 4; expect(confirmAim()).toBe(true);
    select(4); expect(buyUnit('rifle')).toBe(true);
    const r = G.units[G.units.length - 1];
    expect(r.x).toBeLessThanOrEqual(G.LX[0]);
    expect(walkFront(0)).toBe(1);
    expect(validDrop(0, 5)).toBe(false);
  });
});

describe('exposed paratroopers (falling or scrambling)', () => {
  beforeEach(game);
  const states = { falling: u => { u.fall = 2; }, scrambling: u => { u.fall = 0; u.scramble = 2; } };
  it('exposed() is true only while falling or scrambling', () => {
    const u = spawn(0, 'rifle', 3, true);
    expect(exposed(u)).toBe(false);
    states.falling(u); expect(exposed(u)).toBe(true);
    states.scrambling(u); expect(exposed(u)).toBe(true);
    u.scramble = 0; expect(exposed(u)).toBe(false);
  });
  for (const [k, set] of Object.entries(states)) {
    it(k + ': no trench cover against fire from another trench', () => {
      G.fort[3] = 2;
      const u = spawn(0, 'rifle', 3, true); u.para = true; set(u); u.hp = u.max = 1e6;
      const shooter = spawn(1, 'rifle', 5, true), h = u.hp;
      hurt(u, 10, 'rifle', shooter);
      expect(h - u.hp).toBe(10);
    });
    it(k + ': shooters take no fortification accuracy penalty', () => {
      G.fort[3] = 2;
      const u = spawn(0, 'rifle', 3, true); u.para = true; set(u);
      expect(accVs(spawn(1, 'rifle', 5, true), u)).toBe(1);
    });
    it(k + ': does not heal', () => {
      G.M[0].heal = 5;
      const u = spawn(0, 'rifle', 3, true); u.para = true; set(u); u.hp = u.max / 2;
      if (u.fall > 0) u.fall = 50; else u.scramble = 50;
      stepUnits(0.5);
      expect(u.hp).toBe(u.max / 2);
    });
    it(k + ': cannot shelter in a bunker', () => {
      const b = spawn(0, 'bunker', 3, true); b.fixed = true; b.x = b.tx = G.LX[3]; b.y = 100;
      const u = spawn(0, 'rifle', 3, true); u.para = true; set(u);
      stepBunkers();
      expect(u.shelter).toBeFalsy();
    });
  }
  it('non-para units are unchanged: cover, fort penalty, healing, shelter', () => {
    G.fort[3] = 2; G.M[0].heal = 5;
    const u = spawn(0, 'rifle', 3, true), shooter = spawn(1, 'rifle', 5, true);
    u.hp = u.max = 1e6;
    const h = u.hp; hurt(u, 10, 'rifle', shooter);
    expect(h - u.hp).toBeLessThan(10);
    expect(accVs(shooter, u)).toBe(FORTA[2]);
    G.units = G.units.filter(e => e !== shooter);
    u.hp = u.max / 2; stepUnits(0.5);
    expect(u.hp).toBeGreaterThan(u.max / 2);
    const b = spawn(0, 'bunker', 3, true); b.fixed = true; b.x = b.tx = G.LX[3]; b.y = 100;
    stepBunkers();
    expect(u.shelter).toBe(b);
  });
  it('a landed paratrooper whose scramble is over is treated like any other unit', () => {
    G.fort[3] = 2;
    const u = spawn(0, 'rifle', 3, true); u.para = true; u.fall = 0; u.scramble = 0;
    expect(accVs(spawn(1, 'rifle', 5, true), u)).toBe(FORTA[2]);
  });
});

describe('falling tracers', () => {
  beforeEach(game);
  it('start at the drawn height of a falling Thompson', () => {
    G.units = [];
    const a = spawn(0, 'tommy', 3, true); a.para = true; a.fall = 3; a.cd = 0;
    const e = spawn(1, 'rifle', 3, true); e.cd = 99; e.x = a.x + 30; e.y = a.y; e.hp = e.max = 1e6;
    G.tracers.length = 0;
    stepUnits(0.1);
    expect(G.tracers.length).toBe(1);
    expect(G.tracers[0].y1).toBeCloseTo(a.y - a.fall * 14, 6);
  });
});
