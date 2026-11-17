// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { newGame, G, incomeNow } from '../../src/sim/state.js';
import { tick } from '../../src/sim/tick.js';
import { META } from '../../src/sim/meta.js';
import { takeCard } from '../../src/sim/cards.js';
import { spawn } from '../../src/sim/geometry.js';
import { bus } from '../../src/core/events.js';
import { SUPER_CARD_T, DEPOT_RATE, SUPER_INC, DBL_RATE } from '../../src/data/units.js';

const toasts = [];
bus.on('toast', m => toasts.push(m));

function game(mine = 'gb', foe = 'de', map = 'open') { newGame(mine, foe, map, 7); toasts.length = 0; }

let saved;
beforeEach(() => { saved = { points: META.points, runs: META.runs, wins: META.wins }; });
afterEach(() => { META.points = saved.points; META.runs = saved.runs; META.wins = saved.wins; });

describe('tick: income', () => {
  it('accrues supplies at incomeNow', () => {
    game();
    G.S.t = 0; G.S.supplies = 100;
    expect(incomeNow()).toBe(3);                     // gb base, open map, nothing else
    tick(0.5);
    expect(G.S.supplies).toBeCloseTo(101.5, 10);
  });
  it('counts depots, the super trench and double trenches', () => {
    game();
    const d = spawn(0, 'rifle', 1); d.T = { ...d.T, depot: true };
    expect(incomeNow()).toBeCloseTo(3 + DEPOT_RATE, 10);
    game('gb', 'de', 'march');
    G.owner[G.SUPER] = 0;
    expect(incomeNow()).toBeCloseTo(3 + SUPER_INC, 10);
    game('gb', 'de', 'plain');
    G.owner[4] = 0;
    expect(incomeNow()).toBeCloseTo(3 + DBL_RATE, 10);
  });
});

describe('tick: super trench cards', () => {
  it('grants a free card every SUPER_CARD_T seconds while held', () => {
    game('gb', 'de', 'march');
    G.owner[G.SUPER] = 0; G.S.superOwner = 0; G.S.superCard = true;   // held since before
    G.S.superT = SUPER_CARD_T - 0.04;
    tick(0.04);
    expect(G.S.superT).toBeCloseTo(0, 10);
    expect(G.S.pending).toBe(1);
    expect(toasts).toContain('The super trench has sent you a free card.');
    expect(G.offer).toBeTruthy();                    // tick offers it right away
  });
  it('pauses the timer while the trench is lost', () => {
    game('gb', 'de', 'march');
    G.owner[G.SUPER] = 1; G.S.superOwner = 1; G.S.superCard = true;   // enemy-held, no capture events
    G.S.superT = 10;
    tick(0.04);
    expect(G.S.superT).toBe(10);
    expect(G.S.pending).toBe(0);
  });
});

describe('tick: order fallback', () => {
  it('demotes an empty selection beyond the front', () => {
    game();
    G.sel = 2;                                       // nothing there, front is line 1
    tick(0.04);
    expect(G.sel).toBe(1);
  });
  it('falls back when a held trench is lost', () => {
    game();
    G.sel = 2;
    spawn(1, 'rifle', 2, true);                      // enemy holds trench 2
    const walker = spawn(0, 'rifle', 1);             // still marching from your HQ
    walker.line = 2;                                 // ordered to the lost trench, far from it
    tick(0.04);
    expect(walker.line).toBe(1);
    expect(G.sel).toBe(1);
    expect(toasts).toContain('Trench 2 is lost. Your orders fall back to trench 1.');
  });
});

