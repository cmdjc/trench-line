// Aimable HQ guns: one per nation. Range is in trenches from the own HQ.
// Shell fields mirror the superweapon shells (dur, arc, cov, big); `delay`
// staggers shells in seconds and `spread` is the random scatter radius in px.

const rep = (n, s, step = 0) => Array.from({ length: n }, (_, i) => ({ ...s, delay: i * step }));

export const GUNS = {
  gb: { name: 'Stokes mortar battery', range: 3, cost: 40, cd: 8,
    shells: rep(3, { dmg: 55, splash: 28, cov: 0.8, spread: 30, dur: 1.6, arc: 3 }, 0.3) },
  de: { name: '7.7 cm FK 16', range: 6, cost: 50, cd: 10,
    shells: rep(1, { dmg: 50, splash: 25, cov: 0.75, spread: 12, dur: 1.2, arc: 1 }) },
  fr: { name: '75 mm battery', range: 5, cost: 60, cd: 12,
    shells: rep(4, { dmg: 45, splash: 25, cov: 0.7, spread: 36, dur: 1.4, arc: 1.5 }, 0.25) },
  us: { name: '155 mm GPF', range: 9, cost: 90, cd: 20,
    shells: rep(1, { dmg: 150, splash: 55, cov: 0.85, spread: 14, dur: 2.6, arc: 3, big: true }) },
  ah: { name: 'Mountain gun battery', range: 4, cost: 50, cd: 10,
    shells: rep(1, { dmg: 120, splash: 45, cov: 0.9, spread: 16, dur: 2.2, arc: 3.5 }) },
  aq: { name: 'Penguin mortar', range: 3, cost: 35, cd: 10,
    shells: rep(5, { dmg: 40, splash: 25, cov: 0.8, spread: 40, dur: 1.8, arc: 3 }, 0.15) },
  it: { name: '210 mm mortar', range: 3, cost: 120, cd: 30,
    shells: rep(1, { dmg: 260, splash: 80, cov: 0.85, spread: 10, dur: 3, arc: 3.5, big: true }) },
  ru: { name: 'Massed battery', range: 5, cost: 80, cd: 25,
    shells: rep(6, { dmg: 70, splash: 35, cov: 0.8, spread: 70, dur: 1.8, arc: 2 }, 0.35) },
  sx: { name: '15 cm sFH battery', range: 5, cost: 70, cd: 16,
    shells: rep(2, { dmg: 80, splash: 34, cov: 0.8, spread: 24, dur: 2, arc: 2.5 }, 0.4) },
};

// Share of the enemy's income diverted to its gun fund once the gun is allowed to fire (t >= 60 s).
export const AI_GUN_SHARE = 0.1;
