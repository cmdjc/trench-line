# Rail through the middle, sandbag barriers, top-down trains: design

Date: 2026-11-21 · Status: approved in chat (user request plus three answered questions)

## Why

The railway currently runs in a lane along the bottom edge and the trains are
drawn side-on, which doesn't match the rest of the game, a top-down battlefield.
The user wants the train to run through the middle of the battlefield, protected
by sandbags where it crosses each trench, and drawn from above.

## What changes

1. **The rail runs through the middle.** `RAIL_Y` becomes `WH / 2` (150), the same height as the two HQs. Everything that already reads `RAIL_Y` follows: riders, wrecks, train targeting and shell splash, and break checks.
2. **The middle emplacement slot moves aside** (user decision) on **every map**, so the rail crosses each trench through a clear gap.
   - Both layouts in `src/data/units.js` are affected: `SLOTS` (3 slots) and `SLOTS5` (5 slots, super trenches).
   - Keep each array's length and increasing order.
   - Only the middle entry changes: it must sit at least 26 px, in y, from `RAIL_Y`, and at least 24 px from its neighbouring slots. A suggestion is `SLOTS[1] = 0.62` and `SLOTS5[2] = 0.6`.
   - This changes nest positions on all maps, so battles with emplacements legitimately play out differently.
3. **A sandbag barrier protects the track at each trench.**
   - **Where it exists:** at trench L for side s, when `1 <= segmentIndexFor(s, L) <= G.track[s].end`, meaning that side's track has reached it.
   - **What it looks like:** a short sandbag wall on each side of the rail, centred on the trench's x. Use the existing sandbag drawing helpers and palette in `terrain.js`.
   - **What it does** (user decision): a big shell whose centre lands within `BARRIER_R` px (starting value 26) of a trench that has a barrier for that side no longer breaks that side's segments touching the trench. The open ground between trenches can still be broken.
   - **What it does not do:** it doesn't protect trains or riders. Shell damage to trains is unchanged.
4. **Trains are drawn top-down.** See "Train art".
5. **Balance is re-measured and retuned** afterwards, within the limits below.

## Train art (top-down)

- A train is viewed from directly above and drawn along the rail at `RAIL_Y`. The caller still flips it for the enemy, and the train faces +x before the flip.
- It is about 9–10 px wide (a little wider than the sleepers) and about 46 px long.
- **Locomotive:** a rounded rectangle for the boiler, with a round dome and a round funnel seen from above. At the rear, a cab roof rectangle. Use the nation's body colour, and darker for the roof.
- **Wagon:** an open box seen from above, with a visible floor and low walls.
  - Riders show as helmeted heads: small circles in the nation's colours, two across, filling the wagon from the front.
- **Details:** a coupling bar between wagon and locomotive. Wheel tops show as thin dark rectangles poking out at each side of the body. No side-on elements: no profile wheels, no funnel stack drawn upward.
- **Health bar:** a thin bar above the train, only when the train is damaged. Keep the existing colours.
- **From the HQ:** the first segment must visibly start at the HQ's door rather than at its centre. Draw order is such that the HQ building covers the rail start.

## Constraints

- `src/sim/**` and `src/data/**` stay browser-free.
- No new rng.
- No change to train or track costs unless the balance pass needs it.
- A train parked at its HQ may overlap the HQ drawing. That is accepted.

## Balance limits

Targets, measured against `main` before this change:
- On 'open', every win-rate change is within ±20 points.
- On the Long March, report the numbers. The bot already loses there, and that is known and accepted.
- Knobs you may change:
  - `BARRIER_R`, within 16–40
  - `TRACK_COST`, within 15–30
  - `REPAIR_COST`
  - `AI_RAIL_SHARE`, within 0.05–0.15
  - each train's `hp`, by up to 20%

## Decided vs. left to the builder

**Decided by the user:**
- The train runs in the middle of the battlefield.
- Trenches have small sandbag barriers protecting the track.
- Trains are drawn top-down.
- The middle slot moves beside the track.
- The barrier shields the track from shell breaks only.
- Re-run balance and retune.

**My calls:**
- `RAIL_Y = WH/2`.
- Barrier radius of 26 px.
- Barrier at every trench the track has reached.
- The slot positions, the train size, and the slot move applying to every map.

**Left to the builder:**
- The sandbag wall shapes.
- The exact slot values within the constraints.
- The exact train shapes and details.
