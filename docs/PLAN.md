# Trench Line: proper project — implementation plan

> **For agentic workers:** This plan is executed inline (executing-plans). Tasks use `- [ ]` checkboxes and are updated as they complete. Commit after every task.

**Goal:** Turn the single-file prototype `trench-line.html` (2,276 lines) into a clean, tested Vite JS project, behaviour-identical except for agreed bug fixes, published to `github.com/cmdjc/trench-line` and deployed to GitHub Pages.

**Architecture:** Vanilla JS ES modules. A DOM-free simulation (`src/sim/`) holds all mutable state in one exported `G` object and talks to the UI only through a tiny event emitter. Data (units, nations, tech, cards, maps, superweapons) lives in plain modules under `src/data/`. UI modules (`src/ui/`) own the DOM and canvas; the renderer is split from game logic. A seeded RNG makes battles reproducible; tests drive the simulation directly (no jsdom for unit tests). E2E loads the real bundle in jsdom (esbuild IIFE wrapper).

**Tech stack:** Vite 8, Vitest 4, ESLint (flat config), jsdom (dev/test only), Node ≥ 22.12, GitHub Actions for Pages deploy. No runtime dependencies.

**Decisions (confirmed by owner):**
1. **Parity + obvious bug fixes.** Same balance and behaviour; fix only clear bugs: the stray "miss" tracer fired even on hits/shells (source line 891), and rewrite the lost save-code / two-slot recovery tests. The 9 open questions in DESIGN.md stay open.
2. **Seeded RNG** replaces `Math.random()` everywhere inside the simulation (HANDOFF suggestion 5).
3. **localStorage, 2 slots** (`trenchline-meta`, `trenchline-meta-b`, newest valid wins) — HANDOFF storage choice.
4. Credits: "M K" (author) and AI agents Claude and GLM — in README, and a credits line on the start screen.
5. Sister-folder conventions (landfall/wobblers): `package.json` scripts (`dev/build/preview/test/lint/e2e/check`), ESLint flat config, Apache-2.0 LICENSE, `.github/workflows/pages.yml` deploying `dist/`, Vite `base:"./"`.

**Source map** (line ranges in `legacy/trench-line.html` after move; same numbers as the original file):

| Section | Lines |
|---|---|
| HTML + CSS | 1–232 |
| constants | 233–296 |
| tank variants / STATS / SPECIAL / NAT / AI_* | 297–533 |
| permanent research (TECH, save codes) | 534–640 |
| state (SW, MAPS, setLayout, mods, newGame) | 641–718 |
| geometry | 719–760 |
| combat (hurt, die, stepUnits) | 761–988 |
| fortifying and MG nests | 989–1111 |
| superweapons | 1112–1196 |
| enemy commander | 1197–1261 |
| cards | 1262–1343 |
| orders, interface | 1344–1551 |
| simulation tick | 1552–1573 |
| drawing | 1574–2227 |
| camera input | 2228–2256 |
| loop + test hook | 2257–2276 |

**Porting rules (apply to every task):**
- Copy function bodies nearly verbatim. Rename closure globals to `G.` fields: `units→G.units, S→G.S, M→G.M, owner→G.owner, fort→G.fort, fields→G.fields, jobs→G.jobs, garr→G.garr, bases→G.bases, ai→G.ai, sel→G.sel, nation→G.nation, LX→G.LX, WW/NT/HQI/SUPER/DBL→G.WW/G.NT/G.HQI/G.SUPER/G.DBL, MAP/RIV→G.MAP/G.RIV, sw/shake→G.sw/G.shake, aim/planes/tracers/shells/booms/floats/scorch/smoke/wrecks→G.*`, `running→G.running, uid→G.uid`.
- `Math.random()` in simulation code → `rng.float()`. Keep the decor generator `rnd(seed)` (line 1578) as-is (already seeded).
- DOM calls from sim (`toast`, `refresh`, `buildBuy`, `buildMap`, `makeDecor`, `focusLine`, `$('cardOv')`) become events on `bus`: `toast`, `hud`, `dirty:buy`, `dirty:map`, `cards:offer`, `game:end`, `game:start`. UI listens; sim never imports DOM.
- `window.storage` → `src/storage.js` localStorage adapter with the same async shape (`get(k)` → `{value}` | null, `set(k,v)` → truthy | null).
- Damage tables are keyed by `T.atk || u.type`; any new unit key must be added to `mods()` (unchanged rule).

**File map (final layout):**

