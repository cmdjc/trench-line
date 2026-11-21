// Combat — damage model + the per-frame simulation step.
// hurt/HQG/accVs/die/hurtBase/puff/boom/tracer port prototype 762–797;
// stepUnits ports 799–987 (Math.random → seeded rng) and fixes the stray
// miss-tracer quirk (DESIGN.md "Known quirks" #3): the faint tracer is now
// the else-branch of the hit roll, not an unconditional extra.

import { COV, ARM, NESTCOV, FORTD, FORTA, WH, BW, HEDGE, GARR_T, maxFort, SUPER_INC } from '../data/units.js';
import { G, isDbl, toast } from './state.js';
import { isTrench, posX, exposed } from './geometry.js';
import { stepFields, stepBunkers, stepJobs, wireSlow, buildSuper } from './fortify.js';
import { hasTrack, isBigShell, breakAt, cutTrack, segmentIndexFor, hurtTrain } from './rail.js';
import { RAIL_Y } from '../data/rail.js';
import { rng } from '../core/rng.js';
import { DROP_SCRAMBLE, DROP_SCRAMBLE_ACC, FALL_LIFT } from '../data/drop.js';

export function hurt(e, dmg, atk, attacker, cov, area) {
  if (e.train) { hurtTrain(e.train, dmg, atk); return; }
  if (e.hp <= 0) return;
  /* troops sheltering in a bunker can't be hurt until it falls: direct fire hits the bunker instead, and splash only reaches the bunker itself */
  if (e.shelter && e.shelter.hp > 0 && e.settled) { if (!area) hurt(e.shelter, dmg, atk, attacker, cov); return; }
  let mult = 1;
  if (e.T.nest) mult = (e.T.ncov || NESTCOV)[atk];
  else if (e.T.soft) mult = 0.6;
  else if (e.T.armor) mult = ARM[atk] * (e.T.thin && ARM[atk] < 0.5 ? 2 : 1);
  else if (e.settled && !exposed(e)) {
    if (isTrench(e.line)) { if (atk !== 'raider' && !(attacker && attacker.settled && attacker.line === e.line)) mult = (cov || COV[atk]) * G.M[e.side].cover * FORTD[G.fort[e.line]] * (isDbl(e.line) ? 0.55 : 1); }
    else if (e.line === (e.side ? G.HQI : 0)) mult = 0.5;
  }
  if (e.T.shield && (atk === 'rifle' || atk === 'mg' || atk === 'sniper' || atk === 'base')) mult *= e.T.shield;
  e.hp -= dmg * mult;
  if (e.hp <= 0) die(e);
}

/* static stand-in used when a base fires: it is nobody's unit */
export const HQG = { type: 'base', settled: false, line: -1 };

/* fortified trenches are harder to hit, unless the target is a paratrooper still exposed after its drop;
   raider-class fire (stormtroopers, Thompsons) ignores the penalty */
