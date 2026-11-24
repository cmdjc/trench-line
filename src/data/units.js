// Unit stats: base types, per-nation overrides, tank variants, special units,
// cover/armour tables and fortification constants. Verbatim port of prototype
// lines 233–533 plus BASE_HP (531), BW (677), GARR_T/DEPOT_RATE/SUPER_INC/
// SUPER_CARD_T (680–681) and BUNKER_CAP/BUNKER_MAX (1023).
//
// Layout-dependent values (LX, WW, NT, HQI, SUPER, DBL) live in sim/state.js.

import { NATS } from './nations.js';

export const WH = 300, SEG = WH / 7;
/* Wide open plain: double trenches (two lines with a wall between), listed in G.DBL */
export const HEDGE = 94, DBL_COV = 0.55, DBL_RATE = 1, SLOTS5 = [0.12, 0.31, 0.6, 0.69, 0.88];

export const UT = {
  rifle: { name: 'Rifleman', pl: 'riflemen', cost: 20, hp: 40, dmg: 8, cd: 1.2, range: 250, acc: 0.55, speed: 46, role: 'Cheap and steady.' },
  mg: { name: 'Machine gunner', pl: 'machine gunners', cost: 60, hp: 45, dmg: 5, cd: 0.2, range: 280, acc: 0.5, speed: 32, role: 'Shreds troops caught in the open.' },
  raider: { name: 'Trench raider', cost: 35, hp: 55, dmg: 11, cd: 0.8, range: 95, acc: 0.75, speed: 70, role: 'Fast. Grenades ignore trench cover.' },
  sniper: { name: 'Sniper', cost: 55, hp: 30, dmg: 45, cd: 3.5, range: 440, acc: 0.8, speed: 42, role: 'Long reach. Picks men out of trenches.' },
  mortar: { name: 'Mortar team', cost: 90, hp: 35, dmg: 22, cd: 4, range: 480, min: 90, splash: 32, speed: 30, shell: 1.1, role: 'Shells trenches up to two lines away.' },
  tank: { name: 'Tank', cost: 260, hp: 520, dmg: 30, cd: 1.7, range: 230, splash: 20, speed: 22, shell: 0.25, moveFire: true, armor: true, role: 'Shrugs off bullets. Fires on the move.' }
};
export const INF = ['rifle', 'mg', 'raider', 'sniper', 'mortar'];
export const TK = ['tkL', 'tank', 'tkM', 'tkH', 'tkS'];   /* light, signature, upper-medium, heavy, super-heavy */
export const ORDER = INF.concat(TK);

