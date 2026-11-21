// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import './ui-page.js';
import { newGame, G } from '../../src/sim/state.js';
import { spawn } from '../../src/sim/geometry.js';
import { buildNest, buildDef } from '../../src/sim/fortify.js';
import { puff, boom, tracer } from '../../src/sim/combat.js';
import { NATS, NAT } from '../../src/data/nations.js';
import { INF, tkList } from '../../src/data/units.js';
import { MAPS } from '../../src/data/maps.js';
import { TRAINS } from '../../src/data/rail.js';
import { draw, vis } from '../../src/ui/draw/index.js';
import { setCtx } from '../../src/ui/draw/helpers.js';
import { cam, vw } from '../../src/ui/camera.js';
import { drawTrack, drawTrains } from '../../src/ui/draw/rail.js';
import { RAIL_Y, BARRIER_R } from '../../src/data/rail.js';
import { drawTunnels } from '../../src/ui/draw/terrain.js';
import { tunnelLines } from '../../src/sim/tunnel.js';

const noop = () => {};
const stubCtx = new Proxy(
  {},
  {
    get(t, k) {
      return t[k] !== undefined ? t[k] : noop;
    },
    set(t, k, v) {
      t[k] = v;
      return true;
    }
  }
);

function populate(n) {
  const L = Math.min(3, G.NT);
  G.sel = L;
  for (const k of INF) {
    const u = spawn(0, k, L, true);
    u.flash = 0.05;
    u.walk = 1.2;
    u.moving = true;
    u.hp = u.max * 0.3;
  }
  // carrier sprites
  spawn(0, 'rifle', L, true).carry = 'bags';
  spawn(0, 'rifle', L, true).carry = 'gun';
  // emplacements + specials
  for (const k of ['nest', 'pillbox', 'pit75', 'pit65', 'depot', 'bunker']) {
    const u = spawn(0, k, L, true);
    u.flash = 0.05;
    u.hp = u.max - 1;
    if (k === 'bunker') u.occ = 3;
  }
  // armour, damaged and pristine
  const tks = tkList(n);
  for (const k of tks) {
    const u = spawn(0, k, L, true);
    u.tread = 1.4;
    u.aim = 0.3;
    u.gun = 1;
    u.flash = 0.05;
    u.flash2 = 0.05;
    u.hp = u.max * 0.25;
    const full = spawn(0, k, L, true);
    full.tread = 0;
    full.aim = -0.2;
  }
  // super weapons in the field
  for (const k of ['tsar', 'char2c', 'colossus']) spawn(0, k, L, true);
  // enemy-side sprites (flipped drawing)
  for (const k of ['rifle', 'mg', 'mortar']) spawn(1, k, L, true);
  const foe = spawn(1, tkList('de')[0], L, true);
  foe.tread = 1;
  foe.hp = foe.max * 0.2;
  // jobs at every stage
  buildNest(0, L);
  if (NAT[G.nation[0]].def) buildDef(0, L);
  G.jobs.forEach((j, i) => {
    j.stage = i % 3;
    j.t2 = 1.5;
  });
  // minefields + wire already from buildDef for some nations; force both
  G.fields.push({ type: 'wire', side: 0, line: L, x: G.LX[L] + 54, w: 46, hp: 140 });
  G.fields.push({ type: 'mines', side: 0, line: L, x: G.LX[L], mines: [{ x: G.LX[L] + 10, y: 80, live: true }, { x: G.LX[L] + 20, y: 120, live: false }] });
  // wrecks of every branch
  const wx = G.LX[L] + 30;
  G.wrecks.push({ x: wx, y: 60, side: 1, nat: 'tsar', t: 2, puff: 0, d: null });
  G.wrecks.push({ x: wx, y: 90, side: 0, nat: 'fr', t: 2, puff: 0, d: null });
  G.wrecks.push({ x: wx, y: 120, side: 1, nat: 'us', t: 9, puff: 0, d: null });
  G.wrecks.push({ x: wx, y: 150, side: 0, nat: 'gb', t: 2, puff: 0, d: null });
  G.wrecks.push({ x: wx, y: 180, side: 1, nat: 'de', t: 2, puff: 0, d: null });
  G.wrecks.push({ x: wx, y: 220, side: 0, nat: 'aq', t: 2, puff: 0, d: { L: 24, W: 11 } });
  G.wrecks.push({ x: wx, y: 250, side: 1, nat: 'it', t: 12, puff: 0, d: { L: 24, W: 11 } });
  // shells: mortar arc, huge paris (warning ring)
  G.shells.push({ x0: G.LX[L], y0: 150, x1: G.LX[L] + 200, y1: 120, t: 0.5, dur: 1.2, splash: 30, arc: 1 });
  G.shells.push({ x0: 0, y0: 0, x1: 600, y1: 150, t: 2, dur: 4.5, splash: 90, arc: 3.2, huge: true, cov: 0.8 });
  G.shells.push({ x0: 0, y0: 0, x1: 600, y1: 150, t: -1, dur: 4.5, splash: 90, arc: 3.2, huge: true });
  // caproni plane
  G.planes.push({ x: 600, y: 120, t: 1, dur: 3.6, vy: 110 });
  // effects
  puff(500, 150, true);
  puff(505, 155, false);
  boom(600, 150, 20);
  tracer(100, 100, 200, 120, 1.5, '#fff');
  G.floats.push({ x: 400, y: 140, txt: '+5', life: 0.5 });
  G.scorch.push({ x: 450, y: 160, r: 9 });
  // paris aim reticle + damaged HQ + shake
  G.aim = { kind: 'paris', x: 520, y: 140 };
  G.bases[0].hp = G.bases[0].max * 0.3;
  G.shake = 4;
}

