import { describe, it, expect, beforeEach } from 'vitest';
import { newGame, G } from '../../src/sim/state.js';
import { tunnelLines, tunnelFor, tunnelBeats, stepTunnels } from '../../src/sim/tunnel.js';
import { TUNNEL_T } from '../../src/data/tunnel.js';
import { spawn, count, full, walkFront, countAt } from '../../src/sim/geometry.js';
import { stepUnits } from '../../src/sim/combat.js';
import { stepTrains } from '../../src/sim/rail.js';
import { infCap } from '../../src/sim/base.js';

function march() { newGame('gb', 'de', 'march', 7); G.units = []; G.shells = []; }

describe('tunnel lines', () => {
  it('march has tunnel trenches 11 and 35; open has none', () => {
    newGame('gb', 'de', 'march', 7);
    expect(TUNNEL_T).toBe(8);
    expect(tunnelLines()).toEqual([11, 35]);
    newGame('gb', 'de', 'open', 7);
    expect(tunnelLines()).toEqual([]);
    expect(tunnelFor(0, 5)).toBe(-1);
  });
  it('tunnel trenches start unheld', () => {
    newGame('gb', 'de', 'march', 7);
    expect(G.owner[11]).toBe(-1);
    expect(G.owner[35]).toBe(-1);
  });
  it('open: a spawn never enters a tunnel', () => {
    newGame('gb', 'de', 'open', 7); G.units = [];
    const u = spawn(0, 'rifle', 8);
    expect(u.tunnel).toBeUndefined();
  });
});

describe('tunnel route', () => {
  beforeEach(march);
  it('holding 11 and ordering line 15: in the tunnel for 8 s, then out at trench 11', () => {
    G.owner[11] = 0;
    expect(tunnelFor(0, 15)).toBe(11);
    const u = spawn(0, 'rifle', 15);
    expect(u.tunnel).toEqual({ t: TUNNEL_T, exit: 11 });
    expect(u.x).toBe(G.LX[0]);
    for (let i = 0; i < 79; i++) { stepTunnels(0.1); stepUnits(0.1); }
    expect(u.tunnel).toBeTruthy();
    expect(u.x).toBe(G.LX[0]);
    stepTunnels(0.2);
    expect(u.tunnel).toBeUndefined();
    expect(u.x).toBe(G.LX[11] - 14);
    expect(u.settled).toBe(false);
    expect(u.line).toBe(15);
    stepUnits(0.5);
    expect(u.x).toBeGreaterThan(G.LX[11] - 14);
  });
  it('behind: ordering line 8 does not use the tunnel', () => {
    G.owner[11] = 0;
    expect(tunnelFor(0, 8)).toBe(-1);
    const u = spawn(0, 'rifle', 8);
    expect(u.tunnel).toBeUndefined();
  });
  it('unheld: no tunnel when nobody holds 11', () => {
    const u = spawn(0, 'rifle', 15);
    expect(u.tunnel).toBeUndefined();
  });
  it('captured: with the enemy holding 11, enemy reinforcements to line 10 or lower come out at 11', () => {
    G.owner[11] = 1;
    for (const L of [10, 5]) {
      expect(tunnelFor(1, L)).toBe(11);
      const u = spawn(1, 'rifle', L);
      expect(u.tunnel).toEqual({ t: TUNNEL_T, exit: 11 });
      expect(u.x).toBe(G.LX[G.HQI]);
      stepTunnels(TUNNEL_T + 0.01);
      expect(u.tunnel).toBeUndefined();
      expect(u.x).toBe(G.LX[11] + 14);
    }
  });
  it('the nearest held tunnel to the ordered line is used', () => {
    G.owner[11] = 1; G.owner[35] = 1;
    expect(tunnelFor(1, 10)).toBe(11);
    expect(tunnelFor(1, 30)).toBe(35);
  });
  it('exit lost mid-tunnel: the unit comes out at its HQ', () => {
    G.owner[11] = 0;
    const u = spawn(0, 'rifle', 15);
    stepTunnels(4);
    G.owner[11] = 1;
    stepTunnels(4.1);
    expect(u.tunnel).toBeUndefined();
    expect(u.x).toBe(G.LX[0] - 14);
    expect(u.settled).toBe(false);
  });
  it('cap: units in the tunnel count toward the infantry cap', () => {
    G.owner[11] = 0;
    const cap = infCap(0);
    for (let i = 0; i < cap - 1; i++) spawn(0, 'rifle', 1, true);
    expect(full(0, 'rifle')).toBe(false);
    const u = spawn(0, 'rifle', 15);
    expect(u.tunnel).toBeTruthy();
    expect(count(0)).toBe(cap);
    expect(full(0, 'rifle')).toBe(true);
  });
  it('hidden: untargetable, unhurt by shells, out of walkFront and countAt', () => {
    G.owner[11] = 0;
    const own = spawn(0, 'rifle', 3, true);
    const u = spawn(0, 'rifle', 20);
    expect(u.tunnel).toBeTruthy();
    u.x = G.LX[20]; // even if it stood up front, it is not there
    const foe = spawn(1, 'rifle', 20, true);
    foe.x = u.x + 5; foe.y = u.y;
    expect(walkFront(0)).toBe(3);
    expect(countAt(0, 20)).toBe(0);
    G.shells.push({ x0: 0, y0: 0, x1: u.x, y1: u.y, t: 0, dur: 0.01, side: 1, type: 'barrage', dmg: 999, splash: 80 });
    const hp = u.hp;
    for (let i = 0; i < 40; i++) stepUnits(0.1);
    expect(u.hp).toBe(hp);
    expect(G.units).toContain(u);
    expect(own.hp).toBeGreaterThan(0);
    expect(u.x).toBe(G.LX[20]); // stepUnits leaves it alone
  });
  it('a unit in the tunnel never waits for or boards a train', () => {
    G.owner[11] = 0;
    const u = spawn(0, 'rifle', 15);
    expect(u.tunnel).toBeTruthy();
    for (let i = 0; i < 20; i++) stepTrains(0.1);
    expect(u.waiting).toBeFalsy();
    expect(u.riding).toBeFalsy();
  });
  it('when the train is faster, the unit rides instead', () => {
    /* track held out to trench 20: the train runs 3x walking pace, so it beats 8 s in the tunnel plus the walk on */
    for (let L = 1; L <= 20; L++) G.owner[L] = 0;
    G.track[0].end = 20;
    const u = spawn(0, 'rifle', 20);
    expect(tunnelFor(0, 20)).toBe(11);
    expect(tunnelBeats(u)).toBe(false);
    expect(u.tunnel).toBeUndefined();
    stepTrains(0.01);
    expect(u.waiting || u.riding).toBeTruthy();
  });
  it('direct movers take priority: gb T3 tunnelling arrives at the line itself', () => {
    G.owner[11] = 0; G.owner[15] = 0; G.base[0].nat = 3;
    const u = spawn(0, 'rifle', 15);
    expect(u.tunnel).toBeUndefined();
    expect(u.x).toBe(G.LX[15] - 14);
  });
  it('placed units and armour never enter the tunnel', () => {
    G.owner[11] = 0;
    expect(spawn(0, 'rifle', 15, true).tunnel).toBeUndefined();
    expect(spawn(0, 'tkL', 15).tunnel).toBeUndefined();
  });
});