/* country-specific versions of three unit types */
export const NU = {
  gb: { mg: { name: 'Lewis gunner', pl: 'Lewis gunners', cost: 50, speed: 44, range: 250, cd: 0.26, moveFire: true, role: 'Light gun. Keeps up and fires on the move, but short reach.' },
        raider: { name: 'Trench raider', cost: 30, hp: 65, speed: 74, range: 80, role: 'Cheap, tough and fast. Bombs ignore trench cover.' },
        tank: { name: 'Mk V tank', cost: 250, hp: 480, speed: 26, dmg: 26, cd: 1.25, thin: true, spons: [17, 14.5], role: 'Quick, with two guns. Bullets still hurt it a little.' } },
  de: { mg: { name: 'MG 08 team', pl: 'MG 08 teams', cost: 65, speed: 24, range: 300, dmg: 6, cd: 0.18, role: 'Heavy gun. Longest reach, very slow to move.' },
        raider: { name: 'Stormtrooper', cost: 45, hp: 50, speed: 64, dmg: 7, cd: 0.35, range: 120, role: 'Submachine gun. Hits hard, ignores trench cover.' },
        tank: { name: 'A7V tank', cost: 330, hp: 700, speed: 16, cd: 1.9, mg: { dmg: 5, cd: 0.25, range: 200, acc: 0.5 }, role: 'Slow fortress. Thick armour and six machine guns.' } },
  fr: { mg: { name: 'Chauchat gunner', pl: 'Chauchat gunners', cost: 35, hp: 40, speed: 44, range: 240, cd: 0.22, moveFire: true, jam: 0.06, role: 'Very cheap, fires on the move, but the gun jams.' },
        mortar: { name: '75 mm field gun', cost: 110, hp: 60, dmg: 20, cd: 1.6, range: 420, min: 60, splash: 26, speed: 22, shell: 0.3, flat: true, cov: 0.3, sprite: 'gun75', muzzle: 21, role: 'Rapid shellfire. Deadly in the open, weak against trenches.' },
        tank: { name: 'Renault FT', cost: 140, hp: 260, speed: 34, dmg: 16, cd: 1.1, splash: 14, range: 220, park: 30, len: 13, bar: [22, -17], turret: { x: 1, len: 11 }, role: 'Small, cheap and fast. Field a dozen.' } },
  us: { mg: { name: 'BAR gunner', pl: 'BAR gunners', cost: 45, hp: 45, speed: 46, range: 230, dmg: 6, cd: 0.22, moveFire: true, mag: 20, reload: 1.7, role: 'Automatic rifle. Fires on the move, reloads often.' },
        raider: { name: 'Trench shotgunner', cost: 40, hp: 55, speed: 66, range: 70, dmg: 30, cd: 1, acc: 0.85, role: 'Devastating at arm\u2019s length, useless beyond it.' },
        tank: { name: 'Mark VIII Liberty', cost: 420, hp: 900, speed: 20, dmg: 34, cd: 1.2, splash: 22, range: 240, park: 46, len: 27, bar: [40, -28], spons: [23, 17.5], mg: { dmg: 5, cd: 0.2, range: 220, acc: 0.5 }, role: 'The heaviest standard tank. Two guns and machine guns.' } },
  ru: { rifle: { name: 'Conscript', pl: 'conscripts', cost: 11, hp: 28, dmg: 6, acc: 0.45, role: 'Weak, but very cheap. Send them in crowds.' },
        mg: { name: 'Maxim gun', pl: 'Maxim guns', cost: 65, hp: 70, speed: 30, shield: 0.55, sprite: 'maxim', muzzle: 15, role: 'Wheeled gun. Its shield stops nearly half of all bullets.' },
        tank: { name: 'Vezdekhod', pl: 'Vezdekhods', cost: 110, hp: 200, speed: 38, dmg: 6, cd: 0.2, acc: 0.5, range: 240, shell: 0, splash: 0, atk: 'mg', w: 1, park: 26, len: 11, bar: [20, -15], turret: { x: 3, len: 9 }, role: 'Light tank on one wide track. Quick and cheap, with a machine gun and no cannon.' } }
};
/* Italy: Alpini. Tougher and slower than most, and they take 15% less damage in trenches (see newGame). */
NU.it = {
  rifle: { name: 'Alpino', pl: 'Alpini', cost: 24, hp: 52, speed: 40, role: 'Mountain infantry. Tougher and a little slower. Takes 15% less damage in trenches.' },
  mg: { name: 'Fiat-Revelli team', pl: 'Fiat-Revelli teams', cost: 60, hp: 58, speed: 28, cd: 0.21, role: 'Water-cooled gun. Sturdy crew, but slow to move.' },
  raider: { name: 'Ardito', pl: 'Arditi', cost: 36, hp: 64, speed: 68, range: 90, role: 'Shock trooper with dagger and grenades. Ignores trench cover.' },
  sniper: { name: 'Alpine sniper', pl: 'Alpine snipers', hp: 38, role: 'Mountain marksman. Very long reach.' },
  mortar: { name: 'Bombarda crew', pl: 'Bombarda crews', cost: 95, hp: 44, role: 'Trench mortar team. Shells trenches up to two lines away.' }
};
/* United States of Antarctica: only 20 infantry and they are fragile, but they shelter in bunkers */
NU.aq = {
  rifle: { name: 'Ice Trooper', pl: 'Ice Troopers', hp: 30, role: 'Parka-clad rifleman. Fragile, but shelters in bunkers.' },
  mg: { name: 'Blizzard gunner', pl: 'Blizzard gunners', hp: 34, role: 'Machine gunner. Fragile, but deadly from a bunker.' },
  raider: { name: 'Sledge raider', pl: 'Sledge raiders', hp: 41, role: 'Fast ski-trooper. Grenades ignore trench cover.' },
  sniper: { name: 'Polar Ranger', pl: 'Polar Rangers', hp: 23, role: 'Very long reach. Picks men out of trenches.' },
  mortar: { name: 'Frost mortar crew', pl: 'Frost mortar crews', hp: 26, role: 'Shells trenches up to two lines away.' }
};
/* Austria-Hungary: every soldier costs double and is worth two */
NU.ah = {};
{ const AH = { rifle: ['Kaiserj\u00e4ger', 'Kaiserj\u00e4ger', 'Elite rifleman. Worth two of anyone else\u2019s.'],
    mg: ['Schwarzlose team', 'Schwarzlose teams', 'Veteran gun crew. Twice the punch, twice the price.'],
    raider: ['Sturmtruppe', 'Sturmtruppen', 'Hand-picked assault troops. Grenades ignore trench cover.'],
    sniper: ['Scharfsch\u00fctze', 'Scharfsch\u00fctzen', 'Master marksman with very long reach.'],
    mortar: ['Minenwerfer crew', 'Minenwerfer crews', 'Heavy trench mortar with an expert crew.'] };
  for (const k in AH) NU.ah[k] = { name: AH[k][0], pl: AH[k][1], role: AH[k][2], cost: UT[k].cost * 2, hp: UT[k].hp * 1.85, dmg: UT[k].dmg * 1.85 };
  NU.ah.tank = { name: '\u0160koda 30.5 cm mortar', cost: 400, hp: 300, speed: 12, dmg: 150, cd: 9, splash: 60, range: 720, min: 150, shell: 2.2, arc: 2.4, cov: 0.85, atk: 'mortar', moveFire: false, soft: true, siege: true, rear: true, park: 60, len: 0, bar: [34, -25], role: 'Siege gun. Reaches three trenches and smashes fortifications.' }; }

