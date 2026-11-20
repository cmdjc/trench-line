// HUD: toast, trench strip, stats and order buttons (prototype 1383–1448).
// Button clicks go through sim/commands; camera focus stays here.

import { SW } from '../data/superweapons.js';
import { NAT } from '../data/nations.js';
import { MAPS } from '../data/maps.js';
import { CARDS } from '../data/cards.js';
import { FORT_COST, GARR_T, DBL_RATE, SUPER_CARD_T, maxFort } from '../data/units.js';
import { G, incomeNow, isDbl, fmt, nestCost } from '../sim/state.js';
import { isTrench, count, countAt, anyTank, tanks, cost, full } from '../sim/geometry.js';
import { infCap, tier, nextCost } from '../sim/base.js';
import { BASE, baseIds, TUNNEL_T } from '../data/base.js';
import { freeSlot, canDef } from '../sim/fortify.js';
import { swBlock, swCost } from '../sim/superweapons.js';
import * as commands from '../sim/commands.js';
import { $ } from './dom.js';
import { focusLine } from './camera.js';

let toastT = null;
export function toast(msg) {
  const el = $('toast'); el.textContent = msg; el.classList.add('on');
  clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), 3600);
}

let lastSel = -1;
export function buildMap() {
  let h = ''; const per = (MAPS[G.MAP] && MAPS[G.MAP].per) || 0;
  for (let L = 0; L <= G.HQI; L++) h += '<button data-line="' + L + '" aria-pressed="false"' + (per && L > 1 && L <= G.NT && (L - 1) % per === 0 ? ' class="gap"' : '') + '><b>' + (L === 0 || L === G.HQI ? 'HQ' : (L === G.SUPER || isDbl(L) ? '\u2605' : '') + L) + '</b><span class="me"></span><br><span class="foe"></span><i class="pips"></i></button>';
  const m = $('map'); m.innerHTML = h; m.classList.toggle('long', G.NT > 9); lastSel = -1;
}

let baseKey = '';
function refreshBase() {
  const el = $('basePanel'), show = G.sel === 0;
  el.hidden = !show;
  if (!show) return;
  const nation = G.nation[0], ids = baseIds(nation), key = G.MAP + nation;
  if (key !== baseKey || el.children.length !== ids.length) {   // rebuild only when the rows change, so focus stays on a clicked button
    baseKey = key;
    el.innerHTML = ids.map(id => '<div class="brow"><h3>' + BASE[id].name + ' <span class="tier"></span></h3><p></p><button data-base="' + id + '"></button></div>').join('');
  }
  ids.forEach((id, i) => {
    const key = id === nation ? 'nat' : id, t = tier(0, key), c = nextCost(0, key), row = el.children[i];
    row.querySelector('.tier').textContent = 'Tier ' + t + ' of 3';
    row.querySelector('p').textContent = c === null ? BASE[id].tiers[2] : BASE[id].tiers[t];
    const b = row.querySelector('button');
    b.textContent = c === null ? 'Fully upgraded' : 'Upgrade: ' + c;
    b.disabled = c === null || G.S.supplies < c;
  });
}

