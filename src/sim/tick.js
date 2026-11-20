// Simulation tick (prototype 1552–1573) and end-of-game award (1538–1550,
// with the DOM parts replaced by the `game:end` event).

import { bus } from '../core/events.js';
import { rng } from '../core/rng.js';
import { SUPER_CARD_T } from '../data/units.js';
import { G, incomeNow, lineName, toast } from './state.js';
import { frontLine, countAt } from './geometry.js';
import { stepUnits, puff } from './combat.js';
import { aiStep } from './ai.js';
import { stepBase } from './base.js';
import { stepSW } from './superweapons.js';
import { stepGun } from './gun.js';
import { offerCards, pendingOffer } from './cards.js';
import { awardRun } from './meta.js';

export function endGame(won) {
  G.running = false;
  const earned = awardRun(won, G.S.score);
  bus.emit('game:end', { won, earned, time: G.S.t, kills: G.S.kills, losses: G.S.losses, cards: G.S.cards });
}

export function tick(dt) {
  if (!G.running) return;
  const S = G.S;
  S.t += dt; S.supplies += incomeNow() * dt;
  if (G.SUPER > 0 && G.owner[G.SUPER] === 0) {
    S.superT += dt;
    if (S.superT >= SUPER_CARD_T) { S.superT -= SUPER_CARD_T; S.pending++; toast('The super trench has sent you a free card.'); }
  }
  stepUnits(dt); aiStep(dt); stepBase(dt); stepSW(dt); stepGun(dt);
  for (const a of [G.tracers, G.booms, G.floats]) for (const o of a) o.life -= dt;
  G.tracers = G.tracers.filter(o => o.life > 0); G.booms = G.booms.filter(o => o.life > 0); G.floats = G.floats.filter(o => o.life > 0);
  for (const f of G.floats) f.y -= dt * 22;
  for (const p of G.smoke) { p.life -= dt; p.r += dt * (p.dark ? 7 : 5); p.y -= dt * 9; p.x -= dt * 4; }
  G.smoke = G.smoke.filter(p => p.life > 0);
  for (const w of G.wrecks) {
    w.t += dt;
    if (w.t < 18) { w.puff -= dt; if (w.puff <= 0) { w.puff = 0.22; puff(w.x + (rng.float() - 0.5) * 14, w.y + (rng.float() - 0.5) * 8, true); } }
  }
  const fl = frontLine(); if (G.sel > Math.max(fl, 0) && countAt(0, G.sel) === 0) G.sel = fl;
  if (G.sel > 0 && G.sel < G.HQI) {
    let foes = 0, near = 0; const sx = G.LX[G.sel];
    for (const u of G.units) { if (u.fixed) continue; if (u.side === 1) { if (u.line === G.sel && u.settled) foes++; } else if (Math.abs(u.x - sx) < 260 && u.line >= G.sel) near++; }
    if (foes && !near) {
      for (const u of G.units) if (u.side === 0 && u.line === G.sel && !u.fixed) u.line = G.sel - 1;
      toast('Trench ' + G.sel + ' is lost. Your orders fall back to ' + lineName(G.sel - 1) + '.'); G.sel--;
    }
  }
  if (G.bases[1].hp <= 0) endGame(true);
  else if (G.bases[0].hp <= 0) endGame(false);
  else if (pendingOffer()) offerCards();
}
