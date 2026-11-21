// Frame orchestration: camera transform, visibility culling, draw order.
import { bus } from '../../core/events.js';
import { G, isDbl } from '../../sim/state.js';
import { isTrench, posX } from '../../sim/geometry.js';
import { NAT } from '../../data/nations.js';
import { WH } from '../../data/units.js';
import { cam, vw, metrics } from '../camera.js';
import { ctx, setCtx, circle, at, bagArc, TR } from './helpers.js';
import { makeDecor, drawGround, drawRivers, drawWireBelts, drawTrench, drawSuper, drawBase } from './terrain.js';
import { drawTrack, drawTrains } from './rail.js';
import { drawSoldier } from './men.js';
import { drawTank, drawWreck } from './tanks.js';
import {
  drawSmoke, drawShells, drawPlanes, drawWarnings, drawAim, drawTracers, drawBooms, drawFloats
} from './effects.js';

let v0 = 0, v1 = 0;
export function vis(x) { return x > v0 && x < v1; }

// decor is regenerated whenever a new battle starts (prototype called it in newGame)
bus.on('game:start', makeDecor);

export function draw() {
  if (!ctx) {
    const cv = document.getElementById('field');
    if (!cv) return;
    setCtx(cv.getContext('2d'));
    if (!ctx) return;
  }
  const { CW, CH, DPR, K } = metrics();
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.fillStyle = '#5a4834'; ctx.fillRect(0, 0, CW, CH);
  if (!G.S) return;
  ctx.save();
  ctx.scale(K, K);
  const jx = G.shake > 0 ? (Math.random() - 0.5) * G.shake : 0;
  const jy = G.shake > 0 ? (Math.random() - 0.5) * G.shake : 0;
  ctx.translate(-cam.x + jx, jy);
  v0 = cam.x - 70; v1 = cam.x + vw() + 70;
  drawGround(vis, v0, v1);
  drawRivers(vis);
  drawWireBelts(vis);
  if (vis(G.bases[0].x + 60) || vis(G.bases[0].x - 60)) drawBase(0);
  if (vis(G.bases[1].x + 60) || vis(G.bases[1].x - 60)) drawBase(1);
  for (let L = 1; L <= G.NT; L++) {
    if (!vis(G.LX[L])) continue;
    const so = isDbl(L) ? 15 : 0;
    if (so) drawSuper(G.LX[L], G.fort[L]);
    else drawTrench(G.LX[L], G.fort[L], L === G.SUPER);
    ctx.fillStyle = '#e8c25a';
    for (let i = 0; i < G.fort[L]; i++) ctx.fillRect(G.LX[L] + 27 + so + i * 6, WH - 13, 4, 7);
    if (G.owner[L] >= 0) {
      const N = NAT[G.nation[G.owner[L]]];
      ctx.fillStyle = '#1b1b14'; ctx.fillRect(G.LX[L] - 17 - so, 4, 1.6, 15);
      ctx.fillStyle = N.body; ctx.beginPath();
      ctx.moveTo(G.LX[L] - 15.4 - so, 4); ctx.lineTo(G.LX[L] - 3 - so, 8); ctx.lineTo(G.LX[L] - 15.4 - so, 12); ctx.fill();
    }
    ctx.fillStyle = 'rgba(241,235,213,.85)';
    ctx.font = '700 11px "American Typewriter","Courier New",monospace';
    ctx.textAlign = 'center';
    ctx.fillText(L, G.LX[L] + 20 + so, WH - 6);
    if (L === G.SUPER) { ctx.fillStyle = '#e8c25a'; ctx.fillText('SUPER TRENCH', G.LX[L] + 20, WH - 32); }
  }
  drawTrack(vis);
  // selected line
  if (G.running) {
    const sx = isTrench(G.sel) ? G.LX[G.sel] : posX(0, G.sel, 150, false), hw = isDbl(G.sel) ? 32 : 17;
    if (vis(sx)) {
      ctx.strokeStyle = '#e8c25a'; ctx.lineWidth = 1.4; ctx.setLineDash([6, 5]);
      ctx.beginPath();
      ctx.moveTo(sx - hw, 0); ctx.lineTo(sx - hw, WH);
      ctx.moveTo(sx + hw, 0); ctx.lineTo(sx + hw, WH);
      ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#e8c25a';
      for (const y of [8, WH - 22]) {
        ctx.beginPath();
        ctx.moveTo(sx + hw + 4, y); ctx.lineTo(sx + hw + 13, y + 5); ctx.lineTo(sx + hw + 4, y + 10); ctx.fill();
      }
    }
  }
  // fields: wire belts and minefields
  for (const f of G.fields) {
    if (!vis(f.x)) continue;
    if (f.type === 'wire') {
      ctx.strokeStyle = '#1d1812'; ctx.lineWidth = 0.9;
      for (let r = -2; r <= 2; r++) {
        const wx = f.x + r * 9;
        ctx.beginPath(); ctx.moveTo(wx, -6);
        for (let y = -6, i = 0; y < WH + 10; y += 4.5, i++) ctx.lineTo(wx + ((i + r) % 2 ? 3.6 : -3.6), y);
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(190,190,180,.35)'; ctx.lineWidth = 0.6; ctx.beginPath();
      for (let y = 4; y < WH; y += 14) { ctx.moveTo(f.x - 20, y); ctx.lineTo(f.x + 20, y + 7); }
      ctx.stroke();
      ctx.fillStyle = '#3a2a1a';
      for (let r = -2; r <= 2; r += 2) for (let y = 9 + (r + 2) * 4; y < WH; y += 19) ctx.fillRect(f.x + r * 9 - 1.5, y - 1.5, 3, 3);
    } else if (f.side === 0) {
      for (const mn of f.mines) {
        if (!mn.live) continue;
        ctx.fillStyle = '#2a251a'; circle(mn.x, mn.y, 2.6);
        ctx.fillStyle = '#7c7458'; circle(mn.x, mn.y, 1.1);
      }
    }
  }
  // emplacement construction ghosts
  for (const j of G.jobs) {
    if (!vis(j.x)) continue;
    const c0 = j.side ? Math.PI : 0;
    ctx.strokeStyle = 'rgba(232,194,90,.7)'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.arc(j.x, j.y, 12, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    if (j.stage >= 1) {
      const f = j.stage >= 2 ? 1 : Math.min(1, j.t2 / 3);
      ctx.fillStyle = TR; circle(j.x, j.y, 10 * f);
      bagArc(j.x, j.y, 11.5, c0 - Math.PI * 0.74 * f, c0 + Math.PI * 0.74 * f);
    }
  }
  for (const w of G.wrecks) if (vis(w.x)) at(w.x, w.y, w.side === 1, () => drawWreck(w));
  for (const u of G.units) {
    if (u.T.armor && vis(u.x)) {
      at(u.x, u.y, u.side === 1, () => { if (u.scale) ctx.scale(u.scale, u.scale); drawTank(u); });
      const bw = u.T.bar ? u.T.bar[0] : 30, by = u.T.bar ? u.T.bar[1] : -23;
      ctx.fillStyle = 'rgba(20,20,14,.75)'; ctx.fillRect(u.x - bw / 2 - 1, u.y + by - 1, bw + 2, 4);
      ctx.fillStyle = u.side ? '#e0583e' : '#9fc05a';
      ctx.fillRect(u.x - bw / 2, u.y + by, bw * Math.max(0, u.hp / u.max), 2);
    }
  }
  drawTrains(vis);
  for (const u of G.units) {
    if (!u.T.armor && !u.riding && vis(u.x) && !(u.shelter && u.shelter.hp > 0 && u.settled)) at(u.x, u.y, u.side === 1, () => drawSoldier(u));
  }
  drawSmoke(vis);
  drawShells(vis);
  drawPlanes(vis);
  drawWarnings(vis);
  drawAim();
  drawTracers(vis);
  drawBooms(vis);
  drawFloats(vis);
  ctx.restore();
}
