# Saxon Dominion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a ninth playable nation, the Saxon Dominion (`sx`). It has a tough, slow 20-man infantry roster. Its raider slot holds the Rammstoßtrupp, a squad that fires a mortar at range and a ram inside the mortar's dead zone. It also gets a four-tier walking-mech line (Kobold, Krampus, Erlkönig, Eisenhans), a Rübezahl superweapon, and a Repair Workshop defence that mends settled mechs holding its trench.

**Architecture:**
- **Data:** Saxony uses the shapes every nation already uses. `NAT.sx`/`NATS` go in `nations.js`. `NU.sx` goes in `units.js`, with the four base infantry overrides plus `NU.sx.raider` as the Rammstoßtrupp. An `SX_TANKS` table is built with `tkv()` exactly like `AQ_TANKS`. `SPECIAL.ruebezahl` (built with `tkv`, like `SPECIAL.colossus`) and `SPECIAL.workshop` (a `noFire` nest, like `SPECIAL.depot`) also go in `units.js`. One `sx` row is added to each per-nation side table that tests and UI already require for every nation: `SW`, `BASE`, `GUNS`, `TRAINS`, `ARMOR_TRAINS` and `CARDTXT`.
- **Dual weapon:** the Rammstoßtrupp's top-level stats are a normal mortar profile (`shell`, `splash`, `min`, `atk: 'mortar'`). A nested `ram` sub-profile follows the `T.mg` sidearm convention. In `stepUnits`, a unit with `T.ram` searches targets with no minimum range. If the nearest target is closer than `T.min`, it fires the ram (an instant hit). Otherwise the existing mortar code runs unchanged. There is one cooldown and one fire branch, so a unit can never fire both weapons in a frame.
- **Workshop:** `buildDef` builds it through `buildNest(side, L, 'workshop')`, like the depot. Whether a trench has one is answered by the `G.units` scan the depot already uses (`u.T.workshop && u.side === side && u.line === L`). The passive heal line (`combat.js:137`) gains a mech-only additive term.

**Tech Stack:** Vanilla ES modules, canvas, Vite, Vitest (+ jsdom), jsdom e2e.

**Spec:** `docs/superpowers/specs/2026-11-25-saxon-dominion-design.md`

**Branch:** work in place on `feat/saxon-dominion` (the project declines worktrees). Only the bot baseline in Task 7 uses a throwaway `main` worktree in the scratchpad.

**Spec facts corrected by reading the code (the plan follows the code):**
- The passive heal at `combat.js:137` is `if (u.settled && m.heal && isTrench(u.line) && u.hp < u.max && !exposed(u)) u.hp = Math.min(u.max, u.hp + m.heal * dt);`. It is **not** infantry-only, since it has no `T.armor` gate. `m.heal` is 0 by default (`mods()`), and only the Field Hospital, the Aid posts research and the Stretcher bearers card raise it. The Workshop therefore adds a separate, mech-only rate on top of `m.heal`. It does not open a gate that was closed.
- Adding a nation also requires rows in `BASE` (national upgrade track), `GUNS` (HQ gun), `TRAINS`, `ARMOR_TRAINS` and `CARDTXT`, plus a flag and an emblem. `data.test.js` asserts the first four for every nation. `flag()`'s fallback branch draws the Union Jack and `emblem()`'s draws Austria's colours. The spec is silent on all of these. The plan sets them (marked *my call*) so they are non-economic and fit the spec's themes.

## Global Constraints