export function accVs(u, e) {
  return (e.settled && !exposed(e) && !e.T.armor && !e.T.nest && isTrench(e.line) && G.fort[e.line] && ((u.T && u.T.atk) || u.type) !== 'raider' && !(u.settled && u.line === e.line)) ? FORTA[G.fort[e.line]] : 1;
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

export function stepUnits(dt) {
  for (const u of G.units) {
    if (u.hp <= 0 || u.riding) continue;
    if (u.waiting) { u.moving = false; continue; } // standing at the HQ for a train: holds fire, can still be shot
    const T = u.T, m = G.M[u.side], minR = T.min || 0, falling = u.fall > 0;
    if (falling) { u.fall -= dt; if (u.fall <= 0) u.scramble = DROP_SCRAMBLE; }
    else if (u.scramble > 0) u.scramble -= dt;
    const sacc = u.scramble > 0 ? DROP_SCRAMBLE_ACC : 1;
    let best = null, bd = 1e9, blocked = false;
    for (const e of G.units) {
      if (e.side === u.side || e.hp <= 0 || e.riding) continue;
      const dx = e.x - u.x, d = Math.hypot(dx, e.y - u.y);
      if (d < bd && d >= minR) { bd = d; best = e; }
      if (Math.abs(dx) < 40 && !(e.settled && e.line === u.line)) blocked = true;
      if (T.crush && d < T.crush) hurt(e, T.crushDps * dt * (u.dmgMul || 1), 'raider', null, undefined, true);
    }
    if (G.trains.length) {
      /* enemy trains are targets too, only if nearer than the best unit target; no rng here */
      for (const tr of G.trains) {
        if (tr.side === u.side || tr.hp <= 0) continue;
        const d = Math.hypot(tr.x - u.x, RAIL_Y - u.y);
        if (d < bd && d >= minR && d <= T.range) { bd = d; best = { x: tr.x, y: RAIL_Y, hp: tr.hp, settled: false, T: {}, train: tr }; }
      }
    }
    if (T.crush) blocked = false;
    if (u.ly === undefined) u.ly = u.y;
    const tx = u.tx !== undefined ? u.tx : posX(u.side, u.line, u.ly, u.park), dx = tx - u.x, sgn = Math.sign(dx);
    let ty = u.ly, limX = null;
    if (G.RIV.length && !T.big) {
      for (let i = 0; i < G.RIV.length; i++) {
        const r = G.RIV[sgn < 0 ? G.RIV.length - 1 - i : i];
        const inside = u.x > r.x0 - 3 && u.x < r.x1 + 3;
        const ahead = sgn > 0 ? (u.x <= r.x0 - 3 && tx > r.x0) : sgn < 0 ? (u.x >= r.x1 + 3 && tx < r.x1) : false;
        if (!inside && !ahead) continue;
        let by = r.b[0]; for (const b of r.b) if (Math.abs(b - u.y) < Math.abs(by - u.y)) by = b;
        const band = Math.max(by - BW, Math.min(by + BW, u.y));
        if (inside) ty = band;
        else {
          const gap = sgn > 0 ? r.x0 - u.x : u.x - r.x1;
          if (gap < 170) ty = band;
          if (Math.abs(u.y - band) > 1.2) limX = sgn > 0 ? r.x0 - 7 : r.x1 + 7;
        }
        break;
      }
    }
    const dy = ty - u.y;
    if (falling) u.moving = false;
    else if ((Math.abs(dx) > 1.5 || Math.abs(dy) > 1.5) && !blocked) {
      const sp = T.speed * (T.armor ? 1 : m.speed) * dt * wireSlow(u);
      let nx = u.x + sgn * Math.min(sp, Math.abs(dx));
      if (limX !== null) nx = sgn > 0 ? Math.min(nx, Math.max(u.x, limX)) : Math.max(nx, Math.min(u.x, limX));
      /* hedgehogs: an enemy-held double trench stops tanks short of its belt (giants roll over) */
      if (T.armor && !T.big && sgn) for (const L of G.DBL) {
        if (G.owner[L] !== 1 - u.side) continue;
        const stop = G.LX[L] - sgn * (HEDGE + (T.len || 21) + 8);
        if (sgn > 0 ? (u.x <= stop + 0.5 && tx > stop) : (u.x >= stop - 0.5 && tx < stop)) {
          const c = sgn > 0 ? Math.min(nx, stop) : Math.max(nx, stop);
          if (c !== nx && u.side === 0 && G.S.t > (G.S.hhT || 0)) { G.S.hhT = G.S.t + 25; toast('Hedgehogs are holding your tanks at super trench ' + L + '. They can pass once your infantry take it.'); }
          nx = c;
        }
      }
      const still = Math.abs(nx - u.x) < 0.001 && Math.abs(dy) <= 1.5;
      u.tread += Math.abs(nx - u.x) * (sgn === (u.side ? -1 : 1) ? 1 : -1);
      u.x = nx; u.y += Math.max(-sp, Math.min(sp, dy));
      u.settled = false; u.moving = !still; if (!still) u.walk += dt * 10;
    } else {
      u.moving = false;
      if (Math.abs(dx) <= 1.5 && Math.abs(dy) <= 1.5) { u.x = tx; u.settled = true; }
    }
    if (u.settled && m.heal && isTrench(u.line) && u.hp < u.max && !exposed(u)) u.hp = Math.min(u.max, u.hp + m.heal * dt);
    u.cd -= dt; u.flash -= dt;
    const dir = u.side ? -1 : 1;
    if (T.armor) {
      u.puff -= dt;
      if (u.puff <= 0 && !T.soft) {
        const hurtBad = u.hp < u.max * 0.33;
        u.puff = hurtBad ? 0.1 : u.moving ? 0.16 : 0.5;
        puff(u.x - dir * (hurtBad ? 4 : (T.len || 21)) + (rng.float() - 0.5) * 4, u.y + (rng.float() - 0.5) * 8, hurtBad);
      }
      if (T.mg) {
        u.cd2 -= dt; u.flash2 -= dt;
        if (u.cd2 <= 0 && best && bd <= T.mg.range) {
          u.cd2 = T.mg.cd * (0.8 + rng.float() * 0.4); u.flash2 = 0.07;
          const sy = best.y < u.y ? -(T.big ? 20 : 13) : (T.big ? 20 : 13);
          if (rng.float() < T.mg.acc * accVs(u, best)) { tracer(u.x, u.y + sy, best.x, best.y, 1, '#ffd76a'); hurt(best, T.mg.dmg * (u.dmgMul || 1), 'mg', u); }
          else tracer(u.x, u.y + sy, best.x + (rng.float() - 0.5) * 30, best.y + (rng.float() - 0.5) * 30, 0.8, 'rgba(255,215,106,.6)');
        }
      }
    }
    if (u.cd > 0 || T.noFire || (falling && !T.fallFire) || (u.moving && !T.moveFire)) continue;
    const dmg = T.dmg * m.dmg[u.type] * (u.dmgMul || 1);
    let ox = u.x, oy = u.y;
    const fy = falling ? Math.max(0, u.fall) * FALL_LIFT : 0; // falling men are drawn this far up the screen
    if (T.armor) {
      const hit = best && bd <= T.range, gx = hit ? best.x : G.bases[1 - u.side].x, gy = hit ? best.y : WH / 2;
      u.gun = -u.gun;
      if (T.turret) { u.aim = Math.atan2(gy - u.y, (gx - u.x) * dir); ox = u.x + dir * (T.turret.x + Math.cos(u.aim) * T.turret.len); oy = u.y + Math.sin(u.aim) * T.turret.len; }
      else if (T.spons) { ox = u.x + dir * T.spons[0]; oy = u.y + u.gun * T.spons[1]; }
      else ox = u.x + dir * 31;
    }
    if (best && bd <= T.range) {
      u.cd = T.cd * m.cd[u.type] * (0.85 + rng.range(0, 0.3)); u.flash = 0.08;
      if (T.shell) G.shells.push({ x0: ox, y0: oy, x1: best.x, y1: best.y, t: 0, dur: T.shell, side: u.side, type: T.atk || u.type, dmg, splash: T.splash, cov: T.cov, siege: T.siege, arc: T.arc || (u.type === 'mortar' && !T.flat ? 1 : 0.1) });
      else if (rng.float() < T.acc * sacc * accVs(u, best)) { tracer(u.x + dir * 9, u.y - fy, best.x, best.y, u.type === 'sniper' ? 1.4 : 1, '#ffe9a8'); hurt(best, dmg, T.atk || u.type, u); }
      else tracer(u.x + dir * 9, u.y - fy, best.x + (rng.float() - 0.5) * 30, best.y + (rng.float() - 0.5) * 30, 0.8, 'rgba(255,233,168,.6)');
      if (T.jam && rng.float() < T.jam) u.cd = 2.4;
      if (T.mag) { u.shots = (u.shots || 0) + 1; if (u.shots >= T.mag) { u.shots = 0; u.cd = T.reload; } }
    } else {
      const b = G.bases[1 - u.side], d = Math.abs(b.x - u.x);
      if (d <= T.range && d >= minR) {
        u.cd = T.cd * m.cd[u.type] * (0.85 + rng.range(0, 0.3)); u.flash = 0.08;
        const by = WH / 2 + (rng.float() - 0.5) * 70;
        if (T.shell) G.shells.push({ x0: ox, y0: oy, x1: b.x - dir * 20, y1: by, t: 0, dur: T.shell, side: u.side, type: T.atk || u.type, dmg: dmg * 1.5, base: true, siege: T.siege, arc: T.arc || (u.type === 'mortar' && !T.flat ? 1 : 0.1) });
        else { tracer(u.x + dir * 9, u.y - fy, b.x - dir * 25, by, 1, '#ffe9a8'); hurtBase(1 - u.side, dmg * (u.type !== 'raider' && d > 120 ? 0.25 : 1)); }
      }
    }
  }
  // HQ guns
  for (let s = 0; s < 2; s++) {
    const b = G.bases[s]; b.cd -= dt; if (b.cd > 0 || b.hp <= 0) continue;
    let best = null, bd = 270;
    for (const e of G.units) { if (e.side === s || e.hp <= 0 || e.riding) continue; const d = Math.abs(e.x - b.x); if (d < bd) { bd = d; best = e; } }
    if (best) {
      b.cd = 0.25; const dir = s ? -1 : 1;
      if (rng.float() < 0.55 * accVs(HQG, best)) { tracer(b.x + dir * 22, WH / 2 + (rng.float() - 0.5) * 50, best.x, best.y, 1, '#ffd76a'); hurt(best, 9 * b.dmg, 'base', null); }
    }
  }
  // shells
  for (const s of G.shells) {
    s.t += dt; if (s.t < s.dur) continue;
    if (hasTrack() && isBigShell(s)) breakAt(s.x1, s.y1, s.splash, s);
    if (s.huge) {
      for (let i = 0; i < 9; i++) { const a = i * 0.7 + rng.float(), r = i ? rng.float() * s.splash * 0.8 : 0; boom(s.x1 + Math.cos(a) * r, s.y1 + Math.sin(a) * r, 34 + rng.float() * 26); }
      if (!G.reduceMotion) G.shake = Math.max(G.shake, 10);
      G.scorch.push({ x: s.x1, y: s.y1, r: s.splash * 0.7 }); if (G.scorch.length > 70) G.scorch.shift();
      for (let L = 1; L <= G.NT; L++) if (Math.abs(s.x1 - G.LX[L]) < s.rz && G.owner[L] !== s.side) {
        if (G.fort[L] > 0 && s.side === 1) toast('The Paris Gun has levelled the fortifications at trench ' + L + '.');
        G.fort[L] = 0; G.fields = G.fields.filter(f => f.side === s.side || f.line !== L);
      }
      for (const e of G.units) {
        if (e.side === s.side || e.hp <= 0 || e.riding) continue;
        const d = Math.hypot(e.x - s.x1, e.y - s.y1); if (d > s.splash) continue;
        hurt(e, s.dmg * (1 - 0.55 * d / s.splash), 'barrage', null, s.cov, true);
      }
      for (const t of G.trains) { const d = Math.hypot(t.x - s.x1, RAIL_Y - s.y1); if (t.side !== s.side && d <= s.splash) hurtTrain(t, s.dmg * (1 - 0.55 * d / s.splash), 'barrage'); }
      const hb = G.bases[1 - s.side], hd = Math.hypot(hb.x - s.x1, WH / 2 - s.y1);
      if (!s.noBase && hd <= s.splash + 22) hurtBase(1 - s.side, s.dmg * 0.8 * (1 - 0.4 * hd / (s.splash + 22)));
      continue;
    }
    boom(s.x1, s.y1, s.big ? 46 : s.base ? 16 : Math.max(10, (s.splash || 20) * 0.6));
    if (s.big && !G.reduceMotion) G.shake = Math.max(G.shake, 4);
    if (s.raze && !s.base) for (let L = 1; L <= G.NT; L++) if (Math.abs(s.x1 - G.LX[L]) < 32 && G.owner[L] !== s.side) { G.fort[L] = 0; G.fields = G.fields.filter(f => f.side === s.side || f.line !== L); }
    for (const f of G.fields) if (f.type === 'wire' && Math.abs(s.x1 - f.x) < f.w / 2 + 12) f.hp -= s.dmg;
    if (s.siege && !s.base) for (let L = 1; L <= G.NT; L++) if (Math.abs(s.x1 - G.LX[L]) < 26 && G.fort[L] > 0 && rng.float() < 0.4) {
      G.fort[L]--; boom(s.x1, s.y1, 46);
      if (G.owner[L] === 0) toast('A siege shell smashed part of the fortifications at trench ' + L + '.');
    }
    if (s.base && !s.noBase) hurtBase(1 - s.side, s.dmg);
    else {
      for (const e of G.units) { if (e.side === s.side || e.hp <= 0 || e.riding) continue; if (Math.hypot(e.x - s.x1, e.y - s.y1) <= s.splash) hurt(e, s.dmg, s.type, null, s.cov, true); }
      for (const t of G.trains) if (t.side !== s.side && Math.hypot(t.x - s.x1, RAIL_Y - s.y1) <= s.splash) hurtTrain(t, s.dmg, s.type);
    }
  }
  G.shells = G.shells.filter(s => s.t < s.dur);
  // card barrage
  if (G.M[0].barrage) {
    G.S.barrageT -= dt;
    if (G.S.barrageT <= 0) {
      G.S.barrageT = 10;
      let tgt = null; for (const e of G.units) if (e.side === 1 && e.hp > 0 && e.settled && !e.riding && (!tgt || e.x < tgt.x)) tgt = e;
      if (tgt) for (let i = 0; i < G.M[0].barrage; i++) G.shells.push({ x0: G.bases[0].x, y0: WH / 2, x1: tgt.x + (rng.float() - 0.5) * 26, y1: 20 + rng.float() * (WH - 40), t: -i * 0.25, dur: 1.6, side: 0, type: 'barrage', dmg: 26, splash: 36, arc: 1.5 });
    }
  }
  stepFields();
  G.units = G.units.filter(u => u.hp > 0);
  // who holds what
  for (let L = 1; L <= G.NT; L++) {
    let a = 0, b = 0; for (const u of G.units) if (u.line === L && u.settled && !(u.fall > 0) && !u.fixed) { if (u.side) b++; else a++; }
    const was = G.owner[L];
    if (a && !b) G.owner[L] = 0; else if (b && !a) G.owner[L] = 1;
    if (was !== G.owner[L] && (was === 0 || was === 1) && hasTrack()) cutTrack(was, segmentIndexFor(was, L));
  }
  if (G.SUPER > 0 && G.owner[G.SUPER] !== G.S.superOwner) {
    const prev = G.S.superOwner, now = G.owner[G.SUPER]; G.S.superOwner = now;
    if (now >= 0) {
      if (prev < 0) buildSuper(now);
      if (now === 0) {
        toast('You hold the super trench. Its guns are yours, it pays +' + SUPER_INC + ' supplies a second, and it sends a free card every 3 minutes.' + (G.S.superCard ? '' : ' The first one is yours now.'));
        if (!G.S.superCard) { G.S.superCard = true; G.S.pending++; }
      } else toast('The enemy has taken the super trench.');
    }
  }
  for (const n of G.units) {
    if (!n.T.nest) continue;
    let a = 0, b = 0; for (const u of G.units) if (!u.fixed && u.line === n.line && u.settled && !(u.fall > 0)) { if (u.side === n.side) a++; else b++; }
    if (b && !a) { n.side = 1 - n.side; n.hp = Math.max(n.hp, n.max * 0.5); n.cd = 1; toast(n.side === 0 ? 'You captured a ' + n.T.name + ' at trench ' + n.line + '.' : 'The enemy captured your ' + n.T.name + ' at trench ' + n.line + '.'); }
  }
  for (let sd = 0; sd < 2; sd++) {
    if (G.nation[sd] !== 'ah') continue;
    for (let L = 1; L <= G.NT; L++) {
      if (G.fort[L] >= maxFort(L)) { G.garr[L] = 0; continue; }
      let n = 0; for (const u of G.units) if (u.side === sd && u.line === L && u.settled && !(u.fall > 0) && !u.fixed && !u.T.armor) n++;
      if (n < 3) continue;
      G.garr[L] += dt;
      if (G.garr[L] >= GARR_T[G.fort[L]]) { G.garr[L] = 0; G.fort[L]++; if (sd === 0) toast('Your garrison has fortified trench ' + L + ' to level ' + G.fort[L] + '.'); }
    }
  }
  stepBunkers();
  stepJobs(dt);
}
