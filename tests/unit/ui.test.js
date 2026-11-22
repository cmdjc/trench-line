// @vitest-environment jsdom
// UI layer tests (plan Task 15): the real index.html body in jsdom, canvas
// metrics stubbed, rAF replaced by a no-op so frame() is driven by hand.

import './ui-page.js';
import '../../src/main.js';                    // boot() wires the whole UI
import { describe, it, expect, beforeEach } from 'vitest';
import { G, newGame } from '../../src/sim/state.js';
import { endGame } from '../../src/sim/tick.js';
import { offerCards } from '../../src/sim/cards.js';
import { META, makeCode, readCode } from '../../src/sim/meta.js';
import { TECH } from '../../src/data/tech.js';
import { bus } from '../../src/core/events.js';
import { cam, vw, resize, focusLine, metrics } from '../../src/ui/camera.js';
import { clampAim } from '../../src/sim/gun.js';
import { WH } from '../../src/data/units.js';
import { GUNS } from '../../src/data/guns.js';
import * as commands from '../../src/sim/commands.js';
import { swCost } from '../../src/sim/superweapons.js';
import { nearestDrop } from '../../src/sim/drop.js';
import { refresh, buildMap, layoutActions, layoutTrackButton } from '../../src/ui/hud.js';
import { tunnelLines } from '../../src/sim/tunnel.js';
import { startLoop, frame } from '../../src/ui/loop.js';
import { cutTrack, layTrack } from '../../src/sim/rail.js';
import { trackGlyphLine, anchorX, toScreen } from '../../src/ui/fieldActions.js';

const $ = id => document.getElementById(id);

function game() {
  newGame('gb', 'de', 'open', 7);
  $('startOv').hidden = true; $('cardOv').hidden = true; $('endOv').hidden = true;
  cam.x = 0; cam.tx = 0; G.shake = 0; G.speed = 1; G.userPaused = false;
}

function fieldBox(w, h) {   // simulate a resized (e.g. wider) window
  const cv = $('field');
  cv.getBoundingClientRect = () => ({ width: w, height: h, left: 0, top: 0, right: w, bottom: h, x: 0, y: 0 });
}

beforeEach(() => {
  localStorage.clear();
  META.points = 0; META.tech = {}; META.runs = 0; META.wins = 0; META.rev = 0;
  game();
});

describe('base research start tiers', () => {
  it('starting a longer map with base research owned does not throw', () => {
    META.tech = { bw1: 1, bd1: 1, bh1: 1, bn1: 1 };
    game();                                   // strip built for 'open'
    expect(() => newGame('gb', 'de', 'plain', 7)).not.toThrow();
    expect(G.running).toBe(true);
  });
});

describe('mine button text', () => {
  it('shows the researched tunnel time once gb nat tier 1 is owned', () => {
    G.S.supplies = 5000; refresh();
    expect($('swBtn').textContent).toContain('25 seconds');
    G.base[0].nat = 1; refresh();
    expect($('swBtn').textContent).toContain('15 seconds');
  });
});

describe('base panel', () => {
  it('shows on the HQ line with four upgrade buttons and hides elsewhere', () => {
    expect($('basePanel').hidden).toBe(true);
    document.querySelector('#map button[data-line="0"]').click();
    expect($('basePanel').hidden).toBe(false);
    const btns = [...document.querySelectorAll('#basePanel button[data-base]')];
    expect(btns.length).toBe(4);
    expect(btns[0].textContent).toBe('Upgrade: 300');
    document.querySelector('#map button[data-line="1"]').click();
    expect($('basePanel').hidden).toBe(true);
  });

  it('buying walls raises the tier and updates the text', () => {
    document.querySelector('#map button[data-line="0"]').click();
    G.S.supplies = 1000; refresh();
    expect($('basePanel').textContent).toContain('Tier 0 of 3');
    document.querySelector('#basePanel button[data-base="walls"]').click();
    expect(G.base[0].walls).toBe(1);
    expect($('basePanel').textContent).toContain('Tier 1 of 3');
    expect(document.querySelector('#basePanel button[data-base="walls"]').textContent).toBe('Upgrade: 550');
  });

  it('national row buys the nation upgrade and maxed rows are disabled', () => {
    document.querySelector('#map button[data-line="0"]').click();
    G.S.supplies = 5000; refresh();
    const nat = () => document.querySelector('#basePanel button[data-base="gb"]');
    for (let i = 0; i < 3; i++) nat().click();
    expect(G.base[0].nat).toBe(3);
    expect(nat().textContent).toBe('Fully upgraded');
    expect(nat().disabled).toBe(true);
  });
});