- `src/sim/**` and `src/data/**` stay browser-free.
- **The eight existing nations are untouched.** Task 1 commits a fixture taken from the unmodified tree. It holds a JSON snapshot of every existing nation's data, plus seeded replay digests of four non-Saxon battles. A test then asserts byte equality on every later task. Never regenerate that fixture on this branch.
- **Determinism:** no new rng draws on any path that runs when no side is `sx`. All new draws sit in the ram branch (`T.ram`, only on `STATS.sx.raider`) and in Rübezahl's existing-style firing (only once Rübezahl is spawned). The workshop heal and the weapon switch are pure arithmetic and draw nothing.
- **One weapon per frame:** a Rammstoßtrupp fires its ram or its mortar, never both. Both share `u.cd`, and the `continue` gate at `combat.js:157` is unchanged.
- **Switch boundary:** ram when `bd < T.min`, mortar when `bd >= T.min`. At exactly `T.min` it fires the mortar, matching the existing inclusive `d >= minR`. `T.ram.range === T.min` (a data invariant), so the dead zone has no gap where neither weapon reaches.
- **Workshop scope:** it heals only a unit with `T.armor` that is `settled`, `!exposed`, on `isTrench(u.line)`, has `u.hp < u.max`, and stands on the same `line` as a living workshop with `w.side === u.side`. It never heals infantry (their heal stays exactly `m.heal * dt`), enemy mechs, unsettled mechs, or mechs on another line.
- **Legs are cosmetic only:** no sim file reads `legs`. No regular mech gets `big` (which would skip rivers and hedgehogs). Only Rübezahl is `big`, the same as every other superweapon tank (`tsar`, `colossus`). `grep -rn "legs" src/sim src/data/nations.js` stays empty.
- **No economic trait:** `newGame` and `aiStep` get no `sx` income branch. No `sx` base tier touches income or cost.
- **No player-visible "raider" for Saxony:** `STATS.sx.raider.name`, `.pl`, `.role` and `CARDTXT.sx.u_raider` never match `/raider/i`. The internal key stays `raider`.
- JS strings use `\u` escapes for non-ASCII, matching the file style: `Rammstoßtrupp`, `Rübezahl`, `Erlkönig`, `Sächsische`.
- **Starting numbers** are below (tune only in Task 7). Saxony's rifle/mg/sniper/mortar overrides stay within ±15% of the matching `UT` value for every numeric field they override.

  **Nation (`NAT.sx`, appended last in both `NAT` and `NATS`):** `{ name: 'Saxon Dominion', body: '#4a4e52', hat: '#1f2124', style: 'stahl', inf: 20, tanks: 8, nest: 'nest', nestLabel: 'MG nest', def: { kind: 'workshop', label: 'Repair workshop', cost: 110 }, blurb: <below> }`. `style: 'stahl'` reuses Germany's helmet (the spec allows it, and it means no new helmet art).

  Blurb: `Defence: repair workshops that mend mechs dug in at their trench. Only 20 infantry, tougher and slower than most, and the Rammstoßtrupp lobs mortar bombs at range and rams anything that gets inside them. Its armour walks: boxy mechs on jointed legs, from the little Kobold through the long-range Erlkönig to the Eisenhans fortress.` The module-level loop then appends ` Superweapon: Rübezahl.`

  **Infantry (`NU.sx`):**

  | Key | name / pl | cost | hp | speed | role |
  |---|---|---|---|---|---|
  | `rifle` | Grenadier / Grenadiers | 22 | 46 | 40 | `Tough, steady rifleman. A little slower than most.` |
  | `mg` | Dreyse gunner / Dreyse gunners | 64 | 51 | 28 | `Heavy gun crew. Sturdy, but slow to move.` |
  | `sniper` | Jäger / Jäger | 60 | 34 | 37 | `Long reach. Picks men out of trenches.` |
  | `mortar` | Granatwerfer crew / Granatwerfer crews | 98 | 40 | 27 | `Shells trenches up to two lines away. Sturdy crew.` |

  **Rammstoßtrupp (`NU.sx.raider`):** `{ name: 'Rammstoßtrupp', pl: 'Rammstoßtrupps', cost: 70, hp: 90, shield: 0.7, speed: 34, atk: 'mortar', dmg: 18, cd: 4.5, range: 400, min: 90, splash: 28, shell: 1.1, arc: 1, sprite: 'ramm', ram: { dmg: 24, cd: 1.2, range: 90, acc: 0.8, atk: 'raider', heavy: 2 }, role: 'Armoured assault squad. Lobs mortar bombs at range and rams anything that gets inside the mortar’s reach. The ram hits armour and emplacements hard.' }`.
  - `shield: 0.7` is the "medium armour". It reuses the Maxim's existing `T.shield` path in `hurt()`, which cuts rifle, mg, sniper and base fire.
  - `arc: 1` is required because the shell-push fallback keys on `u.type === 'mortar'`, and this unit's `u.type` is `'raider'`.
  - `ram.atk: 'raider'` makes the ram ignore trench cover and the fortification accuracy penalty (`accVs` returns 1 for raider fire). It takes ARM 0.6 against armour. `heavy: 2` multiplies the ram's damage against any target with `T.armor`, `T.nest` or `.train`.

  **Mechs (`SX_TANKS`, the `[o, d, mgOnly]` row shape of `AQ_TANKS`, built with `tkv`):**

  | Key | Name (pl) | cost | hp | dmg | cd | range | splash | speed | w | other |
  |---|---|---|---|---|---|---|---|---|---|---|
  | `tkL` | Kobold (Kobolds) | 85 | 160 | 5 | 0.2 | 220 | — | 44 | 0.5 | mgOnly, `thin: true`, park 26, len 12, bar [20,-15] |
  | `tank` | Krampus (Krampus mechs) | 300 | 650 | 30 | 1.5 | 240 | 22 | 19 | 1 | `mg: { dmg: 5, cd: 0.24, range: 210, acc: 0.5 }`, park 40, len 22, bar [34,-22] |
  | `tkM` | Erlkönig (Erlkönig mechs) | 430 | 360 | 60 | 4.2 | 620 | 36 | 16 | 1.5 | `atk: 'mortar'`, `min: 140`, `shell: 1.8`, `arc: 2`, `cov: 0.75`, `moveFire: false`, `thin: true`, `rear: true`, park 44, len 18, bar [30,-20] |
  | `tkH` | Eisenhans (Eisenhans mechs) | 720 | 2000 | 46 | 1.6 | 260 | 26 | 11 | 3 | `mg: { dmg: 6, cd: 0.18, range: 230, acc: 0.5 }`, park 50, len 32, bar [44,-28] |

  Roles: Kobold `Small, quick scout mech on two pairs of legs. Machine gun only, and bullets hurt it.`; Krampus `Versatile medium mech with a turret gun and a machine gun.`; Erlkönig `Walking artillery. Enormous reach, but thin armour and it cannot fire up close or on the move.`; Eisenhans `Walking fortress. Very heavy armour, a big gun and machine guns, but very slow.`

  **Rübezahl (`SPECIAL.ruebezahl`):** `tkv({ name: 'Rübezahl', cost: 1800, hp: 6000, dmg: 95, cd: 2.0, range: 360, splash: 42, speed: 9, big: true, sup: true, park: 90, len: 70, bar: [80, -50], crush: 54, crushDps: 120, mg: { dmg: 6, cd: 0.12, range: 260, acc: 0.5 } }, <draw>)`. `SW.sx = { kind: 'ruebezahl', name: 'Rübezahl', cost: 1800, cd: 140, text: 'The mountain giant: a 6,000-health walking fortress with heavy guns, machine guns and crushing feet. One at a time.' }`.

  **Workshop:** `SPECIAL.workshop = { name: 'Repair workshop', cost: 110, hp: 240, dmg: 0, cd: 9, range: 0, acc: 0, speed: 0, nest: true, noFire: true, workshop: true }`. `WORKSHOP_HEAL = 6` (hp/s), exported from `units.js` beside `BUNKER_CAP`.

  **Side tables (*my call*):**
  - `BASE.sx = { name: 'Ore Mountain Foundry', tiers: [`Repair workshops mend mechs ${pct(FOUNDRY_HEAL)}% faster.`, `Rübezahl is ready again after ${FOUNDRY_CD} seconds instead of ${SW.sx.cd}.`, `Rübezahl has ${pct(FOUNDRY_HP)}% more health.`] }`, with `FOUNDRY_HEAL = 1.5, FOUNDRY_CD = 100, FOUNDRY_HP = 1.3` in `data/base.js`.
  - `GUNS.sx = { name: '15 cm sFH battery', range: 5, cost: 70, cd: 16, shells: rep(2, { dmg: 80, splash: 34, cov: 0.8, spread: 24, dur: 2, arc: 2.5 }, 0.4) }`.
  - `TRAINS.sx = { name: 'Sächsische Feldbahn', cost: 160, hp: 340, cap: 6, speed: 125 }`.
  - `ARMOR_TRAINS.sx = { name: 'Sächsischer Panzerzug', cost: 420, hp: 680, speed: 120, dmg: 28, cd: 1.8, range: 250, splash: 22, shell: 0.25, mg: { dmg: 5, cd: 0.21, range: 270, acc: 0.5 } }`.
  - `CARDTXT.sx`:
    - `u_raider: ['Rammstoßtrupps', 'Unlocks the Rammstoßtrupp: an armoured squad that lobs mortar bombs at range and rams anything that gets inside them. Two arrive now.']`
    - `u_mortar: ['Granatwerfer crews', 'Unlocks the Granatwerfer: a trench mortar that shells up to two trench lines away. One arrives now.']`
    - `u_tank: ['Mech unlock: Krampus', 'Unlocks the Krampus: a versatile medium mech with a turret gun and a machine gun.']`
