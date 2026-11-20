// Fortifying and MG nests (prototype lines 989–1110). Math.random() calls in
// the original (mine placement, bunker slot jitter) use the seeded rng so
// battles replay identically.

import { SLOTS, SLOTS5, WH, FORT_COST, maxFort, SPECIAL, BUNKER_CAP, BUNKER_MAX } from '../data/units.js';
import { NAT } from '../data/nations.js';
import { G, isDbl, toast } from './state.js';
import { isTrench, spawn, exposed } from './geometry.js';
import { hurt, boom } from './combat.js';
import { rng } from '../core/rng.js';
import { bus } from '../core/events.js';

export function freeSlot(L) {
  const SL = isDbl(L) ? SLOTS5 : SLOTS;
  for (let i = 0; i < SL.length; i++) {
    let used = false;
    for (const u of G.units) if (u.T.nest && u.line === L && u.slot === i) used = true;
    for (const j of G.jobs) if (j.line === L && j.slot === i) used = true;
    if (!used) return i;
  }
  return -1;
}

export function wireSlow(u) {
  for (const f of G.fields) {
    if (f.type !== 'wire' || f.side === u.side || Math.abs(u.x - f.x) > f.w / 2) continue;
    if (u.T.armor) { f.hp = 0; continue; }
    return 0.3;
  }
  return 1;
}

export function stepFields() {
  if (!G.fields.length) return;
  for (const f of G.fields) {
    if (f.type !== 'mines') continue;
    for (const mn of f.mines) {
      if (!mn.live) continue;
      let hit = false;
      for (const u of G.units) if (u.side !== f.side && u.hp > 0 && Math.abs(u.x - mn.x) < 13 && Math.abs(u.y - mn.y) < 13) { hit = true; break; }
      if (!hit) continue;
      mn.live = false; boom(mn.x, mn.y, 22);
      for (const e of G.units) if (e.side !== f.side && e.hp > 0 && Math.hypot(e.x - mn.x, e.y - mn.y) <= 28) hurt(e, 60, 'barrage', null, undefined, true);
    }
  }
  G.fields = G.fields.filter(f => f.type === 'wire' ? f.hp > 0 : f.mines.some(m => m.live));
}

export function bunkerCount(side, L) {
  let n = 0;
  for (const u of G.units) if (u.T.bunker && u.side === side && u.line === L && u.hp > 0) n++;
  for (const j of G.jobs) if (j.make === 'bunker' && j.side === side && j.line === L) n++;
  return n;
}

/* troops that have settled in a trench walk into its bunkers, up to six each */
export function stepBunkers() {
  for (const u of G.units) if (u.shelter) {
    const b = u.shelter;
    if (b.hp <= 0 || b.side !== u.side || b.line !== u.line || u.T.armor) { u.shelter = null; u.tx = undefined; if (u.ly0 !== undefined) u.ly = u.ly0; }
  }
  for (const b of G.units) {
    if (!b.T.bunker || b.hp <= 0) continue;
    let occ = 0; for (const u of G.units) if (u.shelter === b) occ++;
    for (const u of G.units) {
      if (occ >= BUNKER_CAP) break;
      if (u.shelter || u.side !== b.side || u.line !== b.line || u.T.armor || u.T.nest || u.fixed || !u.settled || exposed(u) || u.hp <= 0) continue;
      u.shelter = b; u.ly0 = u.ly === undefined ? u.y : u.ly; u.tx = b.x; u.ly = b.y + (rng.float() - 0.5) * 14; occ++;
    }
    b.occ = occ;
  }
}

export function canDef(side, L) {
  const d = NAT[G.nation[side]].def; if (!d || !isTrench(L)) return false;
  if (d.kind === 'bunker') return freeSlot(L) >= 0 && bunkerCount(side, L) < BUNKER_MAX;
  if (d.kind === 'pit') return freeSlot(L) >= 0;
  if (d.kind === 'depot') return freeSlot(L) >= 0 && !G.units.some(u => u.T.depot && u.line === L) && !G.jobs.some(j => j.make === 'depot' && j.line === L);
  return !G.fields.some(f => f.side === side && f.line === L);
}

