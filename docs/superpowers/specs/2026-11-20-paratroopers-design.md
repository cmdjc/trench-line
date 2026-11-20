# Paratroopers: design

Date: 2026-11-20 · Status: draft for approval

## Why

Every attack in Trench Line crosses no man's land on foot. A paratrooper drop
lets the USA land troops straight into the trench it is attacking, so it can
support a push from above. The historical hook is Billy Mitchell's 1919 plan to
drop the US 1st Division behind German lines at Metz. The war ended before it
could happen. The drop replaces the USA's Kettering Bugs superweapon.

## Goals

- The USA superweapon becomes **Mitchell's airborne drop**. The Kettering Bugs are removed.
- You press the superweapon button, then tap a target trench, the same way the Paris Gun is aimed. The target must be an enemy-held or empty trench no more than a few trenches past your front.
- A platoon of 8 paratroopers lands in that trench and fights whoever holds it:
  - 4 **Thompson gunners**, a new unit that appears only in drops. They carry the 1919 Thompson "Trench Broom" submachine gun, with short range and a high rate of fire, using Germany's stormtrooper as the template (cost 45). They can fire while falling.
  - 2 riflemen.
  - 2 BAR gunners.
- Survivors stay in that trench as ordinary USA infantry under your orders.
- Paratroopers don't count toward the 40-infantry limit, and this stacks freely: every drop adds 8 more, with no ceiling. That applies to the enemy USA too.
- The drop costs the combined cost of its 8 units plus 10%: (4×45 + 2×20 + 2×45) × 1.1 = **341**. The cost is derived from the unit costs, so it follows any retune. The drop has a short **30 s** cooldown.
- An enemy USA commander drops paratroopers on your trenches.
- The enemy can use the drop earlier than other enemy superweapons. Those wait 240 s.

## Non-goals

- No paratroopers for other nations.
- No drops into the enemy HQ.
- No changes to the other superweapons, the HQ gun, or base upgrades.

## Anti-goals

- A drop that wins a trench on its own every time. The drop should support an attack, not replace one.
- Breaking the Paris Gun or HQ gun aim flows. Only one aim may be active at a time.
- Breaking determinism. The same seed must give the same battle.
- Leftover Kettering Bugs text, cards or code paths that still reference the bugs.

## How the player uses it

- **Button:** the superweapon button reads "Superweapon: Airborne drop, <cost>". Its subtitle explains the drop in a plain sentence.
- **Aiming:** pressing the button starts an aim with `kind: 'drop'`. Tapping the field snaps the target to the nearest **valid** trench and highlights that trench. Confirm drops; Cancel cancels.
- **Valid targets:**
  - The trench index is between `F + 1` and `F + DROP_RANGE`. Here `F` is your front line counting **walking troops only**: units marked as paratroopers are ignored, so drops can't leapfrog. Other uses of `frontLine()`, such as `select()`, are unchanged.
  - The trench is enemy-held or empty.
  - It is not an HQ.
  - Taps outside that span snap to the nearest valid trench.
  - If there is no valid trench, the button is blocked and gives the reason.
- **Landing:**
  - The paratroopers drift down over about 4 seconds, scattered along the trench.
  - While they descend they can be shot. Only the Thompson gunners can fire during the descent.
  - Once landed, they are settled in that trench and fight.
  - **Landing scramble (the user's decision):** for 5 seconds after touching down (`DROP_SCRAMBLE`) a paratrooper gets no trench cover, so damage to it uses the open-ground rate, and it fires at 30% of its normal accuracy (`DROP_SCRAMBLE_ACC`). The Thompsons' fire while falling is unchanged.
  - Their orders line is the target trench.
- **Afterwards:** survivors are normal infantry. Advance, fall back and gather treat them like any other troops.
- **Keyboard:** placing the target is tap-only, matching the existing aims.

## The enemy

- An enemy USA uses the drop from **t = 120 s**. Other enemy superweapons still wait 240 s.
- It targets the player-held or empty trench just ahead of its own front (`ai.F - 1`), within its drop range.
- It uses the existing superweapon decision path and its existing funding, with the earlier unlock time.
- No warning circle is shown. The usual enemy superweapon toast fires, for example "Enemy paratroopers are landing at trench N."

## Determinism

- No new rng draws on any path before the first possible drop.
- Landing scatter and the timing of each paratrooper may use the seeded rng.
- Moving the enemy USA's superweapon time from 240 s to 120 s legitimately changes US-enemy battles after 120 s. Isolate those tests where you can. List any that are re-baselined.

## Starting numbers (to be tuned with `npm run bot`)

| Setting | Value |
|---|---|
| Cost | 341, which is the unit costs × 1.1 (user rule) |
| Cooldown | 30 s (user) |
| Paratroopers per drop | 8: 4 Thompson, 2 rifle, 2 BAR (user) |
| `DROP_RANGE` | 3 trenches past your front |
| Descent time | ~2 s, staggered |
| Enemy unlock | 120 s |

## Rules settled after review

- **Which trenches count as held:** validity uses `G.owner[L]`. A trench is valid if it is owned by the foe (`1 - side`) or unowned (`-1`). A trench is never valid if it is your own or an HQ.
- **Enemy target:** the enemy scans from `ai.F - 1` toward the player's HQ and picks the first valid trench within its range. That range is measured from its own walking-troops front, mirrored. If no trench is valid, the drop is blocked and the existing want logic handles it.
- **Re-checking on Confirm:** Confirm re-validates the stored target line, `G.aim.line`, which `input.js` sets on each tap. If the target is no longer valid, Confirm refuses and charges nothing, and the aim stays so you can re-tap. Supplies are charged only when the drop succeeds.
- **Tuning target:**
  - Every nation's bot win-rate change against `main` stays within ±20 points.
  - A lone drop with no attack behind it, against a trench of 6 or more settled defenders at fortification level 1, should lose that trench more often than it takes it.
  - A drop that lands while your infantry assault the same trench should clearly help.
- **Paratrooper flag:** paratroopers carry a `para` flag. It exempts them from `count()`, excludes them from the drop-range front, and draws the parachute. The Thompson gunner is not in the buy order or the AI purchase lists.

## Decided vs. left to the builder

**Decided by the user:**
- The drop lands in the trench being attacked.
- USA only.
- Bought with supplies and aimed.
- Survivors stay as infantry.
- Aim range is a few trenches past the front.
- A platoon-sized drop.
- The enemy uses it.
- It replaces the Kettering Bugs.
- It unlocks earlier than other superweapons.
- It doesn't count toward the infantry cap, and this stacks freely.
- The drop is 4 Thompson gunners, 2 riflemen and 2 BAR gunners.
- The Thompson gunners can fire while falling.
- Cost is the unit costs plus 10%.
- Cooldown is 30 s.
- The front for drop range ignores paratroopers.

**My calls (open to change):**
- The descent time, the Thompson gunner's stats, the 3-trench range and the 120 s enemy unlock.
- Taps snap to the nearest valid trench.
- Paratroopers can be shot while descending.
- The enemy unlock is at 120 s. The player's superweapon button has never had a time gate, so "earlier" only changes the enemy.
- The enemy targets the trench just ahead of its front.

**Left to the builder:**
- How the parachutes and descent are drawn.
- The paratrooper sprite details.
- The exact button subtitle and toast copy, within the patterns above.
- Where the Kettering-specific code is removed.
