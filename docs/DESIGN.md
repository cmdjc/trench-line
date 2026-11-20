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
- Reinforcements appear one trench behind the line you send them to (otherwise troops walk for minutes). The same applies to the enemy. The railhead never runs ahead of both your walking front and your unbroken run of held trenches from the HQ, so a trench taken by an airborne drop is not a railhead: troops sent there arrive at your real front and walk.
- **Super trench** (trench 23): starts empty and neutral at level 0. Whoever takes it first gets three built-in guns (two pillboxes and a 75 mm pit, 1.6 times normal health) that change hands with the trench. Holding it pays **+3 supplies a second** and lets you fortify to **level 4** (cost 320). You get a free card on first capture and then **one every 3 minutes held**; the timer pauses while you do not hold it, and a countdown shows in the supplies area. The enemy gets only the income and the guns.

## 6. United States of Antarctica

Chosen by you: a nation that never was, WWI-and-WWII realistic designs at humongous size, 20 fragile infantry, 20 armour, bunkers, a colossal tank superweapon, snow-white tanks, five variants, Antarctic place names, a flag with the white continent on blue, and a poor start with fast income growth.

- Infantry cap 20, normal prices, 30 health for riflemen. Ice Trooper, Blizzard gunner, Sledge raider, Polar Ranger, Frost mortar crew.
- Economy: starts with 15 supplies and +2 a second; income grows 0.7 a second every minute (the USA's is 0.4).
- **Bunkers**: a separate button (120 supplies, 600 health), up to two per trench. Settled troops walk in, six per bunker. Shots at sheltered troops hit the bunker instead and splash only reaches the bunker. Sheltered troops fire at full effect. When a bunker falls, the survivors are left exposed.
- **Southern Colossus**: 2,500 supplies, 9,000 health, four turrets, machine guns, crushing treads, 150 s cooldown, one at a time, does not count toward the armour limit.
- The enemy waits until it holds 60% of a superweapon's cost before choosing one, but only for costs of 1,500 or more (in practice, only the Colossus).

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

## Known quirks

- "Super trench" now means two different things: the single neutral one on the Long March (built-in guns, +3 supplies, level 4, free cards) and the two double trenches on the Wide open plain (cover, 5 slots, +1 supply, hedgehogs). In code they are `SUPER` (one line index) and `DBL` (a list).
- On the Wide open plain, reinforcements still walk from the HQ (the Long March's one-trench-behind rule is not applied), so they take over a minute to reach a far-forward front.

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
9. Should the Wide open plain use the Long March's rule that reinforcements arrive one trench behind the front?

## Ideas not started

Mud and rain map, Ottoman Empire, balance and AI difficulty, polish (sound, tutorial).
