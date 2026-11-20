// Task 7: damage model — pins every row of COV/ARM/NESTCOV/FORTD plus
// die()/hurtBase()/effect pushers, straight from the prototype (lines 762–797).
import { describe, it, expect, beforeEach } from 'vitest';
import { newGame, G } from '../../src/sim/state.js';
import { spawn } from '../../src/sim/geometry.js';
import { hurt, accVs, die, hurtBase, puff, boom, tracer, HQG } from '../../src/sim/combat.js';
import { bus } from '../../src/core/events.js';

/* build a settled/unsettled unit of `type` on line L, with fresh hp */
function mk(side, type, L, settled = true) {
  const u = spawn(side, type, L, settled);
  u.hp = u.max; // spawn randomises nothing about hp, but be explicit
  return u;
}
function hurtU(e, dmg, atk, attacker, cov, area) { hurt(e, dmg, atk, attacker, cov, area); }
/* damage taken = max - hp after one hurt(100) call */
const took = (e, atk, attacker, cov, area) => { const h0 = e.hp; hurtU(e, 100, atk, attacker, cov, area); return h0 - e.hp; };

beforeEach(() => { newGame('gb', 'de', 'open', 1); });

describe('hurt — trench cover rows (settled soft troops)', () => {
  it('unfortified trench: rifle 25%, mg 25%, sniper 50%, mortar 70%, tank 60%, base 30%, barrage 70%, raider 100%', () => {
    const rows = { rifle: 25, mg: 25, sniper: 50, mortar: 70, tank: 60, base: 30, barrage: 70, raider: 100 };
    for (const atk in rows) expect(took(mk(0, 'rifle', 3), atk), atk).toBeCloseTo(rows[atk], 9);
  });

  it('each fort level deepens cover: FORTD 1, .85, .72, .6, .5', () => {
    const mult = [1, 0.85, 0.72, 0.6, 0.5];
    for (let lv = 0; lv <= 4; lv++) {
      G.fort[3] = lv;
      expect(took(mk(0, 'rifle', 3), 'rifle'), 'lv ' + lv).toBeCloseTo(25 * mult[lv], 9);
    }
    G.fort[3] = 0;
  });

  it('raiders ignore trench cover; same-trench settled attackers ignore it too', () => {
    expect(took(mk(0, 'rifle', 3), 'raider')).toBeCloseTo(100, 9);
    const attacker = mk(1, 'rifle', 3);           // enemy settled in the SAME trench
    expect(took(mk(0, 'rifle', 3), 'rifle', attacker)).toBeCloseTo(100, 9);
    const outsider = mk(1, 'rifle', 4);           // different trench → cover applies
    expect(took(mk(0, 'rifle', 3), 'rifle', outsider)).toBeCloseTo(25, 9);
  });

  it('an explicit cov argument overrides the table (pit guns pass their own)', () => {
    expect(took(mk(0, 'rifle', 3), 'rifle', undefined, 0.3)).toBeCloseTo(30, 9);
  });

  it('troops on their own HQ line take 50% from everything', () => {
    expect(took(mk(0, 'rifle', 0), 'rifle')).toBeCloseTo(50, 9);
    expect(took(mk(1, 'rifle', G.HQI), 'rifle')).toBeCloseTo(50, 9);
  });

  it('unsettled (advancing) troops take full damage', () => {
    expect(took(mk(0, 'rifle', 2, false), 'rifle')).toBeCloseTo(100, 9);
  });

  it('double trench multiplies cover by 0.55 on top of everything else', () => {
    newGame('gb', 'de', 'plain', 1);              // DBL includes line 4
    expect(took(mk(0, 'rifle', 4), 'rifle')).toBeCloseTo(25 * 0.55, 9);
    G.fort[4] = 2;
    expect(took(mk(0, 'rifle', 4), 'mortar')).toBeCloseTo(70 * 0.72 * 0.55, 9);
  });

  it('Italy digs deeper: nation cover ×0.85', () => {
    newGame('it', 'de', 'open', 2);
    expect(took(mk(0, 'rifle', 3), 'rifle')).toBeCloseTo(25 * 0.85, 9);
  });
});

