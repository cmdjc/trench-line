// Combat — damage model. Verbatim port of prototype lines 762–797:
// hurt, HQG, accVs, die, hurtBase and the effect pushers puff/boom/tracer.
// stepUnits (799–987) arrives in its own module (Task 9).

import { COV, ARM, NESTCOV, FORTD, FORTA } from '../data/units.js';
import { G, isDbl, toast } from './state.js';
import { isTrench } from './geometry.js';

export function hurt(e, dmg, atk, attacker, cov, area) {
  if (e.hp <= 0) return;
  /* troops sheltering in a bunker can't be hurt until it falls: direct fire hits the bunker instead, and splash only reaches the bunker itself */
  if (e.shelter && e.shelter.hp > 0 && e.settled) { if (!area) hurt(e.shelter, dmg, atk, attacker, cov); return; }
  let mult = 1;
  if (e.T.nest) mult = (e.T.ncov || NESTCOV)[atk];
  else if (e.T.soft) mult = 0.6;
  else if (e.T.armor) mult = ARM[atk] * (e.T.thin && ARM[atk] < 0.5 ? 2 : 1);
  else if (e.settled) {
    if (isTrench(e.line)) { if (atk !== 'raider' && !(attacker && attacker.settled && attacker.line === e.line)) mult = (cov || COV[atk]) * G.M[e.side].cover * FORTD[G.fort[e.line]] * (isDbl(e.line) ? 0.55 : 1); }
    else if (e.line === (e.side ? G.HQI : 0)) mult = 0.5;
  }
  if (e.T.shield && (atk === 'rifle' || atk === 'mg' || atk === 'sniper' || atk === 'base')) mult *= e.T.shield;
  e.hp -= dmg * mult;
  if (e.hp <= 0) die(e);
}

/* static stand-in used when a base fires: it is nobody's unit */
export const HQG = { type: 'base', settled: false, line: -1 };

/* fortified trenches are harder to hit */
export function accVs(u, e) {
  return (e.settled && !e.T.armor && !e.T.nest && isTrench(e.line) && G.fort[e.line] && u.type !== 'raider' && !(u.settled && u.line === e.line)) ? FORTA[G.fort[e.line]] : 1;
}

export function die(e) {
  const c = e.T.cost;
  if (e.side === 1) {
    const g = c * 0.25 * G.M[0].bounty;
    G.S.kills++; G.S.score += Math.min(3, c / 20); G.S.cardKills += Math.min(3, c / 20); G.S.supplies += g;
    G.floats.push({ x: e.x, y: e.y - 8, txt: '+' + Math.round(g), life: 1 }); if (G.floats.length > 30) G.floats.shift();
    if (G.S.cardKills >= G.S.need) { G.S.cardKills -= G.S.need; G.S.need += 3; G.S.pending++; }
  } else { G.S.losses++; G.ai.money += c * 0.25; }
  if (e.T.armor) {
    boom(e.x, e.y, e.T.big ? 44 : 24);
    G.wrecks.push({ x: e.x, y: e.y, side: e.side, nat: e.type === 'tsar' ? 'tsar' : G.nation[e.side] === 'ru' ? 'fr' : G.nation[e.side], t: 0, puff: 0, d: e.T.draw ? { L: e.T.draw.L, W: e.T.draw.W } : null });
    if (G.wrecks.length > 10) G.wrecks.shift();
  }
  G.scorch.push({ x: e.x, y: e.y, r: e.T.big ? 40 : e.T.armor ? 20 : 4.5 }); if (G.scorch.length > 70) G.scorch.shift();
}

export function hurtBase(side, dmg) {
  const b = G.bases[side]; b.hp = Math.max(0, b.hp - dmg);
  if (side === 0 && G.S.t > G.S.warnT) { G.S.warnT = G.S.t + 12; toast('Your HQ is under fire.'); }
}

export function puff(x, y, dark) { G.smoke.push({ x, y, r: dark ? 3 : 2, life: dark ? 1.6 : 1.1, max: dark ? 1.6 : 1.1, dark }); if (G.smoke.length > 160) G.smoke.shift(); }
export function boom(x, y, r) { G.booms.push({ x, y, r, life: 0.45, max: 0.45 }); if (G.booms.length > 30) G.booms.shift(); }
export function tracer(x1, y1, x2, y2, w, col) { G.tracers.push({ x1, y1, x2, y2, w, col, life: 0.08 }); if (G.tracers.length > 90) G.tracers.shift(); }