describe('gun aim drawing', () => {
  it('draws a gun aim for both sides without throwing', () => {
    setCtx(stubCtx);
    for (const nat of [['gb', 'de'], ['us', 'it']]) {
      newGame(nat[0], nat[1], 'open', 3);
      G.aim = { kind: 'gun', x: 300, y: 140 };
      expect(() => draw()).not.toThrow();
      G.aim = { kind: 'gun', x: null, y: null };
      expect(() => draw()).not.toThrow();
    }
  });
});

describe('airborne drawing', () => {
  it('draws falling paratroopers and a drop aim without throwing', () => {
    setCtx(stubCtx);
    newGame('us', 'de', 'open', 3);
    const u = spawn(0, 'tommy', 2, true); u.para = true; u.fall = 1.5;
    const v = spawn(0, 'rifle', 2, true); v.para = true; v.fall = 0.01;
    const w = spawn(0, 'mg', 2, true); w.para = true; w.fall = 0;
    const e = spawn(1, 'tommy', 2, true); e.para = true; e.fall = 1;
    G.aim = { kind: 'drop', x: null, y: null, line: -1 };
    expect(() => draw()).not.toThrow();
    G.aim = { kind: 'drop', x: G.LX[2], y: 150, line: 2 };
    expect(() => draw()).not.toThrow();
  });
  it('draws a tommy on the ground', () => {
    setCtx(stubCtx);
    newGame('us', 'de', 'open', 3);
    const u = spawn(0, 'tommy', 2, true); u.flash = 0.05; u.moving = true; u.walk = 1;
    expect(() => draw()).not.toThrow();
  });
});

