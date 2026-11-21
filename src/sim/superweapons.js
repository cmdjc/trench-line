// Superweapons: aiming, gating, firing, mines, planes (prototype lines 1112–1196).
// useSW never deducts the cost — callers (commands.js / AI) own the purse.

import { SW } from '../data/superweapons.js';
import { WH } from '../data/units.js';
import { G, lineName, toast } from './state.js';
import { isTrench, spawn } from './geometry.js';
import { die, boom } from './combat.js';
import { dropTarget, validDrop, spawnDrop } from './drop.js';
import { DROP_RANGE } from '../data/drop.js';
import { rng } from '../core/rng.js';
import { tier } from './base.js';
import { TUNNEL_T, MINE_COST, MINE_R, MINE_TANK, MINE_NEST, PARIS_CD, PARIS_DMG, PARIS_SPLASH, PARIS_GAP, DOCK_CD, DOCK_HP, DOCK_DMG, DOCK_SCALE } from '../data/base.js';

export function targetFor(side) {
  if (side === 0) {
    for (let L = G.sel + 1; L <= G.NT; L++) if (G.units.some(u => u.side === 1 && u.line === L && u.settled && !(u.fall > 0))) return L;
    return G.HQI;
  }
  for (let L = G.ai.F - 1; L >= 1; L--) if (G.units.some(u => u.side === 0 && u.line === L && u.settled && !(u.fall > 0))) return L;
  return 0;
}

/* Where the enemy commander aims the Paris Gun: the richest cluster of your units, else your HQ. */
export function aimPoint(side) {
  const foe = 1 - side; let best = null, bs = 0;
  for (const c of G.units) {
    if (c.side !== foe || c.hp <= 0 || c.riding) continue;
    let sc = 0; for (const e of G.units) if (e.side === foe && e.hp > 0 && !e.riding && Math.hypot(e.x - c.x, e.y - c.y) < 85) sc += e.T.cost;
    if (sc > bs) { bs = sc; best = c; }
  }
  return best ? { x: best.x, y: best.y } : { x: G.bases[foe].x, y: WH / 2 };
}

/* Supplies a superweapon costs this side: the nation's price, less the gb tunnellers' discount. */
export function swCost(side) {
  const n = G.nation[side], d = SW[n]; if (!d) return 0;
  return n === 'gb' && tier(side, 'nat') >= 1 ? Math.round(d.cost * MINE_COST) : d.cost;
}

export function swBlock(side) {
  const d = SW[G.nation[side]], st = G.sw[side];
  if (!d) return 'none';
  if (st.tunnel) return 'Tunnelling under trench ' + st.tunnel.line + ': ' + Math.ceil(st.tunnel.t) + ' seconds to go.';
  if (st.cd > 0) return 'Ready again in ' + Math.ceil(st.cd) + ' seconds.';
  if (d.kind === 'mine' && !isTrench(targetFor(side))) return 'No enemy-held trench ahead of the selected one.';
  if (d.kind === 'drop' && dropTarget(side) < 0) return 'No enemy or empty trench within ' + DROP_RANGE + ' trenches of your front.';
  if (d.kind === 'char2c' && G.units.some(u => u.side === side && u.type === 'char2c')) return 'Already in the field.';
  if (d.kind === 'colossus' && G.units.some(u => u.side === side && u.type === 'colossus')) return 'Already in the field.';
  if (d.kind === 'tsar' && G.units.some(u => u.side === side && u.type === 'tsar')) return 'Already in the field.';
  return '';
}

