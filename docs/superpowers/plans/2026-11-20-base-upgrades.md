# Base Upgrades Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** In-battle HQ upgrades (3 shared + 1 national per nation, 3 tiers each) bought with supplies, a Base research branch that raises starting tiers, an enemy that buys them too, and an HQ drawing that shows them.

**Architecture:** Upgrade definitions live in a new data table `src/data/base.js`. Per-side tier state lives in `G.base` and is changed only through `raise(side, id)` in a new sim module `src/sim/base.js`. One-off effects (HQ health, modifier multipliers) are applied when a tier is raised. Continuous effects (income, repair, free troops, spawn positions, superweapon tweaks) read the tiers through small helpers that existing code calls. The UI panel shows whenever your HQ (line 0) is selected, so tapping the HQ on the field, or the HQ cell in the trench strip, opens it. That gives a keyboard route for free.

**Tech Stack:** Vanilla ES modules, canvas, Vite, Vitest, jsdom e2e.

**Spec:** `docs/superpowers/specs/2026-11-20-base-upgrades-design.md`

## Global Constraints

- `src/sim/**` and `src/data/**` stay browser-free (the ESLint rule and `tests/unit/lint-domfree.test.js` enforce this).
- Determinism: same seed, same battle. **No new `rng` draws** in code paths that run when no upgrade is owned. The AI's upgrade buying uses a fixed schedule, not `rng`, so existing seeded tests keep their streams.
- The tech mask is append-only. The new nodes go **after** `titan`, in the order given in Task 1. That makes 25 nodes, within the `1 << i` limit of 31.
- Existing research nodes (`walls`, `aid`, `rail`) are unchanged and stack with base upgrades.
- Copy style: plain sentences ending in a period, like the existing toasts and tech text.
- Tier costs start at **300 / 550 / 900** supplies (Task 9 may retune them). Max tier 3. Research can raise a starting tier to 2 at most.
- `npm run check` and `npm run e2e` pass at the end of every task.

## Review Focus

1. **Buying with too few supplies, or at T3:** nothing is charged, nothing changes, the button is disabled. (Task 2 test `rejects`.)
2. **Free troops at full infantry cap** (Conscription Office, Voie Sacrée convoy): no spawn and no charge, so the cap is never exceeded. (Task 4 test `respects caps`.)
3. **Old save codes:** a pre-feature code still loads with the same tech, and a code with the new bits round-trips. (Task 1 tests.)
4. **Teleferica or tunnels when the selected line is the HQ or beyond range:** troops walk from the HQ as before. (Task 4 test `out of range walks`.)
5. **Krupp/Drydock bought before the superweapon unlocks:** no error, and the bonus applies on first use. (Task 5 test.)

---

### Task 1: Data table, research nodes, save codes

**Files:**
- Create: `src/data/base.js`
- Modify: `src/data/tech.js` (append 4 branches)
- Test: `tests/unit/data.test.js`, `tests/unit/meta.test.js`

**Interfaces:**
- Produces:
  - `BASE_COST = [300, 550, 900]`, the cost of tier 1/2/3.
  - `SHARED = ['walls', 'depot', 'hosp']`
  - `BASE[id]` for `walls | depot | hosp | gb | de | fr | us | ah | aq | it | ru` → `{ name: string, tiers: [string, string, string] }`, with the tier texts shown in the panel.
  - `baseIds(nation) → ['walls', 'depot', 'hosp', nation]`
  - Numeric effect constants, all exported from `src/data/base.js`:
    - `WALLS_HP = 500` per tier
    - `WALLS_REPAIR = 4` HQ hp/s at T3
    - `DEPOT_INC = 0.6` supplies/s per tier
    - `HOSP_HEAL = 0.8` hp/s per tier
    - `TUNNEL_T = 15` and `MINE_COST = 0.8` (gb T1)
    - `MINE_R = 100`, `MINE_TANK = 500`, `MINE_NEST = 600` (gb T2)
    - `PARIS_CD = 65` (de T1)
    - `PARIS_DMG = 900`, `PARIS_SPLASH = 110` (de T2)
    - `PARIS_GAP = 1.5` s between the two de T3 shells
    - `VOIE_SPEED = 1.2` (fr T1, infantry speed)
    - `VOIE_INC = 1` (fr T2)
    - `CONVOY_T = 45`, `CONVOY_N = 3` (fr T3)
    - `LIB_GROWTH = 0.3` (us T1, supplies/s gained per minute)
    - `LIB_DEPOT = 1.5` (us T2, depot yield multiplier)
    - `LIB_TANK = 0.85` (us T3)
    - `KUK_DMG = 1.15`, `KUK_HP = 1.15`, `KUK_CAP = 5` (ah)
    - `DOCK_CD = 100`, `DOCK_HP = 1.3`, `DOCK_DMG = 1.3`, `DOCK_SCALE = 1.15` (aq)
    - `TELE_RANGE = [0, 3, 6, Infinity]`, in trenches from your own HQ, by tier (it)
    - `CONSCRIPT = [null, { t: 20, n: 1 }, { t: 12, n: 1 }, { t: 12, n: 3 }]` (ru)
  - Tech ids, appended in this order: `bw1, bw2, bd1, bd2, bh1, bh2, bn1, bn2`. Branches: `HQ Walls` (bw), `Supply Depot` (bd), `Field Hospital` (bh), `National works` (bn). Costs: bw/bd/bh = 25 then 60; bn = 40 then 90. Text: "Your HQ starts each battle with HQ Walls at tier 1." etc. The bn text: "Your nation's base upgrade starts each battle at tier 1." / "…tier 2."