export function refresh() {
  if (!G.S) return;
  const S = G.S;
  $('supplies').textContent = Math.floor(S.supplies);
  $('rate').textContent = '+' + incomeNow().toFixed(1) + ' a second';
  const n = count(0);
  $('army').textContent = 'Infantry ' + n + ' of ' + infCap(0) + (anyTank() ? (G.nation[0] === 'ah' ? ', siege guns ' : ', armour ') + fmt(tanks(0)) + ' of ' + NAT[G.nation[0]].tanks : '');
  { const si = $('superInfo'), held = G.SUPER > 0 && G.owner[G.SUPER] === 0; si.hidden = !held; if (held) { const r = Math.max(0, Math.ceil(SUPER_CARD_T - S.superT)); si.textContent = 'Super trench: next free card in ' + Math.floor(r / 60) + ':' + (r % 60 < 10 ? '0' : '') + (r % 60); } }
  { const left = Math.max(1, Math.ceil(S.need - S.cardKills)); $('cardText').textContent = 'Next card in about ' + left + (left === 1 ? ' kill' : ' kills'); }
  const m = Math.floor(S.t / 60), s = Math.floor(S.t % 60); $('clock').textContent = m + ':' + (s < 10 ? '0' : '') + s;
  $('hpA').style.width = (G.bases[0].hp / G.bases[0].max * 100) + '%'; $('hpB').style.width = (G.bases[1].hp / G.bases[1].max * 100) + '%';
  const cells = $('map').children;
  for (let L = 0; L <= G.HQI; L++) {
    const c = cells[L], a = countAt(0, L), b = countAt(1, L);
    c.querySelector('.me').textContent = a || '\u00a0'; c.querySelector('.foe').textContent = b || '\u00a0';
    c.querySelector('.pips').textContent = '\u25aa'.repeat(G.fort[L]);
    c.setAttribute('aria-pressed', L === G.sel ? 'true' : 'false');
    c.setAttribute('aria-label', (L === 0 ? 'Your HQ' : L === G.HQI ? 'Enemy HQ' : 'Trench ' + L) + ': ' + a + ' of yours, ' + b + ' enemy' + (G.fort[L] ? ', fortified level ' + G.fort[L] : ''));
    c.classList.toggle('mine', G.owner[L] === 0); c.classList.toggle('theirs', G.owner[L] === 1);
  }
  if (G.NT > 9 && G.sel !== lastSel) { lastSel = G.sel; const mp = $('map'), c = cells[G.sel]; if (c) mp.scrollLeft = c.offsetLeft - mp.clientWidth / 2 + c.offsetWidth / 2; }
  const here = countAt(0, G.sel);
  $('selText').textContent = (G.sel === 0 ? 'Your HQ' : G.sel === G.HQI ? 'Assault on the enemy HQ' : 'Trench ' + G.sel) + ': ' + here + (here === 1 ? ' soldier' : ' troops') + ' under orders. New troops march here.' + (G.sel === G.SUPER ? ' The super trench.' : '') + (isDbl(G.sel) ? ' Super trench: stronger cover, 5 emplacements, +' + DBL_RATE + ' supply a second while held. Hedgehogs stop enemy tanks.' : '') + (isTrench(G.sel) && G.fort[G.sel] ? ' Fortified level ' + G.fort[G.sel] + '.' : '') + (G.nation[0] === 'ah' && isTrench(G.sel) && G.fort[G.sel] < 3 && G.garr[G.sel] > 0 ? ' Garrison digging in: ' + Math.floor(G.garr[G.sel] / GARR_T[G.fort[G.sel]] * 100) + '%.' : '');
  { const tr = isTrench(G.sel), mine = tr && G.owner[G.sel] === 0, lv = tr ? G.fort[G.sel] : 0, mx = tr ? maxFort(G.sel) : 3, fb = $('fortBtn'), nb = $('nestBtn');
    fb.textContent = !tr ? 'Fortify' : lv >= mx ? 'Fully fortified' : 'Fortify: ' + FORT_COST[lv];
    fb.disabled = !mine || lv >= mx || S.supplies < FORT_COST[lv];
    nb.textContent = NAT[G.nation[0]].nestLabel + ': ' + nestCost(0); nb.disabled = !mine || freeSlot(G.sel) < 0 || S.supplies < nestCost(0);
    const d = NAT[G.nation[0]].def, db = $('defBtn'); db.hidden = !d;
    if (d) { db.textContent = d.label + ': ' + d.cost; db.disabled = !mine || !canDef(0, G.sel) || S.supplies < d.cost; } }
  $('advBtn').textContent = G.sel === G.NT ? 'Storm the HQ' : 'Advance';
  $('advBtn').disabled = G.sel >= G.HQI || !here; $('backBtn').disabled = G.sel <= 0 || !here;
  { const d = SW[G.nation[0]], b = $('swBtn'); b.hidden = !d;
    if (G.aim && (!d || swBlock(0))) G.aim = null;
    if (d && G.aim) { b.innerHTML = '<b>Confirm target, ' + swCost(0) + '</b><small>' + (G.aim.x === null ? 'Tap the field to place the target.' : (S.supplies < swCost(0) ? 'Not enough supplies yet.' : 'Fire at the marked circle.')) + '</small>'; b.disabled = G.aim.x === null || S.supplies < swCost(0); }
    else if (d) { const why = swBlock(0); b.innerHTML = '<b>Superweapon: ' + d.name + ', ' + swCost(0) + '</b><small>' + (why || (d.kind === 'mine' && tier(0, 'nat') >= 1 ? d.text.replace('25', TUNNEL_T) : d.text)) + '</small>'; b.disabled = !!why || (d.kind !== 'paris' && S.supplies < swCost(0)); }
    $('aimCancel').hidden = !G.aim; }
  refreshBase();
  for (const b of $('buy').children) { const k = b.dataset.buy; b.disabled = !S.unlocked[k] || S.supplies < cost(k) || full(0, k); }
  const held = Object.keys(S.taken).map(id => { const c = CARDS.find(x => x.id === id); return c.name + (S.taken[id] > 1 ? ' ×' + S.taken[id] : ''); });
  $('held').textContent = held.length ? 'Cards: ' + held.join(', ') + '.' : 'No cards yet. Kills earn them.';
}

export function initHud() {
  $('map').addEventListener('click', ev => { const b = ev.target.closest('button'); if (b && commands.select(+b.dataset.line)) focusLine(+b.dataset.line); });
  $('advBtn').addEventListener('click', () => { if (commands.advance()) focusLine(G.sel); });
  $('backBtn').addEventListener('click', () => { if (commands.fallback()) focusLine(G.sel); });
  $('gatherBtn').addEventListener('click', () => commands.gather());
  $('fortBtn').addEventListener('click', () => commands.fortifyAt(G.sel));
  $('nestBtn').addEventListener('click', () => commands.buildNestAt(G.sel));
  $('defBtn').addEventListener('click', () => commands.buildDefAt(G.sel));
  $('basePanel').addEventListener('click', ev => { const b = ev.target.closest('button[data-base]'); if (b) commands.buyBase(b.dataset.base === G.nation[0] ? 'nat' : b.dataset.base); });
  $('aimCancel').addEventListener('click', () => commands.cancelAim());
  $('swBtn').addEventListener('click', () => {
    if (G.aim) { commands.confirmAim(); return; }
    const d = SW[G.nation[0]];
    if (d && d.kind === 'paris') commands.startAiming();
    else commands.fireSuperweapon();
  });
  $('pauseBtn').addEventListener('click', () => { G.userPaused = !G.userPaused; $('pauseBtn').textContent = G.userPaused ? 'Resume' : 'Pause'; });
  $('speedBtn').addEventListener('click', () => { G.speed = G.speed === 1 ? 2 : 1; $('speedBtn').textContent = 'Speed ' + G.speed + '×'; });
}
