// Headless scripted player. Drives the simulation directly — no DOM, no
// browser — so balance runs are fast and fully reproducible: the battle uses
// the seeded sim rng and the bot's decisions use their own generator derived
// from the same seed, so two runs with one seed play out identically.
// Port of legacy/tools/bot.js.
//
//   node scripts/bot.mjs [me] [foe] [map] [seed] [ratio] [--json]
//   MAXS=600 node scripts/bot.mjs de gb plain 7      # cap the run at 600 s
import { bus } from '../src/core/events.js';
import { makeRng } from '../src/core/rng.js';
import { G, newGame } from '../src/sim/state.js';
import { tick } from '../src/sim/tick.js';
import * as commands from '../src/sim/commands.js';
import { power, cost, full } from '../src/sim/geometry.js';
import { takeCard } from '../src/sim/cards.js';
import { swBlock, aimPoint } from '../src/sim/superweapons.js';
import { SW } from '../src/data/superweapons.js';

const argv = process.argv.slice(2);
const json = argv.includes('--json');
const [me = 'gb', foe = 'de', map = 'open', seedArg = '1', ratioArg = '2.5'] = argv.filter(a => a !== '--json');
const seed = Number(seedArg) >>> 0 || 1;
const ratio = Number(ratioArg) || 2.5;
const MAXS = Number(process.env.MAXS || 1800);

newGame(me, foe, map, seed);
const brain = makeRng((seed ^ 0xB07) >>> 0); // decisions stay off the battle stream

let end = null;
bus.on('game:end', d => { end = d; });

const settledAt = L => G.units.filter(u => u.side === 0 && u.line === L).every(u => u.settled);
const pref = ['tank', 'mortar', 'sniper', 'mg', 'raider', 'rifle'];
let want = null, sw = 0;

for (let sec = 0; sec < MAXS && G.running; sec++) {
  tick(1);

  // take a card when offered, preferring unlocks
  if (G.offer) takeCard(G.offer.ids.find(id => id.startsWith('u_')) || G.offer.ids[0]);

  // pick something to buy, then keep trying until it is affordable
  if (!want) want = brain() < 0.45 ? 'rifle' : pref[Math.floor(brain() * pref.length)];
  if (!G.S.unlocked[want] && want !== 'rifle' && want !== 'mg') want = null; // still card-locked
  else if (full(0, want) && G.S.supplies > 300) want = null; // at the cap, pick fresh
  else if (G.S.supplies >= cost(want)) { if (commands.buyUnit(want)) want = null; }

  // fire the superweapon on a whim when it is ready
  if (brain() < 0.1 && !swBlock(0) && G.S.supplies >= SW[G.nation[0]].cost) {
    if (SW[G.nation[0]].kind === 'paris') {
      if (commands.startAiming()) { const ap = aimPoint(0); G.aim.x = ap.x; G.aim.y = ap.y; if (commands.confirmAim()) sw++; }
    } else if (commands.fireSuperweapon()) sw++;
  }

  // sprinkle in fortifications at the selected line
  for (const cmd of [commands.fortifyAt, commands.buildNestAt, commands.buildDefAt]) {
    if (brain() < 0.015) cmd(G.sel);
  }

  // storm forward once the selected line is settled and strong enough
  if (G.sel < G.HQI && settledAt(G.sel)) {
    const m = power(0, G.sel);
    const f = power(1, G.sel + 1) + (G.sel === G.HQI - 1 ? 200 : 0);
    if ((f === 0 && m >= 100) || (f > 0 && m > f * ratio)) { commands.gather(); commands.advance(); }
  }

  if (process.env.LOG && sec % 120 === 0) {
    console.log((sec / 60) + 'm sel', G.sel, 'sup', Math.round(G.S.supplies),
      G.LX.map((x, L) => L).map(L => G.units.filter(u => u.hp > 0 && u.line === L && u.side === 0).length + '/' +
        G.units.filter(u => u.hp > 0 && u.line === L && u.side === 1).length).join(' '));
  }
}

const result = {
  me, foe, map, seed,
  won: end ? end.won : null, finished: !!end,
  time: Math.round(G.S.t * 10) / 10, sel: G.sel,
  kills: G.S.kills, losses: G.S.losses, cards: G.S.cards, sw,
  forts: G.fort.join(''), hq: Math.round(G.bases[0].hp) + '/' + Math.round(G.bases[1].hp),
};
if (json) console.log(JSON.stringify(result));
else console.log(me, 'vs', foe, map, 'seed', seed, 'END',
  end ? (end.won ? 'Victory' : 'Defeat') : '(unfinished)',
  (result.time / 60).toFixed(1) + 'm', 'sel', result.sel,
  'kills', result.kills, 'losses', result.losses, 'cards', result.cards, 'sw', result.sw,
  'forts', result.forts, 'hq', result.hq);
process.exit(0);
