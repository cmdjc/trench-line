// Airborne drop (US superweapon) constants.
import { utOf } from './units.js';

export const DROP_MIX = [['tommy', 4], ['rifle', 2], ['mg', 2]];
export const DROP_MARKUP = 1.1;
export const DROP_RANGE = 3;
export const DROP_FALL = 4;
export const DROP_STAGGER = 1;
// Landing scramble: for this many seconds after touching down a paratrooper has no trench cover and fires at DROP_SCRAMBLE_ACC of its accuracy.
export const DROP_SCRAMBLE = 5;
export const DROP_SCRAMBLE_ACC = 0.3;
export const AI_DROP_T = 120;
// A falling paratrooper is drawn this many pixels up the screen per second of fall left (tracers start there too).
export const FALL_LIFT = 14;
export const FALL_DRIFT = 10;   // px per second of fall still to go: falling men are drawn this far behind their landing spot and drift forward onto it

export const dropCost = () => Math.round(DROP_MIX.reduce((s, [k, n]) => s + utOf('us', k).cost * n, 0) * DROP_MARKUP);
