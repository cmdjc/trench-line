// Armour sprites: bespoke per-nation hulls, the generic parts renderer,
// super-heavy specials and burning wrecks.
import { circle, oval, line, ctx } from './helpers.js';
import { NAT } from '../../data/nations.js';
import { G } from '../../sim/state.js';

export function treads(x0, x1, y0, y1, ph) {
  ctx.fillStyle = '#22221a'; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  ctx.strokeStyle = '#56564a'; ctx.lineWidth = 0.9; ctx.beginPath();
  for (let x = x0 + (((-ph) % 3) + 3) % 3; x < x1; x += 3) { ctx.moveTo(x, y0); ctx.lineTo(x, y1); }
  ctx.stroke();
  ctx.strokeStyle = '#0f0f0b'; ctx.lineWidth = 0.7; ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
}

export function tankDamage(u, sc) {
  sc = sc || 1;
  const f = u.hp / u.max;
  if (f >= 0.66) return;
  const n = f < 0.33 ? 7 : 3;
  for (let i = 0; i < n; i++) {
    const px = (((u.id * 37 + i * 53) % 34) - 17) * sc, py = (((u.id * 17 + i * 29) % 14) - 7) * sc;
    ctx.fillStyle = 'rgba(18,14,9,.7)'; circle(px, py, 2.2 + (i % 3) * 0.7);
    ctx.fillStyle = 'rgba(120,70,30,.5)'; circle(px + 0.6, py - 0.4, 0.9);
  }
  if (f < 0.33) {
    ctx.fillStyle = Math.random() < 0.5 ? '#ff9a3a' : '#ffd060';
    circle(-5, 2, 2 + Math.random() * 1.6);
    ctx.fillStyle = '#ffe9a8'; circle(-5, 2, 1);
  }
}

export function drawMkV(u, N) {
  ctx.fillStyle = 'rgba(0,0,0,.28)'; oval(3, 4.5, 26, 16);
  ctx.lineCap = 'round';
  for (const sd of [-1, 1]) {
    ctx.fillStyle = N.hat; ctx.beginPath();
    ctx.moveTo(-7, sd * 10); ctx.lineTo(-5, sd * 16); ctx.lineTo(6, sd * 16); ctx.lineTo(9, sd * 10); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 0.7; ctx.stroke();
    line(4, sd * 13.6, 17, sd * 14.6, 2.1, '#15150f');
    ctx.fillStyle = '#2e2e22'; circle(4, sd * 13.4, 2.3);
  }
  treads(-23, 23, -11.5, -6, u.tread); treads(-23, 23, 6, 11.5, u.tread);
  ctx.fillStyle = N.body; ctx.fillRect(-21, -6, 41, 12);
  ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = 0.6; ctx.beginPath();
  for (const x of [-12, -3, 6]) ctx.rect(x, -6, 0.01, 12);
  ctx.moveTo(-21, -4.4); ctx.lineTo(19, -4.4); ctx.moveTo(-21, 4.4); ctx.lineTo(19, 4.4); ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  for (let x = -19; x < 19; x += 4.5) { ctx.fillRect(x, -5.6, 0.9, 0.9); ctx.fillRect(x, 4.7, 0.9, 0.9); }
  ctx.fillStyle = N.hat; ctx.fillRect(7, -4.6, 9.5, 9.2);
  ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 0.7; ctx.strokeRect(7, -4.6, 9.5, 9.2);
  ctx.fillStyle = '#14140e'; ctx.fillRect(15, -3.2, 1.3, 2.2); ctx.fillRect(15, 1, 1.3, 2.2);
  ctx.fillStyle = 'rgba(0,0,0,.4)'; circle(-2, 0, 3);
  ctx.fillStyle = N.hat; circle(-2, 0, 2.2);
  line(-8, 2.8, -18, 2.8, 2, '#2b2b20'); line(-8, -2.8, -13, -2.8, 1.4, '#2b2b20');
  ctx.fillStyle = '#ece7d6'; ctx.fillRect(17, -6, 1.2, 12);
  ctx.fillStyle = '#b3261b'; ctx.fillRect(18.2, -6, 1.2, 12);
  ctx.fillStyle = '#ece7d6'; ctx.fillRect(19.4, -6, 1, 12);
  tankDamage(u);
  if (u.flash > 0) {
    ctx.fillStyle = '#fff1b8'; circle(19, u.gun * 14.8, 3.6);
    ctx.fillStyle = 'rgba(255,200,90,.6)'; circle(22, u.gun * 15, 2.4);
  }
}

