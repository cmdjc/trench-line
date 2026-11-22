# Icon Field Buttons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the visible text on the seven floating field buttons (`backBtn`, `gatherBtn`, `advBtn`, `fortBtn`, `nestBtn`, `defBtn`, `trackBtn`) with small inline-SVG icons. The full description moves to `aria-label` plus a CSS popover driven by `data-tip`. The popover shows on hover/focus for mouse and keyboard users. On touch and pen, the first tap shows it and a second tap fires the button.

**Architecture:** The icons are `<symbol>`s in one hidden SVG sprite at the top of `index.html`'s body. Each button holds `<svg class="ico"><use href="#i-…"/></svg>` and nothing else. `refresh()` in `src/ui/hud.js` keeps computing exactly the same strings, but sends them through a new `setTip()` helper in `src/ui/dom.js`, which writes `aria-label` and `data-tip`, so the icon is never overwritten. A new module, `src/ui/reveal.js`, owns the touch two-tap state: document-level capture listeners for `pointerdown`, `pointerup` and `click`, plus a per-frame `syncReveal()` called from `src/ui/loop.js`.

**Tech Stack:** Vanilla ES modules, inline SVG, vanilla CSS, Vitest 4.1.12 with jsdom 30.1.3 (`tests/unit/ui-page.js` fixture), the e2e harness in `tests/e2e/game.e2e.test.js`.

**Spec:** `docs/superpowers/specs/2026-11-22-icon-field-buttons-design.md`

## Global Constraints

- Every existing line in `refresh()` that sets `disabled` or `hidden` on these seven buttons stays **byte-identical**. That covers `fb.disabled`, `nb.disabled`, `db.hidden`, `db.disabled`, `advBtn.disabled`, `backBtn.disabled` and `tb.disabled`.
- The string expressions that compute each button's text also stay **byte-identical**. Only their sink changes:
  - `fb.textContent = EXPR` becomes `setTip(fb, EXPR)`. The same applies to `nb`, `db` and `$('advBtn')`.
  - `tb.innerHTML = '<b>' + A + '</b><small>' + B + '</small>'` becomes `setTip(tb, A, B)`, with `A` and `B` copied verbatim.
  - The only new line in `refresh()` is `tb.classList.toggle('broken', broken);`, which drives the icon swap from the existing `broken` const.