describe('tick: end of game', () => {
  const ends = [];
  bus.on('game:end', e => ends.push(e));
  beforeEach(() => { ends.length = 0; });

  it('wins when the enemy HQ falls — exactly one award', () => {
    game();
    G.S.score = 47;
    G.bases[1].hp = 0;
    tick(0.04);
    expect(G.running).toBe(false);
    expect(ends.length).toBe(1);
    expect(ends[0].won).toBe(true);
    expect(ends[0].earned).toBe(41);                 // floor(47/4) + 30
    expect(META.runs - saved.runs).toBe(1);
    expect(META.wins - saved.wins).toBe(1);
    expect(META.points - saved.points).toBe(41);
    tick(0.04);
    expect(ends.length).toBe(1);                     // no double award
  });
  it('loses when your HQ falls', () => {
    game();
    G.S.score = 47;
    G.bases[0].hp = 0;
    tick(0.04);
    expect(ends.length).toBe(1);
    expect(ends[0].won).toBe(false);
    expect(ends[0].earned).toBe(11);                 // floor(47/4), no win bonus
    expect(META.wins).toBe(saved.wins);
    expect(META.points - saved.points).toBe(11);
  });
  it('victory wins the tie when both HQs fall at once', () => {
    game();
    G.bases[0].hp = 0; G.bases[1].hp = 0;
    tick(0.04);
    expect(ends.length).toBe(1);
    expect(ends[0].won).toBe(true);
  });
  it('does nothing while both HQs stand', () => {
    game();
    tick(0.04);
    expect(ends.length).toBe(0);
    expect(G.running).toBe(true);
  });
});

describe('tick: card offers', () => {
  const offers = [];
  bus.on('cards:offer', ids => offers.push(ids));
  beforeEach(() => { offers.length = 0; });

  it('offers once per pending card, no duplicates', () => {
    game();
    G.S.pending = 1; G.offer = null;
    tick(0.04);
    expect(offers.length).toBe(1);
    expect(G.offer.ids.length).toBe(3);
    tick(0.04);
    expect(offers.length).toBe(1);                   // offer still open — no re-offer
    takeCard(G.offer.ids[0]);
    expect(G.S.pending).toBe(0);
    tick(0.04);
    expect(offers.length).toBe(1);                   // nothing pending any more
  });
});

describe('tick: effect decay', () => {
  it('decays tracers, booms and floats', () => {
    game();
    G.tracers = [{ x: 0, y: 0, tx: 1, ty: 1, life: 0.08, faint: true }];
    G.booms = [{ x: 0, y: 0, r: 10, life: 0.45 }];
    G.floats = [{ x: 0, y: 100, text: '+1', life: 2 }];
    tick(0.04);
    expect(G.tracers.length).toBe(1);
    expect(G.tracers[0].life).toBeCloseTo(0.04, 10);
    expect(G.booms[0].life).toBeCloseTo(0.41, 10);
    expect(G.floats[0].y).toBeCloseTo(100 - 0.04 * 22, 10);
    tick(0.04);
    expect(G.tracers.length).toBe(0);                // 0.04 - 0.04 = 0 → gone
    expect(G.floats[0].life).toBeCloseTo(1.92, 10);
  });
  it('drifts smoke: dark grows faster than light', () => {
    game();
    G.smoke = [
      { x: 10, y: 10, r: 2, life: 1, dark: true },
      { x: 10, y: 10, r: 2, life: 1, dark: false },
    ];
    tick(0.5);
    expect(G.smoke[0].r).toBeCloseTo(2 + 0.5 * 7, 10);
    expect(G.smoke[1].r).toBeCloseTo(2 + 0.5 * 5, 10);
    for (const p of G.smoke) {
      expect(p.y).toBeCloseTo(10 - 0.5 * 9, 10);
      expect(p.x).toBeCloseTo(10 - 0.5 * 4, 10);
      expect(p.life).toBeCloseTo(0.5, 10);
    }
  });
  it('wrecks smoke for 18 seconds, then stop', () => {
    game();
    G.wrecks = [{ x: 100, y: 100, nat: 'fr', t: 0, puff: 0, d: null }];
    tick(0.04);
    expect(G.wrecks[0].t).toBeCloseTo(0.04, 10);
    expect(G.wrecks[0].puff).toBeCloseTo(0.22, 10);
    expect(G.smoke.length).toBe(1);
    G.wrecks[0].t = 18;
    tick(0.04);
    expect(G.smoke.length).toBe(1);                  // no new puff at t >= 18
  });
  it('is a no-op when the game is over', () => {
    game();
    G.running = false;
    G.S.t = 5; G.S.supplies = 100;
    tick(1);
    expect(G.S.t).toBe(5);
    expect(G.S.supplies).toBe(100);
  });
});
