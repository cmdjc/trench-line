# Trench Line

A single-file WWI trench-warfare strategy game. Take the trenches one at a time and destroy the enemy HQ before yours falls.

## Contents

| File | What it is |
|---|---|
| `trench-line.html` | The whole game. Open it in any browser; no build step, no server. |
| `docs/DESIGN.md` | Design log: what was added, the choices you made, known quirks and open questions. |
| `docs/HANDOFF.md` | Code map and conventions for turning this into a proper JS/HTML project. |
| `docs/STATS.md` | Stat tables for every nation, tank, emplacement, research node, superweapon and map, generated from the game's data. |
| `tests/` | Headless tests (jsdom + a real canvas). |
| `tools/bot.js` | A scripted player that fights whole battles, for balance checks. |
| `tools/make-artifact.py` | Builds `artifact/trench-line.html`, the copy published as a claude.ai Artifact. |

## Playing

Pick your country, your enemy and a battlefield. Drag the field sideways to look around. Select a trench in the strip, then Advance, Fall back or Bring all here. Kills earn cards. Double-tap a trench you hold to fortify it. Research points are earned each battle and kept with a save code.

## Nations (8)

Britain, Germany, France, Russia, USA, Austria-Hungary, Italy, and the United States of Antarctica.

## Maps (4)

- **No man's land**: 9 trenches, open ground.
- **River crossing**: 9 trenches, two river channels with bridges.
- **Wide open plain**: 17 trenches, with two double super trenches guarded by tank-stopping hedgehogs.
- **The Long March**: 45 trenches in nine belts of five, wide empty ground between belts, and a super trench in the middle.

## Running the tests

```
npm install jsdom @napi-rs/canvas
node tests/smoke.js        # every nation as player and as enemy, plus all four maps
node tests/merge.js        # Wide open plain, hedgehogs, Russia's line-up
node tests/gen-stats.js    # regenerates docs/STATS.md
```

To watch a scripted player fight a whole battle: `node tools/bot.js <me> 2.5 <enemy> <map>` (countries `gb de fr ru us ah it aq`, maps `open river plain march`; set `MAXS=3600` for the long maps).

`smoke.js` simulates a few minutes of play per matchup and fails on page errors, NaN values or armour-limit violations. It does not test balance or feel; that needs a human.