export function drawA7V(u, N) {
  ctx.fillStyle = 'rgba(0,0,0,.28)'; oval(3, 4.5, 27, 16);
  ctx.lineCap = 'round';
  treads(-20, 20, -13.5, -9, u.tread); treads(-20, 20, 9, 13.5, u.tread);
  for (const x of [-13, -2, 9]) { line(x, -10, x + 1.6, -15, 1.3, '#15150f'); line(x, 10, x + 1.6, 15, 1.3, '#15150f'); }
  line(-21, -4, -25.5, -4.6, 1.3, '#15150f'); line(-21, 4, -25.5, 4.6, 1.3, '#15150f');
  ctx.fillStyle = N.body; ctx.beginPath();
  ctx.moveTo(-22, -8); ctx.lineTo(-18, -11.5); ctx.lineTo(18, -11.5); ctx.lineTo(23, -6);
  ctx.lineTo(23, 6); ctx.lineTo(18, 11.5); ctx.lineTo(-18, 11.5); ctx.lineTo(-22, 8); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 0.8; ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,.28)'; ctx.lineWidth = 0.6; ctx.beginPath();
  for (const x of [-11, 0, 11]) { ctx.moveTo(x, -11.5); ctx.lineTo(x, 11.5); }
  ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  for (let x = -17; x < 18; x += 5) { ctx.fillRect(x, -10.6, 0.9, 0.9); ctx.fillRect(x, 9.7, 0.9, 0.9); }
  ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.fillRect(-18, -11.5, 36, 4);
  ctx.fillStyle = N.hat; ctx.fillRect(-6, -6, 13, 12);
  ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 0.7;
  ctx.strokeRect(-6, -6, 13, 12); ctx.strokeRect(-3, -3.4, 7, 6.8);
  ctx.fillStyle = '#14140e'; ctx.fillRect(6, -4, 1.2, 2); ctx.fillRect(6, 2, 1.2, 2);
  ctx.fillStyle = '#ece7d6'; ctx.fillRect(-17.5, -1.8, 7, 3.6); ctx.fillRect(-15.8, -3.5, 3.6, 7);
  ctx.fillStyle = '#14140e'; ctx.fillRect(-16.8, -1.1, 5.6, 2.2); ctx.fillRect(-15.1, -2.8, 2.2, 5.6);
  ctx.fillStyle = '#3a403f'; circle(20.5, 0, 4.2);
  ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 0.7;
  ctx.beginPath(); ctx.arc(20.5, 0, 4.2, 0, Math.PI * 2); ctx.stroke();
  line(22, 0, 32, 0, 3, '#15150f');
  tankDamage(u);
  if (u.flash > 0) {
    ctx.fillStyle = '#fff1b8'; circle(34, 0, 4);
    ctx.fillStyle = 'rgba(255,200,90,.6)'; circle(37, 0, 2.6);
  }
  if (u.flash2 > 0) {
    ctx.fillStyle = '#fff1b8';
    for (const x of [-13, -2, 9]) { circle(x + 1.8, -15.6, 1.5); circle(x + 1.8, 15.6, 1.5); }
  }
}

