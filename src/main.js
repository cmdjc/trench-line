// Entry point: wires the sim's bus events to the UI, boots the HUD and the
// frame loop, and arms the debug hook on ?debug / ?e2e URLs.

import { bus } from './core/events.js';
import { rng } from './core/rng.js';
import { G } from './sim/state.js';
import { loadMeta } from './sim/meta.js';
import { tick } from './sim/tick.js';
import { count, countAt, tanks, power, ut, full } from './sim/geometry.js';
import { tkList } from './data/units.js';
import { initCamera, resize } from './ui/camera.js';
import { initHud, buildMap, refresh, toast } from './ui/hud.js';
import { initBuy, buildBuy } from './ui/buy.js';
import { initCards, showOffer } from './ui/cards.js';
import { initOverlays, techLabels, showEnd, renderSaveState } from './ui/overlays.js';
import { initInput } from './ui/input.js';
import { startLoop, initMotion } from './ui/loop.js';

export function boot() {
  initMotion();
  initCamera(); initHud(); initBuy(); initCards(); initOverlays(); initInput();
  buildMap(); resize(); techLabels();   // buy panel builds on the first game:start

  bus.on('hud', refresh);
  bus.on('toast', toast);
  bus.on('dirty:map', () => { buildMap(); refresh(); });
  bus.on('dirty:buy', () => { buildBuy(); refresh(); });
  bus.on('game:start', () => { buildMap(); buildBuy(); refresh(); });
  bus.on('cards:offer', showOffer);
  bus.on('game:end', showEnd);
  bus.on('meta', renderSaveState);

  void loadMeta().then(() => techLabels());
  startLoop();

  if (typeof location !== 'undefined' && /debug|e2e/.test(location.search)) {
    window.__trench = {
      units: () => G.units, sw: () => G.sw, fields: () => G.fields,
      fort: () => G.fort, jobs: () => G.jobs, offer: () => G.offer,
      step(sec) { for (let t = 0; t < sec && G.running && document.getElementById('cardOv').hidden; t += 0.04) tick(0.04); },
      info: () => ({
        t: G.S.t, sel: G.sel, running: G.running, sup: G.S.supplies, kills: G.S.kills, losses: G.S.losses,
        hp: [G.bases[0].hp, G.bases[1].hp], n: [count(0) + tanks(0), count(1) + tanks(1)],
        hq: G.HQI, cards: G.S.cards,
        lines: G.LX.map((x, L) => L).map(L => countAt(0, L) + '/' + countAt(1, L)).join(' '),
        pw: L => [power(0, L), power(1, L)],
        settled: L => G.units.filter(u => u.side === 0 && u.line === L).every(u => u.settled),
      }),
      seed: () => rng.seed, ut: k => ut(0, k), tkList: () => tkList(G.nation[0]),
      tanks: () => tanks(0), full: k => full(0, k),
    };
  }
}

boot();
