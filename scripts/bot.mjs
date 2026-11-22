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
import { dropTarget } from '../src/sim/drop.js';
import { tier, nextCost } from '../src/sim/base.js';
import { gunBlock, bestTarget } from '../src/sim/gun.js';
import { GUNS } from '../src/data/guns.js';
import { TRACK_COST, REPAIR_COST, TRAINS } from '../src/data/rail.js';
import { canLay, trackEnd, canBuyTrain, isArmor } from '../src/sim/rail.js';

const argv = process.argv.slice(2);
const json = argv.includes('--json');
const [me = 'gb', foe = 'de', map = 'open', seedArg = '1', ratioArg = '2.5'] = argv.filter(a => a !== '--json');
const seed = Number(seedArg) >>> 0 || 1;
const ratio = Number(ratioArg) || 2.5;
const MAXS = Number(process.env.MAXS || 1800);
const BASEX = Number(process.env.BASEX || 2); // buy base tiers at this multiple of the cost

newGame(me, foe, map, seed);
const NORAIL = !!process.env.NORAIL; // scratch comparison: neither side builds track
const BOTNORAIL = NORAIL || !!process.env.BOTNORAIL; // BOTNORAIL: only the enemy builds
if (NORAIL || process.env.FOENORAIL) G.ai.noRail = true; // FOENORAIL: only the enemy goes without
const brain = makeRng((seed ^ 0xB07) >>> 0); // decisions stay off the battle stream

let end = null;
bus.on('game:end', d => { end = d; });

const settledAt = L => G.units.filter(u => u.side === 0 && u.line === L).every(u => u.settled);
const BASE_ROT = ['walls', 'nat', 'depot', 'hosp']; // same rotation as the AI
const pref = ['tank', 'mortar', 'sniper', 'mg', 'raider', 'rifle'];
// rail usage, sampled once a second: a "trip" is a train turning at the HQ for another run.
// Armoured trains are reported separately (armor/foeArmor), never in trains.bought/trips; their shots and
// mgShots are kept per train id so a destroyed train's shots still count in the final total.
const rail = [{ trips: 0, riders: 0, healed: 0, bought: 0 }, { trips: 0, riders: 0, healed: 0, bought: 0 }];
const armorBought = [0, 0];
const armorStats = [new Map(), new Map()]; // id -> { shots, mgShots }
const seen = new Set(), seenT = new Map();
function watchRail() {
  for (const t of G.trains) {
    const p = seenT.get(t.id);
    if (isArmor(t)) {
      if (!p) armorBought[t.side]++;
      armorStats[t.side].set(t.id, { shots: t.shots, mgShots: t.mgShots });
    } else {
      if (!p) rail[t.side].bought++;
      else if (p.dir !== t.dir && t.dir === (t.side ? -1 : 1)) rail[t.side].trips++;
    }
    seenT.set(t.id, { dir: t.dir });
  }
  for (const u of G.units) {
    if (!u.riding || seen.has(u.id + ':' + u.riding)) continue;
    seen.add(u.id + ':' + u.riding);
    if (u.homeLine !== undefined) rail[u.side].healed++; else rail[u.side].riders++;
  }
}
function armorReport(side) {
  let shots = 0, mgShots = 0;
  for (const v of armorStats[side].values()) { shots += v.shots; mgShots += v.mgShots; }
  return { bought: armorBought[side], shots, mgShots };
}
const peak = [0, 0];
let saving = false, want = null, sw = 0, gunShots = 0, foeGunShots = 0, drops = 0, foeDrops = 0;

