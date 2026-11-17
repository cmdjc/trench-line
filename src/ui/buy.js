// Buy panel (prototype 1393–1407): renders infantry plus the nation's tank
// list, locked entries included, and buys through commands.buyUnit.

import { G, fmt } from '../sim/state.js';
import { INF } from '../data/units.js';
import { tkList, tkPrev } from '../data/units.js';
import { NAT } from '../data/nations.js';
import { ut, cost } from '../sim/geometry.js';
import * as commands from '../sim/commands.js';
import { $ } from './dom.js';

function lockText(k) {
  const pv = tkPrev(G.nation[0], k);
  if (pv && !G.S.unlocked[pv]) return 'Needs the ' + ut(0, pv).name + ' first.';
  return 'Needs its card.';
}

export function buildBuy() {
  $('buy').innerHTML = INF.concat(tkList(G.nation[0])).map(k => {
    const T = ut(0, k);
    return '<button data-buy="' + k + '"><h3>' + T.name + '<span>' + (G.S.unlocked[k] ? cost(k) : '') + '</span></h3><p>' + (G.S.unlocked[k] ? T.role + (T.armor ? ' Armour limit: ' + fmt(T.w || 1) + ' of ' + NAT[G.nation[0]].tanks + '.' : '') : lockText(k)) + '</p></button>';
  }).join('');
}

export function initBuy() {
  $('buy').addEventListener('click', ev => {
    const b = ev.target.closest('button[data-buy]');
    if (!b || b.disabled || !G.running) return;
    commands.buyUnit(b.dataset.buy);
  });
}
