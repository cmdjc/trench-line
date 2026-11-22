# Icon field buttons: design

Date: 2026-11-22 · Status: revised after a layout rethink; superseding the
first draft, which proposed one merged rectangular-button block near the
centre of the selected trench. This version replaces that with buttons
distributed to specific points on the trench, as round icon buttons.

## Why

The floating field buttons still carry full text labels, which is most of
why they can't shrink further without the words becoming unreadable.
Separately, grouping every action into one block near the trench's centre
put it in the way of the most-looked-at part of the battlefield. Spreading
the buttons to the top and bottom of the trench, as small round icons, both
shrinks them and moves them out of the middle of the view.

## Goals

- Every button becomes a small round icon button, not a text card.
- **Bottom of the trench:** Advance, Fall back, Bring all here — the
  movement actions.
- **Top of the trench:** Fortify, MG nest, Defence — the defensive actions.
- **Its own anchor:** Lay Track / Repair Track stays anchored to the track
  segment it affects (which may be a different trench from the one
  selected), at a vertical band clear of both the top and bottom groups.
- **Mouse:** hovering (or keyboard-focusing) a button shows its full
  description — the same text it shows today (name, current cost, why it's
  disabled, etc.) — as a small label near it. The click still fires
  immediately; hovering is not required to click.
- **Touch:** since there's no hover, the first tap on a button reveals that
  same description instead of firing the action. A second tap on the same
  (now-revealed) button fires it. Tapping elsewhere, or another button,
  dismisses the revealed description without firing anything.
- The description stays available to screen readers at all times via
  `aria-label`, regardless of hover/reveal state.
- Every existing rule (which button is hidden for which nation, when a
  button is disabled, its exact cost text) is unchanged — only how and
  where it's shown changes.

## Non-goals

- The buy row, the base panel, and every other button on the page keep
  their current text-card style. Only these seven field buttons change.
- No new art assets (images/sprites). Icons are small inline vector shapes,
  not emoji, matching the project's existing hand-drawn style.

## Layout (the trench-position part)

Trenches run the full height of the field. World y 0 is the top edge, 300
(`WH`) the bottom. Existing canvas-drawn elements to stay clear of: the
nation-ownership flag (y 4–12, drawn only when a trench is owned), the fort
pips (y ≈ 287) and the trench number (y ≈ 294).

Checked against the real camera scale (`K = canvas height ÷ 300`, which
runs from 0.8 on the shortest allowed canvas to about 1.27 on the tallest)
so a roughly 30px-wide round button never collides with those or with the
other band, at either extreme:

| Band | World y | Holds |
|---|---|---|
| Top | 35 | Fortify, MG nest, Defence |
| Middle | 150 (same height as the rail) | Lay Track / Repair Track |
| Bottom | 240 | Advance, Fall back, Bring all here |

Each band is one horizontal row of (up to 3) round buttons, anchored at the
relevant trench's x the same way the current `anchorX`/`stackSide` logic
already works — `stackSide` still decides which way the row leans at the
one edge case (your own HQ), just applied to a row instead of a column now.
The three bands never collide with each other even when the selected
trench and the next track segment are the same trench (common at the start
of a battle), since they sit at three different y values.

## Icons

Unchanged from the first draft — one hidden inline SVG sprite sheet, small
stroked vector shapes in the project's muted palette:
- Advance — a forward chevron
- Fall back — a backward chevron
- Bring all here — two arrows converging downward
- Fortify — a small sandbag-wall shape
- MG nest — a crossed-gun silhouette
- Defence — a small shield/bunker shape
- Lay Track / Repair Track — a rail-tie shape, swapping to a wrench-over-
  rail variant while a segment is broken

Each sits inside a round button (a circle, not the current rounded
rectangle) — border-radius 50%, sized to fit the icon with a little
padding, consistently across all seven.

## How the description popover works

Unchanged from the first draft:
- The code that today sets each button's visible `textContent`/`innerHTML`
  (name, cost, disabled reason) sets `aria-label` and a `data-tip`
  attribute instead. What that text says doesn't change.
- Mouse/keyboard: a small CSS-only popover built from `data-tip`, shown on
  `:hover` and `:focus-visible`.
- Touch: a `pointerup` listener checks `event.pointerType`. When it's
  `'touch'`/`'pen'` and the button isn't already "revealed", it reveals it
  and swallows that tap. A second tap on an already-revealed button goes
  through as a normal click. A tap elsewhere, or on a different button,
  clears any revealed state.
- A disabled button can still be revealed, so a player can learn why.

## Decided vs. left to the builder

**Decided by the user:**
- Advance/Fall back/Bring all here at the bottom of the trench; MG nest
  (and, by the same "defensive" grouping, Fortify and Defence) at the top.
- All seven buttons are small round icon buttons, with arrows (not words)
  for Advance/Fall back.
- Touch: tap once to see it, tap again to act.

**My calls:**
- The exact world-y values for each band (35 / 150 / 240), checked against
  the real camera-scale range so nothing collides.
- Putting Lay Track at the middle band, level with the rail itself.
- The specific icon shape for each action.
- The `data-tip`/`pointerType` mechanism behind the popover.

**Left to the builder:**
- Exact button diameter, icon size and popover styling, within the
  palette.
- Popover positioning details near a screen edge.