- `backBtn` and `gatherBtn` have no text in `refresh()` today. Their `aria-label`/`data-tip` are static in `index.html`: `Fall back` and `Bring all here`. `defBtn`'s static markup uses `Defence`, `fortBtn`'s uses `Fortify`, `nestBtn`'s uses `MG nest`, `advBtn`'s uses `Advance` and `trackBtn`'s uses `Lay track`. `refresh()` overwrites the dynamic ones on its first tick.
- `setTip(el, head, detail = '')` writes `aria-label` = `detail ? head + '. ' + detail : head` and `data-tip` = `detail ? head + '\n' + detail : head`. It is the only writer of these two attributes on the seven buttons.
- Button ids, `initHud()` click listeners, `layoutActions()` and `layoutTrackButton()` are unchanged. `src/sim/**` is untouched.
- Icons are inline SVG only: no emoji, images, sprites-as-files or icon fonts. Each icon is a 16×16 `viewBox="0 0 16 16"` symbol, stroked in `currentColor`, so enabled and disabled buttons pick up the existing `--ink`/`--btn-ink`/`--btn-off-ink` palette in both themes.
- Only the seven field buttons change. The buy row, base panel, `trainBtn`, `swBtn`, `gunBtn` and the map strip keep their current text style.
- **Touch/mouse contract** (the one rule the tests pin):
  - A `pointerup` whose `pointerType` is exactly `'touch'` or `'pen'`, on a `.fieldBtn` that is not currently revealed, reveals that button and swallows the click that follows.
  - Any other `pointerType` (`'mouse'`, `''`, or `undefined`, as with the existing tests' `new MouseEvent('pointerup')`) never reveals and never swallows.
  - A `click` that arrives with no preceding pointerup always fires. That covers keyboard Enter/Space, `el.click()` in unit tests, and the e2e harness's `click()`.
- **Reveal lifetime:**
  - A revealed button stays revealed through further taps on itself, so repeat presses on the same trench take one tap each.
  - It is cleared by a `pointerup` of any type that does not land on that button (another field button, the canvas, anywhere else).
  - It is cleared by `G.sel` differing from the `G.sel` at reveal time. This applies to all seven buttons, `trackBtn` included, as one uniform rule. Because Advance and Fall back change `G.sel`, a second tap that fires them also ends the reveal.
  - It is cleared by the revealed button, or any ancestor, becoming `hidden`.
  - `syncReveal()` checks these conditions every frame.
- `npm run check` and `npm run e2e` pass at the end of every task.

## Review Focus

1. **A disabled button must still be revealable on touch**, so the player can learn why it is off (e.g. `Fortify: 40` with no supplies). The second tap must do nothing. The reveal listener sits on `document`, not the button, so it never depends on a disabled control's own listeners. Task 2 test `reveals a disabled button but a second tap does nothing`. Manual check in Task 2 Step 6, because real browsers' pointer-event dispatch on disabled controls cannot be proven in jsdom.
2. **`aria-label` stays correct regardless of reveal state.** Revealing writes only `data-revealed` and never touches `aria-label`/`data-tip`. `refresh()` keeps updating both while a button is revealed, so a revealed tip shows the live cost. Task 2 test `reveal does not change aria-label, and refresh keeps updating it while revealed`.
3. **Revealing one button clears any other.** Only one `[data-revealed]` exists at a time, and the dismissing tap does not fire the newly tapped button. Task 2 test `touching a second button moves the reveal and fires neither`.
4. **A reveal does not survive a selection change.** Decision: when `G.sel` changes, the reveal is cleared on the next frame, so a stale Fortify tip for the old trench never sits over the new trench's button. Task 2 test `selection change clears the reveal`.
5. **A swallowed touch with no click after it** (finger slid off, or a disabled target where browsers send no click) must not leave a "swallow next click" flag that eats a later mouse or keyboard click on that same button once it becomes enabled. The flag is reset on every `pointerdown` and `keydown`. Task 2 test `a stale swallow from a disabled touch does not eat a later keyboard or mouse click`.

---

### Task 1: Icons, description redirection, and the hover/focus popover

Icons and the text redirection ship together: an icon in the markup alongside the old `textContent` writes would be wiped every refresh, and redirecting the text without icons would leave blank buttons. Neither half can ship on its own.

**Files:**
- Modify: `index.html` (sprite at the top of `<body>`; the seven buttons in `.fieldwrap`)
- Modify: `src/ui/dom.js` (add `setTip`)
- Modify: `src/ui/hud.js:117-124,136-138` (sinks only; see Global Constraints)
- Modify: `src/styles.css` (`.fieldGrp .act,.fieldFloat.act` at line 53; delete `.fieldFloat.trkbtn*` at lines 54-56 and `.trkbtn*` at lines 99-101, since only `#trackBtn` uses `trkbtn`; add `.fieldBtn`, `.ico` and popover rules)
- Test: `tests/unit/ui.test.js`, `tests/e2e/game.e2e.test.js`

**Interfaces:**
- Produces:
  - `setTip(el: HTMLElement, head: string, detail?: string) → void`, exported from `src/ui/dom.js`.
  - Class `fieldBtn` on all seven buttons. Task 2 selects buttons with `closest('.fieldBtn')`.
  - The `data-revealed` attribute name, styled here. Task 2 sets and removes it.
  - `#trackBtn.broken` toggled by `refresh()`.
- Markup, per button: `<button class="act alt fieldBtn" id="fortBtn" aria-label="Fortify" data-tip="Fortify"><svg class="ico" aria-hidden="true" focusable="false"><use href="#i-fort"/></svg></button>`.
  - `advBtn` keeps `class="act fieldBtn"`, without `alt`.
  - `defBtn` keeps `hidden`.
  - `trackBtn` becomes `class="act alt fieldBtn fieldFloat"`, without `trkbtn`. It holds two svgs, `svg.ico.ico-lay` → `#i-rail` and `svg.ico.ico-fix` → `#i-fix`.
- Sprite: `<svg width="0" height="0" style="position:absolute" aria-hidden="true">`. Do not use `display:none`, which breaks `<use>` in some engines. It holds these symbols. The paths are starting shapes; the builder may refine them within the 16-unit grid.
  - `i-adv` (forward chevron): `<path d="M5 3l6 5-6 5"/>`
  - `i-back` (backward chevron): `<path d="M11 3 5 8l6 5"/>`
  - `i-gather` (two arrows converging down): `<path d="M3 2l5 6M13 2 8 8M8 8v6M5.5 11.5 8 14l2.5-2.5"/>`
  - `i-fort` (sandbag wall): `<rect x="1.5" y="9" width="6" height="4.5" rx="2"/><rect x="8.5" y="9" width="6" height="4.5" rx="2"/><rect x="5" y="4" width="6" height="4.5" rx="2"/>`
  - `i-nest` (crossed guns): `<path d="M2 14 14 2M2 2l12 12M11 2h3v3M2 11v3h3"/>`
  - `i-def` (shield): `<path d="M8 1.5l5.5 2v4c0 3.5-2.5 6-5.5 7-3-1-5.5-3.5-5.5-7v-4z"/>`
  - `i-rail` (rail ties): `<path d="M1 6h14M1 10h14M3.5 4v8M8 4v8M12.5 4v8"/>`
  - `i-fix` (wrench over rail): `<path d="M1 13h14M3.5 11v4M8 11v4M12.5 11v4M4 9l5-5"/><circle cx="10.5" cy="3.5" r="2"/>`
- CSS values:
  - `.ico{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round;display:block}`
  - `.fieldBtn{position:relative;flex:0 0 auto;width:28px;height:28px;min-height:0;padding:0;display:grid;place-items:center}`, replacing the line-53 compact sizing for these buttons.
  - `#trackBtn .ico-fix,#trackBtn.broken .ico-lay{display:none}` and `#trackBtn.broken .ico-fix{display:block}`.
  - Popover, `.fieldBtn::after`: `content:attr(data-tip)`, `display:none`, `position:absolute`, `top:calc(100% + 4px)`, `left:50%`, `transform:translateX(-50%)`, `white-space:pre`, `text-align:left`, `padding:3px 6px`, `background:var(--ink)`, `color:var(--bg)`, `font-size:11.5px`, `font-weight:400`, `line-height:1.25`, `border-radius:2px`, `pointer-events:none`, `z-index:3`.
  - Show rule: `@media (hover:hover){.fieldBtn:hover::after{display:block}}` plus `.fieldBtn:focus-visible::after,.fieldBtn[data-revealed]::after{display:block}`. The `hover:hover` guard stops sticky touch-hover from showing tips.
  - The popover opens below, because `#trackBtn` sits near the canvas top (world y 40) and `.fieldwrap` is `overflow:clip`. Edge flipping is left to the builder, per the spec.

- [ ] **Step 1: Update the existing text assertions to read `aria-label`, and write the new failing tests**

Existing assertions that read text now read the label: `ui.test.js:126` (`advBtn`), `:748`, `:749`, `:759`, `:764` (`trackBtn`) and `game.e2e.test.js:155` all switch from `.textContent` to `.getAttribute('aria-label')`. The expected substrings are unchanged.

New `describe('icon field buttons', …)` in `tests/unit/ui.test.js`:

```js
const IDS = ['backBtn', 'gatherBtn', 'advBtn', 'fortBtn', 'nestBtn', 'defBtn', 'trackBtn'];

it('each field button shows only an icon, hidden from assistive tech', () => {
  refresh();
  for (const id of IDS) {
    const b = $(id);
    expect(b.classList.contains('fieldBtn')).toBe(true);
    expect(b.textContent.trim()).toBe('');
    const svg = b.querySelector('svg.ico');
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.querySelector('use').getAttribute('href')).toMatch(/^#i-/);
  }
});

it('aria-label and data-tip carry the text the buttons used to show', () => {
  refresh();
  expect($('backBtn').getAttribute('aria-label')).toBe('Fall back');
  expect($('gatherBtn').getAttribute('aria-label')).toBe('Bring all here');
  expect($('advBtn').getAttribute('aria-label')).toBe('Advance');
  expect($('nestBtn').getAttribute('aria-label')).toBe(NAT.gb.nestLabel + ': ' + nestCost(0));
  expect($('fortBtn').getAttribute('aria-label')).toMatch(/^Fortify|^Fully fortified/);
  for (const id of IDS) expect($(id).dataset.tip).toBe($(id).getAttribute('aria-label').replace('. ', '\n'));
  G.sel = G.NT; refresh();
  expect($('advBtn').getAttribute('aria-label')).toBe('Storm the HQ');
});

it('trackBtn splits head and reason across aria-label and data-tip', () => {
  G.S.supplies = 500; G.owner[1] = 1; refresh();
  expect($('trackBtn').getAttribute('aria-label')).toBe('Lay track: 20. Trench 1 is not held.');
  expect($('trackBtn').dataset.tip).toBe('Lay track: 20\nTrench 1 is not held.');
  G.owner[1] = 0; refresh();
  expect($('trackBtn').getAttribute('aria-label')).toBe('Lay track: 20');   // no reason, no dangling '. '
});

it('trackBtn swaps to the repair icon while a segment is broken', () => {
  G.owner[1] = 0; layTrack(0); refresh();
  expect($('trackBtn').classList.contains('broken')).toBe(false);
  G.track[0].broken.add(1); refresh();
  expect($('trackBtn').classList.contains('broken')).toBe(true);
});

it('the stylesheet builds the popover from data-tip', () => {
  const css = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8');
  expect(css).toContain('attr(data-tip)');
  expect(css).toMatch(/\.fieldBtn:focus-visible::after/);
});
```

(Import `NAT` from `src/data/nations.js`, `nestCost` from `src/sim/state.js`, and `readFileSync`/`resolve` from `node:fs`/`node:path` if they are not already imported.)

- [ ] **Step 2: Run the tests to confirm they fail**

Run: `npx vitest run tests/unit/ui.test.js`
Expected: FAIL. No `.fieldBtn` class, no `svg.ico`, and `aria-label` is null.

- [ ] **Step 3: Add `setTip` to `src/ui/dom.js`, the sprite and button markup to `index.html`, and the CSS described in Interfaces**

- [ ] **Step 4: Redirect the sinks in `refresh()` exactly as in Global Constraints, and add `tb.classList.toggle('broken', broken);`**

Import `setTip` from `./dom.js`, next to the existing `$` import. Diff the block before committing: only the `textContent =`/`innerHTML =` sinks and the one new `classList` line may differ.

- [ ] **Step 5: Run the tests to confirm they pass**

Run: `npx vitest run tests/unit/ui.test.js`
Expected: PASS, including the unchanged collision test at `ui.test.js:241`. Its 46px row heights are now an over-estimate of the 28px buttons, so it still holds.

- [ ] **Step 6: Run full verification**

Run: `npm run check && npm run e2e`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add index.html src/ui/dom.js src/ui/hud.js src/styles.css tests/unit/ui.test.js tests/e2e/game.e2e.test.js
git commit -m "feat: icon-only field buttons with aria-label and hover tip"
```

### Task 2: Touch two-tap reveal

**Files:**
- Create: `src/ui/reveal.js`
- Modify: `src/main.js:24` (call `initReveal()` after `initHud()`)
- Modify: `src/ui/loop.js:30` (`if (G.S) { layoutActions(); layoutTrackButton(); syncReveal(); }`, called after layout so `hidden` is current)
- Test: `tests/unit/ui.test.js`, `tests/e2e/game.e2e.test.js`

**Interfaces:**
- Consumes: the `.fieldBtn` class and `[data-revealed]` styling from Task 1; `G` from `src/sim/state.js`.
- Produces, from `src/ui/reveal.js`:
  - `initReveal() → void`. It adds three listeners on `document`, all with `{ capture: true }`:
    - `pointerdown` and `keydown`: reset the swallow flag, so a keyboard Enter/Space on a still-revealed button is never eaten.
    - `pointerup`: implements the touch/mouse contract and the "any pointerup off the revealed button clears it" rule.
    - `click`: if the swallow flag is set and `ev.target.closest('.fieldBtn')` is the flagged button, call `ev.stopPropagation()` and `ev.preventDefault()`. Either way, reset the flag.
  - `syncReveal() → void`. Clears the reveal when `G.sel !== revealSel`, or when `revealed.closest('[hidden]')` is non-null.
  - `clearReveal() → void`. Removes `data-revealed` and nulls the module's state.
  - `revealedBtn() → HTMLButtonElement | null`. Used by tests.
- Module state: `revealed` (button or null), `revealSel` (number), `swallow` (button or null).

- [ ] **Step 1: Write the failing tests**

New `describe('touch reveal', …)` in `tests/unit/ui.test.js`, with `beforeEach(() => clearReveal())`. Tests start at the suite's `G.sel === 1`. Simulated taps use jsdom 30.1.3's `PointerEvent`, which supports `pointerType` (confirmed in `node_modules/jsdom/lib/generated/idl/PointerEventInit.js`). Use `window.PointerEvent` so the helper works whether or not Vitest copies it onto `globalThis`.

```js
// down + up with an explicit pointerType, then click() — the same order a browser
// sends for a tap. click() is a no-op on a disabled button, as in a browser.
function press(el, pointerType) {
  el.dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true, pointerType }));
  el.dispatchEvent(new window.PointerEvent('pointerup', { bubbles: true, pointerType }));
  el.click();
}

