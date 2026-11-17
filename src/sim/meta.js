// Permanent progress: meta state, two-slot automatic saving and save codes.
// Verbatim port of prototype lines 558–622 except `saveState()` (DOM text) —
// UI renders the status from `saveOk` on the `meta` bus event instead.

import { TECH, TECH_IDS } from '../data/tech.js';
import { storage } from '../storage.js';
import { bus } from '../core/events.js';

export const META_KEY = 'trenchline-meta';
export const META = { points: 0, tech: {}, runs: 0, wins: 0, rev: 0 };
const store = storage;
/* two automatic saves: each holds the save code, a counter and a time; the newest valid one wins */
export const SAVE_KEYS = [META_KEY, META_KEY + '-b'];
export let saveOk = -1;

export const has = id => !!META.tech[id];

export function parseSave(text) {
  try {
    const d = JSON.parse(text);
    if (d && typeof d.code === 'string') { const data = readCode(d.code); return data ? { data, rev: d.rev || 0, ts: d.ts || 0 } : null; }
    if (d && typeof d.points === 'number') return { data: { points: d.points, tech: Object.assign({}, d.tech || {}), runs: d.runs || 0, wins: d.wins || 0 }, rev: 0, ts: 0 };
  } catch { }
  return null;
}

function saveState() { bus.emit('meta'); }   // UI hook: render status text from saveOk

export async function loadMeta() {
  if (!store) { saveState(); return; }
  const found = [];
  for (const k of SAVE_KEYS) {
    let rec = null;
    try { const r = await store.get(k); if (r && r.value) rec = parseSave(r.value); } catch { }
    found.push(rec);
  }
  const good = found.filter(Boolean).sort((x, y) => (y.rev - x.rev) || (y.ts - x.ts));
  if (good.length) {
    const g = good[0];
    META.points = g.data.points; META.tech = g.data.tech; META.runs = g.data.runs; META.wins = g.data.wins; META.rev = g.rev;
    if (found.some(f => !f || f.rev !== g.rev)) await saveMeta(); else { saveOk = 2; saveState(); }
  } else saveState();
}

export async function saveMeta() {
  if (!store) { saveState(); return; }
  META.rev = (META.rev || 0) + 1;
  const rec = JSON.stringify({ code: makeCode(), rev: META.rev, ts: Date.now() });
  let ok = 0;
  for (const k of SAVE_KEYS) { try { const r = await store.set(k, rec); if (r !== null) ok++; } catch { } }
  saveOk = ok;
  saveState();
}

/* end-of-run award (prototype endGame 1544–1545); UI shows the values from `game:end` */
export function awardRun(won, score) {
  const earned = Math.floor(score / 4) + (won ? 30 : 0);
  META.points += earned; META.runs++; if (won) META.wins++;
  void saveMeta();
  return earned;
}

/* save code: TL1-points-upgrades-runs-wins-check, all in base 36 */
export function codeCheck(body) { let h = 7; for (let i = 0; i < body.length; i++) h = (h * 31 + body.charCodeAt(i)) % 1296; return h.toString(36).toUpperCase().padStart(2, '0'); }

export function makeCode() {
  let mask = 0; TECH_IDS().forEach((id, i) => { if (META.tech[id]) mask |= 1 << i; });
  const body = ['TL1', META.points, mask, META.runs, META.wins].map((v, i) => i ? Math.max(0, Math.floor(v)).toString(36).toUpperCase() : v).join('-');
  return body + '-' + codeCheck(body);
}

export function readCode(text) {
  const parts = text.trim().toUpperCase().replace(/\s+/g, '').split('-');
  if (parts.length !== 6 || parts[0] !== 'TL1') return null;
  const body = parts.slice(0, 5).join('-');
  if (codeCheck(body) !== parts[5]) return null;
  const nums = parts.slice(1, 5).map(v => parseInt(v, 36));
  if (nums.some(v => !isFinite(v) || v < 0)) return null;
  const tech = {}; TECH_IDS().forEach((id, i) => { if (nums[1] & (1 << i)) tech[id] = 1; });
  for (const b of TECH) b.nodes.forEach((n, i) => { if (tech[n.id] && i > 0 && !tech[b.nodes[i - 1].id]) delete tech[n.id]; });
  return { points: nums[0], tech, runs: nums[2], wins: nums[3] };
}
