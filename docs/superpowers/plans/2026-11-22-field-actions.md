# Field Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the trench-order buttons (Advance, Fall back, Bring all here, Fortify, MG nest, Defence) and the Lay Track/Repair Track button off the page and onto the battlefield, as real `<button>` elements that float at the world position of the trench or track segment they act on, so the `.orders` panel disappears and the buy row moves up the page.

**Architecture:** A new pure module, `src/ui/fieldActions.js`, computes world-space anchors (which trench, which side to stack toward) with no DOM dependency, so it's unit-testable on its own. `src/ui/hud.js`'s existing `refresh()` calls it each tick to set `left`/`top` in CSS pixels on the (relocated, but otherwise untouched) button elements, using the same world-to-screen transform `src/ui/input.js` already uses for tap-to-select. No button's content logic, event wiring, or enabled/disabled rule changes — only where the elements live in the DOM and how their position is computed.

**Tech Stack:** Vanilla ES modules, canvas, vanilla CSS, Vitest (jsdom), the existing `tests/unit/ui-page.js` fixture.

**Spec:** `docs/superpowers/specs/2026-11-22-field-actions-design.md`

## Global Constraints

- The buttons being moved keep their existing ids (`advBtn`, `backBtn`, `gatherBtn`, `fortBtn`, `nestBtn`, `defBtn`, `trackBtn`) and all existing event listeners in `hud.js`'s `initHud()`. Only their location in the DOM and their CSS positioning change.
- `refresh()`'s existing lines that set `textContent`/`innerHTML`/`disabled`/`hidden` on these buttons are unchanged, verbatim, apart from moving within the function if needed.
- World-to-screen transform: `screenX = (worldX - cam.x) * metrics().K`, `screenY = worldY * metrics().K` (no camera offset on y) — the same transform used in `src/ui/input.js`'s tap handler and `src/ui/draw/index.js`'s `ctx.translate(-cam.x, ...)` / `ctx.scale(K, K)`.
- A trench's anchor x is `posX(0, L, WH / 2, false)` from `src/sim/geometry.js`. `WH` is `300` (`src/data/units.js`).
- Stacking direction, by trench index rather than a pixel threshold (checked by hand against the real coordinates — a pixel-distance-from-world-edge rule doesn't reliably trigger where it needs to, because `focusLine`'s re-centring and the camera's own zoom level move the usable margin around): normally toward the player's own HQ (negative x). The one exception is `L === 0` (your own HQ itself), where there is nothing further toward the own-HQ side to stack into, so it flips to positive x. The design doc also named the final assault line next to the enemy HQ as a possible second exception; tracing the actual coordinates shows it doesn't need one — stacking toward the own-HQ side from there moves toward the middle of a wide field, nowhere near an edge.
- `src/sim/**` is untouched — this is a UI-only change.
- `npm run check` and `npm run e2e` pass at the end of every task.

## Review Focus

1. **Selecting your own HQ (`G.sel === 0`).** The move-order group must stack toward positive x (toward the enemy), not run past the world edge. (Task 1 test `flips at the near edge`.)
2. **A nation with no Defence building** (`NAT[nation].def` is `null`, e.g. Germany). `defBtn` must still be `hidden`, not just moved. (Task 2 test `defBtn stays hidden with no defence`.)
3. **Track already complete** (`nextSegment(side) > G.NT`, no break). The map-strip rail glyph must not appear on a nonexistent trench. (Task 3 test `no glyph once the track is complete`.)
4. **Double trenches / the super trench** (`isDbl(L)` or `L === G.SUPER`), which already show a `★` glyph and have a different `trenchX` offset. The floating groups must still position without throwing and without colliding with the existing `★`/pips. (Task 2 test `positions at a double trench`.)
5. **Keyboard-only play.** Every relocated button must stay reachable and operable by Tab and Enter, in the new order (after the canvas, before the map strip). (Task 2 ui test checks tab order via DOM position; Task 3 e2e step re-confirms the existing keyboard playthrough still passes.)

---

### Task 1: Field-action anchoring logic

**Files:**
- Create: `src/ui/fieldActions.js`
- Test: `tests/unit/fieldActions.test.js` (new)

**Interfaces:**
- Produces:
  - `anchorX(L) → number` — a thin wrapper over `posX(0, L, WH / 2, false)`.
  - `stackSide(L) → -1 | 1` — `1` when `L === 0`, else `-1`.
  - `trackGlyphLine(side) → number | null` — the trench the next Lay Track/Repair Track action would affect:
    - if `G.track[side].broken.size`, `lineOfSegment(side, Math.min(...G.track[side].broken))`
    - else, with `n = nextSegment(side)`, `n <= G.NT ? lineOfSegment(side, n) : null`
  - `toScreen(worldX, worldY) → { x, y }` — `{ x: (worldX - cam.x) * metrics().K, y: worldY * metrics().K }`, importing `cam`/`metrics` from `src/ui/camera.js`.
- Consumes: `posX` from `src/sim/geometry.js`; `WH` from `src/data/units.js`; `G` from `src/sim/state.js`; `lineOfSegment`, `nextSegment` from `src/sim/rail.js`; `cam`, `metrics` from `src/ui/camera.js`.

- [ ] **Step 1: Write the failing tests**

```js
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
```

- [ ] **Step 2: Run the tests**

Run: `npx vitest run tests/unit/fieldActions.test.js`
Expected: FAIL (module doesn't exist yet)

- [ ] **Step 3: Implement `src/ui/fieldActions.js`**

As specified in Interfaces above. `lineOfSegment`/`nextSegment` come straight from `src/sim/rail.js`; don't reimplement their logic.

- [ ] **Step 4: Run the tests**

Run: `npx vitest run tests/unit/fieldActions.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/ui/fieldActions.js tests/unit/fieldActions.test.js
git commit -m "feat: field-action anchoring logic"
```

### Task 2: Move the trench-order buttons onto the field

**Files:**
- Modify: `index.html` (the `.orders` block)
- Modify: `src/styles.css` (new floating-group classes; trim now-unused `.orders .obtns` rules if nothing else uses them)
- Modify: `src/ui/hud.js` (`refresh()` calls the new layout step; no other line in the existing order-button block changes)
- Test: `tests/unit/ui.test.js`, `tests/unit/draw.test.js` (only if a snapshot of `.fieldwrap`'s children needs updating)

**Interfaces:**
- Consumes: `anchorX`, `stackSide`, `toScreen` from Task 1's `src/ui/fieldActions.js`.
- Produces: two new elements inside `.fieldwrap`, after `#field`:
  - `<div class="fieldGrp" id="moveGrp"><button id="backBtn">…</button><button id="gatherBtn">…</button><button id="advBtn">…</button></div>`
  - `<div class="fieldGrp" id="fortGrp"><button id="fortBtn">…</button><button id="nestBtn">…</button><button id="defBtn" hidden>…</button></div>`
  - A new function `layoutOrderGroups()` in `hud.js` (or re-exported from `fieldActions.js` and called from `hud.js`), called at the top of `refresh()`'s existing order-button block, which:
    - computes `const x = anchorX(G.sel), side = stackSide(G.sel)`
    - sets `#moveGrp` and `#fortGrp`'s `style.left`/`style.top` from `toScreen(x, …)`, offset vertically from each other (e.g. `moveGrp` at `WH / 2 - 50`, `fortGrp` at `WH / 2 + 10`, both in world y before `toScreen`) so they don't overlap
    - sets a `transform` (or equivalent) so the group renders on the `side` computed above — e.g. `translateX(side > 0 ? 0 : -100%)` style anchoring, implementer's choice of exact CSS mechanism, as long as the group visually sits on the correct side of the anchor x.

- [ ] **Step 1: Write the failing tests**

```js
// tests/unit/ui.test.js — add to the existing suite
it('moves the order groups to float over the field, anchored at the selected trench', () => {
  // ... drive a refresh with G.sel set to a known trench, then assert
  // #moveGrp.style.left and #fortGrp.style.left are both finite numbers
  // (not empty/NaN), and that #moveGrp is a descendant of #fieldwrap, not #orders.
});

it('positions at a double trench without throwing', () => {
  // select a line where isDbl(L) is true (or G.SUPER), call refresh(), expect no throw
});

it('flips side at the player\'s own HQ', () => {
  // select line 0, refresh(), assert the group's positioning reflects stackSide(0) === 1
});

it('defBtn stays hidden with no defence', () => {
  // start a game as a nation with NAT[nation].def === null (e.g. 'de'), refresh(), expect defBtn.hidden === true
});

it('keeps advBtn/backBtn/fortBtn/etc. reachable in DOM order after the canvas, before the map strip', () => {
  // assert #field, then #moveGrp/#fortGrp, then #map appear in that relative document order
});
```

- [ ] **Step 2: Run the tests**

Run: `npx vitest run tests/unit/ui.test.js`
Expected: FAIL

- [ ] **Step 3: Implement**

Move the three `.obtns` rows' buttons (minus `trackBtn`, which Task 3 handles) out of `.orders` in `index.html` into the two new `.fieldGrp` containers inside `.fieldwrap`. Keep `#selText` in `.orders` (or inline it directly below `.map` — either is fine, the design only requires it to stay on the page, not inside `.fieldwrap`). Add `layoutOrderGroups()` and call it from `hud.js`'s `refresh()`. Add the CSS for `.fieldGrp` (absolute position, flex column, small gap, button sizing consistent with the existing `.act`/`.act.alt` classes so touch targets stay ≥ 44px).

- [ ] **Step 4: Run the tests**

Run: `npx vitest run tests/unit/ui.test.js tests/unit/draw.test.js`
Expected: PASS

- [ ] **Step 5: Run the full check**

Run: `npm run check`
Expected: PASS (lint, all unit tests, build)

- [ ] **Step 6: Commit**

```bash
git add index.html src/styles.css src/ui/hud.js tests/unit/ui.test.js
git commit -m "feat: move trench-order buttons onto the battlefield"
```

### Task 3: Move the track button onto the field, and mark it on the map strip

**Files:**
- Modify: `index.html` (`trackBtn` moves into `.fieldwrap`, as its own floating button)
- Modify: `src/styles.css` (reuse/extend the floating-button class from Task 2 for a single button rather than a group)
- Modify: `src/ui/hud.js` (`buildMap()` adds a rail-glyph element per cell; `refresh()` positions `trackBtn` via `anchorX`/`toScreen` on `trackGlyphLine(0)`, and sets the glyph's content each refresh; no change to `trackBtn`'s existing `textContent`/`disabled` logic)
- Test: `tests/unit/ui.test.js`, `tests/e2e/game.e2e.test.js`

**Interfaces:**
- Consumes: `trackGlyphLine`, `anchorX`, `toScreen` from `src/ui/fieldActions.js`.
- Produces: each map-strip cell (built in `buildMap()`) gains a new always-present element, e.g. `<i class="rail"></i>`, alongside the existing `<i class="pips">`. `refresh()`'s per-line loop sets `cell.querySelector('.rail').textContent = trackGlyphLine(0) === L ? '═' : ''`.
  - When `trackGlyphLine(0)` is `null` (track complete, nothing to lay or repair), `trackBtn` stays wherever it last was positioned but `disabled` (already true via the existing `canLay`/`why` logic) — no glyph shows anywhere, satisfying Review Focus #3.

- [ ] **Step 1: Write the failing tests**

```js
// tests/unit/ui.test.js
it('marks the next track segment on the map strip', () => {
  // newGame, refresh(); the cell for trackGlyphLine(0) has the rail glyph, no other cell does
});

it('no glyph once the track is complete', () => {
  // G.track[0].end = G.NT; refresh(); no cell has the rail glyph
});

it('trackBtn floats at the segment it would affect', () => {
  // refresh(); trackBtn.style.left corresponds to anchorX(trackGlyphLine(0))
});
```

```js
// tests/e2e/game.e2e.test.js — extend the existing "lay one segment" step
// (around the existing `click('#trackBtn')` call at line ~152): confirm the
// click still works from the new location, and that the map strip shows the
// glyph on the expected cell beforehand.
```

- [ ] **Step 2: Run the tests**

Run: `npx vitest run tests/unit/ui.test.js`
Expected: FAIL

- [ ] **Step 3: Implement**

Move `trackBtn` out of `.orders` (now empty of buttons apart from whatever `#selText` needs) into `.fieldwrap`, styled as a single floating button like the Task 2 groups. Add the `.rail` element to `buildMap()`'s cell template and the glyph-setting line to `refresh()`'s existing per-cell loop (next to the `.pips` line). Delete the now-empty `.orders` wrapper if `#selText` was moved out of it, or leave it as a plain non-`.orders`-styled container for `#selText` alone — implementer's choice, since the design only requires `#selText` to stay on the page.

- [ ] **Step 4: Run the tests**

Run: `npx vitest run tests/unit/ui.test.js && npm run e2e`
Expected: PASS

- [ ] **Step 5: Full verification**

Run: `npm run check && npm run e2e`
Expected: PASS — this also confirms Review Focus #5 (keyboard playthrough) still holds, since the e2e test drives the game through real button clicks including the relocated ones.

- [ ] **Step 6: Commit**

```bash
git add index.html src/styles.css src/ui/hud.js tests/unit/ui.test.js tests/e2e/game.e2e.test.js
git commit -m "feat: move track button onto the field, mark it on the map strip"
```
