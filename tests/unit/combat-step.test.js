// Task 9 — stepUnits: movement, rivers, hedgehogs, firing rules and the
// stray-tracer fix (DESIGN.md known quirk #3). Fixed dt drives everything.

import { describe, it, expect, beforeEach } from 'vitest';
import { rng } from '../../src/core/rng.js';
import { bus } from '../../src/core/events.js';
import { G, newGame } from '../../src/sim/state.js';
import { spawn, trenchX } from '../../src/sim/geometry.js';
import { stepUnits } from '../../src/sim/combat.js';
import { raise } from '../../src/sim/base.js';
import { WH, GARR_T, SPECIAL, CHILL_MULT, CHILL_DUR, ARM, NESTCOV } from '../../src/data/units.js';

const toasts = [];
bus.on('toast', m => toasts.push(m));

/** enemy that never fires back (per-unit T copy, shared STATS untouched) */
function mute(e) { e.T = { ...e.T, noFire: true }; e.hp = e.max = 1e5; return e; }
/** enemy stays where we put it (otherwise units walk to their posX target) */
function pin(e) { e.tx = e.x; e.ly = e.y; return e; }

beforeEach(() => {
  newGame('gb', 'de', 'open', 1);
  G.units.length = 0;
  G.shells.length = 0;
  toasts.length = 0;
});

describe('movement', () => {
  it('walks to its posX target and settles', () => {
    const u = spawn(0, 'rifle', 3);
    for (let i = 0; i < 25; i++) stepUnits(1);
    const tx = trenchX(G.LX[3], u.ly);
    expect(u.x).toBe(tx);
    expect(u.settled).toBe(true);
    expect(u.moving).toBe(false);
  });

  it('halts when an unsettled enemy stands within 40 px ahead', () => {
    const u = spawn(0, 'rifle', 3);
    const e = mute(spawn(1, 'rifle', 7, true));
    e.x = u.x + 30; e.y = u.y; e.settled = false; e.tx = e.x; e.ly = e.y;
    const x0 = u.x;
    for (let i = 0; i < 5; i++) stepUnits(0.5);
    expect(u.x).toBe(x0);
    expect(u.settled).toBe(false);
  });

  it('passes a settled enemy on the same line', () => {
    const u = spawn(0, 'rifle', 3);
    const e = mute(pin(spawn(1, 'rifle', 3, true)));
    e.x = u.x + 30; e.y = u.y; pin(e);
    for (let i = 0; i < 25; i++) stepUnits(1);
    expect(u.x).toBe(trenchX(G.LX[3], u.ly));
  });

  it('moveFire gates firing while moving (mortar holds fire, Lewis fires)', () => {
    const mo = spawn(0, 'mortar', 5); mo.cd = 0.001;
    const a = mute(spawn(1, 'rifle', 7, true)); a.x = mo.x + 100; a.y = mo.y; pin(a);
    G.bases[0].cd = 999; // keep the HQ gun out of the tracer count
    stepUnits(0.1);
    expect(G.shells.length).toBe(0);
    expect(mo.cd).toBeLessThan(0);

    const mg = spawn(0, 'mg', 5); mg.cd = 0.001;
    const b = mute(spawn(1, 'rifle', 7, true)); b.x = mg.x + 100; b.y = mg.y; pin(b);
    stepUnits(0.1);
    expect(G.tracers.length).toBe(1);
    expect(mg.cd).toBeGreaterThan(0);
  });

  it('respects minimum range', () => {
    const u = spawn(0, 'mortar', 3, true); u.cd = 0.001;
    const e = mute(spawn(1, 'rifle', 7, true)); e.x = u.x + 40; e.y = u.y; e.settled = false;
    stepUnits(0.1); stepUnits(0.1);
    expect(G.shells.length).toBe(0);
    expect(u.cd).toBeLessThan(-0.1);

    const far = mute(spawn(1, 'rifle', 7, true)); far.x = u.x + 200; far.y = u.y;
    stepUnits(0.1);
    expect(G.shells.length).toBe(1);
  });
});

describe('rivers', () => {
  beforeEach(() => { newGame('gb', 'de', 'river', 1); G.units.length = 0; G.shells.length = 0; });

  it('funnels foot units through the nearest bridge band', () => {
    const u = spawn(0, 'rifle', 5);
    const ly = u.y; // locked on first step
    const by = Math.abs(72 - ly) < Math.abs(228 - ly) ? 72 : 228;
    for (let i = 0; i < 60; i++) stepUnits(1);
    const r = G.RIV[0];
    expect(u.x).toBeGreaterThan(r.x1);           // crossed the first river
    expect(u.y).toBeGreaterThanOrEqual(by - 10.5);
    expect(u.y).toBeLessThanOrEqual(by + 10.5);  // stayed in the bridge band
  });

  it('lets big units cross anywhere in a straight line', () => {
    const u = spawn(1, 'tkS', 5); // de Ratte, big
    const y0 = u.y;
    for (let i = 0; i < 100; i++) stepUnits(2);
    expect(u.x).toBeGreaterThan(G.RIV[0].x0);    // reached/crossed the river
    expect(u.y).toBeCloseTo(y0, 10);
  });
});