- `npm run check` and `npm run e2e` pass at the end of every task.

## Review Focus

1. **The switch at the exact `T.min` boundary.** A target at `bd = 89.999` gets the ram (instant hit, no shell). A target at exactly `90` gets a mortar shell. No frame ever pushes a shell *and* draws a ram tracer, even when one foe sits inside `min` and another outside it. A non-Saxon mortar with a foe inside `min` still stands idle, as it does today. (Task 3 tests `boundary`, `one weapon per frame`, `other mortars still idle up close`.)
2. **The Workshop heals only a mech dug in at its trench.** It heals a settled own mech at the workshop's line. It never heals a mech walking through or retreating past that trench, a mech settled one line over, an enemy mech on that line, or infantry beyond `m.heal`. (Task 4 tests.)
3. **Heavy units don't trivialise holding a trench.** Rübezahl and Eisenhans must help push, not hold lines alone. Task 7 runs the anti-goal matrix (forced-heavy bot preference on plain/march, plus the enemy fielding them as `sx`) against the ±20-point bands.
4. **No new rng when nobody plays Saxony.** The Task 1 replay digests (four seeded non-`sx` battles) match exactly after every task. Task 3/4 tests show the workshop heal draws nothing. The Task 7 control rows are byte-identical to the `main` baseline.
5. **The eight nations are provably untouched.** The Task 1 data snapshot (STATS, NAT, SPECIAL, SW, BASE, GUNS, TRAINS, ARMOR_TRAINS, CARDTXT, damage tables and AI tables, for the existing keys only) stays deep-equal after every task. Task 2 Step 6 adds a diff check that the only removed lines in `src/data/` are the `NATS` line and the `STATS` literal line.

---

### Task 1: Eight-nation guard fixture

**Files:**
- Create: `tests/unit/eight-nations.js` (helper, not a test file)
- Create: `tests/unit/fixtures/eight-nations.json` (generated, committed)
- Create: `tests/unit/eight-nations.test.js`

**Interfaces:**
- Produces: `export const OLD = ['gb', 'de', 'fr', 'ru', 'us', 'ah', 'it', 'aq']`. Also `export function dataSnapshot()` returns a plain object, `export function replayDigest(me, foe, map, seed, secs)` returns a plain object, and `export function guard()` returns `{ data: dataSnapshot(), replays: { 'gb-de-open-7': …, 'aq-it-river-3': …, 'ru-fr-plain-5': …, 'us-ah-march-2': … } }` (each `secs = 120`).
- `dataSnapshot()` returns `JSON.parse(JSON.stringify(...))` of:
  - `STATS`, `NAT`, `SW`, `GUNS`, `TRAINS`, `ARMOR_TRAINS` and `CARDTXT`, each restricted to `OLD` keys;
  - `SPECIAL`, restricted to its 12 current keys (`tommy carrier guncarrier nest pillbox tsar char2c depot pit75 pit65 bunker colossus`);
  - `BASE`, restricted to `walls depot hosp` plus `OLD`;
  - `UT`, `TKB`, `ARM`, `COV`, `NESTCOV`, `AI_W` and `AI_UNLOCK` in full.
- `replayDigest` runs `newGame(me, foe, map, seed)` and then `tick(0.04)` `secs / 0.04` times. It returns `{ t: G.S.t, bases: G.bases.map(b => b.hp), owner: [...G.owner], units: G.units.map(u => [u.type, u.side, u.line, u.x, u.y, u.hp]), next: rng.float() }`. Compute `dataSnapshot()` before any replay (newGame mutates `CARDS`, which is why `CARDS` is excluded).

- [ ] **Step 1:** Write the helper. Confirm the tree is unmodified (`git status` clean, HEAD `2c5e28f` or a later docs-only commit). Then generate the fixture: `node -e "import('./tests/unit/eight-nations.js').then(m => require('fs').writeFileSync('tests/unit/fixtures/eight-nations.json', JSON.stringify(m.guard())))"`.
- [ ] **Step 2:** Write `eight-nations.test.js`, with a header comment saying the fixture was taken from the pre-Saxony tree and must not be regenerated on this branch. Its tests are `existing nation data is unchanged` (`expect(dataSnapshot()).toEqual(fixture.data)`) and one `replay <key> is unchanged` per replay (`expect(replayDigest(...)).toEqual(fixture.replays[key])`, timeout 120 s).
- [ ] **Step 3:** Run `npx vitest run tests/unit/eight-nations.test.js`. Expect PASS. Run it a second time and expect PASS again, which proves the replay is stable.
- [ ] **Step 4:** Commit `test: pin the eight existing nations' data and seeded replays`.

### Task 2: Saxony data, side tables and nation count

**Files:**
- Modify: `src/data/nations.js` (`NATS` append `'sx'`, `NAT.sx` last)
- Modify: `src/data/units.js` (`NU.sx` after `NU.aq`, `SX_TANKS` after `AQ_TANKS`, `sx: {}` in the `STATS` literal, `SPECIAL.ruebezahl` and `SPECIAL.workshop` after `SPECIAL.colossus`, `WORKSHOP_HEAL`)
- Modify: `src/data/superweapons.js`, `src/data/base.js`, `src/data/guns.js`, `src/data/rail.js`, `src/data/cards.js` (one `sx` row each, plus the `FOUNDRY_*` constants)
- Modify: `src/sim/state.js:63` (`mods()` key list: append `'workshop', 'ruebezahl'`; without them `m.dmg[u.type]` would be `undefined`, giving NaN)
- Modify: `scripts/gen-stats.mjs` (`DEF.workshop = 'Repair workshop'`; add `'workshop', 'ruebezahl'` to the specials list)
- Test: `tests/unit/data.test.js`, `tests/unit/smoke.test.js` (local `NATS` append `'sx'`), `tests/unit/ui.test.js:689,691` (8→9, 7→8), `tests/e2e/game.e2e.test.js:101,105,250` (title "nine nations", 8→9)

