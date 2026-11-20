# Base upgrades: design

Date: 2026-11-20 · Status: draft for approval

## Why

Supplies pile up mid-battle with nothing interesting to buy. Base upgrades give
the player a big, deliberate thing to spend on: every point put into the HQ is a
point not spent at the front. Each nation gets one signature upgrade so the
choice also says something about how that nation plays.

## Goals

- In-battle HQ upgrades bought with supplies, 3 tiers each.
- Three **shared** upgrades every nation gets, plus one **national** upgrade per nation.
- A new **Base** research branch that lets battles start with upgrades already at a higher tier.
- The enemy commander buys upgrades too, so the fight stays fair.
- The HQ drawing visibly changes as tiers rise.

## Non-goals

- No separate home-base screen or new currency. Persistence is only through research points.
- No branching paths inside an upgrade (tiers are a straight line, 1 → 2 → 3).
- No change to existing research nodes. Concrete HQ, Aid posts and Light railway stay and **stack** with the new upgrades.

## Anti-goals (failure even if it works)

- Upgrades so cheap they're an obvious always-buy. Each tier should feel like giving up a tank or more at the front.
- Breaking existing save codes or the append-only tech mask.
- Making the game less playable by keyboard (it is currently playable end to end with Tab and Enter).
- Breaking seeded determinism: same seed, same battle, AI upgrades included.

## How the player uses it

- **Tap your HQ** to open the base upgrade panel. It lists the three shared upgrades and the national one, each with its current tier, the next tier's effect, and its cost. A button buys the next tier if you can afford it.
- Each tier is bought separately. You can't skip tiers. T3 is the maximum.
- Buying is **instant**: pay, and the tier takes effect immediately. There is no build time.
- No upgrade adds a new command. Everything is passive or automatic, including the Teleferica and the Tunnelling Company T3, so there are no new buttons, targeting or AI decisions to use them.
- Upgrades last for the battle. They're lost if the HQ falls, but the battle ends then anyway.

## Shared upgrades (all nations)

| Upgrade | T1 | T2 | T3 |
|---|---|---|---|
| **HQ Walls** | + HQ health | more + HQ health | more health, and the HQ slowly repairs itself |
| **Supply Depot** | + income/s | more | more |
| **Field Hospital** | troops resting in trenches heal | faster | faster |

## National upgrades

| Nation | Upgrade | T1 | T2 | T3 |
|---|---|---|---|---|
| Britain | **Tunnelling Company** | Messines mine tunnels faster / costs less | mine blast bigger and harder | **automatic:** newly bought troops tunnel out at your front-most held trench instead of walking from the HQ |
| Germany | **Krupp Works** | Paris Gun ready sooner (shorter cooldown) | Paris Gun hits harder / wider | Paris Gun fires a second shell per use |
| France | **Voie Sacrée** | reinforcements walk faster from the HQ | + income | free convoy of poilus from the HQ every so often |
| USA | **Liberty Depot** | income growth faster | depots yield more | tanks cost less |
| Austria-Hungary | **K.u.K. Officer School** | infantry deal more damage | infantry tougher | +5 infantry cap |
| Antarctica | **Colossus Drydock** | Southern Colossus ready sooner | Colossus tougher | Colossus starts bigger |
| Italy | **Teleferica** | **automatic:** newly bought infantry ride a cable car straight to the selected trench, up to a few trenches from the HQ | reaches further and moves more troops at once | carries tanks too |
| Russia | **Conscription Office** | free conscripts trickle out of the HQ | faster | bigger batches |

Krupp Works and Colossus Drydock improve superweapons that unlock only after
four minutes. They can still be bought before then; the bonus simply waits.

## Costs

"Big investment." T1 should cost about a tank, and T3 a serious share of a
mid-battle bank. The starting point is about **300 / 550 / 900** per tier,
tuned with `npm run bot` so an upgrade-heavy player neither steamrolls nor
collapses.

## Research: the Base branch

- Separate nodes **per upgrade**: Walls, Depot, Hospital, and National, each with "starts at T1" and then "starts at T2".
- The National node applies to whichever nation you're playing.
- T3 is never a starting tier. It must always be bought in battle.
- Node order is the save-code mask. New nodes are **appended** after the existing 17. The mask uses `1 << i`, so the tree must stay at 31 nodes or fewer. Eight new nodes makes 25.
- The current decoder requires nodes in a branch to be bought in order. That's fine for "T1 then T2" within one upgrade. The four upgrades must be independent of each other, so either use four small branches or extend the prerequisite rule.

## Enemy commander

The AI gets a new `want = 'base'` option in `aiStep`. Once the battle has gone
on for a while and it has spare money, it occasionally buys the next tier of a
shared or national upgrade, using the seeded rng. It starts at tier 0, with no
research. When the enemy buys a tier, the player sees a toast. Its automatic effects, such as the Teleferica, the tunnels and free conscripts, apply to its own spawns the same way they do for the player.

## Visuals

`drawBase` gains layers per tier: wall segments, depot crates, hospital tents
with a red cross, and a small national building. The national building's look
is up to the builder. Both HQs draw this way.

## What's decided vs. left to the builder

**Decided by the user:** both in-battle and persistent parts; shared + unique
structure; the three shared upgrades; each nation's upgrade choice; 3 straight
tiers; instant purchase; Teleferica and tunnels are automatic; research grants a higher starting tier with per-upgrade nodes; existing
research stacks; the enemy buys upgrades; tap the HQ to open the panel; big-
investment pricing; the HQ visibly changes.

**My calls (open to change):** the per-tier effects listed above; T2 as the
maximum researchable starting tier; research point costs for the new nodes;
superweapon upgrades buyable before the superweapon unlocks; Teleferica range in trenches per tier.

**Left to the builder:** exact numbers; panel layout; how a tap on the HQ
coexists with selecting line 0 and the double-tap fortify gesture; a keyboard
route to the panel; art details.
