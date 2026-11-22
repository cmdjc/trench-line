# Armoured Train (Railways, Stage 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a buyable armoured train for every nation and the enemy. It shares the transport train's three slots, advances to the end of its side's intact, held track and holds there, and fights with a cannon (shell) and machine guns (instant tracer). It falls back to shelling the enemy base when nothing else is in range.

**Architecture:**
- **Data:** a per-nation `ARMOR_TRAINS` table and one AI constant go in `src/data/rail.js`, next to `TRAINS`.
- **Entity:** an armoured train is a `G.trains` entry tagged `kind: 'armor'`. It is never in `G.units`. `stepTrains` branches on `isArmor(t)`. Armoured trains run their own move pass (`moveArmor`) and fire pass (`fireArmor`) in `src/sim/rail.js`, and skip every transport code path (boarding, dwell, stranding, trip pay, `rideTime`).
- **Firing:** `fireArmor` mirrors `stepUnits`' armour branch line for line. It does the nearest-target search, then the `T.mg` sidearm block, then the main-gun `T.shell` push, then the base fallback. It reuses `hurt`, `accVs`, `tracer` and `puff` from `combat.js`. `rail.js` and `combat.js` already import each other's functions. This is safe because every cross-module use happens at call time, never while the modules are being evaluated.
- **Buying:** `buyArmor(side)` (sim), `buyArmorCmd()` (player command) and `#armorBtn` in the buy row, all following `buyTrain`/`buyTrainCmd`/`#trainBtn`. The enemy buys from `ai.railFund` through a new step in `aiRail()`.

**Tech Stack:** Vanilla ES modules, canvas, Vite, Vitest (+ jsdom), jsdom e2e.

**Spec:** `docs/superpowers/specs/2026-11-22-armoured-train-design.md`

## Global Constraints

- `src/sim/**` and `src/data/**` stay browser-free.
- **Determinism:** no new rng draws on any path that runs while no side has an armoured train. Every draw added by this plan sits inside `fireArmor` or the armoured-train exhaust puff, and those run only for a living `kind: 'armor'` entry. Enemy money stays byte-identical before `AI_RAIL_T` (the existing ai test). After `AI_RAIL_T` the enemy's rail-fund cap rises (Task 4), so enemy spending changes in every battle. That change is expected and is part of the feature.
- **Not a unit:** an armoured train is never pushed to `G.units`. It never changes `count`, `tanks`, `infCap`, `walkFront`, `countAt`, `power` or trench ownership. It never makes a unit wait (it is excluded from `rideTime`/`trainETA`).
- **Reuse, don't duplicate:** damage goes through `hurt()` (units, and train stubs `{ ..., train: tr }`) and through `G.shells` (resolved by `stepUnits`' existing shell loop). Accuracy goes through `accVs()`. VFX go through `tracer()` and `puff()`, and shells get their `boom()` from the existing shell loop. No new damage or splash math. `hurtTrain` is unchanged.
- **One shared slot pool:** `canBuyTrain(side)` counts every `G.trains` entry of that side, both kinds together, against `TRAIN_SLOTS` 3. It is not 3 per kind. The current implementation already does this, and this plan pins it with tests and must not "fix" it per kind.
- **Never crosses a broken segment:** this is the same rule DESIGN.md §11 gives for every train. The armoured train's goal is clamped at the forward edge of a break behind it. This is a clamp, not a state: no `stranded` flag, no riders.
- **Starting numbers** (spec table; tune only in Tasks 4 and 6). Every nation stays within ±15% of each base value:

  | Setting | Base |
  |---|---|
  | cost | 380 |
  | hp | 600 |
  | speed | 138 (= `TRAINS` base, 3 × rifle) |
  | cannon | `dmg` 25, `cd` 1.6, `range` 260, `splash` 20, `shell` 0.25 (fixed, like `TKB`) |
  | machine guns | `mg: { dmg 5, cd 0.2, range 280, acc 0.5 }` (`acc` fixed, like every tank `mg`) |
  | `AI_ARMOR_END` | 3 (enemy track end before it saves for an armoured train) |

