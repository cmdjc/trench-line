// Ground, decor, trenches, super trench, rivers, wire belts, HQ bases, flags.
import { circle, oval, line, at, bagArc, ctx, BAGD, TR } from './helpers.js';
import { WH, SEG, HEDGE, BW } from '../../data/units.js';
import { G, isDbl } from '../../sim/state.js';
import { NAT } from '../../data/nations.js';
import { decor } from '../../core/rng.js';
import { tunnelLines, exitX } from '../../sim/tunnel.js';

let patches = [];
let craters = [];

export function makeDecor() {
  patches = []; craters = [];
  const R = decor(1916), np = Math.round(110 * G.WW / 2600), nc = Math.round(170 * G.WW / 2600);
  for (let i = 0; i < np; i++) patches.push({ x: R() * G.WW, y: R() * WH, rx: 16 + R() * 40, ry: 9 + R() * 20, l: R() < 0.5 });
  for (let i = 0; i < nc; i++) {
    const x = 260 + R() * (G.WW - 520), y = 8 + R() * (WH - 16), r = 4 + R() * 9, w = R() < 0.35;
    let ok = true;
    for (let L = 1; L <= G.NT; L++) if (Math.abs(x - G.LX[L]) < r + (isDbl(L) ? 108 : 16)) ok = false;
    if (ok) craters.push({ x, y, r, w });
  }
}

export function drawGround(vis, v0, v1) {
  for (const p of patches) {
    if (p.x < v0 - 60 || p.x > v1 + 60) continue;
    ctx.fillStyle = p.l ? '#6b573b' : '#463625'; ctx.globalAlpha = 0.3; oval(p.x, p.y, p.rx, p.ry);
  }
  ctx.globalAlpha = 1;
  for (const c of craters) {
    if (!vis(c.x)) continue;
    ctx.fillStyle = '#6f5b3e'; circle(c.x, c.y, c.r + 2);
    ctx.fillStyle = '#3f3021'; circle(c.x + 0.8, c.y + 0.8, c.r);
    if (c.w) { ctx.fillStyle = '#565a50'; circle(c.x + 1, c.y + 1.2, c.r * 0.55); }
  }
  ctx.fillStyle = '#1a140d'; ctx.globalAlpha = 0.45;
  for (const s of G.scorch) if (vis(s.x)) circle(s.x, s.y, s.r);
  ctx.globalAlpha = 1;
}


