// Seeded random source for the whole simulation. Battles are reproducible:
// newGame(mine, theirs, map, seed) reseeds this generator, and every
// Math.random() in the prototype's simulation now goes through rng.
//
// mulberry32: small, fast, good enough distribution for gameplay.

/** @param {number} seed uint32 */
export function makeRng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function defaultSeed() {
  return (Date.now() ^ (Math.random() * 0xFFFFFFFF)) >>> 0;
}

export const rng = {
  seed: 0,
  /** @param {number} [n] */
  reseed(n = defaultSeed()) {
    this.seed = n >>> 0;
    this._next = makeRng(this.seed);
    return this.seed;
  },
  _next: makeRng(1),
  float() { return this._next(); },
  range(a, b) { return a + (b - a) * this._next(); },
  int(n) { return Math.floor(this._next() * n); },
  pick(arr) { return arr[Math.floor(this._next() * arr.length)]; },
};
rng.reseed();

// Map-decoration generator, ported verbatim from the prototype (rnd at line
// 1578): a Lehmer/Park–Miller style generator used with fixed seeds so ground
// patches and craters are stable for a given map.
export function decor(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}