export function useSW(side, at) {
  const nat = tier(side, 'nat');
  const d = SW[G.nation[side]]; if (!d || swBlock(side)) return false;
  const st = G.sw[side], dir = side ? -1 : 1, own = G.bases[side], foe = G.bases[1 - side], T = targetFor(side), atHQ = !isTrench(T);
  const tx = atHQ ? foe.x - dir * 24 : G.LX[T];
  if (d.kind === 'paris') {
    const a = at || aimPoint(side), x = Math.max(0, Math.min(G.WW, a.x)), y = Math.max(0, Math.min(WH, a.y));
    const shell = { x0: own.x, y0: WH / 2, x1: x, y1: y, t: 0, dur: 4.5, side, type: 'barrage', dmg: nat >= 2 ? PARIS_DMG : 700, splash: nat >= 2 ? PARIS_SPLASH : 90, cov: 0.8, rz: 80, arc: 3.2, big: true, huge: true };
    G.shells.push(shell);
    if (nat >= 3) G.shells.push({ ...shell, t: -PARIS_GAP });
    if (side === 1) { let nl = 1; for (let L = 1; L <= G.NT; L++) if (Math.abs(G.LX[L] - x) < Math.abs(G.LX[nl] - x)) nl = L; toast('The enemy Paris Gun has fired at the area near trench ' + nl + '. Look for the red circle.'); }
  } else if (d.kind === 'mine') {
    st.tunnel = { line: T, t: nat >= 1 ? TUNNEL_T : 25 };
  } else if (d.kind === 'char2c') {
    spawn(side, 'char2c', side ? G.ai.F : G.sel);
    if (side === 1) toast('The enemy has sent out a Char 2C.');
  } else if (d.kind === 'tsar') {
    spawn(side, 'tsar', side ? G.ai.F : G.sel);
    if (side === 1) toast('The enemy has sent out a Tsar Tank.');
  } else if (d.kind === 'colossus') {
    const u = spawn(side, 'colossus', side ? G.ai.F : G.sel);
    if (nat >= 2) { u.hp *= DOCK_HP; u.max *= DOCK_HP; }
    if (nat >= 3) { u.dmgMul = DOCK_DMG; u.scale = DOCK_SCALE; }
    if (side === 1) toast('The enemy has sent out a Southern Colossus.');
  } else if (d.kind === 'drop') {
    const L = at && validDrop(side, at.line) ? at.line : dropTarget(side);
    if (L < 0) return false;
    spawnDrop(side, L);
    if (side === 1) toast('Enemy paratroopers are landing at trench ' + L + '.');
  } else if (d.kind === 'caproni') {
    const vy = 110, y0 = -50;
    G.planes.push({ x: tx, y: y0, vy, side, t: 0, dur: (WH + 100) / vy });
    for (let i = 0; i < 8; i++) { const y = 22 + i * (WH - 44) / 7; G.shells.push({ x0: tx, y0: y, x1: tx + (rng.float() - 0.5) * 14, y1: y, t: -(y - y0) / vy, dur: 0.9, side, type: 'barrage', dmg: atHQ ? 50 : 75, splash: 32, cov: 0.7, arc: 2, base: atHQ }); }
    if (side === 1) toast('Caproni bombers are over ' + lineName(T) + '.');
  } else if (d.kind === 'skoda42') {
    for (let i = 0; i < 3; i++) G.shells.push({ x0: own.x, y0: WH / 2, x1: tx + (rng.float() - 0.5) * 16, y1: 50 + i * 100 + (rng.float() - 0.5) * 40, t: -i * 1.3, dur: 3, side, type: 'barrage', dmg: atHQ ? 120 : 180, splash: 70, cov: 0.85, arc: 3, big: true, raze: true, base: atHQ });
    if (side === 1) toast('42 cm shells are falling on ' + lineName(T) + '.');
  }
  st.cd = d.kind === 'paris' && nat >= 1 ? PARIS_CD : d.kind === 'colossus' && nat >= 1 ? DOCK_CD : d.cd;
  return true;
}

export function detonate(side, L) {
  let any = false;
  const big = G.nation[side] === 'gb' && tier(side, 'nat') >= 2, R = big ? MINE_R : 70;
  for (const e of G.units) {
    if (e.side === side || e.hp <= 0 || e.riding || e.line !== L || Math.abs(e.x - G.LX[L]) > R) continue;
    any = true;
    const d = e.T.armor ? (big ? MINE_TANK : 300) : e.T.nest ? (big ? MINE_NEST : 400) : 1e6;
    e.hp -= d; if (e.hp <= 0) die(e);
  }
  if (G.owner[L] !== side) { G.fort[L] = 0; G.fields = G.fields.filter(f => f.side === side || f.line !== L); }
  for (let i = 0; i < 8; i++) boom(G.LX[L] + (rng.float() - 0.5) * 26, 18 + i * (WH - 36) / 7, 34 + rng.float() * 14);
  if (!G.reduceMotion) G.shake = 9;
  toast((side === 0 ? 'Your mine has gone up under trench ' : 'A mine has gone up under trench ') + L + (any ? '.' : ', but nobody was in it.'));
}

export function stepSW(dt) {
  for (const p of G.planes) p.t += dt, p.y += p.vy * dt;
  G.planes = G.planes.filter(p => p.t < p.dur);
  for (let sd = 0; sd < 2; sd++) {
    const st = G.sw[sd]; if (st.cd > 0) st.cd -= dt;
    if (st.tunnel) { st.tunnel.t -= dt; if (st.tunnel.t <= 0) { const L = st.tunnel.line; st.tunnel = null; detonate(sd, L); } }
  }
}