**Interfaces:**
- Consumes: the Task 1 guard.
- Produces: every value in Global Constraints, read through `NAT.sx`, `STATS.sx.<key>`, `SPECIAL.ruebezahl`, `SPECIAL.workshop`, `SW.sx`, `BASE.sx`, `GUNS.sx`, `TRAINS.sx`, `ARMOR_TRAINS.sx`, `CARDTXT.sx`, `WORKSHOP_HEAL` and `FOUNDRY_HEAL/FOUNDRY_CD/FOUNDRY_HP`. Task 3 reads `T.ram`, Task 4 reads `T.workshop`/`WORKSHOP_HEAL`/`FOUNDRY_HEAL`, and Task 5 reads `SW.sx.kind === 'ruebezahl'`/`FOUNDRY_CD`/`FOUNDRY_HP`.
- **Mech draw descriptors** (the art itself is the builder's call, inside these rules). Each is `{ L, W, tr: [], legs: [[x, reach], …], parts, tur?, fl?, mgf? }`:
  - `tr: []` means no treads.
  - Each `legs` entry is one mirrored leg pair. The hip sits at `(x, ±W)` and the foot reaches out to `±(W + reach)`. Task 6 renders them.
  - Parts are boxy: only `'r'` rects and `'p'` polygons with square or chamfered corners. Colours are `'b'`/`'h'` plus dark accents, and each mech carries one `'em'`.
  - Dimensions and legs:
    - Kobold: `L 12, W 8`, legs `[[-6,5],[6,5]]`, guns fire from `fl`.
    - Krampus: `L 22, W 14`, legs `[[-14,7],[0,7],[14,7]]`, one turret `{ x: 2, r: 8, len: 24, gt: 3, guns: 1 }`.
    - Erlkönig: `L 18, W 11`, legs `[[-10,6],[10,6]]`, turret `{ x: 0, r: 6, len: 40, gt: 3.4, guns: 1 }`.
    - Eisenhans: `L 32, W 20`, legs `[[-22,9],[-7,9],[8,9],[23,9]]`, turret `{ x: 4, r: 11, len: 34, gt: 4, guns: 1 }`, `mgf` two points at the bow.
    - Rübezahl: `L 70, W 40`, `base: '#1a1b1d'`, legs `[[-50,14],[-25,14],[0,14],[25,14],[50,14]]`, two turrets (the first `{ x: 30, r: 18, len: 62, gt: 5, guns: 2, gw: 5 }`), and four `mgf` points.

- [ ] **Step 1: Write the failing tests** in `data.test.js`:
  - `saxony is the ninth nation`: `NATS.at(-1) === 'sx'`, `NATS.length === 9`, and `NAT.sx` matches `objectContaining({ name: 'Saxon Dominion', style: 'stahl', inf: 20, tanks: 8, nest: 'nest', def: { kind: 'workshop', label: 'Repair workshop', cost: 110 } })`. `NAT.sx.blurb` equals the Global Constraints string followed by `' Superweapon: Rübezahl.'`.
  - `saxon infantry stay within 15% of base`: for each of `rifle mg sniper mortar` and each numeric key in `NU.sx[k]`, check `STATS.sx[k][f]` lies in `[UT[k][f] * 0.85, UT[k][f] * 1.15]`, and pin the table values.
  - `the rammstosstrupp is a mortar with a ram for its dead zone`: `STATS.sx.raider` matches `objectContaining({ atk: 'mortar', min: 90, shell: 1.1, splash: 28, arc: 1, shield: 0.7, hp: 90, cost: 70 })`. Also check `T.ram` equals `{ dmg: 24, cd: 1.2, range: 90, acc: 0.8, atk: 'raider', heavy: 2 }`, `T.ram.range === T.min`, and `T.moveFire` is falsy. No other nation's `STATS[n][k]` or `SPECIAL[k]` has a `ram` field.
  - `no saxon text says raider`: none of `STATS.sx.raider.name/pl/role` or `CARDTXT.sx.u_raider` matches `/raider/i`.
  - `saxon mechs`: each table row is `objectContaining` its values (`armor: true`, plus `atk: 'mg', shell: 0` for the Kobold). `tkList('sx')` equals `['tkL', 'tank', 'tkM', 'tkH']`. `tkPrev('sx', 'tkM') === 'tank'` and `tkPrev('sx', 'tkH') === 'tkM'`. No regular sx mech has `big`. Every sx mech has `draw.tr` equal to `[]` and a non-empty `draw.legs`.
  - `rübezahl`: `SPECIAL.ruebezahl` matches its values plus `armor: true, atk: 'tank', shell: 0.25`. Its hp is `> SPECIAL.tsar.hp` and `< SPECIAL.colossus.hp`. `SW.sx` equals the Global Constraints object, and `SW.sx.text` contains `(6000).toLocaleString('en')` (`'6,000'`).
  - `workshop`: `SPECIAL.workshop` equals the Global Constraints object, and `WORKSHOP_HEAL === 6`.
  - Extend the existing tables: add `sx: [5, 70, 16, 2]` to the HQ-gun `T` map, `sx: 'Sächsische Feldbahn'` to `RAIL_NAMES` and `sx: 'Sächsischer Panzerzug'` to `ARMOR_NAMES`. The existing loops then check the ±15% bands, the base tiers and the superweapon presence. Also pin `BASE.sx.name === 'Ore Mountain Foundry'` and `[FOUNDRY_HEAL, FOUNDRY_CD, FOUNDRY_HP]` equal to `[1.5, 100, 1.3]`.
  - `the pole stays the toughest tank in the game` already loops over `NATS`, so it covers Eisenhans unchanged.
- [ ] **Step 2:** Run `npx vitest run tests/unit/data.test.js`. Expect FAIL, because `sx` is missing.
- [ ] **Step 3:** Add all the data, the `mods()` keys, the gen-stats entries, and the count edits in the ui, e2e and smoke tests.
- [ ] **Step 4:** Run `npm run check` and `npm run e2e`. Expect PASS, including `eight-nations.test.js` unchanged and the new smoke rows `open: sx vs de` and `open: de vs sx`. Until Tasks 3–6 land, an sx def build falls through to the minefield path, and Rübezahl does not spawn. That is expected and harmless for these tests.
- [ ] **Step 5:** Run `git diff main -- src/data/ | grep '^-[^-]'`. Expect exactly two removed lines: the `NATS` line and the `STATS` literal line. Everything else is additions.
- [ ] **Step 6:** Commit `feat: saxon dominion nation, infantry, mechs and side tables (data)`.

### Task 3: Rammstoßtrupp dual-mode weapon

**Files:**
- Modify: `src/sim/combat.js` (`stepUnits` lines 71, 80, 89, 157–184; one new module-private helper `fireRam`)
- Test: `tests/unit/combat-step.test.js` (new `describe('rammstosstrupp')`)

**Interfaces:**
- Consumes: `STATS.sx.raider` with `T.min`, `T.ram`, `T.atk === 'mortar'`.
- Produces: a per-unit field `u.mode`, either `'ram'` or `'mortar'`, set only on units with `T.ram` when they fire. Task 6 reads it to place the muzzle flash.
- Exact edits:

```js
// line 71: add seekR; minR keeps its meaning for the base branch
const T = u.T, m = G.M[u.side], minR = T.min || 0, seekR = T.ram ? 0 : minR, falling = u.fall > 0;
// lines 80 and 89: in both target-search comparisons only, `d >= minR` becomes `d >= seekR`
// after line 161 (fx):
const ram = !!T.ram && !!best && bd < minR;   // nearest target is inside the mortar's dead zone
// line 169 becomes a three-way branch:
if (ram) fireRam(u, best, m, sacc, dir, fx, fy);
else if (best && bd <= T.range) { if (T.ram) u.mode = 'mortar'; /* existing body, untouched */ }
else {
  const b = G.bases[1 - u.side], d = Math.abs(b.x - u.x);
  if (d <= T.range && d >= minR) { if (T.ram) u.mode = 'mortar'; /* existing body, untouched */ }
  else if (T.ram && d < minR) {           // rams the enemy HQ from inside the dead zone
    u.cd = T.ram.cd * m.cd[u.type] * (0.85 + rng.range(0, 0.3)); u.flash = 0.08; u.mode = 'ram';
    tracer(u.x + dir * 9, u.y, b.x - dir * 25, u.y, 1, '#ffe9a8');
    hurtBase(1 - u.side, T.ram.dmg * m.dmg[u.type] * (u.dmgMul || 1));
  }
}

function fireRam(u, e, m, sacc, dir, fx, fy) {
  const R = u.T.ram;
  u.cd = R.cd * m.cd[u.type] * (0.85 + rng.range(0, 0.3)); u.flash = 0.08; u.mode = 'ram';
  const dmg = R.dmg * m.dmg[u.type] * (u.dmgMul || 1) * (e.train || e.T.armor || e.T.nest ? R.heavy : 1);
  // R.atk is 'raider', for which accVs() is always 1, so it is not called
  if (rng.float() < R.acc * sacc) { tracer(u.x - fx + dir * 9, u.y - fy, e.x, e.y, 1.6, '#ffe9a8'); hurt(e, dmg, R.atk, u); }
  else tracer(u.x - fx + dir * 9, u.y - fy, e.x + (rng.float() - 0.5) * 30, e.y + (rng.float() - 0.5) * 30, 0.8, 'rgba(255,233,168,.6)');
}
```

- [ ] **Step 1: Write the failing tests.** Use `beforeEach` `newGame('sx', 'de', 'open', 1)`, clear units/shells/tracers, and set `G.bases[0].cd = G.bases[1].cd = 999`. Use `r = spawn(0, 'raider', 5, true)` with `r.cd = 0.001`. Foes are `mute(pin(spawn(1, …, 7, true)))` placed at `r.x + dx`, `y = r.y`. For hit-exact tests, use a per-unit T copy with `ram.acc: 1`.
  - `rams a target inside min`: a rifle at `dx = 60`, then `stepUnits(0.01)`. `G.shells.length === 0`, `r.mode === 'ram'`, `foe.hp === foe.max - 24` (acc-1 copy, an unsettled target takes full damage), and `r.cd` lies in `[1.2 * 0.85, 1.2 * 1.15]`.
  - `boundary`: at `dx = 89.999` it rams (no shell, `mode 'ram'`). At `dx = 90` exactly it pushes a shell `objectContaining({ type: 'mortar', side: 0, arc: 1, splash: 28 })`, sets `mode 'mortar'`, and leaves the foe's hp unchanged that frame. At `dx = 300` it fires a mortar shell.
  - `one weapon per frame`: foes at `dx = 60` and `dx = 250`. For 300 frames, set `G.tracers.length = 0`, record `s0 = G.shells.length`, `stepUnits(0.05)`, then count `shellsAdded` and the ram tracers added (filter `w === 1.6 || w === 0.8`, from this unit's x). Each frame, `shellsAdded > 0` and a ram tracer are never both true, and each count is ≤ 1. At frame 150, set the near foe's `hp = 0`. Over the run both modes occurred (ram before 150, mortar after).
  - `ram bonus vs armour and emplacements`: with the acc-1 copy, a de `tank` at `dx = 60` loses `24 * 2 * ARM.raider` (= 28.8). A de `nest` (spawned `'nest'`, fixed) at `dx = 60` loses `24 * 2 * NESTCOV.raider`.
  - `ram ignores trench cover`: a settled foe rifle in a fortified trench (`G.fort[7] = 2`) loses the full 24 (acc-1), matching raider rules.
  - `rams the HQ from the dead zone`: no foe units, `r.x = G.bases[1].x - 60`, pinned. After one step, base hp dropped by exactly `24`, no shell was pushed, and `mode 'ram'`. At `G.bases[1].x - 200`, a base shell (`base: true`) is pushed instead.
  - `holds both weapons while moving`: an unpinned `r` walking (`tx = r.x + 200`) with a foe at `dx = 60` (settled, on its line, so not blocking) fires nothing in that frame.
  - `other mortars still idle up close`: in `newGame('gb', 'de', …)`, a gb `mortar` with a foe at `dx = 60` never fires in 40 frames. There are no shells and no tracers, the foe is at full hp, and `'mode' in u === false`.
  - `the switch itself draws no rng`: run `newGame('sx', …)` with a foe at `dx = 300`, `rng.reseed(9)`, one step, then record `rng.float()`. Then run `newGame('gb', …)` with a gb `mortar` placed and stepped identically. The two recorded values are equal, because mortar-mode firing draws exactly what a plain mortar draws.
- [ ] **Step 2:** Run `npx vitest run tests/unit/combat-step.test.js`. Expect FAIL on the ram tests; the gb idle test already passes.
- [ ] **Step 3:** Make the edits exactly as written in Interfaces.
- [ ] **Step 4:** Run `npm run check`. Expect PASS, with `eight-nations.test.js` and all pre-existing seeded tests unchanged.
- [ ] **Step 5:** Commit `feat: rammstosstrupp fires its ram inside the mortar's dead zone`.

### Task 4: Repair Workshop

**Files:**
- Modify: `src/sim/fortify.js` (`canDef`/`buildDef` workshop branches; new exports `workshopAt`, `workshopRate`; import `tier` from `./base.js` and `WORKSHOP_HEAL` from units, `FOUNDRY_HEAL` from base data)
- Modify: `src/sim/combat.js:137` (the heal line)
- Modify: `src/sim/commands.js:71-75` (one toast arm)
- Test: `tests/unit/fortify.test.js`, `tests/unit/combat-step.test.js` (new `describe('repair workshop')`)

**Interfaces:**
- Consumes: `SPECIAL.workshop`, `WORKSHOP_HEAL`, `FOUNDRY_HEAL`, `NAT.sx.def.kind === 'workshop'`.
- Produces:
  - `workshopAt(side, L) → boolean`: `G.units.some(w => w.T.workshop && w.side === side && w.line === L && w.hp > 0)`.
  - `workshopRate(side) → number`: `WORKSHOP_HEAL * (G.nation[side] === 'sx' && tier(side, 'nat') >= 1 ? FOUNDRY_HEAL : 1)`.
  - `canDef`: `if (d.kind === 'workshop') return freeSlot(L) >= 0 && !G.units.some(u => u.T.workshop && u.line === L) && !G.jobs.some(j => j.make === 'workshop' && j.line === L);`. This copies the depot rule: one per trench, either side.
  - `buildDef`: `if (d.kind === 'workshop') return buildNest(side, L, 'workshop');`.
  - Toast: `d.kind === 'workshop' ? 'Sappers are carrying tools to trench ' + L + ' to set up a repair workshop.'`.
  - The heal line (`combat.js:137`) becomes:

```js
const wh = T.armor && u.settled && u.hp < u.max && isTrench(u.line) && workshopAt(u.side, u.line) ? workshopRate(u.side) : 0;
if (u.settled && (m.heal || wh) && isTrench(u.line) && u.hp < u.max && !exposed(u)) u.hp = Math.min(u.max, u.hp + (m.heal + wh) * dt);
```

  With no workshop on the field, `wh === 0` and the line is identical to today's. It draws no rng.
  - A captured workshop flips side through the existing nest-capture loop, like a depot, and then serves its captor (see Open questions).

- [ ] **Step 1: Write the failing tests.**
  - fortify `sx: repair workshop`:
    - `newGame('sx', 'de', 'open', 1)`, `G.owner[2] = 0`. `canDef(0, 2)` is true. `buildDef(0, 2)` returns true, pushes a job with `make: 'workshop'`, and adds no field. `canDef(0, 2)` is then false.
    - Drive `stepJobs` until done (the existing `buildNest + stepJobs` test pattern). A `T.workshop` unit stands at line 2 with `fixed`, and the toast `Repair workshop ready at trench 2.` fires.
    - `canDef(0, 3)` is still true. A second workshop at line 2 is refused even for side 1.
  - combat-step `repair workshop`: in an sx game with units cleared and bases muted, place `w = spawn(0, 'workshop', 3, true); w.fixed = true`. Set `G.M[0].heal = 0`. The mech is `k = spawn(0, 'tank', 3, true)`, settled, with `k.hp = k.max - 100`.
    - `heals a settled mech holding the trench`: `stepUnits(1)` gives `k.hp` `toBeCloseTo(k.max - 100 + 6)`.
    - `capped at max`: `k.hp = k.max - 1` heals to exactly `k.max`.
    - `no workshop, no heal`: with `w` removed, `k.hp` is unchanged.
    - `not one trench over`: `k` settled at line 4 is unchanged.
    - `not a mech passing through`: `k.line = 5`, `k.settled = false`, `k.x = G.LX[3]`. Step 0.1 a few times while it walks past. Its hp stays at `k.max - 100` throughout.
    - `not a retreating mech`: the same with `k.line = 1`.
    - `not an enemy mech`: `e = spawn(1, 'tank', 3, true)` settled at line 3, pinned and muted, `hp = max - 100`, stays unchanged.
    - `infantry get only m.heal`: a settled own rifle at line 3 with `m.heal = 0` is unchanged. With `G.M[0].heal = 1`, `stepUnits(1)` raises it by exactly 1.
    - `adds to m.heal for mechs`: with `m.heal = 1`, `k` gains `7`.
    - `dead workshop stops`: `w.hp = 0`, then step, and `k` is unchanged.
    - `foundry tier 1`: `raise(0, 'nat')`, then `k` gains `9` in 1 s.
    - `captured workshop serves its captor`: set `w.side = 1`. An own `k` is unchanged, and an enemy settled mech at line 3 gains 6.
    - `heal draws no rng`: reseed, one step with `w` present, then `rng.float()`. Do the same with `w` removed. The two values are equal.
- [ ] **Step 2:** Run `npx vitest run tests/unit/fortify.test.js tests/unit/combat-step.test.js`. Expect FAIL.
- [ ] **Step 3:** Implement the Interfaces.
- [ ] **Step 4:** Run `npm run check`. Expect PASS, with the eight-nation guard unchanged.
- [ ] **Step 5:** Commit `feat: saxon repair workshop mends settled mechs at its trench`.

### Task 5: Rübezahl superweapon and the mech line in play

**Files:**
- Modify: `src/sim/superweapons.js` (`swBlock`: one-at-a-time arm; `useSW`: `ruebezahl` arm; the `st.cd` line; import `FOUNDRY_CD, FOUNDRY_HP`)
- Modify: `src/sim/commands.js:133-138` (toast arm)
- Test: `tests/unit/superweapons.test.js`, `tests/unit/combat-step.test.js`

**Interfaces:**
- Consumes: `SW.sx`, `SPECIAL.ruebezahl`, `FOUNDRY_CD`, `FOUNDRY_HP`, `STATS.sx.tkM`.
- Produces:
  - `swBlock`: `if (d.kind === 'ruebezahl' && G.units.some(u => u.side === side && u.type === 'ruebezahl')) return 'Already in the field.';`.
  - `useSW` arm: `const u = spawn(side, 'ruebezahl', side ? G.ai.F : G.sel); if (nat >= 3) { u.hp *= FOUNDRY_HP; u.max *= FOUNDRY_HP; } if (side === 1) toast('The enemy has sent out Rübezahl.');`.
  - Cooldown: `st.cd = … : d.kind === 'ruebezahl' && nat >= 2 ? FOUNDRY_CD : d.cd`.
  - Player toast: `'Rübezahl is striding out of your HQ.'`.

- [ ] **Step 1: Write the failing tests.**
  - superweapons `sx Rübezahl`:
    - In `game('sx', 'gb')`, `useSW(0)` spawns one `ruebezahl` at `G.sel`, and `tanks(0)` is unchanged (`sup`). `swBlock(0)` is then `'Already in the field.'` and `G.sw[0].cd === 140`.
    - After it dies, `swBlock(0)` reports the cooldown, not the block.
    - The enemy toast fires for side 1, and `fireSuperweapon()` charges `swCost(0)` and toasts the player line.
    - Foundry: after `raise(0, 'nat')` twice, `cd === 100`. After three raises, `u.max === 6000 * 1.3` (times `m.tankHp`).
  - combat-step `saxon mechs`:
    - `erlkönig holds fire up close`: a settled `tkM` with a foe at `dx = 100` (< 140) fires nothing in 40 frames.
    - `erlkönig shells at range`: with a foe at `dx = 300`, it pushes `objectContaining({ type: 'mortar' })`.
    - `erlkönig never fires on the move`.
    - `rübezahl crushes`: a foe rifle within 54 px loses hp from crush.
- [ ] **Step 2:** Run `npx vitest run tests/unit/superweapons.test.js tests/unit/combat-step.test.js`. Expect FAIL on the Rübezahl tests. The Erlkönig tests may already pass, since they reuse existing mechanics, and they stay as regression pins.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `npm run check`. Expect PASS.
- [ ] **Step 5:** Commit `feat: rübezahl superweapon and ore mountain foundry effects`.

### Task 6: Art — legs, flag, emblem, workshop, Rammstoßtrupp sprite

**Files:**
- Modify: `src/ui/draw/tanks.js`. `drawTankGen` gains a `legs` pass after the tread loop. `emblem()` gains an `n === 'sx'` arm: a cream ring `#ece7d6` r 3.6, a green `#2e6b3a` r 2.4 and a dark centre r 1.
- Modify: `src/ui/draw/terrain.js`. `flag()` gains an `n === 'sx'` arm: top half `#ece7d6`, bottom half `#2e6b3a` (Saxon colours), and a 6 px `#1f2124` band at the hoist. Without it, the fallback branch draws the Union Jack.
- Modify: `src/ui/draw/men.js`:
  - `drawNest` dispatches `u.type === 'workshop'` to a new `drawWorkshop(u, N)`: a boxy shed in `N.body`/`N.hat` with a gear or crane mark, no gun, and the standard health bar.
  - `drawSoldierBody` gains a `sp === 'ramm'` arm before `t === 'mg'`: a back-mounted tube behind the body and a ram bar forward. The raider red stripe at line 155 becomes `t === 'raider' && !sp`.
  - The flash goes at the ram tip when `u.mode === 'ram'` and at the tube mouth otherwise.
- Test: `tests/unit/draw.test.js` (`populate` adds `'workshop'` to the emplacement list and `'ruebezahl'` to the superweapon list)

**Interfaces:**
- Consumes: `draw.legs` (Task 2) and `u.mode` (Task 3).
- `legs` rendering:
  - For each `[x, reach]` and each side `s = ±1`, draw a two-segment jointed leg in `'#15150f'`, about 2.2 px wide scaled by `W / 14`. It runs hip `(x, s·W·0.8)` → knee `(x + sw, s·(W + reach·0.7))` → foot `(x + sw·1.6, s·(W + reach))`, with a small foot pad.
  - The swing is `sw = Math.sin(u.tread * 0.3 + i * Math.PI) * reach * 0.5`, where `i` is the entry index. It uses `u.tread`, which the sim already accumulates. There is no `Math.random`.
- [ ] **Step 1: Write the failing tests** with a recording ctx (a Proxy like `stubCtx` that logs `fillStyle` on each `fillRect`/`fill` and counts `lineTo`):
  - `sx flag is not the union jack`: `flag('sx', 0, 0)` used `#2e6b3a` and never `#22336b`.
  - `sx emblem`: `emblem('sx', 0, 0, 1)` used `#2e6b3a` and never `#e2b93b`.
  - `mechs walk on legs, not treads`: draw a spawned sx `tkL`, `tank`, `tkM`, `tkH` and `ruebezahl`. None uses tread fill `#22221a`, and each makes at least `2 * draw.legs.length * 2` `lineTo` calls.
  - `workshop is not drawn as an MG nest`: drawing a `workshop` unit never uses the nest gun colour `#3d423a`.
  - The existing `draws every nation on every map` and `HQ at every tier` tests now include `sx` through `NATS` and must pass.
- [ ] **Step 2:** Run `npx vitest run tests/unit/draw.test.js`. Expect FAIL.
- [ ] **Step 3:** Implement the art.
- [ ] **Step 4:** Run `npm run check` and `npm run e2e`. Expect PASS. Then `npm run dev`, start Saxony vs Germany, and check by eye: the mechs walk, the flag and HQ look right, the workshop builds, and the Rammstoßtrupp switches weapons up close.
- [ ] **Step 5:** Commit `feat: saxon art — walking mechs, flag, emblem, workshop, rammstosstrupp`.

### Task 7: Bot balance pass, docs

**Files:**
- Modify (numbers only, if tuning needs them): the Saxony rows in `src/data/units.js`, `src/data/superweapons.js`, `src/data/base.js`, and `NAT.sx.inf` (stays in 20–24), with the matching pins in `data.test.js`.
- Modify: `scripts/bot.mjs`. Add `BOTPREF` env: a comma list that replaces `pref` when set, e.g. `BOTPREF=tkH,tkM,tank,raider`. Default behaviour is unchanged.
- Modify: `docs/DESIGN.md`, `README.md`, `docs/STATS.md` (regenerated).

**Interfaces:**
- Consumes: Tasks 1–6.
- Bot coverage note: the bot's default `pref` buys only the base `tank`, so Kobold, Erlkönig, Eisenhans and Rübezahl reach play only through the enemy AI (which buys every class) or through `BOTPREF`. The matrix therefore covers both directions, plus a forced-heavy row. `main` has no Saxony, so Germany is the stand-in baseline opponent: "sx as enemy" is compared with "de as enemy", and "sx as player vs de" with the eight-nation mean as player vs de.

- [ ] **Step 1: Baseline** on `main`, from a throwaway `git worktree` in the scratchpad. Use `MAXS=900 node scripts/bot.mjs <me> <foe> <map> <seed> --json` for the reference rows R: each of the eight vs `de` (`de` vs `gb`) on 'open', seeds 1–10. Save the JSON lines.
- [ ] **Step 2: Branch runs:**
  - R again; this is the control.
  - A: `sx` vs each of the eight, 'open', seeds 1–10.
  - B: each of the eight vs `sx`, 'open', seeds 1–10.
  - `sx` vs `de` and `de` vs `sx` on 'plain' and 'march', seeds 1–3.
  - The anti-goal rows: `BOTPREF=tkH,tkM,tank,raider` for `sx` vs `de` and vs `gb` on 'plain' and 'march', seeds 1–3, with the same rows without `BOTPREF` for comparison.
- [ ] **Step 3: Check and tune toward these targets:**
  - The R control rows are byte-identical to the baseline (`diff` empty). If not, a non-`sx` path changed: stop and fix it, do not tune around it.
  - `sx`-vs-`de` win rate is within ±20 points of R's eight-nation mean.
  - Each B row (X vs `sx`) is within ±20 points of the same X's row vs `de` in R (for `de` itself, compare with `de` vs `gb`).
  - Anti-goal: `BOTPREF` heavy rows win no more than 20 points above the default rows. Their `losses` do not fall below half of the default rows' (heavy mechs help push; they don't make infantry and trench fighting pointless). In B rows, report one-off, uncommitted `LOG`-style counts of the enemy's Eisenhans and Rübezahl and whether the player still advanced (`sel`).
  - Report per matchup, as the armoured-train table did: win rate, mean `time`, `sel`, `losses`.
  - If a row is out of band, adjust in this order and re-run only the affected rows, then do one full re-run at the end:
    1. Rübezahl and Eisenhans (`hp`, `dmg`, `cost`; Rübezahl stays between Tsar and Colossus hp).
    2. `WORKSHOP_HEAL` (range 3–10).
    3. The Rammstoßtrupp (`cost`, `hp`, `ram.dmg`).
    4. Infantry (inside ±15%).
    5. `NAT.sx.inf` (20–24).
- [ ] **Step 4: Docs:**
  - DESIGN.md §1 table gets the row `| Saxon Dominion | Kobold, Krampus, Erlkönig, Eisenhans (walking mechs) |`.
  - §8's national list gains `Ore Mountain Foundry (Saxony)`.
  - A new `## 16. Saxon Dominion` section goes after §15, in the §15 style. It covers the nation and its intent link, the dual-mode switch (rule, boundary, `T.ram.range === T.min`), the workshop (heal rule, the corrected heal-line fact, capture behaviour), Rübezahl and the Foundry, the final stat tables, and the balance tables from Step 3.
  - README: "one of eight nations" → "one of nine nations". Add "the Saxon Dominion's walking mechs and the giant Rübezahl" to the nations sentence.
  - Run `npm run stats`, `npm run check` and `npm run e2e`. Expect PASS.
- [ ] **Step 5:** Commit `chore: tune saxon dominion, docs`.

---

## Open questions

- **Captured workshops.** A workshop is a nest, so the existing capture loop flips it to the captor, as it does a captured depot. The plan follows that precedent: it then heals the captor's mechs. The alternative is that a workshop only ever heals Saxon mechs, adding `G.nation[u.side] === 'sx'` to `workshopRate`. That is a one-line change, and the Task 4 test `captured workshop serves its captor` pins whichever is chosen.
- **The spec-silent side tables** (`BASE.sx` Ore Mountain Foundry, `GUNS.sx`, both trains, card copy, flag) are my calls, kept non-economic. The owner may want different names or Foundry effects.

## Self-review notes

- **Spec coverage:**
  - Nation entry, cap 20, mech cap 8, stahl helmet and dark palette: Tasks 2 and 6.
  - Five base types kept, with only the raider slot replaced: Task 2.
  - Rammstoßtrupp dual weapon, one per frame, reusing `T.min`: Task 3.
  - Four tiers in the tank-table shape, with the Kobold added: Task 2 (data) and Task 5 (Erlkönig's `min` reuse in play).
  - Rübezahl built like the Colossus: Tasks 2 and 5.
  - Workshop as an extension of the heal line: Task 4.
  - No economic trait: Global Constraints, and no `newGame`/`aiStep` edit.
  - Legs cosmetic: Task 6, plus the grep constraint.
  - Determinism and eight untouched: Task 1 guard, plus the Task 7 control rows.
  - Anti-goal and balance: Task 7.
  - Docs: Task 7.
- **Type consistency:**
  - Names are used consistently: `T.ram` (`dmg, cd, range, acc, atk, heavy`), `u.mode`, `workshopAt(side, L)`, `workshopRate(side)`, `WORKSHOP_HEAL`, `FOUNDRY_HEAL/CD/HP`, `SW.sx.kind === 'ruebezahl'`, `SPECIAL.ruebezahl`/`SPECIAL.workshop` and `draw.legs` `[x, reach][]`.
  - The `mods()` keys `'workshop'` and `'ruebezahl'` match the SPECIAL keys.
- **Review Focus:** every line maps to named tests in Tasks 1, 3, 4 and 7.
