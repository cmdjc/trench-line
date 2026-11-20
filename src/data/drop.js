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

export const dropCost = () => Math.round(DROP_MIX.reduce((s, [k, n]) => s + utOf('us', k).cost * n, 0) * DROP_MARKUP);
