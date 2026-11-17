import { describe, expect, it } from 'vitest';
import { makeRng, rng, decor } from '../../src/core/rng.js';

describe('makeRng (mulberry32)', () => {
  it('reproduces the same sequence for the same seed', () => {
    const a = makeRng(1234), b = makeRng(1234);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
  it('stays in [0,1) and differs across seeds', () => {
    const a = makeRng(1), b = makeRng(2);
    const seq = Array.from({ length: 200 }, () => a());
    expect(seq.every(v => v >= 0 && v < 1)).toBe(true);
    expect(seq.slice(0, 5)).not.toEqual(Array.from({ length: 5 }, () => b()));
  });
});

describe('shared rng', () => {
  it('reseed() reseeds; .seed reports the current seed', () => {
    rng.reseed(42);
    const first = rng.float();
    rng.reseed(42);
    expect(rng.float()).toBe(first);
    expect(rng.seed).toBe(42);
  });
  it('float() stays in [0,1)', () => {
    rng.reseed(7);
    for (let i = 0; i < 500; i++) {
      const v = rng.float();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
  it('range(a,b) stays within bounds', () => {
    rng.reseed(7);
    for (let i = 0; i < 100; i++) {
      const v = rng.range(3, 9);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(9);
    }
  });
  it('int(n) returns integers in [0,n)', () => {
    rng.reseed(11);
    for (let i = 0; i < 100; i++) {
      const v = rng.int(5);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(5);
    }
  });
  it('pick(arr) returns an element of arr', () => {
    rng.reseed(3);
    const arr = ['a', 'b', 'c'];
    for (let i = 0; i < 50; i++) expect(arr).toContain(rng.pick(arr));
  });
});

describe('decor generator (map decoration, ported rnd)', () => {
  it('is deterministic per seed and spans the field', () => {
    const a = decor(1916), b = decor(1916);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
    const vals = Array.from({ length: 100 }, () => a());
    expect(Math.min(...vals)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...vals)).toBeLessThanOrEqual(1);
  });
});
