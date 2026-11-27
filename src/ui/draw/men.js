// Infantry sprites, weapon sprites per nation, nests and static emplacements.
import { circle, oval, line, ctx, bagArc, BAG, TR } from './helpers.js';
import { NAT } from '../../data/nations.js';
import { G } from '../../sim/state.js';
import { FALL_LIFT, FALL_DRIFT } from '../../data/drop.js';

export function drawPillbox(u) {
  ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(-10, -9, 26, 24);
  ctx.fillStyle = '#7d7b71'; ctx.beginPath();
  ctx.moveTo(-12, -8); ctx.lineTo(-7, -13); ctx.lineTo(8, -13); ctx.lineTo(14, -6);
  ctx.lineTo(14, 6); ctx.lineTo(8, 13); ctx.lineTo(-7, 13); ctx.lineTo(-12, 8); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 0.8; ctx.stroke();
  ctx.fillStyle = '#9a988d'; ctx.fillRect(-8, -8.5, 16, 17);
  ctx.fillStyle = 'rgba(255,255,255,.1)'; ctx.fillRect(-8, -8.5, 16, 3);
  ctx.fillStyle = '#14140e'; ctx.fillRect(11, -4, 3.5, 8);
  ctx.lineCap = 'round'; line(13, 0, 21, 0, 2.6, '#15150f');
  if (u.flash > 0) { ctx.fillStyle = '#fff1b8'; circle(23, 0, 2.8); }
  if (u.hp < u.max) {
    ctx.fillStyle = 'rgba(20,20,14,.75)'; ctx.fillRect(-12, -21, 24, 4);
    ctx.fillStyle = u.side ? '#e0583e' : '#9fc05a'; ctx.fillRect(-11, -20, 22 * Math.max(0, u.hp / u.max), 2);
  }
}

export function drawPit(u, N) {
  ctx.fillStyle = 'rgba(0,0,0,.25)'; oval(2, 3, 17, 16);
  ctx.fillStyle = TR; circle(0, 0, 12);
  bagArc(0, 0, 13.5, -Math.PI * 0.7, Math.PI * 0.7);
  ctx.fillStyle = '#15150f'; ctx.fillRect(1, -9.5, 6, 2.8); ctx.fillRect(1, 6.7, 6, 2.8);
  ctx.lineCap = 'round'; line(-9, 0, 3, 0, 2.4, '#2b2b20'); line(3, 0, 22, 0, 2.6, '#15150f');
  ctx.lineCap = 'butt'; line(6.5, -7.5, 6.5, 7.5, 2.4, '#5f7fa6'); ctx.lineCap = 'round';
  ctx.fillStyle = N.hat; circle(-3, -5, 3.1); circle(-4, 5, 3.1);
  if (u.flash > 0) { ctx.fillStyle = '#fff1b8'; circle(24, 0, 3.6); }
  if (u.hp < u.max) {
    ctx.fillStyle = 'rgba(20,20,14,.75)'; ctx.fillRect(-12, -22, 24, 4);
    ctx.fillStyle = u.side ? '#e0583e' : '#9fc05a'; ctx.fillRect(-11, -21, 22 * Math.max(0, u.hp / u.max), 2);
  }
}

export function drawDepot(u) {
  ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(-12, -10, 30, 26);
  ctx.fillStyle = '#6f6a45'; ctx.fillRect(-15, -13, 22, 26);
  ctx.fillStyle = '#8a8456'; ctx.fillRect(-15, -13, 11, 26);
  ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 0.8; ctx.strokeRect(-15, -13, 22, 26);
  ctx.lineCap = 'butt'; line(-4, -13, -4, 13, 1.2, 'rgba(0,0,0,.45)');
  ctx.fillStyle = '#6b5433'; ctx.fillRect(9, -12, 8, 7); ctx.fillRect(10, -3, 8, 7); ctx.fillRect(9, 6, 7, 6);
  ctx.fillStyle = '#8a7146'; ctx.fillRect(10.2, -10.8, 5.6, 4.6); ctx.fillRect(11.2, -1.8, 5.6, 4.6); ctx.fillRect(10.2, 7.2, 4.6, 3.6);
  ctx.fillStyle = '#3c4032'; circle(21, -9, 2.6); circle(21, 9, 2.6);
  if (u.hp < u.max) {
    ctx.fillStyle = 'rgba(20,20,14,.75)'; ctx.fillRect(-12, -21, 24, 4);
    ctx.fillStyle = u.side ? '#e0583e' : '#9fc05a'; ctx.fillRect(-11, -20, 22 * Math.max(0, u.hp / u.max), 2);
  }
}