describe('renderer', () => {
  beforeEach(() => {
    setCtx(stubCtx);
    cam.x = 0;
    cam.tx = 0;
  });

  it('tolerates being drawn with no active game', () => {
    const s = G.S;
    G.S = null;
    expect(() => draw()).not.toThrow();
    G.S = s;
  });

  it('draws every nation on every map without exceptions', () => {
    for (const map of Object.keys(MAPS)) {
      for (const n of NATS) {
        newGame(n, 'de', map, 7);
        populate(n);
        expect(() => draw(), `${n} on ${map}`).not.toThrow();
        cam.x = Math.max(0, G.WW - vw());
        expect(() => draw(), `${n} on ${map} far camera`).not.toThrow();
        cam.x = 0;
      }
    }
  });

  it('draws the HQ at every upgrade tier on both sides for every nation', () => {
    for (const n of NATS) {
      newGame(n, 'de', 'open', 7);
      populate(n);
      for (let t = 0; t <= 3; t++) {
        for (const s of [0, 1]) for (const k of ['walls', 'depot', 'hosp', 'nat']) G.base[s][k] = t;
        expect(() => draw(), `${n} tier ${t}`).not.toThrow();
      }
    }
  });

  it('culls entities outside the camera window via vis()', () => {
    newGame('gb', 'de', 'open', 7);
    populate('gb');
    cam.x = 0;
    draw();
    expect(vis(G.LX[1])).toBe(true);
    cam.x = Math.max(0, G.WW - vw());
    draw();
    expect(vis(G.LX[1])).toBe(false);
    expect(vis(G.LX[G.HQI])).toBe(true);
  });
});

describe('railway drawing', () => {
  it('draws track, breaks and trains with riders for both sides without throwing', () => {
    setCtx(stubCtx);
    for (const nat of [['gb', 'de'], ['us', 'aq']]) {
      newGame(nat[0], nat[1], 'open', 3);
      for (const s of [0, 1]) {
        G.track[s].end = 3; G.track[s].broken.add(2);
        G.trains.push({ id: 90 + s, side: s, x: G.LX[s ? G.HQI : 0] + (s ? -80 : 80), hp: 100, max: 300, dir: s ? -1 : 1, riders: [], carried: false, T: TRAINS[nat[s]] });
      }
      const t = G.trains[0], u = spawn(0, 'rifle', 1, true); u.riding = t.id; t.riders.push(u);
      const w = spawn(0, 'rifle', 1, true); w.waiting = true;
      cam.x = 0;
      expect(() => draw()).not.toThrow();
      cam.x = G.LX[G.HQI] - 300;
      expect(() => draw()).not.toThrow();
    }
  });
});