describe('hud', () => {
  it('builds the trench strip with HQI+1 buttons', () => {
    const btns = [...document.querySelectorAll('#map button')];
    expect(btns.length).toBe(G.HQI + 1);
    expect(btns[0].textContent).toContain('HQ');
    expect(btns[btns.length - 1].textContent).toContain('HQ');
    expect($('map').classList.contains('long')).toBe(false); // NT=9
  });

  it('refresh paints supplies, rate, army and the pressed line', () => {
    expect($('supplies').textContent).toBe('40');
    expect($('rate').textContent).toBe('+3.0 a second');
    expect($('army').textContent).toContain('Infantry 6 of 40');
    expect(document.querySelector('#map button[data-line="1"]').getAttribute('aria-pressed')).toBe('true');
    expect(document.querySelector('#map button[data-line="2"]').getAttribute('aria-pressed')).toBe('false');
  });

  it('strip click selects a reachable line, rejects one the troops have not reached', () => {
    document.querySelector('#map button[data-line="0"]').click();
    expect(G.sel).toBe(0);
    document.querySelector('#map button[data-line="9"]').click();
    expect(G.sel).toBe(0); // not reached → toast, no change
    expect($('toast').textContent).toBe('You can only select lines your troops have reached.');
  });

  it('advance / fallback / gather buttons drive orders and toasts', () => {
    $('advBtn').click();
    expect(G.sel).toBe(2);
    expect(G.units.every(u => u.line !== 1)).toBe(true);
    expect($('advBtn').textContent).toBe('Advance');
    $('gatherBtn').click();
    expect($('toast').textContent).toBe('No troops behind this line.');
    G.units[0].line = 1; G.units[1].line = 1;
    $('gatherBtn').click();
    expect($('toast').textContent).toBe('2 troops called up to trench 2.');
    $('backBtn').click();
    expect(G.sel).toBe(1);
  });

  it('pause and speed toggles flip state and labels', () => {
    $('pauseBtn').click();
    expect(G.userPaused).toBe(true);
    expect($('pauseBtn').textContent).toBe('Resume');
    $('pauseBtn').click();
    expect(G.userPaused).toBe(false);
    $('speedBtn').click();
    expect(G.speed).toBe(2);
    expect($('speedBtn').textContent).toBe('Speed 2×');
    $('speedBtn').click();
    expect(G.speed).toBe(1);
  });

  it('toast bus event shows the message', () => {
    bus.emit('toast', 'Hello front.');
    expect($('toast').textContent).toBe('Hello front.');
    expect($('toast').classList.contains('on')).toBe(true);
  });

  it('super trench info appears only while the super trench is held', () => {
    newGame('gb', 'aq', 'march', 7);
    expect($('superInfo').hidden).toBe(true);
    G.owner[G.SUPER] = 0;
    bus.emit('hud');
    expect($('superInfo').hidden).toBe(false);
    expect($('superInfo').textContent).toContain('Super trench: next free card in 3:00');
  });

  it('superweapon button blocks when short and fires the mine when paid', () => {
    expect($('swBtn').hidden).toBe(false); // gb mine
    expect($('swBtn').disabled).toBe(true);
    G.S.supplies = 500;
    bus.emit('hud');
    expect($('swBtn').disabled).toBe(false);
    $('swBtn').click();
    expect(G.sw[0].tunnel).toBeTruthy();
    expect(G.S.supplies).toBe(50);
    expect($('toast').textContent).toContain('Tunnellers are digging');
  });
});

