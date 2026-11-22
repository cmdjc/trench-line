// DOM side of the field buttons: description text and, from Task 3, touch reveal.

export function setTip(el, text) {
  el.setAttribute('aria-label', text);
  el.setAttribute('data-tip', text);
}
