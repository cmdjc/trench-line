// E2E: the real page in jsdom. index.html plus an esbuild IIFE bundle of
// src/main.js (jsdom cannot run module scripts), stubs installed before any
// script runs, rAF captured so the test drives every frame. One scripted
// playthrough: pick gb vs de on the open map, buy, advance, fortify by
// double-tap, take cards, fire the Messines mine, rig the enemy HQ, win,
// read the save code, start a new run.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, expect, test } from 'vitest';
import { buildSync } from 'esbuild';
import { JSDOM, VirtualConsole } from 'jsdom';
import { readCode } from '../../src/sim/meta.js';

const root = fileURLToPath(new URL('../..', import.meta.url));
const errors = [];
const rafQ = [];
let now = 1e12;
let dom = null;
let w = null;
let d = null;
let T = null;

function frames(n, dtMs = 100) {
  for (let i = 0; i < n; i++) {
    now += dtMs;
    const q = rafQ.splice(0);
    for (const cb of q) cb(now);
  }
}

function click(sel) {
  const el = d.querySelector(sel);
  if (!el) throw new Error('missing element ' + sel);
  el.click();
  return el;
}

function tap(x, y) {
  const cv = d.getElementById('field');
  cv.dispatchEvent(new w.MouseEvent('pointerdown', { clientX: x, clientY: y, bubbles: true }));
  cv.dispatchEvent(new w.MouseEvent('pointerup', { clientX: x, clientY: y, bubbles: true }));
}

// Clicks through any open card offer; offers can appear mid-battle whenever
// kills cross a threshold, so every timed section funnels through this.
function drainCards() {
  const ov = d.getElementById('cardOv');
  for (let i = 0; i < 12 && !ov.hidden; i++) click('#cardList button[data-card]');
}

function step(sec, chunk = 0.5) {
  for (let i = 0; i < Math.ceil(sec / chunk); i++) { T.step(chunk); drainCards(); }
}

beforeAll(() => {
  const html = readFileSync(`${root}/index.html`, 'utf8');
  const js = buildSync({
    entryPoints: [`${root}/src/main.js`],
    bundle: true,
    format: 'iife',
    write: false,
    loader: { '.css': 'empty' },
  }).outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
  // jsdom cannot run module scripts, so the bundle becomes a classic script —
  // and those run immediately, so it must sit at the end of <body> to match
  // the deferred module script it replaces.
  const page = html
    .replace(/<script type="module"[^>]*><\/script>/, '')
    .replace('</body>', `<script>${js}</script></body>`);

  const vc = new VirtualConsole();
  vc.on('jsdomError', e => errors.push(`jsdomError: ${e.message || e}`));
  vc.on('error', (...a) => errors.push(`console.error: ${a.join(' ')}`));

  dom = new JSDOM(page, {
    runScripts: 'dangerously',
    url: 'https://trench.local/?e2e=1',
    virtualConsole: vc,
    beforeParse(win) {
      win.addEventListener('error', ev => errors.push(`page error: ${ev.message}`));
      win.requestAnimationFrame = cb => { rafQ.push(cb); return rafQ.length; };
      win.cancelAnimationFrame = () => { };
      const stub = new Proxy({}, {
        get(t, k) { return t[k] !== undefined ? t[k] : () => { }; },
        set(t, k, v) { t[k] = v; return true; },
      });
      win.HTMLCanvasElement.prototype.getContext = function () { return stub; };
      win.HTMLCanvasElement.prototype.getBoundingClientRect = function () {
        return { width: 900, height: 300, left: 0, top: 0, right: 900, bottom: 300 };
      };
    },
  });
  w = dom.window;
  d = w.document;
  T = w.__trench;
  frames(3); // boot frames: start overlay visible, loop running, nothing started
});

afterAll(() => { if (dom) dom.window.close(); });

test('start screen offers the eight nations and credits', () => {
  expect(T).toBeTruthy();
  expect(d.getElementById('startOv').hidden).toBe(false);
  const picks = d.querySelectorAll('#natList button[data-nation]');
  expect(picks.length).toBe(8);
  const credits = d.querySelector('.credits').textContent;
  expect(credits).toContain('M K');
  expect(credits).toContain('Claude and GLM');
});