describe('hedgehogs (legacy merge test)', () => {
  beforeEach(() => { newGame('ru', 'de', 'plain', 1); G.units.length = 0; G.shells.length = 0; });

  it('enemy-held super trench stops tanks, not giants, and infantry free them', () => {
    const hold = mute(spawn(1, 'rifle', 14, true)); hold.hp = hold.max = 1e7;
    G.owner[14] = 1;
    const tk = spawn(0, 'tank', 13, true); tk.hp = tk.max = 1e7; tk.line = 15;
    const ts = spawn(0, 'tsar', 13, true); ts.hp = ts.max = 1e7; ts.line = 15;
    G.S.t = 1;
    let hedgeToasts = 0;
    for (let i = 0; i < 45; i++) { stepUnits(1); hedgeToasts += toasts.filter(t => /Hedgehogs/.test(t)).length; toasts.length = 0; }
    expect(tk.x).toBeLessThan(G.LX[14] - 94);
    expect(tk.x).toBeGreaterThan(G.LX[13]);
    expect(ts.x).toBeGreaterThan(G.LX[14]);
    expect(hedgeToasts).toBe(1);

    hold.hp = 0;
    const mine = spawn(0, 'rifle', 14, true); mine.hp = mine.max = 1e7;
    G.owner[14] = 0;
    for (let i = 0; i < 45; i++) stepUnits(1);
    expect(tk.x).toBeGreaterThan(G.LX[14]);
  });
});

describe('firing rules', () => {
  it('cooldown lands in cd × mod × [0.85, 1.15]', () => {
    const u = spawn(0, 'rifle', 3, true); u.cd = 0.001;
    const e = mute(spawn(1, 'rifle', 7, true)); e.x = u.x + 100; e.y = u.y;
    const m = G.M[0];
    rng.reseed(5);
    stepUnits(0.1);
    const T = u.T;
    expect(u.cd).toBeGreaterThanOrEqual(T.cd * m.cd.rifle * 0.85 - 1e-9);
    expect(u.cd).toBeLessThanOrEqual(T.cd * m.cd.rifle * 1.15 + 1e-9);
  });

  it('BAR reloads after 20 shots (cd = reload)', () => {
    newGame('us', 'de', 'open', 1); G.units.length = 0; G.shells.length = 0;
    const u = spawn(0, 'mg', 3, true); u.cd = 0.001;
    const e = mute(spawn(1, 'rifle', 7, true)); e.x = u.x + 100; e.y = u.y; pin(e);
    let reload = null;
    for (let i = 0; i < 3000 && reload === null; i++) {
      stepUnits(0.06);
      if (u.shots === 0 && u.cd > 1) reload = u.cd;
    }
    expect(reload).toBe(1.7);
  });

  it('Chauchat jams force cd 2.4', () => {
    newGame('fr', 'de', 'open', 1); G.units.length = 0; G.shells.length = 0;
    const u = spawn(0, 'mg', 3, true); u.cd = 0.001;
    const e = mute(spawn(1, 'rifle', 7, true)); e.x = u.x + 100; e.y = u.y; pin(e);
    rng.reseed(42);
    let jammed = false;
    for (let i = 0; i < 400 && !jammed; i++) { stepUnits(0.05); if (Math.abs(u.cd - 2.4) < 1e-9) jammed = true; }
    expect(jammed).toBe(true);
  });

  it('shells carry type, splash, cov, arc and base fields', () => {
    const u = spawn(0, 'mortar', 3, true); u.cd = 0.001;
    const e = mute(spawn(1, 'rifle', 7, true)); e.x = u.x + 200; e.y = u.y; pin(e);
    stepUnits(0.1);
    expect(G.tracers.length).toBe(0);
    const s = G.shells[0];
    expect(s).toBeTruthy();
    expect(s.dur).toBe(1.1);
    expect(s.type).toBe('mortar');
    expect(s.dmg).toBe(22);
    expect(s.splash).toBe(32);
    expect(s.arc).toBe(1);
    expect(s.side).toBe(0);
    expect(s.x1).toBe(e.x);
    expect(s.y1).toBe(e.y);
    expect('cov' in s).toBe(true);

    G.shells.length = 0;
    const u2 = spawn(0, 'mortar', 8, true); u2.cd = 0.001;
    stepUnits(0.1); // no enemy: fires at the enemy HQ
    const b = G.shells[0];
    expect(b).toBeTruthy();
    expect(b.base).toBe(true);
    expect(b.dmg).toBe(33); // 22 × 1.5
    expect(b.x1).toBe(G.bases[1].x - 20);
  });
});

describe('stray-tracer fix (the bug)', () => {
  function fireWith(acc) {
    G.units.length = 0; G.tracers.length = 0;
    const u = spawn(0, 'rifle', 3, true); u.cd = 0.001;
    u.T = { ...u.T, acc };
    // same line as the attacker: pinned units settle, and a settled defender
    // on the attacker's line takes full damage (no trench cover exemption needed)
    const e = mute(spawn(1, 'rifle', 3, true)); e.x = u.x + 80; e.y = u.y; pin(e);
    const hp0 = e.hp;
    stepUnits(0.1);
    return { e, hp0 };
  }

  it('a sure hit draws exactly one hit tracer', () => {
    const { e, hp0 } = fireWith(1);
    expect(G.tracers.length).toBe(1);
    expect(G.tracers[0].col).toBe('#ffe9a8');
    expect(e.hp).toBe(hp0 - 8);
  });

  it('a sure miss draws exactly one faint tracer', () => {
    const { e, hp0 } = fireWith(0);
    expect(G.tracers.length).toBe(1);
    expect(G.tracers[0].col).toBe('rgba(255,233,168,.6)');
    expect(e.hp).toBe(hp0);
  });

  it('shell weapons draw no tracer either way', () => {
    fireWith(1); // reset enemy geometry, ignore outcome
    G.units.length = 0; G.tracers.length = 0; G.shells.length = 0;
    const u = spawn(0, 'mortar', 3, true); u.cd = 0.001;
    u.T = { ...u.T, acc: 0 };
    const e2 = mute(spawn(1, 'rifle', 7, true)); e2.x = u.x + 150; e2.y = u.y;
    stepUnits(0.1);
    expect(G.tracers.length).toBe(0);
    expect(G.shells.length).toBe(1);
  });
});