- **National armoured trains** (`ARMOR_TRAINS`, exact values; shape copies a tank's main gun plus its `mg` sidearm):

  | Nation | name | cost | hp | speed | dmg | cd | range | splash | mg dmg / cd / range |
  |---|---|---|---|---|---|---|---|---|---|
  | gb | Naval armoured train | 380 | 600 | 138 | 25 | 1.6 | 270 | 20 | 5 / 0.2 / 280 |
  | de | Panzerzug | 420 | 680 | 125 | 27 | 1.75 | 260 | 22 | 5 / 0.18 / 290 |
  | fr | Train blindé | 370 | 580 | 138 | 24 | 1.4 | 260 | 20 | 5 / 0.22 / 270 |
  | ru | Zaamurets armoured train | 350 | 640 | 130 | 25 | 1.7 | 250 | 21 | 5 / 0.2 / 280 |
  | us | Liberty armored train | 400 | 620 | 150 | 26 | 1.6 | 260 | 20 | 5.5 / 0.18 / 280 |
  | ah | k.u.k. Panzerzug | 380 | 600 | 138 | 25 | 1.6 | 260 | 20 | 5 / 0.2 / 280 |
  | it | Treno armato | 375 | 590 | 138 | 26 | 1.6 | 280 | 19 | 5 / 0.21 / 270 |
  | aq | Iron Penguin | 420 | 680 | 125 | 28 | 1.8 | 260 | 23 | 5 / 0.2 / 280 |

- **Copy:**
  - Buy toast: `<name> is moving up to the end of the track.`
  - Destroyed toast: the existing `<name> was destroyed.`
  - Button disabled reasons: the exact strings `#trainBtn` already uses.
- `npm run check` and `npm run e2e` pass at the end of every task.

## Review Focus

1. **Shared cap.** 2 transport + 1 armoured, or 1 transport + 2 armoured, hits the cap at 3 total. Both buy commands then refuse without charging, and both buttons say `All train slots in use.` The enemy's trains never use the player's slots. (Task 2 test `shared slots`; Task 5 test `armor button shares the slot cap`.)
2. **Track lost under a holding train.** When the end trench is lost (owner flips, or `cutTrack`), the train retreats to the new end and holds there. When everything is lost, it returns to the HQ. When a break appears behind it, it stops at the break's forward edge. It never crosses the break and never moves past the end. (Task 2 tests `retreats when the end is lost`, `never crosses a break`.)
3. **Base fallback is range-bounded.** The cannon shells the base only when `|base.x − t.x| ≤ T.range`. Ten px further out, nothing fires and no rng is drawn. The machine guns never fire at the base (tanks' `mg` sidearm doesn't either). (Task 3 tests `base fallback in range`, `base fallback out of range`.)
4. **No rng without an armoured train.** `stepTrains` with transport trains running near enemy units consumes zero draws. This uses the reseed-and-compare pattern from `ai.test.js` `draws no rng on a base purchase`. (Task 3 test `no rng without armour`.)
5. **The enemy really buys and uses one.** In real seeded `npm run bot` battles on long maps, the enemy buys at least one armoured train and it fires. A unit test of `aiRail()` alone does not count. (Task 4 Step 5.)

---

### Task 1: Armoured train data

**Files:**
- Modify: `src/data/rail.js`
- Test: `tests/unit/data.test.js`

**Interfaces:**
- Produces:
  - `ARMOR_TRAINS[nation] = { name, cost, hp, speed, dmg, cd, range, splash, shell: 0.25, mg: { dmg, cd, range, acc: 0.5 } }` for all 8 nations, with the values from the Global Constraints table.
  - `AI_ARMOR_END = 3`.
  - The `TRAIN_SLOTS` comment changes to "shared by transport and armoured trains".

- [ ] **Step 1: Write the failing tests** in `data.test.js`, beside the train tests. Use `ARMOR_BASE = { cost: 380, hp: 600, speed: 138, dmg: 25, cd: 1.6, range: 260, splash: 20 }` and `ARMOR_MG_BASE = { dmg: 5, cd: 0.2, range: 280 }`.
  - `every nation has an armoured train entry`: the key set equals `NATS`.
  - `armoured train names match the national names`: each `name` equals the name in the table above.
  - `armoured train stats are within 15% of base`: every `ARMOR_BASE` key and every `mg` key is a number in `[0.85×, 1.15×]` of its base. `cost` is an integer, `shell === 0.25` and `mg.acc === 0.5`.
  - `AI_ARMOR_END is 3`.
- [ ] **Step 2:** Run `npx vitest run tests/unit/data.test.js`. Expect FAIL (`ARMOR_TRAINS` is undefined).
- [ ] **Step 3:** Add `ARMOR_TRAINS` and `AI_ARMOR_END` to `src/data/rail.js`. Add a comment line on the base values, matching the `TRAINS` comment.
- [ ] **Step 4:** Run `npm run check`. Expect PASS.
- [ ] **Step 5:** Commit `feat: armoured train data`.

### Task 2: Armoured train entity — buy, advance and hold, destruction

**Files:**
- Modify: `src/sim/rail.js`, `src/sim/commands.js`
- Test: `tests/unit/rail.test.js` (new `describe('armoured train')`)

**Interfaces:**
- Consumes: `ARMOR_TRAINS` (Task 1).
- Produces:
  - `isArmor(t) → boolean` (exported): `t.kind === 'armor'`. Entries without a `kind` (the existing tests push bare objects) count as transport.
  - `buyArmor(side) → boolean` (exported, no charge). It fails exactly when `canBuyTrain(side)` fails. It pushes `{ id: ++trainId, kind: 'armor', side, x: G.LX[home], hp: A.hp, max: A.hp, cd: 0, cd2: 0, flash: 0, flash2: 0, aim: 0, puff: 0, moving: false, shots: 0, mgShots: 0, riders: [], T: A }`. `riders` stays `[]` forever so that `dismountAll` and the draw code stay generic. There is no `dir`.
  - `buyTrain` adds `kind: 'transport'` to the entries it creates. Nothing else about them changes.
  - `canBuyTrain(side)` keeps its current logic: all of the side's trains `< TRAIN_SLOTS` and `trackEnd(side) > 0`. Only the comment changes, to say it is shared by both kinds.
  - `rideTime` (the `G.trains.some` check and the ETA loop) skips `isArmor` trains.
  - `stepTrains(dt)`: an `isArmor(t)` entry calls `moveArmor(t, dt)` and then `continue`s, before any transport logic. Task 3 inserts `fireArmor` after `moveArmor`.
  - The end-of-frame wreck cleanup is unchanged except for `d: isArmor(t) ? { L: 26, W: 7 } : { L: 18, W: 6 }`.
  - `buyArmorCmd() → boolean` in `commands.js`. It returns false when `!G.running`, when `!canBuyTrain(0)`, or when supplies are below `ARMOR_TRAINS[nation].cost`, and it charges nothing in those cases. Otherwise it charges once, calls `buyArmor(0)`, toasts `A.name + ' is moving up to the end of the track.'` and emits `hud`.
- `moveArmor(t, dt)` (module-private). Its algorithm:

  ```js
  const fwd = fwdOf(t.side), home = G.LX[homeOf(t.side)], end = trackEnd(t.side);
  let goal = end > 0 ? segDist(t.side, end) : 0, p = (t.x - home) * fwd;
  const fence = breakBehind(t.side, p);
  if (fence >= 0) goal = Math.max(goal, fence);            // never cross a break behind it
  const step = t.T.speed * dt;
  t.moving = Math.abs(goal - p) > 1e-6;
  p = p < goal ? Math.min(goal, p + step) : Math.max(goal, p - step);
  t.x = home + p * fwd;
  ```

- [ ] **Step 1: Write the failing tests** (`game()` as in the file; `track3 = () => { G.owner[2] = G.owner[3] = 0; layTrack(0); layTrack(0); layTrack(0); }`; `A = ARMOR_TRAINS.gb`):
  - `cannot be bought with no track, charges nothing`: `C.buyArmorCmd()` returns false, `G.trains.length === 0` and supplies are unchanged.
  - `buy charges once and spawns at the HQ`: `track3()`, then `C.buyArmorCmd()`, then supplies drop by `A.cost` and `G.trains[0]` matches `{ kind: 'armor', side: 0, x: G.LX[0], hp: A.hp, max: A.hp }` with `riders` equal to `[]`. Also, `C.buyTrainCmd()` gives an entry with `kind: 'transport'`.
  - `shared slots`, in four cases, each in a fresh game with track:
    - (a) 2 transport + 1 armour bought: `canBuyTrain(0)` is false, and both `C.buyTrainCmd()` and `C.buyArmorCmd()` return false with supplies unchanged.
    - (b) 1 transport + 2 armour: the same.
    - (c) 3 enemy trains pushed (side 1): `C.buyArmorCmd()` still returns true, because slots are per side.
    - (d) side 1 with 1 transport + 2 armour: `buyArmor(1)` and `buyTrain(1)` both return false.
  - `enemy fire hurts it`: hold at `G.LX[3]`, add an enemy rifle at `t.x + 100` on `RAIL_Y`, settled, and run 200 × `{ u.cd = 0; step(0.05); }`. Then `t.hp < t.max`. This uses the existing generic targeting and `hurtTrain` unchanged.
  - `advances to the end and holds`: `track3()`, buy, then 400 × `stepTrains(0.05)`. Then `x` equals `G.LX[3]` within 0.001 and never went past it during the run. Then 100 more steps: `x` is unchanged and `t.moving` is false.
  - `follows the end forward`: after holding at 3, set `G.owner[4] = 0` and `layTrack(0)`, then step. `x` reaches `G.LX[4]`.
  - `retreats when the end is lost`. All of these hold at `G.LX[3]` first, then step:
    1. `G.owner[3] = 1` (no cut). `x` decreases each frame until it equals `G.LX[2]`, then holds.
    2. `cutTrack(0, 2)`. The train reaches `G.LX[1]`.
    3. `cutTrack(0, 1)`. The train reaches `G.LX[0]` and stays there. It is not destroyed.
  - `never crosses a break`: hold at `G.LX[3]`, then `G.track[0].broken.add(2)` and step 400 frames. The train stops at `G.LX[2]`, the forward edge of segment 2, not at `G.LX[1]`. Then `repairTrack(0)` and step: it returns to `G.LX[3]`.
  - `side 1 mirrored`: `G.owner[G.HQI-1] = G.owner[G.HQI-2] = 1`, `layTrack(1)` twice, then `buyArmor(1)` and step. `x` reaches `G.LX[G.HQI-2]`.
  - `never carries riders and never makes troops wait`: `track3()`, buy armour only, then `spawn(0, 'rifle', 3)`. `shouldRide(u)` is false. After 50 combined `step`+`stepTrains` frames, `u.waiting` is falsy and the armoured train's `riders` is `[]`.
  - `not a unit`: record `count(0)`, `tanks(0)`, `infCap(0)`, `walkFront(0)` and `countAt(0, 3)` before buying. After buying and holding they are all unchanged, and `G.units` has no entry with `kind`.
  - `destroyed: wreck, slot freed, toast`: set `t.hp = 0`, then `stepTrains(0.01)`. `G.trains` is empty, the last wreck has `d` equal to `{ L: 26, W: 7 }`, the toast `Naval armoured train was destroyed.` was emitted, and `C.buyArmorCmd()` succeeds again.
- [ ] **Step 2:** Run `npx vitest run tests/unit/rail.test.js`. Expect FAIL.
- [ ] **Step 3:** Implement the Interfaces above in `rail.js` and `commands.js`.
- [ ] **Step 4:** Run `npm run check`. The existing transport and rider tests must stay green unchanged. Expect PASS.
- [ ] **Step 5:** Commit `feat: armoured train advances to the end of the track and holds`.

### Task 3: Armoured train weapons — cannon, machine guns, base fallback

**Files:**
- Modify: `src/sim/rail.js` (import `hurt`, `accVs`, `tracer` and `puff` from `./combat.js`, and `rng` from `../core/rng.js`; update the header comment: rng is now drawn only by armoured trains)
- Test: `tests/unit/rail.test.js` (new `describe('armoured train: weapons')`)

**Interfaces:**
- Consumes: the Task 2 entity fields `cd`, `cd2`, `flash`, `flash2`, `aim`, `puff`, `moving`, `shots` and `mgShots`.
- Produces:
  - `fireArmor(t, dt)` (module-private), called in `stepTrains` right after `moveArmor`.
  - The counters `t.shots` (cannon shells launched, base shells included) and `t.mgShots` (mg bursts, hit or miss), which the bot reads in Task 4.
  - `t.aim` (radians, `Math.atan2(gy - RAIL_Y, (gx - t.x) * fwd)`), `t.flash` (0.08 on a cannon shot) and `t.flash2` (0.07 on an mg burst), which the draw code reads in Task 5.
  - After the train loop, `stepTrains` removes units killed by armoured fire: `G.units = G.units.filter(u => u.hp > 0)`. This runs only when at least one armoured train stepped this frame. No rng.
- `fireArmor` order. The rng draw order is fixed, so follow `stepUnits` lines 75–90 and 139–183 exactly, with `u` replaced by `t`, `u.y` replaced by `RAIL_Y`, `dir = fwdOf(t.side)`, no `minR`, and no `G.M` multipliers (national stats are already baked into `ARMOR_TRAINS`, as with `TRAINS`). The steps:
  1. **Target.** Find the nearest living enemy that is not `hidden` in `G.units`, using `Math.hypot`. Then check the enemy `G.trains` entries with `hp > 0`, using `Math.abs(tr.x - t.x)`. A train replaces `best` only if it is nearer, and it is stored as the stub `{ x: tr.x, y: RAIL_Y, hp: tr.hp, settled: false, T: {}, train: tr }`. There is no range filter here, because each weapon checks its own range.
  2. **Timers and exhaust.** `t.cd -= dt; t.cd2 -= dt; t.flash -= dt; t.flash2 -= dt; t.puff -= dt`. Then run the tank exhaust block using `puff()`, with `t.moving` and `t.hp < t.max * 0.33`. The offset is `-dir * 22`.
  3. **Machine guns.** These are `stepUnits`' `T.mg` block verbatim. It runs if `t.cd2 <= 0 && best && bd <= T.mg.range`:
     - Set `cd2 = T.mg.cd * (0.8 + rng.float() * 0.4)` and `flash2 = 0.07`.
     - Set `sy = best.y < RAIL_Y ? -6 : 6`.
     - Hit roll: `rng.float() < T.mg.acc * accVs(t, best)`. On a hit, draw `tracer(t.x, RAIL_Y + sy, best.x, best.y, 1, '#ffd76a')` and call `hurt(best, T.mg.dmg, 'mg', t)`. On a miss, draw the scattered faint tracer.
     - `t.mgShots++`.
  4. **Cannon.** Skip this step if `t.cd > 0`. Otherwise:
     - Set `gx`/`gy` to `best` when `best && bd <= T.range`, else to the enemy base, as in the tank branch. Then set `t.aim`.
     - If `best && bd <= T.range`, set `t.cd = T.cd * (0.85 + rng.range(0, 0.3))` and `t.flash = 0.08`, and push `{ x0: t.x + dir * 14, y0: RAIL_Y, x1: best.x, y1: best.y, t: 0, dur: T.shell, side: t.side, type: 'tank', dmg: T.dmg, splash: T.splash, arc: 0.1 }`.
     - Otherwise, take `b = G.bases[1 - t.side]`. If `Math.abs(b.x - t.x) <= T.range`, set the same `cd` and `flash`, set `by = RAIL_Y + (rng.float() - 0.5) * 70`, and push `{ x0, y0, x1: b.x - dir * 20, y1: by, t: 0, dur: T.shell, side, type: 'tank', dmg: T.dmg * 1.5, base: true, arc: 0.1 }`.
     - On either push, `t.shots++`.
  - The machine guns never fire at the base.

- [ ] **Step 1: Write the failing tests.** Setup: `game()`, `G.units = []`, `track3()`, `C.buyArmorCmd()`, `t = G.trains[0]`, `t.x = G.LX[3]`. `foe(dx)` spawns an enemy rifle with `spawn(1, 'rifle', 4, true)` at `x = t.x + dx`, `y = RAIL_Y`, settled, `fall = 0`.
  - `cannon shells the nearest enemy in range`: `foe(200)`, then `stepTrains(0.05)`. `G.shells` has one entry matching `{ side: 0, type: 'tank', dmg: A.dmg, splash: A.splash, dur: A.shell, x1: foe.x }`, with `t.cd > 0` and `t.shots === 1`. Then run `step(0.3)`: the foe's hp is below its max.
  - `machine guns hit through hurt and accVs`: `foe(100)` with `hp = max = 1e6`. Run 200 frames of `stepTrains(0.05)`, with `t.cd = 99` to keep the cannon quiet. The foe's hp drops, `G.tracers` contains `#ffd76a` tracers, and `t.mgShots > 0`.
  - `fires at enemy trains`: push an enemy transport at `t.x + 150`, with no units. Use `side: 1`, `dir: -1` and `T: { ...TRAINS.de, speed: 0 }` so it stays put, plus `hp`, `max`, `riders: []`. Then `stepTrains(0.05)`. The shell `x1` equals that train's `x`. After 100 frames with `t.cd = 99`, that train's hp is below max.
  - `never fires at its own side`: add a friendly rifle and a friendly transport at `t.x + 100`, then 200 frames. `G.shells` is empty, there are no tracers, both are at full hp, and `t.shots === 0`.
  - `holds fire out of range`: `foe(400)` (beyond both ranges, base far away). After 20 frames, no shells, no tracers, and `t.shots === 0` and `t.mgShots === 0`.
  - `base fallback in range`: no units, and `t.T = { ...A, speed: 0 }` so `moveArmor` leaves it where it is put. `t.x = G.bases[1].x - (A.range - 10)`, then `stepTrains(0.05)`. One shell matches `{ base: true, dmg: A.dmg * 1.5, x1: G.bases[1].x - 20, side: 0 }`. No tracers.
  - `base fallback out of range`: same setup with `t.x = G.bases[1].x - (A.range + 10)`. Wrap it in `rng.reseed(5)`, 20 frames, `a = rng.float()`, `rng.reseed(5)`. `G.shells` is empty, `a === rng.float()`, and there are no tracers.
  - `kills are removed the same frame`: `foe(100)` with `hp = 0.1` and `t.cd = 99`. Run `stepTrains(0.05)` for up to 200 frames, stopping once `foe.hp <= 0`. After every call, `G.units.every(u => u.hp > 0)` holds. The loop ends with the foe dead, the foe not in `G.units`, and `G.S.kills` up by 1.
  - `no rng without armour`: a new game with `track3()`, two `C.buyTrainCmd()`, and enemy rifles at `G.LX[2]` and `G.LX[3]`. `rng.reseed(5)`, then 400 × `stepTrains(0.05)`, then `a = rng.float()`, then `rng.reseed(5)`. `a` equals `rng.float()`.
- [ ] **Step 2:** Run `npx vitest run tests/unit/rail.test.js`. Expect FAIL.
- [ ] **Step 3:** Implement `fireArmor` and the post-loop unit filter as specified above.
- [ ] **Step 4:** Run `npm run check`. Expect PASS. All existing seeded tests (`combat-step`, `tick`, `ai`) stay green unchanged.
- [ ] **Step 5:** Commit `feat: armoured train cannon, machine guns and base fallback`.

### Task 4: Enemy armoured train, and the real-battle check

**Files:**
- Modify: `src/sim/ai.js`, `scripts/bot.mjs` (reporting only)
- Test: `tests/unit/ai.test.js` (`describe('enemy railway')`)

**Interfaces:**
- Consumes: `buyArmor`, `isArmor` and `canBuyTrain` (Task 2), `ARMOR_TRAINS` and `AI_ARMOR_END` (Task 1), and `t.shots`/`t.mgShots` (Task 3).
- Produces:
  - **Fund cap.** `rc` in `aiStep` becomes `Math.max(TRAINS[n].cost * 2, ARMOR_TRAINS[n].cost)`, so the fund can hold an armoured train.
  - **`aiRail()`.** `mine` now counts the side's transport trains only (`!isArmor`). Add `armor` = the side's armoured trains. The priority order:
    1. Repair (unchanged).
    2. First transport at `end >= 2` (unchanged; it saves for it).
    3. Lay track (unchanged).
    4. **New:** `mine >= 1 && !armor && end >= AI_ARMOR_END && canBuyTrain(1)`. If `ai.railFund >= A.cost`, pay and `buyArmor(1)`. Either way, `return`: the AI saves for the armoured train before a second transport.
    5. Second transport (unchanged condition).
  - It draws no rng, as before.
  - **Bot output.** A new field `foeArmor: { bought, shots, mgShots }`, plus the same for the bot's own side as `armor`. `watchRail` counts armoured trains in these fields instead of `trains.bought`/`trips`. `shots` and `mgShots` are summed from each armoured train's last-seen counters, so a destroyed train's shots still count.

- [ ] **Step 1: Write the failing tests** (use the existing `setup`, `buyTicks` and `mineTrains`; `acost = () => ARMOR_TRAINS[G.nation[1]].cost`; `armors = () => G.trains.filter(t => t.side === 1 && isArmor(t)).length`):
  - `caps the rail fund at max(2x a train, an armoured train)`. This replaces `caps the rail fund at 2x a train`. Start with `railFund = cap`, then `aiStep(1)`. The fund still equals the cap and money grew.
  - `buys an armoured train at end 3 after its first transport, saving for it`: all held, `G.track[1].end = 3`, one enemy transport present, `railFund = acost() - 1`. After `buyTicks(3)`, `armors() === 0` and `mineTrains() === 1` (no second transport while it saves). Then `railFund = acost()` and `buyTicks()`: `armors() === 1` and the fund is 0.
  - `no armoured train without a transport first`: `end = 3`, no trains, `railFund = 999`. After `buyTicks()`, the only purchase is a transport.
  - `never more than 3 trains across both kinds`: all held, `end = 5`, `railFund` refilled to 999 before each of 20 `buyTicks()`. Enemy trains stay at 3 or fewer, and `armors() <= 1`.
  - `never buys armour with noRail`: `G.ai.noRail = true` blocks it, as the existing noRail gate does.
  - Update `buys a second train only once track end is 3...` so that between the end-3 step and the second-transport assertion it first funds and buys the armoured train. The assertion becomes `mineTrains() === 2` and `armors() === 1`. Every other existing rail-AI test stays unchanged.
- [ ] **Step 2:** Run `npx vitest run tests/unit/ai.test.js`. Expect FAIL.
- [ ] **Step 3:** Implement the `ai.js` changes and the bot reporting fields.
- [ ] **Step 4:** Run `npm run check`. Expect PASS.
- [ ] **Step 5: Real-battle check (required).** Run the enemy against the bot on long maps where its track gets past 3:

  ```bash
  for m in plain march; do for s in 1 2 3 4 5 6; do MAXS=900 node scripts/bot.mjs gb de $m $s 6 --json; done; done
  ```

  **Pass:** in at least 4 of the 12 battles, `foeArmor.bought >= 1`. In every battle where one was bought, `foeArmor.shots > 0` and `foeArmor.mgShots > 0`.

  **If it fails:** tune in this order, rerunning each time:
  1. `AI_ARMOR_END` (down to 2).
  2. Move step 4 ahead of laying track.
  3. As a last resort, raise `AI_RAIL_SHARE` (re-checking the stage-1 balance table in Task 6).

  Paste the 12 `foeArmor` lines and the final values into the commit body.
- [ ] **Step 6:** Commit `feat: enemy buys and fields an armoured train`.

### Task 5: Buy button and drawing

**Files:**
- Modify: `index.html`, `src/ui/hud.js`, `src/ui/draw/rail.js`
- Test: `tests/unit/ui.test.js`, `tests/unit/draw.test.js`, `tests/e2e/game.e2e.test.js`

**Interfaces:**
- Consumes: `buyArmorCmd`, `isArmor` and `canBuyTrain` (Task 2), `ARMOR_TRAINS` (Task 1), and `t.aim`/`t.flash`/`t.flash2`/`t.hp`/`t.max` (Task 3).
- Produces:
  - In `index.html`, `<button class="act alt swbtn" id="armorBtn"></button>` goes directly after `#trainBtn` in the buy row. It is not a field-band button.
  - In `hud.js`, extract the current `#trainBtn` disabled-reason expression into `trainWhy(cost) → string`. It returns the same strings in the same order: `No track yet.` / `The track is cut.` / `Repair the broken track first.` / `All train slots in use.` / `Not enough supplies.` / `''`. Both buttons use it. `#armorBtn` renders `'<b>' + A.name + ': ' + A.cost + '</b><small>' + why + '</small>'`, with `disabled = !!why`, and its click calls `commands.buyArmorCmd()`.
  - In `draw/rail.js`, `drawTrains` calls `drawArmorTrain(t)` when `isArmor(t)`, else `drawTrain(t)`, inside the same translate and flip. `drawArmorTrain` draws a top-down armoured loco and gun wagon in the nation's `body`/`hat` colours. The body stays within `RAIL_Y ± 8`, and the turret is rotated by `t.aim`. It draws a muzzle flash while `t.flash > 0` and a small mg flash while `t.flash2 > 0`. The health bar is copied from `drawTrain` and sits above the body only when `hp < max`. The art is the builder's call.
- [ ] **Step 1: Write the failing tests:**
  - ui `armor button shows its national name and cost, and says why it is off`: this mirrors the `#trainBtn` test. `Naval armoured train: 380`, then `No track yet.`, then `Not enough supplies.` (supplies 300 with track), then enabled with 500, then a click charges 380 and adds one `kind: 'armor'` train.
  - ui `armor button shares the slot cap`: track 1, supplies 2000. Click `#trainBtn` twice and `#armorBtn` once. Both buttons then contain `All train slots in use.` and are disabled, and `G.trains.length === 3`.
  - draw: extend `draws track, breaks and trains...` with one `kind: 'armor'` entry per side (using `ARMOR_TRAINS[nat[s]]` and Task 2's field set). It does not throw.
  - draw `draws an armoured train within its body width`: this uses the `rec()` proxy like the transport test, with every `fillRect`/`arc` y in `[RAIL_Y - 8, RAIL_Y + 8]` when undamaged. Also, a damaged one puts the health bar above `RAIL_Y - 8`.
  - e2e: after the existing `#trainBtn` click, run `T.give(1000)` and `frames(2)`, then click `#armorBtn`. Supplies drop by more than 300.
- [ ] **Step 2:** Run `npx vitest run tests/unit/ui.test.js tests/unit/draw.test.js`. Expect FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `npm run check && npm run e2e`. Expect PASS. Look at the game once with `npm run dev`: buy one, watch it reach the end of the track, fire, and retreat when a trench falls.
- [ ] **Step 5:** Commit `feat: armoured train buy button and art`.

### Task 6: Bot, balance, docs

**Files:**
- Modify: `scripts/bot.mjs`, `src/data/rail.js` (numbers only: `ARMOR_TRAINS`, `AI_ARMOR_END`), `tests/unit/data.test.js` (only if base values move), `README.md`, `docs/DESIGN.md`
- **Bot:** after its railway block, it buys one armoured train once it has a transport, `trackEnd(0) >= 3`, `canBuyTrain(0)` holds, and supplies are at least twice the cost. `BOTNOARMOR=1` turns this off, for comparison runs. `NORAIL` implies it.
- [ ] **Step 1:** Baseline on `main` (no armoured train exists there), run from a throwaway scratchpad `git worktree`. Cover every nation vs `de` and `de` vs `gb` on 'open' (seeds 1–10), plus 'plain' and 'march' (seeds 1–3), all at `MAXS=900`.
- [ ] **Step 2:** Run the same matrix on the branch with armour on.
- [ ] **Step 3: Tune toward these targets:**
  - Every win-rate change within ±20 points.
  - An armoured train must not end up holding a trench alone. The anti-goal: on 'plain' and 'march', compare the bot's `sel` and `losses` with and without armour. Armour should help push, not make trench fighting pointless.
  - The Task 4 real-battle check still passes.
  - Change only the numbers listed in Files, and keep the ±15% band (if base values move, update `ARMOR_BASE` in the data test).
- [ ] **Step 4: Docs:**
  - Add a README "How to play" sentence.
  - Add a DESIGN.md section `## 12. Railways (stage 2: armoured train)` in the §11 style. It covers the entity, advance and hold, the never-crosses-a-break clamp, both weapons and the base fallback, the shared slots, the enemy priority order and fund cap, the bot rule, the national table, and the balance tables.
  - Change §11's "Stage 2 ... planned and not built" so that only stage 3 is unbuilt.
  - Run `npm run stats`, `npm run check` and `npm run e2e`. Expect PASS.
- [ ] **Step 5:** Commit `chore: tune armoured train, docs`.
