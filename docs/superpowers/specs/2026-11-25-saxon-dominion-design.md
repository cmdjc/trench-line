# Saxon Dominion: design

Date: 2026-11-25 · Status: draft for approval

## Why

A new, ninth nation: the Saxon Dominion, an industrialist power whose whole
identity is heavy mechs — slow, boxy, less streamlined than everyone else's
tanks, walking on spider or crab legs instead of rolling on treads. Where
other nations field speed or numbers, Saxony fields armour and firepower,
at the cost of mobility. Its infantry carry that same "tough and slow"
character down to squad level; its one special unit, a mortar-and-ram
squad, fights at both long and short range with two different weapons. Its
mechs are named for figures out of German fairy tale and folklore, from a
small mischievous Kobold up to Rübezahl, the mountain giant, as the
ultimate superweapon.

## Goals

- **A ninth playable nation**, added to `NATS` alongside the existing
  eight. Nothing about the existing eight changes.
- **Standard infantry roster** (rifle, mg, sniper), **a smaller infantry
  cap (~20)** reflecting "quality over quantity" the way Austria-Hungary
  already works, and **no raider** — its slot is replaced by:
- **The Rammstoßtrupp**, a tough, medium-armoured squad that fires a
  back-mounted mortar at range and switches to an armour-breaking ram in
  melee, specifically to cover the mortar's own minimum-range dead zone
  rather than standing idle up close the way every mortar-type unit in the
  game does today. This is new mechanical ground: no unit currently
  switches between two different weapon profiles based on target
  distance.
