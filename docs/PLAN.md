# Trench Line: proper project — implementation plan

> **For agentic workers:** This plan is executed inline (executing-plans). Tasks use `- [ ]` checkboxes and are updated as they complete. Commit after every task.

**Goal:** Turn the single-file prototype (`legacy/trench-line.html`, 2,276 lines) into a clean, tested Vite JS project, behaviour-identical except for agreed bug fixes, published to `github.com/cmdjc/trench-line` and deployed to GitHub Pages.

**Architecture:** Vanilla JS ES modules. A DOM-free simulation (`src/sim/`) holds all mutable state in one exported `G` object and talks to the UI only through a tiny event emitter. Data (units, nations, tech, cards, maps, superweapons) lives in plain modules under `src/data/`. UI modules (`src/ui/`) own the DOM and canvas; the renderer is split from game logic. A seeded RNG makes battles reproducible; unit tests drive the simulation directly (no jsdom). E2E loads the real bundle in jsdom via an esbuild IIFE wrapper. Reviewed by codex (reviews/plan-codex-20261117-1514.md); blockers and importants folded in.

**Tech stack:** Vite 8, Vitest 4, ESLint (flat config), esbuild (dev/test), jsdom (dev/test only), Node ≥ 22.12, GitHub Actions for Pages deploy. No runtime dependencies.

**Decisions (confirmed by owner):**
1. **Parity + obvious bug fixes.** Same balance and behaviour; fix only clear bugs: the stray "miss" tracer fired even on hits/shells (source line 891), and rewrite the lost save-code / two-slot recovery tests. The 9 open questions in DESIGN.md stay open.
2. **Seeded RNG** replaces `Math.random()` everywhere inside the simulation (HANDOFF suggestion 5).
3. **localStorage, 2 slots** (`trenchline-meta`, `trenchline-meta-b`, newest valid wins) — HANDOFF storage choice.
4. Credits: "M K" (author) and AI agents Claude and GLM — in README, package.json author, and a credits line on the start screen.
5. Sister-folder conventions (landfall/wobblers): `package.json` scripts (`dev/build/preview/test/lint/e2e/check`), ESLint flat config, Apache-2.0 LICENSE, `.github/workflows/pages.yml` deploying `dist/` (with e2e added to CI), Vite `base:"./"`.

**Source map** (line ranges in `legacy/trench-line.html`):

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
- Copy function bodies nearly verbatim. Rename closure globals to `G.` fields: `units→G.units, S→G.S, M→G.M, owner→G.owner, fort→G.fort, fields→G.fields, jobs→G.jobs, garr→G.garr, bases→G.bases, ai→G.ai, sel→G.sel, nation→G.nation, LX→G.LX, WW/NT/HQI/SUPER/DBL→G.WW/G.NT/G.HQI/G.SUPER/G.DBL, MAP/RIV→G.MAP/G.RIV, sw/shake→G.sw/G.shake, aim/planes/tracers/shells/booms/floats/scorch/smoke/wrecks→G.*, running→G.running, uid→G.uid, offer→G.offer (new, see Task 12)`.
- **Import graph rule (codex blocker):** sim modules may import each other, including cycles (combat↔fortify, state↔cards), but every cross-module reference must live **inside a function body**. No module-level evaluation may read another sim module's exports. All mutable shared state lives only in `G` (`sim/state.js`). Violations show up as `undefined is not a function` at call time — the parity suites (Task 15) are the gate.
- `Math.random()` in simulation code → `rng.float()`. Keep the decor generator `rnd(seed)` (line 1578) as `decor(seed)` (already seeded). Drawing/UI may keep `rng` too; pure-visual-only randoms may use `Math.random`.
- DOM/browser globals from sim are removed: `toast()/refresh()/buildBuy()/buildMap()/makeDecor()/focusLine()/$('cardOv')` become events on `bus`: `toast`, `hud`, `dirty:buy`, `dirty:map`, `cards:offer`, `game:end`, `game:start`. `reduceMotion` (line 655, read by shells/paris/detonate) becomes `G.reduceMotion=false`, set by the UI after `matchMedia`; sim reads it, UI applies/decays `G.shake` (codex important).
- `window.storage` → `src/storage.js` localStorage adapter with the same async shape (`get(k)` → `{value}` | null, `set(k,v)` → truthy | null).
- Damage tables are keyed by `T.atk || u.type`; any new unit key must be added to `mods()` (unchanged rule).
- UI handlers must not contain game rules: all ownership/supply checks and deductions live in `sim/commands.js` (Task 13); buttons call commands and refresh (codex important). `useSW()` itself still does **not** deduct cost — its callers do (preserve).

**File map (final layout):**

```
index.html                     # shell: ported markup, loads /src/main.js
package.json  vite.config.js  eslint.config.js  .gitignore  LICENSE  README.md
.github/workflows/pages.yml
legacy/                        # prototype + old tests/tools, moved verbatim (done)
docs/                          # DESIGN.md HANDOFF.md STATS.md PLAN.md (this file)
reviews/                       # cross-model review artifacts
scripts/
  gen-stats.mjs                # regenerates docs/STATS.md from src/data
  bot.mjs                      # headless scripted player (deterministic)
src/
  main.js                      # bootstrap: storage→meta→UI wiring→loop; arms ?debug/?e2e hook
  styles.css                   # extracted CSS (unchanged rules + credits)
  storage.js                   # localStorage adapter
  core/{events.js,rng.js}
  data/{units.js,nations.js,superweapons.js,tech.js,cards.js,maps.js}
  sim/{meta.js,state.js,geometry.js,combat.js,fortify.js,superweapons.js,ai.js,cards.js,commands.js,tick.js}
  ui/{hud.js,buy.js,cards.js,overlays.js,input.js,loop.js}
  ui/draw/{index.js,helpers.js,terrain.js,men.js,tanks.js,effects.js}
tests/
  unit/*.test.js               # node env (jsdom env only where DOM/localStorage needed)
  e2e/game.e2e.test.js         # jsdom + esbuild IIFE bundle of the real page
```