export function drawTrench(cx, lv, sup) {
  ctx.lineJoin = 'miter'; ctx.lineCap = 'butt';
  ctx.beginPath(); ctx.moveTo(cx - 6, -14);
  for (let i = 0; i < 8; i++) {
    const x = cx + (i % 2 ? 6 : -6);
    ctx.lineTo(x, i * SEG); ctx.lineTo(x, (i + 1) * SEG);
  }
  if (sup) {
    ctx.strokeStyle = '#4b493f'; ctx.lineWidth = lv >= 4 ? 47 : 41; ctx.stroke();
    ctx.setLineDash([9, 2]); ctx.strokeStyle = lv >= 4 ? '#8b897e' : '#74726a'; ctx.lineWidth = lv >= 4 ? 45 : 39; ctx.stroke(); ctx.setLineDash([]);
  }
  if (lv >= 3) {
    ctx.strokeStyle = '#77756b'; ctx.lineWidth = 33; ctx.stroke();
    ctx.setLineDash([11, 1.5]); ctx.strokeStyle = '#9b998e'; ctx.lineWidth = 31.5; ctx.stroke(); ctx.setLineDash([]);
  }
  if (lv >= 1) {
    ctx.strokeStyle = BAGD; ctx.lineWidth = 27; ctx.stroke();
    ctx.setLineDash([5, 1.6]); ctx.strokeStyle = '#b3a176'; ctx.lineWidth = 26; ctx.stroke(); ctx.setLineDash([]);
  }
  ctx.strokeStyle = BAGD; ctx.lineWidth = 19; ctx.stroke();
  ctx.setLineDash([5, 1.6]); ctx.strokeStyle = '#a8966c'; ctx.lineWidth = 18; ctx.stroke(); ctx.setLineDash([]);
  if (lv >= 2) {
    ctx.strokeStyle = '#8c6a3a'; ctx.lineWidth = 14.5; ctx.stroke();
    ctx.setLineDash([1, 4]); ctx.strokeStyle = '#5d4523'; ctx.stroke(); ctx.setLineDash([]);
  }
  ctx.strokeStyle = TR; ctx.lineWidth = 11.5; ctx.stroke();
  ctx.setLineDash([2, 3]); ctx.strokeStyle = 'rgba(125,100,66,.5)'; ctx.lineWidth = 4; ctx.stroke(); ctx.setLineDash([]);
  if (lv >= 3) for (const i of [2, 5]) {
    const x = cx + (i % 2 ? 6 : -6), y = (i + 0.5) * SEG;
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(x - 9, y - 8, 22, 20);
    ctx.fillStyle = '#8b897f'; ctx.fillRect(x - 11, y - 10, 22, 20);
    ctx.fillStyle = '#a3a196'; ctx.fillRect(x - 8, y - 7, 16, 14);
    ctx.fillStyle = '#14140e'; ctx.fillRect(x - 11.5, y - 2, 3, 4); ctx.fillRect(x + 8.5, y - 2, 3, 4);
  }
}

const SDEC = [
  [-66, 20, 0], [-58, 27, 0], [-70, 64, 1], [-63, 70, 1], [-64, 121, 2], [-68, 180, 3], [-60, 236, 0], [-70, 243, 0], [-64, 284, 1],
  [62, 14, 3], [66, 64, 0], [60, 121, 1], [68, 127, 1], [64, 180, 0], [57, 187, 0], [66, 236, 2], [62, 288, 0]
];

