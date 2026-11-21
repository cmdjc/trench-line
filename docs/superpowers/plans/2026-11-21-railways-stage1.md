# Railways Stage 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add buildable track (laid trench by trench into trenches you hold) and an automatic transport train for every nation and the enemy. The train carries troops out to the end of the track and wounded back to heal, and earns supplies on trips that carry riders.

**Architecture:**
- **Data:** constants and per-nation trains live in a new `src/data/rail.js`.
- **Track state:** `G.track[side] = { end, broken: Set<L> }` lives in a new browser-free module `src/sim/rail.js`.
  - Ownership flips in `combat.js` destroy track beyond a lost trench.
  - Big shells mark segments broken.
- **Trains:** they are entities in `G.trains`, kept out of `G.units`, and are stepped by `stepTrains(dt)`.
  - Riders keep their unit objects, flagged `u.riding = trainId`.
  - Riders are skipped by combat and movement, and their position follows the train.

**Tech Stack:** Vanilla ES modules, canvas, Vite, Vitest, jsdom e2e.

**Spec:** `docs/superpowers/specs/2026-11-20-railways-stage1-design.md`

## Global Constraints

- `src/sim/**` and `src/data/**` stay browser-free.
- **Determinism:**
  - No rng draws while no track exists. Battles with no track are unchanged.
  - Shell breaks are deterministic.
  - Enemy money is byte-identical before t = 90 s.
- **Track rules:**
  - Track is laid only into trenches you hold, one segment at a time: segment L runs from `G.LX[L-1]` to `G.LX[L]`.
  - When a side loses trench L, that side's segments L and beyond are destroyed.
- **Big shells only:** a shell breaks track only if it is flagged `big`, `huge`, `raze` or `siege`, or has splash ≥ 60.
- **Riders:** a unit rides only if the train gets it to the end of the track sooner than walking. Laying track never makes reinforcements slower. Tanks and emplacements never ride.
- **Supply trips:** a round trip pays supplies only if it carried at least one rider.
- **Trains vs units:** trains are not units. They never affect `count`, `infCap`, `walkFront`, `countAt` or ownership.
- **Long March:** the railhead stays. A unit rides only if the end of the track is beyond its railhead spawn and riding is faster.
- **Starting numbers (tune in Task 6):**

  | Setting | Value |
  |---|---|
  | `TRACK_COST` | 40 |
  | `REPAIR_COST` | 20 |
  | Train | cost 150, hp 300, carries 6, speed 3 × rifle walking speed |
  | `TRAIN_SLOTS` | 3 |
  | `TRIP_SUPPLY` | 15 |
  | `WOUNDED` | 0.4 |
  | `BIG_SPLASH` | 60 |
  | `AI_RAIL_T` | 90 |
  | `AI_RAIL_SHARE` | 0.1 |

- **National train names:**

  | Nation | Train name |
  |---|---|
  | gb | Simplex light railway |
  | de | Heeresfeldbahn |
  | fr | Decauville train |
  | us | Baldwin trench locomotive |
  | ah | k.u.k. Feldbahn |
  | it | Ferrovia da campo |
  | ru | Narrow-gauge field train |
  | aq | Penguin Express |

  Per-nation stats stay within ±15% of the base values.
- `npm run check` and `npm run e2e` pass at the end of every task.

## Review Focus

1. **Capture while riding.** When trench L is captured while a train is out past L, the train is cut off. It must turn back, and its riders dismount at the new end. (Task 4 test `cut off`.)
2. **Train destroyed with riders.** Riders dismount at full strength where it stood, and the slot frees. (Task 4 test `destroyed`.)
3. **Buying into a full or broken network.** Track can't be laid beyond a break or into an unheld trench, and nothing is charged. (Task 2 test `rejects`.)
4. **Wounded whose line is lost while away.** They take `G.sel` or `ai.F`. (Task 4 test `line lost`.)
5. **An empty shuttle.** No supplies are paid. (Task 4 test `no farming`.)

---

### Task 1: Rail data

**Files:**
- Create: `src/data/rail.js`
- Test: `tests/unit/data.test.js`

