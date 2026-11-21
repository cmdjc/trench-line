# Trench Line: stat tables

Generated from the game data by `npm run stats` (`scripts/gen-stats.mjs`). Numbers are first-pass and need playtesting.

## Nations

| Nation | Infantry cap | Armour cap | Trench defence | Superweapon |
|---|---|---|---|---|
| Britain | 40 | 8 | Wire (70) | Messines mine (450, 120 s cooldown) |
| Germany | 40 | 8 | Pillbox instead of MG nest | Paris Gun (500, 90 s cooldown) |
| France | 40 | 12 | Gun pit (130) | Char 2C (1100, 60 s cooldown) |
| USA | 40 | 5 | Supply depot (120) | Airborne drop (341, 30 s cooldown) |
| Austria-Hungary | 20 | 2 | none | Škoda 42 cm (400, 90 s cooldown) |
| United States of Antarctica | 20 | 20 | Bunker (120) | Southern Colossus (2500, 150 s cooldown) |
| Italy | 40 | 8 | Gun pit (120) | Caproni bombers (420, 80 s cooldown) |
| Russia | 60 | 10 | Mines (60) | Tsar Tank (900, 60 s cooldown) |

## Infantry

**Britain**

| Unit | Cost | Health | Damage | Range | Notes |
|---|---|---|---|---|---|
| Rifleman | 20 | 40 | 8 | 250 | Cheap and steady. |
| Lewis gunner | 50 | 45 | 5 | 250 | Light gun. Keeps up and fires on the move, but short reach. |
| Trench raider | 30 | 65 | 11 | 80 | Cheap, tough and fast. Bombs ignore trench cover. |
| Sniper | 55 | 30 | 45 | 440 | Long reach. Picks men out of trenches. |
| Mortar team | 90 | 35 | 22 | 480 | Shells trenches up to two lines away. |

**Germany**

| Unit | Cost | Health | Damage | Range | Notes |
|---|---|---|---|---|---|
| Rifleman | 20 | 40 | 8 | 250 | Cheap and steady. |
| MG 08 team | 65 | 45 | 6 | 300 | Heavy gun. Longest reach, very slow to move. |
| Stormtrooper | 45 | 50 | 7 | 120 | Submachine gun. Hits hard, ignores trench cover. |
| Sniper | 55 | 30 | 45 | 440 | Long reach. Picks men out of trenches. |
| Mortar team | 90 | 35 | 22 | 480 | Shells trenches up to two lines away. |

**France**

| Unit | Cost | Health | Damage | Range | Notes |
|---|---|---|---|---|---|
| Rifleman | 20 | 40 | 8 | 250 | Cheap and steady. |
| Chauchat gunner | 35 | 40 | 5 | 240 | Very cheap, fires on the move, but the gun jams. |
| Trench raider | 35 | 55 | 11 | 95 | Fast. Grenades ignore trench cover. |
| Sniper | 55 | 30 | 45 | 440 | Long reach. Picks men out of trenches. |
| 75 mm field gun | 110 | 60 | 20 | 420 | Rapid shellfire. Deadly in the open, weak against trenches. |

**USA**

| Unit | Cost | Health | Damage | Range | Notes |
|---|---|---|---|---|---|
| Rifleman | 20 | 40 | 8 | 250 | Cheap and steady. |
| BAR gunner | 45 | 45 | 6 | 230 | Automatic rifle. Fires on the move, reloads often. |
| Trench shotgunner | 40 | 55 | 30 | 70 | Devastating at arm’s length, useless beyond it. |
| Sniper | 55 | 30 | 45 | 440 | Long reach. Picks men out of trenches. |
| Mortar team | 90 | 35 | 22 | 480 | Shells trenches up to two lines away. |

**Austria-Hungary**

| Unit | Cost | Health | Damage | Range | Notes |
|---|---|---|---|---|---|
| Kaiserjäger | 40 | 74 | 14.8 | 250 | Elite rifleman. Worth two of anyone else’s. |
| Schwarzlose team | 120 | 83.25 | 9.25 | 280 | Veteran gun crew. Twice the punch, twice the price. |
| Sturmtruppe | 70 | 101.75 | 20.35 | 95 | Hand-picked assault troops. Grenades ignore trench cover. |
| Scharfschütze | 110 | 55.5 | 83.25 | 440 | Master marksman with very long reach. |
| Minenwerfer crew | 180 | 64.75 | 40.7 | 480 | Heavy trench mortar with an expert crew. |