for (let sec = 0; sec < MAXS && G.running; sec++) {
  const foeCd = G.gun[1].cd, foeSw = G.sw[1].cd;
  tick(1);
  if (SW[G.nation[1]]?.kind === 'drop' && G.sw[1].cd > foeSw) foeDrops++; // enemy drop went on cooldown
  if (G.gun[1].cd > foeCd) foeGunShots++; // enemy gun reload restarted this second

  // take a card when offered, preferring unlocks
  if (G.offer) takeCard(G.offer.ids.find(id => id.startsWith('u_')) || G.offer.ids[0]);

  // railway: repair breaks, lay track while supplies are 3x the cost, buy one train once the track is 2 long
  if (!BOTNORAIL) {
    const noTrain = !G.trains.some(t => t.side === 0);
    saving = false;
    if (G.track[0].broken.size) { if (G.S.supplies >= REPAIR_COST) commands.repairTrackCmd(); }
    else if (trackEnd(0) >= 2 && noTrain && canBuyTrain(0)) { // the first train comes before more track: save for it
      if (G.S.supplies >= TRAINS[G.nation[0]].cost) commands.buyTrainCmd(); else saving = !process.env.NOSAVE;
    } else if (!canLay(0) && G.S.supplies >= 3 * TRACK_COST) commands.layTrackCmd();
  }
  watchRail();
  for (const i of [0, 1]) peak[i] = Math.max(peak[i], G.track[i].end);

  // pick something to buy, then keep trying until it is affordable
  if (!want) want = brain() < 0.45 ? 'rifle' : pref[Math.floor(brain() * pref.length)];
  if (!G.S.unlocked[want] && want !== 'rifle' && want !== 'mg') want = null; // still card-locked
  else if (full(0, want) && G.S.supplies > 300) want = null; // at the cap, pick fresh
  else if (!saving && G.S.supplies >= cost(want)) { if (commands.buyUnit(want)) want = null; }

  // level base upgrades in rotation once supplies are at least twice the next cost
  {
    const low = Math.min(...BASE_ROT.map(i => tier(0, i)));
    const id = BASE_ROT.find(i => tier(0, i) === low);
    const c = nextCost(0, id);
    if (c !== null && G.S.supplies >= c * BASEX) commands.buyBase(id);
  }

  // fire the superweapon on a whim when it is ready
  if (brain() < 0.1 && !swBlock(0) && G.S.supplies >= SW[G.nation[0]].cost) {
    if (SW[G.nation[0]].kind === 'drop') {
      // buy a drop only with supplies to spare, onto the nearest reachable trench
      const L = dropTarget(0);
      if (L >= 0 && G.S.supplies >= 2 * SW[G.nation[0]].cost && commands.startAiming()) {
        G.aim.line = L; G.aim.x = G.LX[L];
        if (commands.confirmAim()) { sw++; drops++; } else G.aim = null;
      }
    } else if (SW[G.nation[0]].kind === 'paris') {
      if (commands.startAiming()) { const ap = aimPoint(0); G.aim.x = ap.x; G.aim.y = ap.y; if (commands.confirmAim()) sw++; }
    } else if (commands.fireSuperweapon()) sw++;
  }

  // fire the HQ gun when it is ready, well funded, and the target is worth the shell
  {
    const gd = GUNS[G.nation[0]];
    if (gd && !gunBlock(0) && G.S.supplies >= 3 * gd.cost) {
      const t = bestTarget(0);
      if (t && t.value >= gd.cost && commands.startGunAim()) {
        G.aim.x = t.x; G.aim.y = t.y;
        if (commands.confirmAim()) gunShots++; else G.aim = null;
      }
    }
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
  kills: G.S.kills, losses: G.S.losses, cards: G.S.cards, sw, gunShots, foeGunShots, drops, foeDrops,
  base: BASE_ROT.map(i => tier(0, i)).join(''), foeBase: BASE_ROT.map(i => tier(1, i)).join(''),
  track: peak[0], trains: rail[0], foeTrack: peak[1], foeTrains: rail[1],
  armor: armorReport(0), foeArmor: armorReport(1),
  forts: G.fort.join(''), hq: Math.round(G.bases[0].hp) + '/' + Math.round(G.bases[1].hp),
};
if (json) console.log(JSON.stringify(result));
else console.log(me, 'vs', foe, map, 'seed', seed, 'END',
  end ? (end.won ? 'Victory' : 'Defeat') : '(unfinished)',
  (result.time / 60).toFixed(1) + 'm', 'sel', result.sel,
  'kills', result.kills, 'losses', result.losses, 'cards', result.cards, 'sw', result.sw,
  'forts', result.forts, 'hq', result.hq);
process.exit(0);
