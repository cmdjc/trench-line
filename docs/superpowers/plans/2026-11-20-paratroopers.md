# Paratroopers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the USA's Kettering Bugs with an aimed airborne drop. Each drop puts 4 Thompson gunners, 2 riflemen and 2 BAR gunners into an enemy-held or empty trench up to 3 trenches past your walking front. The enemy USA uses the drop too.

**Architecture:**
- **Data.** The drop is a new superweapon kind, `'drop'`, defined in `SW.us`. Its cost comes from `DROP_MIX`.
- **Units.** Paratroopers are ordinary units spawned with `u.para = true` and a `u.fall` descent timer.
  - `count()` skips them.
  - A new `walkFront(side)` ignores them when working out drop range.
  - Combat lets falling units be hit. Only units whose type has `fallFire` may shoot while falling.
- **Aiming.** Aiming reuses `G.aim` with `kind: 'drop'` and a snapped `line`.
- **Enemy.** The enemy uses the existing superweapon want path, with a USA-only unlock time.

**Tech Stack:** Vanilla ES modules, canvas, Vite, Vitest, jsdom e2e.

**Spec:** `docs/superpowers/specs/2026-11-20-paratroopers-design.md`

## Global Constraints

- `src/sim/**` and `src/data/**` stay browser-free.
- Determinism: the same seed gives the same battle.
  - No new rng draws before the first possible drop.
  - Landing scatter may use rng.
- Only one aim is active at a time. The `'paris'` and `'gun'` aim flows keep working unchanged.
- A drop charges exactly once, and only when it succeeds. A rejected drop never charges.
- Drop composition, cost and cooldown (fixed by the user):
  - Composition: 4 `tommy` + 2 `rifle` + 2 `mg`.
  - Cost: `Math.round((4×45 + 2×20 + 2×45) × 1.1)` = **341**, computed from the unit costs.
  - Cooldown: **30 s**.
- Paratroopers never count toward the infantry cap, and drops stack with no ceiling. This applies to both sides.
- Drop range is measured from the walking front, which ignores `para` units. `select()` and the existing uses of `frontLine()` stay unchanged.
- The Kettering Bugs are removed entirely: data, the `useSW` branch, toasts, tests and docs.
- Starting numbers that may be tuned:
  - `DROP_RANGE = 3`
  - Descent of about 2 s, staggered over about 1 s
  - Enemy USA drop unlock at 120 s
  - Thompson stats from Germany's stormtrooper: cost 45, hp 50, range 120, dmg 7, cd 0.35

## Review Focus

1. **The target turns invalid between the tap and Confirm.** Confirm refuses, charges nothing, and keeps the aim. (Task 2 test `revalidates`.)
2. **No valid trench in range** (for example, the enemy front is 5 trenches away). The button is blocked and states the reason. (Task 2 test `blocked`.)
3. **A drop while at the infantry cap.** All 8 still land, and buying stays blocked only by walking infantry. (Task 2 test `cap exempt`.)
4. **Chained drops.** Survivors of drop 1 sit at front+3, but drop 2's range is still measured from the walking front. (Task 2 test `no leapfrog`.)
5. **Germany or Britain aiming while a drop aim is active, and the reverse.** This is USA-only, but the aim plumbing is shared. Each new aim replaces the old one. (Task 4 ui test.)

---

### Task 1: Data — Thompson gunner, drop superweapon, remove the bugs

**Files:**
- Modify: `src/data/units.js` (add `SPECIAL.tommy`), `src/data/superweapons.js` (replace `SW.us`)
- Create: `src/data/drop.js`
- Remove the bugs from: `src/sim/superweapons.js` (the `'bugs'` branch), `src/sim/commands.js` (the toast), and `tests/unit/superweapons.test.js` (the bugs tests)
- Test: `tests/unit/data.test.js`

**Interfaces:**
- Produces:
  - `SPECIAL.tommy`, defined as follows:
    - Fields: `{ name: 'Thompson gunner', pl: 'Thompson gunners', cost: 45, hp: 50, speed: <USA rifle speed>, range: 120, dmg: 7, cd: 0.35, fallFire: true, role: 'Airborne only. A 1919 Thompson submachine gun: short range, fast fire, shoots while falling.' }`
    - Copy the other fields Germany's stormtrooper needs to behave as an SMG.
    - It is not in `ORDER` or `AI_W`.
  - `src/data/drop.js` exports:
    - `DROP_MIX = [['tommy',4],['rifle',2],['mg',2]]`
    - `DROP_MARKUP = 1.1`
    - `DROP_RANGE = 3`
    - `DROP_FALL = 2`
    - `DROP_STAGGER = 1`
    - `AI_DROP_T = 120`
    - `dropCost() → number`, computed as `Math.round(sum(utOf('us',k).cost × n) × DROP_MARKUP)`
  - `SW.us`:
    - `{ kind: 'drop', name: 'Airborne drop', cost: dropCost(), cd: 30, text: 'Mitchell’s 1919 plan made real: 4 Thompson gunners, 2 riflemen and 2 BAR gunners parachute into an enemy or empty trench up to 3 trenches past your front.' }`
    - If importing `drop.js` here creates a module cycle, set cost to 341 and have a test assert `SW.us.cost === dropCost()`.