**United States of Antarctica**

| Unit | Cost | Health | Damage | Range | Notes |
|---|---|---|---|---|---|
| Ice Trooper | 20 | 30 | 8 | 250 | Parka-clad rifleman. Fragile, but shelters in bunkers. |
| Blizzard gunner | 60 | 34 | 5 | 280 | Machine gunner. Fragile, but deadly from a bunker. |
| Sledge raider | 35 | 41 | 11 | 95 | Fast ski-trooper. Grenades ignore trench cover. |
| Polar Ranger | 55 | 23 | 45 | 440 | Very long reach. Picks men out of trenches. |
| Frost mortar crew | 90 | 26 | 22 | 480 | Shells trenches up to two lines away. |

**Italy**

| Unit | Cost | Health | Damage | Range | Notes |
|---|---|---|---|---|---|
| Alpino | 24 | 52 | 8 | 250 | Mountain infantry. Tougher and a little slower. Takes 15% less damage in trenches. |
| Fiat-Revelli team | 60 | 58 | 5 | 280 | Water-cooled gun. Sturdy crew, but slow to move. |
| Ardito | 36 | 64 | 11 | 90 | Shock trooper with dagger and grenades. Ignores trench cover. |
| Alpine sniper | 55 | 38 | 45 | 440 | Mountain marksman. Very long reach. |
| Bombarda crew | 95 | 44 | 22 | 480 | Trench mortar team. Shells trenches up to two lines away. |

**Russia**

| Unit | Cost | Health | Damage | Range | Notes |
|---|---|---|---|---|---|
| Conscript | 11 | 28 | 6 | 250 | Weak, but very cheap. Send them in crowds. |
| Maxim gun | 65 | 70 | 5 | 280 | Wheeled gun. Its shield stops nearly half of all bullets. |
| Trench raider | 35 | 55 | 11 | 95 | Fast. Grenades ignore trench cover. |
| Sniper | 55 | 30 | 45 | 440 | Long reach. Picks men out of trenches. |
| Mortar team | 90 | 35 | 22 | 480 | Shells trenches up to two lines away. |

## Armour

Limit use is how much of the nation's armour limit one vehicle takes.

**Britain** (armour limit 8)

| Vehicle | Cost | Health | Damage | Range | Speed | Limit use | Notes |
|---|---|---|---|---|---|---|---|
| Whippet | 105 | 190 | 6 | 250 | 42 | 0.5 | Fast light tank, machine guns only. Shreds troops in the open, but bullets hurt it. |
| Mk V tank | 250 | 480 | 26 | 230 | 26 | 1 | Quick, with two guns. Bullets still hurt it a little. |
| Flying Elephant | 540 | 1250 | 34 | 250 | 12 | 3 | Giant rhomboid. Four sponson guns and machine guns, but very slow. |

**Germany** (armour limit 8)

| Vehicle | Cost | Health | Damage | Range | Speed | Limit use | Notes |
|---|---|---|---|---|---|---|---|
| Kugelpanzer | 80 | 70 | 5 | 200 | 40 | 0.5 | Tiny one-man armoured ball. Machine gun only, but bullets barely scratch it. |
| A7V tank | 330 | 700 | 30 | 230 | 16 | 1 | Slow fortress. Thick armour and six machine guns. |
| Maus | 640 | 1700 | 46 | 260 | 14 | 3 | Enormous armour and a long gun, but very slow. |
| Ratte | 1500 | 4500 | 100 | 340 | 10 | 6 | Landkreuzer. A land battleship with twin heavy guns and machine guns. Barely moves. |

**France** (armour limit 12)

