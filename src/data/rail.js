// Railways, stage 1: track and transport train constants and national trains.
// Pure data, no browser APIs. Design: docs/superpowers/specs/2026-11-20-railways-stage1-design.md

import { STATS, WH } from './units.js';

export const TRACK_COST = 40;      // supplies per segment laid
export const REPAIR_COST = 20;     // supplies per broken segment repaired
export const TRAIN_SLOTS = 3;      // shared cap on trains in play
export const TRIP_SUPPLY = 15;     // supplies carried per trip
export const WOUNDED = 0.4;        // fraction of riders hurt when a train is hit
export const BIG_SPLASH = 60;      // splash radius at or above which a shell breaks track
export const AI_RAIL_T = 90;       // seconds before the AI starts a railway fund
export const AI_RAIL_SHARE = 0.1;  // share of enemy income sent to the railway fund
export const RAIL_Y = WH - 14;     // rail lane, near the bottom edge of the field

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
};
