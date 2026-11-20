// Base upgrades: three shared tracks plus one national track, each with 3 tiers.
// Browser-free data only; the effects live in src/sim.

import { SW } from './superweapons.js';

export const BASE_COST = [300, 550, 900];
export const AI_BASE_SHARE = 0.2;  // share of enemy income put in its upgrade fund after 150 s
export const SHARED = ['walls', 'depot', 'hosp'];

export const WALLS_HP = 500;      // HQ health per tier
export const WALLS_REPAIR = 4;    // HQ hp/s at tier 3
export const DEPOT_INC = 0.6;     // supplies/s per tier
export const HOSP_HEAL = 0.8;     // hp/s per tier

export const TUNNEL_T = 15, MINE_COST = 0.8;                  // gb T1
export const MINE_R = 100, MINE_TANK = 500, MINE_NEST = 600;  // gb T2
export const PARIS_CD = 65;                                   // de T1
export const PARIS_DMG = 900, PARIS_SPLASH = 110;             // de T2
export const PARIS_GAP = 1.5;                                 // de T3, seconds between shells
export const VOIE_SPEED = 1.2;                                // fr T1
export const VOIE_INC = 1;                                    // fr T2
export const CONVOY_T = 45, CONVOY_N = 3;                     // fr T3
export const LIB_GROWTH = 0.3;                                // us T1, supplies/s per minute
export const LIB_DEPOT = 1.5;                                 // us T2
export const LIB_TANK = 0.85;                                 // us T3
export const KUK_DMG = 1.15, KUK_HP = 1.15, KUK_CAP = 5;      // ah
export const DOCK_CD = 100, DOCK_HP = 1.3, DOCK_DMG = 1.3, DOCK_SCALE = 1.15; // aq
export const TELE_RANGE = [0, 3, 6, Infinity];                // it, trenches from own HQ, by tier
export const CONSCRIPT = [null, { t: 20, n: 1 }, { t: 12, n: 1 }, { t: 12, n: 3 }]; // ru

const pct = m => Math.round((m - 1) * 100);

export const BASE = {
  walls: { name: 'HQ Walls', tiers: [
    `Your HQ gains ${WALLS_HP} health.`,
    `Your HQ gains another ${WALLS_HP} health.`,
    `Your HQ gains another ${WALLS_HP} health and repairs ${WALLS_REPAIR} health per second.`] },
  depot: { name: 'Supply Depot', tiers: [
    `+${DEPOT_INC} supplies every second.`,
    `Another +${DEPOT_INC} supplies every second.`,
    `Another +${DEPOT_INC} supplies every second.`] },
  hosp: { name: 'Field Hospital', tiers: [
    `Troops resting in a trench recover ${HOSP_HEAL} health per second.`,
    `Troops resting in a trench recover another ${HOSP_HEAL} health per second.`,
    `Troops resting in a trench recover another ${HOSP_HEAL} health per second.`] },
  gb: { name: 'Tunnelling Company', tiers: [
    `Your Messines mine tunnels in ${TUNNEL_T} seconds and costs ${Math.round((1 - MINE_COST) * 100)}% less.`,
    `Your Messines mine has a wider, stronger blast: a radius of ${MINE_R}, dealing ${MINE_TANK} damage to tanks and ${MINE_NEST} to emplacements.`,
    `Newly bought infantry tunnel out at the trench they are sent to, instead of walking from your HQ.`] },
  de: { name: 'Krupp Works', tiers: [
    `The Paris Gun is ready to fire again after ${PARIS_CD} seconds instead of ${SW.de.cd}.`,
    `Paris Gun shells deal ${PARIS_DMG} damage in a wider ${PARIS_SPLASH} radius.`,
    `The Paris Gun fires two shells, ${PARIS_GAP} seconds apart.`] },
  fr: { name: 'Voie Sacrée', tiers: [
    `Your infantry move ${pct(VOIE_SPEED)}% faster.`,
    `+${VOIE_INC} supplies every second.`,
    `Every ${CONVOY_T} seconds, a lorry convoy brings ${CONVOY_N} free troops to the front.`] },
  us: { name: 'Liberty Depot', tiers: [
    `Your supply income grows by ${LIB_GROWTH} per second every minute.`,
    `Supply Depots yield ${pct(LIB_DEPOT)}% more.`,
    `Your tanks cost ${Math.round((1 - LIB_TANK) * 100)}% less.`] },
  ah: { name: 'K.u.K. Officer School', tiers: [
    `Your infantry deal ${pct(KUK_DMG)}% more damage.`,
    `Your infantry have ${pct(KUK_HP)}% more health.`,
    `Room for ${KUK_CAP} more infantry.`] },
  aq: { name: 'Colossus Drydock', tiers: [
    `The Southern Colossus is ready again after ${DOCK_CD} seconds instead of ${SW.aq.cd}.`,
    `The Southern Colossus has ${pct(DOCK_HP)}% more health.`,
    `The Southern Colossus is ${pct(DOCK_SCALE)}% bigger and deals ${pct(DOCK_DMG)}% more damage.`] },
  it: { name: 'Teleferica', tiers: [
    `Newly bought infantry ride a cable car straight to the selected trench, up to ${TELE_RANGE[1]} trenches from your HQ.`,
    `Newly bought infantry ride a cable car straight to the selected trench, up to ${TELE_RANGE[2]} trenches from your HQ.`,
    `The cable car reaches any trench and carries tanks too.`] },
  ru: { name: 'Conscription Office', tiers: [
    `Every ${CONSCRIPT[1].t} seconds, ${CONSCRIPT[1].n} free conscript joins your army.`,
    `Every ${CONSCRIPT[2].t} seconds, ${CONSCRIPT[2].n} free conscript joins your army.`,
    `Every ${CONSCRIPT[3].t} seconds, ${CONSCRIPT[3].n} free conscripts join your army.`] }
};

export const baseIds = nation => [...SHARED, nation];