it('mouse fires at once and never reveals', () => {
  press($('advBtn'), 'mouse');
  expect(G.sel).toBe(2);
  expect($('advBtn').hasAttribute('data-revealed')).toBe(false);
});

it('a click with no pointer events (keyboard, e2e harness) fires at once', () => {
  $('advBtn').click();
  expect(G.sel).toBe(2);
  expect(revealedBtn()).toBe(null);
});

it('first touch tap reveals without firing; second tap fires', () => {
  press($('advBtn'), 'touch');
  expect(G.sel).toBe(1);
  expect(revealedBtn()).toBe($('advBtn'));
  expect($('advBtn').hasAttribute('data-revealed')).toBe(true);
  press($('advBtn'), 'touch');
  expect(G.sel).toBe(2);
});

it('pen behaves like touch', () => {
  press($('advBtn'), 'pen');
  expect(G.sel).toBe(1);
  expect(revealedBtn()).toBe($('advBtn'));
});

it('touching a second button moves the reveal and fires neither', () => {
  expect($('backBtn').disabled).toBe(false);
  press($('advBtn'), 'touch');
  press($('backBtn'), 'touch');
  expect(G.sel).toBe(1);
  expect($('advBtn').hasAttribute('data-revealed')).toBe(false);
  expect(revealedBtn()).toBe($('backBtn'));
  expect(document.querySelectorAll('[data-revealed]').length).toBe(1);
});

