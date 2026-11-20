import { describe, it, expect, beforeEach } from 'vitest';
import { newGame, G, nestCost } from '../../src/sim/state.js';
import { spawn } from '../../src/sim/geometry.js';
import * as C from '../../src/sim/commands.js';
import { bus } from '../../src/core/events.js';

const toasts = [];
bus.on('toast', m => toasts.push(m));

function game(mine = 'gb', foe = 'de', map = 'open') { newGame(mine, foe, map, 7); toasts.length = 0; }
const live = (side, line) => G.units.filter(u => u.side === side && u.line === line && !u.fixed).length;

describe('commands: select', () => {
  beforeEach(() => game());

  it('selects a reached line', () => {
    expect(C.select(1)).toBe(true);
    expect(G.sel).toBe(1);
  });
  it('selects backwards freely', () => {
    G.sel = 3;
    expect(C.select(0)).toBe(true);
    expect(G.sel).toBe(0);
  });
  it('rejects lines beyond the front with a toast', () => {
    expect(C.select(5)).toBe(false);
    expect(G.sel).toBe(1);
    expect(toasts).toContain('You can only select lines your troops have reached.');
  });
  it('is silent when the game is over', () => {
    G.running = false;
    expect(C.select(1)).toBe(false);
  });
});

describe('commands: advance', () => {
  beforeEach(() => game());

  it('moves the whole selected line forward', () => {
    const n = live(0, 1);
    expect(n).toBeGreaterThan(0);
    expect(C.advance()).toBe(true);
    expect(G.sel).toBe(2);
    expect(live(0, 2)).toBe(n);
    expect(live(0, 1)).toBe(0);
  });
  it('refuses with no troops here', () => {
    G.sel = 3;
    expect(C.advance()).toBe(false);
    expect(G.sel).toBe(3);
    expect(toasts).toContain('No troops here to send forward.');
  });
  it('refuses at the enemy HQ line', () => {
    G.sel = G.HQI;
    expect(C.advance()).toBe(false);
  });
  it('refuses when not running', () => {
    G.running = false;
    expect(C.advance()).toBe(false);
  });
});

describe('commands: fallback', () => {
  beforeEach(() => game());

  it('pulls the selected line back', () => {
    const n = live(0, 1);
    expect(C.fallback()).toBe(true);
    expect(G.sel).toBe(0);
    expect(live(0, 0)).toBe(n);
  });
  it('refuses at your own HQ line', () => {
    G.sel = 0;
    expect(C.fallback()).toBe(false);
  });
});

describe('commands: gather', () => {
  beforeEach(() => game());

  it('calls troops behind the line up', () => {
    G.sel = 2;
    const n = live(0, 1);
    expect(C.gather()).toBe(true);
    expect(live(0, 2)).toBe(n);
    expect(toasts).toContain(n + ' troops called up to trench 2.');
  });
  it('reports when nothing is behind the line', () => {
    G.sel = 0;
    expect(C.gather()).toBe(false);
    expect(toasts).toContain('No troops behind this line.');
  });
});

describe('commands: buyUnit', () => {
  beforeEach(() => game());

  it('charges once and spawns at the selected line', () => {
    G.S.supplies = 100;
    const before = G.units.length;
    expect(C.buyUnit('rifle')).toBe(true);
    expect(G.S.supplies).toBe(80);                    // gb rifle costs 20
    expect(G.units.length).toBe(before + 1);
    expect(G.units[G.units.length - 1].line).toBe(G.sel);
  });
  it('refuses locked units without charging', () => {
    G.S.supplies = 500;
    expect(C.buyUnit('mortar')).toBe(false);
    expect(G.S.supplies).toBe(500);
  });
  it('refuses when short of supplies', () => {
    G.S.supplies = 5;
    expect(C.buyUnit('rifle')).toBe(false);
    expect(G.S.supplies).toBe(5);
  });
  it('refuses at the infantry cap', () => {
    G.S.supplies = 500;
    while (G.units.filter(u => u.side === 0 && !u.T.armor && !u.fixed).length < 40) spawn(0, 'rifle', 1);
    expect(C.buyUnit('rifle')).toBe(false);
    expect(G.S.supplies).toBe(500);
  });
  it('refuses when not running', () => {
    G.running = false;
    G.S.supplies = 100;
    expect(C.buyUnit('rifle')).toBe(false);
    expect(G.S.supplies).toBe(100);
  });
});

