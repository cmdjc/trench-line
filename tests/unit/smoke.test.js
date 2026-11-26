// Parity port of legacy/tests/smoke.js — every nation played headless (no DOM)
// against live opposition for four simulated minutes. Catches NaN poisoning,
// armour-cap violations and crashes that only show up in long games.
import { describe, expect, it } from 'vitest';
import { newGame, G } from '../../src/sim/state.js';
import { tick } from '../../src/sim/tick.js';
import { takeCard } from '../../src/sim/cards.js';
import { tanks } from '../../src/sim/geometry.js';
import { NAT } from '../../src/data/nations.js';

const NATS = ['gb', 'de', 'fr', 'ru', 'us', 'ah', 'it', 'aq', 'sx'];

// One four-minute run: top up both sides like the original harness so the game
// never starves, tick in 0.04 s substeps, take whatever card is offered.
function run(me, foe, map) {
  newGame(me, foe, map, 7);
  let bad = 0;
  let over = 0;
  for (let t = 0; t < 240; t += 4) {
    G.S.supplies = Math.max(G.S.supplies, 500);
    G.ai.money = Math.max(G.ai.money, 500);
    G.bases[0].hp = G.bases[0].max;
    G.bases[1].hp = G.bases[1].max;
    for (let i = 0; i < 100; i++) {
      tick(0.04);
      if (G.offer) takeCard(G.offer.ids[0]);
    }
    for (const u of G.units) {
      if (!Number.isFinite(u.x) || !Number.isFinite(u.y) || !Number.isFinite(u.hp)) bad++;
    }
    if (tanks(0) > NAT[me].tanks + 1e-6 || tanks(1) > NAT[foe].tanks + 1e-6) over++;
  }
  return { bad, over };
}

function expectSane(me, foe, map) {
  const { bad, over } = run(me, foe, map);
  expect(bad, `${me} vs ${foe} on ${map}: non-finite unit fields`).toBe(0);
  expect(over, `${me} vs ${foe} on ${map}: armour over cap`).toBe(0);
}

describe('smoke: every nation vs the heaviest opposition', () => {
  for (const me of NATS) {
    it(`open: ${me} vs ${me === 'de' ? 'gb' : 'de'} stays sane for 240 s`, () => {
      expectSane(me, me === 'de' ? 'gb' : 'de', 'open');
    }, 300_000);
  }
  for (const foe of NATS.filter((f) => f !== 'de')) {
    it(`open: de vs ${foe} stays sane for 240 s`, () => {
      expectSane('de', foe, 'open');
    }, 300_000);
  }
  it('river: aq vs it stays sane for 240 s', () => {
    expectSane('aq', 'it', 'river');
  }, 300_000);
  it('plain: ru vs fr stays sane for 240 s', () => {
    expectSane('ru', 'fr', 'plain');
  }, 300_000);
  it('plain: fr vs ru stays sane for 240 s', () => {
    expectSane('fr', 'ru', 'plain');
  }, 300_000);
  it('march: gb vs aq stays sane for 240 s', () => {
    expectSane('gb', 'aq', 'march');
  }, 300_000);
  it('march: de vs it stays sane for 240 s', () => {
    expectSane('de', 'it', 'march');
  }, 300_000);
});
