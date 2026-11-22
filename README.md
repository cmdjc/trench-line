# Trench Line

A top-down First World War trench-battle game. Pick one of eight nations, take the enemy's trenches one line at a time, and destroy their HQ before they overrun yours. Troops dug into a trench take a fraction of the damage open ground costs; kills earn you cards that unlock tanks, guns and tricks; and the longer the battle runs, the stronger the enemy grows.

Play it at https://cmdjc.github.io/trench-line/

## How to play

Buy troops with supplies, select a trench line, and send it forward with **Advance**. Men walk to the line, settle into the trench, and hold it. Bring stragglers with **Bring all here**, fall back when a line is lost, and double-tap a trench you hold to fortify it. Emplacements — MG nests and your nation's special defence — hold ground on their own. Once your kills fill the card meter you pick a card: unlocks, income, buffs, one-off boosts.

Every nation plays differently: Britain's wire and mines, Germany's Paris Gun and stormtroopers, France's Char 2C, Russia's Tsar Tank, Austria-Hungary's siege guns, Italy's Caproni bombers, America's airborne drop, and Antarctica's absurd Southern Colossus. Superweapons unlock after four minutes and change the battle; the enemy commander has his own.

Four battlefields: open ground, a river crossing with two bridges, a wide plain with double super trenches, and the Long March — 45 trenches with a super trench in the middle.

Tap your HQ to buy base upgrades with supplies: three shared ones (HQ Walls, Supply Depot, Field Hospital) and one national upgrade, each with three tiers. They take effect at once and cost troops you could have bought, so choose when to spend. The enemy buys them too. Base branches in the research tree let a battle start with some of them already at tier 1 or 2.

Your HQ also has a gun, one per nation. Press the gun button, tap the field inside its range to place the target, and confirm; it costs supplies and then has to reload. The enemy HQ fires its own gun at your biggest clusters from one minute in, without warning, and these shells never hit an HQ.

Railways: lay track from your HQ one held trench at a time and buy a train; troops at the HQ ride it up the line when that beats walking, wounded ride it home to heal, and each run with riders brings a few supplies. The enemy builds a railway too, and big shells break track, which you repair. The track runs through the middle of the field, with sandbag barriers at each trench that shield it from big shells, and trains are drawn from above. Once you have a transport running, buy an armoured train too: it advances to the end of your track and holds there, firing its cannon and machine guns at anything in range (or shelling the enemy base when nothing else is). Planned for later: a railway gun.

On the Long March, trenches 11 and 35 hide a tunnel: whoever holds one can send fresh troops through it, hidden for a few seconds, and have them come out at the trench.

Research points carry between battles. Spend them on a permanent tree, or carry your progress with a save code.

## Controls

Drag the field or use the arrow keys to scroll. Tap a trench to select it, double-tap one you hold to fortify it, tap the button rows for everything else. The game is playable end to end with Tab and Enter.

## Running it locally

Install the dependencies from the lock file with `npm ci`.

| Command | What it does |
|---|---|
| `npm run dev` | Starts the Vite dev server. |
| `npm run build` | Writes a static build to `dist/`. |
| `npm run preview` | Serves the built game locally. |
| `npm run test` | Runs the unit tests. |
| `npm run lint` | Runs ESLint over the whole project. |
| `npm run e2e` | Builds the game and plays it through a real page load in jsdom. |
| `npm run check` | Runs lint, the unit tests, and the build. |
| `npm run stats` | Regenerates the stat tables in `docs/STATS.md` from the game data. |
| `npm run bot` | Plays a scripted, seeded battle headlessly. `node scripts/bot.mjs de gb open 3`. |

## Tests

The unit tests cover the seeded random source, every data table (units, nations, tech, cards, maps), save codes and recovery, the state container, geometry and spawning, the damage model, fortifications, the simulation step (movement, rivers, hedgehogs, firing — including the fixed stray miss-tracer from the prototype), superweapons, the enemy commander, cards, commands, the tick loop, parity smoke tests of every nation on every map, the UI through a fake DOM, and the canvas renderer against a no-op context.

The e2e test builds the real page with esbuild, loads it in jsdom, and plays a full battle through real button clicks: picks, buying, advancing, double-tap fortifying, card picks, the Messines mine, a rigged victory, the save code, and a fresh run afterwards.

## Debug flag

Add `?debug=1` (or `?e2e=1`) to the game URL to expose `window.__trench`, a hook the e2e tests use to read and nudge the game. Without it, the game exposes no globals.

## Layout

All content lives in `src/data/`: nations (caps, traits, defence kinds), unit stats and tank variants, superweapons, the research tree, cards and maps. The simulation lives in `src/sim/` — state, geometry, combat, fortify, step, superweapons, the enemy commander, cards, commands and tick — and is deliberately browser-free: ESLint keeps DOM globals out of it, so the whole game runs headlessly for tests and the bot. The renderer (`src/ui/draw/`) and the HUD, overlays, input and loop (`src/ui/`) drive it through a small event bus. Battles are seeded: `newGame(mine, theirs, map, seed)` reproduces a battle exactly, which is what the parity suites and `scripts/bot.mjs` rely on.

## Deployment

A GitHub Actions workflow (`.github/workflows/pages.yml`) deploys the game to GitHub Pages on each push to `main`. It runs `npm run check` and `npm run e2e` first.

## Credits

Designed and authored by M K. Built with the help of the AI agents Claude (Anthropic) and GLM (Z.ai).

## License

Trench Line is licensed under the Apache License, Version 2.0. See [LICENSE](LICENSE).