export function drawFT(u, N) {
  ctx.fillStyle = 'rgba(0,0,0,.28)'; oval(2, 3, 17, 10);
  ctx.lineCap = 'round';
  treads(-13, 14, -8, -4.2, u.tread); treads(-13, 14, 4.2, 8, u.tread);
  ctx.fillStyle = '#22221a'; circle(13.5, -6.1, 2.7); circle(13.5, 6.1, 2.7);
  line(-12, 0, -19, 0, 1.6, '#2b2b20'); line(-19, -2, -19, 2, 1.2, '#2b2b20');
  ctx.fillStyle = N.body; ctx.beginPath();
  ctx.moveTo(-12, -4.2); ctx.lineTo(8, -4.2); ctx.lineTo(12.5, -2);
  ctx.lineTo(12.5, 2); ctx.lineTo(8, 4.2); ctx.lineTo(-12, 4.2); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 0.7; ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 0.5; ctx.beginPath();
  for (let x = -10.5; x < -4.5; x += 1.6) { ctx.moveTo(x, -3); ctx.lineTo(x, 3); }
  ctx.stroke();
  ctx.fillStyle = 'rgba(120,90,50,.45)'; ctx.fillRect(4, -4.2, 4, 3); ctx.fillRect(-4, 1, 5, 3.2);
  tankDamage(u, 0.55);
  ctx.save(); ctx.translate(1, 0); ctx.rotate(u.aim);
  line(3, 0, 11, 0, 2, '#15150f');
  ctx.fillStyle = N.hat; circle(0, 0, 4.5);
  ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 0.7;
  ctx.beginPath(); ctx.arc(0, 0, 4.5, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#b3261b'; circle(-0.6, 0, 2);
  ctx.fillStyle = '#ece7d6'; circle(-0.6, 0, 1.3);
  ctx.fillStyle = '#2a4a9a'; circle(-0.6, 0, 0.65);
  if (u.flash > 0) { ctx.fillStyle = '#fff1b8'; circle(13, 0, 3); }
  ctx.restore();
}

export function drawVez(u, N) {
  ctx.fillStyle = 'rgba(0,0,0,.28)'; oval(2, 3, 16, 9);
  ctx.lineCap = 'round';
  treads(-14, 14, -3.6, 3.6, u.tread);
  ctx.fillStyle = '#22221a'; ctx.fillRect(4, -9.5, 5, 2.6); ctx.fillRect(4, 6.9, 5, 2.6);
  line(6.5, -7, 6.5, 7, 1.2, '#22221a');
  ctx.fillStyle = N.body; ctx.beginPath();
  ctx.moveTo(-11, -3); ctx.quadraticCurveTo(-9, -7.5, -2, -7.5); ctx.lineTo(5, -7.5);
  ctx.quadraticCurveTo(12, -6, 12.5, 0); ctx.quadraticCurveTo(12, 6, 5, 7.5);
  ctx.lineTo(-2, 7.5); ctx.quadraticCurveTo(-9, 7.5, -11, 3); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 0.7; ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = 0.5; ctx.beginPath();
  ctx.moveTo(-5, -7.5); ctx.lineTo(-5, 7.5); ctx.moveTo(8, -6); ctx.lineTo(8, 6); ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  for (let x = -8; x < 10; x += 3.5) { ctx.fillRect(x, -6.6, 0.8, 0.8); ctx.fillRect(x, 5.8, 0.8, 0.8); }
  line(-11, 2, -15, 2.6, 1.2, '#2b2b20');
  tankDamage(u, 0.5);
  ctx.save(); ctx.translate(3, 0); ctx.rotate(u.aim);
  line(2, 0, 9, 0, 1.5, '#15150f');
  ctx.fillStyle = N.hat; circle(0, 0, 3.8);
  ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 0.7;
  ctx.beginPath(); ctx.arc(0, 0, 3.8, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.18)'; circle(-0.6, 0, 1.4);
  if (u.flash > 0) { ctx.fillStyle = '#fff1b8'; circle(10.5, 0, 2.2); }
  ctx.restore();
}

export function drawTsar(u, N) {
  ctx.fillStyle = 'rgba(0,0,0,.28)'; oval(0, 7, 58, 42);
  ctx.lineCap = 'round';
  treads(-58, -49, -8, 8, u.tread);
  ctx.fillStyle = N.body; ctx.beginPath();
  ctx.moveTo(-8, -8); ctx.lineTo(-50, -3.6); ctx.lineTo(-50, 3.6); ctx.lineTo(-8, 8); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 0.7; ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = 0.6; ctx.beginPath();
  for (let x = -46; x < -10; x += 8) {
    const h0 = 3.6 + 4.4 * (x + 50) / 42, h1 = 3.6 + 4.4 * (x + 58) / 42;
    ctx.moveTo(x, -h0); ctx.lineTo(x + 8, h1); ctx.moveTo(x, h0); ctx.lineTo(x + 8, -h1);
  }
  ctx.stroke();
  ctx.fillStyle = N.hat; ctx.fillRect(9, -29, 6, 58);
  ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 0.7; ctx.strokeRect(9, -29, 6, 58);
  treads(-23, 47, -35, -28.5, u.tread); treads(-23, 47, 28.5, 35, u.tread);
  ctx.fillStyle = 'rgba(255,255,255,.1)'; ctx.fillRect(-23, -35, 70, 1.6); ctx.fillRect(-23, 28.5, 70, 1.6);
  ctx.fillStyle = '#2b2b20'; circle(12, -31.7, 4.6); circle(12, 31.7, 4.6);
  ctx.fillStyle = '#6a6a58'; circle(12, -31.7, 1.8); circle(12, 31.7, 1.8);
  for (const sd of [-1, 1]) {
    ctx.fillStyle = N.hat; ctx.fillRect(0, sd < 0 ? -17 : 13, 10, 4);
    line(5, sd * 16, 6.5, sd * 21.5, 1.4, '#15150f');
  }
  ctx.fillStyle = N.body; ctx.fillRect(-10, -13, 34, 26);
  ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 0.8; ctx.strokeRect(-10, -13, 34, 26);
  ctx.strokeStyle = 'rgba(0,0,0,.28)'; ctx.lineWidth = 0.6; ctx.beginPath();
  for (const x of [-1, 17]) { ctx.moveTo(x, -13); ctx.lineTo(x, 13); }
  ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  for (let x = -8; x < 23; x += 4.5) { ctx.fillRect(x, -12.2, 0.9, 0.9); ctx.fillRect(x, 11.3, 0.9, 0.9); }
  ctx.fillStyle = N.hat; circle(-4, 0, 4.6);
  ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 0.7;
  ctx.beginPath(); ctx.arc(-4, 0, 4.6, 0, Math.PI * 2); ctx.stroke();
  line(-8, 0, -13, 0, 1.4, '#15150f');
  tankDamage(u, 1.25);
  ctx.save(); ctx.translate(10, 0); ctx.rotate(u.aim);
  line(4, 0, 20, 0, 3.2, '#15150f');
  ctx.fillStyle = N.hat; circle(0, 0, 8.5);
  ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.arc(0, 0, 8.5, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,.3)'; circle(-2, 0, 3.2);
  ctx.fillStyle = N.body; circle(-2, 0, 2.4);
  if (u.flash > 0) {
    ctx.fillStyle = '#fff1b8'; circle(23, 0, 5);
    ctx.fillStyle = 'rgba(255,200,90,.6)'; circle(27, 0, 3);
  }
  ctx.restore();
  if (u.flash2 > 0) { ctx.fillStyle = '#fff1b8'; circle(6.8, -22.5, 1.7); circle(6.8, 22.5, 1.7); }
}

export function drawLiberty(u, N) {
  ctx.fillStyle = 'rgba(0,0,0,.28)'; oval(3, 5, 34, 19);
  ctx.lineCap = 'round';
  for (const sd of [-1, 1]) {
    ctx.fillStyle = N.hat; ctx.beginPath();
    ctx.moveTo(-8, sd * 12); ctx.lineTo(-5, sd * 19.5); ctx.lineTo(10, sd * 19.5); ctx.lineTo(14, sd * 12); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 0.7; ctx.stroke();
    line(8, sd * 16.6, 23, sd * 17.8, 2.3, '#15150f');
    ctx.fillStyle = '#2e2e22'; circle(8, sd * 16.4, 2.6);
    line(-4, sd * 19.5, -3, sd * 23, 1.2, '#15150f');
  }
  treads(-30, 30, -13.5, -7, u.tread); treads(-30, 30, 7, 13.5, u.tread);
  ctx.fillStyle = N.body; ctx.fillRect(-27, -7, 54, 14);
  ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = 0.6; ctx.beginPath();
  for (const x of [-18, -9, 12, 20]) { ctx.moveTo(x, -7); ctx.lineTo(x, 7); }
  ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  for (let x = -25; x < 26; x += 4.5) { ctx.fillRect(x, -6.5, 0.9, 0.9); ctx.fillRect(x, 5.6, 0.9, 0.9); }
  ctx.fillStyle = N.hat; ctx.fillRect(-8, -6.2, 19, 12.4);
  ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 0.7; ctx.strokeRect(-8, -6.2, 19, 12.4);
  ctx.fillStyle = N.body; ctx.fillRect(-1, -3.4, 8, 6.8); ctx.strokeRect(-1, -3.4, 8, 6.8);
  ctx.fillStyle = '#14140e'; ctx.fillRect(10, -4.4, 1.3, 2.2); ctx.fillRect(10, 2.2, 1.3, 2.2);
  line(11, 0, 15, 0, 1.3, '#15150f');
  line(-12, 3.6, -25, 3.6, 2.2, '#2b2b20');
  ctx.fillStyle = '#ece7d6'; ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 1.6 : 3.8;
    ctx.lineTo(-19 + Math.cos(a) * r, -1.2 + Math.sin(a) * r);
  }
  ctx.closePath(); ctx.fill();
  tankDamage(u, 1.4);
  if (u.flash > 0) {
    ctx.fillStyle = '#fff1b8'; circle(25, u.gun * 18, 3.8);
    ctx.fillStyle = 'rgba(255,200,90,.6)'; circle(28.5, u.gun * 18.2, 2.5);
  }
  if (u.flash2 > 0) { ctx.fillStyle = '#fff1b8'; circle(-2.8, -23.8, 1.6); circle(-2.8, 23.8, 1.6); circle(16, 0, 1.5); }
}