describe('HQ guns', () => {
  it('fire within 270 px only, 0.55 × accVs hit chance, 9 × dmg', () => {
    const e = mute(spawn(1, 'rifle', 7, true));
    e.x = G.LX[0] + 200; e.y = 150; pin(e);
    rng.reseed(3);
    for (let i = 0; i < 40; i++) stepUnits(0.1);
    expect(G.bases[0].cd).toBe(0.25);
    expect(e.hp).toBeLessThan(e.max); // at least one 9-dmg hit landed
  });

  it('ignore anything beyond 270 px', () => {
    const e = mute(spawn(1, 'rifle', 7, true));
    e.x = G.LX[0] + 400; e.y = 150; e.settled = false;
    for (let i = 0; i < 40; i++) stepUnits(0.1);
    expect(G.tracers.length).toBe(0);
    expect(e.hp).toBe(e.max);
  });
});

describe('shell landings', () => {
  it('splash hurts units inside the radius only, with cover', () => {
    const e1 = mute(spawn(1, 'rifle', 5, true)); pin(e1); // settled trench → COV.barrage 0.7
    const e2 = mute(spawn(1, 'rifle', 5, true)); e2.x = e1.x + 20; e2.y = e1.y;
    e2.tx = e2.x + 100; e2.ly = e2.y; // keeps walking → stays unsettled
    const e3 = mute(spawn(1, 'rifle', 5, true)); e3.x = e1.x + 300; e3.y = e1.y;
    e3.tx = e3.x + 100; e3.ly = e3.y;
    const h1 = e1.hp, h2 = e2.hp, h3 = e3.hp;
    G.shells.push({ x0: 0, y0: 0, x1: e1.x, y1: e1.y, t: 1, dur: 1, side: 0, type: 'barrage', dmg: 50, splash: 40 });
    stepUnits(0.01);
    expect(h1 - e1.hp).toBeCloseTo(35, 6); // 50 × 0.7 trench cover
    expect(h2 - e2.hp).toBe(50);           // unsettled: full damage
    expect(e3.hp).toBe(h3);                // outside the splash
    expect(G.booms.length).toBe(1);
  });

  it('base shells hit the HQ for full damage and spare units', () => {
    const e = mute(spawn(1, 'rifle', 5, true));
    const hp0 = G.bases[1].hp;
    G.shells.push({ x0: 0, y0: 0, x1: e.x, y1: e.y, t: 1, dur: 1, side: 0, type: 'tank', dmg: 60, splash: 40, base: true });
    stepUnits(0.01);
    expect(hp0 - G.bases[1].hp).toBe(60);
    expect(e.hp).toBe(e.max);
  });

  it('siege shells strip a fort level 40% of the time', () => {
    G.fort[3] = 2; G.owner[3] = 0;
    G.shells.push({ x0: 0, y0: 0, x1: G.LX[3] + 5, y1: 150, t: 1, dur: 1, side: 0, type: 'mortar', dmg: 10, splash: 10, siege: true });
    rng.reseed(9);
    const roll = rng.float();
    rng.reseed(9);
    stepUnits(0.01);
    if (roll < 0.4) {
      expect(G.fort[3]).toBe(1);
      expect(toasts.some(t => /siege shell smashed/.test(t))).toBe(true);
    } else {
      expect(G.fort[3]).toBe(2);
    }
  });

  it('huge shells raze forts, honour falloff and shake the screen', () => {
    G.fort[3] = 1; G.owner[3] = 1;
    G.fields.push({ side: 1, line: 3, type: 'mines', x: G.LX[3], hp: 1 });
    G.fields.push({ side: 0, line: 3, type: 'wire', x: G.LX[3], w: 46, hp: 100 });
    const e1 = mute(spawn(1, 'rifle', 3, true)); e1.x = G.LX[3] + 10; e1.y = 150; pin(e1);
    const e2 = mute(spawn(1, 'rifle', 3, true)); e2.x = G.LX[3] + 55; e2.y = 150; pin(e2);
    const e3 = mute(spawn(1, 'rifle', 3, true)); e3.x = G.LX[3] + 105; e3.y = 150; pin(e3);
    const h1 = e1.hp, h2 = e2.hp;
    const x1 = G.LX[3] + 10;
    G.shells.push({ x0: 0, y0: 0, x1, y1: 150, t: 1, dur: 1, side: 0, type: 'barrage', dmg: 700, splash: 90, rz: 80, huge: true, big: true });
    stepUnits(0.01);
    expect(G.fort[3]).toBe(0);
    expect(G.fields.some(f => f.side === 1 && f.line === 3)).toBe(false);
    expect(G.fields.some(f => f.side === 0 && f.line === 3)).toBe(true);
    expect(h1 - e1.hp).toBeCloseTo(490, 6);    // 700 × 0.7 cover
    expect(h2 - e2.hp).toBeCloseTo(355.25, 6); // 700 × (1 − 0.55·0.5) × 0.7
    expect(e3.hp).toBe(e3.max);                // d 95 > splash 90
    expect(G.shake).toBe(10);
    expect(G.booms.length).toBe(9);
    expect(G.scorch.some(s => Math.abs(s.x - x1) < 1)).toBe(true);
    expect(G.bases[1].hp).toBe(G.bases[1].max); // HQ far away
  });

  it('the Paris Gun toasts when it levels your forts, and spares your HQ only by distance', () => {
    G.fort[2] = 1; G.owner[2] = 0;
    G.shells.push({ x0: 0, y0: 0, x1: G.LX[2] + 10, y1: 150, t: 1, dur: 1, side: 1, type: 'barrage', dmg: 700, splash: 90, rz: 80, huge: true, big: true });
    stepUnits(0.01);
    expect(G.fort[2]).toBe(0);
    expect(toasts.some(t => /Paris Gun has levelled/.test(t))).toBe(true);
  });

  it('a huge shell directly on the HQ deals 0.8 × falloff damage', () => {
    G.reduceMotion = true; G.shake = 0;
    const hp0 = G.bases[1].hp;
    G.shells.push({ x0: 0, y0: 0, x1: G.bases[1].x, y1: WH / 2, t: 1, dur: 1, side: 0, type: 'barrage', dmg: 700, splash: 90, rz: 80, huge: true, big: true });
    stepUnits(0.01);
    expect(hp0 - G.bases[1].hp).toBeCloseTo(560, 6); // 700 × 0.8
    expect(G.shake).toBe(0); // reduceMotion suppresses shake
  });
});

