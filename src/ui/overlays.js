// Overlays (prototype 1449–1550): start screen pick flow, research tree,
// save-code copy/load, end screen. Listens to nothing itself — main.js wires
// `game:end` and `meta` events to showEnd/renderSaveState.

import { G, newGame } from '../sim/state.js';
import { NAT } from '../data/nations.js';
import { MAPS } from '../data/maps.js';
import { TECH } from '../data/tech.js';
import { STATS } from '../data/units.js';
import { tkList } from '../data/units.js';
import { META, has, makeCode, readCode, saveMeta, saveOk } from '../sim/meta.js';
import { storage } from '../storage.js';
import { $ } from './dom.js';

let pickMine = null, pickFoe = null;
let techSel = null;

export function techLabels() {
  const t = 'Research: ' + META.points + (META.points === 1 ? ' point' : ' points') + ' to spend';
  $('techBtn').textContent = t; $('endTechBtn').textContent = t; $('techPts').textContent = META.points + (META.points === 1 ? ' point' : ' points');
}

function renderStart() {
  if (pickMine && pickFoe) {
    $('startHead').textContent = NAT[pickMine].name + ' against ' + NAT[pickFoe].name + '. Choose the battlefield';
    $('natList').innerHTML = Object.keys(MAPS).map(k => '<button class="pick" data-map="' + k + '"><h3>' + MAPS[k].name + '</h3><p>' + MAPS[k].blurb + '</p></button>').join('');
    return;
  }
  $('startHead').textContent = pickMine ? 'You are ' + NAT[pickMine].name + '. Choose your enemy' : 'Choose your country';
  $('natList').innerHTML = Object.keys(NAT).filter(n => n !== pickMine).map(n => '<button class="pick" data-nation="' + n + '"><h3>' + (pickMine ? 'Fight ' : 'Play as ') + NAT[n].name + '</h3><p>' + NAT[n].blurb + ' Armour: ' + tkList(n).map(k => STATS[n][k].name).join(', ') + '.</p></button>').join('');
}

function nodeState(b, i) { const n = b.nodes[i]; return has(n.id) ? 'owned' : (i === 0 || has(b.nodes[i - 1].id)) ? 'open' : 'locked'; }

export function renderSaveState() {
  const el = $('saveState'); if (!el) return;
  el.textContent = !storage ? 'Automatic saving is not available here, so your code is the only save.'
    : saveOk === 2 ? 'Saved automatically in two places.'
      : saveOk === 1 ? 'One of the two automatic saves failed. The other is good, and your code still works.'
        : saveOk === 0 ? 'Both automatic saves failed. Copy your code to keep your progress.'
          : 'Two automatic saves are kept. Nothing to save yet.';
}

export function renderTech() {
  techLabels(); renderSaveState();
  $('codeOut').value = makeCode();
  $('techTree').innerHTML = TECH.map(b => '<div class="branch"><h3>' + b.branch + '</h3><div class="nodes">' + b.nodes.map((n, i) => {
    const st = nodeState(b, i);
    return (i ? '<span class="link' + (has(b.nodes[i - 1].id) ? ' on' : '') + '"></span>' : '') + '<button class="node ' + st + '" data-tech="' + n.id + '" aria-pressed="' + (techSel === n.id) + '">' + n.name + '<small>' + (st === 'owned' ? 'Researched' : n.cost + ' points') + '</small></button>';
  }).join('') + '</div></div>').join('');
  let node = null, st = '';
  for (const b of TECH) b.nodes.forEach((n, i) => { if (n.id === techSel) { node = n; st = nodeState(b, i); } });
  const buy = $('techBuy');
  if (!node) { $('techInfo').innerHTML = '<p>Choose an upgrade to see what it does. Each branch is researched from left to right.</p>'; buy.disabled = true; buy.textContent = 'Research'; return; }
  $('techInfo').innerHTML = '<h3>' + node.name + '</h3><p>' + node.text + '</p>';
  if (st === 'owned') { buy.disabled = true; buy.textContent = 'Already researched'; }
  else if (st === 'locked') { buy.disabled = true; buy.textContent = 'Research the upgrade before it first'; }
  else if (META.points < node.cost) { buy.disabled = true; buy.textContent = 'Needs ' + (node.cost - META.points) + ' more points'; }
  else { buy.disabled = false; buy.textContent = 'Research for ' + node.cost + ' points'; }
}

