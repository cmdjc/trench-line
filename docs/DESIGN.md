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
- Reinforcements appear one trench behind the line you send them to (otherwise troops walk for minutes). The same applies to the enemy. The Kettering Bug flight time is capped at 7 seconds for the same reason.
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
- **Enemy**: from 150 seconds on, 20% of its income goes to a separate upgrade fund (`AI_BASE_SHARE`), so unit buying never pauses. Once the fund covers the next tier, and at least 90 seconds have passed since its last purchase, it buys the lowest tier in the rotation walls, national, depot, hospital, with a toast. Once everything is at tier 3 the share stops and all income goes to units again. It uses no random numbers and leaves its other wants alone, so seeded battles stay reproducible. It starts at tier 0 and gets no research.
- **Headless bot**: `scripts/bot.mjs` buys the next tier in the same rotation when supplies are at least twice the cost (`BASEX` changes the multiple). Its JSON now reports `base` and `foeBase` tiers.
- **Balance check**: each nation against Germany (Germany against Britain) on the open map, seeds 1 to 10, with and without upgrades. No nation's win rate moved more than 20 points. The bot rarely holds 600 supplies, so it buys few tiers at the default setting; at `BASEX=1` about half its battles include a walls tier, and the depot and hospital are bought least. No numbers were changed. The enemy buys about 1.7 tiers a battle.

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
