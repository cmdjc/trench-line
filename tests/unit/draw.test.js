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
import { draw, vis } from '../../src/ui/draw/index.js';
import { setCtx } from '../../src/ui/draw/helpers.js';
import { cam, vw } from '../../src/ui/camera.js';

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
  // shells: mortar arc, huge paris (warning ring), flying bug
  G.shells.push({ x0: G.LX[L], y0: 150, x1: G.LX[L] + 200, y1: 120, t: 0.5, dur: 1.2, splash: 30, arc: 1 });
  G.shells.push({ x0: 0, y0: 0, x1: 600, y1: 150, t: 2, dur: 4.5, splash: 90, arc: 3.2, huge: true, cov: 0.8 });
  G.shells.push({ x0: 200, y0: 0, x1: 700, y1: 100, t: 0.4, dur: 2, splash: 40, arc: 0, plane: true });
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
  G.aim = { x: 520, y: 140 };
  G.bases[0].hp = G.bases[0].max * 0.3;
  G.shake = 4;
}

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