describe('line ownership', () => {
  it('flips to the only settled side and holds when mixed or empty', () => {
    spawn(0, 'rifle', 5, true); spawn(0, 'rifle', 5, true);
    stepUnits(0.01);
    expect(G.owner[5]).toBe(0);

    G.owner[5] = 1;
    const e = mute(spawn(1, 'rifle', 5, true));
    spawn(0, 'rifle', 5, true);
    stepUnits(0.01);
    expect(G.owner[5]).toBe(1); // mixed: unchanged
    void e;

    G.units.length = 0;
    G.owner[5] = 0;
    stepUnits(0.01);
    expect(G.owner[5]).toBe(0); // empty: unchanged
  });

  it('nests flip to the side that solely holds their line', () => {
    const n = spawn(0, 'nest', 5, true);
    n.fixed = true; n.x = n.tx = G.LX[5] - 30; n.y = WH * 0.5;
    n.hp = 10;
    mute(spawn(1, 'rifle', 5, true));
    mute(spawn(1, 'rifle', 5, true));
    stepUnits(0.01);
    expect(n.side).toBe(1);
    expect(n.hp).toBe(n.max * 0.5);
    expect(n.cd).toBe(1);
    expect(toasts.some(t => /The enemy captured your MG nest at trench 5/.test(t))).toBe(true);
  });
});

describe('super trench (march map)', () => {
  beforeEach(() => { newGame('gb', 'de', 'march', 1); G.units.length = 0; G.shells.length = 0; });

  it('first capture builds the guns, pays a card and toasts', () => {
    spawn(0, 'rifle', G.SUPER, true);
    stepUnits(0.01);
    expect(G.owner[G.SUPER]).toBe(0);
    expect(G.S.superOwner).toBe(0);
    const guns = G.units.filter(u => u.fixed && u.line === G.SUPER);
    expect(guns.length).toBe(3);
    expect(guns.every(g => g.T.nest)).toBe(true);
    for (const g of guns) expect(g.hp).toBeCloseTo(SPECIAL[g.type].hp * 1.6, 6);
    expect(toasts.some(t => /You hold the super trench/.test(t))).toBe(true);
    expect(G.S.superCard).toBe(true);
    expect(G.S.pending).toBe(1);
  });
});

describe('AH garrison', () => {
  beforeEach(() => { newGame('ah', 'de', 'open', 1); G.units.length = 0; G.shells.length = 0; });

  it('three settled troops raise the fort after GARR_T seconds', () => {
    spawn(0, 'rifle', 3, true); spawn(0, 'rifle', 3, true); spawn(0, 'rifle', 3, true);
    expect(GARR_T[0]).toBe(50);
    stepUnits(50);
    expect(G.fort[3]).toBe(1);
    expect(G.garr[3]).toBe(0);
    expect(toasts.some(t => /garrison has fortified trench 3 to level 1/.test(t))).toBe(true);
  });

  it('fewer than three troops never accrue', () => {
    spawn(0, 'rifle', 3, true); spawn(0, 'rifle', 3, true);
    stepUnits(60);
    expect(G.garr[3]).toBe(0);
    expect(G.fort[3]).toBe(0);
  });
});

describe('barrage card', () => {
  it('every 10 s shells the frontmost settled enemy', () => {
    G.M[0].barrage = 3;
    G.S.barrageT = 0.5;
    const deep = mute(spawn(1, 'rifle', 3, true));   // closest to your lines
    const back = mute(spawn(1, 'rifle', 7, true));
    stepUnits(1);
    expect(G.shells.length).toBe(3);
    expect(G.S.barrageT).toBe(10);
    for (const s of G.shells) {
      expect(s.type).toBe('barrage');
      expect(s.side).toBe(0);
      expect(s.dmg).toBe(26);
      expect(s.splash).toBe(36);
      expect(s.arc).toBe(1.5);
      expect(Math.abs(s.x1 - deep.x)).toBeLessThanOrEqual(13);
      expect(s.y1).toBeGreaterThanOrEqual(20);
      expect(s.y1).toBeLessThanOrEqual(WH - 20);
    }
    expect(deep.x).toBeLessThan(back.x);
    stepUnits(1);
    expect(G.shells.length).toBe(3); // no new volley inside the window
  });
});

