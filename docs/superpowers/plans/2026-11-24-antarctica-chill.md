# Antarctica Chill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Antarctica's tank-cannon shells chill every enemy unit they hit (0.6× walking speed for 4 s, refreshed, never stacked), and Antarctica's three biggest tank classes are cut back from their current extremes.

**Architecture:**
- **Timer:** a per-unit field `u.chilled` (seconds left) that copies the paratrooper `u.scramble` timer. It is decremented at the top of `stepUnits`' per-unit loop and read once, at the walking-speed line, as an extra `CHILL_MULT` factor next to `wireSlow(u)`.
- **Hook:** one extra statement in the normal (non-`huge`) branch of the shell-landing loop in `combat.js`. Every `G.units` entry that the loop already passes to `hurt()` gets `e.chilled = CHILL_DUR` when `G.nation[s.side] === 'aq' && s.type === 'tank'`. The Iron Penguin (`fireArmor` in `rail.js`) and the Southern Colossus (`SPECIAL.colossus`, built with `tkv`) already push shells tagged like this, so they get the effect with no change to their own code. Task 1 proves this with tests.
- **Data:** `CHILL_MULT`/`CHILL_DUR` sit next to `TKB` in `src/data/units.js`. The `AQ_TANKS` rows `tkM`, `tkH` and `tkS` get new numbers, and the `aq` blurb in `src/data/nations.js` is rewritten.

**Tech Stack:** Vanilla ES modules, canvas, Vite, Vitest (+ jsdom), jsdom e2e.

**Spec:** `docs/superpowers/specs/2026-11-24-antarctica-chill-design.md`

## Global Constraints

- `src/sim/**` and `src/data/**` stay browser-free.
- **Determinism: no new rng draws anywhere.** Chill is an unconditional side effect of a hit the splash loop already resolves without dice. It is never a chance roll. Battles with no Antarctica side must replay byte-identically: every existing seeded test stays green unchanged, and in Task 3 the non-`aq` control rows of the bot matrix must match the baseline JSON exactly.
- **Cannon shell only.** Chill is set only in the shell-landing loop. The `T.mg` sidearm block, the instant-hit branch (`hurt(best, dmg, T.atk || u.type, u)`, which is how Ross/`tkL` fires, since `mgOnly` gives it `atk: 'mg', shell: 0`), crush damage, mines, HQ guns and `fireArmor`'s machine guns never set it.
- **Units only, never trains.** The hook sits in the `for (const e of G.units)` line of the splash loop and nowhere else. The `G.trains` line beside it (`hurtTrain`) is not touched. No train object ever gets a `chilled` field.
- **Refresh, never stack.** A hit always assigns `e.chilled = CHILL_DUR`. It never adds to it. The speed factor is the fixed `CHILL_MULT` whenever `u.chilled > 0`, never compounded per hit.
- **Applies to armour exactly as to infantry.** Unlike `wireSlow`, there is no `T.armor` exemption. The factor multiplies the whole `sp` expression, including the `T.armor ? 1 : m.speed` term.
- **Chill constants** (spec starting point; tune only in Task 3): `CHILL_MULT = 0.6`, `CHILL_DUR = 4` (seconds), exported from `src/data/units.js`.
- **Timer semantics (mirrors `u.scramble`):**
  - Set: `e.chilled = CHILL_DUR` in the splash loop, after the `hurt()` call on the same unit.
  - Decrement: `if (u.chilled > 0) u.chilled -= dt;` placed directly after the two scramble lines (lines 72–73), before any movement. It does not depend on `falling`. Like scramble, it is skipped while the unit is `hidden()` (riding or in a tunnel), and it stops at the first value ≤ 0.
  - Multiplier: `sp = T.speed * (T.armor ? 1 : m.speed) * dt * wireSlow(u) * (u.chilled > 0 ? CHILL_MULT : 1)`. Wire and chill stack multiplicatively on infantry (0.3 × 0.6). They are different effects, so this is intended.
  - A unit that has never been chilled has `u.chilled === undefined`. `spawn` is not changed.