describe('field-action groups', () => {
  it('merges the two order groups into one floating container, anchored at the selected trench', () => {
    layoutActions();
    const grp = $('fieldActions');
    expect(Number.isFinite(parseFloat(grp.style.left))).toBe(true);
    expect(Number.isFinite(parseFloat(grp.style.top))).toBe(true);
    expect(grp.closest('.fieldwrap')).toBeTruthy();
    expect(grp.closest('.orders')).toBeFalsy();
    // both rows live inside the single container
    expect(grp.querySelector('#advBtn')).toBeTruthy();
    expect(grp.querySelector('#fortBtn')).toBeTruthy();
  });

  it('positions at a double trench without throwing', () => {
    newGame('gb', 'aq', 'march', 7);
    G.sel = G.SUPER;
    expect(() => layoutActions()).not.toThrow();
  });

  it('flips side at the player\'s own HQ', () => {
    G.sel = 1; layoutActions();
    const normal = $('fieldActions').style.transform;
    G.sel = 0; layoutActions();
    const atHQ = $('fieldActions').style.transform;
    expect(atHQ).not.toBe(normal);
    expect(atHQ).toContain('0%');
    expect(atHQ).not.toContain('-100%');
    expect(normal).toContain('-100%');
  });

  it('defBtn stays hidden with no defence', () => {
    G.nation[0] = 'de';
    refresh();
    expect($('defBtn').hidden).toBe(true);
  });

  it('defBtn visibility is driven dynamically by refresh(), not just the static markup', () => {
    // 'de' has no defence structure, so defBtn starts (and stays) hidden.
    newGame('de', 'gb', 'open', 7);
    refresh();
    expect($('defBtn').hidden).toBe(true);
    // switching to a nation with a defence structure must flip it visible
    // via refresh()'s own logic, not merely because the markup says hidden.
    newGame('gb', 'de', 'open', 7);
    refresh();
    expect($('defBtn').hidden).toBe(false);
  });

  it('keeps advBtn/backBtn/fortBtn/etc. reachable in DOM order after the canvas, before the map strip', () => {
    const order = [...document.querySelectorAll('#field, #fieldActions, #map')].map(el => el.id);
    expect(order.indexOf('field')).toBeLessThan(order.indexOf('fieldActions'));
    expect(order.indexOf('fieldActions')).toBeLessThan(order.indexOf('map'));
  });

  it('hides #fieldActions when its anchor would land fully off-screen', () => {
    layoutActions();
    expect($('fieldActions').hidden).toBe(false);
    cam.x = 100000; // push the anchor far outside the canvas
    layoutActions();
    expect($('fieldActions').hidden).toBe(true);
    cam.x = 0; layoutActions();
    expect($('fieldActions').hidden).toBe(false);
  });

  it('never collides vertically with the trackBtn band, at either K extreme (CH 240 or 380)', () => {
    // #fieldActions: two 46px rows + one 6px gap = 98px tall, centred (via
    // -50% transform) on toScreen(x, WH/2). #trackBtn: one ~46px band,
    // centred on toScreen(x, 40). Compute both bands in screen px at the
    // K extremes a real canvas height produces (CH 240 -> K 0.8, CH 380 ->
    // K 1.2667) and assert they never overlap.
    const actionsHeight = 98, trackHeight = 46;
    for (const K of [240 / WH, 380 / WH]) {
      const actionsCenter = (WH / 2) * K, trackCenter = 40 * K;
      const actionsTop = actionsCenter - actionsHeight / 2, actionsBottom = actionsCenter + actionsHeight / 2;
      const trackBottom = trackCenter + trackHeight / 2;
      expect(trackBottom).toBeLessThan(actionsTop);
      // and the whole #fieldActions container fits inside the canvas band
      // for a canvas of that height (CH = K*WH)
      const CH = K * WH;
      expect(actionsTop).toBeGreaterThanOrEqual(0);
      expect(actionsBottom).toBeLessThanOrEqual(CH);
    }
  });
});

describe('track button and map-strip rail glyph', () => {
  it('marks the next track segment on the map strip', () => {
    refresh();
    const L = trackGlyphLine(0);
    const cells = [...$('map').children];
    cells.forEach((c, i) => {
      expect(c.querySelector('.rail').textContent).toBe(i === L ? '═' : '');
    });
    expect(cells[L].getAttribute('aria-label')).toContain('next track segment');
  });

  it('labels the marked cell "track to repair" instead when it is a repair target', () => {
    G.owner[1] = 0; layTrack(0); G.track[0].broken.add(1);
    refresh();
    const L = trackGlyphLine(0);
    expect(G.track[0].broken.size > 0).toBe(true);
    const cells = [...$('map').children];
    expect(cells[L].getAttribute('aria-label')).toContain('track to repair');
    expect(cells[L].getAttribute('aria-label')).not.toContain('next track segment');
  });

  it('no glyph once the track is complete', () => {
    G.track[0].end = G.NT;
    refresh();
    const cells = [...$('map').children];
    cells.forEach(c => expect(c.querySelector('.rail').textContent).toBe(''));
    expect(trackGlyphLine(0)).toBe(null);
  });

  it('trackBtn floats at the segment it would affect', () => {
    layoutTrackButton();
    const L = trackGlyphLine(0);
    const expected = toScreen(anchorX(L), 0).x;
    const tb = $('trackBtn');
    expect(tb.closest('.fieldwrap')).toBeTruthy();
    expect(tb.closest('.orders')).toBeFalsy();
    expect(parseFloat(tb.style.left)).toBeCloseTo(expected, 5);
    expect(tb.hidden).toBe(false);
  });

  it('hides trackBtn entirely once the track is complete, rather than leaving it at a stale anchor', () => {
    layoutTrackButton();
    expect($('trackBtn').hidden).toBe(false);
    G.track[0].end = G.NT;
    layoutTrackButton();
    expect($('trackBtn').hidden).toBe(true);
    // resumes showing and positioning it the moment a segment breaks again
    G.track[0].broken.add(1);
    layoutTrackButton();
    expect($('trackBtn').hidden).toBe(false);
    expect(Number.isFinite(parseFloat($('trackBtn').style.left))).toBe(true);
  });

  it('hides trackBtn when its own anchor would land fully off-screen', () => {
    layoutTrackButton();
    expect($('trackBtn').hidden).toBe(false);
    cam.x = 100000;
    layoutTrackButton();
    expect($('trackBtn').hidden).toBe(true);
    cam.x = 0;
  });
});

