# Icon Field Buttons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the seven floating field buttons into small round icon buttons, split into three bands on the trench (defences at the top, Lay/Repair Track in the middle, movement at the bottom), with each button's full description moved to `aria-label` plus a hover/focus popover, and a tap-to-reveal, tap-again-to-act interaction on touch.

**Architecture:** `index.html` replaces the single `#fieldActions` block and the loose `#trackBtn` with three absolutely-positioned band containers (`#topBand`, `#trackBand`, `#moveBand`). `src/ui/hud.js`'s per-frame `layoutActions()`/`layoutTrackButton()` position each band at its own world y (from a new `BAND_Y` constant in `src/ui/fieldActions.js`), reusing `anchorX`/`stackSide`/`toScreen` per band. A new DOM module, `src/ui/fieldTips.js`, owns the description text destination (`setTip`) and the touch reveal state; `refresh()` keeps its existing text computation and only hands the result to `setTip` instead of `textContent`/`innerHTML`.

**Tech Stack:** Vanilla ES modules, canvas, vanilla CSS, inline SVG (`<symbol>` + `<use>`), Vitest 4.1.12 with jsdom 30.1.3, the existing `tests/unit/ui-page.js` fixture.

**Spec:** `docs/superpowers/specs/2026-11-22-icon-field-buttons-design.md`

## Global Constraints

- The seven buttons keep their ids exactly: `advBtn`, `backBtn`, `gatherBtn`, `fortBtn`, `nestBtn`, `defBtn`, `trackBtn`. The click listeners on them in `initHud()` stay as they are.
- Every button's enabled/disabled/hidden logic and its cost/text computation in `refresh()` stays byte-identical. The only permitted edits there are: (a) the destination, where `el.textContent = <expr>` becomes `setTip(el, <expr>)` with `<expr>` unchanged, and the `trackBtn` `innerHTML` assignment becomes `setTip` of the same two sub-expressions joined as plain text (Task 2 Step 3); (b) one added line that swaps the track icon. No `disabled =` or `hidden =` line is touched.
- Bands, their world y, and their anchor trench (world y 0 is the top edge, `WH` = 300 the bottom):

  | Band id | World y | Buttons, DOM order | Anchor trench |
  |---|---|---|---|
  | `#topBand` | 41 | `fortBtn`, `nestBtn`, `defBtn` | `G.sel` |
  | `#trackBand` | 150 | `trackBtn` | `trackGlyphLine(0)` |
  | `#moveBand` | 240 | `backBtn`, `gatherBtn`, `advBtn` | `G.sel` |

- Each band's x is `anchorX(L)` of its own anchor trench, and its lean is `stackSide(L)` of that same trench: `translate(0%, -50%)` when `stackSide(L) > 0`, else `translate(-100%, -50%)`. Screen position comes from `toScreen(anchorX(L), BAND_Y.<band>)`. A band is `hidden` when its screen x is `< -50` or `> CW + 50`, as today. `#trackBand` is also hidden when `trackGlyphLine(0)` is `null`.
- Round buttons: one CSS custom property `--fb: 30px` on `.fieldwrap` sets every field button's diameter; `width` and `height` both equal `var(--fb)`, `border-radius: 50%`, `padding: 0`. Icons are `20px` square. All seven use this one rule; none overrides the size.
- Icons are one hidden inline SVG sprite in `index.html` with `<symbol>`s drawn as strokes in `currentColor` (`fill="none"`, round caps and joins). No image files, no emoji.
- `aria-label` always holds the button's full current description, whether or not it is revealed. `data-tip` holds the same string.
- Touch reveal applies only when `pointerType` is `'touch'` or `'pen'`. A click with any other `pointerType` (`'mouse'`, `''` from keyboard or `el.click()`, or `undefined` from a plain `MouseEvent`) acts at once.
- Only these seven buttons change. The buy row, base panel, `trainBtn`, `gunBtn`, `swBtn` keep their `.act`/`.trkbtn` text-card style.
- `src/sim/**` and `src/ui/draw/**` are untouched. `src/ui/loop.js` is untouched; it keeps calling `layoutActions()` and `layoutTrackButton()` each frame.
- `npm run check` and `npm run e2e` pass at the end of every task.