describe('hurt — armour rows', () => {
  it('armour table: rifle .1, mg .15, sniper .1, raider .6, mortar 1, tank 1, base .5, barrage 1', () => {
    const rows = { rifle: 10, mg: 15, sniper: 10, raider: 60, mortar: 100, tank: 100, base: 50, barrage: 100 };
    for (const atk in rows) expect(took(mk(1, 'tank', 5), atk), atk).toBeCloseTo(rows[atk], 9);
  });

  it('thin armour doubles every row below 0.5', () => {
    const thin = mk(0, 'tank', 5);                 // gb Mk V is thin
    expect(thin.T.thin).toBe(true);
    expect(took(thin, 'rifle')).toBeCloseTo(10 * 2, 9);   // .1 → .2
    expect(took(mk(0, 'tank', 5), 'sniper')).toBeCloseTo(10 * 2, 9);  // .1 → .2
    expect(took(mk(0, 'tank', 5), 'mortar')).toBeCloseTo(100, 9);     // ≥.5 stays
    expect(took(mk(0, 'tank', 5), 'mg')).toBeCloseTo(15 * 2, 9);      // .15 → .3
  });

  it('cover never applies to armour, settled or not', () => {
    G.fort[5] = 3;
    expect(took(mk(1, 'tank', 5, false), 'rifle')).toBeCloseTo(10, 9);
    G.fort[5] = 0;
  });
});

describe('hurt — special victims', () => {
  it('the Maxim shield cuts rifle/mg/sniper/base by ×0.55 only (ru)', () => {
    newGame('ru', 'de', 'open', 5);
    expect(took(mk(0, 'mg', 3), 'rifle')).toBeCloseTo(25 * 0.55, 9);
    expect(took(mk(0, 'mg', 3), 'mg')).toBeCloseTo(25 * 0.55, 9);
    expect(took(mk(0, 'mg', 3), 'sniper')).toBeCloseTo(50 * 0.55, 9);
    expect(took(mk(0, 'mg', 3), 'base')).toBeCloseTo(30 * 0.55, 9);
    expect(took(mk(0, 'mg', 3), 'mortar')).toBeCloseTo(70, 9);      // no shield vs shells
    expect(took(mk(0, 'mg', 3), 'tank')).toBeCloseTo(60, 9);
  });

  it('nests use NESTCOV; pillbox and bunker use their own ncov', () => {
    expect(took(mk(1, 'nest', 3), 'rifle')).toBeCloseTo(25, 9);     // NESTCOV.rifle
    expect(took(mk(1, 'nest', 3), 'sniper')).toBeCloseTo(45, 9);
    expect(took(mk(1, 'pillbox', 3), 'rifle')).toBeCloseTo(6, 9);   // own ncov
    expect(took(mk(1, 'bunker', 3), 'mortar')).toBeCloseTo(65, 9);
  });

  it('soft units take a flat 0.6 from anything (Škoda)', () => {
    newGame('gb', 'ah', 'open', 3);
    const gun = mk(1, 'tank', 5);                  // ah "tank" is the Škoda siege gun
    expect(gun.T.soft).toBe(true);
    expect(took(gun, 'rifle')).toBeCloseTo(60, 9);
    expect(took(gun, 'mortar')).toBeCloseTo(60, 9);
  });

  it('bunker shelter: direct fire redirects to the bunker, splash hits nothing, exposed troops hurt normally', () => {
    const bunker = mk(0, 'bunker', 3);
    const sheltered = mk(0, 'rifle', 3); sheltered.shelter = bunker;
    const bh0 = bunker.hp;
    expect(took(sheltered, 'rifle')).toBe(0);                 // soldier untouched
    expect(bh0 - bunker.hp).toBeCloseTo(100 * 0.08, 9);       // bunker ate it at its own ncov
    expect(took(sheltered, 'mortar', undefined, undefined, true)).toBe(0); // splash reaches neither
    const walker = mk(0, 'rifle', 2, false); walker.shelter = bunker;      // not settled → not sheltered
    expect(took(walker, 'rifle')).toBeCloseTo(100, 9);
  });

  it('dead units (hp<=0) cannot be hurt again', () => {
    const u = mk(0, 'rifle', 3); u.hp = 0;
    expect(took(u, 'rifle')).toBe(0);
  });
});

describe('accVs — fortification accuracy penalty', () => {
  const attacker = () => mk(0, 'rifle', 2);
  it('FORTA per level against settled trench troops; zero fort, raiders, armour and same-trench attackers exempt', () => {
    G.fort[3] = 2;
    expect(accVs(attacker(), mk(1, 'rifle', 3))).toBeCloseTo(0.76, 9);
    G.fort[3] = 4;
    expect(accVs(attacker(), mk(1, 'rifle', 3))).toBeCloseTo(0.55, 9);
    G.fort[3] = 0;
    expect(accVs(attacker(), mk(1, 'rifle', 3))).toBe(1);
    G.fort[3] = 4;
    expect(accVs(mk(0, 'raider', 2), mk(1, 'rifle', 3))).toBe(1);
    expect(accVs(attacker(), mk(1, 'tank', 3))).toBe(1);
    expect(accVs(mk(0, 'rifle', 3), mk(1, 'rifle', 3))).toBe(1);  // same trench
    G.fort[3] = 0;
  });
  it('HQG is the static base gun stand-in', () => {
    expect(HQG.type).toBe('base'); expect(HQG.settled).toBe(false); expect(HQG.line).toBe(-1);
  });
});