- **A four-tier mech line** (cap ~8, normal, like most nations), boxy and
  less rounded than Rusviet/Polania-style tanks elsewhere in the game,
  walking on jointed legs rather than treads (visual only):
  1. A cheap, fast scout mech (new — fills the gap below the three the
     user described, so Saxony has a normal four-step progression like
     every other nation's tank line).
  2. A medium, versatile mech, solid against infantry and light-to-medium
     armour.
  3. A light-armoured mech with an enormous range — pure artillery.
  4. A very heavily-armoured "mobile fortress," capable of taking on
     almost anything.
- **A superweapon**: an even bigger mech, the ultimate expression of the
  same line, the way Russia's Tsar Tank or Antarctica's Southern Colossus
  already work.
- **A defence building unlike any other nation's**: a Repair Workshop, a
  pure utility structure that heals/repairs friendly mechs near the trench
  it's built in over time — no direct combat-defence effect at all, unlike
  wire, mines, pillboxes, bunkers or gun pits, every one of which does
  something to incoming attackers or shelters troops directly.
- **Visual identity**: dark industrial grey/black, a stahlhelm-style
  helmet, boxy silhouettes.
- **Names from German folklore**, for the mechs and the superweapon.

## Non-goals

- Any change to the existing eight nations, their units, or their balance.
- A special economic trait (growing income, cheaper repairs, etc.) — kept
  deliberately out, so the mech line and the smaller infantry cap alone
  carry the nation's identity without a third axis to balance.
- Any mechanical effect from the spider/crab-leg locomotion (crossing
  terrain others can't, etc.) — purely visual.
- Changing how mortars, raiders, or any other existing unit type works for
  anyone else. The Rammstoßtrupp's dual-weapon behaviour is new code,
  built so it only ever runs for Saxon units.

## Anti-goals

- A unit so strong (particularly the superweapon, or the heavy fortress
  mech) that it trivialises holding a trench near the front, the same
  anti-goal every other heavy-unit feature in this project has carried.
- Breaking determinism for battles where nobody plays Saxony.
- A dual-weapon mechanic so complex it needs a new targeting
  architecture. It should read as "the same target search every unit
  already does, twice, with a range gate," not a rewritten combat loop.

## How it works

- **Nation entry.** `aq`-style new key (`sx`, or similar) added to `NATS`
  and `NAT`, with `inf: 20`, `tanks: 8`, its own `body`/`hat` colours (dark
  grey/black), `style` (a new stahlhelm-style entry or reuse Germany's
  `'stahl'`), `nest`/`nestLabel` (reuse the plain MG nest, since the
  Repair Workshop is the `def` slot, not the nest replacement), and
  `def: { kind: 'workshop', label: 'Repair workshop', cost: <tbd> }`.
- **Standard infantry.** Rifle, mg and sniper reuse the base stat shapes
  with Saxon-flavoured names and small stat differences, the same ±15%-of-
  base convention every other nation's infantry already follows.
- **The Rammstoßtrupp (replaces the raider slot).** Stats: hp and armour
  like a tough infantry unit (somewhere between a normal rifleman and a
  tank in toughness, "medium-armoured"), a mortar-shaped ranged attack
  (`shell`-based, splash, a real minimum range like every other mortar)
  and a ram-shaped melee attack (short range, bonus damage against armour
  and fortifications, no minimum range). Each frame, it runs the normal
  per-unit target search once; if the nearest valid enemy is beyond the
  mortar's minimum range, it fires the mortar; if the nearest valid enemy
  is inside that minimum range, it fires the ram instead of standing idle.
  Only one of the two fires in a given frame — never both — so this
  behaves like one unit with a range-dependent attack, not two weapons
  firing simultaneously.
- **The four mech tiers** reuse the existing `tkL`/`tank`/`tkM`/`tkH`
  national-tank-table shape exactly (the same structure every nation's
  `AQ_TANKS`-style table already uses), so no new per-tank data shape is
  needed — only new entries, new art, and a `role` description each.
  1. **Kobold** (`tkL`) — cheap, fast, weak. Fills the gap below the
     described three, giving Saxony a normal four-step unlock
     progression like everyone else.
  2. **Krampus** (`tank`) — the versatile medium mech.
  3. **Erlkönig** (`tkM` or `tkH`, whichever slot fits the stat band) —
     light armour, very long range, pure artillery.
  4. **Eisenhans** (the heaviest regular tier) — very heavily armoured
     mobile fortress.
  Exact stat numbers are a builder/tuning concern (see below), following
  the detuning/tuning precedent this project already uses for new
  tank-like units.
- **The superweapon: Rübezahl.** An even bigger mech than Eisenhans, built
  the same way `SPECIAL.colossus`/the Tsar Tank already are — the
  single biggest, rarest, most expensive unit the nation can field.
- **The Repair Workshop (`def`).** A new building kind, distinct from
  every existing `def` kind (`wire`/`pillbox`/`depot`/`pit`/`mines`/
  `bunker`): it does not shelter troops, slow attackers, or shell them. It
  sits in a trench and heals/repairs friendly mechs (`T.armor` units)
  within some radius of that trench over time, at some rate, while it
  stands. It has no effect on infantry, and no effect on enemy units at
  all — it is pure logistics, matching the industrialist theme the way
  the USA's income depot is pure economy rather than combat.
- **Visuals.** Dark grey/black palette, a stahlhelm-style helmet for
  infantry, boxy/angular mech silhouettes with jointed leg art instead of
  tread art (the builder's call on exact shapes, within this palette).

## Determinism

- No new rng draws on any path that runs while nobody is playing or
  fighting Saxony. The Rammstoßtrupp's weapon-switch is a pure distance
  check, not a chance roll; whichever weapon fires then rolls accuracy
  exactly the way every other mortar/melee unit already does.

## Decided vs. left to the builder

**Decided by the user:**
- A ninth nation, the Saxon Dominion, industrialist and mech-focused.
- Standard infantry plus a smaller (~20) infantry cap.
- The Rammstoßtrupp replaces the raider slot, with a genuine dual-mode
  weapon (mortar at range, ram to cover its own dead zone), reusing the
  existing minimum-range mechanic rather than inventing new targeting
  machinery.
- A four-tier mech line (one tier added by the builder to fill the gap),
  normal mech cap (~8).
- An even-bigger-mech superweapon (Rübezahl).
- A Repair Workshop defence building: pure mech-repair utility, no combat
  effect of its own — a genuine departure from every other nation's `def`
  building.
- Dark grey/black, stahlhelm-style visual identity.
- No special economic trait.
- No mechanical effect from the leg locomotion.
- Names: Kobold (scout mech), Krampus (versatile medium), Erlkönig
  (artillery), Eisenhans (heavy fortress), Rübezahl (superweapon),
  Rammstoßtrupp (the squad). Nation name: Saxon Dominion.

**My calls:**
- Exact stat numbers for every new unit (tuned later with `npm run bot`,
  same as every other feature this project has built).
- The exact nation key (`sx` or similar), exact `style`/colour values, and
  which existing tank-tier slot (`tkM` vs `tkH`) best fits Erlkönig's
  artillery role once real numbers exist.
- The Repair Workshop's exact heal rate, radius and cost.
- Whether `style: 'stahl'` is reused from Germany or a new helmet style is
  added — a small art question, not a mechanical one.

**Left to the builder:**
- All mech and infantry art.
- Exact unlock costs/order, within the four-tier-progression convention.
- The Repair Workshop's visual appearance.