/* ---------- tank variants: every country fields several kinds of armour ---------- */
/* w = how much of the armour limit a vehicle uses. draw = parts for the generic tank renderer. */
export const TKB = { pl: 'tanks', hp: 300, dmg: 20, cd: 1.5, range: 220, splash: 18, speed: 26, shell: 0.25, moveFire: true, armor: true, atk: 'tank', w: 1, len: 21 };
// Antarctica tank shells apply a temporary speed debuff ("chill") to anything they damage.
export const CHILL_MULT = 0.6, CHILL_DUR = 4;
export function tkv(o, d, mgOnly) {
  const T = Object.assign({}, TKB, mgOnly ? { atk: 'mg', shell: 0, splash: 0, acc: 0.5 } : {}, o);
  T.draw = d; const m = d.tur && d.tur[0]; if (m) T.turret = { x: m.x, len: m.len };
  return T;
}
Object.assign(NU.gb, {
  tkL: tkv({ name: 'Whippet', pl: 'Whippets', cost: 105, hp: 190, dmg: 6, cd: 0.2, range: 250, speed: 42, thin: true, w: 0.5, park: 34, len: 20, bar: [26, -17],
    role: 'Fast light tank, machine guns only. Shreds troops in the open, but bullets hurt it.' },
    { L: 20, W: 10, tr: [[6, 10]], parts: [
      { t: 'p', c: 'b', o: 1, pts: [[-19, -6], [19, -6], [25, -3], [25, 3], [19, 6], [-19, 6]] },
      { t: 'r', c: 'h', o: 1, x: -13, y: -4.6, w: 17, h: 9.2 },
      { t: 'r', c: '#14140e', x: 3, y: -3.2, w: 1.3, h: 2 }, { t: 'r', c: '#14140e', x: 3, y: 1.2, w: 1.3, h: 2 },
      { t: 'l', x1: 4, y1: -2.2, x2: 11, y2: -2.2, w: 1.3 }, { t: 'l', x1: 4, y1: 2.2, x2: 11, y2: 2.2, w: 1.3 },
      { t: 'c', c: 'h', o: 1, x: -5, y: 0, r: 2.2 }, { t: 'em', x: 15, y: 0, s: 0.8 }],
      fl: [[12, -2.2], [12, 2.2]] }, true),
  tkH: tkv({ name: 'Flying Elephant', pl: 'Flying Elephants', cost: 540, hp: 1250, dmg: 34, cd: 1.3, range: 250, splash: 22, speed: 12, w: 3, park: 50, len: 34, bar: [44, -28], spons: [23, 19.5],
    mg: { dmg: 5, cd: 0.24, range: 210, acc: 0.5 },
    role: 'Giant rhomboid. Four sponson guns and machine guns, but very slow.' },
    { L: 34, W: 20, tr: [[10, 16]], parts: [
      { t: 'r', c: 'h', o: 1, x: -6, y: 16, w: 16, h: 6 }, { t: 'r', c: 'h', o: 1, x: -6, y: -22, w: 16, h: 6 },
      { t: 'l', x1: 8, y1: 19, x2: 23, y2: 19.5, w: 2.6 }, { t: 'l', x1: 8, y1: -19, x2: 23, y2: -19.5, w: 2.6 },
      { t: 'c', c: '#2e2e22', x: 8, y: 19, r: 2.6 }, { t: 'c', c: '#2e2e22', x: 8, y: -19, r: 2.6 },
      { t: 'p', c: 'b', o: 1, pts: [[-30, -9], [-20, -13], [26, -13], [34, -5], [34, 5], [26, 13], [-20, 13], [-30, 9]] },
      { t: 'r', c: 'h', o: 1, x: -4, y: -6, w: 18, h: 12 }, { t: 'c', c: 'b', o: 1, x: 4, y: 0, r: 4 },
      { t: 'r', c: '#14140e', x: 30, y: -4.4, w: 1.4, h: 2.4 }, { t: 'r', c: '#14140e', x: 30, y: 2, w: 1.4, h: 2.4 },
      { t: 'em', x: -21, y: 0, s: 1.1 }],
      fl: [[24, -19.5], [24, 19.5]], mgf: [[31, -3.2], [31, 3.2]] })
});
Object.assign(NU.de, {
  tkL: tkv({ name: 'Kugelpanzer', pl: 'Kugelpanzers', cost: 80, hp: 70, dmg: 5, cd: 0.24, range: 200, speed: 40, w: 0.5, park: 24, len: 9, bar: [18, -15],
    role: 'Tiny one-man armoured ball. Machine gun only, but bullets barely scratch it.' },
    { ball: true, L: 10, W: 10 }, true),
  tkH: tkv({ name: 'Maus', pl: 'Maus tanks', cost: 640, hp: 1700, dmg: 46, cd: 1.5, range: 260, splash: 24, speed: 14, w: 3, park: 50, len: 34, bar: [46, -26],
    mg: { dmg: 5, cd: 0.22, range: 210, acc: 0.5 },
    role: 'Enormous armour and a long gun, but very slow.' },
    { L: 34, W: 16, tr: [[10, 16]], parts: [
      { t: 'p', c: 'b', o: 1, pts: [[-32, -11], [-28, -14], [26, -14], [34, -7], [34, 7], [26, 14], [-28, 14], [-32, 11]] },
      { t: 'r', c: 'h', o: 1, x: -30, y: -8, w: 13, h: 16 },
      { t: 'r', c: '#14140e', x: 31, y: -5, w: 1.4, h: 2.4 }, { t: 'r', c: '#14140e', x: 31, y: 2.6, w: 1.4, h: 2.4 },
      { t: 'em', x: -17, y: 0, s: 1.1 }],
    tur: [{ x: 2, r: 10.5, len: 36, gt: 3.8, guns: 1 }], mgf: [[32, -3.8], [32, 3.8]] }),
  tkS: tkv({ name: 'Ratte', pl: 'Ratte', cost: 1500, hp: 4500, dmg: 100, cd: 2.4, range: 340, splash: 44, speed: 10, big: true, w: 6, park: 84, len: 66, bar: [76, -44],
    mg: { dmg: 6, cd: 0.12, range: 260, acc: 0.5 },
    role: 'Landkreuzer. A land battleship with twin heavy guns and machine guns. Barely moves.' },
    { L: 66, W: 32, base: '#2a2a20', tr: [[24, 32], [14, 21]], parts: [
      { t: 'p', c: 'b', o: 1, pts: [[-62, -11], [-56, -13], [54, -13], [66, -6], [66, 6], [54, 13], [-56, 13], [-62, 11]] },
      { t: 'r', c: 'h', o: 1, x: -58, y: -8, w: 22, h: 16 }, { t: 'r', c: 'h', o: 1, x: -28, y: -10, w: 14, h: 20 },
      { t: 'c', c: 'h', o: 1, x: -6, y: -13, r: 4.6 }, { t: 'c', c: 'h', o: 1, x: -6, y: 13, r: 4.6 },
      { t: 'c', c: '#14140e', x: -6, y: -13, r: 1.4 }, { t: 'c', c: '#14140e', x: -6, y: 13, r: 1.4 },
      { t: 'em', x: -46, y: 0, s: 1.8 }],
      tur: [{ x: 30, r: 16, len: 58, gt: 4.6, guns: 2, gw: 5 }, { x: -40, r: 9, len: 28, gt: 2.8, guns: 1 }], mgf: [[-6, -17], [-6, 17], [62, -4], [62, 4]] })
});
Object.assign(NU.fr, {
  tkL: tkv({ name: 'FT mitrailleuse', pl: 'FT mitrailleuses', cost: 90, hp: 200, dmg: 5, cd: 0.2, range: 230, speed: 36, w: 0.6, park: 30, len: 13, bar: [22, -17],
    role: 'The machine-gun version of the Renault FT. Cheap and fast.' },
    { L: 14, W: 8, tr: [[4.2, 8]], parts: [
      { t: 'p', c: 'b', o: 1, pts: [[-12, -4.2], [8, -4.2], [12.5, -2], [12.5, 2], [8, 4.2], [-12, 4.2]] },
      { t: 'c', c: '#22221a', x: 13.5, y: -6.1, r: 2.7 }, { t: 'c', c: '#22221a', x: 13.5, y: 6.1, r: 2.7 },
      { t: 'em', x: -7.5, y: 0, s: 0.5 }],
      tur: [{ x: 1, r: 4.5, len: 11, gt: 1.5, guns: 1 }] }, true),
  tkH: tkv({ name: 'Saint-Chamond', pl: 'Saint-Chamonds', cost: 290, hp: 640, dmg: 28, cd: 1.7, range: 250, splash: 22, speed: 18, w: 2, park: 50, len: 28, bar: [36, -24],
    mg: { dmg: 5, cd: 0.3, range: 190, acc: 0.5 },
    role: 'Heavy tank with a long nose gun and four machine guns.' },
    { L: 28, W: 14, tr: [[8, 14]], parts: [
      { t: 'r', c: 'b', o: 1, x: -26, y: -9, w: 50, h: 18 },
      { t: 'p', c: 'b', o: 1, pts: [[24, -9], [30, -6], [41, -6], [41, 6], [30, 6], [24, 9]] },
      { t: 'r', c: 'h', o: 1, x: -14, y: -6, w: 15, h: 12 },
      { t: 'l', x1: 38, y1: 0, x2: 52, y2: 0, w: 3.4 }, { t: 'c', c: '#2e2e22', x: 40, y: 0, r: 2.4 },
      { t: 'c', c: '#2e2e22', x: 2, y: -10, r: 2 }, { t: 'c', c: '#2e2e22', x: 2, y: 10, r: 2 },
      { t: 'c', c: '#2e2e22', x: -16, y: -10, r: 2 }, { t: 'c', c: '#2e2e22', x: -16, y: 10, r: 2 },
      { t: 'em', x: 12, y: 0, s: 0.8 }],
      fl: [[53, 0]], mgf: [[2, -12], [2, 12]] })
});
Object.assign(NU.us, {
  tkL: tkv({ name: 'Ford 3-Ton', pl: 'Ford 3-Tons', cost: 60, hp: 90, dmg: 4, cd: 0.24, range: 190, speed: 52, thin: true, w: 0.4, park: 24, len: 10, bar: [18, -14],
    role: 'Tiny two-man tank with one machine gun. Very cheap and very quick.' },
    { L: 10, W: 7, tr: [[3.5, 7]], parts: [
      { t: 'r', c: 'b', o: 1, x: -8, y: -3.6, w: 17, h: 7.2 }, { t: 'c', c: 'h', o: 1, x: -1, y: 0, r: 2.6 },
      { t: 'l', x1: 2, y1: 0, x2: 11, y2: 0, w: 1.3 }, { t: 'em', x: 5.5, y: 0, s: 0.45 }],
      fl: [[12, 0]] }, true),
  tkH: tkv({ name: 'T28 super-heavy', pl: 'T28s', cost: 700, hp: 1900, dmg: 54, cd: 2.1, range: 300, splash: 27, speed: 13, w: 3, park: 60, len: 38, bar: [50, -27],
    mg: { dmg: 5, cd: 0.22, range: 220, acc: 0.5 },
    role: 'Turretless monster with a huge fixed gun. Long reach, heavy armour, slow.' },
    { L: 38, W: 17, tr: [[11, 17]], parts: [
      { t: 'p', c: 'b', o: 1, pts: [[-34, -11], [-30, -14], [24, -14], [38, -8], [38, 8], [24, 14], [-30, 14], [-34, 11]] },
      { t: 'r', c: 'h', o: 1, x: -8, y: -9, w: 30, h: 18 }, { t: 'r', c: 'b', o: 1, x: -2, y: -5.5, w: 14, h: 11 },
      { t: 'l', x1: 22, y1: 0, x2: 53, y2: 0, w: 4.6 }, { t: 'r', c: '#2e2e22', x: 50, y: -3.4, w: 5, h: 6.8 },
      { t: 'em', x: -24, y: 0, s: 1.2 }],
      fl: [[57, 0]], fs: 4, mgf: [[34, -4], [34, 4]] })
});
Object.assign(NU.ru, {
  tkH: tkv({ name: 'Mendeleev tank', pl: 'Mendeleev tanks', cost: 360, hp: 900, dmg: 38, cd: 1.8, range: 240, splash: 22, speed: 14, w: 2, park: 38, len: 22, bar: [34, -22],
    role: 'Slow ironclad with a heavy turret gun. Tough and affordable.' },
    { L: 22, W: 13, tr: [[8, 13]], parts: [
      { t: 'p', c: 'b', o: 1, pts: [[-21, -8], [-21, 8], [14, 8], [22, 3], [22, -3], [14, -8]] },
      { t: 'r', c: 'h', o: 1, x: -19, y: -6, w: 11, h: 12 }, { t: 'em', x: -13, y: 0, s: 0.8 }],
      tur: [{ x: 4, r: 6.5, len: 20, gt: 2.6, guns: 1 }], mgf: [[19, -194], [19, 4]] })
});
Object.assign(NU.ah, {
  tkL: { name: '\u0160koda 15 cm howitzer', pl: '\u0160koda 15 cm howitzers', cost: 190, hp: 180, dmg: 55, cd: 5, range: 560, min: 100, splash: 34, shell: 1.6, arc: 2, cov: 0.8, atk: 'mortar',
    moveFire: false, soft: true, rear: true, armor: true, speed: 18, w: 0.5, park: 44, len: 0, bar: [28, -19],
    role: 'Field howitzer. Reaches two trenches and shells whole positions.',
    draw: { L: 14, W: 10, tr: [], parts: [
      { t: 'r', c: '#4a3b28', x: -14, y: -6, w: 22, h: 12 },
      { t: 'r', c: '#17170f', x: -6, y: -11, w: 10, h: 4.5 }, { t: 'r', c: '#17170f', x: -6, y: 6.5, w: 10, h: 4.5 },
      { t: 'r', c: '#6a736d', o: 1, x: -8, y: -5, w: 13, h: 10 },
      { t: 'l', x1: 0, y1: 0, x2: 19, y2: 0, w: 5.2, c: '#2a2d2b' }, { t: 'l', x1: 16, y1: 0, x2: 19, y2: 0, w: 6.4, c: '#3c403d' },
      { t: 'c', c: 'h', x: -12, y: -7, r: 2.8 }, { t: 'c', c: 'h', x: -13, y: 7, r: 2.8 }],
      fl: [[22, 0]], fs: 4 } }
});
Object.assign(NU.it, {
  tkL: tkv({ name: 'Fiat 3000', pl: 'Fiat 3000s', cost: 115, hp: 220, dmg: 5, cd: 0.19, range: 230, speed: 32, w: 0.7, park: 30, len: 16, bar: [24, -17],
    role: 'Light tank with twin machine guns. Cheap and steady.' },
    { L: 16, W: 9, tr: [[4.5, 9]], parts: [
      { t: 'p', c: 'b', o: 1, pts: [[-15, -4.5], [9, -4.5], [14, -2.5], [14, 2.5], [9, 4.5], [-15, 4.5]] },
      { t: 'r', c: 'h', o: 1, x: -14, y: -3.6, w: 8, h: 7.2 },
      { t: 'l', x1: -15, y1: 0, x2: -22, y2: 0, w: 1.6, c: '#2b2b20' }, { t: 'em', x: -9, y: 0, s: 0.55 }],
      tur: [{ x: 3, r: 4.2, len: 12, gt: 1.5, guns: 2, gw: 1.4 }] }, true),
  tank: tkv({ name: 'Fiat 2000', pl: 'Fiat 2000s', cost: 340, hp: 800, dmg: 30, cd: 1.8, range: 230, splash: 22, speed: 15, w: 1, park: 44, len: 30, bar: [40, -24],
    mg: { dmg: 5, cd: 0.22, range: 200, acc: 0.5 },
    role: 'Slow 40-ton fortress. A turret gun and a ring of machine guns.' },
    { L: 30, W: 15, tr: [[9, 15]], parts: [
      { t: 'p', c: 'b', o: 1, pts: [[-28, -10], [-24, -12], [22, -12], [30, -6], [30, 6], [22, 12], [-24, 12], [-28, 10]] },
      { t: 'r', c: 'h', o: 1, x: -25, y: -8, w: 17, h: 16 },
      { t: 'c', c: '#2e2e22', x: -8, y: -12.5, r: 2.2 }, { t: 'c', c: '#2e2e22', x: -8, y: 12.5, r: 2.2 },
      { t: 'c', c: '#2e2e22', x: 14, y: -12.5, r: 2.2 }, { t: 'c', c: '#2e2e22', x: 14, y: 12.5, r: 2.2 },
      { t: 'em', x: -16, y: 0, s: 1 }],
      tur: [{ x: 4, r: 9, len: 28, gt: 3.2, guns: 1 }], mgf: [[-8, -14.5], [-8, 14.5], [14, -14.5], [14, 14.5]] }),
  tkH: tkv({ name: 'P 26/40', pl: 'P 26/40s', cost: 560, hp: 1250, dmg: 42, cd: 1.5, range: 280, splash: 24, speed: 18, w: 2.5, park: 46, len: 28, bar: [42, -26],
    mg: { dmg: 5, cd: 0.24, range: 210, acc: 0.5 },
    role: 'Fast heavy tank with a long 75 mm gun.' },
    { L: 28, W: 14, tr: [[8, 14]], parts: [
      { t: 'p', c: 'b', o: 1, pts: [[-26, -9], [-22, -12], [18, -12], [28, -6], [28, 6], [18, 12], [-22, 12], [-26, 9]] },
      { t: 'r', c: 'h', o: 1, x: -24, y: -6, w: 14, h: 12 },
      { t: 'r', c: '#14140e', x: -21, y: -4, w: 1.4, h: 8 }, { t: 'r', c: '#14140e', x: -18, y: -4, w: 1.4, h: 8 },
      { t: 'r', c: '#14140e', x: 25, y: -3.4, w: 1.4, h: 2.4 }, { t: 'em', x: -12, y: 0, s: 0.9 }],
      tur: [{ x: 2, r: 8.5, len: 36, gt: 3.4, guns: 1 }], mgf: [[27, -4], [27, 4]] })
});
/* Antarctica: realistic designs from both eras, painted snow white and big, and whose shells chill what they hit */
const SW1 = '#e8eef2', SW2 = '#c4d1da', SBL = '#5d8fb8', AQMG = { dmg: 5, cd: 0.22, range: 210, acc: 0.5 };
const aqd = (L, W, x) => Object.assign({ cb: SW1, ch: SW2, L, W }, x);
const AQ_TANKS = {
  tkL: [{ name: 'Ross', pl: 'Ross tanks', cost: 160, hp: 380, dmg: 6, cd: 0.17, range: 270, speed: 30, w: 1, park: 32, len: 27, bar: [34, -24],
    role: 'Light tank with twin machine guns. Huge for a light tank, and costly.' },
    aqd(28, 14, { tr: [[8, 14]], parts: [
      { t: 'p', c: 'b', o: 1, pts: [[-26, -8], [20, -8], [28, -4], [28, 4], [20, 8], [-26, 8]] },
      { t: 'r', c: SBL, x: -26, y: -1.4, w: 50, h: 2.8 }, { t: 'r', c: 'h', o: 1, x: -25, y: -5.5, w: 14, h: 11 }, { t: 'em', x: -18, y: 0, s: 0.8 }],
      tur: [{ x: 3, r: 6.2, len: 19, gt: 1.8, guns: 2, gw: 2 }] }), true],
  tank: [{ name: 'Weddell', pl: 'Weddell tanks', cost: 460, hp: 950, dmg: 36, cd: 1.5, range: 240, splash: 22, speed: 20, w: 2, park: 42, len: 38, bar: [46, -30], mg: AQMG,
    role: 'Medium tank with a long gun. Big for its class.' },
    aqd(38, 19, { tr: [[11, 19]], parts: [
      { t: 'p', c: 'b', o: 1, pts: [[-36, -11], [-30, -14], [26, -14], [38, -6], [38, 6], [26, 14], [-30, 14], [-36, 11]] },
      { t: 'r', c: SBL, x: -36, y: -1.6, w: 70, h: 3.2 }, { t: 'r', c: 'h', o: 1, x: -34, y: -9, w: 20, h: 18 },
      { t: 'r', c: '#14140e', x: 34, y: -4.4, w: 1.4, h: 2.4 }, { t: 'r', c: '#14140e', x: 34, y: 2, w: 1.4, h: 2.4 }, { t: 'em', x: -24, y: 0, s: 1.2 }],
      tur: [{ x: 3, r: 11, len: 42, gt: 3.6, guns: 1 }], mgf: [[35, -3.2], [35, 3.2]] })],
  tkM: [{ name: 'Vinson', pl: 'Vinson tanks', cost: 650, hp: 1400, dmg: 40, cd: 1.4, range: 260, splash: 24, speed: 18, w: 3.5, park: 50, len: 48, bar: [56, -40], mg: AQMG,
    role: 'Giant rhomboid with a turret and sponson guns.' },
    aqd(48, 30, { tr: [[14, 24]], parts: [
      { t: 'r', c: 'h', o: 1, x: -10, y: 24, w: 26, h: 6 }, { t: 'r', c: 'h', o: 1, x: -10, y: -30, w: 26, h: 6 },
      { t: 'l', x1: 14, y1: 27, x2: 36, y2: 27.5, w: 3.2 }, { t: 'l', x1: 14, y1: -27, x2: 36, y2: -27.5, w: 3.2 },
      { t: 'c', c: '#2e2e22', x: 14, y: 27, r: 3 }, { t: 'c', c: '#2e2e22', x: 14, y: -27, r: 3 },
      { t: 'p', c: 'b', o: 1, pts: [[-44, -14], [-30, -20], [34, -20], [48, -8], [48, 8], [34, 20], [-30, 20], [-44, 14]] },
      { t: 'r', c: SBL, x: -44, y: -1.8, w: 88, h: 3.6 }, { t: 'r', c: 'h', o: 1, x: -34, y: -10, w: 22, h: 20 },
      { t: 'r', c: '#14140e', x: 44, y: -5, w: 1.6, h: 2.6 }, { t: 'r', c: '#14140e', x: 44, y: 2.4, w: 1.6, h: 2.6 }, { t: 'em', x: -24, y: 0, s: 1.4 }],
      tur: [{ x: 4, r: 13, len: 44, gt: 4, guns: 1 }], mgf: [[37, -27.5], [37, 27.5]] })],
  tkH: [{ name: 'Erebus', pl: 'Erebus tanks', cost: 850, hp: 2100, dmg: 52, cd: 1.8, range: 280, splash: 27, speed: 16, w: 5, big: true, park: 62, len: 60, bar: [70, -52], mg: { dmg: 6, cd: 0.2, range: 230, acc: 0.5 },
    role: 'Heavy with a monster gun and a rear turret. Very tough.' },
    aqd(60, 34, { base: '#2a2a20', tr: [[22, 34]], parts: [
      { t: 'p', c: 'b', o: 1, pts: [[-58, -18], [-52, -22], [50, -22], [60, -10], [60, 10], [50, 22], [-52, 22], [-58, 18]] },
      { t: 'r', c: SBL, x: -58, y: -2, w: 116, h: 4 }, { t: 'r', c: 'h', o: 1, x: -54, y: -14, w: 26, h: 28 },
      { t: 'c', c: 'h', o: 1, x: -8, y: -17, r: 5 }, { t: 'c', c: 'h', o: 1, x: -8, y: 17, r: 5 },
      { t: 'r', c: '#14140e', x: 56, y: -6, w: 1.8, h: 3 }, { t: 'r', c: '#14140e', x: 56, y: 3, w: 1.8, h: 3 }, { t: 'em', x: -42, y: 0, s: 1.9 }],
      tur: [{ x: 16, r: 17, len: 60, gt: 5, guns: 1 }, { x: -24, r: 10, len: 30, gt: 3, guns: 1 }], mgf: [[-8, -17], [-8, 17], [57, -4.5], [57, 4.5]] })],
  tkS: [{ name: 'Pole', pl: 'Pole tanks', cost: 1650, hp: 4900, dmg: 90, cd: 2.3, range: 360, splash: 36, speed: 13, w: 8, big: true, park: 80, len: 78, bar: [88, -62], mg: { dmg: 6, cd: 0.14, range: 260, acc: 0.5 },
    role: 'Land cruiser with three turrets. Slow, enormous and very costly.' },
    aqd(78, 40, { base: '#2a2a20', tr: [[28, 40], [18, 26]], parts: [
      { t: 'p', c: 'b', o: 1, pts: [[-76, -15], [-68, -17], [66, -17], [78, -9], [78, 9], [66, 17], [-68, 17], [-76, 15]] },
      { t: 'r', c: SBL, x: -76, y: -2.2, w: 152, h: 4.4 }, { t: 'r', c: 'h', o: 1, x: -72, y: -12, w: 28, h: 24 }, { t: 'r', c: 'h', o: 1, x: -30, y: -13, w: 18, h: 26 },
      { t: 'c', c: 'h', o: 1, x: 2, y: -14, r: 5 }, { t: 'c', c: 'h', o: 1, x: 2, y: 14, r: 5 },
      { t: 'r', c: '#14140e', x: 74, y: -5, w: 2, h: 3.4 }, { t: 'r', c: '#14140e', x: 74, y: 2, w: 2, h: 3.4 }, { t: 'em', x: -58, y: 0, s: 2.2 }],
      tur: [{ x: 38, r: 20, len: 76, gt: 5.2, guns: 2, gw: 5.5 }, { x: -2, r: 14, len: 52, gt: 4, guns: 1 }, { x: -46, r: 10, len: 34, gt: 3, guns: 1 }], mgf: [[2, -17], [2, 17], [75, -5], [75, 5]] })]
};
NU.aq = NU.aq || {};
for (const k in AQ_TANKS) { const [o, d, mg] = AQ_TANKS[k]; NU.aq[k] = tkv(o, d, !!mg); }