```
index.html                     # shell: ported markup, loads /src/main.js
package.json  vite.config.js  eslint.config.js  .gitignore  LICENSE  README.md
.github/workflows/pages.yml
legacy/                        # prototype + old tests/tools, moved verbatim
  trench-line.html  tests/{harness,smoke,merge}.js  tools/{bot.js,make-artifact.py,package.json}
docs/                          # DESIGN.md HANDOFF.md STATS.md PLAN.md (this file)
scripts/
  gen-stats.mjs                # regenerates docs/STATS.md from src/data
  bot.mjs                      # headless scripted player (deterministic)
src/
  main.js                      # bootstrap: storage→meta→UI wiring→loop
  styles.css                   # extracted CSS (unchanged rules)
  storage.js                   # localStorage adapter
  core/{events.js,rng.js}
  data/{units.js,nations.js,superweapons.js,tech.js,cards.js,maps.js}
  sim/{state.js,geometry.js,combat.js,fortify.js,superweapons.js,ai.js,cards.js,tick.js,meta.js}
  ui/{hud.js,buy.js,cards.js,overlays.js,input.js,loop.js}
  ui/draw/{index.js,helpers.js,terrain.js,men.js,tanks.js,effects.js}
tests/
  unit/*.test.js               # node env, direct sim imports
  e2e/game.e2e.test.js         # jsdom + esbuild IIFE bundle of the real page
```

---

## Task 0: repo init

- [ ] `git init`; local config `user.name Commander`, `user.email cmdjc@jcent.com` (matches sister repos).
- [ ] Move `trench-line.html` → `legacy/trench-line.html`, `tests/{harness,smoke,merge}.js` → `legacy/tests/`, `tools/*` → `legacy/tools/`. Delete `artifact/` (generated copy; the generator stays in `legacy/tools/`). Keep `docs/`, `README.md` at root.
- [ ] Write `.gitignore` (node_modules/, dist/, coverage/, *.png shots).
- [ ] Commit: `init: prototype handoff as received` then `chore: move prototype to legacy/`.

## Task 1: toolchain + shell

