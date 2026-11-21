# Railways, stage 1 (track and transport train): design

Date: 2026-11-20 · Status: draft for approval

> **Superseded (2026-11-21, user decision):** the Long March railhead has been removed. Every map now spawns reinforcements at the HQ, and trains replace the railhead. Lines below that say the railhead stays are historical.

## Why

Trench railways carried men and shells right up to the front, and shellfire
kept cutting them. Stage 1 adds a railway you build yourself, plus a transport
train that runs on it. This gives the player a new trade-off: spend supplies on
track, or spend them on troops.

The track is the foundation for stage 2 (the armoured train) and stage 3 (the
railway gun and its ammo cart). Those stages get their own designs later.

## Goals

- **Building track.** You pay supplies to lay track one segment at a time, one segment per trench. Track starts at your HQ and runs forward, and only into trenches you hold.
- **Losing track.** When the enemy captures a trench, the segment in it and every segment beyond it are destroyed. Trains past the break are cut off.
- **Shell damage.** A shell landing on a segment can break it. Trains stop at a break until you pay to repair it.
- **Buying trains.** You buy a transport train like a unit. Trains take **train slots**, a cap shared later with the armoured train and the railway gun.
- **How the train runs.** It shuttles back and forth automatically:
  - **Outbound:** troops waiting at the HQ board, ride to the end of the track, get off, and walk the rest of the way to their ordered line.
  - **Return:** badly wounded troops at the end of the track board, ride home, heal at the HQ, then ride back out.
  - **Round trip:** each completed round trip adds a lump of supplies.
- **National flavour.** Every nation has its own named transport train with a distinct look, and small stat differences are allowed.
- **The enemy.** The enemy commander builds track, buys transport trains and uses them the same way.

## Non-goals

- The armoured train, the railway gun and the ammo cart (stages 2 and 3).
- Using captured enemy track.
- Trains crossing into enemy-held trenches.
- Any change to the Long March map's built-in railhead. It stays as it is. Your own track only pays off once it reaches further forward than the railhead.

## Anti-goals

- Track or trains that make troops appear forward instantly. They must ride visibly, and they still walk from the end of the track.
- Breaking determinism (the same seed gives the same battle), or changing battles where nobody builds track.
- A train that shuttles troops into enemy fire with no choice. Troops only ride as far as your last held, intact segment.
- Making existing reinforcement mechanics pointless: Teleferica, tunnels, conscripts, convoys and paratroopers.

## How the player uses it

- **Building track:**
  - With a trench you hold selected, a **"Lay track: <cost>"** button builds the next segment.
  - You can only build the segment directly after the current end of the track, toward the front.
  - The button is disabled, with the reason shown, when the next trench isn't held or the track is broken.
- **Repairing track:** when a segment is broken, a **"Repair track: <cost>"** button replaces "Lay track" until the break is fixed.
- **Buying a train:** the transport train is a button in the buy row, labelled with the nation's train name and cost. The button is disabled when the train slots are full.
- **Where trains run:** a train runs between the HQ and the **end of the intact track**, meaning the furthest unbroken segment that is still held.
  - If a break appears, trains turn back at the break.
  - If the end segment is lost, the end moves back.
- **Riding outbound:**
  - Newly bought infantry whose ordered line is at or beyond the end of the track ride, and so do troops idling at the HQ with orders forward.
  - Tanks and emplacements never ride.
  - Riders are drawn on the train and can't fire while riding.
  - If the train is destroyed, riders get off where it stood, at full strength.
- **Riding back:**
  - Troops below the wounded threshold who are settled at the end-of-track trench board the return trip.
  - At the HQ they heal to full, then board the next outbound run back to their old line.
- **Trains under fire:** trains can be shot and shelled. A destroyed train frees its slot.

## Starting numbers (to be tuned with `npm run bot`)

| Setting | Value |
|---|---|
| Track segment | 40 supplies |
| Repair | 20 supplies |
| Transport train | ~150 supplies, hp ~300, carries 6, about 3× infantry walking speed |
| Train slots | 3 |
| Supplies per round trip | 15 |
| Wounded threshold | below 40% hp |
| Shell break rule | only **big shells** break track (user decision): shells flagged `big`, `huge`, `raze` or `siege`, or with splash ≥ 60. One of these landing within its splash radius of the rail line on a segment always breaks it, so no rng is needed. Ordinary barrage, mortar, HQ-gun and tank shells never break track. |

