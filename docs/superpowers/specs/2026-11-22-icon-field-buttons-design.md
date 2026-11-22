# Icon field buttons: design

Date: 2026-11-22 · Status: draft for approval

## Why

The floating field buttons (Advance, Fall back, Bring all here, Fortify, MG
nest, Defence, Lay Track/Repair Track) are now small, but they still carry
full text labels, which is most of why they can't shrink further without the
words becoming unreadable. Replacing the label with a small icon, and moving
the full description to an on-demand tooltip, lets the box itself shrink to
roughly its icon's size.

## Goals

- Each of the seven buttons shows a fixed icon, not text, as its normal
  visible content.
- **Mouse:** hovering (or keyboard-focusing) a button shows its full
  description — the same text it shows today (name, current cost, why it's
  disabled, etc.) — as a small label near it. The click still fires
  immediately; hovering is not required to click.
- **Touch:** since there's no hover, the first tap on a button reveals that
  same description instead of firing the action. A second tap on the same
  (now-revealed) button fires it. Tapping elsewhere, or another button,
  dismisses the revealed description without firing anything.
- The description stays available to screen readers at all times via
  `aria-label`, regardless of hover/reveal state — icon-only must not mean
  screen-reader-only-icon.
- Every existing rule (which button is hidden for which nation, when a
  button is disabled, its exact cost text) is unchanged — only how it's
  shown changes.

## Non-goals

- The buy row, the base panel, and every other button on the page keep
  their current text-card style. Only the seven field buttons change.
- No new art assets (images/sprites). Icons are small inline vector shapes
  (SVG or canvas-drawn), drawn in the project's existing muted palette,
  matching the hand-drawn style already used for things like the sandbag
  arcs and the map-strip's ★/⊓/═ glyphs — not emoji, which render
  inconsistently across platforms and would clash with the art style.

## How it works

- **Icons (my picks, open to change):**
  - Advance — a forward chevron (▶-style)
  - Fall back — a backward chevron
  - Bring all here — two converging arrows pointing down
  - Fortify — a small sandbag-wall shape (echoing the existing sandbag art)
  - MG nest — a simple crossed-gun silhouette
  - Defence — a small shield/bunker shape
  - Lay Track / Repair Track — a short rail-tie shape (echoing the drawn
    track), swapping to a wrench-over-rail variant while a segment is broken
- **Description text:** the code that today sets each button's visible
  `textContent`/`innerHTML` (name, cost, disabled reason) is redirected to
  set both `aria-label` and a `data-tip` attribute instead. Nothing about
  *what* that text says changes.
- **Showing it:**
  - Mouse/keyboard: a small CSS-only popover built from `data-tip`, shown on
    `:hover` and `:focus-visible`. No JS state needed for this path.
  - Touch: a `pointerup` listener checks `event.pointerType`. When it's
    `'touch'` or `'pen'` and the button isn't already "revealed", it marks
    that button revealed (showing the same popover) and stops the click from
    doing anything further this time. A second tap on an already-revealed
    button goes through as a normal click. Any tap elsewhere, or on a
    different button, clears the revealed state.
  - A disabled button can still be revealed (so you can learn why it's
    disabled) but obviously still won't fire when "activated".

## Decided vs. left to the builder

**Decided by the user:**
- Icon-only buttons, info on hover.
- Touch: tap once to see it, tap again to act.

**My calls:**
- The specific icon for each action (open to change once seen).
- Hand-drawn vector icons rather than emoji or an icon font/image sprites.
- Implementation mechanism: `data-tip` + CSS popover for mouse/keyboard,
  a `pointerType` check for the touch two-tap flow.
- `aria-label` always carries the full text, independent of reveal state.

**Left to the builder:**
- The exact icon shapes/sizes and popover styling, within the existing
  palette.
- Popover positioning details (which side it opens on near a screen edge).
