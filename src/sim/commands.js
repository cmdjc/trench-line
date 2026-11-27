// Player orders: every button handler body from the prototype (1351–1380,
// 1402–1407, 1502–1518) as sim commands. Each returns success; purchases
// charge exactly once and rejections never charge. The UI layer calls these
// and owns camera focus, buttons and overlays.

import { bus } from '../core/events.js';
import { SW } from '../data/superweapons.js';
import { NAT } from '../data/nations.js';
import { G, toast, nestCost, lineName } from './state.js';
import { isTrench, spawn, cost, full, frontLine } from './geometry.js';
import { canDef, buildDef, buildNest, fortifyAt } from './fortify.js';
import { tier, raise, nextCost } from './base.js';
import { BASE } from '../data/base.js';
import { GUNS } from '../data/guns.js';
import { fireGun, gunBlock, clampAim } from './gun.js';
import { validDrop } from './drop.js';
import { swBlock, useSW, swCost } from './superweapons.js';

import { TRAINS, ARMOR_TRAINS } from '../data/rail.js';
import { canLay, layTrack, buyTrain, buyArmor, canBuyTrain, repairTrack, TRACK_COST, REPAIR_COST } from './rail.js';

export { fortifyAt };

export function select(L) {
  if (!G.running) return false;
  if (L > Math.max(1, frontLine()) && L > G.sel) { toast('You can only select lines your troops have reached.'); return false; }
  G.sel = L; bus.emit('hud'); return true;
}

export function advance() {
  if (!G.running || G.sel >= G.HQI) return false;
  let n = 0;
  for (const u of G.units) if (u.side === 0 && u.line === G.sel && !u.fixed) { u.line = G.sel + 1; n++; }
  if (!n) { toast('No troops here to send forward.'); return false; }
  G.sel++; bus.emit('hud'); return true;
}

export function fallback() {
  if (!G.running || G.sel <= 0) return false;
  for (const u of G.units) if (u.side === 0 && u.line === G.sel && !u.fixed) u.line = G.sel - 1;
  G.sel--; bus.emit('hud'); return true;
}

export function gather() {
  if (!G.running) return false;
  let n = 0;
  for (const u of G.units) if (u.side === 0 && u.line < G.sel && !u.fixed) { u.line = G.sel; n++; }
  toast(n ? n + ' troops called up to ' + lineName(G.sel) + '.' : 'No troops behind this line.');
  bus.emit('hud'); return n > 0;
}

export function buyUnit(k) {
  const c = cost(k);
  if (!G.running || !G.S.unlocked[k] || G.S.supplies < c || full(0, k)) return false;
  G.S.supplies -= c; spawn(0, k, G.sel); bus.emit('hud'); return true;
}

export function buildNestAt(L) {
  if (!G.running || !isTrench(L) || G.owner[L] !== 0 || G.S.supplies < nestCost(0)) return false;
  if (!buildNest(0, L)) { toast('No room for another emplacement at trench ' + L + '.'); return false; }
  G.S.supplies -= nestCost(0);
  toast('A sapper is carrying sandbags to trench ' + L + '. The gun team follows.');
  bus.emit('hud'); return true;
}

export function buildDefAt(L) {
  const d = NAT[G.nation[0]].def;
  if (!G.running || !d || !isTrench(L) || G.owner[L] !== 0 || G.S.supplies < d.cost || !canDef(0, L)) return false;
  if (!buildDef(0, L)) return false;
  G.S.supplies -= d.cost;
  toast(d.kind === 'wire' ? 'Wire laid in front of trench ' + L + '. It slows enemy infantry until a tank or shellfire clears it.'
    : d.kind === 'mines' ? 'Mines laid in front of trench ' + L + '. The enemy cannot see them.'
    : d.kind === 'depot' ? 'Sappers are carrying stores to trench ' + L + ' to set up a supply depot.'
    : d.kind === 'bunker' ? 'Sappers are building a bunker at trench ' + L + '.'
    : d.kind === 'workshop' ? 'Sappers are carrying tools to trench ' + L + ' to set up a repair workshop.'
    : 'A sapper is carrying sandbags to trench ' + L + '. The gun follows.');
  bus.emit('hud'); return true;
}

/* superweapon: paris starts an aim; confirm fires it (prototype swBtn 1502–1518) */
export function startAiming() {
  const d = SW[G.nation[0]];
  if (!G.running || !d || (d.kind !== 'paris' && d.kind !== 'drop') || swBlock(0)) return false;
  if (d.kind === 'drop') {
    G.aim = { kind: 'drop', x: null, y: null, line: -1 };
    toast('Tap a highlighted trench to choose the drop zone, then press Confirm.');
    bus.emit('hud'); return true;
  }
  G.aim = { kind: 'paris', x: null, y: null };
  toast('Tap the field to place the target, then press Confirm. Drag to look around.');
  bus.emit('hud'); return true;
}