/* fully assembled per-nation stats: base type ← nation override */
export const STATS = { gb: {}, de: {}, fr: {}, ru: {}, us: {}, ah: {}, it: {}, aq: {} };
for (const n of NATS) for (const k of ORDER) if (UT[k] || NU[n][k]) STATS[n][k] = Object.assign({}, UT[k], NU[n][k] || {});

/* the armour a country can field, cheapest first */
export const tkList = n => TK.filter(k => STATS[n][k]).sort((a, b) => STATS[n][a].cost - STATS[n][b].cost);
/* the tank you must unlock before this one (none for the light tank) */
export const tkPrev = (n, k) => { if (k === 'tkL') return null; for (let j = TK.indexOf(k) - 1; j >= 0; j--) if (TK[j] !== 'tkL' && STATS[n][TK[j]]) return TK[j]; return null; };

/* non-orderable units: jobs, emplacements and superweapons */
export const SPECIAL = {
  tommy: { name: 'Thompson gunner', pl: 'Thompson gunners', cost: 45, hp: 35, speed: STATS.us.rifle.speed, range: 120, dmg: 4.9, cd: 0.455, acc: 0.75, atk: 'raider', fallFire: true, role: 'Airborne only. A 1919 Thompson submachine gun: short range, fast fire, shoots while falling.' },
  carrier: { name: 'Sapper', cost: 15, hp: 40, dmg: 0, cd: 9, range: 0, acc: 0, speed: 62, noFire: true },
  guncarrier: { name: 'Gun team', cost: 25, hp: 45, dmg: 0, cd: 9, range: 0, acc: 0, speed: 44, noFire: true },
  nest: { name: 'MG nest', cost: 90, hp: 200, dmg: 5, cd: 0.18, range: 300, acc: 0.5, speed: 0, nest: true, atk: 'mg' },
  pillbox: { name: 'Pillbox', cost: 170, hp: 420, dmg: 5, cd: 0.18, range: 300, acc: 0.5, speed: 0, nest: true, atk: 'mg',
             ncov: { rifle: 0.06, mg: 0.06, sniper: 0.1, base: 0.1, mortar: 0.6, tank: 0.7, barrage: 0.6, raider: 0.5 } },
  tsar: { name: 'Tsar Tank', cost: 900, hp: 2800, speed: 17, dmg: 48, cd: 1.3, splash: 30, range: 260, shell: 0.25, moveFire: true, armor: true, park: 72, len: 12, bar: [60, -44], big: true, turret: { x: 10, len: 20 }, crush: 44, crushDps: 90, mg: { dmg: 5, cd: 0.14, range: 240, acc: 0.5 }, atk: 'tank', sup: true },
  char2c: { name: 'Char 2C', cost: 1100, hp: 3200, dmg: 65, cd: 1.3, splash: 32, range: 290, speed: 15, shell: 0.25, moveFire: true, armor: true, park: 50, len: 31, bar: [50, -25], turret: { x: 13, len: 21 }, mg: { dmg: 5, cd: 0.12, range: 240, acc: 0.5 }, atk: 'tank', sup: true },
  depot: { name: 'Supply depot', cost: 120, hp: 150, dmg: 0, cd: 9, range: 0, acc: 0, speed: 0, nest: true, noFire: true, depot: true },
  pit75: { name: '75 mm gun pit', cost: 130, hp: 180, dmg: 20, cd: 1.8, range: 380, min: 50, splash: 26, shell: 0.3, flat: true, cov: 0.3, speed: 0, nest: true, atk: 'mortar' },
  pit65: { name: '65 mm mountain gun pit', cost: 120, hp: 200, dmg: 18, cd: 1.6, range: 400, min: 60, splash: 24, shell: 0.4, arc: 0.9, cov: 0.55, speed: 0, nest: true, atk: 'mortar' }
};
SPECIAL.bunker = { name: 'Bunker', cost: 120, hp: 600, dmg: 0, cd: 9, range: 0, acc: 0, speed: 0, nest: true, noFire: true, bunker: true,
  ncov: { rifle: 0.08, mg: 0.08, sniper: 0.12, base: 0.12, mortar: 0.65, tank: 0.7, barrage: 0.65, raider: 0.5 } };
