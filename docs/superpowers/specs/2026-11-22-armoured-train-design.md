# Armoured train (railways, stage 2): design

Date: 2026-11-22 · Status: draft for approval

## Why

Stage 1 (track and the transport train) was built with two later stages in
mind, named explicitly in that design: "stage 2 (the armoured train) and
stage 3 (the railway gun and its ammo cart)." The user's own prior decision
there called the armoured train "a mobile fortress," sharing the same train
slots as the transport train and bought the same way.

Right now a side's track is purely logistical: it moves troops and supplies,
and an enemy transport train can already be shot at (it's a target in
`stepUnits`) but nothing a side owns can shoot back from the rail. The
armoured train fills that gap: a powerful, slow-to-replace combat unit that
commits one of a side's three scarce train slots to defending the track and
the ground near its forward end, instead of to logistics.

## Goals

- A new entity type riding the same rail each side already has, sharing the
  existing `TRAIN_SLOTS` cap with the transport train (as stage 1 already
  promised).
- **Advances to the end of your held, intact track and holds there** — a
  forward gun position, not a shuttle. If the end of the track moves
  (track laid further, or a trench lost), it follows the new end.
- **Two weapons**, reusing the exact combat model every other attacker uses
  (`hurt()`, `accVs()`, the existing accuracy/cooldown pattern): a cannon
  (slower, splash, effective against groups and armour) and machine guns
  (fast, anti-infantry), the same two-weapon shape tanks like the A7V or the
  Mark VIII already use (`tank` stat plus a `mg` sidearm).
- Can be shot at exactly like a transport train already can (`hurt()`
  already generalizes to any `G.trains` entry via `e.train`), and can
  itself shoot at enemy units and enemy trains alike.
- Destroyed the same way a transport train is destroyed today: it wrecks,
  frees its slot, nothing special needed.
- **National flavour**, matching the transport train's existing per-nation
  table and its ±15%-variance convention.
- **The enemy** builds and uses it too, from its railway fund, the same
  fund that already pays for its track and transport trains.
- **Bought like a unit**, a button in the buy row next to the existing
  transport-train button, following the transport train's own buy-flow
  exactly (`canBuyTrain`/`buyTrainCmd` pattern).

## Non-goals

- The railway gun and the ammo cart (stage 3 — its own design later).
- Carrying troops. The transport train already owns that job; the armoured
  train is combat only, so the two train types stay clearly distinct and a
  side must choose between logistics and firepower for a scarce slot.
- Player-aimed fire, of any kind. Every other automatic defender in the
  game (MG nests, pillboxes, tanks) picks its own target; this does too.
- Any change to the transport train, track-laying, or how track breaks.

## Anti-goals

- A unit so strong it makes holding a trench near the front pointless
  (defeating the whole trench-line premise).
- Breaking determinism for battles where nobody builds one: no new rng
  draws on any path that runs while no armoured train exists.
- A second, confusingly similar shuttle that just duplicates the transport
  train with a gun bolted on — the "advance and hold" behaviour is what
  keeps it feeling distinct.

## How it works

- **Entity.** Lives in `G.trains` next to transport trains, tagged with a
  kind (so the step function and the UI can tell them apart). Takes a train
  slot from the same shared `TRAIN_SLOTS` cap — a side can have, in any mix,
  up to 3 trains total between transport and armoured.
- **Movement — advance and hold.** On purchase it spawns at the side's own
  HQ, like a transport train. It then simply moves toward the far edge of
  `trackEnd(side)` — the same calculation the transport train already uses
  — at its own speed, and stops once there. Unlike the transport train it
  never turns around at the end: "holding" is just "target reached, no
  further movement needed this frame." If track is laid further, the
  target point moves forward and it advances again; if the held trench at
  the current end is lost (or a shell breaks that segment), the target
  point moves back and it retreats to the new end. It can fire while moving
  or holding — no separate "must be stationary to fire" state.
- **It never carries riders.** None of the transport train's boarding,
  dwell, stranding or wounded-return logic applies to it. A break appearing
  behind it is not a special case either: the train has no "behind" to be
  trapped against, since its only behaviour is "move toward the current end
  of track."