describe('HQ gun button', () => {
  const g = GUNS.gb;
  it('shows Aim when ready and disables when short', () => {
    G.S.supplies = g.cost - 1; bus.emit('hud');
    expect($('gunBtn').textContent).toBe('Aim ' + g.name + ': ' + g.cost);
    expect($('gunBtn').disabled).toBe(true);
    G.S.supplies = g.cost; bus.emit('hud');
    expect($('gunBtn').disabled).toBe(false);
  });
  it('shows the reload while cooling down', () => {
    G.S.supplies = 500; G.gun[0].cd = 3.2; bus.emit('hud');
    expect($('gunBtn').textContent).toBe(g.name + ': ready in 4 s');
    expect($('gunBtn').disabled).toBe(true);
  });
  it('aim, place, confirm fires and charges', () => {
    G.S.supplies = 500; bus.emit('hud');
    $('gunBtn').click();
    expect(G.aim.kind).toBe('gun');
    expect($('gunBtn').textContent).toContain('Confirm target, ' + g.cost);
    expect($('gunBtn').textContent).toContain('Tap the field to place the target.');
    expect($('gunBtn').disabled).toBe(true);        // not placed yet
    expect($('swBtn').textContent).not.toContain('Confirm target');
    expect($('aimCancel').hidden).toBe(false);
    G.aim.x = 300; G.aim.y = 150; bus.emit('hud');
    expect($('gunBtn').disabled).toBe(false);
    $('gunBtn').click();
    expect(G.S.supplies).toBe(500 - g.cost);
    expect(G.gun[0].cd).toBe(g.cd);
    expect(G.aim).toBeNull();
  });
  it('a gun aim survives refresh when the superweapon is blocked and is cancellable', () => {
    G.S.supplies = 500; commands.startGunAim(); bus.emit('hud');
    expect(G.aim && G.aim.kind).toBe('gun');
    $('aimCancel').click();
    expect(G.aim).toBeNull();
  });
  it('explains a disabled gun confirm when supplies are short', () => {
    G.S.supplies = g.cost; commands.startGunAim(); G.aim.x = 300; G.aim.y = 150; G.S.supplies = g.cost - 1; bus.emit('hud');
    expect($('gunBtn').disabled).toBe(true);
    expect($('gunBtn').textContent).toContain('Not enough supplies yet.');
  });
  it('a Paris aim shows swBtn confirm, not gunBtn confirm', () => {
    G.nation[0] = 'de'; G.S.supplies = 5000; commands.startAiming(); bus.emit('hud');
    expect(G.aim.kind).toBe('paris');
    expect($('swBtn').textContent).toContain('Confirm target');
    expect($('gunBtn').textContent).not.toContain('Confirm');
  });
  it('swBtn during a gun aim starts the superweapon instead', () => {
    G.S.supplies = 500; commands.startGunAim(); bus.emit('hud');
    $('swBtn').click();
    expect(G.sw[0].tunnel).toBeTruthy();
  });
});