export function startGunAim() {
  if (!G.running) return false;
  G.aim = { kind: 'gun', x: null, y: null };
  toast('Tap the field to place the target, then press Confirm. Drag to look around.');
  bus.emit('hud'); return true;
}

export function confirmAim() {
  if (G.aim && G.aim.kind === 'gun') {
    const g = GUNS[G.nation[0]];
    if (!G.running || !g || G.aim.x === null || gunBlock(0) || G.S.supplies < g.cost) return false;
    if (!fireGun(0, clampAim(0, G.aim.x), G.aim.y)) return false;
    G.S.supplies -= g.cost; G.aim = null;
    toast(g.name + ' fired.');
    bus.emit('hud'); return true;
  }
  const d = SW[G.nation[0]];
  if (!G.running || !d || !G.aim) return false;
  if (G.aim.kind === 'drop') {
    const L = G.aim.line;
    if (d.kind !== 'drop' || !validDrop(0, L) || G.S.supplies < swCost(0) || swBlock(0)) return false;
    if (!useSW(0, { line: L })) return false;
    G.S.supplies -= swCost(0); G.aim = null;
    toast('Paratroopers are jumping over trench ' + L + '.');
    bus.emit('hud'); return true;
  }
  if (G.aim.x === null || G.S.supplies < swCost(0) || swBlock(0)) return false;
  if (!useSW(0, { x: G.aim.x, y: G.aim.y })) return false;
  G.S.supplies -= swCost(0); G.aim = null;
  toast('The Paris Gun has fired. The shell lands in 4 seconds.');
  bus.emit('hud'); return true;
}

export function cancelAim() { G.aim = null; bus.emit('hud'); }

export function fireSuperweapon() {
  const d = SW[G.nation[0]];
  if (!G.running || !d || d.kind === 'paris' || d.kind === 'drop') return false;
  if (G.S.supplies < swCost(0) || !useSW(0)) return false;
  G.S.supplies -= swCost(0);
  toast(d.kind === 'mine' ? 'Tunnellers are digging toward trench ' + G.sw[0].tunnel.line + '.'
    : d.kind === 'char2c' ? 'A Char 2C is rolling out of your HQ.'
    : d.kind === 'tsar' ? 'A Tsar Tank is rolling out of your HQ.'
    : d.kind === 'colossus' ? 'The Southern Colossus is rolling out of your HQ.'
    : d.kind === 'ruebezahl' ? 'Rübezahl is striding out of your HQ.'
    : d.kind === 'caproni' ? 'A Caproni bomber is on its way.'
    : 'The 42 cm battery has fired.');
  bus.emit('hud'); return true;
}

export function buyBase(id) {
  if (!['walls', 'depot', 'hosp', 'nat'].includes(id)) return false;
  const c = nextCost(0, id);
  if (!G.running || c === null || G.S.supplies < c) return false;
  G.S.supplies -= c; raise(0, id);
  toast(BASE[id === 'nat' ? G.nation[0] : id].name + ' raised to tier ' + tier(0, id) + '.');
  bus.emit('hud'); return true;
}

export function layTrackCmd() {
  if (!G.running) return false;
  const why = canLay(0);
  if (why) { toast(why); return false; }
  if (G.S.supplies < TRACK_COST) return false;
  G.S.supplies -= TRACK_COST; layTrack(0);
  toast('Track laid to trench ' + G.track[0].end + '.');
  bus.emit('hud'); return true;
}

export function buyTrainCmd() {
  if (!G.running || !canBuyTrain(0)) return false;
  const T = TRAINS[G.nation[0]];
  if (G.S.supplies < T.cost) return false;
  G.S.supplies -= T.cost; buyTrain(0);
  toast(T.name + ' is running.');
  bus.emit('hud'); return true;
}

export function buyArmorCmd() {
  if (!G.running || !canBuyTrain(0)) return false;
  const A = ARMOR_TRAINS[G.nation[0]];
  if (G.S.supplies < A.cost) return false;
  G.S.supplies -= A.cost; buyArmor(0);
  toast(A.name + ' is moving up to the end of the track.');
  bus.emit('hud'); return true;
}

export function repairTrackCmd() {
  if (!G.running || !G.track[0].broken.size || G.S.supplies < REPAIR_COST) return false;
  const at = Math.min(...G.track[0].broken);
  G.S.supplies -= REPAIR_COST; repairTrack(0);
  toast('Track repaired at trench ' + at + '.');
  bus.emit('hud'); return true;
}
