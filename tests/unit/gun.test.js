import { describe, it, expect, beforeEach } from 'vitest';
import { newGame, G } from '../../src/sim/state.js';
import { GUNS } from '../../src/data/guns.js';
import { WH } from '../../src/data/units.js';
import * as C from '../../src/sim/commands.js';
import { gunMaxX, clampAim, gunBlock, fireGun } from '../../src/sim/gun.js';
import { tick } from '../../src/sim/tick.js';

function game(mine = 'gb', foe = 'de') { newGame(mine, foe, 'open', 7); }

describe('gun range', () => {
  it('gb reaches trench 3 plus half a gap', () => {
    game('gb');
    expect(gunMaxX(0)).toBe(G.LX[3] + 115);
  });
  it('us caps at the last trench', () => {
    game('us');
    expect(gunMaxX(0)).toBe(G.LX[G.NT] + 115);
  });
  it('side 1 mirrors from the enemy HQ', () => {
    game('gb', 'de');
    expect(gunMaxX(1)).toBe(G.LX[G.HQI - 6] - 115);
  });
  it('clampAim keeps x between own HQ and max', () => {
    game('gb');
    expect(clampAim(0, G.WW)).toBe(gunMaxX(0));
    expect(clampAim(0, -50)).toBe(G.bases[0].x);
    expect(clampAim(1, 0)).toBe(gunMaxX(1));
    expect(clampAim(1, G.WW + 50)).toBe(G.bases[1].x);
  });
});

describe('gun commands', () => {
  beforeEach(() => game('gb'));

  it('clamps far aims', () => {
    G.S.supplies = 1000; C.startGunAim(); G.aim.x = G.WW; G.aim.y = 100;
    expect(C.confirmAim()).toBe(true);
    for (const s of G.shells) expect(s.x1).toBeLessThanOrEqual(gunMaxX(0) + GUNS.gb.shells[0].spread);
  });
  it('fires and charges once', () => {
    G.S.supplies = 1000; C.startGunAim(); G.aim.x = 400; G.aim.y = 100;
    expect(C.confirmAim()).toBe(true);
    expect(G.S.supplies).toBe(1000 - GUNS.gb.cost);
    expect(G.shells.length).toBe(GUNS.gb.shells.length);
    expect(G.shells.every(s => s.noBase)).toBe(true);
    expect(G.gun[0].cd).toBe(GUNS.gb.cd);
    expect(G.aim).toBeNull();
    expect(gunBlock(0)).not.toBe('');
  });
  it('rejects while reloading', () => {
    G.S.supplies = 1000; G.gun[0].cd = 5;
    expect(gunBlock(0)).toMatch(/Reloading/);
    expect(fireGun(0, 400, 100)).toBe(false);
    expect(G.shells.length).toBe(0);
    G.aim = { kind: 'gun', x: 400, y: 100 };
    expect(C.confirmAim()).toBe(false);
    expect(G.S.supplies).toBe(1000);
  });
  it('rejects without supplies', () => {
    G.S.supplies = GUNS.gb.cost - 1; G.aim = { kind: 'gun', x: 400, y: 100 };
    expect(C.confirmAim()).toBe(false);
    expect(G.S.supplies).toBe(GUNS.gb.cost - 1);
    expect(G.shells.length).toBe(0);
    expect(G.gun[0].cd).toBe(0);
  });
  it('keeps one aim at a time', () => {
    game('de', 'gb');
    C.startAiming(); expect(G.aim.kind).toBe('paris');
    C.startGunAim(); expect(G.aim).toEqual({ kind: 'gun', x: null, y: null });
    C.startAiming(); expect(G.aim.kind).toBe('paris');
  });
  it('cooldown counts down in tick', () => {
    G.gun[0].cd = 1; tick(0.5); expect(G.gun[0].cd).toBeCloseTo(0.5);
  });
  it('gun shells never damage the enemy HQ', () => {
    game('de', 'gb');
    expect(fireGun(0, 100, WH / 2)).toBe(true);
    const hp = G.bases[1].hp;
    G.shells.forEach(s => { s.x1 = G.bases[1].x; s.y1 = WH / 2 });
    for (let i = 0; i < 100 && G.shells.length; i++) tick(0.1);
    expect(G.shells.length).toBe(0);
    expect(G.bases[1].hp).toBe(hp);
  });
});
