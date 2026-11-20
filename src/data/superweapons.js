// Superweapons: one per nation (prototype lines 642–652, verbatim).

export const SW = {
  de: { kind: 'paris', name: 'Paris Gun', cost: 500, cd: 90, text: 'One massive shell on a spot you choose, anywhere on the field. It lands after 4 seconds, wrecks everything in a big circle and levels fortifications there.' },
  gb: { kind: 'mine', name: 'Messines mine', cost: 450, cd: 120, text: 'Tunnels for 25 seconds under the nearest enemy trench ahead of the selected one, then blows up everything in it.' },
  fr: { kind: 'char2c', name: 'Char 2C', cost: 1100, cd: 60, text: 'A 69-ton super-heavy tank with a turret gun and machine guns. One at a time.' },
  /* cost is dropCost() from drop.js; hard-coded because drop.js -> units.js -> nations.js -> here would be a cycle (a test asserts they match) */
  us: { kind: 'drop', name: 'Airborne drop', cost: 341, cd: 30, text: 'Mitchell\u2019s 1919 plan made real: 4 Thompson gunners, 2 riflemen and 2 BAR gunners parachute into an enemy or empty trench up to 3 trenches past your front.' },
  ah: { kind: 'skoda42', name: '\u0160koda 42 cm', cost: 400, cd: 90, text: 'Three fortress-breaking shells on the nearest enemy position ahead. They level its fortifications.' },

  aq: { kind: 'colossus', name: 'Southern Colossus', cost: 2500, cd: 150, text: 'A colossal 9,000-health landship with four turrets, machine guns and crushing treads. One at a time.' },
  it: { kind: 'caproni', name: 'Caproni bombers', cost: 420, cd: 80, text: 'A bomber flies down the nearest enemy position ahead of the selected trench and drops eight bombs along its length.' },
  ru: { kind: 'tsar', name: 'Tsar Tank', cost: 900, cd: 60, text: 'A giant on nine-metre wheels that crushes whatever it reaches and rolls over hedgehogs. One at a time.' }
};
