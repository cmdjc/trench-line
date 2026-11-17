// localStorage adapter with the same shape the prototype expected from
// `window.storage`: get(k) → {value:<string>} | null, set(k,v) → true | null.
// `storage` is null when localStorage is missing or unusable (node, private
// mode), so sim/meta.js degrades to codes-only saving exactly like before.

function probe() {
  try {
    if (typeof localStorage === 'undefined') return false;
    const k = '__trenchline__';
    localStorage.setItem(k, '1');
    localStorage.removeItem(k);
    return true;
  } catch { return false; }
}

export const storage = probe() ? {
  /** @returns {{value:string}|null} */
  get(k) {
    try { const v = localStorage.getItem(k); return v === null ? null : { value: v }; } catch { return null; }
  },
  /** @returns {true|null} */
  set(k, v) {
    try { localStorage.setItem(k, v); return true; } catch { return null; }
  }
} : null;
