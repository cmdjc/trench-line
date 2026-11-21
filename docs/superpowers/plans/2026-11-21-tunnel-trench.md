# Tunnel Trench Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two tunnel trenches to the Long March, at trench 11 and trench 35. Whoever holds one sends its reinforcements through after an 8 s delay, and they come out at that trench.

**Architecture:**
- `MAPS.march.tunnels: true` marks the map. `tunnelLines()` works out the two lines, `round(NT/4)` and `HQI - round(NT/4)`.
- At spawn, a unit picks the fastest route. If the tunnel wins, the unit goes into `u.tunnel = { t, exit }`: it is hidden and inert until `t` reaches 0, then it is placed at the exit trench.
- Tunnel logic lives in a new browser-free module, `src/sim/tunnel.js`.

**Tech Stack:** Vanilla ES modules, canvas, Vite, Vitest, jsdom e2e.

**Spec:** `docs/superpowers/specs/2026-11-21-tunnel-trench-design.md`

## Global Constraints

- `src/sim/**` and `src/data/**` stay browser-free.
- Only the Long March changes. Other maps stay byte-identical, with no new rng draws anywhere.
- `TUNNEL_T = 8` s.
- Tunnel trenches are at `round(NT/4)` from each HQ. Nobody holds them at the start. They are otherwise normal trenches.
- A tunnel works for whichever side currently holds that trench (`G.owner[L] === side`). It serves reinforcements whose ordered line is at or beyond the tunnel trench, toward the foe.
- **Route choice:** each reinforcement takes the fastest of three routes: walking from the HQ, the train (`rideBeats` in src/sim/rail.js), or the tunnel (`TUNNEL_T` plus walking from the exit). `startLineFor` direct movers, such as Teleferica and gb T3 tunnelling, take priority.
- **Units in the tunnel:**
  - They are hidden. They don't move, fire or get targeted, and they are excluded from `count`, `countAt`, `walkFront` and ownership.
  - They do count toward the infantry cap, as already-bought units.
  - If the exit trench is lost while they are inside, they come out at their own HQ instead.
- `npm run check` and `npm run e2e` pass at the end of every task.

## Review Focus

1. **Exit trench lost mid-tunnel.** Units come out at their HQ. (Task 1 test `exit lost`.)
2. **Enemy holds your tunnel trench.** Enemy reinforcements come out there, and yours don't. (Task 1 test `captured`.)
3. **Ordered line behind the tunnel trench.** No tunnel use. (Task 1 test `behind`.)
4. **Infantry cap.** Units in the tunnel count toward the infantry cap, so buying can't exceed it. (Task 1 test `cap`.)
5. **Other maps.** No tunnel logic runs, and seeded tests are unchanged.

---

### Task 1: Tunnel sim

**Files:**
- Modify: `src/data/maps.js` (`march.tunnels: true`), `src/sim/geometry.js` (route choice in `spawn`), `src/sim/combat.js` (skip `u.tunnel` units everywhere riders are skipped), `src/sim/tick.js` (`stepTunnels`)
- Create: `src/sim/tunnel.js`, `src/data/tunnel.js` (`TUNNEL_T`)
- Test: `tests/unit/tunnel.test.js`

**Interfaces:**
- `tunnelLines() → number[]`: `[]` unless `MAPS[G.MAP].tunnels`.
- `tunnelFor(side, L) → number | -1`: the tunnel trench this side holds that serves ordered line L. If several serve L, pick the one nearest L.
- `tunnelBeats(u) → boolean`: compares the time to reach the ordered line by tunnel with the best of walking and train.
- `enterTunnel(u, exit)`: sets `u.tunnel = {t: TUNNEL_T, exit}` and parks `u.x` at its HQ x.
- `stepTunnels(dt)`: counts each timer down. On exit, places the unit at `G.LX[exit] - dir*14`, unsettled, walking to its line. If `G.owner[exit] !== side`, the unit comes out at the HQ instead.
- Every skip list that excludes `u.riding` also excludes `u.tunnel`. Reuse one helper, `hidden(u) = u.riding || u.tunnel`.

- [ ] **Step 1: Failing tests:**
  - On 'march' the tunnel lines are `[11, 35]`. On 'open' the list is empty.
  - While the player holds 11 and sends troops to line 15, the unit enters the tunnel, is hidden for 8 s, then comes out at trench 11.
  - `behind`: ordering line 8 doesn't use the tunnel.
  - `captured`: with the enemy holding 11, enemy reinforcements ordered to line 10 or lower (toward the player) come out at 11.
  - `exit lost`: if the exit is lost mid-tunnel, the unit comes out at its HQ.
  - `cap`: units in the tunnel count toward the infantry cap.
  - Units in the tunnel are untargetable and excluded from `walkFront`.
  - When the train is faster, the unit rides instead.
  - With no seeded change, the existing tests stay green.
- [ ] **Step 2:** Run `npx vitest run tests/unit/tunnel.test.js`. Expect FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `npm run check`. Expect PASS.
- [ ] **Step 5:** Commit `feat: Long March tunnel trenches`.

### Task 2: Tunnel visuals, blurb, balance, docs

**Files:**
- Modify:
  - `src/ui/draw/terrain.js`: a tunnel entrance at each tunnel trench, plus a faint marker for units in transit at their exit, if cheap.
  - `src/ui/hud.js`: a glyph on tunnel trench cells.
  - `src/data/maps.js`: the march blurb.
  - `docs/DESIGN.md`, `README.md`, `docs/STATS.md` (regenerate with `npm run stats`).
  - `src/data/tunnel.js`: tune `TUNNEL_T` only.
- Test: `tests/unit/draw.test.js` (the tunnel draws without throwing), `tests/unit/ui.test.js` (the glyph shows on 'march' only)

- [ ] **Step 1:** Write failing ui and draw tests. Run them. Expect FAIL.
- [ ] **Step 2:** Implement the visuals and the blurb.
- [ ] **Step 3: Balance.**
  - Run gb v de and de v gb on 'march', seeds 1–6, `MAXS=1800`.
  - Compare against `main` (4 of 12 wins for gb v de, timeouts) and against the previous march numbers in DESIGN §11.
  - Tune `TUNNEL_T` within 4–15 s until fewer than 2 of 12 battles time out and the gb v de win rate is near 4 of 6.
  - Confirm 'open', 'river' and 'plain' are byte-identical by running `node scripts/bot.mjs gb de open 3 --json` and comparing it with the same run on main.
- [ ] **Step 4:** Update DESIGN (a new section) and README. Run `npm run stats`, `npm run check` and `npm run e2e`. Expect PASS.
- [ ] **Step 5:** Commit `feat: tunnel trench visuals, tune, docs`.