- [ ] **Step 1: Write failing tests**
  - In `data.test.js`, extend the `TECH_IDS()` expectation with `'bw1','bw2','bd1','bd2','bh1','bh2','bn1','bn2'` appended. Add a test that every nation key in `NAT` has a `BASE[nation]` with 3 tier strings, and that `baseIds('ru')` is `['walls','depot','hosp','ru']`.
  - In `meta.test.js`, add `round-trips the base branch bits` (`META.tech = { bw1:1, bw2:1, bn1:1 }` survives `readCode(makeCode())`). Add `old codes still load` (a fixed pre-feature code, `'TL1-5-3-0-0'` plus its checksum, still gives `{ marks:1, kit:1 }`). Add `prunes bw2 without bw1`.
- [ ] **Step 2:** `npx vitest run tests/unit/data.test.js tests/unit/meta.test.js`. Expect FAIL.
- [ ] **Step 3:** Create `src/data/base.js`, which writes the tier texts from the constants above. Append the four branches to `TECH`. `readCode` needs no change, because its in-branch prerequisite rule already covers bw2 → bw1.
- [ ] **Step 4:** Re-run. Expect PASS. Then run `npm run check`.
- [ ] **Step 5:** Commit `feat: base upgrade data and research branch`.

### Task 2: Tier state, raising and buying

**Files:**
- Create: `src/sim/base.js`
- Modify: `src/sim/state.js` (`G.base` init in `newGame`, after `applyTech()`), `src/sim/commands.js`
- Test: `tests/unit/base.test.js` (new)

**Interfaces:**
- Consumes: Task 1 exports.
- Produces:
  - `G.base: [{walls, depot, hosp, nat}, {…}]`, with integer tiers 0–3.
  - `tier(side, id) → number`. `id` may be a shared id or `'nat'`.
  - `raise(side, id) → boolean`. Applies the next tier's one-off effects and returns false at T3. It does not charge, and it emits `bus 'hud'`.
  - `nextCost(side, id) → number | null`. This is `BASE_COST[tier]`, or null at T3.
  - `commands.buyBase(id) → boolean`. Checks running, tier < 3 and supplies ≥ cost. It charges once, raises, and toasts "HQ Walls raised to tier 2." It never charges when it rejects.
  - In `newGame`, for side 0 only: raise each id up to its researched start tier (bw2 → 2, else bw1 → 1; bd, bh and bn map to depot, hosp and nat in the same way).

One-off effects that `raise` applies at the moment a tier is gained:
- walls: `bases[side].max += WALLS_HP` and `hp += WALLS_HP`.
- hosp: `G.M[side].heal += HOSP_HEAL`.
- us T1: player only, `G.M[0].growth += LIB_GROWTH`. The AI side is handled in Task 3.
- us T3: `G.M[side].cost[k] *= LIB_TANK` for each `k` in `TK`.
- ah T1: `G.M[side].dmg[k] *= KUK_DMG` for infantry keys (`ORDER` minus `TK`).
- ah T2: `G.M[side].hp *= KUK_HP`, and existing infantry of that side get `hp` and `max` scaled by the same factor.
- fr T1: `G.M[side].speed *= VOIE_SPEED`.