- **Hook scope:** the hook goes only in the normal branch (the `else` under `if (s.base && !s.noBase)`). The `s.huge` branch is not touched, because the only `huge: true` shell in the codebase is the Paris Gun's (`src/sim/superweapons.js:61`, `type: 'barrage'`), which can never match `type === 'tank'`. Base shells (`s.base`) hurt no units, so they chill nothing.
- **Detuned stats** (spec table, exact starting values; tune only in Task 3). Only the five listed fields change on each row. `cd`, `range`, `w`, `big`, `mg`, `park`, `len`, `bar`, `role` and the draw parts stay as they are:

  | Key | Name | cost | hp | dmg | splash | speed |
  |---|---|---|---|---|---|---|
  | `tkM` | Vinson | 760 → **650** | 1800 → **1400** | 48 → **40** | 26 → **24** | 17 → **18** |
  | `tkH` | Erebus | 1150 → **850** | 3100 → **2100** | 70 → **52** | 34 → **27** | 14 → **16** |
  | `tkS` | Pole | 1950 → **1650** | 5600 → **4900** | 96 → **90** | 42 → **36** | 11 → **13** |

- **Untouchable:** the `AQ_TANKS.tkL` (Ross) and `AQ_TANKS.tank` (Weddell) rows stay byte-identical. `SPECIAL.colossus` in `src/data/units.js`, `ARMOR_TRAINS.aq` in `src/data/rail.js`, `src/sim/rail.js` and `src/sim/superweapons.js` get no edits at all. `git diff main -- src/sim/rail.js src/data/rail.js src/sim/superweapons.js src/data/superweapons.js` must be empty at the end of every task.
- **Blurb copy** (exact; replaces the whole `aq` `blurb` string):
  `Defence: bunkers, two to a trench, that shelter six troops each. The bunker must be destroyed before they can be hurt. Only 20 fragile infantry, but 20 places for big snow-white tanks whose shells chill whatever they hit, infantry and tanks alike, slowing it down for a few seconds. Starts poor, but income grows faster than anyone’s.`
- No visual "frost" treatment is in scope. The spec leaves it optional, and this plan does not build it.
- `npm run check` and `npm run e2e` pass at the end of every task.

## Review Focus

1. **Armour gets chilled like infantry.** An enemy tank caught in an Antarctica cannon blast gets `chilled === CHILL_DUR`, and its next step covers `CHILL_MULT` of its normal distance, with no `T.armor` exemption anywhere. (Task 1 tests `chills armour and infantry alike`, `chilled units walk at CHILL_MULT speed`.)
2. **Instant-hit fire never chills.** A Weddell's `mg` sidearm, a Ross's guns (`mgOnly`, so instant hits with `atk: 'mg'`) and the Iron Penguin's machine guns damage their target but leave `chilled` undefined. (Task 1 tests `instant-hit fire never chills` in `combat-step.test.js` and `iron penguin machine guns never chill` in `rail.test.js`.)
3. **Refresh, not stack.** A second hit at `chilled = 1` resets it to exactly `CHILL_DUR`. Two shells landing on the same unit in one frame also leave exactly `CHILL_DUR`, and the speed factor is still `CHILL_MULT`, not its square. (Task 1 test `a repeat hit refreshes, never stacks`.)
4. **Free inheritance, proven by real fire.** A real `fireArmor` shot from an `aq` Iron Penguin, and a real cannon shot from a spawned Southern Colossus, chill the unit they hit, with no edits to `rail.js`, `superweapons.js` or `SPECIAL.colossus`. (Task 1 tests `iron penguin shells chill` in `rail.test.js` and `southern colossus shells chill` in `superweapons.test.js`, plus the empty-diff check in Step 6.)
5. **No new rng.** Landing an `aq` tank shell draws exactly as many rng values as landing the same shell from `gb`. This uses the reseed-and-compare pattern from `rail.test.js` `no rng without armour`. Non-`aq` bot battles are byte-identical to baseline. (Task 1 test `chill draws no rng`; Task 3 control rows.)

---

### Task 1: Chill mechanic — timer, speed factor, splash hook, and inheritance proofs

