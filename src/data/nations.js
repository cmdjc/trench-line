// Nations: identity, colours, army caps, default defence and AI parameters
// (prototype lines 520–532, verbatim except the superweapon blurb merge that
// originally ran at line 653 once SW existed — it runs here at module level).

import { SW } from './superweapons.js';

export const NATS = ['gb', 'de', 'fr', 'ru', 'us', 'ah', 'it', 'aq'];

export const NAT = {
  gb: { name: 'Britain', body: '#c0ad6c', hat: '#7d7741', style: 'brodie', inf: 40, tanks: 8, nest: 'nest', nestLabel: 'MG nest', def: { kind: 'wire', label: 'Wire', cost: 70 }, blurb: 'Defence: wire entanglements that slow attackers. Riflemen fire 15% faster. Lewis gunners fire on the move, trench raiders are cheap and tough, and the Mk V tank is quick with two guns but thinner armour.' },
  de: { name: 'Germany', body: '#929c97', hat: '#3f4649', style: 'stahl', inf: 40, tanks: 8, nest: 'pillbox', nestLabel: 'Pillbox', def: null, blurb: 'Defence: concrete pillboxes in place of MG nests. The MG 08 outranges every other gun but is slow to move, stormtroopers carry submachine guns, and the A7V tank is a slow, costly fortress with six machine guns.' },
  fr: { name: 'France', body: '#86a6c9', hat: '#55759c', style: 'adrian', inf: 40, tanks: 12, nest: 'nest', nestLabel: 'MG nest', def: { kind: 'pit', label: 'Gun pit', cost: 130 }, blurb: 'Defence: 75 mm gun pits that shell attackers. The Renault FT is a small, cheap, fast tank, and you can field 12. Chauchat gunners are very cheap but jam, and the 75 mm field gun rips up troops in the open.' },
  us: { name: 'USA', body: '#b8915a', hat: '#5c4b30', style: 'brodie', inf: 40, tanks: 5, nest: 'nest', nestLabel: 'MG nest', def: { kind: 'depot', label: 'Depot', cost: 120 }, blurb: 'Defence: supply depots that add income. Supplies start slow and keep growing all battle. BAR gunners fire on the move, trench shotgunners are deadly up close, and the Mark VIII Liberty is the heaviest standard tank.' },
  ah: { name: 'Austria-Hungary', body: '#c8cec8', hat: '#566067', style: 'cap', inf: 20, tanks: 2, nest: 'nest', nestLabel: 'MG nest', def: null, blurb: 'Quality over quantity: only 20 infantry, but every soldier costs double and is worth two. Trenches they garrison fortify themselves for free. No tanks: the \u0160koda 30.5 cm siege mortar reaches three trenches and smashes fortifications.' },
  aq: { name: 'United States of Antarctica', body: '#8fb6d6', hat: '#46688a', style: 'parka', inf: 20, tanks: 20, nest: 'nest', nestLabel: 'MG nest', def: { kind: 'bunker', label: 'Bunker', cost: 120 }, blurb: 'Defence: bunkers, two to a trench, that shelter six troops each. The bunker must be destroyed before they can be hurt. Only 20 fragile infantry, but 20 places for tanks that grow to enormous sizes. Starts poor, but income grows faster than anyone\u2019s.' },
  it: { name: 'Italy', body: '#7f917b', hat: '#4d5f50', style: 'alpino', inf: 40, tanks: 8, nest: 'nest', nestLabel: 'MG nest', def: { kind: 'pit', label: 'Gun pit', cost: 120, make: 'pit65' }, blurb: 'Defence: 65 mm mountain gun pits that lob shells into trenches. Alpini are tough but slow, and take 15% less damage in trenches. Arditi are fast shock troops, and the Fiat-Revelli is a sturdy gun that is slow to move.' },
  ru: { name: 'Russia', body: '#8fa05a', hat: '#535f2d', style: 'cap', inf: 60, tanks: 10, nest: 'nest', nestLabel: 'MG nest', def: { kind: 'mines', label: 'Mines', cost: 60 }, blurb: 'Defence: hidden minefields. Conscripts are weak but very cheap, with room for 60 infantry. The Maxim gun has a shield, the Vezdekhod is a quick, cheap light tank you can field 10 of, and the Mendeleev is a slow ironclad.' }
};

for (const n in NAT) NAT[n].blurb += ' Superweapon: ' + (SW[n] ? SW[n].name : 'Tsar Tank') + '.';

// Enemy commander tuning (prototype line 530–532).
export const AI_UNLOCK = { rifle: 0, mg: 0, raider: 90, sniper: 150, mortar: 240, tank: 400, tkL: 260, tkM: 520, tkH: 640, tkS: 1000 };
export const AI_INCOME = 3.1, AI_RAMP = 360, AI_START = 6;
export const AI_W = { rifle: 5, mg: 2, raider: 2, sniper: 1.2, mortar: 1.2, tank: 1, tkL: 1.2, tkM: 0.9, tkH: 0.7, tkS: 0.35 };