describe('airborne drop aiming', () => {
  beforeEach(() => { newGame('us', 'de', 'open', 7); G.S.supplies = 1000; bus.emit('hud'); });
  it('swBtn starts a drop aim and shows the unplaced prompt', () => {
    $('swBtn').click();
    expect(G.aim.kind).toBe('drop');
    expect($('swBtn').textContent).toContain('Confirm drop, ' + swCost(0));
    expect($('swBtn').textContent).toContain('Tap a trench to mark the drop zone.');
    expect($('swBtn').disabled).toBe(true);
    expect($('aimCancel').hidden).toBe(false);
  });
  it('a placed aim names the trench; confirm charges once', () => {
    $('swBtn').click();
    G.aim.line = nearestDrop(0, G.LX[2]); G.aim.x = G.LX[G.aim.line]; bus.emit('hud');
    expect($('swBtn').textContent).toContain('Drop on trench ' + G.aim.line + '.');
    expect($('swBtn').disabled).toBe(false);
    $('swBtn').click();
    expect(G.S.supplies).toBe(1000 - swCost(0));
    expect(G.aim).toBeNull();
  });
  it('a stale target disables Confirm and asks for another trench', () => {
    $('swBtn').click();
    const L = nearestDrop(0, G.LX[3]); G.aim.line = L; G.aim.x = G.LX[L];
    G.owner[L] = 0; bus.emit('hud');
    expect(G.aim).not.toBeNull();
    expect($('swBtn').textContent).toContain('Trench ' + L + ' is no longer a drop zone. Tap another.');
    expect($('swBtn').disabled).toBe(true);
  });
  it('explains short supplies', () => {
    $('swBtn').click(); G.aim.line = nearestDrop(0, G.LX[1]); G.aim.x = G.LX[G.aim.line];
    G.S.supplies = swCost(0) - 1; bus.emit('hud');
    expect($('swBtn').textContent).toContain('Not enough supplies yet.');
    expect($('swBtn').disabled).toBe(true);
  });
  it('a gun aim and a drop aim replace each other', () => {
    commands.startGunAim(); expect(G.aim.kind).toBe('gun');
    $('swBtn').click(); expect(G.aim.kind).toBe('drop');
    commands.startGunAim(); expect(G.aim.kind).toBe('gun');
  });
  it('the aim clears when no trench is valid any more', () => {
    commands.startAiming(); expect(G.aim.kind).toBe('drop');
    for (let L = 1; L <= G.NT; L++) G.owner[L] = 0;
    bus.emit('hud');
    expect(G.aim).toBeNull();
  });
});

describe('buy panel', () => {
  it('lists infantry with costs and disables them when short of supplies', () => {
    const rifle = document.querySelector('#buy button[data-buy="rifle"]');
    expect(rifle).toBeTruthy();
    expect(rifle.querySelector('h3 span').textContent).toBe('20');
    expect(rifle.disabled).toBe(false);
    G.S.supplies = 5;
    bus.emit('hud');
    expect(rifle.disabled).toBe(true);
  });

  it('buying charges once and marches the new unit to the selected line', () => {
    G.S.supplies = 100;
    const before = G.units.length;
    document.querySelector('#buy button[data-buy="rifle"]').click();
    expect(G.units.length).toBe(before + 1);
    expect(G.S.supplies).toBe(80);
    expect(G.units[G.units.length - 1].line).toBe(G.sel);
  });
});

describe('card overlay', () => {
  it('renders the offer and taking a card applies it and closes', () => {
    G.S.pending = 1;
    offerCards();
    const btns = [...document.querySelectorAll('#cardList button')];
    expect(btns.length).toBe(G.offer.ids.length);
    expect($('cardOv').hidden).toBe(false);
    const id = G.offer.ids[0];
    btns[0].click();
    expect(G.S.taken[id]).toBe(1);
    expect(G.S.pending).toBe(0);
    expect($('cardOv').hidden).toBe(true);
  });

  it('re-offers immediately while more choices are pending', () => {
    G.S.pending = 2;
    offerCards();
    const first = G.offer.ids[0];
    document.querySelector('#cardList button').click();
    expect(G.S.taken[first]).toBe(1);
    expect(G.S.pending).toBe(1);
    expect(G.offer).toBeTruthy();       // new offer already open
    expect($('cardOv').hidden).toBe(false);
    document.querySelector('#cardList button').click();
    expect($('cardOv').hidden).toBe(true);
  });
});

