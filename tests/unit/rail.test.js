import { describe, it, expect, beforeEach } from 'vitest';
import { newGame, G } from '../../src/sim/state.js';
import * as C from '../../src/sim/commands.js';
import { trackEnd, canLay, layTrack, cutTrack, breakAt, segmentIndexFor, stepTrains } from '../../src/sim/rail.js';
import { stepUnits as step } from '../../src/sim/combat.js';
import { spawn } from '../../src/sim/geometry.js';
import { RAIL_Y, TRAINS, TRAIN_SLOTS, TRIP_SUPPLY } from '../../src/data/rail.js';

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

describe('transport trains', () => {
  beforeEach(game);
  const track2 = () => { G.owner[2] = 0; layTrack(0); layTrack(0); };
  it('cannot be bought with no track, and charges nothing', () => {
    const s = G.S.supplies;
    expect(C.buyTrainCmd()).toBe(false);
    expect(G.trains.length).toBe(0);
    expect(G.S.supplies).toBe(s);
  });
  it('buy charges once and caps slots at 3', () => {
    layTrack(0);
    const s = G.S.supplies, T = TRAINS.gb;
    expect(C.buyTrainCmd()).toBe(true);
    expect(G.S.supplies).toBe(s - T.cost);
    expect(G.trains[0]).toMatchObject({ side: 0, x: G.LX[0], dir: 1, hp: T.hp, max: T.hp, carried: false });
    expect(G.trains[0].riders).toEqual([]);
    G.S.supplies = 1000;
    C.buyTrainCmd(); C.buyTrainCmd();
    expect(G.trains.length).toBe(TRAIN_SLOTS);
    const s2 = G.S.supplies;
    expect(C.buyTrainCmd()).toBe(false);
    expect(G.S.supplies).toBe(s2);
  });
  it('rejects when supplies are short', () => {
    layTrack(0); G.S.supplies = 10;
    expect(C.buyTrainCmd()).toBe(false);
    expect(G.trains.length).toBe(0);
  });
  it('shuttles between HQ and the end and reverses', () => {
    track2(); C.buyTrainCmd();
    const t = G.trains[0], far = G.LX[2];
    let sawFar = false, sawHome = false;
    for (let i = 0; i < 4000; i++) {
      stepTrains(0.1);
      if (t.x >= far - 0.001) sawFar = true;
      if (sawFar && t.x <= G.LX[0] + 0.001) sawHome = true;
      expect(t.x).toBeGreaterThanOrEqual(G.LX[0] - 0.001);
      expect(t.x).toBeLessThanOrEqual(far + 0.001);
    }
    expect(sawFar && sawHome).toBe(true);
  });
  it('a cut behind the train makes it reverse at once', () => {
    track2(); C.buyTrainCmd();
    const t = G.trains[0]; t.x = G.LX[2] - 5; t.dir = 1;
    cutTrack(0, 2);
    stepTrains(0.1);
    expect(t.dir).toBe(-1);
    expect(t.x).toBeLessThan(G.LX[2] - 5);
  });
  it('stays home when trackEnd is 0', () => {
    layTrack(0); C.buyTrainCmd(); cutTrack(0, 1);
    stepTrains(1);
    expect(G.trains[0].x).toBe(G.LX[0]);
  });
  it('an empty round trip pays 0; a carried one pays TRIP_SUPPLY', () => {
    layTrack(0); C.buyTrainCmd();
    const t = G.trains[0];
    let s = G.S.supplies;
    for (let i = 0; i < 3000 && t.x < G.LX[1] - 0.001; i++) stepTrains(0.1);
    for (let i = 0; i < 3000 && t.dir === 1 || t.x > G.LX[0] + 0.001 && i < 3000; i++) stepTrains(0.1);
    expect(G.S.supplies).toBe(s);
    t.carried = true;
    for (let i = 0; i < 3000 && t.x < G.LX[1] - 0.001; i++) stepTrains(0.1);
    for (let i = 0; i < 3000 && t.dir === -1 && t.x > G.LX[0] + 0.001; i++) stepTrains(0.1);
    for (let i = 0; i < 20; i++) stepTrains(0.1);
    expect(G.S.supplies).toBeCloseTo(s + TRIP_SUPPLY, 5);
    expect(t.carried).toBe(false);
  });
  it('side 1 trains pay into ai.money', () => {
    layTrack(1);
    G.trains.push({ id: 9, side: 1, x: G.LX[G.HQI - 1], hp: 300, max: 300, dir: -1, riders: [], carried: true, T: TRAINS.de });
    const m = G.ai.money;
    for (let i = 0; i < 3000 && G.ai.money === m; i++) stepTrains(0.1);
    expect(G.ai.money).toBe(m + TRIP_SUPPLY);
  });
  it('a shell splash within radius hurts a train; a destroyed one frees its slot', () => {
    layTrack(0); C.buyTrainCmd();
    const t = G.trains[0]; t.x = (G.LX[0] + G.LX[1]) / 2;
    G.shells.push(bigShell(t.x, { big: false, splash: 40, dmg: 100, type: 'mortar' }));
    step(0.2);
    expect(t.hp).toBeLessThan(t.max);
    G.shells.push(bigShell(t.x, { big: false, splash: 40, dmg: 1000, type: 'mortar' }));
    step(0.2);
    stepTrains(0.01);
    expect(G.trains.length).toBe(0);
  });
  it('enemy units in range shoot trains; own units do not', () => {
    layTrack(0); C.buyTrainCmd();
    const t = G.trains[0]; t.x = (G.LX[0] + G.LX[1]) / 2;
    G.units = [];
    spawn(1, 'rifle', 1, true);
    const u = G.units[0]; u.x = t.x + 100; u.y = RAIL_Y; u.settled = true; u.fall = 0;
    for (let i = 0; i < 200; i++) { u.cd = 0; step(0.05); }
    expect(t.hp).toBeLessThan(t.max);
  });
  it('friendly units never shoot own train', () => {
    layTrack(0); C.buyTrainCmd();
    const t = G.trains[0]; t.x = (G.LX[0] + G.LX[1]) / 2;
    G.units = [];
    spawn(0, 'rifle', 1, true);
    const u = G.units[0]; u.x = t.x + 100; u.y = RAIL_Y; u.settled = true; u.fall = 0;
    for (let i = 0; i < 100; i++) { u.cd = 0; step(0.05); }
    expect(t.hp).toBe(t.max);
  });
});
