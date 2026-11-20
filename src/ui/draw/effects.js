// Transient battle effects: smoke, shells, planes, warnings, aim, tracers, booms, floats.
import { circle, line, ctx } from './helpers.js';
import { G } from '../../sim/state.js';
import { GUNS } from '../../data/guns.js';
import { gunMaxX } from '../../sim/gun.js';
import { validDrop } from '../../sim/drop.js';
import { WH } from '../../data/units.js';

function capShape(col, main) {
  ctx.fillStyle = col; ctx.fillRect(-5, -31, 11, 62);
  ctx.beginPath(); ctx.ellipse(8, 0, 9, 3, 0, 0, Math.PI * 2); ctx.fill();
  for (const sd of [-1, 1]) { ctx.beginPath(); ctx.ellipse(2, sd * 13, 6, 2.4, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillRect(-28, -11, 6, 22);
  ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath();
  ctx.moveTo(-5, -9); ctx.lineTo(-26, -9); ctx.moveTo(-5, 9); ctx.lineTo(-26, 9); ctx.stroke();
  if (!main) return;
  ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 0.8; ctx.strokeRect(-5, -31, 11, 62);
  ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(-5, -31, 2, 62);
  ctx.strokeStyle = 'rgba(0,0,0,.22)'; ctx.lineWidth = 0.7; ctx.beginPath();
  for (let y = -25; y <= 25; y += 10) { ctx.moveTo(-5, y); ctx.lineTo(6, y); }
  ctx.stroke();
  ctx.fillStyle = '#9c9478'; ctx.beginPath(); ctx.ellipse(8, 0, 9, 3, 0, 0, Math.PI * 2); ctx.fill();
  for (const sd of [-1, 1]) { ctx.beginPath(); ctx.ellipse(2, sd * 13, 6, 2.4, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = '#3a3a30'; circle(14.5, 0, 1.8); circle(7.5, -13, 1.5); circle(7.5, 13, 1.5);
  ctx.fillStyle = '#2e7d4f'; ctx.fillRect(-28, -11, 6, 7.3);
  ctx.fillStyle = '#ece7d6'; ctx.fillRect(-28, -3.7, 6, 7.4);
  ctx.fillStyle = '#b3261b'; ctx.fillRect(-28, 3.7, 6, 7.3);
}

export function drawSmoke(vis) {
  for (const p of G.smoke) {
    if (!vis(p.x)) continue;
    ctx.globalAlpha = Math.max(0, p.life / p.max) * (p.dark ? 0.55 : 0.32);
    ctx.fillStyle = p.dark ? '#14120e' : '#d8d2c0';
    circle(p.x, p.y, p.r);
  }
  ctx.globalAlpha = 1;
}

export function drawShells(vis) {
  for (const s of G.shells) {
    if (s.t < 0) continue;
    const q = s.t / s.dur, x = s.x0 + (s.x1 - s.x0) * q, y = s.y0 + (s.y1 - s.y0) * q;
    if (!vis(x)) continue;
    const h = Math.sin(q * Math.PI) * s.arc;
    if (s.huge) {
      ctx.fillStyle = 'rgba(0,0,0,.25)'; circle(x + h * 5, y + h * 7, 4 + h * 1.6);
      ctx.fillStyle = '#14140e'; circle(x, y, 3.4 + h * 3.4);
      ctx.fillStyle = '#3a3a30'; circle(x - 1, y - 1, 1.4);
      continue;
    }
    ctx.fillStyle = 'rgba(0,0,0,.25)'; circle(x + h * 5, y + h * 7, 1.6 + h * 0.8);
    ctx.fillStyle = '#14140e'; circle(x, y, 1.6 + h * 2);
  }
}

export function drawPlanes(vis) {
  for (const p of G.planes) {
    if (!vis(p.x)) continue;
    ctx.save(); ctx.translate(p.x + 9, p.y + 12); ctx.rotate(Math.PI / 2); capShape('rgba(0,0,0,.22)', false); ctx.restore();
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.PI / 2); capShape('#cfc7a8', true); ctx.restore();
  }
}

export function drawWarnings(vis) {
  for (const s of G.shells) {
    if (!s.huge || s.t < 0 || !vis(s.x1)) continue;
    const q = Math.min(1, s.t / s.dur), pulse = 0.55 + 0.45 * Math.sin(G.S.t * 9);
    ctx.fillStyle = 'rgba(224,88,62,' + (0.1 + 0.1 * q) + ')'; circle(s.x1, s.y1, s.splash);
    ctx.strokeStyle = 'rgba(224,88,62,' + (0.55 + 0.4 * pulse) + ')'; ctx.lineWidth = 2; ctx.setLineDash([9, 6]);
    ctx.beginPath(); ctx.arc(s.x1, s.y1, s.splash, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(255,200,120,.85)'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(s.x1, s.y1, Math.max(2, s.splash * (1 - q)), 0, Math.PI * 2); ctx.stroke();
    line(s.x1 - 8, s.y1, s.x1 + 8, s.y1, 1.4, 'rgba(255,200,120,.9)');
    line(s.x1, s.y1 - 8, s.x1, s.y1 + 8, 1.4, 'rgba(255,200,120,.9)');
  }
}

// Drop aim: faint outline on every valid trench, solid highlight on the chosen one.
function drawDropAim(aim) {
  for (let L = 1; L <= G.NT; L++) {
    if (!validDrop(0, L)) continue;
    const x = G.LX[L], on = L === aim.line;
    if (on) { ctx.fillStyle = 'rgba(226,185,59,.14)'; ctx.fillRect(x - 24, 0, 48, WH); }
    ctx.strokeStyle = on ? 'rgba(226,185,59,.95)' : 'rgba(226,185,59,.3)';
    ctx.lineWidth = on ? 2 : 1; ctx.setLineDash(on ? [10, 6] : [4, 6]);
    ctx.strokeRect(x - 24, 1, 48, WH - 2); ctx.setLineDash([]);
  }
}

export function drawAim() {
  const aim = G.aim;
  if (!aim) return;
  if (aim.kind === 'drop') { drawDropAim(aim); return; }
  let rad = 90;
  if (aim.kind === 'gun') {
    const gd = GUNS[G.nation[0]];
    if (gd) {
      const mx = gunMaxX(0);
      ctx.strokeStyle = 'rgba(226,185,59,.6)'; ctx.lineWidth = 1.5; ctx.setLineDash([8, 8]);
      ctx.beginPath(); ctx.moveTo(mx, 0); ctx.lineTo(mx, WH); ctx.stroke(); ctx.setLineDash([]);
      rad = Math.max(...gd.shells.map(s => s.splash)) + Math.max(...gd.shells.map(s => s.spread));
    }
  }
  if (aim.x === null) return;
  ctx.fillStyle = 'rgba(226,185,59,.12)'; circle(aim.x, aim.y, rad);
  ctx.strokeStyle = 'rgba(226,185,59,.95)'; ctx.lineWidth = 2; ctx.setLineDash([10, 6]);
  ctx.beginPath(); ctx.arc(aim.x, aim.y, rad, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
  ctx.beginPath(); ctx.arc(aim.x, aim.y, 5, 0, Math.PI * 2); ctx.stroke();
  line(aim.x - 18, aim.y, aim.x - 7, aim.y, 2, 'rgba(226,185,59,.95)');
  line(aim.x + 7, aim.y, aim.x + 18, aim.y, 2, 'rgba(226,185,59,.95)');
  line(aim.x, aim.y - 18, aim.x, aim.y - 7, 2, 'rgba(226,185,59,.95)');
  line(aim.x, aim.y + 7, aim.x, aim.y + 18, 2, 'rgba(226,185,59,.95)');
}

export function drawTracers(vis) {
  ctx.lineCap = 'round';
  for (const t of G.tracers) {
    if (!vis(t.x1) && !vis(t.x2)) continue;
    ctx.globalAlpha = Math.max(0, t.life / 0.08);
    line(t.x1, t.y1, t.x2, t.y2, t.w, t.col);
  }
  ctx.globalAlpha = 1;
}

export function drawBooms(vis) {
  for (const b of G.booms) {
    if (!vis(b.x)) continue;
    const q = 1 - b.life / b.max;
    ctx.globalAlpha = (1 - q) * 0.9;
    ctx.fillStyle = '#3a2c1c'; circle(b.x, b.y, b.r * (0.4 + q * 0.8));
    if (q < 0.45) { ctx.fillStyle = '#ffd98a'; circle(b.x, b.y, b.r * (0.55 - q)); }
    ctx.globalAlpha = 1;
  }
}

export function drawFloats(vis) {
  ctx.textAlign = 'center';
  ctx.font = '700 11px "American Typewriter","Courier New",monospace';
  for (const f of G.floats) {
    if (!vis(f.x)) continue;
    ctx.globalAlpha = Math.min(1, f.life * 2.5);
    ctx.fillStyle = 'rgba(20,20,14,.8)'; ctx.fillText(f.txt, f.x + 1, f.y + 1);
    ctx.fillStyle = '#f3d27a'; ctx.fillText(f.txt, f.x, f.y);
  }
  ctx.globalAlpha = 1;
}