export function drawSkoda(u, N) {
  ctx.fillStyle = 'rgba(0,0,0,.28)'; oval(0, 4, 26, 16);
  ctx.fillStyle = '#4a3b28'; ctx.fillRect(-18, -11, 30, 22);
  ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 0.6; ctx.beginPath();
  for (let x = -14; x < 12; x += 4) { ctx.moveTo(x, -11); ctx.lineTo(x, 11); }
  ctx.stroke();
  ctx.fillStyle = '#17170f'; ctx.fillRect(-9, -15.5, 13, 4.5); ctx.fillRect(-9, 11, 13, 4.5);
  ctx.fillStyle = '#6a736d'; ctx.fillRect(-11, -6.5, 17, 13);
  ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 0.8; ctx.strokeRect(-11, -6.5, 17, 13);
  ctx.lineCap = 'butt'; line(-1, 0, 18, 0, 8.5, '#2a2d2b'); line(15, 0, 18, 0, 10, '#3c403d'); ctx.lineCap = 'round';
  ctx.fillStyle = '#3c403d'; circle(-3, 0, 5.2);
  ctx.fillStyle = '#565c57'; circle(-3, 0, 2.6);
  ctx.fillStyle = '#4a3b28'; ctx.fillRect(-28, -4, 8, 8);
  ctx.fillStyle = '#b7b3a3'; circle(-25.6, -1.6, 1.5); circle(-22.6, -1.6, 1.5); circle(-25.6, 1.8, 1.5); circle(-22.6, 1.8, 1.5);
  ctx.fillStyle = N.hat; circle(-14, -7.5, 3.1); circle(-15, 7, 3.1); circle(8, 9, 3.1);
  ctx.fillStyle = '#262b16'; ctx.fillRect(-12, -9.6, 2.4, 4.2); ctx.fillRect(-13, 4.9, 2.4, 4.2); ctx.fillRect(10, 6.9, 2.4, 4.2);
  tankDamage(u, 0.8);
  if (u.flash > 0) {
    ctx.fillStyle = '#fff1b8'; circle(22, 0, 8);
    ctx.fillStyle = 'rgba(255,200,90,.6)'; circle(28, 0, 5);
  }
}