describe('antarctica chill', () => {
  beforeEach(() => {
    newGame('aq', 'de', 'open', 1);
    G.units.length = 0;
    G.shells.length = 0;
    G.bases[0].cd = G.bases[1].cd = 999;
  });

  /** drops a landed shell straight onto e's position */
  function land(side, type, e, extra = {}) {
    const s = { x0: 0, y0: 0, x1: e.x, y1: e.y, t: 1, dur: 1, side, type, dmg: 1, splash: 40, ...extra };
    G.shells.push(s);
    return s;
  }

  it('chills armour and infantry alike', () => {
    const rifle = mute(pin(spawn(1, 'rifle', 5, true)));
    const tank = mute(pin(spawn(1, 'tkL', 5, true)));
    tank.x = rifle.x; tank.y = rifle.y; tank.tx = tank.x; tank.ly = tank.y;
    const far = mute(pin(spawn(1, 'rifle', 5, true)));
    far.x = rifle.x + 300; far.tx = far.x;
    const friend = spawn(0, 'rifle', 5, true);
    friend.x = rifle.x; friend.y = rifle.y;
    const rHp = rifle.hp, tHp = tank.hp, fHp = friend.hp;

    land(0, 'tank', rifle);
    stepUnits(0.01);

    expect(rifle.chilled).toBe(CHILL_DUR);
    expect(rifle.hp).toBeLessThan(rHp);
    expect(tank.chilled).toBe(CHILL_DUR);
    expect(tank.hp).toBeLessThan(tHp);
    expect(far.chilled).toBeUndefined();
    expect(friend.chilled).toBeUndefined();
    expect(friend.hp).toBe(fHp);
  });

  it('only aq tank shells chill', () => {
    const e1 = mute(pin(spawn(1, 'rifle', 5, true)));
    land(0, 'mortar', e1);
    stepUnits(0.01);
    expect(e1.chilled).toBeUndefined();

    newGame('gb', 'de', 'open', 1);
    G.units.length = 0; G.shells.length = 0; G.bases[0].cd = G.bases[1].cd = 999;
    const e2 = mute(pin(spawn(1, 'rifle', 5, true)));
    land(0, 'tank', e2);
    stepUnits(0.01);
    expect(e2.chilled).toBeUndefined();

    newGame('aq', 'de', 'open', 1);
    G.units.length = 0; G.shells.length = 0; G.bases[0].cd = G.bases[1].cd = 999;
    const e3 = mute(pin(spawn(1, 'rifle', 5, true)));
    land(0, 'tank', e3, { base: true });
    stepUnits(0.01);
    expect(e3.chilled).toBeUndefined();
  });

  it('a repeat hit refreshes, never stacks', () => {
    const e = mute(pin(spawn(1, 'rifle', 5, true)));
    e.chilled = 1;
    land(0, 'tank', e);
    stepUnits(0.01);
    expect(e.chilled).toBe(CHILL_DUR);

    land(0, 'tank', e);
    land(0, 'tank', e);
    stepUnits(0.01);
    expect(e.chilled).toBe(CHILL_DUR);
  });

  /** fresh lone unit walking 60 px toward tx, clear of hedgehogs and every other unit */
  function freshWalker(type) {
    G.units.length = 0; G.shells.length = 0;
    const e = mute(spawn(1, type, 5, true));
    e.tx = e.x - 60; e.ly = e.y; e.settled = false;
    return e;
  }
  function stepDist(e, dt) { const x0 = e.x; stepUnits(dt); return x0 - e.x; }

  it('chilled units walk at CHILL_MULT speed', () => {
    for (const type of ['rifle', 'tkL']) {
      const e = freshWalker(type);
      const d1 = stepDist(e, 0.1);
      e.chilled = CHILL_DUR;
      const d2 = stepDist(e, 0.1);
      expect(d2 / d1).toBeCloseTo(CHILL_MULT, 6);
      expect(e.chilled).toBeCloseTo(CHILL_DUR - 0.1, 9);
    }
  });

  it('chill wears off after CHILL_DUR', () => {
    const base = freshWalker('rifle');
    const d1 = stepDist(base, 0.1);

    const e = freshWalker('rifle');
    e.chilled = 0.05;
    const d2 = stepDist(e, 0.1);
    expect(e.chilled).toBeLessThanOrEqual(0);
    expect(d2).toBe(d1);

    const after = e.chilled;
    stepUnits(0.1);
    expect(e.chilled).toBe(after);
  });

  it('instant-hit fire never chills', () => {
    const w = spawn(0, 'tank', 3, true); w.cd = 99;
    const foeA = pin(spawn(1, 'rifle', 7, true));
    foeA.x = w.x + 100; foeA.y = w.y; foeA.tx = foeA.x; foeA.hp = foeA.max = 1e6;
    const h0 = foeA.hp;
    for (let i = 0; i < 200; i++) { stepUnits(0.05); expect(G.shells.length).toBe(0); }
    expect(foeA.hp).toBeLessThan(h0);
    expect(foeA.chilled).toBeUndefined();

    G.units.length = 0; G.shells.length = 0;
    const r = spawn(0, 'tkL', 3, true); r.cd = 0.001;
    const foeB = pin(spawn(1, 'rifle', 7, true));
    foeB.x = r.x + 100; foeB.y = r.y; foeB.tx = foeB.x; foeB.hp = foeB.max = 1e6;
    const h1 = foeB.hp;
    let sawShell = false;
    for (let i = 0; i < 100; i++) { stepUnits(0.05); if (G.shells.length) sawShell = true; }
    expect(foeB.hp).toBeLessThan(h1);
    expect(sawShell).toBe(false);
    expect(foeB.chilled).toBeUndefined();
  });

  it('chill draws no rng', () => {
    function once(nat) {
      newGame(nat, 'de', 'open', 1);
      G.units.length = 0; G.shells.length = 0;
      G.bases[0].cd = G.bases[1].cd = 999;
      const e = mute(pin(spawn(1, 'rifle', 5, true)));
      land(0, 'tank', e);
      rng.reseed(5);
      stepUnits(0.01);
      return { v: rng.float(), chilled: e.chilled };
    }
    const a = once('aq'), b = once('gb');
    expect(a.v).toBe(b.v);
    expect(a.chilled).toBe(CHILL_DUR);
    expect(b.chilled).toBeUndefined();
  });
});