export function drawSuper(cx, lv) {
  ctx.fillStyle = 'rgba(38,28,17,.4)'; ctx.fillRect(cx - 80, -10, 160, WH + 20);
  ctx.strokeStyle = 'rgba(125,100,66,.35)'; ctx.lineWidth = 5; ctx.setLineDash([2, 4]); ctx.beginPath();
  for (const o of [-44, 44]) { ctx.moveTo(cx + o, -10); ctx.lineTo(cx + o, WH + 10); }
  ctx.stroke(); ctx.setLineDash([]);
  for (const d of SDEC) {
    const x = cx + d[0], y = d[1];
    if (d[2] === 0) {
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(x - 4, y - 3, 11, 10);
      ctx.fillStyle = '#6b5433'; ctx.fillRect(x - 5.5, y - 5, 11, 10);
      ctx.fillStyle = '#8a7146'; ctx.fillRect(x - 4, y - 3.5, 8, 7);
      ctx.strokeStyle = 'rgba(40,28,14,.6)'; ctx.lineWidth = 0.7;
      ctx.beginPath(); ctx.moveTo(x - 4, y); ctx.lineTo(x + 4, y); ctx.stroke();
    } else if (d[2] === 1) {
      ctx.fillStyle = 'rgba(0,0,0,.25)'; circle(x + 1.5, y + 2, 3.6);
      ctx.fillStyle = '#3c4032'; circle(x, y, 3.6);
      ctx.fillStyle = '#565b47'; circle(x, y, 2);
    } else if (d[2] === 2) {
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(x - 8, y - 9, 20, 22);
      ctx.fillStyle = '#6f6a45'; ctx.fillRect(x - 10, y - 11, 20, 22);
      ctx.fillStyle = '#8a8456'; ctx.fillRect(x - 10, y - 11, 10, 22);
      ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(x, y - 11); ctx.lineTo(x, y + 11); ctx.stroke();
    } else {
      ctx.fillStyle = '#4a3b28'; ctx.fillRect(x - 7, y - 5, 14, 10);
      ctx.fillStyle = '#b7b3a3';
      for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) circle(x - 4.5 + i * 3, y - 2 + j * 4, 1.3);
    }
  }
  ctx.lineCap = 'round';
  for (const sd of [-1, 1]) for (let r = 0; r < 2; r++) for (let y = 9 + r * 11; y < WH; y += 22) {
    const x = cx + sd * (HEDGE - 4 + r * 9);
    ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(x - 3, y - 2); ctx.lineTo(x + 7, y + 6); ctx.moveTo(x + 7, y - 2); ctx.lineTo(x - 3, y + 6); ctx.stroke();
    ctx.strokeStyle = '#2c2f2e'; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(x - 5, y - 5); ctx.lineTo(x + 5, y + 5); ctx.moveTo(x + 5, y - 5); ctx.lineTo(x - 5, y + 5); ctx.moveTo(x, y - 6); ctx.lineTo(x, y + 6); ctx.stroke();
    ctx.strokeStyle = '#7d8582'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(x - 4.4, y - 5); ctx.lineTo(x + 4.4, y + 3.8); ctx.moveTo(x - 0.7, y - 5.6); ctx.lineTo(x - 0.7, y + 5); ctx.stroke();
  }
  drawTrench(cx - 14, lv); drawTrench(cx + 14, lv);
  ctx.lineJoin = 'miter'; ctx.lineCap = 'butt';
  ctx.beginPath(); ctx.moveTo(cx - 6, -14);
  for (let i = 0; i < 8; i++) {
    const x = cx + (i % 2 ? 6 : -6);
    ctx.lineTo(x, i * SEG); ctx.lineTo(x, (i + 1) * SEG);
  }
  ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = 9; ctx.stroke();
  ctx.strokeStyle = '#6c6a60'; ctx.lineWidth = 7; ctx.stroke();
  ctx.setLineDash([10, 1.5]); ctx.strokeStyle = '#a09e93'; ctx.lineWidth = 5; ctx.stroke(); ctx.setLineDash([]);
  for (const i of [1, 4, 6]) {
    const x = cx + (i % 2 ? 6 : -6), y = (i + 0.5) * SEG;
    ctx.fillStyle = TR; ctx.fillRect(x - 9, y - 3.5, 18, 7);
    ctx.fillStyle = '#8c6a3a'; ctx.fillRect(x - 9, y - 4.5, 18, 1.2); ctx.fillRect(x - 9, y + 3.3, 18, 1.2);
  }
}