| Vehicle | Cost | Health | Damage | Range | Speed | Limit use | Notes |
|---|---|---|---|---|---|---|---|
| FT mitrailleuse | 90 | 200 | 5 | 230 | 36 | 0.6 | The machine-gun version of the Renault FT. Cheap and fast. |
| Renault FT | 140 | 260 | 16 | 220 | 34 | 1 | Small, cheap and fast. Field a dozen. |
| Saint-Chamond | 290 | 640 | 28 | 250 | 18 | 2 | Heavy tank with a long nose gun and four machine guns. |

**USA** (armour limit 5)

| Vehicle | Cost | Health | Damage | Range | Speed | Limit use | Notes |
|---|---|---|---|---|---|---|---|
| Ford 3-Ton | 60 | 90 | 4 | 190 | 52 | 0.4 | Tiny two-man tank with one machine gun. Very cheap and very quick. |
| Mark VIII Liberty | 420 | 900 | 34 | 240 | 20 | 1 | The heaviest standard tank. Two guns and machine guns. |
| T28 super-heavy | 700 | 1900 | 54 | 300 | 13 | 3 | Turretless monster with a huge fixed gun. Long reach, heavy armour, slow. |

**Austria-Hungary** (armour limit 2)

| Vehicle | Cost | Health | Damage | Range | Speed | Limit use | Notes |
|---|---|---|---|---|---|---|---|
| Škoda 15 cm howitzer | 190 | 180 | 55 | 560 | 18 | 0.5 | Field howitzer. Reaches two trenches and shells whole positions. |
| Škoda 30.5 cm mortar | 400 | 300 | 150 | 720 | 12 | 1 | Siege gun. Reaches three trenches and smashes fortifications. |

**United States of Antarctica** (armour limit 20)

| Vehicle | Cost | Health | Damage | Range | Speed | Limit use | Notes |
|---|---|---|---|---|---|---|---|
| Ross | 160 | 380 | 6 | 270 | 30 | 1 | Light tank with twin machine guns. Huge for a light tank, and costly. |
| Weddell | 460 | 950 | 36 | 240 | 20 | 2 | Medium tank with a long gun. Big for its class. |
| Vinson | 760 | 1800 | 48 | 260 | 17 | 3.5 | Giant rhomboid with a turret and sponson guns. |
| Erebus | 1150 | 3100 | 70 | 280 | 14 | 5 | Heavy with a monster gun and a rear turret. Very tough. |
| Pole | 1950 | 5600 | 96 | 360 | 11 | 8 | Land cruiser with three turrets. Slow, enormous and very costly. |

**Italy** (armour limit 8)

| Vehicle | Cost | Health | Damage | Range | Speed | Limit use | Notes |
|---|---|---|---|---|---|---|---|
| Fiat 3000 | 115 | 220 | 5 | 230 | 32 | 0.7 | Light tank with twin machine guns. Cheap and steady. |
| Fiat 2000 | 340 | 800 | 30 | 230 | 15 | 1 | Slow 40-ton fortress. A turret gun and a ring of machine guns. |
| P 26/40 | 560 | 1250 | 42 | 280 | 18 | 2.5 | Fast heavy tank with a long 75 mm gun. |

**Russia** (armour limit 10)

| Vehicle | Cost | Health | Damage | Range | Speed | Limit use | Notes |
|---|---|---|---|---|---|---|---|
| Vezdekhod | 110 | 200 | 6 | 240 | 38 | 1 | Light tank on one wide track. Quick and cheap, with a machine gun and no cannon. |
| Mendeleev tank | 360 | 900 | 38 | 240 | 14 | 2 | Slow ironclad with a heavy turret gun. Tough and affordable. |

## Emplacements and special units

| Unit | Cost | Health |
|---|---|---|
| MG nest | 90 | 200 |
| Pillbox | 170 | 420 |
| 75 mm gun pit | 130 | 180 |
| 65 mm mountain gun pit | 120 | 200 |
| Supply depot | 120 | 150 |
| Bunker | 120 | 600 |
| Char 2C | 1100 | 3200 |
| Tsar Tank | 900 | 2800 |
| Southern Colossus | 2500 | 9000 |

## Research tree

**Infantry**

1. Marksman training (15 points): Riflemen deal 10% more damage.
2. Field kit (30 points): Infantry have 10% more health.
3. Fieldcraft (50 points): Infantry move 15% faster.
4. Veteran cadre (80 points): Start each battle with extra riflemen worth 80 supplies.

