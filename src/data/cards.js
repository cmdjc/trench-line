// Cards as pure data (prototype lines 1263–1306): weights, one-shot flags and
// the single declarative gate `canId: 'anyTank'` (the plate card). Behaviour —
// take() effects and can/u_tk* predicates — lives in sim/cards.js, keyed by id.

export const CARDS = [
  { id: 'draft', w: 3, name: 'Fresh draft', text: '' },
  { id: 'gunsec', w: 2, name: 'Gun section', text: '2 machine gunners report to your HQ at once.' },
  { id: 'u_raider', w: 3, once: true, name: 'Trench raiders', text: 'Unlocks raiders: fast, and their grenades ignore trench cover. Two arrive now.' },
  { id: 'u_sniper', w: 3, once: true, name: 'Sharpshooters', text: 'Unlocks snipers: very long reach, and trenches only halve their damage. One arrives now.' },
  { id: 'u_mortar', w: 3, once: true, name: 'Mortar teams', text: 'Unlocks mortars: shells that reach two trench lines and hit groups. One arrives now.' },
  { id: 'u_tank', w: 3, once: true, name: 'Tank unlock', text: 'Unlocks tanks: slow, armoured against bullets, and they fire while moving.' },
  { id: 'u_tkL', w: 2.5, once: true, name: 'Light tank', text: '' },
  { id: 'u_tkM', w: 2, once: true, name: 'Medium-heavy tank', text: '' },
  { id: 'u_tkH', w: 2, once: true, name: 'Heavy tank', text: '' },
  { id: 'u_tkS', w: 1.5, once: true, name: 'Super-heavy tank', text: '' },
  { id: 'bonds', w: 3, name: 'War bonds', text: '+1.5 supplies every second.' },
  { id: 'spoils', w: 2, name: 'Spoils of war', text: '+50% supplies from kills.' },
  { id: 'musket', w: 2, name: 'Musketry school', text: 'Riflemen and snipers deal 20% more damage.' },
  { id: 'dugout', w: 2, name: 'Deeper dugouts', text: 'Your troops in trenches take 20% less damage.' },
  { id: 'helmet', w: 2, name: 'Steel helmets', text: 'Infantry gain 20% health, including troops already in the field.' },
  { id: 'march', w: 2, name: 'Quick march', text: 'Infantry move 20% faster.' },
  { id: 'belt', w: 2, name: 'Belt feed', text: 'Machine gunners fire 25% faster.' },
  { id: 'cheap', w: 2, name: 'Mass production', text: 'Riflemen cost 20% less.' },
  { id: 'hq', w: 1.5, name: 'Fortified HQ', text: 'Your HQ gains 500 health and its guns hit 30% harder.' },
  { id: 'barrage', w: 2, name: 'Creeping barrage', text: 'Your guns shell the nearest enemy position every 10 seconds. Taking it again adds 2 shells.' },
  { id: 'medic', w: 2, name: 'Stretcher bearers', text: 'Troops resting in a trench recover 1.5 health per second.' },
  { id: 'plate', w: 2, canId: 'anyTank', name: 'Thicker plate', text: 'Tanks gain 30% health, including tanks already in the field.' },
  { id: 'train', w: 2, name: 'Supply train', text: '150 supplies now.' }
];

// Nation-specific card relabelling (id → [name, text]).
export const CARDTXT = {
  gb: { u_raider: ['Trench raiders', 'Unlocks trench raiders: cheap, tough and fast, and their bombs ignore trench cover. Two arrive now.'],
        u_tank: ['Tank unlock: Mk V', 'Unlocks the Mk V: quick, with two guns, though bullets still hurt it a little.'] },
  de: { u_raider: ['Stormtroopers', 'Unlocks stormtroopers: submachine guns that ignore trench cover. Two arrive now.'],
        u_tank: ['Tank unlock: A7V', 'Unlocks the A7V: a slow fortress with thick armour and six machine guns.'] },
  fr: { u_mortar: ['75 mm field guns', 'Unlocks the 75 mm field gun: rapid shellfire that tears up troops in the open but does little against trenches. One arrives now.'],
        u_tank: ['Tank unlock: Renault FT', 'Unlocks the Renault FT: small, cheap and fast. You can field 12.'] },
  us: { u_raider: ['Trench shotgunners', 'Unlocks trench shotgunners: devastating at very short range, and trench cover does not stop them. Two arrive now.'],
        u_tank: ['Tank unlock: Mark VIII Liberty', 'Unlocks the Mark VIII Liberty: the heaviest standard tank, with two guns and machine guns. You can field 5.'] },
  aq: { u_raider: ['Sledge raiders', 'Unlocks sledge raiders: fast ski-troopers whose grenades ignore trench cover. Two arrive now.'],
        u_mortar: ['Frost mortar crews', 'Unlocks the frost mortar: a trench mortar that shells up to two trench lines away. One arrives now.'],
        u_tank: ['Tank unlock: Weddell', 'Unlocks the Weddell: a big, snow-white medium tank with a long gun and a coaxial machine gun.'] },
  it: { u_raider: ['Arditi', 'Unlocks the Arditi: fearless shock troops, fast, whose grenades ignore trench cover. Two arrive now.'],
        u_mortar: ['Bombarda crews', 'Unlocks the Bombarda: a trench mortar that shells up to two trench lines away. One arrives now.'],
        u_tank: ['Tank unlock: Fiat 2000', 'Unlocks the Fiat 2000: a slow 40-ton fortress with a turret gun and a ring of machine guns.'] },
  ah: { u_raider: ['Sturmtruppen', 'Unlocks Sturmtruppen: hand-picked assault troops whose grenades ignore trench cover. Two arrive now.'],
        u_tank: ['Siege gun: \u0160koda 30.5 cm', 'Unlocks the \u0160koda 30.5 cm mortar: a slow siege gun that reaches three trenches, hits a wide area and can smash fortifications. You can field 2.'] },
  ru: { u_tank: ['Tank unlock: Vezdekhod', 'Unlocks the Vezdekhod: a quick, cheap light tank on one wide track, with a machine gun and no cannon. You can field 10.'] }
};
CARDTXT.sx = { u_raider: ['Rammstoßtrupps', 'Unlocks the Rammstoßtrupp: an armoured squad that lobs mortar bombs at range and rams anything that gets inside them. Two arrive now.'],
  u_mortar: ['Granatwerfer crews', 'Unlocks the Granatwerfer: a trench mortar that shells up to two trench lines away. One arrives now.'],
  u_tank: ['Mech unlock: Krampus', 'Unlocks the Krampus: a versatile medium mech with a turret gun and a machine gun.'] };