export function drawBunker(u, N) {
  ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(-14, -12, 34, 30);
  ctx.fillStyle = '#6f7d88'; ctx.beginPath();
  ctx.moveTo(-17, -12); ctx.lineTo(-10, -17); ctx.lineTo(10, -17); ctx.lineTo(17, -10);
  ctx.lineTo(17, 10); ctx.lineTo(10, 17); ctx.lineTo(-10, 17); ctx.lineTo(-17, 12); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 0.8; ctx.stroke();
  ctx.fillStyle = '#e8eef2'; ctx.fillRect(-12, -14, 22, 5); ctx.fillRect(-12, 9, 22, 5);
  ctx.fillStyle = '#a9b8c4'; ctx.fillRect(-12, -9, 26, 18);
  ctx.fillStyle = '#14140e'; ctx.fillRect(13, -8, 3.5, 5); ctx.fillRect(13, 3, 3.5, 5);
  ctx.fillStyle = '#1e2a36'; ctx.fillRect(-9, -6, 16, 12);
  ctx.fillStyle = N.hat;
  for (let i = 0; i < (u.occ || 0); i++) circle(-5.5 + (i % 3) * 5.5, -2.6 + Math.floor(i / 3) * 5.4, 2.3);
  if (u.hp < u.max) {
    ctx.fillStyle = 'rgba(20,20,14,.75)'; ctx.fillRect(-14, -24, 28, 4);
    ctx.fillStyle = u.side ? '#e0583e' : '#9fc05a'; ctx.fillRect(-13, -23, 26 * Math.max(0, u.hp / u.max), 2);
  }
}

export function drawWorkshop(u, N) {
  ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(-13, -11, 30, 26);
  ctx.fillStyle = N.body; ctx.fillRect(-16, -14, 30, 26);
  ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 0.8; ctx.strokeRect(-16, -14, 30, 26);
  ctx.fillStyle = N.hat; ctx.fillRect(-16, -14, 30, 6);
  ctx.lineCap = 'butt';
  ctx.fillStyle = '#3c4032'; circle(0, 2, 6.5);
  ctx.strokeStyle = '#6b6f5e'; ctx.lineWidth = 1.4; ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = i * Math.PI / 3;
    ctx.moveTo(Math.cos(a) * 6.5, 2 + Math.sin(a) * 6.5);
    ctx.lineTo(Math.cos(a) * 9, 2 + Math.sin(a) * 9);
  }
  ctx.stroke();
  ctx.fillStyle = N.body; circle(0, 2, 3);
  ctx.lineCap = 'round';
  if (u.hp < u.max) {
    ctx.fillStyle = 'rgba(20,20,14,.75)'; ctx.fillRect(-12, -22, 24, 4);
    ctx.fillStyle = u.side ? '#e0583e' : '#9fc05a'; ctx.fillRect(-11, -21, 22 * Math.max(0, u.hp / u.max), 2);
  }
}

export function drawNest(u, N) {
  if (u.type === 'bunker') { drawBunker(u, N); return; }
  if (u.type === 'pillbox') { drawPillbox(u); return; }
  if (u.type === 'pit75' || u.type === 'pit65') { drawPit(u, N); return; }
  if (u.type === 'depot') { drawDepot(u); return; }
  if (u.type === 'workshop') { drawWorkshop(u, N); return; }
  ctx.fillStyle = 'rgba(0,0,0,.25)'; oval(2, 3, 15, 14);
  ctx.fillStyle = TR; circle(0, 0, 10);
  bagArc(0, 0, 11.5, -Math.PI * 0.74, Math.PI * 0.74);
  ctx.lineCap = 'round';
  line(-2, -4.5, 5, 0, 1.2, '#15150f'); line(-2, 4.5, 5, 0, 1.2, '#15150f');
  line(1, 0, 18, 0, 2.8, '#15150f'); line(5, 0, 12, 0, 4.6, '#3d423a');
  ctx.fillStyle = N.hat; circle(-4, -3.6, 3.1); circle(-4.6, 3.8, 3.1);
  if (u.flash > 0) { ctx.fillStyle = '#fff1b8'; circle(20, 0, 2.8); }
  if (u.hp < u.max) {
    ctx.fillStyle = 'rgba(20,20,14,.75)'; ctx.fillRect(-12, -19, 24, 4);
    ctx.fillStyle = u.side ? '#e0583e' : '#9fc05a'; ctx.fillRect(-11, -18, 22 * Math.max(0, u.hp / u.max), 2);
  }
}