it('a tap elsewhere dismisses without firing', () => {
  press($('advBtn'), 'touch');
  press($('supplies'), 'touch');
  expect(revealedBtn()).toBe(null);
  expect(G.sel).toBe(1);
});

it('reveals a disabled button but a second tap does nothing', () => {
  G.S.supplies = 0; refresh();
  const fb = $('fortBtn'); expect(fb.disabled).toBe(true);
  const fort0 = G.fort[G.sel];
  press(fb, 'touch');
  expect(revealedBtn()).toBe(fb);
  press(fb, 'touch');
  expect(G.fort[G.sel]).toBe(fort0);
});

it('reveal does not change aria-label, and refresh keeps updating it while revealed', () => {
  refresh(); const before = $('nestBtn').getAttribute('aria-label');
  press($('nestBtn'), 'touch');
  expect($('nestBtn').getAttribute('aria-label')).toBe(before);
  G.S.supplies = 0; refresh();
  expect($('nestBtn').getAttribute('aria-label')).toBe(NAT.gb.nestLabel + ': ' + nestCost(0));
  expect(revealedBtn()).toBe($('nestBtn'));
});

it('selection change clears the reveal', () => {
  press($('fortBtn'), 'touch');
  G.sel = 0; syncReveal();
  expect(revealedBtn()).toBe(null);
  expect($('fortBtn').hasAttribute('data-revealed')).toBe(false);
});

