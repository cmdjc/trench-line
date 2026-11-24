# Trench Line: design log

Sections 1 to 6 were built in one session. Section 7 is the merge with a parallel session that had added the Wide open plain map and reworked Russia. Stats are first guesses, tested only by headless simulation, not by hand-playing on a phone.

## 1. Tank variants (every nation)

Each nation fields several kinds of armour instead of one tank.

- A vehicle now uses part of the nation's **armour limit**: a Kugelpanzer takes 0.5, an A7V takes 1, a Maus takes 3, a Ratte takes 6 (of Germany's 8). The army readout shows "armour 6.5 of 8".
- Slots: light (`tkL`), signature (`tank`), medium-heavy (`tkM`, Antarctica only), heavy (`tkH`), super-heavy (`tkS`).
- Unlocking is by card. Each variant has its own card. A heavy needs the signature tank first, a super-heavy needs the heavy first (for Germany: tank, then Maus, then Ratte).
- The generic tank renderer draws any variant from a parts list, with custom paint per nation.
- Research that affects tanks (Mechanics, Gunnery school, Tank works) applies to every variant.
- The enemy AI buys every variant on a timer, and the armour limit applies to it too.

| Nation | Variants |
|---|---|
| Germany | Kugelpanzer, A7V, Maus, Ratte |
| Britain | Whippet (MG only), Mk V, Flying Elephant |
| France | FT mitrailleuse, Renault FT, Saint-Chamond |
| USA | Ford 3-Ton, Mark VIII Liberty, T28 |
| Russia | Vezdekhod, Mendeleev (the Tsar Tank is now the superweapon; see section 7) |
| Austria-Hungary | Skoda 15 cm howitzer, Skoda 30.5 cm mortar (siege guns, not tanks) |
| Italy | Fiat 3000, Fiat 2000, P 26/40 |
| Antarctica | Ross, Weddell, Vinson, Erebus, Pole |

## 2. Italy

Chosen by you: **Alpini** infantry, a **mountain gun pit** defence, **Caproni bomber raid** superweapon.

- Alpino: cost 24, 52 health, slower. All Italian troops take 15% less damage in trenches.
- 65 mm mountain gun pit (120): arcing shells that hurt trench troops more than France's 75 mm pit.
- Caproni raid (420, 80 s cooldown): a bomber flies down the nearest enemy position ahead of the selected trench and drops eight bombs.
- Chosen by me: Arditi, Fiat-Revelli teams, Alpine snipers, Bombarda mortar crews; Fiat 3000, Fiat 2000, P 26/40; grey-green colours and flag.

## 3. Landships research node

Fifth and last Armour node (120 points, needs the other four). Super-heavy tanks are available from the start of every battle, no card needed. Only Germany (Ratte) and Antarctica (Pole) have one. Existing save codes still load.

## 4. Aimable Paris Gun

- Tap the button, tap anywhere on the field, press **Confirm target** (500). Cancel aiming backs out. You can start aiming while short of supplies; Confirm stays greyed out.
- One shell, 4.5 seconds in flight, radius 90, about 700 damage at the centre falling to about 300 at the edge. Levels fortifications and wire in range. Hits the enemy HQ for roughly 500 to 560 when it lands there.
- A red warning circle with a shrinking ring shows where and when it lands, for both sides.
- The enemy aims at your richest cluster of units, or your HQ.

## 5. The Long March map

Chosen by you: 45 trenches, fortified belts with wide gaps, same stats, a super trench in the middle.

- Layout: nine belts of five trenches, 150 px apart inside a belt, 520 px of empty ground between belts. World width 10,320 px.
- The line selector becomes a scrolling strip with gaps marking belts, and recentres on the selected line.
- Reinforcements first appeared one trench behind the line you sent them to (a "railhead", so troops did not walk for minutes). That was replaced by buildable railways (section 11): reinforcements now start at their own HQ on every map, and you build track and a train to bring them up faster. To make up for the long walk, both sides start the Long March with track already laid through their first belt (segments 1 to 5, `startTrack`) and one free transport train each (`startTrains`).
- **Super trench** (trench 23): starts empty and neutral at level 0. Whoever takes it first gets three built-in guns (two pillboxes and a 75 mm pit, 1.6 times normal health) that change hands with the trench. Holding it pays **+3 supplies a second** and lets you fortify to **level 4** (cost 320). You get a free card on first capture and then **one every 3 minutes held**; the timer pauses while you do not hold it, and a countdown shows in the supplies area. The enemy gets only the income and the guns.

## 6. United States of Antarctica

Chosen by you: a nation that never was, WWI-and-WWII realistic designs with big tanks whose shells chill what they hit, 20 fragile infantry, 20 armour, bunkers, a colossal tank superweapon, snow-white tanks, five variants, Antarctic place names, a flag with the white continent on blue, and a poor start with fast income growth.