## Review Focus

1. **A disabled button must still reveal on touch.** With too few supplies `fortBtn` is disabled, and browsers don't reliably deliver pointer events to disabled controls. Each button therefore sits in a `<span class="fb">` wrapper, disabled field buttons get `pointer-events: none`, and the tap lands on the wrapper, which reveals it. (Task 3 tests `a disabled button can be revealed by tapping its wrapper` and `a reveal on a disabled button never swallows a later click`.)
2. **`aria-label` never depends on reveal state.** Revealing or clearing must not touch `aria-label` or `data-tip`. Only the wrapper's `revealed` class changes. (Task 3 test `aria-label is the same before, during and after a reveal`.)
3. **One reveal at a time, across bands.** Revealing `advBtn` (bottom band) while `fortBtn` (top band) is revealed clears `fortBtn`, and that tap doesn't advance. (Task 3 test `revealing a button in another band clears the first`.)
4. **No reveal survives a `G.sel` change.** Revealing `fortBtn` and then selecting another trench, from the map strip, a canvas tap or the sim's own `tick.js` front-line pull-back, clears the reveal on the next frame. Otherwise the next tap would act on a trench the player never looked at. (Task 3 test `a G.sel change clears any reveal`.)
5. **Bands stay clear of each other and of the canvas markings at both camera extremes (K = 240/300 and 380/300).** The plan must actually use 41 / 150 / 240 and `--fb: 30px`. The test asserts the layout functions place each band at `BAND_Y * K` and checks the band edges against the flag pennant (y 4–12), the pips (y ≈ 287) and each other. (Task 1 test `places each band at its world y`, Task 2 test `30px bands never collide at either K extreme`.)

---

### Task 1: Split the field buttons into three positioned bands

The buttons stay as text buttons in this task, so the change can be reviewed as layout only.

**Files:**
- Modify: `index.html:20-32` (replace `#fieldActions` and the loose `#trackBtn`)
- Modify: `src/ui/fieldActions.js` (add `BAND_Y`)
- Modify: `src/ui/hud.js:40-72` (`layoutActions`, `layoutTrackButton`)
- Modify: `src/styles.css:46-56` (`.fieldGrp*`/`.fieldFloat*` rules)
- Test: `tests/unit/fieldActions.test.js`, `tests/unit/ui.test.js` (`describe('field-action groups')`, `describe('track button and map-strip rail glyph')`, `describe('game loop')` frame test)

**Interfaces:**
- Produces:
  - `BAND_Y` in `src/ui/fieldActions.js`: `export const BAND_Y = Object.freeze({ top: 41, track: 150, move: 240 })`.
  - DOM, in this order inside `.fieldwrap`, after `#field` and before `#toast`:
    ```html
    <div class="fieldBand" id="topBand" role="group" aria-label="Trench defences">
      <span class="fb"><button class="act alt" id="fortBtn">Fortify</button></span>
      <span class="fb"><button class="act alt" id="nestBtn">MG nest</button></span>
      <span class="fb"><button class="act alt" id="defBtn" hidden>Defence</button></span>
    </div>
    <div class="fieldBand" id="trackBand" role="group" aria-label="Railway">
      <span class="fb"><button class="act alt trkbtn" id="trackBtn"></button></span>
    </div>
    <div class="fieldBand" id="moveBand" role="group" aria-label="Troop movement">
      <span class="fb"><button class="act alt" id="backBtn">Fall back</button></span>
      <span class="fb"><button class="act alt" id="gatherBtn">Bring all here</button></span>
      <span class="fb"><button class="act" id="advBtn">Advance</button></span>
    </div>
    ```
    The `.fb` wrapper is the touch-reveal hit target in Task 3. Add it now so the DOM shape is final.
  - `layoutActions()` positions `#topBand` and `#moveBand`. `layoutTrackButton()` positions `#trackBand`. Both keep their names and zero-argument signatures (`loop.js` calls them). The band element carries `hidden`, not the button.
  - A private helper in `hud.js`, `placeBand(el, L, worldY)`, which sets `left`/`top`/`transform`/`hidden` per the Global Constraints rule. All three bands use it.