- [ ] `package.json` mirroring landfall: `"type":"module"`, engines node ≥22.12, scripts `dev/build/preview/test/lint/e2e/check`; devDeps `vite, vitest, @eslint/js, eslint, globals, jsdom` (versions from landfall's lock: vite 8.3.5, vitest 4.1.12, eslint 10.13.0, @eslint/js 10.0.1, globals 17.13.0, jsdom 30.1.3).
- [ ] `vite.config.js`: `base:"./"`, test include `tests/unit/**/*.test.js`, env node.
- [ ] `eslint.config.js` (copy landfall's, adjusted paths).
- [ ] `index.html`: ported markup (source lines 120–227) minus inline style/script, plus `<script type="module" src="/src/main.js">`; credits line added to start overlay: `<p class="credits">A game by M K · built with the AI agents Claude and GLM.</p>` (+ CSS rule `footer/credits` styling, muted, small).
- [ ] `src/styles.css` = ported CSS (lines 8–117) + credits rule.
- [ ] `src/main.js` stub: `import './styles.css'` only.
- [ ] `npm install`; add trivial `tests/unit/sanity.test.js` (`expect(1+1).toBe(2)`); `npm run check` green.
- [ ] Commit: `chore: vite + vitest + eslint shell`.

## Task 2: core — rng + events (TDD)

- [ ] **Failing tests** `tests/unit/rng.test.js`:
```js
import { describe, expect, it } from 'vitest';
import { makeRng, rng } from '../../src/core/rng.js';

describe('makeRng (mulberry32)', () => {
  it('reproduces the same sequence for the same seed', () => {
    const a = makeRng(1234), b = makeRng(1234);
    const sa = [a(), a(), a()], sb = [b(), b(), b()];
    expect(sa).toEqual(sb);
  });
  it('stays in [0,1) and differs across seeds', () => {
    const a = makeRng(1), b = makeRng(2);
    const seq = Array.from({ length: 200 }, () => a());
    expect(seq.every(v => v >= 0 && v < 1)).toBe(true);
    expect(seq.slice(0, 5)).nottoEqual(Array.from({ length: 5 }, () => b()));
  });
});

describe('shared rng', () => {
  it('can be reseeded and reports its seed', () => {
    rng.seed(42); const first = rng.float();
    rng.seed(42); expect(rng.float()).toBe(first);
    expect(rng.seed).toBe(42);
  });
  it('range(a,b) stays within bounds', () => {
    rng.seed(7);
    for (let i = 0; i < 100; i++) { const v = rng.range(3, 9); expect(v).toBeGreaterThanOrEqual(3); expect(v).toBeLessThanOrEqual(9); }
  });
});
```
- [ ] Run `npx vitest run tests/unit/rng.test.js` → FAIL (module missing).
- [ ] Implement `src/core/rng.js`: `makeRng(seed)` mulberry32 returning `()=>…[0,1)`; shared `rng` object `{seed, float(), range(a,b), int(n), pick(arr)}` where `float()` etc. call a reseedable inner generator. Also export `decor(seed)` = ported `rnd()` (line 1578).
- [ ] Tests pass. Commit: `feat: seeded rng`.

- [ ] **Failing test** `tests/unit/events.test.js` (on/emit payload, off, no listener → no throw). Implement `src/core/events.js` (`export const bus={on,ev,off,emit}` — ~15 lines). Tests pass. Commit: `feat: sim↔ui event bus`.

## Task 3: data modules

Port lines 233–533, 642–652 (SW), 535–557 (TECH), 1263–1306 (CARDS/CARDTXT), 656–664 (MAPS) into `src/data/`. Pure data + tiny pure helpers; **no imports from sim/ui**.

- `data/units.js`: `UT, INF, TK, ORDER, TKB, tkv(), NU (assembled: gb/de/fr/us/ru/it/aq/ah + tank variants incl. AQ_TANKS), SPECIAL, STATS, tkList(), tkPrev(), utFactory(nationGetter)` — `ut(side,k)` needs `G.nation`, so export `utOf(nation,k)` and let sim re-export `ut(side,k)`. Cover tables `COV, ARM, NESTCOV`, `FORT_COST, FORTD, FORTA, SLOTS, SLOTS5, maxFortOf(superL,L)`, `HEDGE, DBL_COV, DBL_RATE, BUNKER_CAP, BUNKER_MAX, GARR_T, DEPOT_RATE, SUPER_INC, SUPER_CARD_T, BASE_HP`.
- `data/nations.js`: `NAT` (with the `blurb += ' Superweapon: …'` merge done here), `AI_UNLOCK, AI_INCOME, AI_RAMP, AI_START, AI_W, BW, WH, SEG`.
- `data/superweapons.js`: `SW` map.
- `data/tech.js`: `TECH`, `TECH_IDS()`.
- `data/cards.js`: `CARDS` (data only: `{id,w,once?,name,text}`) + `CARDTXT`. Effect bodies live in `sim/cards.js` (source lines 1264–1286 `take()` bodies).
- `data/maps.js`: `MAPS` with rivers as **precomputed literal numbers** (they embed the default 9-trench LX math from lines 658–659; keep exact values).
- [ ] **Failing tests** `tests/unit/data.test.js`, then implement, then pass:
```js
import { describe, expect, it } from 'vitest';
import { NATS } from '../../src/data/nations.js';
import { STATS, tkList, SPECIAL, UT } from '../../src/data/units.js';
import { CARDS, CARDTXT } from '../../src/data/cards.js';
import { TECH } from '../../src/data/tech.js';
import { MAPS } from '../../src/data/maps.js';
import { SW } from '../../src/data/superweapons.js';

it('every nation has rifle, mg and at least one armour slot', () => {
  for (const n of NATS) {
    expect(STATS[n].rifle?.cost, n).toBeGreaterThan(0);
    expect(STATS[n].mg?.cost, n).toBeGreaterThan(0);
    expect(tkList(n).length, n).toBeGreaterThan(0);
  }
});
it('tkList is cheapest-first and entries exist in STATS', () => {
  for (const n of NATS) { const l = tkList(n); for (let i = 1; i < l.length; i++) expect(STATS[n][l[i - 1]].cost).toBeLessThanOrEqual(STATS[n][l[i]].cost); }
});
it('card ids are unique; CARDTXT keys are card ids; TECH ids unique', () => {
  const ids = CARDS.map(c => c.id);
  expect(new Set(ids).size).toBe(ids.length);
  for (const n in CARDTXT) for (const id in CARDTXT[n]) expect(ids).toContain(id);
  const tids = TECH.flatMap(b => b.nodes.map(n => n.id));
  expect(new Set(tids).size).toBe(tids.length);
});
it('every non-base unit type declares atk or is a base type', () => {
  const base = new Set(Object.keys(UT));
  for (const n of NATS) for (const k in STATS[n]) { const T = STATS[n][k]; if (T?.dmg && !base.has(k)) expect(typeof T.atk, `${n}:${k}`).toBe('string'); }
  for (const k in SPECIAL) { const T = SPECIAL[k]; if (T.dmg && !base.has(k)) expect(typeof T.atk, k).toBe('string'); }
});
it('each nation has a superweapon and a map for every key', () => {
  for (const n of NATS) expect(SW[n], n).toBeTruthy();
  expect(Object.keys(MAPS).sort()).toEqual(['march', 'open', 'plain', 'river']);
});
it('save-critical order: TECH declaration order is stable (mask compat)', () => {
  expect(TECH.flatMap(b => b.nodes.map(n => n.id)).slice(0, 5)).toEqual(['marks', 'kit', 'craft', 'vets', 'deep']);
});
```
- [ ] Commit: `feat: data modules (units, nations, tech, cards, maps, sw)`.

## Task 4: sim state

- [ ] **Failing tests** `tests/unit/state.test.js`:
```js
import { describe, expect, it, beforeEach } from 'vitest';
import { G, newGame, mods } from '../../src/sim/state.js';
import { MAPS } from '../../src/data/maps.js';

beforeEach(() => { localStorage.clear?.(); });

it('setLayout per map: open=9 trenches, plain=17, march=45', () => {
  for (const [map, n] of [['open', 9], ['plain', 17], ['march', 45]]) {
    newGame('gb', 'de', map, 1);
    expect(G.NT, map).toBe(n);
    expect(G.LX.length).toBe(n + 2);
    expect(G.HQI).toBe(n + 1);
    expect(G.WW).toBeGreaterThan(G.LX[G.HQI]);
  }
});
it('march marks the super trench at the middle line; plain marks two double trenches', () => {
  newGame('gb', 'de', 'march', 1); expect(G.SUPER).toBe(23); expect(G.DBL).toEqual([]);
  newGame('gb', 'de', 'plain', 1); expect(G.SUPER).toBe(-1); expect(G.DBL).toEqual([4, 14]);
});
it('newGame spawns starting infantry for both sides and sets owners', () => {
  newGame('gb', 'de', 'open', 1);
  expect(G.units.filter(u => u.side === 0).length).toBeGreaterThan(0);
  expect(G.units.filter(u => u.side === 1).length).toBeGreaterThan(0);
  expect(G.owner[0]).toBe(0); expect(G.owner[G.HQI]).toBe(1);
  expect(G.running).toBe(true);
});
it('mods() covers every ORDER key plus specials', () => {
  const m = mods();
  for (const k of ['rifle', 'mg', 'raider', 'sniper', 'mortar', 'tank', 'tkL', 'tkM', 'tkH', 'tkS', 'bunker', 'colossus', 'tsar', 'char2c', 'nest', 'depot', 'pit75', 'pit65']) {
    expect(m.dmg[k], k).toBe(1); expect(m.cost[k], k).toBe(1);
  }
});
it('same seed ⇒ identical opening state', () => {
  newGame('de', 'fr', 'river', 99); const a = JSON.stringify(snapshot());
  newGame('de', 'fr', 'river', 99); const b = JSON.stringify(snapshot());
  expect(a).toBe(b);
  function snapshot() { return G.units.map(u => [u.type, Math.round(u.x * 10), Math.round(u.y * 10)]); }
});
```
- [ ] Implement `src/sim/state.js`: `G` object with every field from Porting rules; `mods()`, `setLayout(key)` (lines 665–676), `newGame(mine, theirs, map, seed)` (lines 694–717) minus DOM (`relabelCards` imported from sim/cards, `makeDecor/buildMap/buildBuy/refresh` → `bus.emit('dirty:map')`, `bus.emit('dirty:buy')`, `bus.emit('hud')`, toast via bus; `cam/camT` stay UI-side so drop), `applyTech()` (623–639, uses META from sim/meta), `fmt`, `lineName`. RNG seeded here: `rng.seed(seed ?? defaultSeed())`.
- [ ] Pass, commit: `feat: sim state + newGame (seeded)`.

## Task 5: sim geometry

- [ ] **Failing tests** `tests/unit/geometry.test.js` (use `newGame` to set up):
  - `posX`: player at trench L sits left of `LX[L]` by 6 (zigzag `trenchX`), enemy mirrored; own HQ offset +55/−52 tank; enemy HQ attack offset 85/72.
  - `startX`: on `open` reinforcements spawn at `LX[0]-14`; on `march` sending to L spawns at `LX[L-1]-14` (clamped).
  - `spawn(0,'rifle',3,true)` creates settled unit at `posX(0,3,y,0)` with full hp; `spawn` without placed starts unsettled at startX.
  - `tanks()` sums `T.w` and skips `T.sup`; `full()` blocks at `NAT.tanks`/`inf` caps (spawn rifles up to cap for gb=40; tanks: buy 8×w1 for gb).
  - `frontLine()` returns max player line; `countAt/power` per line.
- [ ] Implement `src/sim/geometry.js` porting lines 719–760 (`trenchX, posX, isTrench, pickLane(rng), startX, spawn, count, tanks, anyTank, tkCan, full, countAt, power, cost, frontLine`). `ut(side,k)` re-exported here via `utOf(G.nation[side],k)`.
- [ ] Pass, commit: `feat: sim geometry + spawn`.

## Task 6: sim combat — damage rules

- [ ] **Failing tests** `tests/unit/combat-damage.test.js` — pin every row of the cover/armour tables using a tiny harness that spawns attacker/victim directly and calls `hurt`:
```js
// helper: hurt(e, dmg, atk, attacker, cov, area) — ported signature
it('settled rifleman in trench 0-fort takes 25% (COV.rifle)', …);          // dmg 8 → hp -2
it('each fort level deepens cover (FORTD 1→0.5)', …);
it('raiders ignore trench cover; same-trench attackers ignore it', …);
it('sniper cover 0.5; mortar 0.7; tank 0.6; base line 0.3; HQ 0.5', …);
it('armour table ARM: rifle 0.1, mg 0.15, mortar/tank 1; thin doubles small arms (<0.5)', …);
it('Maxim shield multiplies rifle/mg/sniper/base by 0.55 only', …);
it('nests use NESTCOV; pillbox/bunker use their own ncov; soft units take 0.6', …);
it('bunker shelter redirects direct hits to the bunker and blocks splash for sheltered troops', …);
it('double trench multiplies by 0.55 on top; Italy cover ×0.85 nation trait', …);
it('die() pays bounty, advances card kills, spawns wreck/scorch for armour', …);
```
- [ ] Implement `src/sim/combat.js` part 1: port `hurt` (762–777), `HQG/accVs` (778–779), `die` (780–790), `hurtBase` (791–794), effect pushers `puff/boom/tracer` (795–797) writing into `G.smoke/G.booms/G.tracers`. Export them for tests.
- [ ] Pass, commit: `feat: damage model + die/bounty`.

## Task 7: sim combat — stepUnits

- [ ] **Failing tests** `tests/unit/combat-step.test.js` (drive with fixed `dt`):
  - movement toward `posX` target; `wireSlow` 0.3 for infantry, tanks delete wire; river units funnel to nearest bridge band; big units ignore rivers.
  - **hedgehogs** (port of legacy merge test): enemy holds double trench 14 → player tank halts at `LX[14]-94-len-8`, tsar (`big`) passes; when player infantry hold 14, tank passes.
  - firing: cooldowns randomised ±15% via rng; magazine (BAR: 20 shots then reload cd); jam (Chauchat); `moveFire` gating; min range respected; shell push with `atk` type, splash, cov, arc.
  - **regression for the stray tracer bug**: with `acc:1` rifleman fires → exactly one tracer (hit), no miss tracer; with `acc:0` → exactly one faint miss tracer; shell weapons draw no tracer either way.
  - HQ guns fire only within 270; shells land: splash damages units in radius only, `base:true` shells hit HQ; siege shells can strip fort levels; huge (Paris) shell razes forts in `rz`, shakes.
  - ownership: only-attacker-settled line flips `owner`; empty trench keeps owner.
  - nest capture flips side when enemies hold its line alone; AH garrison fortifies lines with ≥3 settled after GARR_T.
  - bunkers: settled troops walk in (≤6), keep firing; on bunker death troops exposed; `stepBunkers` releases on side change.
  - barrage card: every 10 s spawns M[0].barrage shells at frontmost enemy.
- [ ] Implement stepUnits (799–987) + `stepFields`/`wireSlow` moved to `fortify.js` (imported); replace the tracer block at 885–891 with:
```js
if (best && bd <= T.range) {
  u.cd = T.cd * m.cd[u.type] * (0.85 + rng.range(0, 0.3)); u.flash = 0.08;
  if (T.shell) shells.push({ /* unchanged fields */ });
  else if (rng.float() < T.acc * accVs(u, best)) { tracer(u.x + dir * 9, u.y, best.x, best.y, u.type === 'sniper' ? 1.4 : 1, '#ffe9a8'); hurt(best, dmg, T.atk || u.type, u); }
  else tracer(u.x + dir * 9, u.y, best.x + (rng.float() - 0.5) * 30, best.y + (rng.float() - 0.5) * 30, 0.8, 'rgba(255,233,168,.6)');
  if (T.jam && rng.float() < T.jam) u.cd = 2.4;
  if (T.mag) { u.shots = (u.shots || 0) + 1; if (u.shots >= T.mag) { u.shots = 0; u.cd = T.reload; } }
}
```
(the original fired the faint miss tracer unconditionally for non-magazine weapons — DESIGN.md "Known quirks" #3).
- [ ] Pass, commit: `feat: stepUnits with hedgehogs, rivers, fixed miss tracer`.

## Task 8: sim fortify

- [ ] **Failing tests** `tests/unit/fortify.test.js`:
  - `freeSlot`: 3 slots normal trench, 5 in double; occupied by nests and pending jobs.
  - `buildNest` spawns sapper job; `stepJobs` stage 0→1→2 spawns gun carrier after 4 s, completes after 3 more + arrival, replaces with nest at slot; killed sapper abandons (toast).
  - `buildDef` per nation: gb wire field object at LX+54; ru 10 mines spread; fr/us/it pit & depot (US depot adds income via DEPOT_RATE; duplicate depot per trench blocked); aq bunker via slots and ≤2 per trench.
  - `buildSuper`: first capture spawns pillbox/pit75/pillbox fixed, hp ×1.6, slots 0/1/2.
  - `fortify` costs FORT_COST levels, owner-gated, max level 3 (4 on SUPER), supply-gated.
- [ ] Implement `src/sim/fortify.js` (port lines 989–1110). Pass, commit: `feat: fortification, nests, bunkers, fields`.

## Task 9: sim superweapons

- [ ] **Failing tests** `tests/unit/superweapons.test.js` per kind (`swBlock` strings, one-at-a-time, cost/cd set):
  - de Paris: `useSW(0,{x,y})` pushes huge shell (dmg 700, splash 90, dur 4.5, rz 80); aiming clamps to field.
  - gb Messines: tunnel 25 s against targetFor trench, then `detonate` kills occupants within 70 px, razes forts if not owner, mine toast.
  - fr char2c / ru tsar / aq colossus: spawn one, blocked while alive, `T.sup` doesn't count to armour.
  - us bugs: 4 shells, flight capped `min(7, max(1.5, dx/230))`.
  - it caproni: plane crosses field in (WH+100)/110 s, 8 bombs along the trench column.
  - ah skoda42: 3 big razing shells, staggered −1.3 s.
  - enemy AI aiming uses richest cluster (`aimPoint`).
- [ ] Implement `src/sim/superweapons.js` (1112–1196). Pass, commit: `feat: superweapons`.

## Task 10: sim AI

- [ ] **Failing tests** `tests/unit/ai.test.js`: income ramp formula incl. us/aq modifiers, depots, super/dbl income; buy loop respects armour cap and inf cap; `aiThink` gathers at F, advances on power ratios (seeded, deterministic); wants sw only past 240 s and 60% cost for ≥1500.
- [ ] Implement `src/sim/ai.js` (1197–1261). Pass, commit: `feat: enemy commander`.

## Task 11: sim cards

- [ ] **Failing tests** `tests/unit/cards.test.js`:
  - pool excludes `once` already taken, failing `can`, redundant `u_tank` when unlocked; corps tech forces u_tank in first offer; intel offers 4.
  - seeded pick: same seed → same offer; weights respected statistically (χ²-lite: each of 2 cards appears across 200 seeds).
  - `takeCard('u_raider')` unlocks + spawns 2 at sel; bonds +1.5 income; helmet heals and buffs existing troops; barrage stacks +2.
  - `relabelCards` per nation text (gb raiders vs de stormtroopers; ah "Siege gun: Škoda 30.5 cm"; aq Weddell tank text).
- [ ] Implement `src/sim/cards.js`: `CARDS` effects map, `relabelCards()`, `buildOffer()` (pure — returns ids), `takeCard(id)` (1263–1342 logic minus DOM; emits `dirty:buy` when unlock).
- [ ] Pass, commit: `feat: cards`.

## Task 12: sim tick + meta/storage (rewrites the lost tests)

- [ ] **Failing tests** `tests/unit/meta.test.js` (localStorage fake or real via jsdom env — use `@vitest/environment jsdom` per-file):
```js
it('makeCode/readCode round-trip points, tech mask, runs, wins', () => {
  META.points = 123; META.tech = { marks: 1, kit: 1 }; META.runs = 7; META.wins = 3;
  const d = readCode(makeCode());
  expect(d.points).toBe(123); expect(d.tech).toEqual({ marks: 1, kit: 1 }); expect(d.runs).toBe(7); expect(d.wins).toBe(3);
});
it('rejects bad checksum, wrong prefix, junk, negative numbers', () => {
  expect(readCode('TL1-0-0-0-0-ZZ')).toBeNull();
  expect(readCode('TL2-0-0-0-0-' + 'TL1-0-0-0-0-'.slice(0))).toBeNull();
  expect(readCode('hello')).toBeNull();
  const c = makeCode(); expect(readCode(c.replace(/-([0-9A-Z]+)$/, '-AAAA'))).toBeNull();
});
it('prunes tech whose predecessor is missing (order enforcement)', () => {
  // craft code with kit but not marks via mask bit 1 only
  const body = 'TL1-5-1-0-0'; const code = body + '-' + codeCheck(body);
  expect(readCode(code).tech).toEqual({}); // kit requires marks
});
it('two-slot recovery: newest valid wins, corrupt slot repaired', async () => {
  localStorage.setItem('trenchline-meta', JSON.stringify({ code: makeCode(), rev: 5, ts: 100 }));
  localStorage.setItem('trenchline-meta-b', 'garbage');
  await loadMeta();
  expect(META.rev).toBeGreaterThanOrEqual(6);            // resaved, both slots valid now
  expect(localStorage.getItem('trenchline-meta-b')).not.toBe('garbage');
});
it('saveMeta writes both slots and bumps rev', async () => { … });
it('applyTech applies exactly the owned nodes to a fresh game', () => { … // e.g. marks → dmg.rifle 1.1, walls → +400 hp });
```
- [ ] **Failing tests** `tests/unit/tick.test.js`: supplies accrue at `incomeNow`; super-trench card every SUPER_CARD_T while held; fallback orders when a selected trench is lost (tick block 1564–1569); end detection emits `game:end` with earned points; `cards:offer` when pending; effects arrays decay.
- [ ] Implement `src/storage.js`, `src/sim/meta.js` (534–639 minus `saveState` DOM — move save-state text to UI), `src/sim/tick.js` (1552–1573; `endGame` becomes event emit + `metaAward()` call).
- [ ] Pass, commit: `feat: tick + meta persistence (lost tests rewritten)`.

## Task 13: headless smoke + merge suites (ports of legacy tests)

- [ ] **Failing test** `tests/unit/smoke.test.js` — port of `legacy/tests/smoke.js` without jsdom: every nation as player vs de (and de vs each), plus aq/it river, ru/fr plain both ways, gb/aq + de/it march. Drive `tick(0.04)` to 240 s; auto-take first card via `takeCard(offer[0])`; keep supplies/HQ topped like the original; assert: no NaN in unit fields, armour caps respected, no exceptions, game still runs.
- [ ] **Failing test** `tests/unit/merge.test.js` — port of `legacy/tests/merge.js`: Russia lineup `tkList('ru')==='tank,tkH'`, tank card needed, limit 10, tsar is SW; superweapon use once; hedgehog halt/pass exact positions; 5 emplacements at double trench; `+4.0 a second` income display value (`incomeNow()` ≈ base+1).
- [ ] Tune until green (these are the real parity gates; failures mean port bugs — fix sim, not tests). Commit: `test: headless smoke + merge parity suites`.

## Task 14: UI — hud, buy, overlays, input, loop

- [ ] `src/ui/hud.js`: `toast(msg)` (bus `toast` → element), `refresh()` (1408–1446) reading sim state, `buildMap()` (1387–1392) + line-strip click → `select(L,true)`; `select`/`focusLine` (1345–1350; cam lives here).
- [ ] `src/ui/buy.js`: `buildBuy()` (1398–1401) + buy clicks → `spawn` via sim exports (1402–1407).
- [ ] `src/ui/cards.js`: offer overlay rendering + `takeCard` wiring (1321–1342 UI half).
- [ ] `src/ui/overlays.js`: start screen (1519–1537), end screen (1538–1550), research overlay incl. code copy/load + save-state text (1449–1500).
- [ ] `src/ui/input.js`: pointer drag/tap/double-tap fortify, arrow keys, Paris aim taps (2228–2255).
- [ ] `src/ui/loop.js`: `frame` with fixed 0.04 sub-steps, pause on overlays, speed toggle, 4 Hz refresh (2257–2271); `resize`; `makeDecor` + decor arrays live in draw/terrain.
- [ ] `src/main.js`: wire everything; `loadMeta().then(...)`; expose debug hook `window.__trench = { … }` **only when `location.search` includes `debug` or `e2e`** (units/sw/fields/fort/jobs/step/info/seed/ut/tkList/tanks/full/buildBuy/offer equivalents used by e2e).
- [ ] **Tests** `tests/unit/ui.test.js` (jsdom env, canvas stubbed): start a game via hook; assert: map strip renders `HQI+1` buttons; `refresh()` updates supplies/rate/army text and aria-pressed; buy button disabled when short of supplies; advance moves sel; pause/speed toggle; card overlay shows and picking applies; tech overlay renders 4 branches × nodes and research button spends points; end overlay shows victory and a valid save code. Commit: `feat: ui layer`.

## Task 15: renderer

- [ ] Port drawing (1574–2227) into `src/ui/draw/`: `helpers.js` (circle/oval/line/at/colors, ctx setup), `terrain.js` (ground, patches, craters, rivers+bridges, drawTrench/drawSuper, HQ bases, flags, wire/mines/hedgehogs, job ghosts, decor + `makeDecor` using `decor(seed)`), `men.js` (soldier styles per nation, nests/pillboxes/pits/bunkers, carriers, wreck infantry bits), `tanks.js` (`drawTankGen` parts renderer + per-country fallbacks + tsar/char2c/colossus + wrecks), `effects.js` (smoke, tracers, booms, shells incl. Paris warning circle, planes, floats, aim reticle), `index.js` (`draw()` with camera transform, `vis()`, HUD-ish canvas bits).
- [ ] **Test** `tests/unit/draw.test.js`: no-op Proxy ctx (like legacy `tools/bot.js` stub); spawn one of every unit type for gb/de/fr/ru/us/ah/it/aq on each map, run `draw()` — no exceptions; `vis()` culls off-camera.
- [ ] Manual check via `npm run dev` on desktop + narrow viewport; commit: `feat: canvas renderer`.

## Task 16: e2e — real page in jsdom

- [ ] `tests/e2e/game.e2e.test.js` + `tests/e2e/vitest.config.js` (like landfall: include e2e, node env, 120 s timeouts, fileParallelism false; jsdom imported manually, not as vitest env).
  - Build page: read `index.html`, inline `src/styles.css` `<link>`→skip, replace module script with esbuild IIFE bundle of `src/main.js` (`esbuild.buildSync({entryPoints:['src/main.js'], bundle:true, format:'iife', write:false})` — esbuild is already in node_modules via vite).
  - `new JSDOM(html, {runScripts:'dangerously', pretendToBeVisual:true, url:'https://trench.local/?e2e=1'})` + canvas getContext Proxy stub + getBoundingClientRect stub (legacy harness lines 4–12 pattern).
  - **Playthrough:** pick gb vs de on open via real button clicks; give player supplies via hook; buy riflemen, advance, fortify on double-tap; take a card; fire a superweapon (gb mine); rig enemy HQ hp to 1 and win; assert end overlay title "Victory", save code parses with `readCode`, research points awarded, replay → start overlay; console has zero page errors.
- [ ] `npm run e2e` green. Commit: `test: jsdom e2e playthrough`.

## Task 17: scripts, README, license, workflow

- [ ] `scripts/bot.mjs`: headless scripted player driving sim directly (port `legacy/tools/bot.js` logic; seeded; args: me foe map seed; prints summary line; `--json` for balance runs; `--shot out.png` optional via `@napi-rs/canvas` if installed — optionalDependency, skip in CI).
- [ ] `scripts/gen-stats.mjs`: regen `docs/STATS.md` from `src/data` (port `legacy/tests/gen-stats.js`); `npm run stats`; run it, commit refreshed STATS.md.
- [ ] `README.md`: title, one-paragraph pitch, play link, screenshot (from bot if easy, else skip), dev commands, architecture map, **credits: "Designed and authored by M K. Built with the help of the AI agents Claude (Anthropic) and GLM (Z.ai)."**, Apache-2.0.
- [ ] `LICENSE` Apache-2.0 (copy from landfall, copyright "2026 M K").
- [ ] `.github/workflows/pages.yml` (copy landfall's exactly: on push main, npm ci, `npm run check`, upload dist, deploy-pages).
- [ ] `package.json` `author: "M K"`, `license: "Apache-2.0"`, homepage/bugs URLs.
- [ ] Commit: `docs: readme, credits, license, pages workflow`.

## Task 18: final review + verification

- [ ] `npm run check` (lint + unit + build) and `npm run e2e` green.
- [ ] Determinism audit: two bot runs same seed → identical summary.
- [ ] Cross-check `docs/STATS.md` regenerated matches committed.
- [ ] Cross-model review (codex) of the finished repo — fold in findings (user requested a final review).
- [ ] Manual play sanity on the preview server (start→battle→win/lose→research→save code round-trip).

## Task 19: publish

- [ ] `gh repo create cmdjc/trench-line --public --source . --remote origin --description "A top-down First World War trench-battle game" ` then `git push -u origin main` (branch `main`).
- [ ] Enable Pages from Actions: `gh api -X POST repos/cmdjc/trench-line/pages -f build_type=workflow` (or `source[branch]=main` fallback if API shape differs).
- [ ] Wait for the workflow (`gh run watch`), verify `https://cmdjc.github.io/trench-line/` loads (webfetch: expect `<title>Trench Line</title>` and built asset).
- [ ] Final commit of any fix-ups; update PLAN.md checkboxes to done; summary to owner.

---

## Risks / notes

- **LX coupling in maps.js**: river bridge coordinates were computed from the default 9-trench layout at load time; freezing them as literals preserves behaviour (river map is only played on 9 trenches).
- **`fort` array sizing**: rebuilt per map (`HQI+1`); never hard-code 9/10.
- **Determinism**: any `Math.random()` left in sim breaks replay — audit with `grep -n 'Math.random' src/sim src/data` (expect zero; drawing/UI may keep it only for pure visuals, prefer decor rng).
- **Save-code compat**: `TECH` order is frozen; append-only or bump `TL1` prefix.
- Balance quirks from DESIGN.md are intentionally preserved (bunker slot sharing, plain-map walk-from-HQ, Paris price, etc.).