- [ ] **Step 1: Failing tests.**
  - `SW.us.kind === 'drop'`, with cost 341 and cd 30.
  - `dropCost() === 341`.
  - `SPECIAL.tommy` exists with `fallFire`.
  - `'tommy'` is not in `ORDER`.
  - No source file under `src/` mentions `'bugs'` or "Kettering". Read the files with `fs`.
- [ ] **Step 2:** Run `npx vitest run tests/unit/data.test.js`. Expect FAIL.
- [ ] **Step 3:** Implement. Delete the bugs code paths and their tests. Leave a `'drop'` stub in `useSW` that returns false until Task 2.
- [ ] **Step 4:** Run `npm run check`. Expect PASS.
- [ ] **Step 5:** Commit `feat: airborne drop data, Thompson gunner, remove Kettering Bugs`.

### Task 2: Drop sim and player commands

**Files:**
- Create: `src/sim/drop.js`
- Modify: `src/sim/geometry.js` (`count` skips `u.para`), `src/sim/superweapons.js` (`swBlock` and the `useSW` drop branch), `src/sim/combat.js` (falling units), `src/sim/commands.js`, `src/sim/state.js` (if any init is needed)
- Test: `tests/unit/drop.test.js` (new)

**Interfaces:**
- Produces:
  - `walkFront(side) → number`
    - For side 0: the max `line` of non-fixed, non-`para` side-0 units, or 0 if there are none.
    - For side 1: mirrored, so the min line of such units, or `G.HQI` if there are none.
  - `validDrop(side, L) → boolean`
    - `isTrench(L)`
    - `G.owner[L]` is `1-side` or `-1`
    - L lies within `DROP_RANGE` trenches past `walkFront(side)` toward the foe
  - `dropTarget(side) → number | -1`, the first valid trench scanning from the walking front toward the foe.
  - `nearestDrop(side, x) → number | -1`, the valid trench whose `G.LX` is closest to x.
  - `spawnDrop(side, L)`
    - Spawns the `DROP_MIX` units with `spawn(side, k, L, true)`.
    - Sets `u.para = true` and `u.fall = DROP_FALL + i/n × DROP_STAGGER`.
    - Spreads `y` along the trench.
    - Units are placed and settled in L.
  - `stepUnits` changes in combat.js:
    - While `u.fall > 0`, count `u.fall` down. The unit doesn't move.
    - It may fire only if `u.T.fallFire`.
    - It can be hurt normally.
  - `swBlock(side)` for the `'drop'` kind returns 'No enemy or empty trench within 3 trenches of your front.' when `dropTarget(side) < 0`.
  - `useSW(side, at)` for `'drop'`:
    - Uses `at.line` when it is given and valid. Otherwise uses `dropTarget(side)`.
    - Returns false if there is no valid line.
    - Calls `spawnDrop`, sets the cooldown and toasts.
    - Side 1 toast: "Enemy paratroopers are landing at trench N."
  - Commands:
    - `startAiming()` also handles `'drop'`. It sets `G.aim = { kind: 'drop', x: null, y: null, line: -1 }`.
    - `confirmAim()` for `'drop'`:
      - Re-checks `validDrop(0, G.aim.line)`.
      - Re-checks supplies ≥ `swCost(0)`.
      - Calls `useSW(0, { line })`, charges once, clears the aim, and toasts "Paratroopers are jumping over trench N."
      - If invalid, it returns false and keeps the aim.
    - `fireSuperweapon()` is not used for `'drop'`.
- [ ] **Step 1: Failing tests** in `drop.test.js`:
  - `walkFront` ignores `para`.
  - `validDrop` covers own trench, enemy trench, empty trench, HQ, and out of range.
  - `spawnDrop` adds exactly 4 tommy, 2 rifle and 2 mg, all `para`, and `count(0)` is unchanged.
  - `cap exempt`: at the infantry cap a drop still lands all 8, and `full(0,'rifle')` is unchanged.
  - `no leapfrog`: after a drop at walkFront+3, `validDrop(0, walkFront+4)` is false.
  - `revalidates`: aim at a valid line, flip `G.owner` to 0, then confirm. It returns false, supplies are unchanged and the aim is kept.
  - `blocked`: with no valid trench, `swBlock(0)` returns the reason.
  - Falling: a falling rifle doesn't fire and a falling tommy does. Check this through `cd` or tracer emission after stepping. Falling units take damage.
  - Charges once: supplies drop by 341 and the cooldown is 30.