- Consumes: `anchorX`, `stackSide`, `toScreen`, `trackGlyphLine` (existing, `src/ui/fieldActions.js`); `metrics` (`src/ui/camera.js`).

- [ ] **Step 1: Write the failing tests**

In `tests/unit/fieldActions.test.js`:
```js
it('pins the three band heights', () => {
  expect(BAND_Y).toEqual({ top: 41, track: 150, move: 240 });
});
```

In `tests/unit/ui.test.js`, replace the bodies of `describe('field-action groups')` and the three `trackBtn` layout tests with these (keep the two `defBtn` tests and `positions at a double trench without throwing` as they are). Import `BAND_Y`.
```js
it('splits the buttons into three bands, in top/middle/bottom DOM order', () => {
  const ids = b => [...$(b).querySelectorAll('button')].map(x => x.id);
  expect(ids('topBand')).toEqual(['fortBtn', 'nestBtn', 'defBtn']);
  expect(ids('trackBand')).toEqual(['trackBtn']);
  expect(ids('moveBand')).toEqual(['backBtn', 'gatherBtn', 'advBtn']);
  for (const b of ['topBand', 'trackBand', 'moveBand']) {
    expect($(b).closest('.fieldwrap')).toBeTruthy();
    expect([...$(b).children].every(c => c.matches('span.fb') && c.children.length === 1)).toBe(true);
  }
  expect($('fieldActions')).toBeNull();
});

it('keeps tab order: canvas, top band, track band, move band, map strip', () => {
  const order = [...document.querySelectorAll('#field, #topBand, #trackBand, #moveBand, #map')].map(e => e.id);
  expect(order).toEqual(['field', 'topBand', 'trackBand', 'moveBand', 'map']);
});

it('places each band at its world y, at its own anchor trench x', () => {
  G.sel = 2; layoutActions(); layoutTrackButton();
  const { K } = metrics(), L = trackGlyphLine(0);
  expect(parseFloat($('topBand').style.top)).toBeCloseTo(BAND_Y.top * K, 5);
  expect(parseFloat($('moveBand').style.top)).toBeCloseTo(BAND_Y.move * K, 5);
  expect(parseFloat($('trackBand').style.top)).toBeCloseTo(BAND_Y.track * K, 5);
  expect(parseFloat($('topBand').style.left)).toBeCloseTo(toScreen(anchorX(2), 0).x, 5);
  expect(parseFloat($('moveBand').style.left)).toBeCloseTo(toScreen(anchorX(2), 0).x, 5);
  expect(parseFloat($('trackBand').style.left)).toBeCloseTo(toScreen(anchorX(L), 0).x, 5);
});

it('each band leans by stackSide of its own anchor trench', () => {
  G.sel = 0; layoutActions(); layoutTrackButton();   // track anchor is trench 1, not 0
  expect($('topBand').style.transform).not.toContain('-100%');
  expect($('moveBand').style.transform).not.toContain('-100%');
  expect($('trackBand').style.transform).toContain('-100%');
  G.sel = 1; layoutActions();
  expect($('topBand').style.transform).toContain('-100%');
  expect($('moveBand').style.transform).toContain('-100%');
});

it('hides the top and move bands together when the selected trench is off-screen', () => {
  layoutActions();
  expect($('topBand').hidden).toBe(false); expect($('moveBand').hidden).toBe(false);
  cam.x = 100000; layoutActions();
  expect($('topBand').hidden).toBe(true); expect($('moveBand').hidden).toBe(true);
  cam.x = 0; layoutActions();
  expect($('topBand').hidden).toBe(false);
});
```
Port the three existing `trackBtn` layout tests (`floats at the segment it would affect`, `hides ... once the track is complete`, `hides ... off-screen`) so that they assert on `$('trackBand')` (`style.left`, `hidden`) instead of `$('trackBtn')`. In `describe('game loop')`, change the per-frame repositioning test to read `$('topBand').style.left` and rename it `repositions the bands every frame, not just every 0.25s refresh tick`. Delete the old `never collides vertically with the trackBtn band` test, because Task 2 replaces it.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/unit/ui.test.js tests/unit/fieldActions.test.js`
Expected: FAIL. `BAND_Y` is not exported, `#topBand` is null, and `#fieldActions` still exists.