describe('research overlay', () => {
  it('renders four branches and researches a node for points', () => {
    META.points = 18;
    $('techBtn').click();
    expect($('techOv').hidden).toBe(false);
    expect(document.querySelectorAll('#techTree .branch').length).toBe(TECH.length);
    const first = TECH[0].nodes[0];
    document.querySelector(`#techTree button[data-tech="${first.id}"]`).click();
    expect($('techBuy').textContent).toBe(`Research for ${first.cost} points`);
    expect($('techBuy').disabled).toBe(false);
    $('techBuy').click();
    expect(META.points).toBe(18 - first.cost);
    expect(META.tech[first.id]).toBe(1);
    expect($('codeOut').value).toMatch(/^TL1-/);
    $('techBack').click();
    expect($('techOv').hidden).toBe(true);
  });

  it('save codes round-trip through the load box', () => {
    META.points = 18; META.tech = { marks: 1 }; META.runs = 2; META.wins = 1;
    const code = makeCode();
    META.points = 0; META.tech = {}; META.runs = 0; META.wins = 0;
    $('techBtn').click();
    $('codeIn').value = code;
    $('codeLoad').click();
    expect(META.points).toBe(18);
    expect(META.tech.marks).toBe(1);
    expect(META.runs).toBe(2);
    expect(META.wins).toBe(1);
    expect($('codeMsg').textContent).toContain('Research restored: 1 upgrade and 18 points');
    expect($('saveState').textContent).toBe('Saved automatically in two places.');
  });

  it('rejects a mistyped code with a message and no state change', () => {
    META.points = 5;
    $('techBtn').click();
    $('codeIn').value = 'TL1-5-0-0-0-ZZ';
    $('codeLoad').click();
    expect(META.points).toBe(5);
    expect($('codeMsg').textContent).toContain('not valid');
  });

  it('copy reports a blocked clipboard instead of throwing', async () => {
    $('endTechBtn').click();
    $('eCopy').click();
    await new Promise(r => setTimeout(r, 0));
    expect($('eMsg').textContent).toContain('Copying is blocked here');
  });
});

describe('end screen and start flow', () => {
  it('victory fills the end screen with a parseable save code', () => {
    endGame(true);
    expect($('endTitle').textContent).toBe('Victory');
    expect($('ePts').textContent).toContain('(30 for the win)');
    const d = readCode($('eCode').value);
    expect(d).toBeTruthy();
    expect(d.points).toBeGreaterThanOrEqual(30);
    expect($('endOv').hidden).toBe(false);
  });

  it('starting a new battle resets the camera and paints the nation names', () => {
    cam.x = 4000; cam.tx = 4000;              // panned far right on the open map
    newGame('ru', 'fr', 'plain', 7);
    expect(cam.x).toBe(0);
    expect(cam.tx).toBe(0);
    expect($('nmA').textContent).toBe('Russia (you)');
    expect($('nmB').textContent).toBe('France');
  });

  it('again returns to the start screen and a full pick flow starts a battle', () => {
    endGame(false);
    $('againBtn').click();
    expect($('endOv').hidden).toBe(true);
    expect($('startOv').hidden).toBe(false);
    const picks = [...document.querySelectorAll('#natList button[data-nation]')];
    expect(picks.length).toBe(8);
    picks[0].click();                                        // play as first nation
    expect([...document.querySelectorAll('#natList button[data-nation]')].length).toBe(7);
    document.querySelectorAll('#natList button[data-nation]')[1].click(); // enemy
    const maps = [...document.querySelectorAll('#natList button[data-map]')];
    expect(maps.length).toBe(4);
    maps[0].click();                                         // open
    expect($('startOv').hidden).toBe(true);
    expect(G.running).toBe(true);
    expect(G.MAP).toBe('open');
  });
});

describe('game loop', () => {
  it('clamps dt at 0.1s and substeps in 0.04s chunks with a remainder', () => {
    startLoop(0);
    frame(5000);                       // dt clamped to 0.1
    expect(G.S.t).toBeCloseTo(0.1, 10);
    frame(5030);                       // dt 0.03 → single remainder substep
    expect(G.S.t).toBeCloseTo(0.13, 10);
  });

  it('speed ×2 doubles the simulated time', () => {
    G.speed = 2;
    startLoop(0);
    frame(100);
    expect(G.S.t).toBeCloseTo(0.2, 10);
  });

  it('pause button and open overlays stop the clock', () => {
    startLoop(0);
    frame(100);
    const t = G.S.t;
    G.userPaused = true;
    frame(200);
    expect(G.S.t).toBe(t);
    G.userPaused = false;
    $('endOv').hidden = false;
    frame(300);
    expect(G.S.t).toBe(t);
    $('endOv').hidden = true;
    frame(400);
    expect(G.S.t).toBeGreaterThan(t);
  });

  it('a card offer opened mid-frame pauses the next frame', () => {
    startLoop(0);
    G.S.pending = 1;
    frame(100);
    expect(G.offer).toBeTruthy();
    expect($('cardOv').hidden).toBe(false);
    expect(G.S.t).toBeCloseTo(0.1, 10);  // this frame still finished
    frame(200);
    expect(G.S.t).toBeCloseTo(0.1, 10);  // next frame paused by the overlay
    document.querySelector('#cardList button').click();
    expect($('cardOv').hidden).toBe(true);
    frame(300);
    expect(G.S.t).toBeGreaterThan(0.1);
  });

  it('repositions #fieldActions/#trackBtn every frame, not just every 0.25s refresh tick', () => {
    startLoop(0);
    frame(100);
    const before = $('fieldActions').style.left;
    cam.x = 50;                          // simulate a drag/pan moving the camera
    frame(110);                          // 10ms later — well under the 0.25s refresh throttle
    const after = $('fieldActions').style.left;
    expect(after).not.toBe(before);
    cam.x = 0;
  });
});