Every other effect is read live by later tasks.

- [ ] **Step 1: Write failing tests** in `base.test.js`, using `newGame('gb','de','open',7)`:
  - `buys and charges once`: with supplies 1000, `buyBase('walls')` returns true, supplies become 700, `tier(0,'walls')` is 1, and `bases[0].max` is `BASE_HP + 500`.
  - `rejects`: with supplies 299, it returns false and nothing changes. At T3, it returns false and supplies are unchanged.
  - `hospital stacks with aid`: with `META.tech.aid` set, after `buyBase('hosp')` the heal is `1 + 0.8`.
  - `research start tiers`: with `META.tech = { bw1:1, bw2:1, bn1:1 }`, `newGame` gives walls 2, nat 1, depot 0 for side 0, and all zeros for side 1.
  - `ah officer school`: T2 scales an existing rifle's `max` by 1.15.
  - Reset `META.tech` in `beforeEach`.
- [ ] **Step 2:** Run `npx vitest run tests/unit/base.test.js`. Expect FAIL.
- [ ] **Step 3:** Implement `src/sim/base.js` and the `commands.buyBase` / `newGame` wiring. Map the national id `'nat'` to `G.nation[side]` for its effects.
- [ ] **Step 4:** Run the test again. Expect PASS. Then run `npm run check`.
- [ ] **Step 5:** Commit `feat: base upgrade tiers and buying`.

### Task 3: Income, repair, caps and cost for both sides

**Files:**
- Modify: `src/sim/base.js`, `src/sim/state.js` (`incomeNow`), `src/sim/ai.js` (money formula and unit cost), `src/sim/geometry.js` (`full`), `src/sim/tick.js`, `src/ui/hud.js` (army text uses `infCap`)
- Test: `tests/unit/base.test.js`, `tests/unit/ai.test.js`

**Interfaces:**
- Produces:
  - `baseIncome(side) → number`. It sums:
    - `DEPOT_INC * tier(side,'depot')`
    - for fr at T2+: `VOIE_INC`
    - for us at T2+: `depots(side) * DEPOT_RATE * (LIB_DEPOT - 1)`
    - for the AI side only, us at T1+: `LIB_GROWTH * G.S.t / 60`. The player already gets this through `G.M[0].growth`.
  - `infCap(side) → NAT[nation].inf + (ah && nat ≥ 3 ? KUK_CAP : 0)`
  - `stepBase(dt)`, called from `tick` after `aiStep`. It repairs each HQ at T3 walls by `WALLS_REPAIR*dt`, capped at max, and not when hp ≤ 0. Task 4 adds free-troop timers here.
- `incomeNow()` adds `baseIncome(0)`. The `aiStep` money formula adds `baseIncome(1)`. `full()` uses `infCap(side)`. In `aiStep`, the unit cost becomes `Math.round(ut(1,k).cost * G.M[1].cost[k])` at both cost uses. This is identical while the multiplier is 1.

- [ ] **Step 1: Failing tests:**
  - `depot income`: after 2 tiers, `incomeNow()` rises by 1.2.
  - `enemy depot income`: set side 1 depot to tier 1 via `raise`, then `aiStep(0.1)` with `quiet()` adds `0.06` more than the existing formula.
  - `walls T3 repairs`: set HQ hp to 100, then `stepBase(1)` gives 104.
  - `ah T3 cap`: `infCap(0)` is 25 for ah.
  - `us T3 enemy tank cost`: the AI pays 85% (round) for a tank.
- [ ] **Step 2:** Run the tests. Expect FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `npm run check`. The existing seeded tests must stay green, because no rng was added.
- [ ] **Step 5:** Commit `feat: base upgrade income, repair and caps`.

### Task 4: Free troops and the movers (fr, ru, it, gb T3)

**Files:**
- Modify: `src/sim/base.js`, `src/sim/geometry.js` (`startX`)
- Test: `tests/unit/base.test.js`