- [ ] **Step 3: Implement**

- `index.html`: the band markup from Interfaces, replacing lines 20–32.
- `src/ui/fieldActions.js`: add `BAND_Y` with a one-line comment that the values were checked against K 0.8–1.27 in the design doc.
- `src/ui/hud.js`: write `placeBand(el, L, worldY)`. `layoutActions()` calls it for `#topBand` and `#moveBand` with `G.sel`. `layoutTrackButton()` sets `#trackBand` hidden on a `null` anchor and otherwise calls it with `trackGlyphLine(0)` and `BAND_Y.track`. Rewrite both header comments to describe the bands. Drop the `WH` import if nothing else uses it.
- `src/styles.css`: replace `.fieldGrp`, `.fieldGrp .actRow` and `.fieldFloat` with `.fieldBand{position:absolute;z-index:2;display:flex;gap:4px;min-width:0}` and `.fieldBand .fb{display:flex}`. Retarget the compact-button rules (`.fieldGrp .act,.fieldFloat.act`, `.fieldFloat.trkbtn*`) to `.fieldBand .act` and `.fieldBand .trkbtn*`, and keep the existing comment explaining the small size. Add `.fb:has(> [hidden]){display:none}` so a hidden `defBtn` leaves no gap.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/unit/ui.test.js tests/unit/fieldActions.test.js`
Expected: PASS

- [ ] **Step 5: Full check**

Run: `npm run check && npm run e2e`
Expected: both exit 0. The e2e test clicks `#advBtn`/`#trackBtn` by id, so it needs no edit yet.

- [ ] **Step 6: Commit**

```bash
git add index.html src/ui/fieldActions.js src/ui/hud.js src/styles.css tests/unit/ui.test.js tests/unit/fieldActions.test.js
git commit -m "feat: split field buttons into top, track and move bands"
```

---

### Task 2: Round icon buttons, descriptions in `aria-label`/`data-tip`, hover/focus popover

**Files:**
- Create: `src/ui/fieldTips.js`
- Modify: `index.html` (sprite sheet, and button contents and classes inside the three bands)
- Modify: `src/ui/hud.js` (`refresh()`, destination only, see Global Constraints)
- Modify: `src/styles.css` (round button, icon, popover)
- Test: `tests/unit/ui.test.js`, `tests/e2e/game.e2e.test.js:155`

**Interfaces:**
- Consumes: the band DOM and `BAND_Y` from Task 1.
- Produces:
  - `setTip(el: HTMLElement, text: string): void` in `src/ui/fieldTips.js`. It sets `aria-label` and `data-tip` to `text` and touches nothing else.
  - Sprite: right after `<body>`, `<svg class="sprite" aria-hidden="true" focusable="false">` holding eight `<symbol viewBox="0 0 24 24">` elements with these ids and shapes. The builder chooses the exact paths:
    | id | Shape |
    |---|---|
    | `i-adv` | one chevron pointing right (+x, toward the enemy) |
    | `i-back` | one chevron pointing left |
    | `i-gather` | two arrows converging downward to one point |
    | `i-fort` | a sandbag wall (two staggered rows of rounded rects) |
    | `i-nest` | a crossed-gun silhouette (two crossed barrels on a small base) |
    | `i-def` | a shield/bunker outline |
    | `i-track` | a rail tie (two rails across three sleepers) |
    | `i-fix` | the rail tie with a wrench over it |
    Each symbol uses only `<path>`/`<line>`/`<rect>`/`<circle>` with `fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"`, so the disabled colour comes through automatically. `.sprite{position:absolute;width:0;height:0;overflow:hidden}`. Don't use `display:none` or `hidden` on the sprite, because some engines then fail to render `<use>` references.
  - Every field button becomes `<button class="fbtn" id="…" aria-label="…" data-tip="…"><svg class="ico" aria-hidden="true" focusable="false"><use href="#i-…"/></svg></button>`. `act`, `alt` and `trkbtn` are removed from these seven only. The initial `aria-label`/`data-tip` equal today's static text (`Fortify`, `MG nest`, `Defence`, `Fall back`, `Bring all here`, `Advance`, and `Lay track` for `trackBtn`). `backBtn` and `gatherBtn` keep these static values for good, since `refresh()` never sets their text. `defBtn` keeps its `hidden` attribute.

