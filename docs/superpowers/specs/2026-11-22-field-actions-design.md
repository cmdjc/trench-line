# Field actions: design

Date: 2026-11-22 · Status: draft for approval

## Why

The controls panel below the map has grown with every feature added this
session (base upgrades, the HQ gun, railways) into a long single column:
three rows of order buttons, a track button, the stats line, the buy grid,
the base panel, and the train/gun buttons. On most screens reaching the buy
row — something you do constantly, mid-battle — now takes a scroll.

Moving the trench-specific actions onto the battlefield itself, as small
buttons that float next to the trench they act on, removes that whole block
from the page. It also makes those actions feel like they belong to the
place they affect, rather than a remote panel you have to go back and forth
to. The idea comes from a reference screenshot the user showed: upgrade
prompts sitting directly on the structure they upgrade, instead of in a
separate menu.

## Goals

- **Move onto the field**, as floating buttons anchored to world position:
  - Advance, Fall back, Bring all here
  - Fortify, MG nest, Defence
  - Lay Track / Repair Track
- **Remove from the page** the `.orders` panel these came from, once they're
  on the field. The buy row moves up to take that space.
- **Keep every existing rule unchanged.** Which buttons show, their enabled
  state, their label and their cost come from the same logic as today
  (`commands.js`, `hud.js`'s current conditions) — only where they're drawn
  changes.
- **Stay keyboard-playable.** The game is playable end to end with Tab and
  Enter; these buttons must be too.

## Non-goals

- The buy row does not change in this pass (no icon tiles yet — that's a
  separate idea raised in the same conversation, not part of this design).
- No change to how trenches are selected (tapping the map strip, or Tab to a
  cell and Enter) — only what appears once one is selected.
- No change to any button's underlying behaviour or unlock conditions.

## Anti-goals

- Buttons that silently do nothing when their trench scrolls off-screen
  without the player understanding why (see "When the trench is off-screen").
- Breaking Tab-and-Enter play.
- A page that still needs a scroll to reach the buy row after this ships.

## How it works

- **Anchoring.** Each visible button's screen position is computed every HUD
  refresh from its trench's world x (`posX(0, L, …)`) and the current camera
  (`cam.x`, `metrics().K`), the same transform `src/ui/input.js` already uses
  for tap-to-select. The buttons are new DOM elements placed inside
  `.fieldwrap` (siblings of `#field` and `#toast`), positioned with
  `left`/`top` in CSS pixels relative to that box — the same mechanism
  `#toast` already uses, which needs a positioned ancestor matching the
  canvas's own box. They are not reachable by scrolling the page; they scroll
  with the battlefield instead, inside the fixed-size `.fieldwrap`.
- **Tab order (resolved — the first draft of this doc contradicted itself
  here).** Living inside `.fieldwrap` puts these buttons in tab order right
  after the canvas itself and before the map strip below it. That's a
  genuine change from today's order (map strip, then the orders panel), but
  it's a sensible one: once a trench is selected, its actions are reachable
  immediately after the field, with no need to tab through the whole map
  strip first to get back to them.
- **Grouping.** The buttons for a selected trench appear together, stacked
  to one side of it, so they don't sit on top of incoming fire from the
  enemy's side. Advance/Fall back/Bring all here form one small group;
  Fortify/MG nest/Defence another; Lay Track/Repair Track its own button, at
  the track segment it would affect (which may be a different trench from
  the one selected).
  - **Which side they stack toward:** normally the player's own-HQ side.
    Exception: at the player's own HQ (`G.sel === 0`) and at the final
    assault line next to the enemy HQ, stacking "further toward own HQ"
    would push past the world edge, where the camera can't scroll to reveal
    them (`clampCam` stops it at the edge). In those two cases the group
    stacks toward the centre of the field instead — the one direction
    guaranteed to have room, since the world is always wider than one
    trench's worth of button stack.
- **Visibility rules carry over exactly.** A button that's hidden today
  (for example Defence, for a nation with none) stays hidden. A button
  that's disabled today (Advance at the enemy HQ with nobody there) stays
  disabled, shown greyed out at its anchor rather than removed, so its
  position doesn't jump around as conditions change.
- **When the selected trench is off-screen:** nothing special happens for
  the order buttons — they pan with the trench, like any battlefield
  element, and selecting a trench (tap or keyboard) already recentres the
  camera on it via `focusLine`, which is the normal way back.
- **The track button is not tied to the selection, so it needs its own
  answer (resolved — the first draft left this as an open anti-goal).** The
  map strip (`.map`, below the canvas) already shows fort pips and the
  tunnel-trench glyph on relevant cells, and it stays on the page, always
  visible, never scrolled away with the camera. The trench the next segment
  would be laid at, or the next broken one to repair, gets the same
  treatment: a small rail glyph on that map cell. Tapping any map cell
  already both selects that line and calls `focusLine` (`hud.js`'s existing
  `$('map').addEventListener('click', …)`), so tapping the marked cell both
  reveals and reaches the floating Lay Track/Repair button with no new
  camera logic — reusing exactly what selecting any other trench already
  does.
- **Selected-trench info text** (`#selText`, the paragraph describing troop
  count, fortification level, super-trench and Austria-Hungary garrison
  details) stays on the page. It's read-only information, not a button, and
  the scrolling complaint was specifically about reaching buttons.

## What's removed from the page

The `.orders` block disappears entirely: `#selText` stays (moved to sit just
below the map strip, where `.orders` used to start), everything else in that
block (the three button rows and the track button) moves to the field. The
buy row and everything below it shift up to fill the space.

## Decided vs. left to the builder

**Decided by the user:**
- Trench orders (Advance, Fall back, Bring all here, Fortify, MG nest,
  Defence) move onto the battlefield as floating buttons.
- Lay Track / Repair Track moves onto the field too, at the segment it would
  affect.
- The buy row stays as it is in this pass.

**My calls:**
- HTML buttons positioned over the canvas, not canvas-drawn hit targets —
  required to keep keyboard play. They live inside `.fieldwrap`, which moves
  them in tab order to right after the canvas, before the map strip.
- Buttons group to the player's own-HQ side of the selected trench, except
  at the two world edges (your own HQ, the final line by the enemy HQ),
  where they stack toward the centre of the field instead so they're never
  pushed past where the camera can scroll.
- A disabled button stays visible at its anchor rather than disappearing.
- Order-button visibility is not specially handled when off-screen;
  `focusLine` already recentres on selection. The track button, which isn't
  tied to selection, gets a small glyph on its map-strip cell instead (the
  same convention as fort pips and the tunnel glyph), so it's always
  reachable without needing to already know where to look.
- `#selText` stays on the page.

**Left to the builder:**
- Exact button sizes, spacing and the small amount of overlap-avoidance
  needed near double trenches or the super trench, where there's more going
  on visually.
- The precise visual style of the floating buttons (background, border),
  matching the existing muted palette.
- Whether Lay Track and the trench-order group ever need to avoid
  overlapping each other, when the segment to lay sits very close to the
  selected trench.
