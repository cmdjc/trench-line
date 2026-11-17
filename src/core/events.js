// Tiny event bus. The simulation emits; the UI listens. The sim never imports
// DOM globals — every former direct toast()/refresh()/buildBuy() call from
// simulation code becomes an event here.
const listeners = new Map();

export const bus = {
  /** @param {string} ev @param {(payload:any)=>void} fn */
  on(ev, fn) {
    if (!listeners.has(ev)) listeners.set(ev, new Set());
    listeners.get(ev).add(fn);
    return () => this.off(ev, fn);
  },
  off(ev, fn) {
    listeners.get(ev)?.delete(fn);
  },
  emit(ev, payload) {
    const set = listeners.get(ev);
    if (!set) return;
    for (const fn of [...set]) fn(payload);
  },
};