export function drawChar2C(u, N) {
  ctx.fillStyle = 'rgba(0,0,0,.28)'; oval(3, 5, 37, 17);
  ctx.lineCap = 'round';
  treads(-33, 33, -13.5, -8, u.tread); treads(-33, 33, 8, 13.5, u.tread);
  ctx.fillStyle = N.body; ctx.fillRect(-31, -8.5, 62, 17);
  ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 0.8; ctx.strokeRect(-31, -8.5, 62, 17);
  ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = 0.6; ctx.beginPath();
  for (const x of [-12, -2, 24]) { ctx.moveTo(x, -8.5); ctx.lineTo(x, 8.5); }
  for (let x = -29; x < -14; x += 2) { ctx.moveTo(x, -5); ctx.lineTo(x, 5); }
  ctx.stroke();
  ctx.fillStyle = 'rgba(120,90,50,.4)'; ctx.fillRect(-10, -8.5, 8, 7); ctx.fillRect(2, 1, 9, 7.5); ctx.fillRect(22, -8.5, 7, 6);
  for (const sd of [-1, 1]) line(4, sd * 8.5, 6, sd * 12.5, 1.3, '#15150f');
  ctx.fillStyle = N.hat; circle(-21, 0, 5);
  ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 0.7;
  ctx.beginPath(); ctx.arc(-21, 0, 5, 0, Math.PI * 2); ctx.stroke();
  line(-25, 0, -31, 0, 1.5, '#15150f');
  tankDamage(u, 1.6);
  ctx.save(); ctx.translate(13, 0); ctx.rotate(u.aim);
  line(4, 0, 21, 0, 3, '#15150f');
  ctx.fillStyle = N.hat; circle(0, 0, 8);
  ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#b3261b'; circle(-1.5, 0, 3.2);
  ctx.fillStyle = '#ece7d6'; circle(-1.5, 0, 2.1);
  ctx.fillStyle = '#2a4a9a'; circle(-1.5, 0, 1);
  if (u.flash > 0) {
    ctx.fillStyle = '#fff1b8'; circle(24, 0, 4.6);
    ctx.fillStyle = 'rgba(255,200,90,.6)'; circle(28, 0, 3);
  }
  ctx.restore();
  if (u.flash2 > 0) { ctx.fillStyle = '#fff1b8'; circle(6.5, -13.6, 1.6); circle(6.5, 13.6, 1.6); }
}

