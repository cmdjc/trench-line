# Tunnel trench (Long March): design

Date: 2026-11-21 · Status: approved in chat, written up for the build

## Why

Without the old railhead, the Long March stalls. Reinforcements walk 45 trenches,
and even the railways and the starting railway didn't fix that: on the current
`main` the bot won none of its 12 test battles, where it used to win 4 of 12.
Tunnel trenches give each side a forward point where reinforcements can arrive.
That point is worth fighting over, because either side can use it.

## Goals

- **Long March only.** Two existing trenches become **tunnel trenches**. Trench 11 is the player's, about 25% of the way from the player's HQ. Trench 35 is the enemy's, the mirror image. Compute the index as `round(NT / 4)` from each side's HQ, so it follows the map if it changes.
- **Normal trenches otherwise.** They have the same cover and the same emplacement slots as any other trench. Nobody holds them at the start.
- **What a tunnel trench does.** While a side holds a tunnel trench, reinforcements it sends to that trench or beyond it, toward the foe, can go through the tunnel instead of walking.
  - They spend `TUNNEL_T` seconds in the tunnel. While inside they are hidden: they can't fire or be hit, and they don't count toward caps.
  - Then they come out at the tunnel trench and walk on to their ordered line.
- **Either side can use either tunnel.** Whoever holds a tunnel trench gets its tunnel. If the enemy captures your trench 11, enemy reinforcements come out there.
- **Fastest route wins.** For each reinforcement, the game picks whichever gets it to its ordered line soonest, counting walking time from the exit: tunnel, train or walking.
- **Movers that deliver straight to the target come first.** Italy's Teleferica and the British tunnelling T3 upgrade still take priority.
- **The enemy uses tunnels automatically.** There is nothing to buy.
- **Map display.** A tunnel entrance is drawn at each tunnel trench. The trench strip marks them, for example with a "⊓" glyph, and the Long March blurb mentions them.

## Non-goals

- No tunnel trenches on other maps.
- No sending troops back through a tunnel. Wounded still use trains.
- No collapsing or destroying a tunnel.

## Anti-goals

- **Instant arrival.** The delay is required.
- **Breaking determinism.** Battles on other maps must stay byte-identical.
- **Making railways pointless on the Long March.** The tunnel should be one option among several, not the only sensible one.

## Starting numbers

| Setting | Value |
|---|---|
| `TUNNEL_T` | 8 s |
| Tunnel trench index | `round(NT/4)` from each HQ (11 and 35 on the Long March) |

## Success

- Long March battles mostly finish again, with fewer than 2 of 12 timing out at 1800 s.
- The player's Long March win rate gets back near `main`'s old 4 of 12 (gb v de, seeds 1–6).
- Other maps are unchanged.

## Decided vs. left to the builder

**Decided by the user:**
- Long March only.
- One tunnel trench per side, mirrored, about 25% from each HQ.
- Reinforcements sent past it come out there.
- If the enemy captures it, their troops come out there.
- It is an existing trench, marked.
- Nobody holds it at the start.
- There is a short delay.
- It is otherwise a normal trench.

**My calls:**
- 8 s in the tunnel.
- The fastest route wins.
- Direct movers take priority.
- The enemy uses tunnels automatically.
- The `round(NT/4)` index.

**Left to the builder:**
- Tunnel art and glyph.
- How units in the tunnel are hidden.
- The exact blurb wording.
