import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { newGame, G } from '../../src/sim/state.js';
import { CARDS } from '../../src/data/cards.js';
import { META } from '../../src/sim/meta.js';
import { cardPool, buildOffer, offerCards, takeCard, pendingOffer } from '../../src/sim/cards.js';
import { bus } from '../../src/core/events.js';

const card = id => CARDS.find(c => c.id === id);

const toasts = [];
bus.on('toast', m => toasts.push(m));

function game(mine = 'gb', theirs = 'de', map = 'open') {
  newGame(mine, theirs, map, 7);
  G.shake = 0;
  toasts.length = 0;
}

/* fake rng: returns scripted floats, then 0 forever */
function scriptRng(...fs) {
  let i = 0;
  return { float: () => fs[i++] ?? 0 };
}

let techBackup;
beforeEach(() => {
  techBackup = META.tech;
  META.tech = {};
  game();
});
afterEach(() => { META.tech = techBackup; });

describe('card pool filters', () => {
  it('fresh gb pool: no plate (no tank), no tkM/H/S (prereqs), has u_tank + u_tkL', () => {
    const ids = cardPool().map(c => c.id);
    expect(ids).toContain('u_tank');
    expect(ids).toContain('u_tkL');
    expect(ids).not.toContain('plate');
    expect(ids).not.toContain('u_tkM');
    expect(ids).not.toContain('u_tkH');
    expect(ids).not.toContain('u_tkS');
  });

  it('once cards are excluded after being taken', () => {
    G.S.taken.u_raider = 1;
    expect(cardPool().map(c => c.id)).not.toContain('u_raider');
  });

  it('u_tank is redundant once tanks are unlocked', () => {
    G.S.unlocked.tank = true;
    const ids = cardPool().map(c => c.id);
    expect(ids).not.toContain('u_tank');
  });

  it('u_tkH needs the base tank unlocked first (de chain: tkL→tank→tkH→tkS)', () => {
    game('de', 'gb');
    expect(cardPool().map(c => c.id)).not.toContain('u_tkH');
    G.S.unlocked.tank = true;
    const ids = cardPool().map(c => c.id);
    expect(ids).toContain('u_tkH');
    expect(ids).not.toContain('u_tkS');   // needs tkH first
    expect(ids).not.toContain('u_tkM');   // no nation fields a tkM — dead card
  });

  it('titan tech unlocks tkS from the start, so the card never appears', () => {
    META.tech.titan = true;
    game();
    expect(G.S.unlocked.tkS).toBe(true);
    expect(cardPool().map(c => c.id)).not.toContain('u_tkS');
  });
});

describe('buildOffer — controlled rng', () => {
  it('float 0 picks the first card of the pool', () => {
    expect(buildOffer(scriptRng(0))[0]).toBe('draft');
  });

  it('straddles the first weight boundary', () => {
    const pool = cardPool();
    const tot = pool.reduce((s, c) => s + c.w, 0);
    const b = pool[0].w / tot;
    expect(buildOffer(scriptRng(b * (1 - 1e-9)))[0]).toBe(pool[0].id);
    expect(buildOffer(scriptRng(b * (1 + 1e-9)))[0]).toBe(pool[1].id);
  });

  it('float near 1 picks the last card of the pool', () => {
    const last = cardPool().at(-1).id;
    expect(buildOffer(scriptRng(0.999999))[0]).toBe(last);
  });

  it('selects without replacement: first three pool cards with all-zero floats', () => {
    const ids = buildOffer(scriptRng(0, 0, 0));
    expect(ids).toEqual(['draft', 'gunsec', 'u_raider']);
  });

  it('offers three cards (four with intel), all distinct and valid', () => {
    const ids = buildOffer(scriptRng(0, 0, 0, 0));
    expect(ids).toHaveLength(3);
    META.tech.intel = true;
    const ids4 = buildOffer(scriptRng(0, 0, 0, 0));
    expect(ids4).toHaveLength(4);
    for (const list of [ids, ids4]) {
      expect(new Set(list).size).toBe(list.length);
      for (const id of list) expect(CARDS.some(c => c.id === id)).toBe(true);
    }
  });

  it('corps tech forces u_tank into the first offer only', () => {
    META.tech.corps = true;
    expect(buildOffer(scriptRng(0, 0, 0))[0]).toBe('u_tank');
    G.S.cards = 1; // after the first pick it is no longer forced
    expect(buildOffer(scriptRng(0, 0, 0))[0]).toBe('draft');
  });
});