function openTech() { techSel = null; $('codeMsg').textContent = ''; renderTech(); $('techOv').hidden = false; $('techOv').scrollTop = 0; }

async function copyCode(el, msg) {
  let ok = false;
  try { await navigator.clipboard.writeText(el.value); ok = true; } catch {
    try { el.focus(); el.select(); ok = document.execCommand('copy'); } catch { }
  }
  msg.textContent = ok ? 'Code copied.' : 'Copying is blocked here. Press and hold the code to copy it.';
}

export function showEnd(d) {
  const { won, earned, time, kills, losses, cards } = d;
  $('endTitle').textContent = won ? 'Victory' : 'Defeat';
  $('endText').textContent = won ? 'The enemy HQ has fallen to ' + NAT[G.nation[0]].name + '.' : 'Your HQ has been overrun by ' + NAT[G.nation[1]].name + '.';
  const m = Math.floor(time / 60), s = Math.floor(time % 60);
  $('eTime').textContent = m + ':' + (s < 10 ? '0' : '') + s; $('eKills').textContent = kills; $('eLost').textContent = losses; $('eCards').textContent = cards;
  $('eCode').value = makeCode(); $('eMsg').textContent = '';
  $('ePts').textContent = '+' + earned + (won ? ' (30 for the win)' : '');
  techLabels();
  $('endOv').hidden = false;
}

export function initOverlays() {
  $('natList').addEventListener('click', ev => {
    const mb = ev.target.closest('button[data-map]');
    if (mb) { $('startOv').hidden = true; newGame(pickMine, pickFoe, mb.dataset.map); return; }
    const b = ev.target.closest('button[data-nation]'); if (!b) return;
    if (!pickMine) pickMine = b.dataset.nation; else pickFoe = b.dataset.nation;
    renderStart(); $('startOv').scrollTop = 0;
  });
  $('againBtn').addEventListener('click', () => { $('endOv').hidden = true; pickMine = null; pickFoe = null; renderStart(); $('startOv').hidden = false; });
  $('techBtn').addEventListener('click', openTech);
  $('endTechBtn').addEventListener('click', openTech);
  $('techBack').addEventListener('click', () => { $('techOv').hidden = true; });
  $('techTree').addEventListener('click', ev => { const b = ev.target.closest('button[data-tech]'); if (!b) return; techSel = b.dataset.tech; renderTech(); });
  $('techBuy').addEventListener('click', () => {
    for (const b of TECH) b.nodes.forEach((n, i) => {
      if (n.id === techSel && nodeState(b, i) === 'open' && META.points >= n.cost) { META.points -= n.cost; META.tech[n.id] = 1; void saveMeta(); }
    });
    renderTech();
  });
  $('codeOut').addEventListener('focus', () => $('codeOut').select());
  $('eCode').addEventListener('focus', () => $('eCode').select());
  $('codeCopy').addEventListener('click', () => void copyCode($('codeOut'), $('codeMsg')));
  $('eCopy').addEventListener('click', () => void copyCode($('eCode'), $('eMsg')));
  $('codeLoad').addEventListener('click', () => {
    const d = readCode($('codeIn').value);
    if (!d) { $('codeMsg').textContent = 'That code is not valid. Check it for typing mistakes.'; return; }
    META.points = d.points; META.tech = d.tech; META.runs = d.runs; META.wins = d.wins; void saveMeta();
    $('codeIn').value = ''; techSel = null; renderTech();
    const n = Object.keys(d.tech).length;
    $('codeMsg').textContent = 'Research restored: ' + n + (n === 1 ? ' upgrade' : ' upgrades') + ' and ' + d.points + (d.points === 1 ? ' point.' : ' points.');
  });
  renderStart();
}
