import { describe, it, expect, beforeEach } from 'vitest';
import { newGame, G } from '../../src/sim/state.js';
import * as C from '../../src/sim/commands.js';
import { trackEnd, canLay, layTrack, cutTrack, breakAt, segmentIndexFor } from '../../src/sim/rail.js';
import { stepUnits as step } from '../../src/sim/combat.js';
import { spawn } from '../../src/sim/geometry.js';
import { RAIL_Y } from '../../src/data/rail.js';

function game() { newGame('gb', 'de', 'open', 7); G.S.supplies = 500; }
const bigShell = (x, extra = {}) => ({ x0: 0, y0: 0, x1: x, y1: RAIL_Y, t: 0, dur: 0.1, side: 1, type: 'barrage', dmg: 10, splash: 90, big: true, ...extra });

describe('track: laying', () => {
  beforeEach(game);
  it('lays into a held trench and charges 40', () => {
    expect(G.track[0].end).toBe(0);
    expect(C.layTrackCmd()).toBe(true);
    expect(G.track[0].end).toBe(1);
    expect(trackEnd(0)).toBe(1);
    expect(G.S.supplies).toBe(460);
  });
  it('rejects an unheld trench without charging', () => {
    C.layTrackCmd();
    expect(C.layTrackCmd()).toBe(false);
    expect(canLay(0)).toMatch(/not held/);
    expect(G.S.supplies).toBe(460);
  });
  it('rejects laying past a break without charging', () => {
    G.owner[2] = 0; C.layTrackCmd();
    breakAt(G.LX[1] - 5, RAIL_Y, 60, bigShell(0));
    expect(G.track[0].broken.has(1)).toBe(true);
    const s = G.S.supplies;
    expect(C.layTrackCmd()).toBe(false);
    expect(G.S.supplies).toBe(s);
  });
  it('rejects when supplies are short', () => {
    G.S.supplies = 39;
    expect(C.layTrackCmd()).toBe(false);
    expect(G.track[0].end).toBe(0);
  });
  it('side 1 lays mirrored from its HQ', () => {
    expect(layTrack(1)).toBe(true);
    expect(trackEnd(1)).toBe(1);
    expect(segmentIndexFor(1, G.NT)).toBe(1);
  });
});

describe('track: capture', () => {
  beforeEach(game);
  it('cutTrack removes the segment and everything beyond', () => {
    G.owner[2] = 0; G.owner[3] = 0;
    layTrack(0); layTrack(0); layTrack(0);
    cutTrack(0, 2);
    expect(G.track[0].end).toBe(1);
  });
  it('losing a trench in combat cuts the track', () => {
    G.owner[2] = 0; layTrack(0); layTrack(0);
    G.units = []; spawn(1, 'rifle', 2, true);
    for (const u of G.units) { u.settled = true; u.fall = 0; }
    step(0.01);
    expect(G.owner[2]).toBe(1);
    expect(G.track[0].end).toBe(1);
  });
});

describe('track: shells', () => {
  beforeEach(game);
  it('a big shell breaks track; trackEnd drops; repair costs 20', () => {
    G.owner[2] = 0; layTrack(0); layTrack(0);
    breakAt(G.LX[2] - 10, RAIL_Y, 60, bigShell(0));
    expect(trackEnd(0)).toBe(1);
    const s = G.S.supplies;
    expect(C.repairTrackCmd()).toBe(true);
    expect(G.S.supplies).toBe(s - 20);
    expect(trackEnd(0)).toBe(2);
    expect(C.repairTrackCmd()).toBe(false);
  });
  it('a resolving big shell breaks track in the sim step', () => {
    layTrack(0);
    G.shells.push(bigShell((G.LX[0] + G.LX[1]) / 2));
    step(0.2);
    expect(G.track[0].broken.has(1)).toBe(true);
  });
  it('a barrage shell (splash 36) never breaks track', () => {
    layTrack(0);
    G.shells.push(bigShell((G.LX[0] + G.LX[1]) / 2, { big: false, splash: 36 }));
    step(0.2);
    expect(G.track[0].broken.size).toBe(0);
  });
});