**Fortification**

1. Deeper trenches (15 points): Your troops in trenches take 8% less damage.
2. Concrete HQ (30 points): Your HQ has 400 more health.
3. HQ gun pits (50 points): Your HQ guns hit 40% harder.
4. Aid posts (80 points): Troops resting in a trench recover 1 health per second.

**Logistics**

1. Stockpile (15 points): Start each battle with 40 more supplies.
2. Light railway (30 points): +0.4 supplies every second.
3. War economy (50 points): +20% supplies from kills.
4. Staff planning (80 points): Choose from 4 cards each time, up from 3.

**Armour**

1. Mechanics (20 points): Tanks have 10% more health.
2. Gunnery school (40 points): Tanks and mortars deal 10% more damage.
3. Tank works (60 points): Tanks cost 10% less.
4. Tank corps (90 points): The tank unlock is always offered in your first card choice.
5. Landships (120 points): Super-heavy tanks, such as Germany’s Ratte, are available from the start of every battle. No card needed.

**HQ Walls**

1. HQ Walls I (25 points): Your HQ starts each battle with HQ Walls at tier 1.
2. HQ Walls II (60 points): Your HQ starts each battle with HQ Walls at tier 2.

**Supply Depot**

1. Supply Depot I (25 points): Your HQ starts each battle with a Supply Depot at tier 1.
2. Supply Depot II (60 points): Your HQ starts each battle with a Supply Depot at tier 2.

**Field Hospital**

1. Field Hospital I (25 points): Your HQ starts each battle with a Field Hospital at tier 1.
2. Field Hospital II (60 points): Your HQ starts each battle with a Field Hospital at tier 2.

**National works**

1. National works I (40 points): Your nation’s base upgrade starts each battle at tier 1.
2. National works II (90 points): Your nation’s base upgrade starts each battle at tier 2.

## Superweapons

| Nation | Name | Cost | Cooldown | Effect |
|---|---|---|---|---|
| Germany | Paris Gun | 500 | 90 s | One massive shell on a spot you choose, anywhere on the field. It lands after 4 seconds, wrecks everything in a big circle and levels fortifications there. |
| Britain | Messines mine | 450 | 120 s | Tunnels for 25 seconds under the nearest enemy trench ahead of the selected one, then blows up everything in it. |
| France | Char 2C | 1100 | 60 s | A 69-ton super-heavy tank with a turret gun and machine guns. One at a time. |
| USA | Airborne drop | 341 | 30 s | Mitchell’s 1919 plan made real: 4 Thompson gunners, 2 riflemen and 2 BAR gunners parachute into an enemy or empty trench up to 3 trenches past your front. |
| Austria-Hungary | Škoda 42 cm | 400 | 90 s | Three fortress-breaking shells on the nearest enemy position ahead. They level its fortifications. |
| United States of Antarctica | Southern Colossus | 2500 | 150 s | A colossal 9,000-health landship with four turrets, machine guns and crushing treads. One at a time. |
| Italy | Caproni bombers | 420 | 80 s | A bomber flies down the nearest enemy position ahead of the selected trench and drops eight bombs along its length. |
| Russia | Tsar Tank | 900 | 60 s | A giant on nine-metre wheels that crushes whatever it reaches and rolls over hedgehogs. One at a time. |

## Maps

| Map | Description |
|---|---|
| No man’s land | Open, cratered ground and nine trenches. |
| River crossing | Two river channels cut the field around a central island at trench 5. Troops and tanks can only cross at the bridges, where they bunch up under fire. |
| Wide open plain | A long front: 17 trenches and no cover between them. Trenches 4 and 14 are super trenches, a double line with a wall between: far stronger cover, room for 5 emplacements, 1 extra supply a second for whoever holds them, and belts of steel hedgehogs that stop the attacker’s tanks until infantry take the trench. |
| The Long March | 45 trenches in nine fortified belts with wide empty ground between them, and a super trench in the middle. Troops walk a long way from the HQ, so each side starts with a railway through its first belt of trenches and one transport train. The track only runs as far as you hold, and you can build it on. |
