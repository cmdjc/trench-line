# Aimable HQ gun: design

Date: 2026-11-20 · Status: draft for approval

## Why

Base upgrades made the HQ something you invest in. The aimable HQ gun makes it
something you **use**: a nation-flavoured artillery piece you point at a spot,
paying supplies per shot. It is one more active way to spend supplies, and it
gives each nation a distinct way to break up an attack or soften a trench
before a push.

## Goals

- Every nation's HQ has one aimable gun from the start of every battle. No unlock is needed.
- You aim it by tapping a spot within the gun's range and confirming. Each shot costs supplies, then the gun reloads.
- Each nation's gun has its own range, cost, reload and shot pattern (table below).
- The enemy commander has its own gun and fires it at you. No warning circle is shown.
- The existing automatic HQ gun stays as it is.

## Non-goals

- No base-upgrade row or research node for the gun yet.
- No change to superweapons. Germany keeps the Paris Gun as well as its HQ gun.

## Anti-goals

- Breaking the Paris Gun aiming flow, or letting the two aims get confused.
- Losing keyboard access to anything that works by keyboard today. Aiming itself is tap-only, like the Paris Gun's (user decision: leave keyboard aiming unsupported for both guns). The Aim, Confirm and Cancel buttons are still normal buttons.
- Breaking determinism: same seed, same battle.
- A gun so efficient it replaces buying troops.

## The guns

Range is counted in trenches from your own HQ. A target may be anywhere up to
the x position of that trench line, plus half a trench gap, and never beyond
the enemy HQ.

| Nation | Gun | Range | Shot | Cost | Reload |
|---|---|---|---|---|---|
| Britain | Stokes mortar battery | 3 | 3 small bombs | 40 | 8 s |
| Germany | 7.7 cm FK 16 | 6 | 1 small, fast shell | 30 | 6 s |
| France | 75 mm battery | 5 | 4 quick small shells | 60 | 12 s |
| USA | 155 mm GPF | 9 | 1 medium shell | 90 | 20 s |
| Austria-Hungary | Mountain gun battery | 4 | 1 lobbed shell; trench cover protects less | 50 | 10 s |
| Antarctica | Penguin mortar | 3 | cluster of 5 small bombs | 35 | 10 s |
| Italy | 210 mm mortar | 3 | 1 huge blast | 120 | 30 s |
| Russia | Massed battery | 5 | 6 scattered small shells | 80 | 25 s |

These numbers are a starting point, to be tuned with `npm run bot`. Damage,
splash and spread per shell are left to the builder. Use the existing shell
types as the scale: the Paris Gun is 700 damage with 90 splash, and the 42 cm
shells are 180 damage with 70 splash.

## How the player uses it

- **Orders row.** A button next to the superweapon button reads "Aim <gun name>: <cost>". It is disabled while the gun is reloading (showing "Ready in N s") or when you can't afford a shot.
- **Aiming.** Pressing the button starts aiming, the same way the Paris Gun does: tap the field to place the target, then press Confirm, or Cancel.
  - A target outside range is clamped to the maximum range.
  - The range limit is drawn while aiming.
- **Firing.** Confirming charges the cost once, fires the shell or shells, and starts the reload. If the shot is rejected, nothing is charged.
- **The Paris Gun.** Only one aim can be active at a time. Starting one aim cancels the other.
- **Keyboard.** Placing a target is tap-only, the same as the Paris Gun today. Keyboard aiming is out of scope by user decision.

## The enemy

The commander fires its HQ gun at the richest cluster of your units within its
range, the way it already aims the Paris Gun (`aimPoint`), when it can afford a
shot and the gun has reloaded. It shows no warning circle and no toast. It pays
from its normal money, not the base-upgrade fund.

The enemy's targeting rules:
- Range is mirrored: it counts trenches from the enemy's own HQ.
- It uses a range-aware version of `aimPoint` with the same cost-weighted cluster score. Clusters out of range are ignored.
- It fires only when the best cluster in range is worth at least the shot cost, and it keeps at least twice the shot cost in money after paying, so troop buying isn't starved.
- It doesn't fire at an empty field or at the HQ.
- After t = 60 s, it may decide whether to fire using the seeded rng.

## Determinism

Battles stay seeded and reproducible. Shell scatter may use the seeded rng.
The enemy's decision to fire must not add rng draws before its first possible
shot, so that the opening of every battle replays exactly as before.

The enemy's first shot can come no earlier than t = 60 s. After that, outcomes
legitimately change, because the enemy now fires its gun. A long-run seeded test
whose expectation shifts for that reason may be re-baselined. Each such test
must be listed.

## Rules settled after review

- **State:** gun state is separate from the superweapon state, as `G.gun[side] = { cd }`. There is no save-format impact, because battles aren't saved.
- **Range cap:** range is capped at trench `G.NT`. HQ guns never damage either HQ; they are for troops and emplacements.
- **Austria-Hungary cover:** "Trench cover protects less" means a lower shell `cov` value. It does not mean ignoring cover.
- **Re-baselining:** in tests that target other behaviour, prefer isolating the enemy gun (for example, push its cooldown far out) over re-baselining expected values. List both.

## Decided vs. left to the builder

**Decided by the user:**
- The gun is always available.
- You pay per shot, with a reload.
- Ranges are per nation.
- The eight gun choices above.
- The automatic HQ gun is kept.
- The enemy fires its gun with no warning.
- No upgrades for the gun yet.
- The cost varies by gun.
- The Aim button sits in the orders row.
- Keyboard aiming stays unsupported for both guns.

**My calls (open to change):**
- The numbers in the table.
- Range is measured in trenches from your HQ, plus half a gap.
- Targets out of range are clamped, not refused.
- One aim at a time.
- The enemy's first shot comes at 60 s or later.
- The enemy aims at its richest target in range.

**Left to the builder:**
- Per-shell damage, splash, spread and flight time.
- How the range limit is drawn while aiming.
- What the gun looks like on the HQ.
- Exact button copy, within the pattern above.
