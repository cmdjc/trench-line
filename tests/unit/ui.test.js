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
import { refresh } from '../../src/ui/hud.js';
import { startLoop, frame } from '../../src/ui/loop.js';

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
    G.aim = { x: null, y: null };
    ptr('pointerdown', 200, 120);
    ptr('pointerup', 200, 120);
    expect(G.aim).toEqual({ x: 200, y: 120 });
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