## National trains (names are my call; looks are the builder's)

| Nation | Train |
|---|---|
| Britain | Simplex light railway |
| Germany | Heeresfeldbahn |
| France | Decauville train |
| USA | Baldwin trench locomotive |
| Austria-Hungary | k.u.k. Feldbahn |
| Italy | Ferrovia da campo |
| Russia | Narrow-gauge field train |
| Antarctica | Penguin Express |

Stat differences between nations stay small, within ±15% on speed, hp and capacity, and they fit each nation's character. For example, Antarctica's train is big and slow, Russia's is cheap, and the USA's is fast.

## The enemy

- The commander lays track into trenches it holds, toward the player, using its normal money on a fixed schedule with no extra rng.
- It repairs breaks and buys transport trains up to the slot cap.
- When the enemy captures a trench, your track there is destroyed, and the same rule applies to the enemy's track when you capture.
- Like the earlier features, the enemy might never act because it spends all its money on troops. If so, use a separate fund, the same way the base upgrades and the HQ gun do. This must be verified in real seeded battles.

## Determinism

- No new rng draws while no track exists. Battles with no track must be unchanged.
- Shell breaks are deterministic and draw no rng.
- Before 90 s, the enemy's money is byte-identical to today's.

## Rules settled after review

- **Riders when no train is ready (user decision):** a soldier waits at the HQ only if the next train would get him to the end of the track sooner than walking. Otherwise he walks. Laying track must never make reinforcements slower. A train leaves the HQ when it is full, or when nobody else waiting would be better off riding.
- **Segment geometry:**
  - Segment L is the stretch of rail from `G.LX[L-1]` to `G.LX[L]`, so segment 1 runs from the HQ to trench 1.
  - The rail runs along a fixed lane near the bottom edge of the field.
  - Track is stored as `G.track[side] = { end, broken: Set }`.
  - Capturing trench L destroys segment L and every segment beyond it.
- **Long March railhead:**
  - Units still spawn at the railhead as they do today.
  - A unit rides the train only if the end of the track lies further forward than its railhead spawn point, and the ride is faster than walking.
  - Riders always board at the HQ.
- **Trains are their own entities:**
  - They live in `G.trains`, not `G.units`, so they never affect `count`, `infCap`, `walkFront`, `countAt` or ownership.
  - They are hit by shell splash.
  - Enemy units in range may target them, with armour like a light tank.
  - A destroyed train frees its slot, and its riders dismount.
- **Supply trips:** a round trip pays supplies only if it carried at least one rider in either direction. An empty shuttle earns nothing.
- **Healing:**
  - Wounded riders heal to full the moment they reach the HQ.
  - If their old line has been lost while they were away, they take the side's current orders line instead: `G.sel` for the player, `ai.F` for the enemy.
- **Buttons:**
  - **Lay track** always builds the next segment, whatever trench is selected. It is disabled with a reason if trench `end+1` isn't held.
  - **Repair** fixes the break nearest the HQ first.
- **Enemy:**
  - From t = 90 s, `AI_RAIL_SHARE = 0.1` of the enemy's income goes to a separate `ai.railFund`, as with the HQ-gun fund.
  - Its order of spending is: repair, then lay the next segment, then buy trains up to the cap, each paid from the fund.
  - No rng is used, and money is byte-identical before 90 s.

## Decided vs. left to the builder

**Decided by the user:**
- Armoured train, railway gun with ammo cart, and transport train, in three stages starting with track plus transport.
- You build the track.
- Every nation gets trains, with national flavour.
- The transport carries troops out and wounded back, and brings supplies on each run.
- Track can only go into held trenches.
- Captured track is destroyed.
- The enemy builds track too.
- The train shuttles automatically.
- Shells cut track, and repair costs supplies.
- Train slots.
- (For later stages: the ammo cart shuttles shells, the railway gun fires automatically, the armoured train is a mobile fortress, and all trains are bought like units.)

**My calls (open to change):**
- The numbers in the table.
- The train names.
- The wounded threshold.
- Long March's railhead stays.
- Riders can't fire.
- Riders get off safely if the train is destroyed.

**Left to the builder:**
- Track and train art.
- The exact button copy, within the patterns above.
- How riders are drawn.
- The order of loading and unloading.
