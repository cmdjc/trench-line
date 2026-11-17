# Review: final-codex-20261117.md

| field | value |
|---|---|
| reviewer | `codex` |
| backend | `codex` |
| model | `<backend default>` |
| workdir | `/home/v/Documents/Dev/Max/trench-line` |
| write access | none (read-only, enforced) |
| started | 2026-11-17T17:00:35-05:00 |
| finished | 2026-11-17T17:03:34-05:00 |
| duration | 179s |
| exit code | 0 |
| result | `ok` |

---

VERDICT: APPROVE WITH CHANGES

- IMPORTANT - [src/main.js:29](/home/v/Documents/Dev/Max/trench-line/src/main.js:29) - Starting another battle preserves the previous camera position. Reproduced: pan to x=4800 on Long March, end the battle, then start Open Ground. Both camera coordinates remain 4800, beyond the new battlefield. Reset `cam.x` and `cam.tx` to zero on `game:start`, as the prototype does. Add a replay test that changes maps after panning.

- IMPORTANT - [eslint.config.js:11](/home/v/Documents/Dev/Max/trench-line/eslint.config.js:11) - The broad browser-globals rule also applies to sim/data/core. The preceding `globals: {}` does not exclude those globals. An in-memory lint probe using `document`, `window`, and `localStorage` produced zero errors in all three trees. Scope browser globals to UI, main, and storage files. Add a negative lint test.

- MINOR - [src/main.js:29](/home/v/Documents/Dev/Max/trench-line/src/main.js:29) - The start handler omits the prototype’s nation-label updates. After choosing countries, the header still reads “Your HQ” and “Enemy HQ.” Set `nmA` and `nmB` from the chosen nations on every `game:start`.

- MINOR - [tests/unit/meta.test.js:39](/home/v/Documents/Dev/Max/trench-line/tests/unit/meta.test.js:39) - The timestamp recovery test puts identical codes in both slots, so choosing the wrong slot still passes. The failed-write test at line 51 performs successful writes and never asserts `saveOk`. Use different codes with equal revisions and different timestamps. Simulate one-slot and two-slot write failures and assert the reported status.

## Assumptions and gaps

Lint passed. An in-memory Vite production build succeeded and emitted relative JS/CSS paths. All four pinned action releases exist: [checkout](https://github.com/actions/checkout/releases/tag/v7.0.1), [setup-node](https://github.com/actions/setup-node/releases/tag/v7.1.0), [upload-pages-artifact](https://github.com/actions/upload-pages-artifact/releases/tag/v5.0.0), and [deploy-pages](https://github.com/actions/deploy-pages/releases/tag/v5.0.1). Repository Pages configuration and an actual deployment remain unverified.

The three e2e assertion bodies passed across 50 controlled seeds using a custom in-memory runner. They exercise actual DOM handlers and bundled application code. They do not test production asset loading, CSS layout, or real canvas rendering.

The normal Vitest run could not create temporary files under the read-only permissions. I therefore cannot certify the full unit suite.

Parity spot-checks covered damage/cover tables, AI gates, shell landing/splash, and battle initialization. Only the initialization omissions above surfaced. Thirty-two paired, 120-second seeded simulations matched battle state, excluding unit IDs.

Combat randomness uses the seeded generator. Persistence remains browser-dependent through `sim/meta.js` importing `storage.js`; its `Date.now()` timestamps do not drive combat. Full simulation purity therefore needs that qualification.

Required M K, Claude, and GLM credits are present. No files changed.