- Infantry cap 20, normal prices, 30 health for riflemen. Ice Trooper, Blizzard gunner, Sledge raider, Polar Ranger, Frost mortar crew.
- Economy: starts with 15 supplies and +2 a second; income grows 0.7 a second every minute (the USA's is 0.4).
- **Bunkers**: a separate button (120 supplies, 600 health), up to two per trench. Settled troops walk in, six per bunker. Shots at sheltered troops hit the bunker instead and splash only reaches the bunker. Sheltered troops fire at full effect. When a bunker falls, the survivors are left exposed.
- **Southern Colossus**: 2,500 supplies, 9,000 health, four turrets, machine guns, crushing treads, 150 s cooldown, one at a time, does not count toward the armour limit.
- The enemy waits until it holds 60% of a superweapon's cost before choosing one, but only for costs of 1,500 or more (in practice, only the Colossus).
- **Chill**: Antarctica tank cannon shells (including the Iron Penguin's and the Southern Colossus's) set every enemy unit they hit to 60% (`CHILL_MULT` 0.6) walking speed for 4 s (`CHILL_DUR`), armour included. A repeat hit refreshes the timer and never stacks. Machine guns never chill, and trains are never chilled.

## 7. Merge: Wide open plain, hedgehogs, and Russia's line-up

Two versions of the game had diverged. The larger one (sections 1 to 6) is the base; these parts were ported into it from the other.

- **Wide open plain map** (`plain`): 17 evenly spaced trenches, no cover between them. Trenches 4 and 14 are **double trenches**, called super trenches in the game: two trench lines with a wall between, set in a supply yard with crates, barrels, tents and shell stacks.
  - Troops inside take 0.55 times damage on top of normal trench cover; fortifying stacks with it.
  - Room for 5 emplacements (a normal trench has 3).
  - +1 supply a second to whoever holds one, including the enemy.
  - **Hedgehog belts** on both sides stop the attacker's tanks short of the trench until the attacker's infantry hold it. The holder's tanks pass freely. Giants (`big`: Tsar Tank, Southern Colossus) roll over them. If nobody holds the trench, nobody is stopped.
- **Russia**, as chosen by you in that session: the Tsar Tank is a superweapon with its own button (900, one at a time, 60 s cooldown, does not use the armour limit), and Russia needs the tank card like everyone else.
  - Chosen by me to fit the variant system: the **Vezdekhod** moved from the light slot to the signature slot (110, 200 health, machine gun only, limit use 1) and Russia has no separate light tank; the **Mendeleev** stays as the heavy but its limit use went from 0.8 to 2; the armour limit went from 2 to 10.

## 8. Base upgrades

Chosen by you: in-battle upgrades bought at your HQ, three shared plus one per nation, three straight tiers, bought instantly, nothing new to command, the enemy buys them too, and the HQ drawing changes as tiers rise. The full intent is in `docs/superpowers/specs/2026-11-20-base-upgrades-design.md`.

- **Panel**: tap your HQ to see each upgrade, its tier, the next tier's effect and its cost. Tiers cost 300, 550 and 900 supplies and cannot be skipped. Upgrades last for the battle.
- **Shared**: HQ Walls (+500 HQ health a tier; tier 3 repairs 4 a second), Supply Depot (+0.6 supplies a second a tier), Field Hospital (troops resting in a trench heal 0.8 a second a tier).
- **National**: Tunnelling Company (Britain), Krupp Works (Germany), Voie Sacree (France), Liberty Depot (USA), K.u.K. Officer School (Austria-Hungary), Colossus Drydock (Antarctica), Teleferica (Italy), Conscription Office (Russia). The exact effects are in `src/data/base.js`. Krupp Works and Colossus Drydock can be bought before the superweapon unlocks; the bonus waits.
- **Stacking**: the existing Concrete HQ, Aid posts and Light railway research nodes still apply on top.
- **Research**: four small branches (HQ Walls, Supply Depot, Field Hospital, National works) let a battle start with Walls, Depot, Hospital or the national upgrade at tier 1 or 2. Tier 3 is always bought in battle. New nodes were appended to the tech mask, so old save codes still load.
- **Enemy**: from 150 seconds on, 20% of its income goes to a separate upgrade fund (`AI_BASE_SHARE`), so unit buying never pauses. Once the fund covers the next tier, and at least 90 seconds have passed since its last purchase, it buys the lowest tier in the rotation walls, national, depot, hospital, with a toast. Once everything is at tier 3 the share stops and then 10% of income still goes to the gun fund after 60 seconds, and the rest goes to units. It uses no random numbers and leaves its other wants alone, so seeded battles stay reproducible. It starts at tier 0 and gets no research.
- **Headless bot**: `scripts/bot.mjs` buys the next tier in the same rotation when supplies are at least twice the cost (`BASEX` changes the multiple). Its JSON now reports `base` and `foeBase` tiers.
- **Balance check**: each nation against Germany (Germany against Britain) on the open map, seeds 1 to 10, with and without upgrades. No nation's win rate moved more than 20 points. The bot rarely holds 600 supplies, so it buys few tiers at the default setting; at `BASEX=1` about half its battles include a walls tier, and the depot and hospital are bought least. No numbers were changed. The enemy buys about 1.7 tiers a battle.

## 9. Aimable HQ gun

Chosen by you: every nation's HQ has an aimable gun, one per nation, with its own name, range in trenches and shell pattern. Only the eight gun choices were yours; the starting numbers (range, cost, cooldown, shells) were my calls, and only Germany's cost and cooldown were retuned. The full intent is in `docs/superpowers/specs/2026-11-20-hq-gun-design.md`.

- **Use**: the gun button starts aiming, you tap a point within range (the aim is clamped to the range line), then Confirm. It spends supplies, then reloads for its cooldown. Shells scatter around the point and cannot hurt the bases.
- **Enemy**: from 60 seconds on, 10% of its income goes to a separate gun fund (`AI_GUN_SHARE`). When the fund covers the cost and the gun is ready, it fires at the richest cluster of your units in reach. After 60 seconds it rolls a 25% seeded check each half-second, and fires only when the best target in range is worth at least the shot cost. There is no warning circle or toast.
- **Seeded tests**: no seeded test was re-baselined; the three enemy-income tests only add `gunFund` to their sums.
- **Headless bot**: when the gun is ready, supplies are at least three times its cost, and the best target is worth at least the cost, it fires. Its JSON reports `gunShots` and `foeGunShots`.
- **Balance check**: each nation against Germany (Germany against Britain) on the open map, seeds 1 to 10, wins out of 10. Chosen by me: only Germany's gun cost and cooldown changed, from 30 / 6 s to 50 / 10 s, because Germany's long range and low price made the enemy gun fire about 15 times a battle and cost the bot up to 30 points. Every nation's change is now within 20 points.

| Nation | Gun (cost / cooldown) | Main | First pass | Final |
|---|---|---|---|---|
| Britain | Stokes mortar battery (40 / 8) | 10 | 7 | 9 |
| Germany | 7.7 cm FK 16 (50 / 10) | 8 | 9 | 8 |
| France | 75 mm battery (60 / 12) | 8 | 5 | 9 |
| USA | 155 mm GPF (90 / 20) | 10 | 10 | 10 |
| Austria-Hungary | Mountain gun battery (50 / 10) | 8 | 8 | 9 |
| Antarctica | Penguin mortar (35 / 10) | 2 | 4 | 3 |
| Italy | 210 mm mortar (120 / 30) | 9 | 9 | 9 |
| Russia | Massed battery (80 / 25) | 7 | 6 | 7 |
| Germany v Britain | | 2 | 0 | 0 |

The bot rarely holds three times the cost, so it fired mostly with Germany, the USA, Antarctica and Austria-Hungary; in the open-map matrix above, the enemy fired about 3 to 13 shots a battle, and under 1 a battle when Germany played against Britain. Only the first pass had Germany at 30 / 6 s.

## 10. Airborne drop

Chosen by you: the USA superweapon is Mitchell's airborne drop and replaces the Kettering Bugs. You press the button, tap a highlighted trench, then Confirm. The cost markup (1.1, so 341), the 30 s cooldown and the 4 Thompson / 2 rifle / 2 BAR platoon were yours. The range, fall time, enemy timing and Thompson numbers were my calls. The full intent is in `docs/superpowers/specs/2026-11-20-paratroopers-design.md`.

- **Use**: the target is an enemy-held or empty trench one to three trenches past your walking front (`DROP_RANGE`). The walking front is where your ground troops actually are: for each non-paratrooper it is the lower of its ordered line and the furthest trench it has physically reached, so ordering one rifleman forward does not stretch the range until he gets there. The paratroopers land in the trench, fall for 4 seconds (`DROP_FALL`) staggered over 1 more second, and the Thompson gunners can fire while falling. Survivors become ordinary infantry. They are not counted against the infantry cap, so drops stack.
- **Cost**: `SW.us.cost` is hard-coded to 341, and a test checks it against `dropCost()`, the unit costs times 1.1.
- **Enemy**: an enemy USA drops from 120 seconds on (`AI_DROP_T`), other enemy superweapons wait 240. It uses the same ready check and the same random draw as them, so seeded battles stay reproducible. Its paratroopers hold their drop trench: the commander's orders leave them there while it is held or contested, and pick them up again once its own front reaches them.
- **Headless bot**: when the drop is ready, a target exists and supplies are at least twice the cost, the bot drops on the nearest valid trench. Its JSON reports `drops` and `foeDrops`.
- **Landing scramble (your decision)**: for 5 seconds after touching down (`DROP_SCRAMBLE`) a paratrooper fires at 30% of its accuracy (`DROP_SCRAMBLE_ACC`). Falling Thompsons fire as before. The 5 seconds and 30% are the strongest the brief allows.
- **Exposed paratroopers**: while falling or scrambling (`exposed(u)`) a paratrooper gets no trench cover, gives shooters no fortification accuracy penalty, does not heal and cannot shelter in a bunker. Defenders in the same trench already ignore cover and the fortification penalty, so this only changes fire from other trenches. Measured on the lone drop below (enemy commander active, 100 battles each): without the accuracy cut the drop takes 6 defenders 84 times against Germany and 82 against Britain, exactly as with no scramble at all, so against defenders in the trench the accuracy cut is the whole effect.
- **Thompson gunner**: the stormtrooper template (hp 50, damage 7, cooldown 0.35 s) is too strong even with the scramble, so it sits at the weakest the brief allows, within 30%: hp 35, damage 4.9, cooldown 0.455 s. Cost stays 45, so the drop price is the same. Like the stormtrooper, its fire ignores the fortification accuracy penalty. `DROP_FALL` is 4 seconds; 2 and 3 seconds were measured and are slightly stronger (56 and 51 captures of 6 German defenders in 100). Defenders do shoot falling paratroopers (a test covers it). The fall, the scramble and the Thompson are all at the weakest setting the brief allows.
- **Balance check**: US against each nation and each nation against the USA, open map, seeds 1 to 10, wins out of 10, against `main` with the Kettering Bugs. No change was larger than 2 wins (20 points). The bot affords a drop rarely (under 1 a battle), while the enemy USA drops about 1.5 to 7 times a battle.

| Matchup | Main (bugs) | Before scramble | Scramble, before review fixes | Final |
|---|---|---|---|---|
| USA v Britain | 5 | 4 | 3 | 3 |
| USA v Germany | 10 | 10 | 10 | 10 |
| USA v France | 4 | 6 | 6 | 6 |
| USA v Austria-Hungary | 4 | 3 | 3 | 3 |
| USA v Antarctica | 7 | 9 | 9 | 9 |
| USA v Italy | 8 | 7 | 7 | 7 |
| USA v Russia | 3 | 5 | 5 | 5 |
| Britain v USA | 3 | 4 | 4 | 5 |
| Germany v USA | 0 | 0 | 0 | 1 |
| France v USA | 0 | 0 | 0 | 1 |
| Austria-Hungary v USA | 3 | 5 | 3 | 3 |
| Antarctica v USA | 2 | 2 | 3 | 2 |
| Italy v USA | 1 | 1 | 1 | 1 |
| Russia v USA | 0 | 0 | 0 | 0 |

- **Lone drop**: no attack behind it, onto settled riflemen (a quarter of them MGs) at fortification level 1, 100 battles each. With the enemy commander behaving normally (it keeps buying and, once the paratroopers are dead, usually advances out of the trench), the drop takes 6 defenders 50 times in 100 against Germany and 36 against Britain, 8 defenders once against Germany and never against Britain, and 10 never. With the commander frozen so the defenders stay put: 47 and 30 against 6, never against 8 or 10. Before the scramble it took 6, 8 and 10 defenders essentially every time. Against Germany's 6 defenders the drop wins as often as it loses, which is the edge of the target; the fall, scramble and Thompson knobs are all at their weakest.
- **Supported drop**: six or eight of your riflemen walking into a trench held by 6 to 10 defenders at fort 1 take it 0 times in 40 alone, and every time in 40 when a drop lands as they go in, with the enemy commander frozen or behaving normally.

## 11. Railways (stage 1)

Chosen by you: buildable railways. You lay track from your HQ one segment at a time, buy a transport train, and troops, wounded and supplies ride it. It replaces the Long March "railhead" (reinforcements appearing one trench behind the line): on every map, including the Long March, new troops start at their own HQ. The full intent is in `docs/superpowers/specs/2026-11-20-railways-stage1-design.md`. Stage 2 (an armoured train) is built, in §12; stage 3 (a railway gun and an ammo cart) is planned and not built.

- **Track**: a segment spans one trench to the next from your HQ and can be laid only into a trench you hold and only with no break outstanding. It costs `TRACK_COST` 20 supplies, `REPAIR_COST` 20 to repair. Losing the trench at the end of a segment destroys that segment and every one beyond it. Big shells (splash 60 or more, or the big, huge, raze and siege flags) that land on the rail lane break the segments they overlap, on both sides' track. HQ-gun shells never break track, even the big ones of the 155 mm GPF and the 210 mm mortar.
- **Long March starting railway**: on the Long March only, each side starts with segments 1 to 5 (its first belt, `MAPS.march.startTrack`) laid for free and one free transport train at its HQ (`startTrains`). The track still runs only as far as the furthest held, intact segment, so the pre-laid stretch ahead of your troops comes into use as you take its trenches. A trench taken by the other side destroys the segment ending there and every one beyond it, whether or not you had held it, and it must be relaid at cost. Every other map starts with no track and no trains.
- **Trains**: one national train per nation, bought at the HQ once there is track, shared cap `TRAIN_SLOTS` 3 per side. Base stats are cost 150, hp 300, capacity 6, speed 3 times a rifleman (138); each nation stays within 15%. Trains are armoured like a light tank, shuttle between the HQ and the end of the track, and wait about a second at the HQ for stragglers. A train never crosses a broken segment: if a break appears behind it, outbound riders get off where the train is and walk on, wounded riders get off and walk home, the train runs back to the forward edge of the break and waits there until it is repaired, and that trip pays nothing. Losing a trench is different: the train runs back to the new end of the track as before and its riders get off there. A destroyed train leaves a wreck on the rail lane, and losing one of yours shows "<train name> was destroyed.".
- **Riders**: a foot soldier at the HQ waits for the train only when riding to the end of the track beats walking there, so track never slows reinforcements. Waiting troops stand still but aim and fire as normal. A stranded train is not waited for. Armour, emplacements and paratroopers never ride. Settled wounded below 40% health (`WOUNDED`) in the end trench board for the HQ and are healed to full on arrival, then sent back to their line. If a train is destroyed the riders get off where it stood, wounded stay wounded. A round trip that carried anyone pays on return, in proportion to how far out it went: `Math.round(TRIP_SUPPLY * min(1, far / TRIP_FULL))`, with `TRIP_SUPPLY` 15 and `TRIP_FULL` 1150 px (five default trench gaps). A one-trench shuttle pays 3 a trip, so three trains shuttling one trench earn 0.38 supplies a second, where a flat 15 a trip earned 1.88 (more than the base income of 3 per second at times).
- **Enemy**: from 90 seconds (`AI_RAIL_T`) 15% of its income goes to a rail fund (`AI_RAIL_SHARE`). It repairs breaks first, buys its first train once its track is 2 long (before laying more), then keeps laying track whenever a new segment becomes available. Only once the front stalls (no segment can be laid) does it, with that first transport in and track at `AI_ARMOR_END`, save for an armoured train (§12) ahead of laying more or a second transport; track-laying resumes first if a new segment opens up again. A second transport follows once track reaches 3. The fund is capped at `max(2 × a transport's cost, the armoured train's cost)` (previously two trains' cost), the rest returns to units. It uses no random numbers. A train (transport or armoured) never crosses a broken segment behind it: rather than stopping or reversing, it simply stops in place at the forward edge of the break and waits there until it is repaired (commit `716365a`).
- **Headless bot**: it lays track whenever supplies are at least 3 times the cost and the next trench is held, repairs breaks, saves for one train once the track is 2 long, and reports `track` (longest track laid), `trains` and `foeTrack`, `foeTrains` (trains bought, round trips, riders carried out and wounded carried home). `NORAIL=1` turns railways off for both sides, `FOENORAIL=1` only for the enemy and `BOTNORAIL=1` only for the bot, for scratch comparisons.
- **Numbers changed**: `TRACK_COST`, from 40 to 20, and trip pay now scales with distance (above). At 40 the bot's track cost more than it saved on the Long March (it reached line 8.9 against 11.3 with no track, in 700 seconds). Train capacity 8 and speed 4 times a rifleman halved arrival times but needed many test changes, and the cheaper track alone was enough. The track cost sits near a cliff at 20: in the earlier Long March runs (before the starting railway) 20 was where track started to pay and 40 left the bot worse off than walking. Re-measured with the starting railway (gb v de and de v gb, seeds 1 to 6, 700 s cap), costs 15, 20, 25, 30 and 40 reached line 14.9, 11.8, 15.2, 13.3 and 11.1 with the bot laying about 18 segments at 15 to 30 and 15.8 at 40; none of those runs was won and 0 to 2 of 12 finished, so the cliff no longer shows as clearly but 40 is still the worst. Changing the cost is not part of this fix.

| Nation | Train | Cost | Hp | Cap | Speed |
|---|---|---|---|---|---|
| Britain | Simplex light railway | 150 | 300 | 6 | 138 |
| Germany | Heeresfeldbahn | 160 | 330 | 6 | 127 |
| France | Decauville train | 140 | 290 | 6 | 138 |
| USA | Baldwin trench locomotive | 150 | 300 | 6 | 152 |
| Austria-Hungary | k.u.k. Feldbahn | 150 | 280 | 6 | 138 |
| Antarctica | Penguin Express | 165 | 340 | 6 | 120 |
| Italy | Ferrovia da campo | 155 | 300 | 6 | 138 |
| Russia | Narrow-gauge field train | 130 | 300 | 6 | 138 |

- **Balance check, open map**: each nation against Germany (Germany against Britain), seeds 1 to 10, wins out of 10, main (no railways) against the branch. No change was larger than 2 wins (20 points). The enemy builds about 2 segments and under 1 train a battle on open; the bot about 8 segments and one train.

| Matchup | Main | Railways |
|---|---|---|
| Britain v Germany | 9 | 10 |
| France v Germany | 9 | 9 |
| USA v Germany | 10 | 10 |
| Austria-Hungary v Germany | 9 | 9 |
| Antarctica v Germany | 3 | 3 |
| Italy v Germany | 9 | 7 |
| Russia v Germany | 7 | 5 |
| Germany v Britain | 0 | 2 |

- **Does track pay**: on the open map it is no clear gain (the table above is within noise of main: wins moved up and down). On the Long March, with 10 seeds each way and a 700 second cap, the bot with track and the enemy without reaches line 15.3 against 11.3 with no track for either side, kills 51 against 32, loses 52 against 56. Sending 12 riflemen to trench 20 on the Long March takes a mean of 63 seconds with a train and 92 without, for 550 supplies of track and train; to trench 14 on the plain, 49 against 71 s; on open, trench 8, 29 against 41 s. In those tests the train carries at most 6 riders a trip (capacity 6), so 6 of the 12 ride the first trip and the other 6 walk, because waiting for the train to come back would not beat walking.
- **Long March, no railhead**: with the railhead gone, the bot's win rate on the Long March fell from 2 of 3 to 0 of 3 for Britain against Germany, with or without track; both sides now walk from the HQ.
- **Long March, starting railway** (default bot, seeds 1 to 6, 1800 s cap; W = bot won, L = bot lost, T = timed out at 1800 s, with the finish time in seconds). Main has the railhead and no railways. "No start" is this branch before the fix, with no starting track. "Track" pre-lays the first belt only. "Track and train" adds the free train each, which is what ships.

| Build | Britain v Germany | Germany v Britain | Finished by 1200 s |
|---|---|---|---|
| Main | W669 L630 W683 L707 W594 W576 (4 W, 2 L) | L599 L689 L609 L639 L602 L589 (0 W, 6 L) | 12 of 12 |
| No start | T L918 T L924 T T (0 W, 2 L, 4 T) | T T T L1379 L1251 T (0 W, 2 L, 4 T) | 2 of 12 |
| Track | W1691 T T T T L913 (1 W, 1 L, 4 T) | T T T T T T (0 W, 0 L, 6 T) | 1 of 12 |
| Track and train | L1714 L1425 T L1737 T L1125 (0 W, 4 L, 2 T) | L752 L966 L902 L1632 T L682 (0 W, 5 L, 1 T) | 5 of 12 |

  The starting track alone did not help: 10 of 12 battles still timed out, so the free train was added as the fallback. With it 9 of 12 battles finish within 1800 s, but only 5 by 1200 s, and the bot loses every finished battle. In those runs the enemy commander pushes its track to about 41 segments against the bot's 16 to 21. Main finished every battle by about 710 s. The Long March is still slower than main and now leans toward the enemy commander.

## 12. Railways (stage 2: armoured train)

Chosen by you, matching the enemy's own armoured train: a second, combat national train that shares the
track with the transport. The full intent is in `docs/superpowers/specs/2026-11-22-armoured-train-design.md`.

- **Entity**: `buyArmor(side)` spawns a `{ kind: 'armor' }` entry in `G.trains`, at the HQ, with its
  national `ARMOR_TRAINS` stats. It never carries riders (`riders` stays `[]` forever, so `dismountAll`
  and the draw code stay generic across both kinds) and is tracked separately from transports:
  `isArmor(t)` distinguishes the two, and `G.trains` holds both kinds together.
- **Advance and hold**: `moveArmor` drives it straight to the far end of the held, unbroken track
  (`trackEnd(side)`) and holds there — it never shuttles back to the HQ like a transport. Losing the
  trench at the end pulls it back to the new end.
- **Never crosses a break**: like a transport, a break behind it clamps its position to the break's
  forward edge (`breakBehind`) until repaired; it never drives across an unrepaired segment.
- **Weapons**: `fireArmor` gives it two, mirroring `stepUnits`' armour branch but living in `sim/rail.js`
  since trains are `G.trains` entries, not `G.units` ones. A tank-like cannon (shell, splash, `T.dmg`,
  `T.cd`, `T.range`) picks the nearest enemy unit or train within range; machine guns (`T.mg`: instant
  tracer, its own `cd`/`range`/`acc`) do the same independently and fire more often. National stats are
  baked into `ARMOR_TRAINS` directly (unlike units, there is no `G.M` scaling and no minimum range).
- **Base fallback**: when nothing is in cannon range, it shells the enemy base instead, at 1.5× its
  normal shell damage, as long as the base is within `T.range`. It is armoured like a light tank
  (`hurtTrain`, same thin-plating-doubles-weak-fire rule as `hurt()`), and a destroyed one leaves a
  wreck on the rail lane and (for the player's own) toasts "`<name> was destroyed.`".
- **Shared slots**: transports and armoured trains share the same `TRAIN_SLOTS` (3) cap per side and the
  same `canBuyTrain(side)` gate (track must be running, a slot must be free) — buying one is buying
  against the same pool as the other.
- **Enemy priority order and fund cap**: `aiRail()` repairs a break first; then the first transport,
  once track is 2 long; then it keeps laying track whenever a new segment is available (a held, intact
  trench to extend into). Only once the front stalls and no segment can be laid does it, with that first
  transport in and track at `AI_ARMOR_END` (2), save for an armoured train, ahead of laying more (once a
  new segment does open up, laying it again takes priority over the save) or a second transport; a
  second transport still follows once track reaches 3. (A post-merge fix found the shipped code checked
  the armoured-train save-up step *before* lay-track, so it froze track at whatever end it had the
  moment a transport was bought and never laid another segment until it could afford an armoured train —
  repeating every time that train was destroyed. The order above is the fix.) The rail fund's cap
  (previously two trains' cost) now also covers the armoured train: `max(2 × a transport's cost, the
  armoured train's cost)`, so the fund can actually accumulate enough to buy one without first
  overflowing into ordinary unit spending.
- **Real-battle check** (the plan's required verification): `gb` v `de`, plain and march, seeds 1–6,
  `MAXS=900`. The enemy buys an armoured train and fires it in at least 4 of these 12 battles, with both
  `shots > 0` and `mgShots > 0` in every battle where one was bought. One edge case is accepted even if
  it shows 0 shots: a side that is steamrolling advances its infantry front faster than its armoured
  train, which only ever holds at the end of *its own* track, can follow — so the train can lag far
  behind its own front and stay out of weapon range for most of the battle. This is a real, expected
  property of "holds at the end of track" when that side is winning fast, not a transient or
  non-contiguous-recapture quirk. (It did not come up in the 12 battles behind the numbers above — every
  armoured train bought there had `shots > 0` — but it remains an accepted outcome if a future run hits
  it.)
- **The bot rule** (`scripts/bot.mjs`): after its own railway block, the headless bot buys one armoured
  train once it has a transport running, no armoured train yet, `trackEnd(0) >= 3`, `canBuyTrain(0)`
  holds, and supplies are at least twice the train's cost. `BOTNOARMOR=1` disables it, for comparison
  runs; `NORAIL` implies `BOTNOARMOR`. Unlike the enemy AI, the bot spends from its single shared
  supply pool, so it only buys one when the normal game's economy comfortably affords it — it does not
  pause other spending to save up for one. A separate `BOTFORCEARMOR=1` buys one as soon as it is
  affordable and track exists at all, skipping that caution; it exists only to make the anti-goal check
  below actually exercise the bot's own armoured train, and is not used for balance or this check.

| Nation | Train | Cost | Hp | Speed | Cannon dmg | Cannon cd | Range | Splash | MG dmg | MG cd | MG range |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Britain | Naval armoured train | 380 | 600 | 138 | 25 | 1.6 | 270 | 20 | 5 | 0.2 | 280 |
| Germany | Panzerzug | 420 | 680 | 125 | 27 | 1.75 | 260 | 22 | 5 | 0.18 | 290 |
| France | Train blindé | 370 | 580 | 138 | 24 | 1.4 | 260 | 20 | 5 | 0.22 | 270 |
| Russia | Zaamurets armoured train | 350 | 640 | 130 | 25 | 1.7 | 250 | 21 | 5 | 0.2 | 280 |
| USA | Liberty armored train | 400 | 620 | 150 | 26 | 1.6 | 260 | 20 | 5.5 | 0.18 | 280 |
| Austria-Hungary | k.u.k. Panzerzug | 380 | 600 | 138 | 25 | 1.6 | 260 | 20 | 5 | 0.2 | 280 |
| Italy | Treno armato | 375 | 590 | 138 | 26 | 1.6 | 280 | 19 | 5 | 0.21 | 270 |
| Antarctica | Iron Penguin | 420 | 680 | 125 | 28 | 1.8 | 260 | 23 | 5 | 0.2 | 280 |

- **Balance check**: every nation against Germany plus Germany against Britain, `MAXS=900`, open map
  (seeds 1–10) and plain and march (seeds 1–3) — baseline on `main` (no armoured train) against this
  branch, 144 battles each. Overall win rate moved from 42.4% to 40.3%; 25 of 27 matchup/map categories
  stayed within ±20 points of the baseline (several improved, e.g. Germany v Germany open +20, France v
  Germany open +10). Two categories exceeded it: Austria-Hungary v Germany on march (−33.3) and Russia v
  Germany on plain (−33.3), both 3-seed samples where exactly one seed flips from a clean win to a long
  grind or loss once the enemy fields its armoured train and the player nation's economy is too weak to
  field its own in time. A longer `MAXS=1800` run confirmed both are a genuine balance shift (Russia v
  Germany plain seed 3 loses outright at 1720 s; Austria-Hungary v Germany march seed 1 is still grinding
  at 1800 s against a 764 s baseline win), not a 900 s budget artifact. These two are accepted, documented
  known limitations, rather than chasing two single-seed flips past the ±15% band. (An earlier pass
  nerfed Germany's `ARMOR_TRAINS` entry below the plan's exact values, on the claim that it brought the
  picture in from 7 violating categories to these 2. That claim did not hold up: re-running the full
  144-battle matrix with the plan's original German stats at this point in the branch reproduces the
  same 2 violations above, and reverting the nerf changes the outcome of only 1 of the 144 battles — us v
  Germany open seed 2, won before and after. Germany's `ARMOR_TRAINS` entry is back to the plan's exact
  values, `{hp:680, dmg:27, cd:1.75, splash:22}`, cost 420.)
- **Anti-goal check**: an armoured train must not end up holding a trench alone, i.e. it must help the
  attacker push rather than make trench fighting pointless. The bot's own armoured-train rule almost
  never fires in ordinary play (1–2 of 48 runs in the matrix below with it on), so comparing `sel` and
  `losses` with that rule on versus off barely exercises the check at all. To actually test it, the bot
  script gained a `BOTFORCEARMOR=1` flag that buys an armoured train as soon as it is affordable and
  track exists (skipping the ordinary rule's "has a transport running" and "2× cost" caution), used only
  for this targeted verification run, never for balance or Task 4's real-battle check. With it, the bot's
  own armoured train is bought in 24 of 48 seeds (every nation v Germany, seeds 1–3, plain and march) —
  a real, meaningfully exercised sample, not 1–2 of 48. Compared against the same 48 seeds with
  `BOTNOARMOR=1` (identical to the ordinary rule's own 48-seed result, since it almost never buys one
  anyway): avg `sel` 11.90 forced versus 11.13 without, avg `losses` 59.54 forced versus 64.58 without,
  wins 5 versus 4 of 48. The bot's own armoured train, bought far more aggressively than it ever is in
  real play, pushes slightly further and loses fewer troops, not more — it does not make holding a trench
  pointless. The imbalance found above comes from the *enemy* AI's armoured train; Task 4, which built
  that AI logic, was not independently reviewed before this stage merged, and a post-merge fix wave is
  what first re-verified the enemy's real-battle behaviour (including the track-laying freeze fixed
  above) the way the plan required.

## 13. Tunnel trenches (Long March)

Chosen by you: two trenches on the Long March hide a tunnel, so reinforcements can skip the walk. Intent: `docs/superpowers/specs/2026-11-21-tunnel-trench-design.md`. Sim code in `src/sim/tunnel.js`, numbers in `src/data/tunnel.js`.

- **Where**: trench `round(NT / 4)` from each HQ, which is 11 and 35 on the Long March (`MAPS.march.tunnels`). They are ordinary trenches, empty at the start. The trench strip marks them with "⊓" and the map shows a dark timber-framed arch behind each one.
- **What it does**: whoever holds a tunnel trench can send fresh infantry ordered to that trench or beyond it through the tunnel. They are hidden for `TUNNEL_TRANSIT_T` seconds (they don't fire, can't be hit and don't show in the trench counts, but still count toward the infantry cap), then come out just behind the trench and walk on. Either side can use either tunnel. Each reinforcement takes the fastest of walking, the train and the tunnel; the Teleferica and the British tunnelling upgrade still come first. The enemy uses tunnels with no extra rules.
- **`TUNNEL_TRANSIT_T` = 5 s** (the design started at 8, the allowed range was 4 to 15). Other maps are byte-identical to main (`node scripts/bot.mjs gb de <map> 3 --json` on open, river and plain).
- **Balance: the target was not reached.** The bot never wins on the Long March at any `TUNNEL_TRANSIT_T`, and fewer than 2 of 12 timeouts was not reached either (best: 2 of 12 at 5 s). Per the plan nothing else was changed. Default bot, seeds 1 to 6, `MAXS=1800`; V = won, D = lost, T = timed out.

| TUNNEL_TRANSIT_T | Britain v Germany | Germany v Britain | Timeouts |
|---|---|---|---|
| 4 | T T D T T D | D T D D T D | 6 |
| 5 (ships) | D D D T D D | D D D T D D | 2 |
| 6 | D D T D D T | D D D T D D | 3 |
| 7 | D D T D T T | D T D D D D | 4 |
| 8 | D D D D D T | D T T D T D | 4 |
| 9 | T D T D T T | D D T D D D | 6 |
| 10 | D D D D T T | T T T T D D | 6 |
| 12 | D D T T T T | D T D D T D | 6 |
| 15 | D D D D D D | D T D D T D | 2 |

  The results are not monotonic in `TUNNEL_TRANSIT_T` (a few seconds shifts a capture and the whole battle changes), so 5 is the lowest-timeout setting, not a smooth optimum. At 5 s the finish times in minutes are Britain v Germany 13.2, 14.9, 19.6, T, 25.8, 20.3 and Germany v Britain 14.5, 22.1, 17.5, T, 28.0, 10.7. Compare section 11: Main finished every battle by about 710 s and the bot won 4 of 6 battles as Britain and 0 of 6 as Germany (4 of 12 in all, the spec's "4 of 12"). Before tunnels (task 1, with `TUNNEL_TRANSIT_T` 8) it won 0 of 12 (W = 0, L = 8, T = 4 at 1800 s).
- **Diagnosis**: tunnels help with the stalling (10 of 12 battles finish at 5 s, against 9 of 12 with the starting railway and free train alone, and far sooner: the slowest of the 10 took 28 minutes) but not the loss. In instrumented runs at 5 s the enemy holds its own tunnel trench (35) from about minute 3 on and keeps it, while the bot holds trench 11 for a stretch and then loses it. The enemy sent 27 to 107 units through the tunnels against the bot's 29 to 45 and its track reached about 45 segments against the bot's 16 to 21 (the enemy rail fund, section 11). So the enemy reinforces its front faster than the bot, using the tunnel and the long railway. The scripted bot sends everything to the selected line and rarely holds forward trenches long enough for the tunnel to help. The fix round below showed the rail fund is not the lever; the next step is the bot or the enemy's tunnel use.
- **Fix round: slowing the enemy railway did not help.** Causality check: with `AI_RAIL_SHARE` 0 (the enemy buys no train or track beyond its free start) the bot still won 0 of 12 at `TUNNEL_TRANSIT_T` 5, 8 and 12 (3 to 8 timeouts of 12). So the enemy's 45-segment track is a symptom of it holding the ground, not the cause of its wins. A sweep of `AI_RAIL_SHARE` 0.05, 0.08, 0.10, 0.12 and 0.15 against `TUNNEL_TRANSIT_T` 4, 5, 6, 8, 10, 12 and 15 (about 30 of the 35 cells run) never produced a win for the bot; timeouts per 12 ranged from 2 to 10, with the fewest (2) at the existing 0.15 and 5 s. Nothing in the allowed ranges meets either target, so `AI_RAIL_SHARE` stays 0.15 and `TUNNEL_TRANSIT_T` 5, the open and plain matrices are unchanged by construction, and the optional "lay only within 3 segments of the front" rule was not built (it can only do less than turning the fund off, which did not help). Remaining suspects are the enemy's own tunnel use and the bot's habit of sending troops to one selected line; both are outside the ranges allowed.
- **Not checked**: the visuals (arch, exit ring and the glyph) were not seen in a browser; they are covered only by tests that they draw without throwing.

## 14. Rail through the middle

Chosen by you: the railway runs through the middle of the battlefield, trenches get sandbag barriers, and trains are drawn from above. Intent: `docs/superpowers/specs/2026-11-21-rail-middle-design.md`. Numbers in `src/data/rail.js`.

- **Rail position**: the rail lane is `RAIL_Y = WH / 2` (it ran along the bottom of the field before). Track, trains, wrecks and riders all use that line.
- **Slot move**: the middle emplacement slot sits beside the track, not on it: `SLOTS` is now 0.22, 0.62, 0.78 (y = 186 for the middle one) and `SLOTS5` 0.12, 0.31, 0.6, 0.69, 0.88 (y = 180).
- **Sandbag barriers**: every trench the track has reached gets a small sandbag barrier on the rail lane. A big shell that lands within `BARRIER_R` 26 px of such a trench no longer breaks the track there. The barrier shields the rails from shell breaks only; trains and troops are hurt as before, and track between trenches still breaks.
- **Top-down trains**: trains are drawn from above, nose along the rail. This is drawing only and changes no stats.
- **Balance**: against main before this branch (2a26acb), default bot, every nation against Germany and Germany against Britain on open. A first pass of 10 seeds showed Russia v Germany jumping from 3 to 9 wins, which looked like it needed a fix. Isolating the rail move from the slot move (separate scratch builds with only one change each) showed the swing came from moving the rail itself, not the slot: with `NORAIL=1` (no railway at all) main, the slot-only build, and the full branch all win 7-8 of 10 as Russia. The rail move alone, with the old slot positions, already won 8 of 10. Riders used to get off at the old bottom-edge rail and walk up to 264 px to their line; now that walk is at most 128 px, which was costing Russia wins on main. Cutting `AI_RAIL_SHARE` to compensate would have weakened the enemy's railway on every map for the wrong reason, so the share was left at 0.15 and the sample was widened to 30 seeds instead, which settles out as noise:

| Matchup | Main (30 seeds) | Branch at 0.15 (30 seeds) |
|---|---|---|
| Britain v Germany | 30 | 28 |
| France v Germany | 27 | 28 |
| USA v Germany | 30 | 29 |
| Austria-Hungary v Germany | 22 | 20 |
| Antarctica v Germany | 11 | 10 |
| Italy v Germany | 11 | 15 |
| Russia v Germany | 19 | 21 |
| Germany v Britain | 2 | 4 |

  Every matchup is within a few wins of main over 30 seeds. `BARRIER_R`, `TRACK_COST`, `REPAIR_COST` and the train hp are unchanged.
- **Numbers changed**: none. `AI_RAIL_SHARE` stays 0.15.
- **Is the rail too fragile in the middle?** Trains destroyed and track breaks over 10 seeds of each open matchup, and 6 seeds each way on the Long March (bot side / enemy side, counted by a scratch copy of the bot, sampled once a second):

| Matchup | Trains lost, main | Trains lost, branch at 0.15 | Breaks, main | Breaks, branch |
|---|---|---|---|---|
| Open, 8 matchups together | 21 / 58 | 14 / 8 | 2 / 0 | 0 / 0 |
| Long March, Britain v Germany (6 seeds) | 10 / 0 | 7 / 4 | 1 / 0 | — |
| Long March, Germany v Britain (6 seeds) | 6 / 10 | 7 / 4 | 0 / 0 | — |

  The bot loses fewer trains with the rail in the middle at 0.15, not more; the earlier 0.10 build's higher losses came from giving the enemy more money for units instead of rail. Nothing here looks too fragile.
- **Long March** (default bot, seeds 1 to 6, `MAXS=1800`). The bot still never wins there, which is known and accepted. At 0.15 the branch has 4 of 12 battles time out, against 2 of 12 on main and 6 of 12 on the earlier 0.10 build; finished battles take about as long as on main.

## 15. Antarctica chill

Chosen by you: Antarctica tank shells chill what they hit, and the three heaviest Antarctica tanks (Vinson,
Erebus, Pole) are detuned from their earlier extremes. Intent: `docs/superpowers/specs/2026-11-24-antarctica-chill-design.md`.

- **The mechanic**: every Antarctica tank cannon (four of the five tank variants, the Iron Penguin armoured
  train's cannon, and the Southern Colossus's turrets) sets any unit it damages to `CHILL_MULT` (0.6, i.e.
  60%) of its walking speed for `CHILL_DUR` (4) s, armour included. It reuses the existing `hurt()`/shell-splash
  hit loop rather than adding a new one, so the Iron Penguin and the Southern Colossus inherit it automatically
  with no separate wiring. A repeat hit refreshes the timer rather than stacking a second debuff. Ross
  (`tkL`) has no cannon at all — it's built `mgOnly` (`atk: 'mg'`, `shell: 0`), so its only guns are machine
  guns, and it never fires the shell-splash hit that triggers chill. Machine gun fire in general (including
  `fireArmor`'s machine-gun branch) never applies chill, and trains are never chilled, only slowed-down-walking
  units. The effect uses no new rng, so battles stay fully deterministic for a given seed.
- **Detune table** (Vinson, Erebus, Pole only; Ross and Weddell are unchanged): Pole remains the toughest
  tank in the game by hp, now a pinned cross-nation test rather than a prose claim (`STATS.aq.tkS.hp` is the
  max of every nation's heaviest tank class, 4900 vs. Germany's Ratte at 4500).

  | Tank | Stat | Old | Final |
  |---|---|---|---|
  | Vinson (`tkM`) | cost | 760 | 650 |
  | Vinson | hp | 1800 | 1400 |
  | Vinson | dmg | 48 | 40 |
  | Vinson | splash | 26 | 24 |
  | Vinson | speed | 17 | 18 |
  | Erebus (`tkH`) | cost | 1150 | 850 |
  | Erebus | hp | 3100 | 2100 |
  | Erebus | dmg | 70 | 52 |
  | Erebus | splash | 34 | 27 |
  | Erebus | speed | 14 | 16 |
  | Pole (`tkS`) | cost | 1950 | 1650 |
  | Pole | hp | 5600 | 4900 |
  | Pole | dmg | 96 | 90 |
  | Pole | splash | 42 | 36 |
  | Pole | speed | 11 | 13 |

- **Bot coverage**: the headless bot as a player only ever buys the base `tank` from its `pref` list, so as
  `aq` it fields Weddells (which already chill) and never Vinson, Erebus or Pole. The detuned stats only show
  up on the enemy side, where the AI picks from every affordable, unlocked class (`aiCost(k) <= ai.money * 2
  + 60`, gated by `AI_UNLOCK`: `tkM` 520 s, `tkH` 640 s, `tkS` 1000 s). The balance matrix below therefore
  runs both directions (`aq` as the bot and `aq` as the enemy).
- **Balance check**: `MAXS=900`, baseline on `main` against this branch, `aq` against each of `gb de fr ru us
  ah it` and the reverse direction, open map seeds 1–10; `aq` v `de` and `de` v `aq` on plain and march,
  seeds 1–3; a control (`de` v `gb` and `gb` v `de` on open, seeds 1–10) to confirm no non-`aq` path moved.
  172 battles each side, 344 total.

  | Matchup / map | Baseline WR | Branch WR | Δ | Baseline time | Branch time | Baseline sel | Branch sel | Baseline losses | Branch losses |
  |---|---|---|---|---|---|---|---|---|---|
  | Austria-Hungary v Antarctica, open | 60.0% | 60.0% | +0.0 | 369.6 | 369.6 | 5.80 | 5.80 | 16.10 | 16.10 |
  | Antarctica v Austria-Hungary, open | 0.0% | 0.0% | +0.0 | 237.8 | 237.8 | 0.00 | 0.00 | 34.20 | 34.20 |
  | Antarctica v Germany, march | 0.0% | 0.0% | +0.0 | 872.3 | 872.3 | 5.00 | 5.00 | 143.67 | 143.67 |
  | Antarctica v Germany, open | 30.0% | 30.0% | +0.0 | 505.8 | 505.7 | 4.40 | 4.20 | 35.90 | 35.30 |
  | Antarctica v Germany, plain | 0.0% | 0.0% | +0.0 | 596.3 | 596.3 | 3.33 | 3.33 | 65.00 | 65.00 |
  | Antarctica v France, open | 20.0% | 20.0% | +0.0 | 323.2 | 323.2 | 2.70 | 2.70 | 28.40 | 28.40 |
  | Antarctica v Britain, open | 10.0% | 10.0% | +0.0 | 331.1 | 331.1 | 1.70 | 1.70 | 35.40 | 35.40 |
  | Antarctica v Italy, open | 10.0% | 10.0% | +0.0 | 405.1 | 405.1 | 2.60 | 2.60 | 37.40 | 37.40 |
  | Antarctica v Russia, open | 0.0% | 0.0% | +0.0 | 352.2 | 352.2 | 1.00 | 1.00 | 51.10 | 50.80 |
  | Antarctica v USA, open | 0.0% | 0.0% | +0.0 | 412.9 | 412.9 | 0.80 | 1.00 | 57.90 | 51.00 |
  | Germany v Antarctica, march | 0.0% | 0.0% | +0.0 | 900.0 | 900.0 | 11.00 | 11.00 | 69.00 | 69.00 |
  | Germany v Antarctica, open | 30.0% | 30.0% | +0.0 | 536.2 | 532.0 | 3.60 | 3.60 | 47.30 | 45.60 |
  | Germany v Antarctica, plain | 0.0% | 0.0% | +0.0 | 713.0 | 713.0 | 5.67 | 3.67 | 42.33 | 42.67 |
  | France v Antarctica, open | 50.0% | 50.0% | +0.0 | 588.9 | 588.9 | 7.20 | 7.20 | 69.90 | 69.90 |
  | Britain v Antarctica, open | 80.0% | 80.0% | +0.0 | 450.0 | 450.0 | 8.50 | 8.40 | 35.70 | 36.20 |
  | Italy v Antarctica, open | 20.0% | 20.0% | +0.0 | 661.5 | 661.5 | 5.10 | 5.10 | 61.90 | 61.90 |
  | Russia v Antarctica, open | 30.0% | 30.0% | +0.0 | 711.1 | 711.1 | 6.10 | 5.80 | 93.50 | 94.40 |
  | USA v Antarctica, open | 50.0% | 50.0% | +0.0 | 680.7 | 680.7 | 7.00 | 7.00 | 79.80 | 79.80 |
  | **Control**: Germany v Britain, open | 10.0% | 10.0% | +0.0 | 316.4 | 316.4 | 1.00 | 1.00 | 42.60 | 42.60 |
  | **Control**: Britain v Germany, open | 100.0% | 100.0% | +0.0 | 341.8 | 341.8 | 9.80 | 9.80 | 14.10 | 14.10 |

  Every `aq` matchup's win rate is identical, baseline to branch (checked per-seed, not just per-category:
  all 172 battles' `won` flags matched exactly), well inside the ±20-point bar. The two control rows are
  byte-identical JSON between baseline and branch, confirming no non-`aq` path moved. No tuning of
  `CHILL_MULT`, `CHILL_DUR` or the detuned stats was needed.
- **Why the detune and the chill barely move win rate here — the real reason**: a one-off instrumented run
  (not committed) counted enemy-AI tank spawns by type across the same `X v aq` matrix, on both `main` and
  this branch. Erebus (`tkH`) and Pole (`tkS`) were fielded by the enemy AI **zero times in 76 battles, on
  both branches**, and this is not an artifact of the 900 s time cap used here: the same result holds at
  `MAXS=1800` too (76 battles, zero Vinsons, zero Erebus, zero Poles fielded by the enemy). The actual cause
  is structural, not time-budget: the enemy AI's armour-slot cap (20 trained tank slots) fills up entirely
  with cheap Ross before it can ever afford or choose to buy Vinson, Erebus or Pole, at any battle length.
  So the 172-battle matrix above confirms chill's mechanics work and don't break anything, but it does **not**
  balance-test the detuned heavy-tank stats themselves — the enemy AI structurally never buys those tanks,
  at this budget or any other. The small, non-zero time/`sel`/`losses` deltas seen in the table come from
  the enemy's Iron Penguin (armoured train) being chilled or chilling, not from Ross: Ross is mg-only
  (`atk: 'mg'`, `shell: 0`) and cannot ever trigger chill. Of the battles that differ between `main` and this
  branch at `MAXS=1800`, 11 of 11 had the enemy's Iron Penguin fielded; only 2 had a Weddell (the one
  Antarctica tank below `tkM` that fires a cannon and can chill).
- **What a human fielding the heavies actually sees**: because the headless bot's own `pref` list never buys
  past the base `tank`, the matrix above can't say anything about Vinson/Erebus/Pole either. A separate bot
  configuration that forces Antarctica to prefer `tkS`/`tkH`/`tkM` over cheaper units was run across all 7
  nations, open map, seeds 1–10, `MAXS=1800`, main vs. this branch:

  | Opponent | Win rate, main → branch |
  |---|---|
  | Britain | 40% → 50% |
  | Germany | 90% → 90% |
  | France | 20% → 30% |
  | Russia | 20% → 40% |
  | USA | 40% → 40% |
  | Austria-Hungary | 20% → 10% |
  | Italy | 40% → 60% |

  Overall 38.6% → 45.7%. The branch bought roughly twice as many heavies (Vinson 41→77, Erebus 26→51, Pole
  6→15 across the run) because the lower cost outweighs the lower stats. In other words, for a human who
  actually fields Antarctica's heavy tanks, this detune lands closer to a mild buff than a nerf in net
  practical effect, even though every individual unit's raw stats went down.

## Known quirks

- "Super trench" now means two different things: the single neutral one on the Long March (built-in guns, +3 supplies, level 4, free cards) and the two double trenches on the Wide open plain (cover, 5 slots, +1 supply, hedgehogs). In code they are `SUPER` (one line index) and `DBL` (a list).
- On every map reinforcements walk from the HQ, so they take over a minute to reach a far-forward front unless a railway carries them (section 11).

- Every non-magazine weapon draws an extra faint "miss" tracer, even on hits and shells. Looks like an `else` attached to the wrong `if` in the original code. Not changed.
- Bunkers share the three emplacement slots in each trench with MG nests, so two bunkers leave room for one nest.
- Sheltered troops fire from about 30 px behind the trench line, so they reach slightly less far.
- A fully passive player was overrun in about 9 minutes on the Long March in testing.
- The cheap armoured MG tanks (Kugelpanzer, Ford, Vezdekhod) may be too strong against infantry, since bullets barely hurt armour.
- The Paris Gun at 500 may be too cheap for a shell that can wipe a cluster.
- Everything here was tested headlessly. Nothing was hand-played, and the research screen with five Armour nodes was not checked on a phone.

## Open questions (unanswered when this zip was made)

1. Should bunkers share the trench's 3 emplacement slots with MG nests, get their own 2 extra slots, or replace MG nests?
2. Should the bunker stay slightly behind the line (less reach) or sit on the trench line (same reach)?
3. Antarctic economy: keep as is, slower start (10 supplies, +1.5 a second), or faster growth (0.9 a second every minute)?
4. Should the Paris Gun pause the game while you aim?
5. Should Italy get a fourth tank, and should the Alpini bonus be kept?
6. Other super-heavy tanks for the nations that lack one?
7. Should the two kinds of super trench be unified, or one of them renamed?
8. Should Russia get a light tank again, now that the Vezdekhod is its signature tank?
9. (Settled: the Long March's one-trench-behind rule was removed in favour of buildable railways, section 11.)

## Ideas not started

Mud and rain map, Ottoman Empire, balance and AI difficulty, polish (sound, tutorial).