describe('rammstosstrupp', () => {
  beforeEach(() => {
    newGame('sx', 'de', 'open', 1);
    G.units.length = 0; G.shells.length = 0;
    G.bases[0].cd = G.bases[1].cd = 999;
  });

  it('rams a target inside the mortar\'s dead zone', () => {
    const r = spawn(0, 'raider', 5, true); r.cd = 0.001;
    r.T = { ...r.T, ram: { ...r.T.ram, acc: 1 } };
    const foe = mute(pin(spawn(1, 'rifle', 7, true)));
    foe.x = r.x + 60; foe.y = r.y;
    stepUnits(0.01);
    expect(G.shells.length).toBe(0);
    expect(r.mode).toBe('ram');
    expect(foe.hp).toBe(foe.max - 24);
    expect(r.cd).toBeGreaterThanOrEqual(1.2 * 0.85 - 1e-9);
    expect(r.cd).toBeLessThanOrEqual(1.2 * 1.15 + 1e-9);
  });

  it('boundary: just inside min range rams, exactly at min range mortars', () => {
    function setup(dx) {
      G.units.length = 0; G.shells.length = 0; G.tracers.length = 0;
      const r = spawn(0, 'raider', 5, true); r.cd = 0.001;
      const foe = mute(pin(spawn(1, 'rifle', 7, true)));
      foe.x = r.x + dx; foe.y = r.y;
      return { r, foe };
    }
    let { r } = setup(89.999);
    stepUnits(0.01);
    expect(G.shells.length).toBe(0);
    expect(r.mode).toBe('ram');

    let { r: r2, foe: foe2 } = setup(90);
    const hp0 = foe2.hp;
    stepUnits(0.01);
    expect(G.shells.length).toBe(1);
    expect(G.shells[0]).toEqual(expect.objectContaining({ type: 'mortar', side: 0, arc: 1, splash: 28 }));
    expect(r2.mode).toBe('mortar');
    expect(foe2.hp).toBe(hp0);

    setup(300);
    stepUnits(0.01);
    expect(G.shells.length).toBe(1);
    expect(G.shells[0].type).toBe('mortar');
  });

  it('fires at most one weapon per frame, and switches as the near target dies', () => {
    const r = spawn(0, 'raider', 5, true); r.cd = 0.001;
    const near = mute(pin(spawn(1, 'rifle', 7, true))); near.x = r.x + 60; near.y = r.y;
    const far = mute(pin(spawn(1, 'rifle', 7, true))); far.x = r.x + 250; far.y = r.y;
    let sawRam = false, sawMortar = false;
    for (let i = 0; i < 300; i++) {
      G.tracers.length = 0;
      const s0 = G.shells.length;
      stepUnits(0.05);
      const shellsAdded = G.shells.length - s0;
      const ramTracers = G.tracers.filter(t => t.w === 1.6 || t.w === 0.8).length;
      expect(shellsAdded).toBeLessThanOrEqual(1);
      expect(ramTracers).toBeLessThanOrEqual(1);
      expect(shellsAdded > 0 && ramTracers > 0).toBe(false);
      if (ramTracers > 0) sawRam = true;
      if (shellsAdded > 0) sawMortar = true;
      if (i === 150) near.hp = 0;
    }
    expect(sawRam).toBe(true);
    expect(sawMortar).toBe(true);
  });

  it('ram bonus damage against armour and emplacements', () => {
    const r = spawn(0, 'raider', 5, true); r.cd = 0.001;
    r.T = { ...r.T, ram: { ...r.T.ram, acc: 1 } };
    const tank = mute(pin(spawn(1, 'tank', 7, true)));
    tank.x = r.x + 60; tank.y = r.y;
    stepUnits(0.01);
    expect(tank.hp).toBe(tank.max - 24 * 2 * ARM.raider);

    G.units.length = 0; G.shells.length = 0;
    const r2 = spawn(0, 'raider', 5, true); r2.cd = 0.001;
    r2.T = { ...r2.T, ram: { ...r2.T.ram, acc: 1 } };
    const nest = mute(pin(spawn(1, 'nest', 7, true)));
    nest.x = r2.x + 60; nest.y = r2.y;
    stepUnits(0.01);
    expect(nest.hp).toBe(nest.max - 24 * 2 * NESTCOV.raider);
  });

  it('ram ignores trench cover', () => {
    const r = spawn(0, 'raider', 5, true); r.cd = 0.001;
    r.T = { ...r.T, ram: { ...r.T.ram, acc: 1 } };
    const foe = mute(pin(spawn(1, 'rifle', 7, true)));
    foe.x = r.x + 60; foe.y = r.y;
    G.fort[7] = 2;
    stepUnits(0.01);
    expect(foe.hp).toBe(foe.max - 24);
  });

  it('rams the enemy HQ from the dead zone, and shells it from beyond', () => {
    const r = spawn(0, 'raider', 5, true); r.cd = 0.001;
    r.x = G.bases[1].x - 60; pin(r);
    const hp0 = G.bases[1].hp;
    stepUnits(0.01);
    expect(G.bases[1].hp).toBe(hp0 - 24);
    expect(G.shells.length).toBe(0);
    expect(r.mode).toBe('ram');

    G.units.length = 0; G.shells.length = 0;
    const r2 = spawn(0, 'raider', 5, true); r2.cd = 0.001;
    r2.x = G.bases[1].x - 200; pin(r2);
    stepUnits(0.01);
    expect(G.shells.length).toBe(1);
    expect(G.shells[0].base).toBe(true);
  });

  it('holds both weapons while moving', () => {
    const r = spawn(0, 'raider', 5, true); r.cd = 0.001;
    r.tx = r.x + 200;
    const foe = mute(pin(spawn(1, 'rifle', 7, true)));
    foe.x = r.x + 60; foe.y = r.y; foe.line = r.line;
    stepUnits(0.1);
    expect(G.shells.length).toBe(0);
    expect(G.tracers.length).toBe(0);
  });

  it('other mortars still idle up close', () => {
    newGame('gb', 'de', 'open', 1);
    G.units.length = 0; G.shells.length = 0;
    G.bases[0].cd = G.bases[1].cd = 999;
    const u = spawn(0, 'mortar', 5, true); u.cd = 0.001;
    const foe = mute(pin(spawn(1, 'rifle', 7, true)));
    foe.x = u.x + 60; foe.y = u.y;
    for (let i = 0; i < 40; i++) stepUnits(0.1);
    expect(G.shells.length).toBe(0);
    expect(G.tracers.length).toBe(0);
    expect(foe.hp).toBe(foe.max);
    expect('mode' in u).toBe(false);
  });

  it('the switch itself draws no rng', () => {
    newGame('sx', 'de', 'open', 1);
    G.units.length = 0; G.shells.length = 0;
    G.bases[0].cd = G.bases[1].cd = 999;
    const r = spawn(0, 'raider', 5, true); r.cd = 0.001;
    const foe = mute(pin(spawn(1, 'rifle', 7, true)));
    foe.x = r.x + 300; foe.y = r.y;
    rng.reseed(9);
    stepUnits(0.01);
    const a = rng.float();

    newGame('gb', 'de', 'open', 1);
    G.units.length = 0; G.shells.length = 0;
    G.bases[0].cd = G.bases[1].cd = 999;
    const m = spawn(0, 'mortar', 5, true); m.cd = 0.001;
    const foe2 = mute(pin(spawn(1, 'rifle', 7, true)));
    foe2.x = m.x + 300; foe2.y = m.y;
    rng.reseed(9);
    stepUnits(0.01);
    const b = rng.float();

    expect(a).toBe(b);
  });
});

