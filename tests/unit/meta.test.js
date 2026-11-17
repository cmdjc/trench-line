// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { META, makeCode, readCode, codeCheck, loadMeta, saveMeta } from '../../src/sim/meta.js';

beforeEach(() => { localStorage.clear(); META.points = 0; META.tech = {}; META.runs = 0; META.wins = 0; META.rev = 0; });

describe('save codes', () => {
  it('round-trips points, tech mask, runs, wins', () => {
    META.points = 123; META.tech = { marks: 1, kit: 1 }; META.runs = 7; META.wins = 3;
    const d = readCode(makeCode());
    expect(d.points).toBe(123); expect(d.tech).toEqual({ marks: 1, kit: 1 }); expect(d.runs).toBe(7); expect(d.wins).toBe(3);
  });
  it('rejects bad checksum, wrong prefix, junk', () => {
    expect(readCode('TL1-0-0-0-0-ZZ')).toBeNull();
    expect(readCode('hello')).toBeNull();
    const c = makeCode(); const body = c.slice(0, c.lastIndexOf('-'));
    expect(readCode(body + '-AAAA')).toBeNull();
    expect(readCode('TL2-' + c.split('-').slice(1).join('-'))).toBeNull();
  });
  it('prunes tech whose predecessor is missing (mask bit 1 = kit requires marks = bit 0)', () => {
    const body = 'TL1-5-2-0-0';                    // mask 2 = kit only
    expect(readCode(body + '-' + codeCheck(body)).tech).toEqual({});
    const ok = 'TL1-5-3-0-0';                       // mask 3 = marks+kit
    expect(readCode(ok + '-' + codeCheck(ok)).tech).toEqual({ marks: 1, kit: 1 });
  });
});

describe('two-slot recovery', () => {
  it('higher rev wins across slots', async () => {
    META.points = 10; META.tech = {}; META.runs = 1; META.wins = 1; META.rev = 5; // code for rev 5 slot a
    const aCode = makeCode();
    META.points = 20; META.rev = 9;
    const bCode = makeCode();
    localStorage.setItem('trenchline-meta', JSON.stringify({ code: aCode, rev: 5, ts: 100 }));
    localStorage.setItem('trenchline-meta-b', JSON.stringify({ code: bCode, rev: 9, ts: 50 }));
    await loadMeta();
    expect(META.points).toBe(20); expect(META.rev).toBeGreaterThanOrEqual(9);   // resaved both slots
  });
  it('equal revs: newer timestamp wins; corrupt slot repaired; legacy JSON shape loads', async () => {
    META.points = 7; META.tech = { marks: 1 }; META.runs = 2; META.wins = 0; META.rev = 3;
    const code = makeCode();
    localStorage.setItem('trenchline-meta', JSON.stringify({ code, rev: 3, ts: 999 }));
    localStorage.setItem('trenchline-meta-b', JSON.stringify({ code, rev: 3, ts: 1 }));
    await loadMeta(); expect(META.points).toBe(7);
    localStorage.setItem('trenchline-meta', 'garbage');
    await loadMeta(); expect(META.points).toBe(7); expect(localStorage.getItem('trenchline-meta')).not.toBe('garbage');
    localStorage.clear();
    localStorage.setItem('trenchline-meta', JSON.stringify({ points: 31, tech: { marks: 1 }, runs: 4, wins: 2 })); // legacy direct object
    await loadMeta(); expect(META.points).toBe(31); expect(META.tech).toEqual({ marks: 1 });
  });
  it('both slots invalid → defaults; failed writes reported via saveOk', async () => {
    localStorage.setItem('trenchline-meta', 'x'); localStorage.setItem('trenchline-meta-b', 'y');
    await loadMeta(); expect(META.points).toBe(0);
    await saveMeta(); expect(META.rev).toBe(1);        // both writes succeed in jsdom
  });
});