**Files:**
- Modify: `src/data/units.js` (add and export `CHILL_MULT`, `CHILL_DUR` directly under `TKB`, with a one-line comment)
- Modify: `src/sim/combat.js` (import both from `../data/units.js` on the existing line-7 import; add the decrement after lines 72–73; extend the `sp` line 115; add the hook in the line-227 unit loop)
- Test: `tests/unit/combat-step.test.js` (new `describe('antarctica chill')`)
- Test: `tests/unit/rail.test.js` (new `describe('armoured train: antarctica chill')`)
- Test: `tests/unit/superweapons.test.js` (one new `it`)
- Test: `tests/unit/data.test.js` (one constants pin)

**Interfaces:**
- Produces: `export const CHILL_MULT = 0.6, CHILL_DUR = 4;` in `src/data/units.js`, and the unit field `u.chilled` (number of seconds, or `undefined`) with the semantics in Global Constraints. Task 3 tunes these two constants.
- Hook, in the normal-branch unit loop. The existing `hurt(e, s.dmg, s.type, null, s.cov, true)` is followed, inside the same `if` body, by `if (chill) e.chilled = CHILL_DUR;`, where `const chill = G.nation[s.side] === 'aq' && s.type === 'tank';` is computed once per shell just before the loop. The `G.trains` line is untouched.