- [ ] **Step 1: Write the failing tests**

New `describe('field icon buttons')` in `tests/unit/ui.test.js`:
```js
const FIELD = ['fortBtn', 'nestBtn', 'defBtn', 'trackBtn', 'backBtn', 'gatherBtn', 'advBtn'];
const ICON = { fortBtn: '#i-fort', nestBtn: '#i-nest', defBtn: '#i-def', trackBtn: '#i-track', backBtn: '#i-back', gatherBtn: '#i-gather', advBtn: '#i-adv' };

it('every field button is a round icon button whose icon survives refresh()', () => {
  G.S.supplies = 500; refresh(); refresh();
  for (const id of FIELD) {
    const b = $(id);
    expect(b.classList.contains('fbtn')).toBe(true);
    expect(b.classList.contains('act')).toBe(false);
    expect(b.querySelector('svg.ico use').getAttribute('href')).toBe(ICON[id]);
    expect(document.querySelector('svg.sprite symbol' + ICON[id])).toBeTruthy();
    expect(b.textContent.trim()).toBe('');                       // no visible words
    expect(b.getAttribute('data-tip')).toBe(b.getAttribute('aria-label'));
  }
});

it('refresh() writes the same descriptions as before, into aria-label', () => {
  G.S.supplies = 500; G.sel = 1; refresh();
  expect($('fortBtn').getAttribute('aria-label')).toBe('Fortify: ' + FORT_COST[G.fort[1]]);
  expect($('nestBtn').getAttribute('aria-label')).toBe(NAT.gb.nestLabel + ': ' + nestCost(0));
  expect($('defBtn').getAttribute('aria-label')).toBe(NAT.gb.def.label + ': ' + NAT.gb.def.cost);
  expect($('advBtn').getAttribute('aria-label')).toBe('Advance');
  expect($('backBtn').getAttribute('aria-label')).toBe('Fall back');
  expect($('gatherBtn').getAttribute('aria-label')).toBe('Bring all here');
  G.sel = G.NT; refresh();
  expect($('advBtn').getAttribute('aria-label')).toBe('Storm the HQ');
});

it('the track icon swaps to the wrench while a segment is broken', () => {
  G.owner[1] = 0; layTrack(0); G.track[0].broken.add(1); refresh();
  expect($('trackBtn').querySelector('use').getAttribute('href')).toBe('#i-fix');
  G.track[0].broken.clear(); refresh();
  expect($('trackBtn').querySelector('use').getAttribute('href')).toBe('#i-track');
});

it('30px bands never collide at either K extreme (CH 240 or 380)', () => {
  const css = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8');
  expect(css).toMatch(/--fb:\s*30px/);
  const r = 15;                                  // half of --fb
  for (const K of [240 / WH, 380 / WH]) {
    const top = BAND_Y.top * K, mid = BAND_Y.track * K, bot = BAND_Y.move * K;
    expect(top - r).toBeGreaterThan(12 * K);     // below the ownership pennant (y 4–12)
    expect(top + r).toBeLessThan(mid - r);
    expect(mid + r).toBeLessThan(bot - r);
    expect(bot + r).toBeLessThan(283 * K);       // above the fort pips (y ≈ 287)
  }
});
```
Import `FORT_COST` from `src/data/units.js`, `NAT` from `src/data/nations.js`, `nestCost` from `src/sim/state.js`, and `readFileSync`/`resolve` from `node:fs`/`node:path`. In `describe('hud')`, change `expect($('advBtn').textContent).toBe('Advance')` to read `getAttribute('aria-label')`. In `describe('railway buttons')`, change each `$('trackBtn').textContent` to `$('trackBtn').getAttribute('aria-label')`, keeping the same `toContain` strings, so `'Lay track: 20'` and `'Trench 1 is not held.'` must both still appear. In `tests/e2e/game.e2e.test.js:155`, change `.textContent` to `.getAttribute('aria-label')`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/unit/ui.test.js`
Expected: FAIL. There is no `.fbtn` and no `svg.sprite`, and `aria-label` is null.

- [ ] **Step 3: Implement**

- `src/ui/fieldTips.js`: a header comment (DOM side of the field buttons: description text and, from Task 3, touch reveal) and `setTip`.
- `index.html`: the sprite and the button markup from Interfaces.
- `src/ui/hud.js` `refresh()`: import `setTip`. Change `fb.textContent = X`, `nb.textContent = X`, `db.textContent = X` and `$('advBtn').textContent = X` to `setTip(el, X)` with each `X` unchanged. For `trackBtn`, split the `innerHTML` line into `const head = <the existing (broken ? 'Repair track: ' : 'Lay track: ') + c>` and `sub = <the existing (why || (…)) expression, verbatim>`, then call `setTip(tb, head + (sub ? '. ' + sub : ''))`. Add one line: `tb.querySelector('use').setAttribute('href', broken ? '#i-fix' : '#i-track');`. Leave every `disabled`/`hidden` line alone.
- `src/styles.css`: delete Task 1's `.fieldBand .act`/`.fieldBand .trkbtn*` compact rules. Add `--fb:30px` to `.fieldwrap`. Add `.fbtn{position:relative;width:var(--fb);height:var(--fb);padding:0;border-radius:50%;display:grid;place-items:center;background:var(--panel);color:var(--ink);border:1px solid var(--line)}`, `.fbtn:disabled{background:var(--btn-off);color:var(--btn-off-ink);border-color:transparent;cursor:default;pointer-events:none}` (the `pointer-events` part is what Task 3's wrapper hit-testing depends on), `#advBtn.fbtn:not(:disabled){background:var(--btn);color:var(--btn-ink)}` (keeps today's primary-button emphasis), and `.fbtn .ico{width:20px;height:20px;pointer-events:none}`. Popover: `.fbtn::after{content:attr(data-tip);position:absolute;display:none;white-space:nowrap;…}` in the `#toast` palette, shown by `@media (hover:hover){.fb:hover > .fbtn::after{display:block}}` and `.fbtn:focus-visible::after{display:block}`. It opens below the button in `#topBand` (`top:100%`) and above it in `#trackBand`/`#moveBand` (`bottom:100%`), so it never runs past the clipped top edge of `.fieldwrap`. The `:hover` sits on the `.fb` wrapper because a disabled `.fbtn` no longer receives the pointer. The builder chooses horizontal placement near the screen edges and the type sizes.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/unit/ui.test.js`
Expected: PASS

