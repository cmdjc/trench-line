import { describe, it, expect, beforeEach } from 'vitest';
import { newGame, G } from '../../src/sim/state.js';
import * as C from '../../src/sim/commands.js';
import { trackEnd, canLay, layTrack, cutTrack, breakAt, segmentIndexFor, stepTrains, shouldRide } from '../../src/sim/rail.js';
import { stepUnits as step } from '../../src/sim/combat.js';
import { spawn, walkFront, countAt } from '../../src/sim/geometry.js';
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
  it('slots are per side: enemy trains do not use the player slots', () => {
    layTrack(0);
    for (let i = 0; i < 3; i++) G.trains.push({ id: 100 + i, side: 1, x: G.LX[G.HQI], hp: 300, max: 300, dir: -1, riders: [], carried: false, T: TRAINS.de });
    expect(C.buyTrainCmd()).toBe(true);
    expect(G.trains.filter(t => t.side === 0).length).toBe(1);
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
    for (let i = 0; i < 3000 && (t.dir === 1 || t.x > G.LX[0] + 0.001); i++) stepTrains(0.1);
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

describe('train riders', () => {
  beforeEach(() => { game(); G.units = []; G.owner[2] = 0; layTrack(0); layTrack(0); });
  const run = (n, dt = 0.05) => { for (let i = 0; i < n; i++) { step(dt); stepTrains(dt); } };
  const runUntil = (f, n = 4000, dt = 0.05) => { for (let i = 0; i < n && !f(); i++) { step(dt); stepTrains(dt); } return !!f(); };
  const train = () => { C.buyTrainCmd(); return G.trains[0]; };

  it('faster or walk: rides only when the train beats walking', () => {
    const t = train();
    const u = spawn(0, 'rifle', 2);
    expect(shouldRide(u)).toBe(true);           // train waiting at the HQ: 3x faster
    t.x = G.LX[0] + 1; t.dir = 1;               // just left: a full round trip before it is back
    expect(shouldRide(u)).toBe(false);
    stepTrains(0.01);
    expect(u.waiting).toBeFalsy();
    run(20);
    expect(u.x).toBeGreaterThan(G.LX[0]);       // walking out
  });
  it('no ride without a train, or when the ordered line is short of the end of the track', () => {
    const u = spawn(0, 'rifle', 2);
    expect(shouldRide(u)).toBe(false);
    train();
    const v = spawn(0, 'rifle', 1);
    expect(shouldRide(v)).toBe(false);
  });
  it('tanks never ride', () => {
    train();
    const u = spawn(0, 'tkL', 2);
    expect(shouldRide(u)).toBe(false);
    run(200);
    expect(u.riding).toBeFalsy();
    expect(u.waiting).toBeFalsy();
  });
  it('a rider boards at the HQ, follows the train, unloads at the end and walks on', () => {
    const t = train();
    const u = spawn(0, 'rifle', 2);
    expect(runUntil(() => u.riding === t.id)).toBe(true);
    expect(t.carried).toBe(true);
    run(10);
    expect(u.x).toBe(t.x);
    expect(u.y).toBe(RAIL_Y);
    expect(runUntil(() => !u.riding)).toBe(true);
    expect(u.x).toBeCloseTo(G.LX[2], 5);
    expect(u.settled).toBe(false);
    expect(runUntil(() => u.settled)).toBe(true);
    expect(u.line).toBe(2);
    expect(Math.abs(u.x - G.LX[2])).toBeLessThan(20);
  });
  it('a waiting unit walks if its train is destroyed', () => {
    const t = train(); t.x = G.LX[0] + 300; t.dir = -1;
    const u = spawn(0, 'rifle', 2);
    stepTrains(0.01);
    expect(u.waiting).toBe(true);
    const x = u.x; step(0.5);
    expect(u.x).toBe(x);                       // stands still while waiting
    t.hp = 0; stepTrains(0.01);
    expect(u.waiting).toBeFalsy();
    run(20);
    expect(u.x).toBeGreaterThan(x);
  });
  it('wounded ride back, heal at the HQ and return to their line', () => {
    const t = train();
    const u = spawn(0, 'rifle', 2, true); u.hp = u.max * 0.3;
    expect(runUntil(() => u.riding === t.id)).toBe(true);
    expect(u.homeLine).toBe(2);
    expect(t.dir).toBe(-1);
    const s = G.S.supplies;
    expect(runUntil(() => !u.riding)).toBe(true);
    expect(u.hp).toBe(u.max);
    expect(u.x).toBeLessThan(G.LX[1]);
    expect(G.S.supplies).toBeCloseTo(s + TRIP_SUPPLY, 5);
    expect(u.line).toBe(2);
    expect(runUntil(() => u.riding === t.id)).toBe(true);   // queued outbound again
    expect(runUntil(() => !u.riding)).toBe(true);
    expect(runUntil(() => u.settled)).toBe(true);
    expect(u.line).toBe(2);
  });
  it('line lost: a healed rider takes G.sel when its old line is no longer held', () => {
    const t = train();
    const u = spawn(0, 'rifle', 2, true); u.hp = u.max * 0.3;
    expect(runUntil(() => u.riding === t.id)).toBe(true);
    G.owner[2] = 1; G.sel = 1;
    expect(runUntil(() => !u.riding)).toBe(true);
    expect(u.hp).toBe(u.max);
    expect(u.line).toBe(1);
    expect(u.homeLine).toBeUndefined();
  });
  it('cut off: when the end moves behind the train, riders dismount at the new end', () => {
    const t = train();
    const u = spawn(0, 'rifle', 2);
    expect(runUntil(() => u.riding && t.x > G.LX[1] + 20)).toBe(true);
    cutTrack(0, 2);
    expect(runUntil(() => !u.riding, 400)).toBe(true);
    expect(u.x).toBeCloseTo(G.LX[1], 5);
    expect(t.dir).toBe(-1);
  });
  it('cut off with the train still behind the new end: it runs on and riders dismount there', () => {
    const t = train();
    const u = spawn(0, 'rifle', 2);
    expect(runUntil(() => u.riding && t.x > G.LX[0] + 20)).toBe(true);
    expect(t.x).toBeLessThan(G.LX[1]);
    cutTrack(0, 2);
    expect(runUntil(() => !u.riding, 400)).toBe(true);
    expect(u.x).toBeCloseTo(G.LX[1], 5);
    expect(u.y).toBe(RAIL_Y);
  });
  it('cut back to the HQ: riders ride home and dismount there', () => {
    const t = train();
    const u = spawn(0, 'rifle', 2);
    expect(runUntil(() => u.riding && t.x > G.LX[0] + 20)).toBe(true);
    cutTrack(0, 1);
    expect(runUntil(() => !u.riding, 400)).toBe(true);
    expect(u.x).toBeCloseTo(G.LX[0], 5);
    run(40);
    expect(u.riding).toBeFalsy();
    expect(u.waiting).toBeFalsy();
  });
  it('destroyed: riders dismount where the train stood, with the hp they had', () => {
    const t = train();
    const u = spawn(0, 'rifle', 2);
    expect(runUntil(() => u.riding && t.x > G.LX[0] + 100)).toBe(true);
    const x = t.x; t.hp = 0;
    stepTrains(0.01);
    expect(G.trains.length).toBe(0);
    expect(G.units).toContain(u);
    expect(u.riding).toBeFalsy();
    expect(u.x).toBe(x);
    expect(u.hp).toBe(u.max);
  });
  it('destroyed: wounded riders stay wounded (no free heal)', () => {
    const t = train();
    const u = spawn(0, 'rifle', 2, true); u.hp = u.max * 0.3;
    expect(runUntil(() => u.riding === t.id)).toBe(true);
    t.hp = 0; stepTrains(0.01);
    expect(u.riding).toBeFalsy();
    expect(u.hp).toBeCloseTo(u.max * 0.3, 5);
    expect(u.homeLine).toBeUndefined();
  });
  it('boarding never moves a unit further than the HQ zone', () => {
    const t = train();
    for (let i = 0; i < 8; i++) spawn(0, 'rifle', 2);
    const w = spawn(0, 'rifle', 2, true); w.hp = w.max * 0.3;
    const before = new Map(); let boarded = 0;
    for (let i = 0; i < 3000; i++) {
      for (const u of G.units) before.set(u, { x: u.x, r: u.riding });
      step(0.05); stepTrains(0.05);
      for (const u of G.units) {
        const b = before.get(u);
        if (u.riding && b && !b.r) { boarded++; expect(Math.abs(u.x - b.x)).toBeLessThanOrEqual(60); }
      }
    }
    expect(boarded).toBeGreaterThanOrEqual(8);  // six out, then the wounded man back and out again
    expect(t.hp).toBeGreaterThan(0);
  });
  it('no farming: an empty shuttle pays nothing, a trip with a rider pays 15', () => {
    const t = train();
    const s = G.S.supplies;
    let trips = 0, back = false;
    for (let i = 0; i < 4000 && trips < 2; i++) { stepTrains(0.05); if (t.dir === -1) back = true; else if (back) { back = false; trips++; } }
    expect(G.S.supplies).toBe(s);
    spawn(0, 'rifle', 2);
    trips = 0; back = false;
    for (let i = 0; i < 4000 && trips < 1; i++) { step(0.05); stepTrains(0.05); if (t.dir === -1) back = true; else if (back) { back = false; trips++; } }
    expect(G.S.supplies).toBeCloseTo(s + TRIP_SUPPLY, 5);
  });
  it('riders are skipped by walkFront and countAt and cannot be targeted', () => {
    const t = train(); t.hp = t.max = 1e9;
    const u = spawn(0, 'rifle', 2);
    expect(runUntil(() => u.riding && t.x > G.LX[1] + 10)).toBe(true);
    expect(walkFront(0)).toBe(0);
    expect(countAt(0, 2)).toBe(0);
    const e = spawn(1, 'rifle', 3, true); e.x = t.x + 60; e.y = RAIL_Y; e.settled = true;
    G.shells.push(bigShell(t.x, { big: false, splash: 40, dmg: 1000, type: 'mortar' }));
    for (let i = 0; i < 20; i++) { e.cd = 0; step(0.01); }
    expect(u.hp).toBe(u.max);
    expect(u.riding).toBe(t.id);
  });
});

describe('train riders: Long March spawn', () => {
  beforeEach(() => {
    newGame('gb', 'de', 'march', 7); G.S.supplies = 500; G.units = [];
    G.owner[1] = 0; G.owner[2] = 0; layTrack(0); layTrack(0);
    G.M[0].speed = 0.5;                           // slow walkers, so the train can beat a two-trench walk
    C.buyTrainCmd();
  });
  it('spawns at the HQ and waits for the train when riding beats walking', () => {
    const u = spawn(0, 'rifle', 2);
    expect(u.x).toBe(G.LX[0] - 14);
    step(0.05); stepTrains(0.05);
    expect(u.riding).toBe(G.trains[0].id);     // the train is at the HQ: he boards at once
  });
  it('spawns at the HQ and walks when the train is a whole round trip away', () => {
    const t = G.trains[0]; t.x = G.LX[0] + 1; t.dir = 1;
    G.M[0].speed = 3;
    const u = spawn(0, 'rifle', 2);
    expect(u.x).toBe(G.LX[0] - 14);
    step(0.05); stepTrains(0.05);
    expect(u.waiting).toBeFalsy();
  });
  it('with no trains it spawns at the HQ and never waits', () => {
    G.trains = [];
    const u = spawn(0, 'rifle', 2);
    expect(u.x).toBe(G.LX[0] - 14);
    expect(u.waiting).toBeFalsy();
  });
});