**Interfaces:**
- Produces: `TRACK_COST, REPAIR_COST, TRAIN_SLOTS, TRIP_SUPPLY, WOUNDED, BIG_SPLASH, AI_RAIL_T, AI_RAIL_SHARE, RAIL_Y` (the rail lane's y, near the bottom of the field), and `TRAINS[nation] → { name, cost, hp, cap, speed }`. Names and base values come from the Global Constraints.
- [ ] **Step 1: Failing tests.** Every `NAT` key has a `TRAINS` entry. Each stat is within ±15% of base. The names match. `RAIL_Y` lies within `[0, WH]`.
- [ ] **Step 2:** Run `npx vitest run tests/unit/data.test.js`. Expect FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `npm run check`. Expect PASS.
- [ ] **Step 5:** Commit `feat: railway data`.

### Task 2: Track — lay, repair, capture, big-shell breaks

**Files:**
- Create: `src/sim/rail.js`
- Modify: `src/sim/state.js` (init `G.track` and `G.trains` in `newGame`), `src/sim/combat.js` (ownership flip around line 229; the shell resolve loop), `src/sim/commands.js`
- Test: `tests/unit/rail.test.js` (new)

**Interfaces:**
- Produces:
  - `trackEnd(side) → number`: the furthest L such that segments 1..L exist, none is broken, and every L is held by that side. Returns 0 if none.
  - `nextSegment(side) → number`
  - `canLay(side) → string`: '' when the side can lay, otherwise a reason sentence.
  - `layTrack(side) → boolean`: no charge.
  - `repairTrack(side) → boolean`: repairs the break nearest the HQ. No charge.
  - `cutTrack(side, L)`: sets `end = min(end, L-1)` and removes broken entries beyond it.
  - `breakAt(x, y, splash, shell)`: for both sides, marks segments whose x-span overlaps `[x-splash, x+splash]` broken, if `|y - RAIL_Y| <= splash` and the shell is big. No rng.
- Wiring:
  - In combat.js, when `G.owner[L]` flips away from side s, call `cutTrack(s, L)`.
  - When a big shell resolves, call `breakAt`.
  - Only act when `G.track[s].end > 0` (fast path: no track, no work).
- Commands: `layTrackCmd()` and `repairTrackCmd()` check `canLay`, or check for a break and that supplies cover the cost. They charge once, toast, and emit 'hud'.
- [ ] **Step 1: Failing tests:**
  - Lay into a held trench: end goes from 0 to 1 and supplies drop by 40.
  - `rejects`: laying into an unheld trench, or past a break, returns false with no charge.
  - Capture of L cuts L and beyond.
  - A big shell breaks the segment, so `trackEnd` drops to before the break. Repair costs 20 and restores it.
  - A non-big shell (barrage, splash 36) never breaks track.
  - With no track, seeded smoke and parity tests stay green unchanged.
- [ ] **Step 2:** Run `npx vitest run tests/unit/rail.test.js`. Expect FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `npm run check`. Expect PASS.
- [ ] **Step 5:** Commit `feat: buildable track`.

### Task 3: Transport trains — buy, run, damage

**Files:**
- Modify: `src/sim/rail.js`, `src/sim/tick.js` (call `stepTrains(dt)`), `src/sim/combat.js` (shell splash and unit fire can hit trains), `src/sim/commands.js`
- Test: `tests/unit/rail.test.js`

**Interfaces:**
- Produces:
  - `G.trains[]` entries: `{ id, side, x, hp, max, dir: 1|-1, riders: [], carried: false, T }`
  - `buyTrain(side) → boolean`: no charge. Fails if the slots are full or `trackEnd(side) === 0`.
  - `stepTrains(dt)`:
    - Moves each train between `G.LX[own HQ]` and `G.LX[trackEnd]` at `T.speed`.
    - Reverses at either end. If the end moves behind the train, it reverses at once.
    - Pays `TRIP_SUPPLY` to its side on arriving home, but only if `carried` is set, then resets `carried`.
  - Damage:
    - Shells: splash within radius of `(train.x, RAIL_Y)` hurts the train, using light-tank armour from the `ARM` table.
    - Units: enemy units in range may target trains in the existing target pick, with the same armour.
    - At hp ≤ 0 the train is removed. Its riders dismount (next task) and its slot frees.
- Commands: `buyTrainCmd()` checks supplies against `TRAINS[n].cost`, charges once and toasts "<name> is running."
- [ ] **Step 1: Failing tests:**
  - The train shuttles between the HQ and the end, and reverses.
  - A cut track makes a train past the cut reverse.
  - An empty round trip pays 0.
  - Shells and fire damage the train.
  - Slots are capped at 3.
  - Can't buy with no track.
- [ ] **Step 2:** Run the tests. Expect FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `npm run check`. Expect PASS.
- [ ] **Step 5:** Commit `feat: transport trains run and take fire`.

### Task 4: Riders — boarding, wounded return, healing

**Files:**
- Modify: `src/sim/rail.js`, `src/sim/combat.js` (skip `u.riding` units in movement, firing and being targeted), `src/sim/geometry.js` (if the ride decision runs at spawn)
- Test: `tests/unit/rail.test.js`

**Interfaces:**
- Produces:
  - `shouldRide(u) → boolean`. True only when all of these hold:
    - the unit is infantry (not armour, not fixed) on its own side;
    - its ordered line is at or beyond `trackEnd`;
    - it is at the HQ, or at the railhead spawn behind the end of the track;
    - the time to wait for the next departure plus the ride time is less than the time to walk to `G.LX[trackEnd]`.
  - **Outbound boarding:** units with `shouldRide` wait at the HQ, marked `u.waiting`, with their movement paused. A train at the HQ boards waiting units up to its capacity. It departs when full, or when no other waiting unit would gain by riding.
  - **Riding:** a rider has `u.riding = id`. Its x follows the train and its y is `RAIL_Y`. It doesn't fire, can't be hit, and is skipped by `walkFront`'s reached test.
  - **Outbound arrival:** at the end of the track, riders unload. They clear `riding` and walk to their ordered line.
  - **Return boarding:** settled units at the end-of-track trench with `hp < WOUNDED × max` board the return trip. They remember `u.homeLine`.
  - **Healing:** at the HQ they heal to max, then queue outbound to `u.homeLine`. If that line is no longer held, they use `G.sel` or `ai.F`.
  - **Carried flag:** any boarding sets the train's `carried`.
  - **Destroyed train:** riders dismount at full strength at the train's x.
- [ ] **Step 1: Failing tests:**
  - `faster or walk`: a unit whose walk is shorter than the wait plus the ride walks.
  - A rider unloads at the end and walks on.
  - Wounded ride back, heal, and return.
  - `line lost`: if the home line is lost, the unit goes to `G.sel`.
  - `cut off`: when the end moves back, riders dismount at the new end.
  - `destroyed`: riders dismount at full strength.
  - `no farming`: an empty shuttle pays nothing, and a trip with a rider pays 15.
  - Riders are excluded from `walkFront` and from targeting.
  - Tanks never ride.
- [ ] **Step 2:** Run the tests. Expect FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `npm run check`. The existing seeded tests must stay green. Expect PASS.
- [ ] **Step 5:** Commit `feat: train riders, wounded return and healing`.

### Task 5: Enemy railways, UI and drawing

**Files:**
- Modify:
  - `src/sim/ai.js`: `ai.railFund`. From t ≥ `AI_RAIL_T`, `AI_RAIL_SHARE` of income goes into it, taken from the same income split as the base and gun shares. On a fixed schedule, spend it in this order: repair, lay the next segment, buy trains up to the cap. No rng.
  - `index.html` and `src/ui/hud.js`: a Lay track / Repair track button in the orders row, and a train buy button in the buy row labelled with the national name and cost, with disabled reasons.
  - `src/ui/draw/terrain.js` or a new `src/ui/draw/rail.js`: rails and sleepers along `RAIL_Y` for each side's segments, broken segments drawn bent with a gap, and trains with riders shown as heads in the wagons.
- Test: `tests/unit/ai.test.js`, `tests/unit/ui.test.js`, `tests/unit/draw.test.js`, plus e2e (lay one segment and buy a train)
- [ ] **Step 1: Failing tests:**
  - AI: nothing happens before 90 s. Once the fund covers it, the enemy lays a segment. It repairs before laying. Money is byte-identical before 90 s.
  - **Real-battle check (required):** a scratchpad script runs 6 seeded battles of 600 s and reports how much enemy track was laid and how many enemy trains were bought.
  - UI: the button labels and disabled reasons. Clicking them lays track and buys a train.
  - Draw: drawing doesn't throw for track, breaks and trains on both sides.
- [ ] **Step 2:** Run the tests. Expect FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `npm run check && npm run e2e`. Expect PASS.
- [ ] **Step 5:** Commit `feat: enemy railways, track and train UI`.

### Task 6: Bot, balance, docs

**Files:**
- Modify: `scripts/bot.mjs`, `src/data/rail.js` (numbers only), `README.md`, `docs/DESIGN.md`, `docs/STATS.md` (via `npm run stats`)
- **Bot:** lays track while supplies ≥ 3 × the cost and the next trench is held. Repairs breaks. Buys one train once the track end is ≥ 2. Add `track`, `trains` and `foeTrack` fields to the JSON.
- [ ] **Step 1:** Run a baseline on main from a throwaway scratchpad `git worktree`: every nation vs `de`, and `de` vs `gb`, on 'open', seeds 1–10. Also run 3 seeds on 'march'.
- [ ] **Step 2:** Run the same matrix on the branch.
- [ ] **Step 3:** Tune toward these targets:
  - Every win-rate change within ±20 points.
  - Track should pay off on the long maps, and should not be an always-buy on 'open'.
  - You may change only the numbers in `src/data/rail.js`.
- [ ] **Step 4:** Docs:
  - Add a README "How to play" sentence.
  - Add a DESIGN.md section in the existing style.
  - Run `npm run stats`, `npm run check` and `npm run e2e`.
  - Expect PASS.
- [ ] **Step 5:** Commit `chore: tune railways, docs`.