export function emblem(n, x, y, sc) {
  ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
  const star = col => {
    ctx.fillStyle = col; ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 1.6 : 3.8;
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath(); ctx.fill();
  };
  if (n === 'de') {
    ctx.fillStyle = '#ece7d6'; ctx.fillRect(-3.5, -1.8, 7, 3.6); ctx.fillRect(-1.8, -3.5, 3.6, 7);
    ctx.fillStyle = '#14140e'; ctx.fillRect(-2.8, -1.1, 5.6, 2.2); ctx.fillRect(-1.1, -2.8, 2.2, 5.6);
  } else if (n === 'gb') {
    ctx.fillStyle = '#ece7d6'; ctx.fillRect(-2.4, -3, 1.6, 6); ctx.fillRect(0.8, -3, 1.6, 6);
    ctx.fillStyle = '#b3261b'; ctx.fillRect(-0.8, -3, 1.6, 6);
  } else if (n === 'fr') {
    ctx.fillStyle = '#b3261b'; circle(0, 0, 3.2);
    ctx.fillStyle = '#ece7d6'; circle(0, 0, 2.1);
    ctx.fillStyle = '#2a4a9a'; circle(0, 0, 1);
  } else if (n === 'us') star('#ece7d6');
  else if (n === 'ru') star('#b3261b');
  else if (n === 'aq') {
    ctx.fillStyle = '#4a7fb0'; circle(0, 0, 3.6);
    ctx.fillStyle = '#f2f6f9'; ctx.beginPath();
    ctx.ellipse(0, 0.2, 2.3, 1.9, 0, 0, Math.PI * 2); ctx.fill();
  } else if (n === 'it') {
    ctx.fillStyle = '#2e7d4f'; ctx.fillRect(-2.4, -3, 1.6, 6);
    ctx.fillStyle = '#ece7d6'; ctx.fillRect(-0.8, -3, 1.6, 6);
    ctx.fillStyle = '#b3261b'; ctx.fillRect(0.8, -3, 1.6, 6);
  } else if (n === 'sx') {
    ctx.fillStyle = '#ece7d6'; circle(0, 0, 3.6);
    ctx.fillStyle = '#2e6b3a'; circle(0, 0, 2.4);
    ctx.fillStyle = '#14140e'; circle(0, 0, 1);
  } else {
    ctx.fillStyle = '#16160f'; ctx.fillRect(-3, -2, 6, 2);
    ctx.fillStyle = '#e2b93b'; ctx.fillRect(-3, 0, 6, 2);
  }
  ctx.restore();
}

export function drawBall(u, N) {
  ctx.fillStyle = 'rgba(0,0,0,.28)'; oval(1, 3, 12, 11);
  treads(-6, 6, -11, -7, u.tread); treads(-6, 6, 7, 11, u.tread);
  line(-8, 0, -15, 0, 1.5, '#2b2b20'); line(-15, -2, -15, 2, 1.2, '#2b2b20');
  ctx.fillStyle = N.body; circle(0, 0, 8);
  ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 0.7;
  ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = 0.6; ctx.beginPath();
  ctx.ellipse(0, 0, 8, 3.2, 0, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.12)'; circle(-2.2, -2.6, 3.4);
  ctx.fillStyle = N.hat; circle(-2, 0, 2.6);
  ctx.fillStyle = '#14140e'; ctx.fillRect(5, -3.2, 1.6, 6.4);
  line(6, 1.6, 15, 1.6, 1.6, '#15150f');
  tankDamage(u, 0.5);
  if (u.flash > 0) { ctx.fillStyle = '#fff1b8'; circle(17, 1.6, 2.4); }
}

const colr = (c, N) => (c === 'b' ? N.body : c === 'h' ? N.hat : c);