**Interfaces:**
- Produces:
  - `startLineFor(side, type, L) → number | null`. This is the line a fresh unit appears at, or null to start from the HQ as before. `startX` calls it first, and when it returns non-null, uses `G.LX[line] - dir*14`. The rules:
    - **it**: if `tier ≥ 1`, the distance from your own HQ (`side ? G.HQI - L : L`) is ≤ `TELE_RANGE[tier]`, and the unit is infantry (or any unit at T3), return `L`.
    - **gb**: if nat is T3 and the unit is infantry, return `L`. The tunnel comes out at the line the troops are sent to, which is your front-most held line or behind it.
    - Never when `L` is your own HQ line.
  - `stepBase` timers, in `G.base[side].t` (seconds):
    - **ru**: every `CONSCRIPT[tier].t`, spawn `n` rifles (`spawn(side,'rifle', side ? G.ai.F : G.sel)`), skipping any that would exceed `full`.
    - **fr T3**: every `CONVOY_T`, spawn `CONVOY_N` rifles the same way.
    - Player side only: a toast on the first convoy, "A lorry convoy has brought fresh troops up the Voie Sacrée."

Spawning uses `rng` through `spawn`. That's allowed, because it happens only when an upgrade is owned.

- [ ] **Step 1: Failing tests:**
  - `conscripts trickle`: ru T1, then `stepBase(20)` gives exactly one more side-0 rifle.
  - `respects caps`: at full infantry, nothing spawns.
  - `teleferica`: it T1 and sel 3 means a bought rifle's start x is `G.LX[3]-14`.
  - `out of range walks`: sel 5 means the start x matches the old `startX`.
  - `tanks need T3`.
  - `gb T3 tunnels infantry to the selected line`.
- [ ] **Step 2:** Run the tests. Expect FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run the tests and `npm run check`. Expect PASS.
- [ ] **Step 5:** Commit `feat: free troops, teleferica and tunnels`.

### Task 5: Superweapon upgrades (gb T1–2, de, aq)

**Files:**
- Modify: `src/sim/superweapons.js`, `src/sim/commands.js`, `src/sim/ai.js` (SW cost)
- Test: `tests/unit/superweapons.test.js`

**Interfaces:**
- Produces:
  - `swCost(side) → number`. This is `SW[nation].cost`, times `MINE_COST` for gb at nat ≥ 1. `fireSuperweapon`, `confirmAim`, the HUD button text and the AI all use it in place of `d.cost`.
  - In `useSW`:
    - **gb** nat ≥ 1: tunnel time `TUNNEL_T`.
    - **de**: nat ≥ 1 sets cooldown `PARIS_CD`. nat ≥ 2 sets the shell `dmg PARIS_DMG` and `splash PARIS_SPLASH`. nat ≥ 3 pushes a second identical shell with `t: -PARIS_GAP`.
    - **aq**: nat ≥ 1 sets cooldown `DOCK_CD`. nat ≥ 2 multiplies the spawned Colossus `hp`/`max` by `DOCK_HP`. nat ≥ 3 sets `u.dmgMul = DOCK_DMG` and `u.scale = DOCK_SCALE`. Combat multiplies by `u.dmgMul || 1` where it computes the unit's damage, and drawing reads `u.scale` in Task 7.
  - In `detonate`, for gb with nat ≥ 2: radius `MINE_R`, tank damage `MINE_TANK`, nest damage `MINE_NEST`.
- [ ] **Step 1: Failing tests:**
  - de T3 fires two shells, 1.5 s apart.
  - de T1 cooldown is 65.
  - gb T1 tunnel is 15 s and costs 360.
  - aq T2 gives a Colossus with max hp 11700.
  - The bonus survives being bought before 4:00 (`G.S.t = 10`, buy, then set `t = 300` and fire).
- [ ] **Step 2:** Run the tests. Expect FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `npm run check`. Expect PASS.
- [ ] **Step 5:** Commit `feat: national superweapon upgrades`.

### Task 6: Enemy commander buys upgrades

**Files:**
- Modify: `src/sim/ai.js`, `src/sim/state.js` (`G.ai.baseT`)
- Test: `tests/unit/ai.test.js`