- [ ] **Step 5: Full check, then a manual look**

Run: `npm run check && npm run e2e`
Expected: both exit 0.
Then run `npm run dev`, start a battle, and at the shortest and tallest window heights confirm that all three bands sit clear of each other, the trench number, the pips and the flag, that a disabled button is visibly greyed, that hovering a disabled `fortBtn` shows its popover (disabled buttons cannot take focus, so the hover on the wrapper is the mouse path), and that Tab-focusing an enabled button shows its popover.

- [ ] **Step 6: Commit**

```bash
git add src/ui/fieldTips.js index.html src/ui/hud.js src/styles.css tests/unit/ui.test.js tests/e2e/game.e2e.test.js
git commit -m "feat: round icon field buttons with aria-label descriptions"
```

---

### Task 3: Touch reveal (first tap shows the description, second tap acts)

**Files:**
- Modify: `src/ui/fieldTips.js`
- Modify: `src/ui/hud.js` (`initHud()` gets one call; `layoutActions()` gets one call)
- Modify: `src/styles.css` (one selector added to the popover rule)
- Test: `tests/unit/ui.test.js`

**Interfaces:**
- Consumes: `.fieldBand > .fb > .fbtn` DOM, `setTip` (Task 2), `G` from `src/sim/state.js`.
- Produces, all in `src/ui/fieldTips.js`:
  - `initFieldTips(): void` registers three `document`-level listeners. `initHud()` calls it once.
  - `clearReveal(): void` removes `revealed` from whichever `.fb` has it and resets the internal state.
  - `revealedButton(): HTMLButtonElement | null` returns the revealed button, for tests.
  - `syncRevealSel(sel: number): void` calls `clearReveal()` when `sel` differs from the `G.sel` recorded at reveal time. `layoutActions()` calls `syncRevealSel(G.sel)` first, so the check runs every frame.
