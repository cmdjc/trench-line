# Final pre-ship review: trench-line (complete game port)

You are reviewing a COMPLETE, fully implemented project for release readiness. You did not write it and have no stake in it.

## What this project is

A JavaScript/HTML top-down First World War trench-battle game. It is a professional rewrite (Vite + Vitest + ESLint, ESM modules, Apache-2.0) of a working single-file prototype that lives in this repo at `legacy/trench-line.html` (2,276 lines, one IIFE). The mission was **strict parity with the prototype plus only obvious bug fixes** — not a redesign. The design doc `docs/DESIGN.md` lists 9 open questions that are deliberately left open; do not flag them.

## Deliberate, approved deviations from the prototype (do NOT flag as bugs)

1. **Stray miss-tracer fix** — the prototype fired a faint "miss" tracer unconditionally on every shot, including hits. In `src/sim/combat.js` stepUnits firing block, the faint tracer is now only in the `else` (miss) branch.
2. **Seeded RNG everywhere** — all `Math.random()` in sim/data code became `rng.float()` (mulberry32, `src/core/rng.js`); battles replay deterministically from a seed. Remaining `Math.random()` only in `src/ui/draw/*` (cosmetic flicker) and as the default-seed factory.
3. **Save codes / meta** — `src/sim/meta.js` ports the prototype's `TL1-…` base36 codes verbatim, 2 localStorage slots, newest-valid-wins recovery.
4. **Card offers are sim-side state** — `G.offer={ids}` with exactly one `cards:offer` event per offer (prototype checked DOM overlay visibility).
5. **Sim is browser-free** — `src/sim/**` and `src/data/**` import nothing DOM-ish; ESLint enforces this (no globals for those trees). `G.reduceMotion` is set by UI.
6. **Commands own the purse** — `src/sim/commands.js` centralizes ownership/supply checks; purchases charge exactly once; `useSW` itself never deducts.
7. **e2e is jsdom+esbuild IIFE** — jsdom cannot run module scripts, so e2e bundles src/main.js to an IIFE via esbuild with `loader:{'.css':'empty'}` and a Proxy canvas ctx. The e2e battle uses a random seed; assertions are seed-robust by design (a recently-fixed flake: AI's first weighted buy can lock `want='mg'` (unaffordable, prototype behavior), so kill-count asserts are `>= garrison wipe` and `>= all units within blast band`).
8. **Loop timing** — `src/ui/loop.js` preserves the prototype's exact substep semantics (dt clamp 0..0.1, `left=dt*speed`, `while(left>0) step min(0.04,left)`, pause computed once per frame).

## Repo map

- `legacy/trench-line.html` — the prototype (source of truth for parity)
- `src/data/` — pure data: units/nations/tech/cards/maps/superweapons
- `src/core/` — rng (mulberry32 + prototype's Park–Miller `decor`), event bus
- `src/sim/` — state, geometry, combat (incl. stepUnits), fortify, superweapons, ai, cards, commands, tick, meta; `src/storage.js` localStorage adapter
- `src/ui/` — hud, buy, cards overlay, overlays (start/end/research), input, camera, loop, `src/ui/draw/*` renderer
- `src/main.js` — boot + bus wiring + debug hook (`window.__trench` armed only with `?debug|?e2e`)
- `tests/unit/` (19 files, 283 tests), `tests/e2e/game.e2e.test.js` (3 tests)
- `scripts/bot.mjs` (headless scripted player), `scripts/gen-stats.mjs`
- `docs/PLAN.md` (task list, all ticked), `docs/DESIGN.md`, `docs/HANDOFF.md`
- `.github/workflows/pages.yml` — CI deploys to GitHub Pages, gated on `npm run check` (lint+build+unit) AND `npm run e2e`
- `README.md`, `LICENSE` (Apache-2.0, "Copyright 2026 M K"), `package.json`

## Credits requirement (hard constraint)

The game's author is **M K**; it must credit the AI agents **Claude and GLM**. Currently in: index.html start overlay ("A game by M K · built with the AI agents Claude and GLM."), README credits section, LICENSE copyright line.

## What to scrutinise hardest

1. **Ship blockers**: anything that would break the GitHub Pages deploy or first-run experience — pages.yml correctness, asset base paths (vite `base:'./'`), package.json scripts completeness, missing files.
2. **Parity fidelity spot-checks**: pick 3–4 meaty behaviors (e.g. `hurt` cover/armor tables in `src/sim/combat.js`, `aiStep` gates in `src/sim/ai.js`, `newGame` in `src/sim/state.js`, shell landing/splash in stepUnits) and compare against the corresponding legacy code in `legacy/trench-line.html`.
3. **e2e + test soundness**: do the 3 e2e tests actually exercise the real page (real clicks, real bundle)? Any remaining seed-dependence? Any unit tests that assert on implementation details rather than behavior?
4. **Sim purity & determinism**: any accidental `Math.random`/`Date.now`/DOM reach inside `src/sim` or `src/data` that breaks headless replay.

## Output format

VERDICT: APPROVE | APPROVE WITH CHANGES | REJECT

- SEVERITY (BLOCKER | IMPORTANT | MINOR) - file:line - concrete failure - specific fix

## Assumptions and gaps
State what could not be verified rather than guessing.
