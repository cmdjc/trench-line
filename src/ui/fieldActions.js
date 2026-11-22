// Field-action anchoring: where on screen a trench's field actions sit.
// Pure logic over G and cam; no DOM access.
import { WH } from '../data/units.js';
import { G } from '../sim/state.js';
import { posX } from '../sim/geometry.js';
import { lineOfSegment, nextSegment } from '../sim/rail.js';
import { cam, metrics } from './camera.js';

// World x for a trench's field actions, at mid-height of the zigzag.
export const anchorX = L => posX(0, L, WH / 2, false);

// Which way action stacks grow: the own-HQ side has no room at the player's HQ edge (L 0), so flip there.
export const stackSide = L => (L === 0 ? 1 : -1);

// Trench line the next Lay Track / Repair Track action would affect, or null.
export function trackGlyphLine(side) {
  const broken = G.track[side].broken;
  if (broken.size) return lineOfSegment(side, Math.min(...broken));
  const n = nextSegment(side);
  return n <= G.NT ? lineOfSegment(side, n) : null;
}

// World coordinates to canvas pixels, using the current camera and scale.
export function toScreen(worldX, worldY) {
  const { K } = metrics();
  return { x: (worldX - cam.x) * K, y: worldY * K };
}