- [ ] **Step 1: Write the failing tests.**

  `combat-step.test.js`, `describe('antarctica chill')`. `beforeEach`: `newGame('aq', 'de', 'open', 1)`, clear `G.units`/`G.shells`, `G.bases[0].cd = G.bases[1].cd = 999`. Helper `land(side, type, e, extra = {})` pushes `{ x0: 0, y0: 0, x1: e.x, y1: e.y, t: 1, dur: 1, side, type, dmg: 1, splash: 40, ...extra }`. Targets are `mute(pin(spawn(1, …, 5, true)))`.
  - `chills armour and infantry alike`: a de `rifle` and a de `tank` (armour) at the same spot, then `land(0, 'tank', rifle)` and `stepUnits(0.01)`. Both have `chilled === CHILL_DUR` and both lost hp. A third enemy 300 px away has `chilled` undefined. A friendly `spawn(0, 'rifle', 5, true)` placed inside the blast has `chilled` undefined.
  - `only aq tank shells chill`: (a) in this aq game, `land(0, 'mortar', e)` leaves `chilled` undefined. (b) `newGame('gb', 'de', …)`, then `land(0, 'tank', e)` leaves it undefined. (c) Back in aq, `land(0, 'tank', e, { base: true })` leaves it undefined.
  - `a repeat hit refreshes, never stacks`: set `e.chilled = 1`, then `land(0, 'tank', e)` and `stepUnits(0.01)`. `e.chilled === CHILL_DUR`. Then push two such shells at once and step: `e.chilled === CHILL_DUR` still.
  - `chilled units walk at CHILL_MULT speed`: for each of a de `rifle` and a de `tank`, use an unpinned muted unit with `tx = x - 60`, `ly = y`, `settled = false`, and no other units on the field (60 px is enough for two 0.1 s steps and keeps clear of any hedgehog stop). `x0 = e.x; stepUnits(0.1); d1 = x0 - e.x`. Then `e.chilled = CHILL_DUR; x0 = e.x; stepUnits(0.1); d2 = x0 - e.x`. Assert `d2 / d1` `toBeCloseTo(CHILL_MULT, 6)` and `e.chilled` `toBeCloseTo(CHILL_DUR - 0.1, 9)`.
  - `chill wears off after CHILL_DUR`: set `e.chilled = 0.05`, then one `stepUnits(0.1)`. `e.chilled <= 0`, and that frame's distance equals the unchilled `d1` (measured on the same unit as in the previous test). One more step leaves `e.chilled` unchanged (no further decrement once it is ≤ 0).
  - `instant-hit fire never chills`: (a) an aq Weddell `spawn(0, 'tank', 3, true)` with `u.cd = 99`, and a foe at `u.x + 100` with `hp = max = 1e6`. Run 200 × `stepUnits(0.05)`. The foe's hp dropped (`T.mg` sidearm), `G.shells.length === 0` throughout, and `foe.chilled` is undefined. (b) An aq Ross `spawn(0, 'tkL', 3, true)` with `u.cd = 0.001`, same foe. Run 100 frames. The foe's hp dropped, no shell was ever pushed, and `foe.chilled` is undefined.
  - `chill draws no rng`: `function once(nat)` runs `newGame(nat, 'de', 'open', 1)`, clears units and shells, mutes the bases, places one muted pinned de rifle `e`, calls `land(0, 'tank', e)`, `rng.reseed(5)`, `stepUnits(0.01)`, and returns `{ v: rng.float(), chilled: e.chilled }`. `once('aq').v === once('gb').v`, `once('aq').chilled === CHILL_DUR`, and `once('gb').chilled` is undefined.

  `rail.test.js`, `describe('armoured train: antarctica chill')`. `beforeEach`: `newGame('aq', 'de', 'open', 7); G.S.supplies = 2000;`, then the existing `track3()` shape, `C.buyArmorCmd()`, `t = G.trains[0]`, `t.x = G.LX[3]`. Reuse the `foe(dx)` shape from `armoured train: weapons`.
  - `iron penguin shells chill`: `foe(200)`, then `stepTrains(0.05)`. `G.shells` contains `objectContaining({ side: 0, type: 'tank' })`. Then `step(0.3)`: the foe's hp is below max and `foe.chilled === CHILL_DUR`.
  - `iron penguin machine guns never chill`: `foe(100)` with `hp = max = 1e6` and `t.cd = 99`. Run 200 × `stepTrains(0.05)`. `t.mgShots > 0`, the foe's hp dropped, and `foe.chilled` is undefined.
  - `trains are never chilled`: push an enemy transport `{ side: 1, kind: 'transport', dir: -1, x: t.x + 150, hp: 300, max: 300, riders: [], T: { ...TRAINS.de, speed: 0 } }`, then a shell `{ x0: 0, y0: 0, x1: tr.x, y1: RAIL_Y, t: 1, dur: 1, side: 0, type: 'tank', dmg: 10, splash: 30 }`, then `step(0.01)`. `tr.hp < 300` and `'chilled' in tr === false`.

  `superweapons.test.js`:
  - `southern colossus shells chill`: `game('aq', 'gb')`, clear `G.units`/`G.shells`, `G.bases[0].cd = G.bases[1].cd = 999`. `c = spawn(0, 'colossus', 3, true); c.cd = 0.001`. A foe `spawn(1, 'rifle', 7, true)` at `c.x + 250`, `y = c.y`, pinned, muted, `hp = max = 1e6`. Run `stepUnits(0.05)` up to 20 times, stopping once `foe.chilled > 0`. Some shell seen during the loop matched `{ side: 0, type: 'tank' }` (record `G.shells` after each step), and the loop ends with `foe.chilled === CHILL_DUR`.

  `data.test.js`:
  - `chill constants`: `[CHILL_MULT, CHILL_DUR]` equals `[0.6, 4]`.

- [ ] **Step 2:** Run `npx vitest run tests/unit/combat-step.test.js tests/unit/rail.test.js tests/unit/superweapons.test.js tests/unit/data.test.js`. Expect FAIL: the imports of `CHILL_MULT`/`CHILL_DUR` are missing, and the chill assertions fail.
- [ ] **Step 3:** Add the constants, the decrement, the `sp` factor and the hook exactly as Interfaces and Global Constraints specify.
- [ ] **Step 4:** Run the same command. Expect PASS.
- [ ] **Step 5:** Run `npm run check`. Expect PASS. All pre-existing seeded tests (`combat-step`, `tick`, `ai`, `rail`, `drop`, `smoke`) stay green with no edits.
- [ ] **Step 6:** Run `git diff main -- src/sim/rail.js src/data/rail.js src/sim/superweapons.js src/data/superweapons.js`. Expect empty output. Run `git diff main -- src/data/units.js`. Expect only the two-constant addition. Run `grep -n "huge: true" src`. Expect exactly one hit, `superweapons.js` with `type: 'barrage'`, which confirms the `huge` branch never needs the hook.
- [ ] **Step 7:** Commit `feat: antarctica tank shells chill what they hit`.