- Behaviour. The module state is `revealed` (a `.fb` or `null`), `revealSel`, and `swallow` (a button or `null`).
  - `pointerdown` (capture): set `swallow = null`. If `revealed` is set and `ev.target` is outside it, call `clearReveal()`.
  - `pointerup` (bubble): `const fb = ev.target.closest('.fieldBand .fb')`. If there's no `fb`, or `ev.pointerType` isn't `'touch'`/`'pen'`, do nothing. If `fb === revealed`, do nothing, so the coming click goes through. Otherwise clear any reveal, add `revealed` to `fb`, record `revealSel = G.sel`, and set `swallow = fb.firstElementChild` only if that button is not disabled (a disabled button gets no click, so a flag would go stale).
  - `click` (capture, on `document`, so it runs before `initHud`'s target-phase listeners): `const btn = ev.target.closest('.fieldBand .fbtn')`. Match with `closest` and never with `ev.target ===`, because a real tap can land on the inner `<svg>`. If `btn` is set and `btn === swallow`, call `ev.stopPropagation()` and `ev.preventDefault()`, then set `swallow = null`. If `btn` is set and isn't `swallow`, call `clearReveal()` and let the click through. If `btn` is null, as with a click on a disabled button's wrapper `<span>`, do nothing, so the reveal that tap just made stays.
- CSS: add `.fb.revealed > .fbtn::after` to the selectors that show the popover.

- [ ] **Step 1: Write the failing tests**

New `describe('field button touch reveal')` in `tests/unit/ui.test.js`, with `beforeEach(() => clearReveal())`:
```js
const touchTap = (el, type = 'touch') => {
  el.dispatchEvent(new PointerEvent('pointerdown', { pointerType: type, bubbles: true }));
  el.dispatchEvent(new PointerEvent('pointerup', { pointerType: type, bubbles: true, cancelable: true }));
  el.click();          // jsdom: no-op on a disabled button, a real click otherwise
};

it('a mouse or keyboard click acts at once', () => {
  G.S.supplies = 200; refresh();
  $('fortBtn').click();                                  // jsdom click(): PointerEvent, pointerType ''
  expect(G.fort[1]).toBe(1);
  expect(revealedButton()).toBeNull();
});

it('first touch tap reveals without acting, the second tap acts', () => {
  G.S.supplies = 200; refresh();
  touchTap($('fortBtn'));
  expect(G.fort[1]).toBe(0);
  expect(revealedButton()).toBe($('fortBtn'));
  expect($('fortBtn').parentElement.classList.contains('revealed')).toBe(true);
  touchTap($('fortBtn'));
  expect(G.fort[1]).toBe(1);
  expect(revealedButton()).toBeNull();
});

it('pen behaves like touch', () => {
  G.S.supplies = 200; refresh();
  touchTap($('fortBtn'), 'pen');
  expect(G.fort[1]).toBe(0);
  expect(revealedButton()).toBe($('fortBtn'));
});

it('a disabled button can be revealed by tapping its wrapper', () => {
  G.S.supplies = 0; refresh();
  expect($('fortBtn').disabled).toBe(true);
  touchTap($('fortBtn').parentElement);                  // pointer-events:none sends the real tap here
  expect(revealedButton()).toBe($('fortBtn'));
});

it('a reveal on a disabled button never swallows a later click', () => {
  G.S.supplies = 0; refresh();
  touchTap($('fortBtn').parentElement);
  G.S.supplies = 200; refresh();
  $('fortBtn').click();
  expect(G.fort[1]).toBe(1);
});

it('aria-label is the same before, during and after a reveal', () => {
  G.S.supplies = 200; refresh();
  const label = $('fortBtn').getAttribute('aria-label');
  touchTap($('fortBtn'));
  expect($('fortBtn').getAttribute('aria-label')).toBe(label);
  expect($('fortBtn').getAttribute('data-tip')).toBe(label);
  clearReveal();
  expect($('fortBtn').getAttribute('aria-label')).toBe(label);
});

it('revealing a button in another band clears the first, without acting', () => {
  G.S.supplies = 200; refresh();
  touchTap($('fortBtn'));
  touchTap($('advBtn'));
  expect(revealedButton()).toBe($('advBtn'));
  expect($('fortBtn').parentElement.classList.contains('revealed')).toBe(false);
  expect(G.sel).toBe(1);                                 // advance did not fire
  expect(G.fort[1]).toBe(0);
});

it('tapping elsewhere clears the reveal', () => {
  touchTap($('advBtn'));
  $('field').dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'touch', bubbles: true }));
  expect(revealedButton()).toBeNull();
});

it('a G.sel change clears any reveal', () => {
  G.S.supplies = 200; refresh();
  touchTap($('fortBtn'));
  G.sel = 0; layoutActions();                            // same path the sim's own front-line pull-back takes
  expect(revealedButton()).toBeNull();
  G.sel = 1; refresh(); $('fortBtn').click();
  expect(G.fort[1]).toBe(1);                             // and nothing is left to swallow the next click
});
```
Import `clearReveal` and `revealedButton` from `src/ui/fieldTips.js`. This mechanism was checked against the installed jsdom 30.1.3: `new PointerEvent(type, { pointerType })` exists and keeps `pointerType`, `el.click()` dispatches a `PointerEvent` whose `pointerType` is `''`, and `click()` on a disabled button is a no-op.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/unit/ui.test.js -t "touch reveal"`
Expected: FAIL. `clearReveal` and `revealedButton` are not exported.

- [ ] **Step 3: Implement** `initFieldTips`, `clearReveal`, `revealedButton` and `syncRevealSel` in `src/ui/fieldTips.js` as specified. Call `initFieldTips()` from `initHud()` and `syncRevealSel(G.sel)` at the top of `layoutActions()`, and add the CSS selector.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/unit/ui.test.js`
Expected: PASS. That includes the older `pointer input` tests, which dispatch plain `MouseEvent`s (`pointerType` `undefined`) and must behave exactly as before.

- [ ] **Step 5: Full check, then a touch check**

Run: `npm run check && npm run e2e`
Expected: both exit 0.
Then, in browser devtools touch emulation (or on a phone through `npm run dev -- --host`): tap Advance once and check that the description shows and the troops stay put; tap it again and check that they advance; tap a disabled Fortify and check that it reveals its reason; tap the canvas and check that the popover closes.

- [ ] **Step 6: Commit**

```bash
git add src/ui/fieldTips.js src/ui/hud.js src/styles.css tests/unit/ui.test.js
git commit -m "feat: tap once to reveal, tap again to act on touch field buttons"
```