- **Weapons.** A cannon (moderate rate of fire, splash, strong against
  groups, emplacements and other armour) and a machine-gun sidearm (fast,
  anti-infantry, weak against armour) — stat-shaped like a tank's main gun
  plus its `mg` sidearm, and built the same two different ways those
  already are, since the game's two existing weapon shapes are not
  interchangeable:
  - The **cannon** is a shell weapon, exactly like a tank's main gun or a
    mortar (`T.shell` set): it launches a projectile that travels for a
    set time and deals splash damage based on distance from where it
    lands, no accuracy roll at the moment of firing. No new combat math.
  - The **machine guns** are an instant tracer weapon, exactly like a
    tank's `mg` sidearm: a cooldown-gated hit roll through the same
    `hurt()`/`accVs()` model every rifle, mg and sniper already uses.
  Both independently find their own nearest valid target (any living,
  visible enemy unit, or an enemy train, within their own range) every
  frame — the armoured train is never limited to one target at a time any
  more than a two-gun tank is.
  - **Falls back to shelling the enemy base** when nothing else is in
    range, exactly as every armour-type attacker already does. In
    practice this can only matter once the track reaches deep enough into
    enemy territory that the enemy is already almost beaten, but it stays
    consistent with how every other tank behaves rather than carving out
    a special exception for this one unit.
  - Lives in `G.trains`, not inside `stepUnits`'s `G.units` loop (keeping
    stage 1's own reason for that separation: trains must never affect
    unit counts, `infCap`, `walkFront` or `countAt`) — so its targeting
    and firing is its own small pass, mirroring `stepUnits`'s existing
    target-search and base-fire-fallback logic rather than literally
    sharing its loop.
- **Taking fire.** Already fully generic: `hurt()` already special-cases
  `e.train` to call `hurtTrain()`, armour-like-a-light-tank, regardless of
  which kind of train it is. Enemy units already consider any living train
  as a possible target (`stepUnits` already has this loop). Nothing about
  being attacked needs to change.
- **Destruction.** Already fully generic too: `stepTrains`' end-of-frame
  cleanup wrecks any train at 0 hp, frees its slot, and calls
  `dismountAll()` — a no-op here since it carries nobody.
- **Buying.** A buy-row button beside the existing transport-train button,
  named for the nation's armoured train, disabled by the same rule
  (`canBuyTrain`, generalized to count both kinds together against the
  shared cap) plus "not enough supplies." Firing `buyArmorCmd()` the same
  way `buyTrainCmd()` already works.
- **The enemy.** Spends from the same `ai.railFund` that already pays for
  its track and transport trains, added to the existing priority order
  (repair, first transport train, lay track, more transport trains up to
  the cap) — exact placement and thresholds are a tuning question for
  `npm run bot`, the same way every rail AI number so far has been tuned.
  It must be verified, in real seeded battles, that the AI actually buys
  and uses one — the same verification every prior AI-spending feature in
  this project needed.

## Determinism

- No new rng draws on any path that runs while no side has bought an
  armoured train. Accuracy rolls for its two weapons only happen once one
  exists and is actually firing — the same rule stage 1 already followed
  for track and transport trains.

## Starting numbers (to be tuned with `npm run bot`)

| Setting | Value |
|---|---|
| Cost | ~380 supplies |
| HP | ~600 (heavier than any transport train, between a medium and heavy tank) |
| Cannon | dmg ~25, cooldown ~1.6s, range ~260, splash ~20 |
| Machine guns | dmg ~5, cooldown ~0.2s, range ~280 |
| Speed | about the same as that nation's transport train |
| Armour | the same light-tank-like model `hurtTrain` already uses, unchanged |
| Train slots | still 3, shared with the transport train (unchanged from stage 1) |

## National armoured trains (names are my call; looks are the builder's)

Same convention as stage 1's transport trains: named per nation, stats
within ±15% of the table above, flavoured to the nation's character.

## Decided vs. left to the builder

**Decided by the user:**
- The armoured train exists, as stage 1 always said it would, sharing the
  transport train's slot cap and being bought the same way.
- It advances to the end of the track and holds there, rather than
  shuttling back and forth like the transport train.
- It carries two kinds of weapon: a cannon and machine guns.

**My calls:**
- Exact stats in the tables above.
- It carries no troops at all, keeping it fully distinct from the
  transport train.
- It can fire while moving or holding, with no separate stationary state.
- It can fire at enemy trains, not just enemy units — symmetric with how
  enemy units can already fire at it.
- The cannon is a shell weapon (like a tank gun/mortar); the machine guns
  are an instant tracer weapon (like a tank's mg sidearm) — the two shapes
  every weapon in the game already uses, not one new unified mechanism.
- It falls back to shelling the enemy base when nothing else is in range,
  same as every other armour-type attacker.
- The exact AI spending-priority placement, left as a tuning question.
- National names, art, and the wreck it leaves.

**Left to the builder:**
- Train and wreck art (top-down, matching the transport train's style).
- The exact cannon/mg visual effects (muzzle flash, tracer style),
  matching what tanks already use.
- Exact AI fund thresholds, tuned against `npm run bot`.
