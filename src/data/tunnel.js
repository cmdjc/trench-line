// Tunnel trenches (Long March): constants. Pure data, no browser APIs.
// Design: docs/superpowers/specs/2026-11-21-tunnel-trench-design.md
// Not to be confused with base.js TUNNEL_T, the gb Messines mine's dig time.

export const TUNNEL_T = 8;      // seconds a reinforcement spends in the tunnel
export const TUNNEL_DIV = 4;    // each side's tunnel trench sits round(NT / TUNNEL_DIV) trenches from its HQ