// Parachute: canopy and rigging above a falling unit. Drawn in unit-local space
// (+x faces forward), so "above" is toward -y after the caller's flip; the view is top-down
// and the canopy is a muted off-white dome with panel seams.
function drawChute(u) {
  const k = Math.min(1, u.fall / 2);
  ctx.globalAlpha = 0.9;
  ctx.strokeStyle = 'rgba(40,36,26,.7)'; ctx.lineWidth = 0.6;
  ctx.beginPath();
  for (const dx of [-8, -3, 3, 8]) { ctx.moveTo(0, 0); ctx.lineTo(dx, -13 - 2 * k); }
  ctx.stroke();
  ctx.fillStyle = '#cfc7a8'; ctx.beginPath(); ctx.ellipse(0, -16 - 2 * k, 10, 5, 0, Math.PI, 0); ctx.fill();
  ctx.strokeStyle = 'rgba(60,54,38,.5)'; ctx.lineWidth = 0.7;
  ctx.beginPath();
  for (const dx of [-5, 0, 5]) { ctx.moveTo(dx * 0.4, -16 - 2 * k); ctx.lineTo(dx, -16 - 2 * k - 4.4 * (1 - Math.abs(dx) / 10)); }
  ctx.stroke();
  ctx.globalAlpha = 1;
}

export function drawSoldier(u) {
  if (u.fall > 0) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,.18)'; oval(2, 2.5, 3.2, 5.4);    // ground shadow stays put
    const s = 1 + Math.min(1, u.fall / 2) * 0.12;
    ctx.translate(-u.fall * FALL_DRIFT, -u.fall * FALL_LIFT); ctx.scale(s, s); // up and behind, drifting forward as they come down
    drawChute(u);
    drawSoldierBody(u, true);
    ctx.restore();
    return;
  }
  drawSoldierBody(u);
}

