// DOM side of the field buttons: description text and, from Task 3, touch reveal.

import { G } from '../sim/state.js';

export function setTip(el, text) {
  el.setAttribute('aria-label', text);
  el.setAttribute('data-tip', text);
}

// Touch/pen reveal: the first tap on a field button shows its description
// instead of firing it; a second tap on the already-revealed button fires
// it. Mouse and keyboard clicks act at once, as before.
let revealed = null;      // the revealed .fb, or null
let revealSel = null;     // G.sel recorded when it was revealed
let swallow = null;       // the button whose next click should be swallowed

export function revealedButton() {
  return revealed ? revealed.firstElementChild : null;
}

export function clearReveal() {
  if (revealed) revealed.classList.remove('revealed');
  revealed = null; revealSel = null; swallow = null;
}

export function syncRevealSel(sel) {
  if (revealed && sel !== revealSel) clearReveal();
}

export function initFieldTips() {
  document.addEventListener('pointerdown', ev => {
    swallow = null;
    if (revealed && !revealed.contains(ev.target)) clearReveal();
  }, true);

  document.addEventListener('pointerup', ev => {
    const fb = ev.target.closest('.fieldBand .fb');
    if (!fb || (ev.pointerType !== 'touch' && ev.pointerType !== 'pen')) return;
    if (fb === revealed) return;                 // let the coming click through
    clearReveal();
    fb.classList.add('revealed');
    revealed = fb; revealSel = G.sel;
    const btn = fb.firstElementChild;
    if (!btn.disabled) swallow = btn;
  });

  document.addEventListener('click', ev => {
    const btn = ev.target.closest('.fieldBand .fbtn');
    if (!btn) return;
    if (btn === swallow) {
      ev.stopPropagation(); ev.preventDefault();
      swallow = null;
    } else {
      clearReveal();
    }
  }, true);
}