export function drawRivers(vis) {
  for (const r of G.RIV) {
    if (!vis(r.x0) && !vis(r.x1)) continue;
    const wav = (x, ph) => {
      ctx.beginPath(); ctx.moveTo(x, -10);
      for (let y = -10; y <= WH + 10; y += 12) ctx.lineTo(x + Math.sin(y * 0.045 + ph) * 4, y);
    };
    ctx.fillStyle = '#3d3022'; ctx.beginPath(); ctx.moveTo(r.x0 - 7, -10);
    for (let y = -10; y <= WH + 10; y += 12) ctx.lineTo(r.x0 - 7 + Math.sin(y * 0.045) * 4, y);
    for (let y = WH + 10; y >= -10; y -= 12) ctx.lineTo(r.x1 + 7 + Math.sin(y * 0.045 + 2) * 4, y);
    ctx.fill();
    ctx.fillStyle = '#4b6876'; ctx.beginPath(); ctx.moveTo(r.x0, -10);
    for (let y = -10; y <= WH + 10; y += 12) ctx.lineTo(r.x0 + Math.sin(y * 0.045) * 4, y);
    for (let y = WH + 10; y >= -10; y -= 12) ctx.lineTo(r.x1 + Math.sin(y * 0.045 + 2) * 4, y);
    ctx.fill();
    ctx.strokeStyle = 'rgba(200,222,228,.28)'; ctx.lineWidth = 1;
    const drift = (G.S.t * 5) % 40;
    for (let k = 0; k < 3; k++) {
      const x = r.x0 + 14 + k * 22;
      ctx.setLineDash([14, 26]); ctx.lineDashOffset = -drift - k * 13; wav(x, k); ctx.stroke();
    }
    ctx.setLineDash([]); ctx.lineDashOffset = 0;
    for (const by of r.b) {
      const bx0 = r.x0 - 10, bw = r.x1 - r.x0 + 20, bh = BW * 2 + 12;
      ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(bx0 + 3, by - bh / 2 + 4, bw, bh);
      ctx.fillStyle = '#7a6038'; ctx.fillRect(bx0, by - bh / 2, bw, bh);
      ctx.strokeStyle = 'rgba(40,28,14,.55)'; ctx.lineWidth = 0.7; ctx.beginPath();
      for (let x = bx0 + 5; x < bx0 + bw; x += 5) { ctx.moveTo(x, by - bh / 2); ctx.lineTo(x, by + bh / 2); }
      ctx.stroke();
      ctx.fillStyle = '#4f3d22'; ctx.fillRect(bx0, by - bh / 2 - 2, bw, 3); ctx.fillRect(bx0, by + bh / 2 - 1, bw, 3);
    }
  }
}

export function drawWireBelts(vis) {
  for (let L = 1; L < G.NT; L++) {
    const wx = (G.LX[L] + G.LX[L + 1]) / 2;
    if (!vis(wx) || G.RIV.some(r => wx > r.x0 && wx < r.x1)) continue;
    ctx.strokeStyle = '#221c15'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(wx, -6);
    for (let y = -6, i = 0; y < WH + 10; y += 5, i++) ctx.lineTo(wx + (i % 2 ? 2.6 : -2.6), y);
    ctx.stroke();
    ctx.fillStyle = '#3a2a1a';
    for (let y = 10; y < WH; y += 22) ctx.fillRect(wx - 1.4, y - 1.4, 2.8, 2.8);
  }
}