describe('commands: buildNestAt', () => {
  beforeEach(() => game());

  it('charges once and starts a sapper job', () => {
    G.S.supplies = 200;
    const c = nestCost(0);
    expect(C.buildNestAt(1)).toBe(true);
    expect(G.S.supplies).toBe(200 - c);
    expect(G.jobs.length).toBe(1);
  });
  it('refuses unowned trenches silently', () => {
    G.owner[1] = 1;
    G.S.supplies = 200;
    expect(C.buildNestAt(1)).toBe(false);
    expect(G.S.supplies).toBe(200);
    expect(toasts.length).toBe(0);
  });
  it('refuses when short of supplies', () => {
    G.S.supplies = nestCost(0) - 1;
    expect(C.buildNestAt(1)).toBe(false);
    expect(G.S.supplies).toBe(nestCost(0) - 1);
  });
  it('reports when the trench is full', () => {
    G.S.supplies = 2000;
    for (let i = 0; i < 3; i++) expect(C.buildNestAt(1)).toBe(true);   // three slots
    expect(C.buildNestAt(1)).toBe(false);
    expect(G.jobs.length).toBe(3);
    expect(G.S.supplies).toBe(2000 - 3 * nestCost(0));
    expect(toasts).toContain('No room for another emplacement at trench 1.');
  });
  it('refuses non-trench lines', () => {
    G.S.supplies = 200;
    expect(C.buildNestAt(0)).toBe(false);
    expect(G.S.supplies).toBe(200);
  });
});

describe('commands: buildDefAt', () => {
  beforeEach(() => game());

  it('lays wire in front of the trench, charging once', () => {
    G.S.supplies = 200;
    expect(C.buildDefAt(1)).toBe(true);
    expect(G.S.supplies).toBe(130);                   // gb wire costs 70
    expect(G.fields.length).toBe(1);
    expect(G.fields[0].type).toBe('wire');
    expect(G.fields[0].line).toBe(1);
    expect(toasts).toContain('Wire laid in front of trench 1. It slows enemy infantry until a tank or shellfire clears it.');
  });
  it('refuses a second emplacement of the same kind at a trench', () => {
    G.S.supplies = 200;
    C.buildDefAt(1);
    expect(C.buildDefAt(1)).toBe(false);
    expect(G.S.supplies).toBe(130);
  });
  it('refuses when short of supplies', () => {
    G.S.supplies = 69;
    expect(C.buildDefAt(1)).toBe(false);
    expect(G.S.supplies).toBe(69);
  });
  it('refuses unowned trenches', () => {
    G.owner[1] = 1;
    G.S.supplies = 200;
    expect(C.buildDefAt(1)).toBe(false);
    expect(G.S.supplies).toBe(200);
  });
});

describe('commands: Paris Gun aiming', () => {
  beforeEach(() => game('de', 'gb'));

  it('starts aiming', () => {
    G.S.supplies = 1000;
    expect(C.startAiming()).toBe(true);
    expect(G.aim).toEqual({ kind: 'paris', x: null, y: null });
    expect(toasts).toContain('Tap the field to place the target, then press Confirm. Drag to look around.');
  });
  it('is blocked while the gun reloads', () => {
    G.sw[0].cd = 10;
    expect(C.startAiming()).toBe(false);
    expect(G.aim).toBeNull();
  });
  it('confirmAim needs a placed target', () => {
    G.S.supplies = 1000;
    C.startAiming();
    expect(C.confirmAim()).toBe(false);
    expect(G.S.supplies).toBe(1000);
    expect(G.shells.length).toBe(0);
  });
  it('confirmAim fires one huge shell and charges once', () => {
    G.S.supplies = 1000;
    C.startAiming();
    G.aim.x = 1200; G.aim.y = 150;
    expect(C.confirmAim()).toBe(true);
    expect(G.S.supplies).toBe(500);
    expect(G.shells.length).toBe(1);
    expect(G.shells[0].huge).toBe(true);
    expect(G.aim).toBeNull();
    expect(toasts).toContain('The Paris Gun has fired. The shell lands in 4 seconds.');
  });
  it('confirmAim refuses when short of supplies', () => {
    G.S.supplies = 400;
    C.startAiming();
    G.aim.x = 1; G.aim.y = 1;
    expect(C.confirmAim()).toBe(false);
    expect(G.S.supplies).toBe(400);
    expect(G.shells.length).toBe(0);
  });
});

describe('commands: fireSuperweapon (Messines mine)', () => {
  beforeEach(() => game());

  it('starts tunnelling and charges once', () => {
    G.S.supplies = 1000;
    expect(C.fireSuperweapon()).toBe(true);
    expect(G.S.supplies).toBe(550);
    expect(G.sw[0].tunnel).toBeTruthy();
    expect(G.sw[0].tunnel.line).toBe(G.NT);
    expect(toasts).toContain('Tunnellers are digging toward trench ' + G.NT + '.');
  });
  it('is blocked while already tunnelling, without charging', () => {
    G.S.supplies = 1000;
    C.fireSuperweapon();
    expect(C.fireSuperweapon()).toBe(false);
    expect(G.S.supplies).toBe(550);
  });
  it('refuses when short of supplies', () => {
    G.S.supplies = 100;
    expect(C.fireSuperweapon()).toBe(false);
    expect(G.S.supplies).toBe(100);
  });
  it('refuses when not running', () => {
    G.running = false;
    G.S.supplies = 1000;
    expect(C.fireSuperweapon()).toBe(false);
    expect(G.S.supplies).toBe(1000);
  });
});
