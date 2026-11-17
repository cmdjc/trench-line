// Card choice overlay (prototype 1321–1342). The sim's offer state machine
// (sim/cards.js) owns G.offer and emits `cards:offer`; this renders it and
// forwards picks to takeCard, which re-offers while choices are pending.

import { G } from '../sim/state.js';
import { CARDS } from '../data/cards.js';
import { takeCard } from '../sim/cards.js';
import { $ } from './dom.js';

export function showOffer() {
  if (!G.offer) return;
  $('cardSub').textContent = G.S.pending > 1 ? 'It lasts for the rest of this battle. ' + (G.S.pending - 1) + ' more to choose after this.' : 'It lasts for the rest of this battle.';
  $('cardList').innerHTML = G.offer.ids.map(id => { const c = CARDS.find(x => x.id === id); return '<button class="pick" data-card="' + c.id + '"><h3>' + c.name + '</h3><p>' + c.text + '</p></button>'; }).join('');
  $('cardOv').hidden = false;
  const f = $('cardList').querySelector('button'); if (f && f.focus) f.focus();
}

export function initCards() {
  $('cardList').addEventListener('click', ev => {
    const b = ev.target.closest('button[data-card]');
    if (!b) return;
    takeCard(b.dataset.card);
    if (!G.offer) $('cardOv').hidden = true;   // a re-offer keeps it open
  });
}