export function flag(n, x, y) {
  const w = 24, h = 15;
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(x + 3, y + 3, w, h);
  if (n === 'de') {
    ctx.fillStyle = '#16160f'; ctx.fillRect(x, y, w, h / 3);
    ctx.fillStyle = '#ece7d6'; ctx.fillRect(x, y + h / 3, w, h / 3);
    ctx.fillStyle = '#b3261b'; ctx.fillRect(x, y + h * 2 / 3, w, h / 3);
  } else if (n === 'ru') {
    ctx.fillStyle = '#ece7d6'; ctx.fillRect(x, y, w, h / 3);
    ctx.fillStyle = '#2a4a9a'; ctx.fillRect(x, y + h / 3, w, h / 3);
    ctx.fillStyle = '#b3261b'; ctx.fillRect(x, y + h * 2 / 3, w, h / 3);
  } else if (n === 'ah') {
    ctx.fillStyle = '#16160f'; ctx.fillRect(x, y, w, h / 2);
    ctx.fillStyle = '#e2b93b'; ctx.fillRect(x, y + h / 2, w, h / 2);
  } else if (n === 'us') {
    for (let i = 0; i < 7; i++) { ctx.fillStyle = i % 2 ? '#ece7d6' : '#b3261b'; ctx.fillRect(x, y + i * h / 7, w, h / 7 + 0.2); }
    ctx.fillStyle = '#22336b'; ctx.fillRect(x, y, w * 0.45, h * 4 / 7);
    ctx.fillStyle = '#ece7d6';
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) ctx.fillRect(x + 2 + c * 3.2, y + 1.3 + r * 2.6, 1, 1);
  } else if (n === 'aq') {
    ctx.fillStyle = '#4a7fb0'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#f2f6f9'; ctx.beginPath();
    ctx.ellipse(x + w * 0.5, y + h * 0.52, w * 0.27, h * 0.33, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(x + w * 0.18, y + h * 0.62, w * 0.14, h * 0.2);
  } else if (n === 'it') {
    ctx.fillStyle = '#2e7d4f'; ctx.fillRect(x, y, w / 3, h);
    ctx.fillStyle = '#ece7d6'; ctx.fillRect(x + w / 3, y, w / 3, h);
    ctx.fillStyle = '#b3261b'; ctx.fillRect(x + w * 2 / 3, y, w / 3, h);
  } else if (n === 'fr') {
    ctx.fillStyle = '#2a4a9a'; ctx.fillRect(x, y, w / 3, h);
    ctx.fillStyle = '#ece7d6'; ctx.fillRect(x + w / 3, y, w / 3, h);
    ctx.fillStyle = '#b3261b'; ctx.fillRect(x + w * 2 / 3, y, w / 3, h);
  } else if (n === 'sx') {
    ctx.fillStyle = '#ece7d6'; ctx.fillRect(x, y, w, h / 2);
    ctx.fillStyle = '#2e6b3a'; ctx.fillRect(x, y + h / 2, w, h / 2);
    ctx.fillStyle = '#1f2124'; ctx.fillRect(x, y, 6, h);
  } else {
    ctx.fillStyle = '#22336b'; ctx.fillRect(x, y, w, h);
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.lineCap = 'butt';
    line(x, y, x + w, y + h, 3.6, '#ece7d6'); line(x, y + h, x + w, y, 3.6, '#ece7d6');
    line(x, y, x + w, y + h, 1.3, '#b3261b'); line(x, y + h, x + w, y, 1.3, '#b3261b');
    ctx.fillStyle = '#ece7d6'; ctx.fillRect(x + w / 2 - 3, y, 6, h); ctx.fillRect(x, y + h / 2 - 3, w, 6);
    ctx.fillStyle = '#b3261b'; ctx.fillRect(x + w / 2 - 1.6, y, 3.2, h); ctx.fillRect(x, y + h / 2 - 1.6, w, 3.2);
    ctx.restore();
  }
  line(x, y - 2, x, y + h + 10, 1.6, '#1b1b14');
}

// Extra HQ layers per upgrade tier; nothing is drawn at tier 0.
function upgrades(B, nation) {
  if (!B) return;
  if (B.walls >= 1) bagArc(0, 0, 88, -Math.PI * 0.36, Math.PI * 0.36);
  if (B.walls >= 2) bagArc(0, 0, 112, -Math.PI * 0.34, Math.PI * 0.34);
  if (B.walls >= 3) {
    ctx.lineCap = 'butt'; ctx.beginPath(); ctx.arc(0, 0, 94, -Math.PI * 0.3, Math.PI * 0.3);
    ctx.strokeStyle = '#8c8a80'; ctx.lineWidth = 4; ctx.stroke();
  }
  for (let i = 0; i < B.depot; i++) {
    const x = -34 + i * 20;
    ctx.fillStyle = '#6b5433'; ctx.fillRect(x, -88, 16, 14); ctx.fillRect(x + 2, -100, 12, 12);
    ctx.fillStyle = '#8a7146'; ctx.fillRect(x + 2, -86, 12, 4); ctx.fillRect(x + 4, -98, 8, 4);
  }
  for (let i = 0; i < B.hosp; i++) {
    const x = -30 + i * 28;
    ctx.fillStyle = '#c9c3a8'; ctx.beginPath(); ctx.moveTo(x - 12, 100); ctx.lineTo(x, 80); ctx.lineTo(x + 12, 100); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#8a8670'; ctx.fillRect(x - 1, 90, 2, 10);
    if (i === 0) { ctx.fillStyle = '#a3301b'; ctx.fillRect(x - 1.5, 83, 3, 9); ctx.fillRect(x - 4.5, 86, 9, 3); }
  }
  if (B.nat > 0) {
    const w = 12 + B.nat * 8, h = 10 + B.nat * 8, x = -62 - w, y = -h / 2;
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(x + 3, y + 3, w, h);
    ctx.fillStyle = '#807e74'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = NAT[nation].hat; ctx.fillRect(x, y, w, 5);
    ctx.fillStyle = '#14140e'; ctx.fillRect(x + w / 2 - 2, y + h - 8, 4, 8);
    for (let i = 1; i < B.nat; i++) ctx.fillRect(x + 4 + (i - 1) * 10, y + 8, 3, 4);
  }
}