SPECIAL.colossus = tkv({ name: 'Southern Colossus', cost: 2500, hp: 9000, dmg: 120, cd: 2.0, range: 400, splash: 50, speed: 9, big: true, sup: true, park: 104, len: 104, bar: [110, -72],
  crush: 60, crushDps: 140, mg: { dmg: 7, cd: 0.1, range: 280, acc: 0.5 } },
  aqd(104, 50, { base: '#2a2a20', tr: [[36, 50], [24, 34]], parts: [
    { t: 'p', c: 'b', o: 1, pts: [[-102, -20], [-94, -23], [92, -23], [104, -11], [104, 11], [92, 23], [-94, 23], [-102, 20]] },
    { t: 'r', c: SBL, x: -102, y: -2.6, w: 204, h: 5.2 }, { t: 'r', c: 'h', o: 1, x: -98, y: -14, w: 34, h: 28 }, { t: 'r', c: 'h', o: 1, x: -54, y: -15, w: 22, h: 30 },
    { t: 'c', c: 'h', o: 1, x: -20, y: -17, r: 6 }, { t: 'c', c: 'h', o: 1, x: -20, y: 17, r: 6 }, { t: 'c', c: 'h', o: 1, x: 24, y: -18, r: 5.5 }, { t: 'c', c: 'h', o: 1, x: 24, y: 18, r: 5.5 },
    { t: 'r', c: '#14140e', x: 99, y: -6, w: 2.2, h: 3.8 }, { t: 'r', c: '#14140e', x: 99, y: 2.4, w: 2.2, h: 3.8 }, { t: 'em', x: -82, y: 0, s: 2.8 }],
    tur: [{ x: 58, r: 24, len: 96, gt: 6.4, guns: 2, gw: 7 }, { x: 16, r: 18, len: 70, gt: 5, guns: 2, gw: 5 }, { x: -30, r: 13, len: 46, gt: 3.8, guns: 1 }, { x: -70, r: 10, len: 36, gt: 3, guns: 1 }],
    mgf: [[-20, -17], [-20, 17], [24, -18], [24, 18]] }));