### Task 2: Detune Vinson, Erebus and Pole; new nation blurb

**Files:**
- Modify: `src/data/units.js` (the `AQ_TANKS.tkM`/`tkH`/`tkS` stat objects only; change the line-211 comment `built to enormous sizes` to `big, and whose shells chill what they hit`)
- Modify: `src/data/nations.js` (the `aq` `blurb` only)
- Test: `tests/unit/data.test.js`

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces: the stat values in the Global Constraints table, as read through `STATS.aq.tkM/tkH/tkS`. Task 3 may move them.

- [ ] **Step 1: Write the failing tests** in `data.test.js`:
  - `antarctica heavy tanks are detuned`: for each row of the Global Constraints table, `STATS.aq[k]` matches `objectContaining({ cost, hp, dmg, splash, speed })` with the new values. Also pin the unchanged fields: `tkM` `{ cd: 1.4, range: 260, w: 3.5 }`, `tkH` `{ cd: 1.8, range: 280, w: 5, big: true }`, `tkS` `{ cd: 2.3, range: 360, w: 8, big: true }`.
  - `ross and weddell are untouched`: `STATS.aq.tkL` matches `objectContaining({ cost: 160, hp: 380, dmg: 6, cd: 0.17, range: 270, speed: 30, w: 1, atk: 'mg', shell: 0, splash: 0 })`. `STATS.aq.tank` matches `objectContaining({ cost: 460, hp: 950, dmg: 36, cd: 1.5, range: 240, splash: 22, speed: 20, w: 2, atk: 'tank', shell: 0.25, mg: { dmg: 5, cd: 0.22, range: 210, acc: 0.5 } })`.
  - `southern colossus is untouched`: `SPECIAL.colossus` matches `objectContaining({ cost: 2500, hp: 9000, dmg: 120, cd: 2.0, range: 400, splash: 50, speed: 9, atk: 'tank', shell: 0.25 })`.
  - `antarctica tank line keeps its unlock order`: `tkList('aq')` equals `['tkL', 'tank', 'tkM', 'tkH', 'tkS']`.
  - `the pole stays the toughest tank in the game`: for every nation key in `NATS`, compute the max `hp` across that nation's own tank-class entries (`tkL`, `tank`, `tkM`, `tkH`, `tkS` — whichever exist on `STATS[nation]`, after national overrides). `STATS.aq.tkS.hp` (4900) must be strictly greater than every other nation's maximum, including Germany's Ratte (`STATS.de.tkS.hp`, 4500). This is the real, pinned version of the spec's "Pole stays the toughest tank in the game" claim — not a prose assertion.
  - `antarctica blurb describes the chill`: `NAT.aq.blurb` equals the exact Global Constraints string.
- [ ] **Step 2:** Run `npx vitest run tests/unit/data.test.js`. Expect FAIL on the detune, blurb and toughest-tank tests. The untouched, colossus and order tests already pass, because they guard against regressions.
- [ ] **Step 3:** Edit the three `AQ_TANKS` rows, the comment and the blurb. Touch no other field.
- [ ] **Step 4:** Run `npm run check`. Expect PASS. Run `git diff main -- src/data/units.js`. Inside `AQ_TANKS`, the diff shows only the `tkM`/`tkH`/`tkS` stat lines, plus Task 1's constants and the comment.
- [ ] **Step 5:** Commit `feat: detune antarctica's three heaviest tanks; chill blurb`.

### Task 3: Bot balance pass, docs

**Files:**
- Modify (numbers only, if tuning needs them): `src/data/units.js` (`CHILL_MULT`, `CHILL_DUR`, and the five detuned fields on `tkM`/`tkH`/`tkS`), with the matching pins in `tests/unit/data.test.js` updated to the final numbers
- Modify: `docs/DESIGN.md`, `README.md`, `docs/STATS.md` (regenerated)

