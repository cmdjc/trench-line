# Antarctica: chill, not just size: design

Date: 2026-11-24 · Status: draft for approval

## Why

Antarctica's whole identity right now is "the biggest tanks in the game" —
five tank classes scaling up to the Pole, a 1950-supply, 5600-hp land
cruiser with three turrets, well beyond any other nation's heaviest tank
(Germany's Ratte: 1500/4500, the USA's T28: 700/1900). The user wants
Antarctica's signature to shift from raw size to **slowing the enemy down**
— their tanks still exist and are still big, just not the most extreme
thing in the game. The new identity: an Antarctica tank shell doesn't just
hurt you, it chills you, and a chilled unit (or vehicle) moves noticeably
slower for a few seconds.

## Goals

- **Antarctica tank cannon shells apply a temporary speed debuff** ("chilled")
  to everything caught in the blast, infantry and armour alike, on top of
  their existing damage. Nothing else about a shell's damage/splash
  changes.
- **Detune the top three tank classes** (`tkM`, `tkH`, `tkS` — Vinson,
  Erebus, Pole) down from their current extremes toward "still clearly the
  biggest in the game" rather than "two to three times anyone else's
  heaviest." `tkL` (Ross) and the base `tank` (Weddell) stay close to where
  they are; they aren't the extreme ones.
- **The existing Antarctica armoured train (Iron Penguin, already shipped)
  automatically gets the same chill effect for free** — its cannon already
  fires a shell tagged the same way a tank's is, so no separate work is
  needed there; this is called out explicitly so nobody "fixes" it later
  thinking it was missed.
- Update Antarctica's nation blurb to describe the new identity.

## Non-goals

- Changing Antarctica's infantry, bunker defence, or income-growth trait —
  only the tank line and its cannon effect.
- A new field/terrain type (an "ice zone" players can see left behind) —
  the chill is a per-unit timer applied on hit, not a persistent area
  effect on the ground. Simpler, and it was the option picked over the
  "tanks leave ice in their wake" alternative.
- Chilling the machine-gun sidearm's hits — only the main cannon round
  chills. A stream of bullets freezing someone doesn't fit as well as a
  shell impact does, and it keeps the change to one code path (shell
  splash resolution) instead of two.
- Chilling trains (transport or enemy armoured trains) hit by an Antarctica
  tank shell. Trains move through a different speed calculation
  (`moveArmor`/the transport shuttle logic in `rail.js`), and reaching training
  targets with a tank shell at all is already rare (tanks fire at ground
  troops, not usually at the rail lane). Out of scope to keep this
  contained; can revisit if it turns out to matter in play.

## How it works

- **The debuff.** A new per-unit timer, `u.chilled` (seconds remaining),
  decremented every frame exactly like the existing `u.scramble` timer
  (paratrooper landing-scramble) already is. While `u.chilled > 0`, the
  unit's walking speed is multiplied by a reduced factor — the same place
  `wireSlow(u)` already multiplies speed today
  (`sp = T.speed * (T.armor ? 1 : m.speed) * dt * wireSlow(u)` in
  `combat.js`). Unlike wire, which explicitly skips armour (and destroys
  itself against a tank instead of slowing it), chill applies to everyone,
  armour included — that's the whole point of a "slows the enemy" identity
  being able to threaten enemy tanks too.
- **Where it's applied.** In the shell splash-resolution loop in
  `combat.js` (where `G.shells` entries land and call `hurt()` on every
  unit in the blast), a shell whose `side` belongs to the `aq` nation and
  whose `type` is `'tank'` also sets `e.chilled` to a fixed duration on
  every unit it damages — the same units, the same loop, one more line. A
  later shell from the same or another Antarctica tank simply refreshes
  the timer back to full duration; it does not stack into a longer or
  deeper slow.
- **Why the armoured train gets this for free.** The Iron Penguin's cannon
  (already shipped, railways stage 2) pushes its shell with
  `type: 'tank'` and the Antarctica side, exactly like every Antarctica
  tank's own cannon shell. The hook above keys on exactly those two
  fields, so it reaches the armoured train's shells with no separate
  change — same nation, same doctrine.
- **Detuning.** Starting numbers, to be tuned with `npm run bot` same as
  everything else:

  | Tank | Now | Target |
  |---|---|---|
  | Vinson (`tkM`) | cost 760, hp 1800, dmg 48, splash 26, speed 17 | cost ~650, hp ~1400, dmg ~40, splash ~24, speed ~18 |
  | Erebus (`tkH`) | cost 1150, hp 3100, dmg 70, splash 34, speed 14 | cost ~850, hp ~2100, dmg ~52, splash ~27, speed ~16 |
  | Pole (`tkS`) | cost 1950, hp 5600, dmg 96, splash 42, speed 11 | cost ~1650, hp ~4900, dmg ~90, splash ~36, speed ~13 |

  Ross (`tkL`) and Weddell (`tank`) are unchanged. Pole stays the toughest
  (highest-hp) tank in the game, and among the costliest, by a real but
  modest margin over the next-biggest thing anyone else fields (Germany's
  Ratte: cost 1500, hp 4500, dmg 100) — not the 2-3x margin it currently
  has. (Checked against every nation's heaviest tank, not just Germany's:
  this is the comparison that actually matters, and the original target
  numbers in an earlier draft of this table dropped Pole *below* Ratte,
  which contradicted this very claim — caught before implementation, fixed
  here.) (Antarctica's superweapon, the Southern Colossus, is bigger
  still, but it's its own category, same as every other nation's
  superweapon — it isn't part of this comparison.)

- **The Southern Colossus chills too, with no extra work.** It's built with
  the same tank helper as the rest of the line and fires a cannon shell
  tagged exactly like every other Antarctica tank's, so it falls under the
  same hook automatically — fitting, since it's the same doctrine at its
  most extreme. Nothing about it needs to change.
- **Chill numbers** (also tuned with the bot): a chilled unit's speed
  multiplier and how long the chill lasts. Starting point: **0.6× speed for
  4 seconds** — noticeable without freezing someone in place, since the
  tank's own damage is already doing the main work.

## Determinism

- No new rng draws. Chill is applied unconditionally to whatever a shell
  already damages (same units the existing splash loop already rolls no
  dice for) — it's a deterministic side effect of an existing deterministic
  hit, not a new chance roll.

## Decided vs. left to the builder

**Decided by the user:**
- Antarctica's identity shifts from "the biggest tanks" to "slowing the
  enemy," via their tank shells.
- They keep tanks, detuned from their current extremes, not removed.

**My calls:**
- The exact mechanism: a per-unit timer multiplying walk speed, applied in
  the existing shell-splash loop, keyed on nation + shell type.
- Only the main cannon chills, not the mg sidearm; chill refreshes rather
  than stacks; it applies to armour as well as infantry; it does not touch
  trains.
- The armoured train inherits the effect automatically, with no separate
  code.
- The specific detuned stat targets and the chill numbers (table above),
  tuned further with the bot.
- The updated nation blurb wording.

**Left to the builder:**
- Any visual treatment for a chilled unit (a frost tint, slowed animation,
  etc.) — nice to have, not required for the mechanic to work.
- Exact wording of the updated blurb and any new unit `role` text.