describe('saxon mechs', () => {
  beforeEach(() => {
    newGame('sx', 'de', 'open', 1);
    G.units.length = 0; G.shells.length = 0;
    G.bases[0].cd = G.bases[1].cd = 999;
  });

  it('erlkönig holds fire up close', () => {
    const u = spawn(0, 'tkM', 5, true); u.settled = true; u.cd = 0.001;
    const foe = mute(pin(spawn(1, 'rifle', 7, true))); foe.x = u.x + 100; foe.y = u.y;
    for (let i = 0; i < 40; i++) stepUnits(1);
    expect(G.shells.length).toBe(0);
  });

  it('erlkönig shells at range', () => {
    const u = spawn(0, 'tkM', 5, true); u.settled = true; u.cd = 0.001;
    const foe = mute(pin(spawn(1, 'rifle', 7, true))); foe.x = u.x + 300; foe.y = u.y;
    stepUnits(0.1);
    expect(G.shells).toContainEqual(expect.objectContaining({ type: 'mortar' }));
  });

  it('erlkönig never fires on the move', () => {
    const u = spawn(0, 'tkM', 5, true); u.cd = 0.001; u.tx = u.x + 300;
    const foe = mute(pin(spawn(1, 'rifle', 7, true))); foe.x = u.x + 300; foe.y = u.y; foe.line = u.line;
    stepUnits(0.1);
    expect(G.shells.length).toBe(0);
  });

  it('rübezahl crushes', () => {
    const u = spawn(0, 'ruebezahl', 5, true); u.settled = true;
    const foe = mute(pin(spawn(1, 'rifle', 7, true))); foe.x = u.x + 40; foe.y = u.y;
    const hp0 = foe.hp;
    stepUnits(1);
    expect(foe.hp).toBeLessThan(hp0);
  });
});