**Interfaces:**
- `G.ai.baseT` starts at `150`. In `aiStep`'s buy block, **before** any `rng` draw and only when `!ai.want`, run this check: if `G.S.t ≥ ai.baseT` and there is a next id with `ai.money ≥ nextCost(1,id) * 1.5`, pay and `raise(1,id)`. Then set `ai.baseT = G.S.t + 90`, toast "The enemy has raised its <name> to tier N.", and `return` from the buy block for this half-second.
- The next id is the first one in the fixed rotation `['walls','nat','depot','hosp']` whose tier is below the lowest tier across all four. That keeps upgrades level. It uses no rng.
- [ ] **Step 1: Failing tests:**
  - At t = 100, no purchase.
  - At t = 150 with money 1000, the AI buys walls T1, money drops by 300, and the toast fires.
  - The next purchase cannot happen before t = 240.
  - It rotates to nat next.
  - `rng` state is unchanged by a base purchase: compare `rng.float()` after the step against a reseeded control.
- [ ] **Step 2:** Run the tests. Expect FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `npm run check`. Existing AI seed tests must stay green. Expect PASS.
- [ ] **Step 5:** Commit `feat: enemy buys base upgrades`.

### Task 7: HQ panel UI and HQ drawing

**Files:**
- Modify: `index.html` (a `<div id="basePanel" hidden>` in the orders area), `src/ui/hud.js`, `src/ui/draw/terrain.js` (`drawBase`), `src/ui/draw/tanks.js` or the colossus draw (apply `u.scale`), `src/styles.css`
- Test: `tests/unit/ui.test.js`, `tests/unit/draw.test.js`, `tests/e2e/game.e2e.test.js`

**Interfaces:**
- Consumes: `tier`, `nextCost`, `baseIds`, `BASE`, `commands.buyBase`.
- **Panel:** `#basePanel` is visible when `G.sel === 0`. The existing tap-to-select on line 0 and the HQ cell in the trench strip both open it. It shows one row per `baseIds(nation)`: the name, "Tier N of 3", the next tier's text, and a `<button data-base="<id>">`. The button reads "Upgrade: <cost>", or "Fully upgraded" when disabled. Rows are rebuilt in `refresh()`. Clicks go to `commands.buyBase(id === nation ? 'nat' : id)`. Plain buttons give the Tab and Enter route.
- **Drawing:** `drawBase(s)` adds these per tier of `G.base[s]`:
  - walls: extra sandbag arcs, plus a concrete band at T3.
  - depot: 1–3 crate stacks.
  - hosp: 1–3 tents, with a red cross on the first.
  - nat: a small building whose size grows with tier. The look per nation is the implementer's choice, drawn with the existing helpers.
  - Colossus draw scales by `u.scale || 1`.
- [ ] **Step 1: Failing tests:**
  - `ui.test.js`: selecting line 0 un-hides `#basePanel` with 4 buttons. Clicking walls with enough supplies raises its tier and updates the text. Selecting line 1 hides the panel.
  - `draw.test.js`: `drawBase` runs without throwing for all tiers 0–3 on both sides for every nation, using the no-op context.
  - e2e: after the buying section, select the HQ cell, click the walls upgrade, and assert the tier text.
- [ ] **Step 2:** Run the tests. Expect FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `npm run check && npm run e2e`, then `npm run dev` and look at it in a browser. Expect PASS.
- [ ] **Step 5:** Commit `feat: HQ upgrade panel and HQ art`.

### Task 8: Bot, balance and docs

**Files:**
- Modify: `scripts/bot.mjs`, `src/data/base.js` (retuned numbers only), `README.md` (one paragraph under How to play), `docs/DESIGN.md` (a new numbered section), `docs/STATS.md` (via `npm run stats`, if it lists tech)

**Interfaces:**
- Bot: when supplies are ≥ 2× the next base cost, buy the cheapest next tier, rotating the same way as the AI.
- [ ] **Step 1:** Record a baseline. On `main`, run `node scripts/bot.mjs <me> <foe> open <seed> --json` for each nation against `de`, with seeds 1–5, and note the win rate and mean time.
- [ ] **Step 2:** Run the same matrix on this branch.
- [ ] **Step 3:** Retune `BASE_COST` and the effect constants. The target is no nation's win rate moving more than about ±20 points, and no upgrade being an always-buy.
- [ ] **Step 4:** Run `npm run stats`, `npm run check` and `npm run e2e`. Expect PASS.
- [ ] **Step 5:** Commit `chore: tune base upgrades, docs`.
