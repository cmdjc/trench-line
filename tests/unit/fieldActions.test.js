import { describe, it, expect, beforeEach } from 'vitest';
import { G, newGame } from '../../src/sim/state.js';
import { layTrack } from '../../src/sim/rail.js';
import { cam } from '../../src/ui/camera.js';
import { anchorX, stackSide, trackGlyphLine, toScreen } from '../../src/ui/fieldActions.js';

describe('fieldActions', () => {
  beforeEach(() => newGame('gb', 'de', 'open', 1));

  it('anchors at the trench x for a normal trench', () => {
    expect(anchorX(3)).toBe(G.LX[3] + 6); // open map, y = WH/2 gives the +6 zigzag from trenchX
  });

  it('stacks toward the own-HQ side for an ordinary trench', () => {
    expect(stackSide(5)).toBe(-1);
  });

  it('flips at the player\'s own HQ, the one edge with no room on that side', () => {
    expect(stackSide(0)).toBe(1);
  });

  it('does not flip at the enemy HQ — there is room toward the own-HQ side', () => {
    expect(stackSide(G.HQI)).toBe(-1);
  });

  it('tracks the next segment to lay', () => {
    expect(trackGlyphLine(0)).toBe(1);
  });

  it('tracks the first broken segment over the next unlaid one', () => {
    G.owner[1] = 0; layTrack(0);
    G.track[0].broken.add(1);
    expect(trackGlyphLine(0)).toBe(1);
  });

  it('is null once the track reaches the far end', () => {
    G.track[0].end = G.NT;
    expect(trackGlyphLine(0)).toBeNull();
  });

  it('converts world to screen coordinates using the camera', () => {
    cam.x = 0;
    expect(toScreen(500, 150)).toEqual({ x: 500, y: 150 }); // default metrics(): K === 1 before any resize() call
  });

  it('shifts by the camera position', () => {
    cam.x = 100;
    expect(toScreen(500, 150)).toEqual({ x: 400, y: 150 });
  });
});