describe('pointer input', () => {
  const ptr = (type, x, y) => {
    $('field').dispatchEvent(new MouseEvent(type, { clientX: x, clientY: y, bubbles: true }));
  };

  it('a tap on the field selects the nearest line', () => {
    ptr('pointerdown', 205, 150);  // posX(0,0,150) = LX[0]+55
    ptr('pointerup', 205, 150);
    expect(G.sel).toBe(0);
    ptr('pointerdown', 386, 150);  // trenchX(LX[1],150) = 380+6
    ptr('pointerup', 386, 150);
    expect(G.sel).toBe(1);
  });

  it('a double tap on an owned trench fortifies it', () => {
    G.S.supplies = 200;
    ptr('pointerdown', 386, 150);
    ptr('pointerup', 386, 150);
    ptr('pointerdown', 386, 150);
    ptr('pointerup', 386, 150);
    expect(G.fort[1]).toBe(1);
    expect(G.S.supplies).toBe(140);
  });

  it('dragging pans the camera, clamped to the field', () => {
    ptr('pointerdown', 300, 150);
    ptr('pointermove', 200, 150);   // dx −100 → cam +100
    expect(cam.x).toBe(100);
    expect(cam.tx).toBe(100);
    ptr('pointermove', 400, 150);   // dx +100 from origin → cam 0, clamped
    expect(cam.x).toBe(0);
  });

  it('arrow keys nudge the camera target', () => {
    cam.tx = 0;
    $('field').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(cam.tx).toBe(120);
  });

  it('taps while aiming place the Paris Gun target', () => {
    G.aim = { kind: 'paris', x: null, y: null };
    ptr('pointerdown', 200, 120);
    ptr('pointerup', 200, 120);
    expect(G.aim).toEqual({ kind: 'paris', x: 200, y: 120 });
  });

  it('taps while gun aiming clamp x to the gun range', () => {
    G.aim = { kind: 'gun', x: null, y: null };
    ptr('pointerdown', G.WW - 5, 120);
    ptr('pointerup', G.WW - 5, 120);
    expect(G.aim.x).toBe(clampAim(0, G.WW - 5));
    expect(G.aim.x).toBeLessThan(G.WW - 5);
  });
  describe('drop aim taps', () => {
    beforeEach(() => { newGame('us', 'de', 'open', 7); });
    it('a tap snaps the aim to the nearest valid trench', () => {
      G.aim = { kind: 'drop', x: null, y: null, line: -1 };
      const L = nearestDrop(0, 300);
      ptr('pointerdown', 300, 120); ptr('pointerup', 300, 120);
      expect(G.aim.line).toBe(L);
      expect(G.aim.x).toBe(G.LX[L]);
      expect(G.aim.y).toBe(WH / 2);
    });
    it('a tap with no valid trench leaves the aim unplaced', () => {
      for (let L = 1; L <= G.NT; L++) G.owner[L] = 0;
      G.aim = { kind: 'drop', x: null, y: null, line: -1 };
      ptr('pointerdown', 300, 120); ptr('pointerup', 300, 120);
      expect(G.aim ? G.aim.x : null).toBeNull();   // never placed (the HUD may also auto-clear it)
    });
  });
});

describe('debug hook', () => {
  it('is not armed without ?debug or ?e2e in the URL', () => {
    expect(window.__trench).toBeUndefined();
  });
});

describe('responsive width', () => {
  it('a wider field reveals more battlefield', () => {
    fieldBox(1600, 300);
    resize();
    expect(metrics().CW).toBe(1600);
    expect(vw()).toBeCloseTo(1600, 5);          // K = 300/300 = 1
    cam.x = 99999; cam.tx = 99999; resize();     // clamped to the world edge
    expect(cam.x).toBe(G.WW - vw());
    expect(cam.tx).toBe(G.WW - vw());
  });

  it('an ultra-wide view centres the whole battlefield', () => {
    fieldBox(5000, 300);
    resize();
    const span = G.WW - vw();
    expect(span).toBeLessThan(0);                // whole world visible
    expect(cam.x).toBe(span / 2);
    expect(cam.tx).toBe(span / 2);
    focusLine(5);                                // focus keeps it centred
    expect(cam.tx).toBe(span / 2);
  });

  it('dragging cannot pull a fully-visible world off centre', () => {
    fieldBox(5000, 300);
    resize();
    const centre = (G.WW - vw()) / 2;
    const cv = $('field');
    cv.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, clientX: 400, clientY: 150 }));
    cv.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 100, clientY: 150 }));
    expect(cam.x).toBe(centre);
    cv.dispatchEvent(new MouseEvent('pointerup', { bubbles: true, clientX: 100, clientY: 150 }));
    expect(cam.x).toBe(centre);
  });

  it('arrow keys cannot scroll past a fully-visible world', () => {
    fieldBox(5000, 300);
    resize();
    const centre = (G.WW - vw()) / 2;
    $('field').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    $('field').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    expect(cam.tx).toBe(centre);
  });
});