describe('die — bounty, score, cards, wrecks', () => {
  it('enemy death pays 0.25×cost bounty, bumps kills/score/cardKills, floats the gain', () => {
    const e = mk(1, 'rifle', 5); e.hp = 1; die(e);
    expect(G.S.supplies).toBeCloseTo(40 + 20 * 0.25, 9);        // de rifle costs 20
    expect(G.S.kills).toBe(1);
    expect(G.S.score).toBeCloseTo(1, 9);
    expect(G.S.cardKills).toBeCloseTo(1, 9);
    expect(G.floats.at(-1).txt).toBe('+5');
  });

  it('card offered exactly when cardKills reaches need; need grows by 3', () => {
    G.S.cardKills = 3.5; G.S.need = 4;
    die(mk(1, 'rifle', 5));
    expect(G.S.pending).toBe(1);
    expect(G.S.need).toBe(7);
    expect(G.S.cardKills).toBeCloseTo(0.5, 9);
  });

  it('own death counts a loss and pays the AI', () => {
    const mine = mk(0, 'rifle', 2);
    die(mine);
    expect(G.S.losses).toBe(1);
    expect(G.ai.money).toBeCloseTo(40 + 20 * 0.25, 9);
  });

  it('armour deaths leave a wreck, a scorch mark and a boom; ru wrecks draw as fr, tsar as tsar', () => {
    die(mk(1, 'tank', 5));
    expect(G.wrecks.length).toBe(1);
    expect(G.wrecks[0].nat).toBe('de');
    expect(G.booms.length).toBe(1);
    expect(G.scorch.length).toBe(1);
    newGame('gb', 'ru', 'open', 4);
    die(mk(1, 'tank', 5));
    expect(G.wrecks.at(-1).nat).toBe('fr');       // prototype quirk, preserved
    die(mk(1, 'tsar', 5));
    expect(G.wrecks.at(-1).nat).toBe('tsar');
  });

  it('effect pushers cap their arrays (scorch 70, smoke 160, booms 30, tracers 90, floats 30)', () => {
    for (let i = 0; i < 80; i++) die(mk(1, 'rifle', 5));
    expect(G.scorch.length).toBeLessThanOrEqual(70);
    expect(G.floats.length).toBeLessThanOrEqual(30);
    for (let i = 0; i < 200; i++) puff(0, 0, i % 4 === 0);
    expect(G.smoke.length).toBe(160);
    for (let i = 0; i < 40; i++) boom(0, 0, 20);
    expect(G.booms.length).toBe(30);
    for (let i = 0; i < 100; i++) tracer(0, 0, 1, 1, 1, '#fff');
    expect(G.tracers.length).toBe(90);
    expect(G.smoke[0].dark).toBe(true);            // the 160 that survived start on a dark puff
    expect(G.smoke[0].max).toBeCloseTo(1.6, 9);
    expect(G.smoke[1].max).toBeCloseTo(1.1, 9);    // …with light ones interleaved
    expect(G.tracers[0].life).toBeCloseTo(0.08, 9);
  });
});

describe('hurtBase — HQ damage and the warning toast', () => {
  it('subtracts and clamps at zero, warns at most once per 12 s, only for the player', () => {
    const toasts = [];
    const off = bus.on('toast', m => toasts.push(m));
    G.S.t = 20;                                   // warnT starts at 0
    hurtBase(0, 100);
    expect(G.bases[0].hp).toBe(2400);
    expect(toasts).toEqual(['Your HQ is under fire.']);
    hurtBase(0, 100);                             // still inside the 12 s window
    expect(toasts.length).toBe(1);
    G.S.t = 33;                                   // past warnT (32)
    hurtBase(0, 100);
    expect(toasts.length).toBe(2);
    hurtBase(1, 100);
    expect(toasts.length).toBe(2);                // enemy HQ never warns
    expect(G.bases[1].hp).toBe(2400);
    hurtBase(0, 1e6);
    expect(G.bases[0].hp).toBe(0);
    off();
  });
});

describe('accVs: raider-class fire ignores the fortification penalty', () => {
  it('a US Thompson (atk raider) ignores it like the German stormtrooper; a rifle does not', () => {
    newGame('us', 'de', 'open', 1);
    G.fort[3] = 2;
    const target = mk(1, 'rifle', 3);
    expect(accVs(mk(0, 'tommy', 5), target)).toBe(1);
    expect(accVs(mk(0, 'rifle', 5), target)).toBeLessThan(1);
    newGame('de', 'us', 'open', 1);
    G.fort[3] = 2;
    const t2 = mk(1, 'rifle', 3);
    expect(accVs(mk(0, 'raider', 5), t2)).toBe(1);
    expect(accVs(HQG, t2)).toBeLessThan(1);
  });
});