it('hiding the revealed button clears the reveal', () => {
  press($('advBtn'), 'touch');
  cam.x = 1e6; layoutActions(); syncReveal();
  expect(revealedBtn()).toBe(null);
});

it('a stale swallow from a disabled touch does not eat a later keyboard or mouse click', () => {
  G.owner[G.sel] = 0; G.S.supplies = 0; refresh();
  const fb = $('fortBtn'); expect(fb.disabled).toBe(true);
  press(fb, 'touch');                      // no click is delivered, so the swallow flag would otherwise linger
  G.S.supplies = 5000; refresh(); expect(fb.disabled).toBe(false);
  expect(revealedBtn()).toBe(fb);          // same trench, still revealed
  const fort0 = G.fort[G.sel];
  fb.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  fb.click();                              // keyboard activation: no pointer events
  expect(G.fort[G.sel]).toBe(fort0 + 1);
  press(fb, 'mouse');
  expect(G.fort[G.sel]).toBe(fort0 + 2);
});
```

(Import `clearReveal`, `syncReveal`, `revealedBtn` from `../../src/ui/reveal.js`.)

- [ ] **Step 2: Run the tests to confirm they fail**

Run: `npx vitest run tests/unit/ui.test.js`
Expected: FAIL. `src/ui/reveal.js` does not exist yet.

- [ ] **Step 3: Implement `src/ui/reveal.js` per Interfaces and wire it into `main.js`/`loop.js`**

`pointerup` handler, using `btn = ev.target.closest?.('.fieldBtn')`, in this order:

1. If `btn !== revealed`, call `clearReveal()`.
2. If `btn` is null, or `ev.pointerType` is not `'touch'`/`'pen'`, return.
3. If `btn` was already revealed before step 1, return. This is the second tap; the click goes through.
4. Otherwise set `revealed = btn`, `revealSel = G.sel` and `swallow = btn`, and add the `data-revealed` attribute.

- [ ] **Step 4: Run the tests to confirm they pass**

Run: `npx vitest run tests/unit/ui.test.js`
Expected: PASS. The existing canvas tests that dispatch `new MouseEvent('pointerup')` are unaffected, because their `pointerType` is `undefined`.

- [ ] **Step 5: Add the e2e touch step and run full verification**

In `tests/e2e/game.e2e.test.js`, just before the existing `click('#advBtn')` step at about line 181, add a local helper `touch(sel)`. It dispatches `w.PointerEvent` `pointerdown` and `pointerup` with `{ bubbles: true, pointerType: 'touch' }` on the element, then calls `el.click()`. Then add these steps:

1. `touch('#advBtn')`, then assert `T.info().sel === 1` and that `#advBtn` has `data-revealed`.
2. `touch('#supplies')`, then assert that no `[data-revealed]` element remains. Use `#supplies` rather than the canvas, which would select a trench.
3. Leave the existing `click('#advBtn')` step in place; it still advances to 2.

Run: `npm run check && npm run e2e`
Expected: PASS

- [ ] **Step 6: Manual touch check in a real browser**

Run `npm run dev` and open the page in Chrome DevTools device emulation (touch), then in Firefox's responsive mode with touch simulation. Confirm each of the following:

- One tap on Advance shows its tip; a second tap advances.
- One tap on a **disabled** Fortify (spend down supplies first) shows "Fortify: N".
- A tap on the field dismisses the tip.
- With a mouse, hover shows the tip and a single click acts.
- With the keyboard, Tab to a field button shows the tip and Enter acts.

If a disabled button's tap shows nothing in some engine, the pointerup never reached `document` there. Stop and report it rather than replacing `disabled` with `aria-disabled`, because that would change the byte-identical disabled logic.

- [ ] **Step 7: Commit**

```bash
git add src/ui/reveal.js src/main.js src/ui/loop.js tests/unit/ui.test.js tests/e2e/game.e2e.test.js
git commit -m "feat: touch two-tap reveal for field buttons"
```