describe('takeCard effects', () => {
  const offer = id => { G.S.pending = 1; G.offer = { ids: [id] }; };

  it('rejects cards that are not on the table, charging nothing', () => {
    G.S.pending = 1;
    G.offer = null;
    expect(takeCard('bonds')).toBe(false);
    expect(G.S.pending).toBe(1);
    expect(G.M[0].income).toBe(3);
    G.offer = { ids: ['bonds'] };
    expect(takeCard('train')).toBe(false);
    expect(G.S.supplies).toBe(40);
    expect(G.S.pending).toBe(1);
  });

  it('u_raider unlocks raiders and spawns two at the selected line', () => {
    const buys = [];
    const off = bus.on('dirty:buy', () => buys.push(1));
    offer('u_raider');
    G.sel = 2;
    expect(takeCard('u_raider')).toBe(true);
    off();
    expect(G.S.unlocked.raider).toBe(true);
    const raiders = G.units.filter(u => u.side === 0 && u.type === 'raider');
    expect(raiders).toHaveLength(2);
    expect(raiders.every(u => u.line === 2)).toBe(true);
    expect(G.S.taken.u_raider).toBe(1);
    expect(G.S.cards).toBe(1);
    expect(G.S.pending).toBe(0);
    expect(G.offer).toBe(null);
    expect(buys).toHaveLength(1);
  });

  it('u_tank unlocks tanks and flags the buy panel', () => {
    const buys = [];
    const off = bus.on('dirty:buy', () => buys.push(1));
    offer('u_tank');
    takeCard('u_tank');
    off();
    expect(G.S.unlocked.tank).toBe(true);
    expect(buys).toHaveLength(1);
  });

  it('draft spawns riflemen worth 80 supplies', () => {
    const before = G.units.filter(u => u.side === 0 && u.type === 'rifle').length;
    offer('draft');
    takeCard('draft');
    const T = G.units.find(u => u.side === 0 && u.type === 'rifle').T;
    const after = G.units.filter(u => u.side === 0 && u.type === 'rifle').length;
    expect(after - before).toBe(Math.round(80 / T.cost));
  });

  it('bonds raise income by 1.5', () => {
    offer('bonds');
    takeCard('bonds');
    expect(G.M[0].income).toBeCloseTo(4.5, 10);
  });

  it('helmet buffs existing side-0 infantry only', () => {
    G.units = [];
    const r = G.units[G.units.length] = { side: 0, type: 'rifle', T: { cost: 20 }, hp: 100, max: 100 };
    const e = { side: 1, type: 'rifle', T: { cost: 20 }, hp: 100, max: 100 };
    G.units.push(e);
    offer('helmet');
    takeCard('helmet');
    expect(r.hp).toBeCloseTo(120, 10);
    expect(r.max).toBeCloseTo(120, 10);
    expect(e.hp).toBe(100);
    expect(G.M[0].hp).toBeCloseTo(1.2, 10);
  });

  it('barrage: first take sets 3 shells, second adds 2', () => {
    offer('barrage'); takeCard('barrage');
    expect(G.M[0].barrage).toBe(3);
    offer('barrage'); takeCard('barrage');
    expect(G.M[0].barrage).toBe(5);
  });

  it('plate buffs existing side-0 armour', () => {
    G.S.unlocked.tank = true;
    G.units = [];
    const t = { side: 0, type: 'tank', T: { cost: 200, armor: true }, hp: 200, max: 200 };
    const s = { side: 0, type: 'rifle', T: { cost: 20 }, hp: 100, max: 100 };
    G.units.push(t, s);
    offer('plate');
    takeCard('plate');
    expect(t.hp).toBeCloseTo(260, 10);
    expect(s.hp).toBe(100);
    expect(G.M[0].tankHp).toBeCloseTo(1.3, 10);
  });

  it('hq adds 500 hp and 30% harder guns; train adds 150 supplies', () => {
    offer('hq'); takeCard('hq');
    expect(G.bases[0].max).toBe(3000);
    expect(G.bases[0].hp).toBe(3000);
    expect(G.bases[0].dmg).toBeCloseTo(1.3, 10);
    offer('train'); takeCard('train');
    expect(G.S.supplies).toBe(190);
  });
});

describe('offer state machine', () => {
  it('one cards:offer event per offer, re-offer only after a take', () => {
    const offers = [];
    const off = bus.on('cards:offer', ids => offers.push(ids));
    G.S.pending = 2;
    const first = offerCards(scriptRng(0, 0, 0));
    expect(first).toHaveLength(3);
    expect(offers).toHaveLength(1);
    expect(G.offer.ids).toEqual(first);
    offerCards(scriptRng(0.9, 0.9, 0.9));   // still open → ignored
    expect(offers).toHaveLength(1);
    expect(G.offer.ids).toEqual(first);
    expect(pendingOffer()).toBe(false);

    expect(takeCard(first[0])).toBe(true);   // re-offers immediately (pending 1 left)
    expect(offers).toHaveLength(2);
    expect(G.S.pending).toBe(1);
    expect(pendingOffer()).toBe(false);

    expect(takeCard(G.offer.ids[0])).toBe(true);
    expect(offers).toHaveLength(2);
    expect(G.offer).toBe(null);
    expect(G.S.pending).toBe(0);
    expect(pendingOffer()).toBe(false);   // nothing left to choose
    off();
  });

  it('pendingOffer is true exactly when choices remain and no offer is open', () => {
    expect(pendingOffer()).toBe(false);      // pending 0
    G.S.pending = 1;
    expect(pendingOffer()).toBe(true);
    G.offer = { ids: ['bonds'] };
    expect(pendingOffer()).toBe(false);
  });
});

describe('relabelCards per nation', () => {
  it('gb keeps trench raiders; de gets Stormtroopers', () => {
    game('gb', 'de');
    expect(card('u_raider').text).toContain('cheap, tough and fast');
    game('de', 'gb');
    expect(card('u_raider').name).toBe('Stormtroopers');
  });

  it('ah renames the tank unlock to the Škoda siege gun', () => {
    game('ah', 'de');
    expect(card('u_tank').name).toBe('Siege gun: Škoda 30.5 cm');
  });

  it('aq tank text names the Weddell', () => {
    game('aq', 'de');
    expect(card('u_tank').text).toContain('Weddell');
  });

  it('gb u_tkL is labelled with the Whippet', () => {
    game('gb', 'de');
    expect(card('u_tkL').name).toBe('Light tank: Whippet');
  });

  it('draft text is rewritten with the nation plural', () => {
    game('gb', 'de');
    expect(card('draft').text).toMatch(/^\d+ \w+ report to your HQ at once\.$/);
  });
});
