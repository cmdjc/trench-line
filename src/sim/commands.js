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
import { swBlock, useSW } from './superweapons.js';

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
    : 'A sapper is carrying sandbags to trench ' + L + '. The gun follows.');
  bus.emit('hud'); return true;
}

/* superweapon: paris starts an aim; confirm fires it (prototype swBtn 1502–1518) */
export function startAiming() {
  const d = SW[G.nation[0]];
  if (!G.running || !d || d.kind !== 'paris' || swBlock(0)) return false;
  G.aim = { x: null, y: null };
  toast('Tap the field to place the target, then press Confirm. Drag to look around.');
  bus.emit('hud'); return true;
}

export function confirmAim() {
  const d = SW[G.nation[0]];
  if (!G.running || !d || !G.aim) return false;
  if (G.aim.x === null || G.S.supplies < d.cost || swBlock(0)) return false;
  if (!useSW(0, { x: G.aim.x, y: G.aim.y })) return false;
  G.S.supplies -= d.cost; G.aim = null;
  toast('The Paris Gun has fired. The shell lands in 4 seconds.');
  bus.emit('hud'); return true;
}

export function cancelAim() { G.aim = null; bus.emit('hud'); }

export function fireSuperweapon() {
  const d = SW[G.nation[0]];
  if (!G.running || !d || d.kind === 'paris') return false;
  if (G.S.supplies < d.cost || !useSW(0)) return false;
  G.S.supplies -= d.cost;
  toast(d.kind === 'mine' ? 'Tunnellers are digging toward trench ' + G.sw[0].tunnel.line + '.'
    : d.kind === 'char2c' ? 'A Char 2C is rolling out of your HQ.'
    : d.kind === 'tsar' ? 'A Tsar Tank is rolling out of your HQ.'
    : d.kind === 'colossus' ? 'The Southern Colossus is rolling out of your HQ.'
    : d.kind === 'bugs' ? 'Kettering Bugs are in the air.'
    : d.kind === 'caproni' ? 'A Caproni bomber is on its way.'
    : 'The 42 cm battery has fired.');
  bus.emit('hud'); return true;
}

export function buyBase(id) {
  const c = nextCost(0, id);
  if (!G.running || c === null || G.S.supplies < c) return false;
  G.S.supplies -= c; raise(0, id);
  toast(BASE[id === 'nat' ? G.nation[0] : id].name + ' raised to tier ' + tier(0, id) + '.');
  bus.emit('hud'); return true;
}