export function drawBase(s) {
  const b = G.bases[s];
  at(b.x, WH / 2, s === 1, () => {
    ctx.fillStyle = 'rgba(30,22,14,.35)'; oval(0, 0, 110, 150);
    bagArc(0, 0, 100, -Math.PI * 0.42, Math.PI * 0.42);
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(-36, -44, 66, 96);
    ctx.fillStyle = '#807e74'; ctx.fillRect(-42, -50, 66, 96);
    ctx.fillStyle = '#96948a'; ctx.fillRect(-36, -44, 48, 84);
    ctx.fillStyle = '#14140e';
    for (let i = -1; i <= 1; i++) ctx.fillRect(19, i * 26 - 4, 6, 8);
    ctx.fillStyle = '#6b5433'; ctx.fillRect(-78, -96, 14, 11); ctx.fillRect(-62, -88, 12, 10); ctx.fillRect(-74, 82, 16, 12);
    ctx.fillStyle = '#8a7146'; ctx.fillRect(-76, -94, 10, 7);
    ctx.lineCap = 'round'; ctx.fillStyle = '#17170f'; ctx.fillRect(-8, 104, 6, 3.5); ctx.fillRect(-8, 117, 6, 3.5);
    line(-18, 112, -4, 112, 2.4, '#2c2c1e'); line(-4, 112, 14, 112, 2.8, '#2c2c1e');
    upgrades(G.base[s], G.nation[s]);
    if (b.hp < b.max * 0.5) { ctx.fillStyle = 'rgba(20,14,8,.55)'; circle(-20, -14, 14); circle(0, 22, 10); }
  });
  flag(G.nation[s], b.x + (s ? 28 : -52), WH / 2 - 104);
}

/* tunnel mouths: a dark arch with timber props just behind each tunnel trench (Long March); a faint ring where
   units in transit will come out */
export function drawTunnels(vis) {
  for (const T of tunnelLines()) {
    const fwd = T * 2 < G.HQI ? 1 : -1, x = G.LX[T] - fwd * 36, y = WH / 2 - 14;
    if (!vis(x)) continue;
    ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(x - 15, y - 12, 34, 34);
    ctx.fillStyle = '#5b4a30'; ctx.fillRect(x - 17, y - 14, 34, 34);
    ctx.fillStyle = '#12100b';
    ctx.beginPath(); ctx.moveTo(x - 11, y + 18); ctx.lineTo(x - 11, y + 2); ctx.arc(x, y + 2, 11, Math.PI, 0); ctx.lineTo(x + 11, y + 18); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#8c6a3a'; ctx.fillRect(x - 14, y - 12, 4, 32); ctx.fillRect(x + 10, y - 12, 4, 32); ctx.fillRect(x - 14, y - 12, 28, 4);
    ctx.fillStyle = '#6a4f2a'; ctx.fillRect(x - 14, y + 18, 28, 2);
    for (const side of [0, 1]) {
      if (!G.units.some(u => u.tunnel && u.tunnel.exit === T && u.side === side)) continue;
      ctx.strokeStyle = 'rgba(232,194,90,.35)'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.arc(exitX(side, T), WH / 2, 12, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    }
  }
}