describe('top-down trains, barriers and HQ door', () => {
  const rec = () => {
    const calls = [], stack = [], off = { x: 0, y: 0 };
    const ctx = new Proxy({}, { get: (t, k) => (k in t ? t[k] : (...a) => {
      if (k === 'save') stack.push({ ...off });
      else if (k === 'restore') Object.assign(off, stack.pop());
      else if (k === 'translate') { off.x += a[0]; off.y += a[1]; }
      calls.push({ k, a, ox: off.x, oy: off.y });
      return a;
    }), set: (t, k, v) => { t[k] = v; return true; } });
    return { ctx, calls };
  };
  const mk = (s, hp) => ({ id: 70 + s, side: s, x: 400, hp, max: 300, dir: s ? -1 : 1, riders: [], carried: false, T: TRAINS.gb });
  const all = () => true;
  it('draws an undamaged train within its body width, nothing profile-like above', () => {
    const { ctx, calls } = rec(); setCtx(ctx);
    newGame('gb', 'de', 'open', 3);
    G.trains.push(mk(0, 300));
    for (let i = 0; i < 4; i++) { const u = spawn(0, 'rifle', 1, true); u.riding = 70; G.trains[0].riders.push(u); }
    drawTrains(all);
    const ys = calls.filter(c => c.k === 'fillRect' || c.k === 'arc').map(c => c.oy + c.a[1] + (c.k === 'fillRect' ? 0 : 0));
    expect(ys.length).toBeGreaterThan(5);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(RAIL_Y - 8);
    expect(Math.max(...ys)).toBeLessThanOrEqual(RAIL_Y + 8);
    setCtx(stubCtx);
  });
  it('puts the health bar above a damaged train', () => {
    const { ctx, calls } = rec(); setCtx(ctx);
    newGame('gb', 'de', 'open', 3);
    G.trains.push(mk(1, 100));
    drawTrains(all);
    const ys = calls.filter(c => c.k === 'fillRect').map(c => c.oy + c.a[1]);
    expect(Math.min(...ys)).toBeLessThan(RAIL_Y - 8);
    setCtx(stubCtx);
  });
  it('draws sandbag walls beside the rail only where a barrier exists', () => {
    const { ctx, calls } = rec(); setCtx(ctx);
    newGame('gb', 'de', 'open', 3);
    drawTrack(all);
    expect(calls.some(c => c.k === 'stroke')).toBe(false);
    G.track[0].end = 2; G.track[1].end = 2;
    drawTrack(all);
    const mv = calls.filter(c => c.k === 'moveTo' && Math.abs(c.a[1] - RAIL_Y) > 7);
    expect(mv.some(c => c.a[1] === RAIL_Y - 9)).toBe(true);
    expect(mv.some(c => c.a[1] === RAIL_Y + 9)).toBe(true);
    expect(mv.some(c => Math.abs(c.a[0] - (G.LX[1] - BARRIER_R)) < 1)).toBe(true);
    setCtx(stubCtx);
  });
  it('starts the first segment at the HQ door', () => {
    const { ctx, calls } = rec(); setCtx(ctx);
    newGame('gb', 'de', 'open', 3);
    G.track[0].end = 1; G.track[1].end = 1;
    drawTrack(all);
    const sl = calls.filter(c => c.k === 'fillRect' && c.a[3] === 8).map(c => c.a[0] + 1.5);
    expect(sl.some(x => x < G.LX[0] + 25)).toBe(false);
    expect(sl.some(x => x > G.LX[G.HQI] - 25)).toBe(false);
    expect(sl.some(x => x < G.LX[0] + 40)).toBe(true);
    expect(sl.length).toBeGreaterThan(3);
    setCtx(stubCtx);
  });
});

describe('tunnel trench drawing', () => {
  const recorder = () => {
    const calls = [];
    const ctx = new Proxy({}, { get: (t, k) => (k in t ? t[k] : (...a) => { calls.push(k); return a; }), set: (t, k, v) => { t[k] = v; return true; } });
    return { ctx, calls };
  };
  it('draws a mouth at each tunnel trench on march, none on open', () => {
    const { ctx, calls } = recorder();
    setCtx(ctx);
    newGame('gb', 'de', 'march', 3);
    drawTunnels(() => true);
    expect(calls.length).toBeGreaterThan(10);
    calls.length = 0;
    newGame('gb', 'de', 'open', 3);
    drawTunnels(() => true);
    expect(calls.length).toBe(0);
    setCtx(stubCtx);
  });

  it('draw() on march at a tunnel trench, with units in transit, does not throw', () => {
    setCtx(stubCtx);
    newGame('gb', 'de', 'march', 3);
    const [a] = tunnelLines();
    cam.x = Math.max(0, G.LX[a] - 200); cam.tx = cam.x;
    const u = spawn(0, 'rifle', a + 2, true);
    u.tunnel = { t: 4, exit: a };
    expect(() => draw()).not.toThrow();
    cam.x = 0; cam.tx = 0;
  });

  it('draw() with the enemy holding trench 11 and units in transit does not throw', () => {
    setCtx(stubCtx);
    newGame('gb', 'de', 'march', 3);
    const [a] = tunnelLines();
    G.owner[a] = 1;
    cam.x = Math.max(0, G.LX[a] - 200); cam.tx = cam.x;
    const e = spawn(1, 'rifle', a - 2, true); e.tunnel = { t: 4, exit: a };
    const m = spawn(0, 'rifle', a + 2, true); m.tunnel = { t: 4, exit: a };
    expect(() => draw()).not.toThrow();
    cam.x = 0; cam.tx = 0;
  });
});