- [ ] **Step 2:** Run `npx vitest run tests/unit/drop.test.js`. Expect FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `npm run check`. The existing seeded tests must stay green. Expect PASS.
- [ ] **Step 5:** Commit `feat: airborne drop sim and commands`.

### Task 3: Enemy USA drops

**Files:**
- Modify: `src/sim/ai.js`
- Test: `tests/unit/ai.test.js`

**Interfaces:**
- In the existing superweapon-want gate (`G.S.t > 240`), use `AI_DROP_T` (120) instead when `SW[G.nation[1]].kind === 'drop'`. Keep the rest of that condition and its rng draw order exactly as they are for every other nation.
- `useSW(1)` for drop picks `dropTarget(1)`, which is mirrored.
- [ ] **Step 1: Failing tests:**
  - With an enemy USA and t = 130, a player-held trench within enemy range, and enough money, the AI can want and fire `'sw'`. After the fire, there are 8 side-1 `para` units on that line and money has dropped by 341.
  - With a non-US enemy, the gate is still 240.
  - Isolate any seeded test with a US enemy whose expectations shift, by setting `G.sw[1].cd = 1e9`. List those tests in the report.
- [ ] **Step 2:** Run the tests. Expect FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `npm run check` and a bot determinism check twice with `node scripts/bot.mjs gb us open 3 --json`. Expect PASS and identical output.
- [ ] **Step 5:** Commit `feat: enemy USA airborne drops`.

### Task 4: Drop aiming UI and parachute drawing

**Files:**
- Modify:
  - `src/ui/input.js`: for a `'drop'` aim, set `G.aim.line = nearestDrop(0, wx)` and `G.aim.x = G.LX[line]`.
  - `src/ui/hud.js`:
    - `#swBtn` shows a confirm state for `'drop'` aims, with reasons in the same pattern.
    - The Paris-only auto-clear is extended so it also cancels a `'drop'` aim when `swBlock(0)` is set.
  - `src/ui/draw/effects.js`: highlight the targeted trench while aiming, and outline every valid trench faintly.
  - `src/ui/draw/men.js`, or wherever infantry is drawn: draw a parachute canopy above a unit while `u.fall > 0`. Offset the unit up by `u.fall × k` and scale it slightly. Give the Thompson gunner a distinct weapon silhouette.
- Test: `tests/unit/ui.test.js`, `tests/unit/draw.test.js`, `tests/e2e/game.e2e.test.js` (if the e2e can pick the USA cheaply; otherwise ui tests only)

**Interfaces:**
- Consumes: `nearestDrop`, `validDrop`, `swBlock`, `swCost`, and `commands.startAiming` / `confirmAim` / `cancelAim`.
- [ ] **Step 1: Failing tests:**
  - ui (USA): press `#swBtn` and the aim kind is `'drop'`. Simulate a tap via `G.aim.line`, confirm, and supplies drop by 341. A gun aim then a drop aim replace each other.
  - draw: falling para units and a drop aim draw without throwing.
- [ ] **Step 2:** Run the tests. Expect FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `npm run check && npm run e2e`. Expect PASS.
- [ ] **Step 5:** Commit `feat: airborne drop aiming and parachutes`.

### Task 5: Bot, balance, docs

**Files:**
- Modify: `scripts/bot.mjs`, `src/data/drop.js` and `SPECIAL.tommy` (tunable numbers only), `README.md`, `docs/DESIGN.md`, `docs/STATS.md` (via `npm run stats`)
- **Bot:** when playing the USA, the drop is ready, and `dropTarget(0) >= 0`, buy and confirm a drop on that line. Do this only when supplies ≥ 2 × cost. Add `drops` and `foeDrops` to the JSON.
- [ ] **Step 1:** Run the baseline on `main` from a throwaway scratchpad `git worktree`: `us` vs every nation, and every nation vs `us`, on 'open', seeds 1–10.
- [ ] **Step 2:** Run the same matrix on the branch.
- [ ] **Step 3:** Tune toward the spec's targets.
  - Targets: every win-rate change within ±20 points. A lone drop against 6 or more settled defenders at fortification level 1 should usually fail. Write a scripted check for this and report it.
  - May change: `DROP_RANGE`, `DROP_FALL`, `AI_DROP_T`, and the Thompson's hp, dmg and cd.
  - Must not change: cost markup, cooldown or composition. Those are the user's. If balance can't be met without them, report it as a concern.
- [ ] **Step 4:** Docs, then checks.
  - In README "How to play", replace the Kettering Bugs mention with the drop.
  - Add a numbered DESIGN.md section.
  - Run `npm run stats`, `npm run check` and `npm run e2e`. Expect all to pass.
- [ ] **Step 5:** Commit `chore: tune airborne drop, docs`.