/** Stats lookup for a concrete nation (prototype `ut(side,k)` minus the side indirection). */
export const utOf = (nation, k) => STATS[nation][k] || SPECIAL[k];

/* fortification and cover constants */
export const FORT_COST = [60, 120, 200, 320], FORTD = [1, 0.85, 0.72, 0.6, 0.5], FORTA = [1, 0.88, 0.76, 0.65, 0.55], SLOTS = [0.22, 0.62, 0.78];
export const maxFort = isSuper => (isSuper ? 4 : 3);
export const NESTCOV = { rifle: 0.25, mg: 0.25, sniper: 0.45, base: 0.3, mortar: 0.8, tank: 0.8, barrage: 0.8, raider: 1 };
export const COV = { rifle: 0.25, mg: 0.25, sniper: 0.5, mortar: 0.7, tank: 0.6, base: 0.3, raider: 1, barrage: 0.7 };
export const ARM = { rifle: 0.1, mg: 0.15, sniper: 0.1, raider: 0.6, mortar: 1, tank: 1, base: 0.5, barrage: 1 };

export const BASE_HP = 2500;
export const BW = 10;
export const GARR_T = [50, 85, 130, 200];
export const DEPOT_RATE = 0.8, SUPER_INC = 3, SUPER_CARD_T = 180;
export const BUNKER_CAP = 6, BUNKER_MAX = 2;