**Interfaces:**
- Consumes: Tasks 1 and 2.
- Bot coverage note: the bot as player only ever buys the base `tank` from its `pref` list, so as `aq` it fields Weddells (which chill) and never Vinson, Erebus or Pole. The detune shows up only on the enemy side, where the AI picks from every class it can afford (`aiCost(k) <= ai.money * 2 + 60`). The matrix therefore needs both directions.

- [ ] **Step 1: Baseline** on `main`, from a throwaway `git worktree` in the scratchpad (as in the armoured-train plan's Task 6). Use `MAXS=900 node scripts/bot.mjs <me> <foe> <map> <seed> --json` for:
  - `aq` vs each of `gb de fr ru us ah it`, and each of those vs `aq`, on 'open' with seeds 1–10.
  - `aq` vs `de` and `de` vs `aq` on 'plain' and 'march', seeds 1–3.
  - Control: `de` vs `gb` and `gb` vs `de` on 'open', seeds 1–10.

  Save the JSON lines in the scratchpad.
- [ ] **Step 2:** Run the same matrix on the branch.
- [ ] **Step 3: Check and tune toward these targets:**
  - The control rows are byte-identical to baseline (`diff` of the JSON lines is empty). If they are not, a non-`aq` path changed: stop and fix it. Do not tune around it.
  - Every `aq` matchup's win-rate change (baseline → branch) is within ±20 points.
  - Report per matchup, the same way the armoured-train table did: win rate, mean `time`, `sel`, `losses`. For X-vs-`aq` rows, also report whether the enemy fielded Pole or Erebus at all (a one-off `LOG`-style count is enough, and must not be committed).
  - If a row is out of band, adjust in this order: `CHILL_MULT`/`CHILL_DUR` first (range 0.5–0.75 and 3–5 s), then the detuned stats (keep `tkList('aq')` order, and keep each stat between its new target and its old value). Re-run only the affected rows, and finish with one full re-run.
- [ ] **Step 4: Docs.**
  - DESIGN.md §6: replace "at humongous size" with wording about big tanks whose shells chill. Add a bullet: "**Chill**: Antarctica tank cannon shells (including the Iron Penguin's and the Southern Colossus's) set every enemy unit they hit to `CHILL_MULT` walking speed for `CHILL_DUR` s, armour included. A repeat hit refreshes the timer and never stacks. Machine guns never chill, and trains are never chilled." Use the final numbers.
  - Add a new `## 15. Antarctica chill` section, after §14, in the §12–§14 style: the mechanic, the detune table (old → final), and the balance table from Step 3.
  - DESIGN.md line 25 (the tank-name table) is unchanged.
  - README line 11: change "Antarctica's absurd Southern Colossus" to "Antarctica's chilling tank shells and absurd Southern Colossus".
  - Run `npm run stats` (this regenerates `docs/STATS.md`), then `npm run check` and `npm run e2e`. Expect PASS.
- [ ] **Step 5:** Commit `chore: tune antarctica chill, docs`.

---

## Self-review notes

- **Spec coverage:**
  - The debuff: Task 1.
  - The hook site and condition: Task 1.
  - Refresh, not stack: Task 1 test.
  - Armour included: Task 1 test.
  - Mg sidearm excluded: Task 1 tests, in both stepUnits and `fireArmor`.
  - Trains excluded: Task 1 test.
  - Iron Penguin and Colossus inheritance: Task 1 tests, plus the empty-diff check.
  - Detune table: Task 2.
  - Ross and Weddell unchanged: Task 2 test.
  - Blurb: Task 2.
  - Determinism: Task 1 test, plus the Task 3 control rows.
  - Bot tuning: Task 3.
- **Pole stays the toughest tank in the game:** the spec's target numbers were corrected before implementation (Pole now targets 4900 hp, above every other nation's heaviest tank, including Germany's Ratte at 4500 hp). Task 2 adds a test that reads every nation's heaviest tank class and asserts Pole's `hp` is the maximum — a real, pinned check, not a prose claim.