describe('railway buttons', () => {
  it('lay track: label, reason when the trench is not held, click lays and charges', () => {
    G.S.supplies = 500; G.owner[1] = 1; bus.emit('hud');
    expect($('trackBtn').textContent).toContain('Lay track: 20');
    expect($('trackBtn').textContent).toContain('Trench 1 is not held.');
    expect($('trackBtn').disabled).toBe(true);
    G.owner[1] = 0; bus.emit('hud');
    expect($('trackBtn').disabled).toBe(false);
    $('trackBtn').click();
    expect(G.track[0].end).toBe(1);
    expect(G.S.supplies).toBe(480);
  });
  it('turns into repair track when a segment is broken', () => {
    G.S.supplies = 500; G.owner[1] = 0; G.track[0].end = 1; G.track[0].broken.add(1); bus.emit('hud');
    expect($('trackBtn').textContent).toContain('Repair track: 20');
    expect($('trackBtn').disabled).toBe(false);
    $('trackBtn').click();
    expect(G.track[0].broken.size).toBe(0);
    expect(G.S.supplies).toBe(480);
    expect($('trackBtn').textContent).toContain('Lay track: 20');
  });
  it('train button shows its national name and cost, and says why it is off', () => {
    G.S.supplies = 500; bus.emit('hud');
    expect($('trainBtn').textContent).toContain('Simplex light railway: 150');
    expect($('trainBtn').textContent).toContain('No track yet.');
    expect($('trainBtn').disabled).toBe(true);
    G.owner[1] = 0; G.track[0].end = 1; G.S.supplies = 100; bus.emit('hud');
    expect($('trainBtn').textContent).toContain('Not enough supplies.');
    G.S.supplies = 500; bus.emit('hud');
    expect($('trainBtn').disabled).toBe(false);
    $('trainBtn').click(); $('trainBtn').click(); $('trainBtn').click();
    expect(G.trains.length).toBe(3);
    expect(G.S.supplies).toBe(50);
    G.S.supplies = 500; bus.emit('hud');
    expect($('trainBtn').textContent).toContain('All train slots in use.');
    expect($('trainBtn').disabled).toBe(true);
  });
  it('train button: a break at the HQ asks for repair, a cut says so', () => {
    G.S.supplies = 500; G.owner[1] = 0; G.track[0].end = 1; G.track[0].broken.add(1); bus.emit('hud');
    expect($('trainBtn').textContent).toContain('Repair the broken track first.');
    expect($('trainBtn').disabled).toBe(true);
    G.track[0].broken.clear(); cutTrack(0, 1); bus.emit('hud');
    expect($('trainBtn').textContent).toContain('The track is cut.');
    expect($('trainBtn').disabled).toBe(true);
    G.track[0].end = 2; G.owner[1] = 1; bus.emit('hud');           // laid but the first trench is lost
    expect($('trainBtn').textContent).toContain('The track is cut.');
  });
});

describe('tunnel trench glyph', () => {
  it('labels tunnel trenches for screen readers', () => {
    newGame('gb', 'de', 'march', 7);
    buildMap(); refresh();
    const cells = document.querySelector('#map').children;
    for (let L = 0; L <= G.HQI; L++) expect(cells[L].getAttribute('aria-label').endsWith(', tunnel')).toBe(tunnelLines().includes(L));
  });
  it('marks the tunnel trenches on march only', () => {
    newGame('gb', 'de', 'march', 7);
    buildMap();
    const lit = [...document.querySelectorAll('#map button')].filter(b => b.textContent.includes('⊓')).map(b => +b.dataset.line);
    expect(lit).toEqual(tunnelLines());
    newGame('gb', 'de', 'open', 7);
    buildMap();
    expect(document.querySelector('#map').textContent).not.toContain('⊓');
  });
});