export function drawTankGen(u, N) {
  const d = u.T.draw;
  if (d.ball) { drawBall(u, N); return; }
  const L = d.L, W = d.W, cb = d.cb || N.body, ch = d.ch || N.hat, NN = { body: cb, hat: ch };
  ctx.fillStyle = 'rgba(0,0,0,.28)'; oval(2, 4, L + 5, W + 5);
  ctx.lineCap = 'round';
  if (d.base) { ctx.fillStyle = d.base; ctx.fillRect(-L + 2, -W + 2, 2 * L - 4, 2 * W - 4); }
  for (const t of d.tr) { treads(-L, L, -t[1], -t[0], u.tread); treads(-L, L, t[0], t[1], u.tread); }
  if (d.legs) {
    const lw = 2.2 * (W / 14);
    d.legs.forEach(([lx, reach], i) => {
      const sw = Math.sin(u.tread * 0.3 + i * Math.PI) * reach * 0.5;
      for (const s of [-1, 1]) {
        const hx = lx, hy = s * W * 0.72, kx = lx + sw, ky = s * (W + reach * 0.7), fx = lx + sw * 1.6, fy = s * (W + reach);
        ctx.strokeStyle = '#15150f'; ctx.lineWidth = lw;
        ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke();
        ctx.fillStyle = '#15150f'; circle(fx, fy, lw * 0.8);
      }
    });
  }
  for (const p of d.parts) {
    if (p.t === 'l') { line(p.x1, p.y1, p.x2, p.y2, p.w, p.c || '#15150f'); continue; }
    if (p.t === 'em') { emblem(G.nation[u.side], p.x, p.y, p.s || 1); continue; }
    ctx.fillStyle = colr(p.c || 'b', NN);
    if (p.t === 'c') circle(p.x, p.y, p.r);
    else if (p.t === 'r') ctx.fillRect(p.x, p.y, p.w, p.h);
    else {
      ctx.beginPath();
      p.pts.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])));
      ctx.closePath(); ctx.fill();
    }
    if (p.o) {
      ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 0.7;
      if (p.t === 'r') ctx.strokeRect(p.x, p.y, p.w, p.h);
      else if (p.t === 'c') { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.stroke(); }
      else ctx.stroke();
    }
  }
  if (d.legs) {
    // Legs often mount wider than the hull itself (a splayed spider/crab stance), so the
    // hip can sit well outside the hull polygon. mx/my is a point safely inside every
    // Saxon hull's own bounds (checked against each one's parts[0].pts); a filled, tapered
    // mounting bracket bridges from there out to the true hip, so the leg reads as a solid
    // structural part rather than a thin wire, however far outboard it's mounted.
    const lw = 2.2 * (W / 14);
    d.legs.forEach(([lx]) => {
      const mx = lx * 0.45;
      for (const s of [-1, 1]) {
        const hx = lx, hy = s * W * 0.72, my = s * W * 0.45;
        const dx = hx - mx, dy = hy - my, dlen = Math.hypot(dx, dy) || 1, px = -dy / dlen, py = dx / dlen;
        const wBase = lw * 1.3, wTip = lw * 0.9;
        ctx.fillStyle = ch;
        ctx.beginPath();
        ctx.moveTo(mx, my);
        ctx.lineTo(mx + px * wBase, my + py * wBase);
        ctx.lineTo(hx + px * wTip, hy + py * wTip);
        ctx.lineTo(hx, hy);
        ctx.lineTo(hx - px * wTip, hy - py * wTip);
        ctx.lineTo(mx - px * wBase, my - py * wBase);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 0.6; ctx.stroke();
        ctx.fillStyle = ch; circle(hx, hy, lw * 1.3);
        ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 0.6;
        ctx.beginPath(); ctx.arc(hx, hy, lw * 1.3, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = 'rgba(0,0,0,.35)'; circle(hx, hy, lw * 0.5);
      }
    });
  }
  tankDamage(u, L / 23);
  for (const p of d.tur || []) {
    ctx.save(); ctx.translate(p.x, 0); ctx.rotate(u.aim);
    const stowed = p.stowLen !== undefined && !u.settled;
    const len = stowed ? p.stowLen : p.len, gt = stowed ? (p.stowGt || (p.gt || 3) * 1.8) : (p.gt || 3);
    const gs = p.guns > 1 ? [-p.gw, p.gw] : [0];
    for (const gy of gs) line(p.r * 0.4, gy, len, gy, gt, '#15150f');
    ctx.fillStyle = ch; circle(0, 0, p.r);
    ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.arc(0, 0, p.r, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,.3)'; circle(-p.r * 0.25, 0, p.r * 0.38);
    ctx.fillStyle = cb; circle(-p.r * 0.25, 0, p.r * 0.28);
    if (u.flash > 0 && p === d.tur[0]) {
      ctx.fillStyle = '#fff1b8';
      for (const gy of gs) circle(len + 2.5, gy, Math.max(1.6, p.r * 0.3));
      ctx.fillStyle = 'rgba(255,200,90,.6)'; circle(len + 5.5, gs[0], Math.max(1.2, p.r * 0.2));
    }
    ctx.restore();
  }
  if (u.flash > 0 && !(d.tur && d.tur.length) && d.fl) {
    const f = d.fl.length > 1 ? (u.gun > 0 ? d.fl[0] : d.fl[1]) : d.fl[0], fs = d.fs || 2.2;
    ctx.fillStyle = '#fff1b8'; circle(f[0], f[1], fs);
    ctx.fillStyle = 'rgba(255,200,90,.6)'; circle(f[0] + fs * 1.1, f[1], fs * 0.65);
  }
  if (u.flash2 > 0 && d.mgf) { ctx.fillStyle = '#fff1b8'; for (const f of d.mgf) circle(f[0], f[1], 1.5); }
}

export function drawTank(u) {
  if (u.type === 'char2c') { drawChar2C(u, NAT[G.nation[u.side]]); return; }
  if (u.type === 'tsar') { drawTsar(u, NAT[G.nation[u.side]]); return; }
  if (u.T.draw) { drawTankGen(u, NAT[G.nation[u.side]]); return; }
  const n = G.nation[u.side], N = NAT[n];
  if (n === 'gb') drawMkV(u, N);
  else if (n === 'de') drawA7V(u, N);
  else if (n === 'fr') drawFT(u, N);
  else if (n === 'us') drawLiberty(u, N);
  else if (n === 'ah') drawSkoda(u, N);
  else drawVez(u, N);
}