test('full playthrough: picks, battle, mine, victory, save code, replay', () => {
  // -- pick gb vs de on the open map via real clicks
  click('button[data-nation="gb"]');
  expect(d.getElementById('startHead').textContent).toContain('Choose your enemy');
  click('button[data-nation="de"]');
  expect(d.getElementById('startHead').textContent).toContain('Choose the battlefield');
  expect(d.querySelectorAll('#natList button[data-map]').length).toBe(4);
  click('button[data-map="open"]');
  expect(d.getElementById('startOv').hidden).toBe(true);

  expect(T.info().running).toBe(true);
  expect(T.info().sel).toBe(1);
  expect(d.querySelectorAll('#map button').length).toBe(T.info().hq + 1);

  // -- the HUD is alive: supplies tick up with income
  const sup0 = T.info().sup;
  frames(5);
  expect(T.info().sup).toBeGreaterThan(sup0);
  expect(Number(d.getElementById('supplies').textContent)).toBeGreaterThanOrEqual(Math.floor(sup0));

  // -- double-tap trench 1 on the canvas to fortify it (while the camera
  //    still sits at x 0, before Advance pulls it toward line 2)
  T.give(1000);
  frames(2);
  const fortSup = T.info().sup;
  tap(386, 150); // posX(0,1,150,false) = trenchX(LX[1]) = 386
  tap(386, 150);
  expect(T.fort()[1]).toBe(1);
  expect(T.info().sup).toBeLessThan(fortSup); // charged 60

  // -- buy two riflemen through the buy panel
  const n0 = T.info().n[0];
  click('#buy button[data-buy="rifle"]');
  click('#buy button[data-buy="rifle"]');
  expect(T.info().n[0]).toBe(n0 + 2);
  expect(T.info().sup).toBeLessThan(1000 + sup0 - 20); // charged

  // -- advance to trench 2
  click('#advBtn');
  expect(T.info().sel).toBe(2);
  frames(3);
  expect(d.getElementById('selText').textContent.length).toBeGreaterThan(0);

  // -- card overlay: pick through the UI
  T.pend();
  frames(2);
  expect(d.getElementById('cardOv').hidden).toBe(false);
  expect(d.querySelectorAll('#cardList button[data-card]').length).toBe(3);
  click('#cardList button[data-card]');
  expect(d.getElementById('cardOv').hidden).toBe(true);
  expect(T.offer()).toBe(null);
  expect(T.info().cards).toBe(1);

  // -- superweapon: the Messines mine under the enemy's front trench.
  // The garrison only settles at trench 9 about 5 s in, so run the clock to
  // 9 s first; then fire, and short the 25 s fuse rather than waiting it out
  // (the countdown itself is unit-tested) before the AI walks away.
  T.give(1000);
  step(6);
  frames(3);
  const swBtn = d.getElementById('swBtn');
  expect(swBtn.hidden).toBe(false);
  expect(swBtn.disabled).toBe(false);
  click('#swBtn');
  const st = T.sw()[0];
  expect(st.tunnel).toBeTruthy();
  expect(st.tunnel.t).toBe(25);
  const kills0 = T.info().kills;
  // Seed-robust kill count: on ~2/7 of seeds the AI's first weighted buy
  // draw picks the (unaffordable) 65-cost MG 08 team, and its `want` then
  // blocks rifle buys until past t=8 s — so the mine may only catch the
  // 6 starters. That is genuine prototype AI behaviour, not a bug. What
  // MUST hold on every seed: every enemy inside the 70 px blast band dies.
  const blast = T.lx()[9];
  const near9 = T.units().filter(u => u.side === 1 && Math.abs(u.x - blast) <= 70).length;
  st.tunnel.t = 0.04;
  step(0.2);
  expect(T.sw()[0].tunnel).toBe(null); // detonated
  expect(T.info().kills).toBeGreaterThanOrEqual(kills0 + 6); // the garrison died
  expect(T.info().kills).toBeGreaterThanOrEqual(kills0 + near9); // the whole blast band died
  expect(T.info().cards).toBeGreaterThanOrEqual(2); // kills earned another card

  // -- rig the enemy HQ and take the win through the real end screen
  T.hq(1, 0);
  step(0.2);
  expect(T.info().running).toBe(false);
  expect(d.getElementById('endOv').hidden).toBe(false);
  expect(d.getElementById('endTitle').textContent).toBe('Victory');
  const earned = Number(d.getElementById('ePts').textContent.match(/\d+/)[0]);
  expect(earned).toBeGreaterThanOrEqual(30);

  // -- the save code round-trips
  const saved = readCode(d.getElementById('eCode').value);
  expect(saved.points).toBe(earned);
  expect(saved.runs).toBe(1);
  expect(saved.wins).toBe(1);

  // -- start a new run; the picks reset and work again
  click('#againBtn');
  expect(d.getElementById('endOv').hidden).toBe(true);
  expect(d.getElementById('startOv').hidden).toBe(false);
  expect(d.querySelectorAll('#natList button[data-nation]').length).toBe(8);
  click('button[data-nation="fr"]');
  click('button[data-nation="ru"]');
  click('button[data-map="river"]');
  expect(d.getElementById('startOv').hidden).toBe(true);
  expect(T.info().running).toBe(true);
  expect(T.info().hq).toBe(10); // river keeps the 9-trench layout
});

test('the page threw nothing along the way', () => {
  expect(errors).toEqual([]);
});