---

## Task 0: repo init — DONE

- [x] `git init` (branch `main`); config `user.name Commander`, `user.email cmdjc@jcent.com`.
- [x] Prototype moved to `legacy/` (`trench-line.html`, `tests/`, `tools/`); `artifact/` dropped. Commits `770d4c8`, `3006806`.

## Task 1: toolchain + shell

- [ ] `package.json`: `"type":"module"`, engines node ≥22.12, scripts `dev/build/preview/test/lint/e2e/check/stats/bot`; devDeps: `vite 8.3.5, vitest 4.1.12, @eslint/js 10.0.1, eslint 10.13.0, globals 17.13.0, jsdom 30.1.3, esbuild ^0.25` (esbuild explicit — codex blocker; vite may not install it for itself).
- [ ] `vite.config.js`: `base:"./"`, test include `tests/unit/**/*.test.js`, env node.
- [ ] `eslint.config.js` (port landfall's, adjusted paths).
- [ ] `index.html`: ported markup (source lines 120–227) minus inline style/script, plus `<script type="module" src="/src/main.js">`; credits line in start overlay: `<p class="credits">A game by M K · built with the AI agents Claude and GLM.</p>`.
- [ ] `src/styles.css` = ported CSS (lines 8–117) + `.credits{margin:14px 0 0;font-size:12.5px;color:var(--muted)}`.
- [ ] `src/main.js` stub: `import './styles.css'` only.
- [ ] `npm install`; trivial `tests/unit/sanity.test.js`; `npm run check` green.
- [ ] Commit: `chore: vite + vitest + eslint shell`.

## Task 2: core — rng + events (TDD)

- [ ] **Failing tests** `tests/unit/rng.test.js`:
```js
import { describe, expect, it } from 'vitest';
import { makeRng, rng } from '../../src/core/rng.js';

describe('makeRng (mulberry32)', () => {
  it('reproduces the same sequence for the same seed', () => {
    const a = makeRng(1234), b = makeRng(1234);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
  it('stays in [0,1) and differs across seeds', () => {
    const a = makeRng(1), b = makeRng(2);
    const seq = Array.from({ length: 200 }, () => a());
    expect(seq.every(v => v >= 0 && v < 1)).toBe(true);
    expect(seq.slice(0, 5)).not.toEqual(Array.from({ length: 5 }, () => b()));
  });
});

describe('shared rng', () => {
  it('reseed() reseeds; .seed reports the current seed', () => {
    rng.reseed(42); const first = rng.float();
    rng.reseed(42); expect(rng.float()).toBe(first);
    expect(rng.seed).toBe(42);
  });
  it('range(a,b) stays within bounds', () => {
    rng.reseed(7);
    for (let i = 0; i < 100; i++) { const v = rng.range(3, 9); expect(v).toBeGreaterThanOrEqual(3); expect(v).toBeLessThanOrEqual(9); }
  });
});
```
- [ ] Run `npx vitest run tests/unit/rng.test.js` → FAIL (module missing).
- [ ] Implement `src/core/rng.js`: `makeRng(seed)` (mulberry32, returns `()=>[0,1)`); shared `rng = { seed: <number>, reseed(n), float(), range(a,b), int(n), pick(arr) }` — `seed` is a **data property**, `reseed` the mutator (codex blocker: no dual-purpose name).
- [ ] Tests pass. Commit: `feat: seeded rng`.

- [ ] **Failing test** `tests/unit/events.test.js` (on/emit payload, off, emit with no listeners does not throw, late on after emit is not called retroactively). Implement `src/core/events.js` (`export const bus = { on(ev,fn), off(ev,fn), emit(ev,...args) }`). Pass. Commit: `feat: sim↔ui event bus`.

## Task 3: data modules

Port lines 233–533, 642–652 (SW), 535–557 (TECH), 1263–1306 (CARDS/CARDTXT), 656–664 (MAPS) into `src/data/`. Pure data + tiny pure helpers; **no imports from sim/ui**.

- `data/units.js`: `UT, INF, TK, ORDER, TKB, tkv(), NU (fully assembled incl. AQ_TANKS), SPECIAL, STATS, tkList(), tkPrev(), utOf(nation,k)`, cover tables `COV, ARM, NESTCOV`, `FORT_COST, FORTD, FORTA, SLOTS, SLOTS5, maxFort(isSuper,L)`, `HEDGE, DBL_COV, DBL_RATE, BUNKER_CAP, BUNKER_MAX, GARR_T, DEPOT_RATE, SUPER_INC, SUPER_CARD_T, BASE_HP, BW, WH, SEG`.
- `data/nations.js`: `NAT` (with the `blurb += ' Superweapon: …'` merge), `NATS, AI_UNLOCK, AI_INCOME, AI_RAMP, AI_START, AI_W`.
- `data/superweapons.js`: `SW` map.
- `data/tech.js`: `TECH` (order frozen — save-code mask), `TECH_IDS()`.
- `data/cards.js`: `CARDS` as data only: `{id, w, once?, canId?, name, text}` where `canId` ∈ `{'anyTank'}` (the `plate` card's `can`, codex important) — predicates live in `sim/cards.js`. Plus `CARDTXT`.
- `data/maps.js`: `MAPS` with rivers as **precomputed literal numbers** (they embed the default 9-trench LX math from lines 658–659; the river map is only played at 9 trenches, so literals preserve behaviour).
- [x] **Failing tests** `tests/unit/data.test.js`, then implement, then pass:
```js
import { describe, expect, it } from 'vitest';
import { NATS } from '../../src/data/nations.js';
import { STATS, tkList, SPECIAL, UT } from '../../src/data/units.js';
import { CARDS, CARDTXT } from '../../src/data/cards.js';
import { TECH, TECH_IDS } from '../../src/data/tech.js';
import { MAPS } from '../../src/data/maps.js';
import { SW } from '../../src/data/superweapons.js';

it('every nation has rifle, mg and at least one armour slot', () => {
  for (const n of NATS) {
    expect(STATS[n].rifle?.cost, n).toBeGreaterThan(0);
    expect(STATS[n].mg?.cost, n).toBeGreaterThan(0);
    expect(tkList(n).length, n).toBeGreaterThan(0);
  }
});
it('tkList is cheapest-first', () => {
  for (const n of NATS) { const l = tkList(n); for (let i = 1; i < l.length; i++) expect(STATS[n][l[i - 1]].cost).toBeLessThanOrEqual(STATS[n][l[i]].cost); }
});
it('card ids unique; CARDTXT keys are card ids; canId values known; TECH ids unique', () => {
  const ids = CARDS.map(c => c.id);
  expect(new Set(ids).size).toBe(ids.length);
  for (const n in CARDTXT) for (const id in CARDTXT[n]) expect(ids).toContain(id);
  for (const c of CARDS) if (c.canId) expect(['anyTank']).toContain(c.canId);
  const tids = TECH.flatMap(b => b.nodes.map(n => n.id));
  expect(new Set(tids).size).toBe(tids.length);
});
it('save-code mask order is pinned in full (append-only contract)', () => {
  expect(TECH_IDS()).toEqual(['marks','kit','craft','vets','deep','walls','guns','aid','stock','rail','econ','intel','mech','gunnery','works','corps','titan']);
});
it('every non-base damage unit declares atk or is a base type', () => {
  const base = new Set(Object.keys(UT));
  for (const n of NATS) for (const k in STATS[n]) { const T = STATS[n][k]; if (T?.dmg && !base.has(k)) expect(typeof T.atk, `${n}:${k}`).toBe('string'); }
  for (const k in SPECIAL) { const T = SPECIAL[k]; if (T.dmg && !base.has(k)) expect(typeof T.atk, k).toBe('string'); }
});
it('each nation has a superweapon; maps cover the four keys', () => {
  for (const n of NATS) expect(SW[n], n).toBeTruthy();
  expect(Object.keys(MAPS).sort()).toEqual(['march', 'open', 'plain', 'river']);
});
```
- [x] Commit: `feat: data modules (units, nations, tech, cards, maps, sw)`.

## Task 4: storage + meta (rewrites the lost tests)

- [x] Implement `src/storage.js`: availability probe; `storage.get(key)` → `localStorage.getItem` wrapped → `{value:<string>} | null`; `storage.set(key,val)` → true | null; `storage` is `null` when localStorage unusable.
- [x] Implement `src/sim/meta.js` (port lines 558–622): `META` (`{points,tech,runs,wins,rev}`), `SAVE_KEYS`, `saveOk`, `parseSave`, `loadMeta()`, `saveMeta()`, `has()`, `makeCode()`, `readCode()`, `codeCheck()`. `saveState()` DOM text moves to UI. `store` ← storage adapter.
- [ ] **Failing tests** `tests/unit/meta.test.js` (jsdom env for localStorage; also fake-storage injection for write failures):
```js
import { beforeEach, describe, expect, it } from 'vitest';
import { META, makeCode, readCode, codeCheck, loadMeta, saveMeta } from '../../src/sim/meta.js';
import { TECH_IDS } from '../../src/data/tech.js';

beforeEach(() => { localStorage.clear(); META.points = 0; META.tech = {}; META.runs = 0; META.wins = 0; META.rev = 0; });

it('round-trips points, tech mask, runs, wins', () => {
  META.points = 123; META.tech = { marks: 1, kit: 1 }; META.runs = 7; META.wins = 3;
  const d = readCode(makeCode());
  expect(d.points).toBe(123); expect(d.tech).toEqual({ marks: 1, kit: 1 }); expect(d.runs).toBe(7); expect(d.wins).toBe(3);
});
it('rejects bad checksum, wrong prefix, junk', () => {
  expect(readCode('TL1-0-0-0-0-ZZ')).toBeNull();
  expect(readCode('hello')).toBeNull();
  const c = makeCode(); const body = c.slice(0, c.lastIndexOf('-'));
  expect(readCode(body + '-AAAA')).toBeNull();
  expect(readCode('TL2-' + c.split('-').slice(1).join('-'))).toBeNull();
});
it('prunes tech whose predecessor is missing (mask bit 1 = kit requires marks = bit 0)', () => {
  const body = 'TL1-5-2-0-0';                    // mask 2 = kit only
  expect(readCode(body + '-' + codeCheck(body)).tech).toEqual({});
  const ok = 'TL1-5-3-0-0';                       // mask 3 = marks+kit
  expect(readCode(ok + '-' + codeCheck(ok)).tech).toEqual({ marks: 1, kit: 1 });
});
it('two-slot recovery: higher rev wins across slots', async () => {
  META.points = 10; META.tech = {}; META.runs = 1; META.wins = 1; META.rev = 5; // code for rev 5 slot a
  const aCode = makeCode();
  META.points = 20; META.rev = 9;
  const bCode = makeCode();
  localStorage.setItem('trenchline-meta', JSON.stringify({ code: aCode, rev: 5, ts: 100 }));
  localStorage.setItem('trenchline-meta-b', JSON.stringify({ code: bCode, rev: 9, ts: 50 }));
  await loadMeta();
  expect(META.points).toBe(20); expect(META.rev).toBeGreaterThanOrEqual(9);   // resaved both slots
});
it('equal revs: newer timestamp wins; corrupt slot repaired; legacy JSON shape loads', async () => {
  META.points = 7; META.tech = { marks: 1 }; META.runs = 2; META.wins = 0; META.rev = 3;
  const code = makeCode();
  localStorage.setItem('trenchline-meta', JSON.stringify({ code, rev: 3, ts: 999 }));
  localStorage.setItem('trenchline-meta-b', JSON.stringify({ code, rev: 3, ts: 1 }));
  await loadMeta(); expect(META.points).toBe(7);
  localStorage.setItem('trenchline-meta', 'garbage');
  await loadMeta(); expect(META.points).toBe(7); expect(localStorage.getItem('trenchline-meta')).not.toBe('garbage');
  localStorage.clear();
  localStorage.setItem('trenchline-meta', JSON.stringify({ points: 31, tech: { marks: 1 }, runs: 4, wins: 2 })); // legacy direct object
  await loadMeta(); expect(META.points).toBe(31); expect(META.tech).toEqual({ marks: 1 });
});
it('both slots invalid → defaults; failed writes reported via saveOk', async () => {
  localStorage.setItem('trenchline-meta', 'x'); localStorage.setItem('trenchline-meta-b', 'y');
  await loadMeta(); expect(META.points).toBe(0);
  await saveMeta(); expect(META.rev).toBe(1);        // both writes succeed in jsdom
});
```
- [x] Pass, commit: `feat: storage adapter + save codes (lost tests rewritten)`.

## Task 5: sim state container (no newGame yet — codex blocker)

- [x] **Failing tests** `tests/unit/state.test.js` (node env, **no localStorage/browser globals** — proves DOM freedom):
```js
import { describe, expect, it } from 'vitest';
import { G, mods, setLayout, applyTech } from '../../src/sim/state.js';
import { META } from '../../src/sim/meta.js';

it('setLayout per map: open=9 trenches, plain=17, march=45', () => {
  for (const [map, n] of [['open', 9], ['plain', 17], ['march', 45]]) {
    setLayout(map);
    expect(G.NT, map).toBe(n); expect(G.LX.length).toBe(n + 2);
    expect(G.HQI).toBe(n + 1); expect(G.WW).toBeGreaterThan(G.LX[G.HQI]);
  }
});
it('march marks the middle super trench; plain marks two double trenches', () => {
  setLayout('march'); expect(G.SUPER).toBe(23); expect(G.DBL).toEqual([]);
  setLayout('plain'); expect(G.SUPER).toBe(-1); expect(G.DBL).toEqual([4, 14]);
});
it('mods() covers every ORDER key plus specials', () => {
  const m = mods();
  for (const k of ['rifle','mg','raider','sniper','mortar','tank','tkL','tkM','tkH','tkS','bunker','colossus','tsar','char2c','nest','pillbox','depot','pit75','pit65','carrier','guncarrier']) {
    expect(m.dmg[k], k).toBe(1); expect(m.cd[k], k).toBe(1); expect(m.cost[k], k).toBe(1);
  }
});
it('applyTech applies exactly the owned nodes', () => {
  // minimal hand-built state (newGame not required)
  G.M = [mods(), mods()]; G.S = { supplies: 0, unlocked: {} }; G.bases = [{ max: 2500, hp: 2500, dmg: 1 }, { max: 2500, hp: 2500, dmg: 1 }];
  META.tech = { marks: 1, walls: 1, stock: 1, rail: 1, titan: 1 };
  applyTech();
  expect(G.M[0].dmg.rifle).toBeCloseTo(1.1);
  expect(G.bases[0].max).toBe(2900);
  expect(G.S.supplies).toBe(40);
  expect(G.M[0].income).toBeCloseTo(3.4);
  expect(G.S.unlocked.tkS).toBe(true);
});
```
- [x] Implement `src/sim/state.js`: `G` (all fields from Porting rules + `reduceMotion:false`), `mods()` (689–693), `setLayout` (665–676), `fmt`, `lineName(L)` (needs `G.HQI`), `applyTech` (623–639), `relabelCards` (1307–1320 — lives here: needs only data + `G.nation`, avoiding a state→cards cycle at module level). `newGame` is NOT here yet (Task 6).
- [x] Pass, commit: `feat: sim state container`.

## Task 6: sim geometry + newGame

- [x] **Failing tests** `tests/unit/geometry.test.js`:
  - `posX` derived from source: for a trench line both sides use the same zigzag: `posX(0,L,y,0) === posX(1,L,y,0) === trenchX(LX[L],y)` = `cx±6` alternating per `SEG` band (y/SEG floor parity); double trench offsets ±14 via the `y*0.61` parity. Own-HQ line: player `LX[0]+55` (foot) / `+52+tank` (vehicle park); enemy mirrored `-85/-72`. Attacking the foe HQ from the west: `LX[HQI]-85`.
  - `startX`: `open` → `LX[0]-14`; `march` → `LX[L-1]-14` for player sending to L (clamped to own HQ), mirrored for enemy.
  - `spawn(0,'rifle',3,true)` settled at `posX`, full hp, `cd` randomised by rng; unplaced spawns at `startX` unsettled.
  - `tanks()` sums `T.w` skipping `T.sup`; `full()` respects `NAT.gb.tanks=8` / `inf=40` caps (spawn to the cap, expect block).
  - `frontLine()`, `countAt`, `power`, `cost` with modifiers.
- [x] **Failing tests** appended to `tests/unit/geometry.test.js` — `newGame`:
  - spawns opening infantry both sides (gb: `Math.round(120/20)=6` riflemen; `vets` tech → worth 80 more), sets `owner[0]=0, owner[NT]=1, owner[HQI]=1`, `sel=1`, `running=true`, `sw` reset, `aim=null`, `G.tracers/shells/...` cleared.
  - nation traits applied: gb `cd.rifle ×0.85`, it `cover ×0.85`, us income 2.3/growth 0.4, aq 2/0.7, aq starts 15 supplies else 40.
  - **determinism**: `newGame('de','fr','river',99)` twice → identical `[type,x*10,y*10]` snapshots; different seeds differ.
- [x] Implement `src/sim/geometry.js` (lines 719–760: `trenchX, posX, isTrench, pickLane(rng), startX, spawn, count, tanks, anyTank, tkCan, full, countAt, power, cost, frontLine`; re-export `ut(side,k)=utOf(G.nation[side],k)`) and complete `newGame(mine,theirs,map,seed)` in `sim/state.js` (694–717 minus DOM: emit `game:start`, `dirty:map`, `dirty:buy`, `hud`; `cam/camT` stay UI-side; `rng.reseed(seed ?? defaultSeed())` first thing).
- [x] Pass, commit: `feat: geometry, spawn, seeded newGame`.

## Task 7: sim combat — damage rules

- [x] **Failing tests** `tests/unit/combat-damage.test.js` — pin every row of the tables via direct `hurt` calls (spawn attacker/victim with `newGame('gb','de','open',1)`, place victims by setting `x/y/line/settled`):
```js
// helper: mk(side,type,L,settled) → unit; hurtU(e, dmg, atk, attacker?, cov?, area?)
it('settled rifleman in unfortified trench takes 25% (COV.rifle)', …);      // hp -0.25×dmg
it('each fort level deepens cover (FORTD 1,0.85,0.72,0.6,0.5)', …);
it('raiders ignore trench cover; same-trench settled attackers ignore it', …);
it('sniper 0.5, mortar 0.7, tank 0.6, base 0.3, raider 1.0, barrage 0.7; HQ line troops 0.5', …);
it('armour: rifle 0.1, mg 0.15, sniper 0.1, raider 0.6, mortar/tank 1; thin doubles sub-0.5 rows', …);
it('Maxim shield ×0.55 vs rifle/mg/sniper/base only', …);
it('nests use NESTCOV; pillbox & bunker use their own ncov; soft units take 0.6', …);
it('bunker shelter: direct hits redirect to the bunker; splash does not reach sheltered troops; exposed troops hurt normally', …);
it('double trench ×0.55 on top of cover; Italy ×0.85 nation cover', …);
it('die(): enemy death pays 0.25×cost bounty, bumps kills/cardKills, card at need threshold; armour death adds wreck+scorch', …);
```
- [x] Implement `src/sim/combat.js` part 1: `hurt` (762–777), `HQG/accVs` (778–779), `die` (780–790), `hurtBase` (791–794), effect pushers `puff/boom/tracer` (795–797) writing to `G.smoke/G.booms/G.tracers`. Export for tests.
- [x] Pass, commit: `feat: damage model + die/bounty`.

## Task 8: sim fortify (before stepUnits — codex blocker)

- [x] **Failing tests** `tests/unit/fortify.test.js`:
  - `freeSlot`: 3 slots normal trench, 5 in double; occupied by built nests and pending jobs.
  - `buildNest` spawns sapper job at the right slot coords; `stepJobs`: gun carrier after 4 s, completes after 3 s more + arrival → nest occupies slot; killed sapper abandons job (toast event); completed job removes carriers.
  - `buildDef` per nation: gb wire at `LX[L]+54` w46 hp140; ru 10 mines spread over height; fr pit75; us depot (income +0.8 each via DEPOT_RATE; second depot in same trench blocked); it pit65; aq bunker through slots, ≤2 per trench, shelters handled in Task 9 test.
  - `buildSuper(side)`: pillbox/pit75/pillbox fixed units at slots 0/1/2, hp ×1.6.
  - `fortify` (command form `fortifyAt(L)` ownership/cost/max-level checks live here per Porting rule; costs FORT_COST[lv], max 3, SUPER 4) — success increments and charges once, rejects charge nothing.
  - `stepFields`: mines detonate on enemy within 13 px (60 dmg 'barrage' splash 28), wire slows (0.3) and is destroyed by armour contact, dead fields removed.
- [x] Implement `src/sim/fortify.js` (port lines 989–1110: `freeSlot, wireSlow, stepFields, bunkerCount, stepBunkers, canDef, buildDef, buildSuper, buildNest, stepJobs, fortifyAt`). Imports `hurt` from combat (function-body use only).
- [x] Pass, commit: `feat: fortification, nests, bunkers, minefields, wire`.

## Task 9: sim combat — stepUnits (+ the bug fix)

- [x] **Failing tests** `tests/unit/combat-step.test.js` (fixed `dt` driving):
  - movement toward `posX` target; blocked halt when enemy within 40 px (not same trench); `moveFire` gating; min range respected.
  - rivers: non-big units funnel to nearest bridge band `b±BW`, hold at river edge until aligned; big units cross straight.
  - **hedgehogs** (port of legacy merge test): enemy holds double trench 14 → player tank halts at `LX[14]-(94+len+8)`, tsar (`big`) passes; once player infantry hold 14 the tank passes.
  - firing cooldowns `cd×(0.85..1.15)` via rng; magazine: BAR `mag:20` then `reload:1.7`; jam: Chauchat `jam:0.06` forces cd 2.4; shells carry `atk` type, splash, cov, arc, `base` flag.
  - **stray-tracer regression (the fix)**: acc:1 rifleman fires → exactly one hit tracer, no faint tracer; acc:0 → exactly one faint miss tracer; shell weapons draw no tracer either way.
  - HQ guns fire within 270 only, `0.55×accVs` hit chance.
  - shell landings: splash damages units inside radius only (with cov); `base` shells hit HQ for full `dmg`; siege shells strip fort levels at ~40%/hit; huge (Paris) shell razes forts within `rz`, splash falloff `1-0.55·d/r`, HQ damage `0.8×(1-0.4·…)`, sets `G.shake` only when `!G.reduceMotion`.
  - ownership: line flips to the only settled side; unchanged when mixed/empty.
  - nest capture flips to the side that solely holds its line (with hp floor 50%, cd 1, toast).
  - AH garrison: ≥3 settled own non-armour troops accrue `garr[L]`; at `GARR_T[fort]` fort++ and reset.
  - bunkers via `stepBunkers`: settled troops walk in ≤6, fire at full effect from ~30 px behind; bunker death exposes survivors; side/line change releases.
  - barrage card: with `M[0].barrage=3`, every 10 s spawns 3 shells on the frontmost settled enemy (test injects state).
- [x] Implement `stepUnits` (799–987) in `sim/combat.js`, calling `stepFields/stepBunkers/stepJobs` from fortify (function-body imports). Replace the firing block at 885–891 with:
```js
if (best && bd <= T.range) {
  u.cd = T.cd * m.cd[u.type] * (0.85 + rng.range(0, 0.3)); u.flash = 0.08;
  if (T.shell) G.shells.push({ x0: ox, y0: oy, x1: best.x, y1: best.y, t: 0, dur: T.shell, side: u.side, type: T.atk || u.type, dmg, splash: T.splash, cov: T.cov, siege: T.siege, arc: T.arc || (u.type === 'mortar' && !T.flat ? 1 : 0.1) });
  else if (rng.float() < T.acc * accVs(u, best)) { tracer(u.x + dir * 9, u.y, best.x, best.y, u.type === 'sniper' ? 1.4 : 1, '#ffe9a8'); hurt(best, dmg, T.atk || u.type, u); }
  else tracer(u.x + dir * 9, u.y, best.x + (rng.float() - 0.5) * 30, best.y + (rng.float() - 0.5) * 30, 0.8, 'rgba(255,233,168,.6)');
  if (T.jam && rng.float() < T.jam) u.cd = 2.4;
  if (T.mag) { u.shots = (u.shots || 0) + 1; if (u.shots >= T.mag) { u.shots = 0; u.cd = T.reload; } }
}
```
  (the original fired the faint miss tracer unconditionally for non-magazine weapons — DESIGN.md "Known quirks" #3).
- [x] Pass, commit: `feat: stepUnits — movement, rivers, hedgehogs, fixed miss tracer`.

## Task 10: sim superweapons

- [x] **Failing tests** `tests/unit/superweapons.test.js` per kind (`swBlock` reason strings, one-at-a-time, `st.cd=d.cd` set, cost NOT deducted by useSW — callers do):
  - de Paris: `useSW(0,{x,y})` pushes one huge shell (dmg 700, splash 90, dur 4.5, rz 80, big+huge), clamps target into the field.
  - gb Messines: `swBlock` reports tunnelling; `stepSW` counts down 25 s then `detonate` kills occupants within 70 px (1e6 infantry / 400 nest / 300 armour), razes forts if trench not held, 8 booms, shake.
  - fr char2c / ru tsar / aq colossus: spawn one at the right line, `swBlock('Already in the field.')` while alive, `T.sup` skips armour accounting.
  - us bugs: 4 shells `t:-i·0.7`, flight `min(7,max(1.5,dx/230))`.
  - it caproni: plane `(WH+100)/110` s crossing, 8 bombs along the trench column, `base` shells vs HQ.
  - ah skoda42: 3 big razing shells staggered 1.3 s.
  - `aimPoint`: richest 85-px cluster of the foe, HQ fallback.
- [x] Implement `src/sim/superweapons.js` (1112–1196: `targetFor, aimPoint, swBlock, useSW, detonate, stepSW`). Pass, commit: `feat: superweapons`.

## Task 11: sim AI

- [ ] **Failing tests** `tests/unit/ai.test.js`: income ramp `AI_INCOME·(1+t/360)` with us (`min(1.8, 0.75+t/400)`) and aq (`min(2, 0.6+t/300)`) modifiers, +depots+super+dbl; buy loop within armour and inf caps (`full()` respected); `want` state machine: fort/def/nest when holding F past 60 s; sw past 240 s (60%-cost rule for ≥1500); `aiThink` gathers at F, advances on the source's power-ratio rules (deterministic under seed; assert `ai.F` transitions and `lastAdv` pacing); toast on attack.
- [ ] Implement `src/sim/ai.js` (1197–1261). Pass, commit: `feat: enemy commander`.

## Task 12: sim cards (offer state machine — codex important)

- [ ] **Failing tests** `tests/unit/cards.test.js`:
  - pool filters: `once` taken, `canId` failing (`plate` without any unlocked tank), redundant `u_tank` when unlocked, `u_tk*` with unmet prerequisites; `corps` tech forces `u_tank` into the first offer; `intel` → 4 offers.
  - **controlled-rng weight boundaries** (codex important): inject a fake rng object into `buildOffer(rngLike)` returning fixed floats — 0 selects the first (highest cumulative) card, `w_first/total−ε` vs `w_first/total+ε` straddle the boundary; selection is without replacement; every offered id is valid for the pool.
  - `takeCard`: `u_raider` unlocks + spawns 2 raiders at `sel`; `bonds` +1.5 income; `helmet` buffs existing troops (`hp/max ×1.2`); `barrage` 3 then +2; `plate` requires unlocked tank; unlock cards emit `dirty:buy`; `S.taken` counts, `S.pending` decrements, re-offer when more pending.
  - **offer state machine**: repeated `tick`s with `pending>0` produce exactly ONE `cards:offer` event until `takeCard` runs; multiple pending → sequential offers (codex important).
  - `relabelCards` per nation: gb 'Trench raiders' vs de 'Stormtroopers'; ah 'Siege gun: Škoda 30.5 cm'; aq tank text names the Weddell.
- [ ] Implement `src/sim/cards.js`: `CAN` predicates, `buildOffer()` (pure, takes rng) → sets `G.offer={ids}` once, `takeCard(id)` (effects ported from 1264–1286), `pendingOffer()` helper for tick. `relabelCards` stays in state.js (Task 5).
- [ ] Pass, commit: `feat: cards with sim-side offer state`.

## Task 13: sim commands + tick

- [ ] Implement `src/sim/commands.js` (port handler bodies from 1351–1380, 1402–1407, 1502–1518): `select(L)`, `advance()`, `fallback()`, `gather()`, `buyUnit(k)` (unlock/cost/cap checks, deduct, spawn at sel), `buildNestAt(L)`, `buildDefAt(L)`, `fortifyAt(L)` (re-export from fortify), `startAiming()`, `confirmAim()`, `fireSuperweapon()` — each returns success and emits `hud`/`toast`; **purchase charges exactly once, rejection charges nothing** (tests).
- [ ] **Failing tests** `tests/unit/commands.test.js` per command: happy path + each rejection branch (no troops, short of supplies, cap, ownership, line reached) with supply totals asserted before/after.
- [ ] **Failing tests** `tests/unit/tick.test.js`: income accrual `incomeNow` (base+growth+depots+super+dbl); super-trench free card every `SUPER_CARD_T` while held (timer pauses when lost); selected-trench fallback orders (1564–1569) demote `sel` and pull troops back; `bases hp ≤0` → exactly one `game:end` (with won flag + earned points `floor(S.score/4)+30/0`), `running=false`; `cards:offer` when `pending>0 && !G.offer`; effects decay (tracer 0.08 s, boom 0.45, floats rise 22/s, smoke drift, wreck puffs ≤18 s).
- [ ] Implement `src/sim/tick.js` (1552–1573; `endGame` → emit + `META` award via meta.js `awardRun(won, score)`).
- [ ] Pass, commit: `feat: commands + tick + end-of-game award`.

## Task 14: headless smoke + merge parity suites

- [ ] **Failing test** `tests/unit/smoke.test.js` — port of `legacy/tests/smoke.js` without jsdom: every nation vs de and de vs each on `open`; `aq/it` on `river`; `ru/fr` both ways on `plain`; `gb/aq`, `de/it` on `march`. Drive `tick(0.04)` to 240 s; auto-take first offered card (`takeCard(G.offer.ids[0])`); top up supplies/HQ like the original; assert no NaN in unit fields, armour caps respected, no exceptions.
- [ ] **Failing test** `tests/unit/merge.test.js` — port of `legacy/tests/merge.js`: Russia `tkList('ru')==='tank,tkH'`, tank card needed, `NAT.ru.tanks===10`, SW kind `tsar`; `useSW` once then blocked; hedgehog halt/pass at exact x positions; 5 emplacements at double trench 14; income `+4.0` (base 3 + DBL_RATE 1) shown via `incomeNow()`.
- [ ] These are the parity gates: failures mean port bugs — fix sim, not tests. Commit: `test: headless smoke + merge parity suites`.

## Task 15: UI layer

- [ ] `src/ui/hud.js`: `toast` (bus→element, 3.6 s), `refresh()` (1408–1446), `buildMap()` (1387–1392) + strip clicks → `commands.select(L)` + `focusLine` (cam here); listens `hud/toast/dirty:*`.
- [ ] `src/ui/buy.js`: `buildBuy()` (1398–1401) + clicks → `commands.buyUnit(k)`.
- [ ] `src/ui/cards.js`: overlay on `cards:offer` (renders `G.offer.ids` via relabeled CARDS), clicks → `commands`-level `takeCard`, re-offer while pending.
- [ ] `src/ui/overlays.js`: start screen (1519–1537), end screen (1538–1550 + earned points + save code), research overlay incl. node tree, code copy/load, save-state text (1449–1500).
- [ ] `src/ui/input.js`: pointer drag / tap-select / double-tap-fortify (`fortifyAt`), arrow keys, Paris aiming taps (2228–2255).
- [ ] `src/ui/loop.js`: `frame` port (2259–2268) with **exact substep semantics** (codex important): per frame compute `paused` once from overlay visibility, `dt=clamp((now-last)/1000, 0, 0.1)`, `left=dt·speed`, `while(left>0){ const d=Math.min(0.04,left); tick(d); left-=d }`; shake decay; cam easing; 4 Hz refresh; also sets `G.reduceMotion` from `matchMedia` at boot.
- [ ] `src/main.js`: wire bus→UI, `loadMeta()`, `requestAnimationFrame(frame)`; debug hook `window.__trench={units,sw,fields,fort,jobs,step,info,seed,ut,tkList,tanks,full,offer}` armed **only when `location.search` contains `debug` or `e2e`**.
- [ ] **Tests** `tests/unit/ui.test.js` (jsdom env, canvas getContext Proxy stub, rAF stubbed): map strip renders `HQI+1` buttons; `refresh()` updates supplies/rate/army/aria-pressed; buy disabled when short; advance/fallback/gather via commands; pause/speed toggles; card overlay lists offer and picking applies + closes; research overlay renders 4 branches, research spends points, code round-trips through the input; end overlay shows Victory + parseable save code; **loop timing** (controlled clocks: 0.1 clamp, remainder substep, speed ×2, pause when overlay visible, offer-opened-mid-frame pauses next frame).
- [ ] Commit: `feat: ui layer`.

## Task 16: renderer

- [ ] Port drawing (1574–2227) into `src/ui/draw/`: `helpers.js` (ctx transforms, circle/oval/line/at, palette), `terrain.js` (ground, patches, craters, rivers+bridges, `drawTrench`/`drawSuper`, HQ bases, flags, wire/mines/hedgehogs, job ghosts, `makeDecor` with `decor(seed)`), `men.js` (soldier styles per nation, nests/pillboxes/pits/bunkers, carriers), `tanks.js` (`drawTankGen` parts renderer, per-country fallbacks, tsar/char2c/colossus, wrecks), `effects.js` (smoke, tracers, booms, shells incl. Paris warning circle, planes, floats, aim reticle), `index.js` (`draw()` with camera transform + `vis()` culling).
- [ ] **Test** `tests/unit/draw.test.js`: Proxy no-op ctx (legacy `tools/bot.js` pattern); for each nation and map spawn one of every fielded type + nests/bunkers/jobs/wrecks, run `draw()` — no exceptions; `vis()` culls far-camera entities.
- [ ] Manual check via `npm run dev` (desktop + narrow viewport). Commit: `feat: canvas renderer`.

## Task 17: e2e — real page in jsdom

- [ ] `tests/e2e/game.e2e.test.js` + `tests/e2e/vitest.config.js` (like landfall: node env, 120 s timeouts, fileParallelism false):
  - Build page: read `index.html`; bundle `src/main.js` with `esbuild.buildSync({ entryPoints:['src/main.js'], bundle:true, format:'iife', write:false, loader:{'.css':'empty'} })` (esbuild is a direct devDep; CSS stripped — codex blocker); inline the IIFE into the HTML.
  - `new JSDOM(html, { runScripts:'dangerously', pretendToBeVisual:true, url:'https://trench.local/?e2e=1', beforeParse(w){ w.HTMLCanvasElement.prototype.getContext=()=>stubCtx; w.HTMLCanvasElement.prototype.getBoundingClientRect=()=>({width:900,height:300,...}); w.addEventListener('error',…) } })` — stubs installed **before** any script runs.
  - **Playthrough:** pick gb vs de on `open` via real button clicks; grant supplies via hook; buy riflemen; `advance`; double-tap fortify; take a card; fire the Messines mine (gb SW) and let it detonate; rig enemy HQ hp to 1, win; assert end overlay "Victory", earned points, save code parses with `readCode`; "Start a new run" returns to start overlay; replay picks work; zero page errors.
- [ ] `npm run e2e` green. Commit: `test: jsdom e2e playthrough`.

## Task 18: scripts, README, license, workflow

- [ ] `scripts/bot.mjs`: headless scripted player driving sim directly (port `legacy/tools/bot.js` logic; args me foe map seed; `--json`; deterministic per seed).
- [ ] `scripts/gen-stats.mjs`: regen `docs/STATS.md` from `src/data` (port `legacy/tests/gen-stats.js`); `npm run stats`; run and commit refreshed STATS.md.
- [ ] `README.md`: pitch, play link, dev commands, architecture map, **credits: "Designed and authored by M K. Built with the help of the AI agents Claude (Anthropic) and GLM (Z.ai)."**, Apache-2.0, screenshot if cheap.
- [ ] `LICENSE` Apache-2.0 (from landfall, "Copyright 2026 M K"). `package.json` `author:"M K"`, `license:"Apache-2.0"`, homepage/bugs URLs.
- [ ] `.github/workflows/pages.yml` (landfall's) **plus an e2e step**: `npm run check && npm run e2e` before the pages artifact upload (codex important).
- [ ] Commit: `docs: readme, credits, license, pages workflow`.

## Task 19: final review + verification

- [ ] `npm run check` and `npm run e2e` green from clean `node_modules`.
- [ ] Determinism audit: two bot runs same seed → identical summary; `grep -n 'Math.random' src/sim src/data` → zero hits.
- [ ] Cross-model review (codex) of the finished repo — fold in findings (user-requested final review).
- [ ] Manual play sanity on `npm run preview` (start→battle→win/lose→research→save code round-trip→credits visible).

## Task 20: publish

- [ ] `gh repo create cmdjc/trench-line --public --source . --remote origin --description "A top-down First World War trench-battle game"`; `git push -u origin main`.
- [ ] Enable Pages from Actions: `gh api -X POST repos/cmdjc/trench-line/pages -f build_type=workflow` (fall back to `source.branch=main` shape if the API rejects).
- [ ] `gh run watch`; verify `https://cmdjc.github.io/trench-line/` serves the built game (fetch: expect `Trench Line` title + built asset references).
- [ ] Update PLAN.md checkboxes; final summary to owner.

---

## Risks / notes

- **LX coupling in maps.js**: river bridge coordinates were computed from the default 9-trench layout at load time; freezing them as literals preserves behaviour (river map is only played on 9 trenches).
- **ESM cycles** (combat↔fortify, state↔cards): allowed only with function-body references; the parity suites gate this.
- **Save-code compat**: `TECH` order frozen (pinned test in Task 3); append-only or bump the `TL1` prefix.
- Balance quirks from DESIGN.md are intentionally preserved (bunker slot sharing, plain-map walk-from-HQ, Paris price, etc.).
- jsdom cannot run `<script type="module">` — hence the esbuild IIFE e2e wrapper; the wrapper itself is proven by Task 17 passing.
