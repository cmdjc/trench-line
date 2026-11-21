# Rail Through the Middle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the railway to the middle of the field, shift the middle emplacement slot beside it, add sandbag barriers that shield track from big-shell breaks, and draw trains top-down.

**Architecture:** `RAIL_Y` becomes `WH/2`. A small sim helper, `barrierAt(side, L)`, says whether a trench has a barrier. `breakAt` uses it to skip segments whose adjoining trench has a barrier near the shell's landing point. Drawing is updated in `src/ui/draw/rail.js`, with sandbag walls drawn using the helpers in `terrain.js`.

**Tech Stack:** Vanilla ES modules, canvas, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-21-rail-middle-design.md`

## Global Constraints

- `src/sim/**` and `src/data/**` stay browser-free. No new rng.
- `RAIL_Y = WH / 2`.
- Emplacement slots (`SLOTS`, `SLOTS5` in `src/data/units.js`):
  - Keep each array's length and increasing order.
  - Only the middle entry moves, and it applies to every map.
  - The middle entry must be at least 26 px (in y) from `RAIL_Y`, and at least 24 px from its neighbours.
  - Suggested values: `SLOTS[1] = 0.62`, `SLOTS5[2] = 0.6`.
- `BARRIER_R = 26` (px), exported from `src/data/rail.js`, tunable within 16–40.
- A barrier exists at trench L for side s when `1 <= segmentIndexFor(s, L) <= G.track[s].end`.
- A big shell whose centre x lies within `BARRIER_R` of a trench with a barrier for side s does not break side s's segments adjoining that trench. Open ground between trenches can still be broken.
- Trains and riders get no extra protection from the barrier.
- `npm run check` and `npm run e2e` pass at the end of every task.

## Review Focus

1. **Shell landing exactly at a trench with track.** No break. (Task 1 test `barrier holds`.)
2. **Shell landing mid-gap.** Breaks as before. (Task 1 test `gap breaks`.)
3. **Side 1.** The mirror works for the enemy's track and trenches. (Task 1 test `side 1`.)
4. **Slots.** Every slot sits at least 26 px from the rail, and the arrays keep their length and order. (Task 1 test `slots clear rail`.)
5. **Top-down train.** No profile elements remain, and it draws for both sides, damaged and undamaged, with riders. (Task 2 draw test.)

---

### Task 1: Rail in the middle, slots, barrier rule

**Files:**
- Modify: `src/data/rail.js` (`RAIL_Y`, `BARRIER_R`), `src/data/units.js` (the middle slot of `SLOTS` and `SLOTS5`), `src/sim/rail.js` (`barrierAt`, `breakAt`)
- Test: `tests/unit/data.test.js`, `tests/unit/rail.test.js`, and any tests pinned to slot positions

**Interfaces:**
- Produces:
  - `RAIL_Y = WH / 2`
  - `BARRIER_R`
  - `barrierAt(side, L) → boolean`, exported from `src/sim/rail.js`
- `breakAt(x, y, splash, shell)` behaves as before, except that for each side and segment k it skips k when the shell centre x is within `BARRIER_R` of the x of either end trench of segment k and that trench has a barrier for the side. The end trenches are `lineOfSegment(side, k-1)` and `lineOfSegment(side, k)`, and the HQ end never has a barrier.

- [ ] **Step 1: Failing tests**
  - `data.test.js`:
    - The `RAIL_Y` test now expects `WH / 2` and "in the middle".
    - A new test checks the slots: both arrays keep their length and increasing order, the middle slot is ≥ 26 px from `RAIL_Y` and ≥ 24 px from its neighbours, and everything lies within [22, 278].
  - `rail.test.js`:
    - `barrierAt` matches the track end for both sides.
    - `barrier holds`: a big shell centred on a trench with track doesn't break the adjoining segments.
    - `gap breaks`: a shell mid-gap breaks as before.
    - `side 1`: the mirror case for the enemy.
    - Existing break tests that land shells at a trench x may need to move the shell into the gap. Change their positions, not their assertions, and list each such change.
- [ ] **Step 2:** Run the tests. Expect FAIL.
- [ ] **Step 3:** Implement. Update any other test pinned to the old slot y, listing each one.
- [ ] **Step 4:** Run `npm run check` and `npm run e2e`. Expect PASS.
- [ ] **Step 5:** Commit `feat: rail through the middle, slot shift, sandbag shielding`.

### Task 2: Top-down trains, barrier and rail drawing

**Files:**
- Modify: `src/ui/draw/rail.js`, `src/ui/draw/terrain.js` (export the sandbag helper if needed), `src/ui/draw/index.js` (draw order)
- Test: `tests/unit/draw.test.js`

**Interfaces:**
- Consumes: `RAIL_Y`, `barrierAt`, `BARRIER_R`, `segmentSpan`, `G.track`, `G.trains`.
- Produces: a top-down `drawTrain`, barrier drawing in `drawTrack`, and the first segment starting at the HQ door.

- [ ] **Step 1: Failing draw tests.**
  - Each of these draws without throwing:
    - a damaged enemy train with riders
    - an undamaged own train
    - track with a break
    - barriers on both sides
  - Check, with a recording stub context if the existing draw tests have one, that no element is drawn above the train's body as a profile funnel: no draw call with a negative y offset beyond the train's half-width, apart from the health bar.
- [ ] **Step 2:** Run the tests. Expect FAIL.
- [ ] **Step 3:** Implement.
  - Train art as specified (the "Train art" section of the spec).
  - Sandbag walls on both sides of the rail at every trench with a barrier, using the existing sandbag helpers and palette.
  - The first segment starts at the HQ door, and the HQ is drawn over it. Check the draw order in `index.js`: the HQ is drawn before the track at the moment, so draw the rail start clipped to begin at the HQ's edge, using `G.LX[0] + 40` for side 0 and the mirror for side 1.
  - You can't view it, so say so in your report.
- [ ] **Step 4:** Run `npm run check` and `npm run e2e`. Expect PASS.
- [ ] **Step 5:** Commit `feat: top-down trains and sandbag barriers`.

### Task 3: Balance and docs

**Files:**
- Modify: `src/data/rail.js` (numbers only), `README.md` (if railways are mentioned), `docs/DESIGN.md` (a short subsection), `docs/STATS.md` (via `npm run stats`)

- [ ] **Step 1:** Baseline from `main` as it was before this branch. Use a throwaway scratchpad `git worktree` or `git archive main`. Run every nation vs `de`, plus `de` vs `gb`, on 'open', seeds 1–10. Also run gb v de and de v gb on 'march', seeds 1–6, `MAXS=1800`.
- [ ] **Step 2:** Run the same matrices on the branch.
- [ ] **Step 3:** If any 'open' win rate moved by more than 20 points, retune within the spec's limits and record every change. The Long March is accepted as is, but report it.
- [ ] **Step 4:** Docs and checks.
  - Add a DESIGN subsection describing the new rail position, the slot move, the barrier and top-down trains.
  - Run `npm run stats`, `npm run check` and `npm run e2e`.
- [ ] **Step 5:** Commit `chore: tune rail through the middle, docs`.