describe('repair workshop', () => {
  beforeEach(() => {
    newGame('sx', 'de', 'open', 1);
    G.units.length = 0; G.shells.length = 0;
    G.bases[0].cd = G.bases[1].cd = 999;
    G.M[0].heal = 0;
  });

  it('heals a settled mech holding the trench', () => {
    const w = spawn(0, 'workshop', 3, true); w.fixed = true;
    const k = spawn(0, 'tank', 3, true); k.settled = true; k.hp = k.max - 100;
    stepUnits(1);
    expect(k.hp).toBeCloseTo(k.max - 100 + 6);
  });

  it('is capped at max', () => {
    const w = spawn(0, 'workshop', 3, true); w.fixed = true;
    const k = spawn(0, 'tank', 3, true); k.settled = true; k.hp = k.max - 1;
    stepUnits(1);
    expect(k.hp).toBe(k.max);
  });

  it('no workshop, no heal', () => {
    const k = spawn(0, 'tank', 3, true); k.settled = true; k.hp = k.max - 100;
    stepUnits(1);
    expect(k.hp).toBe(k.max - 100);
  });

  it('not one trench over', () => {
    const w = spawn(0, 'workshop', 3, true); w.fixed = true;
    const k = spawn(0, 'tank', 4, true); k.settled = true; k.hp = k.max - 100;
    stepUnits(1);
    expect(k.hp).toBe(k.max - 100);
  });

  it('not a mech passing through', () => {
    const w = spawn(0, 'workshop', 3, true); w.fixed = true;
    const k = spawn(0, 'tank', 5, true);
    k.line = 5; k.settled = false; k.x = G.LX[3]; k.hp = k.max - 100;
    for (let i = 0; i < 10; i++) stepUnits(0.1);
    expect(k.hp).toBe(k.max - 100);
  });

  it('not a retreating mech', () => {
    const w = spawn(0, 'workshop', 3, true); w.fixed = true;
    const k = spawn(0, 'tank', 1, true);
    k.line = 1; k.settled = false; k.x = G.LX[3]; k.hp = k.max - 100;
    for (let i = 0; i < 10; i++) stepUnits(0.1);
    expect(k.hp).toBe(k.max - 100);
  });

  it('not an enemy mech', () => {
    const w = spawn(0, 'workshop', 3, true); w.fixed = true;
    const e = mute(pin(spawn(1, 'tank', 3, true))); e.settled = true; e.hp = e.max - 100;
    stepUnits(1);
    expect(e.hp).toBe(e.max - 100);
  });

  it('infantry get only m.heal', () => {
    const w = spawn(0, 'workshop', 3, true); w.fixed = true;
    const r = spawn(0, 'rifle', 3, true); r.settled = true; r.hp = r.max - 10;
    stepUnits(1);
    expect(r.hp).toBe(r.max - 10);
    G.M[0].heal = 1;
    stepUnits(1);
    expect(r.hp).toBeCloseTo(r.max - 10 + 1);
  });

  it('adds to m.heal for mechs', () => {
    const w = spawn(0, 'workshop', 3, true); w.fixed = true;
    const k = spawn(0, 'tank', 3, true); k.settled = true; k.hp = k.max - 100;
    G.M[0].heal = 1;
    stepUnits(1);
    expect(k.hp).toBeCloseTo(k.max - 100 + 7);
  });

  it('dead workshop stops healing', () => {
    const w = spawn(0, 'workshop', 3, true); w.fixed = true;
    const k = spawn(0, 'tank', 3, true); k.settled = true; k.hp = k.max - 100;
    w.hp = 0;
    stepUnits(1);
    expect(k.hp).toBe(k.max - 100);
  });

  it('foundry tier 1 heals faster', () => {
    const w = spawn(0, 'workshop', 3, true); w.fixed = true;
    const k = spawn(0, 'tank', 3, true); k.settled = true; k.hp = k.max - 100;
    raise(0, 'nat');
    stepUnits(1);
    expect(k.hp).toBeCloseTo(k.max - 100 + 9);
  });

  it('a captured workshop serves its captor', () => {
    const w = spawn(0, 'workshop', 3, true); w.fixed = true;
    w.side = 1;
    const disarm = u => { u.T = { ...u.T, mg: null }; return u; };
    const k = disarm(mute(pin(spawn(0, 'tank', 3, true)))); k.settled = true; k.hp = k.max - 100;
    const e = disarm(mute(pin(spawn(1, 'tank', 3, true)))); e.settled = true; e.hp = e.max - 100;
    stepUnits(1);
    expect(k.hp).toBe(k.max - 100);
    expect(e.hp).toBeCloseTo(e.max - 100 + 6);
  });

  it('heal draws no rng', () => {
    const w = spawn(0, 'workshop', 3, true); w.fixed = true;
    const k = spawn(0, 'tank', 3, true); k.settled = true; k.hp = k.max - 100;
    rng.reseed(9);
    stepUnits(1);
    const a = rng.float();

    newGame('sx', 'de', 'open', 1);
    G.units.length = 0; G.shells.length = 0;
    G.bases[0].cd = G.bases[1].cd = 999;
    G.M[0].heal = 0;
    const k2 = spawn(0, 'tank', 3, true); k2.settled = true; k2.hp = k2.max - 100;
    rng.reseed(9);
    stepUnits(1);
    const b = rng.float();

    expect(a).toBe(b);
  });
});