function drawSoldierBody(u, airborne) {
  const N = NAT[G.nation[u.side]], t = u.type;
  if (u.T.nest) { drawNest(u, N); return; }
  if (!airborne) { ctx.fillStyle = 'rgba(0,0,0,.25)'; oval(2, 2.5, 3.2, 5.4); }
  if (u.moving) {
    const sw = Math.sin(u.walk) * 2.8;
    ctx.fillStyle = '#1c1c15'; oval(sw, -2.4, 2.1, 1.4); oval(-sw, 2.4, 2.1, 1.4);
  }
  ctx.lineCap = 'round';
  const sp = u.T.sprite;
  if (sp === 'maxim') {
    ctx.fillStyle = '#15150f'; ctx.fillRect(5, -6, 4, 2.2); ctx.fillRect(5, 3.8, 4, 2.2);
    line(3, 0, 14, 0, 2.6, '#15150f');
    ctx.lineCap = 'butt'; line(9, -5, 9, 5, 1.8, '#77804f'); ctx.lineCap = 'round';
  } else if (sp === 'gun75') {
    ctx.fillStyle = '#15150f'; ctx.fillRect(4, -9, 5.5, 2.6); ctx.fillRect(4, 6.4, 5.5, 2.6);
    line(-7, 0, 5, 0, 2.2, '#2b2b20'); line(5, 0, 20, 0, 2.4, '#15150f');
    ctx.lineCap = 'butt'; line(9, -7, 9, 7, 2.2, '#5f7fa6'); ctx.lineCap = 'round';
  } else if (sp === 'ramm') {
    ctx.fillStyle = '#15150f'; ctx.fillRect(-9.5, -2.2, 5, 4.4);   // back-mounted mortar tube
    line(-7, 0, -11, 0, 2.2, '#15150f');
    line(1, 0, 9.5, 0, 2.8, '#3c4032');                            // forward ram bar
  } else if (t === 'mg') {
    line(-2, -4, 5, 0, 1, '#15150f'); line(-2, 4, 5, 0, 1, '#15150f'); line(1, 0, 14, 0, 2.6, '#15150f');
  } else if (t === 'sniper') line(1, 2.4, 15, 2.4, 1.1, '#15150f');
  else if (t === 'tommy') {
    line(1, 2.4, 8, 2.4, 2.6, '#3d3426');            // short chunky body
    ctx.fillStyle = '#15150f'; circle(4.5, 4.6, 2.2); // drum magazine
    ctx.fillStyle = '#5a5a48'; circle(4.5, 4.6, 0.9);
  }
  else if (t === 'raider') { line(1, 3, 6, 3, 1.6, '#15150f'); line(2, -3.4, 7, -4.4, 1.8, '#d9cfa8'); }
  else if (t === 'mortar' && !sp) {
    ctx.fillStyle = '#15150f'; circle(8, 0, 3.4);
    ctx.fillStyle = '#5a5a48'; circle(8, 0, 1.7);
  } else if (!u.carry) line(1, 2.4, 10.5, 2.4, 1.5, '#15150f');
  ctx.fillStyle = N.body; oval(0, 0, 3.1, 5.3);
  if (t === 'raider' && !sp) { ctx.fillStyle = '#b3261b'; ctx.fillRect(-1, -5, 2, 10); }
  ctx.fillStyle = N.hat;
  if (N.style === 'brodie') {
    circle(0, 0, 3.8);
    ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.arc(0, 0, 2.2, 0, Math.PI * 2); ctx.stroke();
  } else if (N.style === 'adrian') {
    circle(0, 0, 3.5); line(-2.7, 0, 2.7, 0, 1.1, 'rgba(255,255,255,.4)');
  } else if (N.style === 'parka') {
    circle(0, 0, 3.6);
    ctx.strokeStyle = 'rgba(240,246,250,.9)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, 0, 3.6, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(20,30,50,.55)'; circle(1.3, 0, 1.5);
  } else if (N.style === 'alpino') {
    circle(0, 0, 3.4);
    ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.arc(0, 0, 3.4, 0, Math.PI * 2); ctx.stroke();
    line(-0.4, -2.6, -1.4, -6.2, 1.3, '#14140e');
    ctx.fillStyle = 'rgba(255,255,255,.14)'; circle(0.6, -0.6, 1.4);
  } else if (N.style === 'cap') {
    circle(0, 0, 3.3);
    ctx.fillStyle = '#262b16'; ctx.fillRect(2, -2.1, 2.4, 4.2);
    ctx.fillStyle = 'rgba(255,255,255,.18)'; circle(-0.4, 0, 1.3);
  } else {
    circle(0, 0, 3.4);
    ctx.fillStyle = 'rgba(255,255,255,.14)'; circle(0.6, -0.6, 1.5);
  }
  if (u.carry === 'bags') {
    ctx.fillStyle = '#77664a'; ctx.fillRect(-3.5, -7.6, 8, 5);
    ctx.fillStyle = BAG; ctx.fillRect(-3, -7.1, 7, 4);
  } else if (u.carry === 'gun') {
    ctx.lineCap = 'round';
    line(-5, -5.5, 6, 5.5, 2.8, '#15150f');
    line(-5, -5.5, -7, -2, 1.1, '#15150f');
    line(-5, -5.5, -2, -7.5, 1.1, '#15150f');
  }
  if (u.flash > 0 && (t !== 'mortar' || sp)) {
    ctx.fillStyle = '#fff1b8';
    if (u.T.muzzle) circle(u.T.muzzle + 1.5, 0, sp === 'gun75' ? 3.2 : 2.2);
    else if (sp === 'ramm') circle(u.mode === 'ram' ? 10.5 : -11.5, 0, 2.2);
    else circle(t === 'mg' ? 15 : t === 'tommy' ? 9.5 : 11.5, t === 'mg' ? 0 : 2.4, 2.2);
  }
}
