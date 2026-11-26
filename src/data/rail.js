// Railways: track, transport train and armoured train constants and national trains.
// Pure data, no browser APIs. Design: docs/superpowers/specs/2026-11-20-railways-stage1-design.md

import { STATS, WH } from './units.js';

export const TRACK_COST = 20;      // supplies per segment laid
export const REPAIR_COST = 20;     // supplies per broken segment repaired
export const TRAIN_SLOTS = 3;      // cap on each side's trains in play, shared by transport and armoured trains
export const TRIP_SUPPLY = 15;     // supplies per round trip that carried riders, scaled by distance (full at TRIP_FULL px)
export const TRIP_FULL = 5 * 230;  // trip length in px that earns the full TRIP_SUPPLY: five default trench gaps
export const WOUNDED = 0.4;        // wounded threshold: settled troops below this fraction of max hp ride home to heal
export const BIG_SPLASH = 60;      // splash radius at or above which a shell breaks track
export const AI_RAIL_T = 90;       // seconds before the AI starts a railway fund
export const AI_RAIL_SHARE = 0.15;  // share of enemy income sent to the railway fund
export const AI_ARMOR_END = 2;     // enemy track end before it saves for an armoured train
export const BARRIER_R = 26;       // px either side of a trench with track where sandbags shield the rails from big shells
export const RAIL_Y = WH / 2;      // rail lane, through the middle of the field

const BASE_SPEED = 3 * STATS.gb.rifle.speed;

// Per-nation stats stay within 15% of base (cost 150, hp 300, cap 6, speed 3x rifle).
export const TRAINS = {
  gb: { name: 'Simplex light railway', cost: 150, hp: 300, cap: 6, speed: BASE_SPEED },
  de: { name: 'Heeresfeldbahn', cost: 160, hp: 330, cap: 6, speed: 127 },
  fr: { name: 'Decauville train', cost: 140, hp: 290, cap: 6, speed: BASE_SPEED },
  ru: { name: 'Narrow-gauge field train', cost: 130, hp: 300, cap: 6, speed: BASE_SPEED },
  us: { name: 'Baldwin trench locomotive', cost: 150, hp: 300, cap: 6, speed: 152 },
  ah: { name: 'k.u.k. Feldbahn', cost: 150, hp: 280, cap: 6, speed: BASE_SPEED },
  it: { name: 'Ferrovia da campo', cost: 155, hp: 300, cap: 6, speed: BASE_SPEED },
  aq: { name: 'Penguin Express', cost: 165, hp: 340, cap: 6, speed: 120 },
  sx: { name: 'Sächsische Feldbahn', cost: 160, hp: 340, cap: 6, speed: 125 },
};

// Per-nation stats stay within 15% of base (cost 380, hp 600, speed 138, dmg 25, cd 1.6, range 260, splash 20;
// mg dmg 5, cd 0.2, range 280). Shell and mg accuracy are fixed, not per-nation.
export const ARMOR_TRAINS = {
  gb: { name: 'Naval armoured train', cost: 380, hp: 600, speed: 138, dmg: 25, cd: 1.6, range: 270, splash: 20, shell: 0.25, mg: { dmg: 5, cd: 0.2, range: 280, acc: 0.5 } },
  de: { name: 'Panzerzug', cost: 420, hp: 680, speed: 125, dmg: 27, cd: 1.75, range: 260, splash: 22, shell: 0.25, mg: { dmg: 5, cd: 0.18, range: 290, acc: 0.5 } },
  fr: { name: 'Train blindé', cost: 370, hp: 580, speed: 138, dmg: 24, cd: 1.4, range: 260, splash: 20, shell: 0.25, mg: { dmg: 5, cd: 0.22, range: 270, acc: 0.5 } },
  ru: { name: 'Zaamurets armoured train', cost: 350, hp: 640, speed: 130, dmg: 25, cd: 1.7, range: 250, splash: 21, shell: 0.25, mg: { dmg: 5, cd: 0.2, range: 280, acc: 0.5 } },
  us: { name: 'Liberty armored train', cost: 400, hp: 620, speed: 150, dmg: 26, cd: 1.6, range: 260, splash: 20, shell: 0.25, mg: { dmg: 5.5, cd: 0.18, range: 280, acc: 0.5 } },
  ah: { name: 'k.u.k. Panzerzug', cost: 380, hp: 600, speed: 138, dmg: 25, cd: 1.6, range: 260, splash: 20, shell: 0.25, mg: { dmg: 5, cd: 0.2, range: 280, acc: 0.5 } },
  it: { name: 'Treno armato', cost: 375, hp: 590, speed: 138, dmg: 26, cd: 1.6, range: 280, splash: 19, shell: 0.25, mg: { dmg: 5, cd: 0.21, range: 270, acc: 0.5 } },
  aq: { name: 'Iron Penguin', cost: 420, hp: 680, speed: 125, dmg: 28, cd: 1.8, range: 260, splash: 23, shell: 0.25, mg: { dmg: 5, cd: 0.2, range: 280, acc: 0.5 } },
  sx: { name: 'Sächsischer Panzerzug', cost: 420, hp: 680, speed: 120, dmg: 28, cd: 1.8, range: 250, splash: 22, shell: 0.25, mg: { dmg: 5, cd: 0.21, range: 270, acc: 0.5 } },
};