export function drawWreck(w) {
  const n = w.nat;
  ctx.fillStyle = '#17150f';
  if (w.d) {
    const L = w.d.L, W = w.d.W;
    ctx.fillStyle = 'rgba(0,0,0,.3)'; oval(2, 4, L + 4, W + 4);
    ctx.fillStyle = '#17150f'; ctx.fillRect(-L, -W, 2 * L, 2 * W);
    ctx.fillStyle = '#2b261c'; ctx.fillRect(-L * 0.62, -W * 0.5, L * 1.15, W);
    ctx.fillStyle = '#0c0b08'; circle(-L * 0.12, W * 0.05, W * 0.36); circle(L * 0.38, -W * 0.12, W * 0.22);
    if (w.t < 8) {
      ctx.fillStyle = Math.random() < 0.5 ? '#ff9a3a' : '#ffd060';
      circle(-L * 0.12, W * 0.05, W * 0.16 + Math.random() * 2); circle(L * 0.38, -W * 0.12, W * 0.08 + Math.random());
    }
    return;
  }
  if (n === 'tsar') {
    ctx.fillStyle = 'rgba(0,0,0,.3)'; oval(0, 7, 56, 40);
    ctx.fillStyle = '#17150f';
    ctx.fillRect(-23, -35, 70, 6.5); ctx.fillRect(-23, 28.5, 70, 6.5); ctx.fillRect(9, -29, 6, 58); ctx.fillRect(-10, -13, 34, 26);
    ctx.beginPath(); ctx.moveTo(-8, -8); ctx.lineTo(-50, -3.6); ctx.lineTo(-50, 3.6); ctx.lineTo(-8, 8); ctx.fill();
    ctx.fillStyle = '#2b261c'; ctx.fillRect(-6, -9, 26, 18);
    ctx.fillStyle = '#0c0b08'; circle(8, 0, 8); circle(-3, 3, 4);
    if (w.t < 10) {
      ctx.fillStyle = Math.random() < 0.5 ? '#ff9a3a' : '#ffd060';
      circle(8, 0, 3.4 + Math.random() * 2); circle(-3, 3, 1.6 + Math.random());
    }
    return;
  }
  if (n === 'fr') {
    ctx.fillStyle = 'rgba(0,0,0,.3)'; oval(2, 3, 16, 10);
    ctx.fillStyle = '#17150f';
    ctx.fillRect(-13, -8, 27, 16);
    ctx.fillStyle = '#2b261c'; ctx.fillRect(-9, -3.5, 18, 7);
    ctx.fillStyle = '#0c0b08'; circle(1, 0, 3.6);
    if (w.t < 8) { ctx.fillStyle = Math.random() < 0.5 ? '#ff9a3a' : '#ffd060'; circle(1, 0, 1.6 + Math.random() * 1.2); }
    return;
  }
  ctx.fillStyle = 'rgba(0,0,0,.3)'; oval(3, 4.5, 26, 16);
  ctx.fillStyle = '#17150f';
  if (n === 'us') {
    ctx.fillRect(-30, -13.5, 60, 27);
    for (const sd of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(-8, sd * 12); ctx.lineTo(-5, sd * 19.5); ctx.lineTo(10, sd * 19.5); ctx.lineTo(14, sd * 12); ctx.fill();
    }
  } else if (n === 'gb') {
    ctx.fillRect(-23, -11.5, 46, 23);
    for (const sd of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(-7, sd * 10); ctx.lineTo(-5, sd * 16); ctx.lineTo(6, sd * 16); ctx.lineTo(9, sd * 10); ctx.fill();
    }
  } else {
    ctx.beginPath();
    ctx.moveTo(-22, -8); ctx.lineTo(-18, -12.5); ctx.lineTo(18, -12.5); ctx.lineTo(23, -6);
    ctx.lineTo(23, 6); ctx.lineTo(18, 12.5); ctx.lineTo(-18, 12.5); ctx.lineTo(-22, 8); ctx.fill();
  }
  ctx.fillStyle = '#2b261c'; ctx.fillRect(-14, -5, 24, 10);
  ctx.fillStyle = '#0c0b08'; circle(-3, 1, 5); circle(8, -2, 3.4);
  if (w.t < 8) {
    ctx.fillStyle = Math.random() < 0.5 ? '#ff9a3a' : '#ffd060';
    circle(-3, 1, 2.4 + Math.random() * 1.5); circle(8, -2, 1.4 + Math.random());
  }
}