export function buildDef(side, L) {
  const d = NAT[G.nation[side]].def, dir = side ? -1 : 1;
  if (d.kind === 'bunker') return buildNest(side, L, 'bunker');
  if (d.kind === 'pit') return buildNest(side, L, d.make || 'pit75');
  if (d.kind === 'depot') return buildNest(side, L, 'depot');
  if (d.kind === 'wire') G.fields.push({ type: 'wire', side, line: L, x: G.LX[L] + dir * 54, w: 46, hp: 140 });
  else {
    const mines = [];
    for (let i = 0; i < 10; i++) mines.push({ x: G.LX[L] + dir * (40 + rng.float() * 40), y: 16 + (i + rng.float()) * (WH - 32) / 10, live: true });
    G.fields.push({ type: 'mines', side, line: L, x: G.LX[L] + dir * 60, w: 46, mines });
  }
  return true;
}

/* the super trench's built-in guns appear for whoever takes it first */
export function buildSuper(side) {
  const dir = side ? -1 : 1;
  ['pillbox', 'pit75', 'pillbox'].forEach((make, i) => {
    const n = spawn(side, make, G.SUPER, true);
    n.x = n.tx = G.LX[G.SUPER] - dir * 30; n.y = WH * SLOTS[i]; n.fixed = true; n.slot = i; n.hp *= 1.6; n.max = n.hp;
  });
}

export function buildNest(side, L, make) {
  const sl = freeSlot(L); if (sl < 0) return false;
  const dir = side ? -1 : 1, x = G.LX[L] - dir * (isDbl(L) ? 48 : 30), y = WH * (isDbl(L) ? SLOTS5 : SLOTS)[sl];
  const sap = spawn(side, 'carrier', L); sap.y = y; sap.tx = x - dir * 7; sap.fixed = true; sap.carry = 'bags';
  G.jobs.push({ side, line: L, slot: sl, x, y, stage: 0, t: 0, t2: 0, sap, gun: null, make: make || NAT[G.nation[side]].nest });
  return true;
}

export function stepJobs(dt) {
  if (!G.jobs.length) return;
  for (const j of G.jobs) {
    j.t += dt;
    if (!j.gun && j.t > 4) { const g = spawn(j.side, 'guncarrier', j.line); g.y = j.y + 5; g.tx = j.x - (j.side ? -1 : 1) * 3; g.fixed = true; g.carry = 'gun'; j.gun = g; }
    if (j.sap.hp <= 0 || (j.gun && j.gun.hp <= 0)) {
      j.done = true; j.sap.hp = 0; if (j.gun) j.gun.hp = 0;
      if (j.side === 0) toast('The crew building at trench ' + j.line + ' was killed. The work is abandoned.');
      continue;
    }
    if (j.stage === 0) { if (j.sap.settled) j.stage = 1; }
    else if (j.stage === 1) { j.t2 += dt; if (j.t2 >= 3) j.stage = 2; }
    else if (j.gun && j.gun.settled) {
      j.sap.hp = 0; j.gun.hp = 0;
      const n = spawn(j.side, j.make, j.line, true); n.x = n.tx = j.x; n.y = j.y; n.fixed = true; n.slot = j.slot;
      j.done = true; if (j.side === 0) toast(SPECIAL[j.make].name + ' ready at trench ' + j.line + '.');
    }
  }
  G.jobs = G.jobs.filter(j => !j.done);
  G.units = G.units.filter(u => u.hp > 0);
}

export function fortifyAt(L) {
  if (!G.running || !isTrench(L)) return;
  if (G.owner[L] !== 0) { toast('You can only fortify a trench you hold.'); return; }
  if (G.fort[L] >= maxFort(L === G.SUPER)) { toast('Trench ' + L + ' is fully fortified.'); return; }
  const c = FORT_COST[G.fort[L]];
  if (G.S.supplies < c) { toast('Fortifying trench ' + L + ' to level ' + (G.fort[L] + 1) + ' needs ' + c + ' supplies.'); return; }
  G.S.supplies -= c; G.fort[L]++; toast('Trench ' + L + ' fortified to level ' + G.fort[L] + '.');
  bus.emit('dirty:map'); bus.emit('hud');
}
