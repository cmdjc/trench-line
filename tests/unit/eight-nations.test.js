// @vitest-environment jsdom
//
// This fixture (tests/unit/fixtures/eight-nations.json) was generated once,
// from the pre-Saxony tree (HEAD at commit d901ec2, docs-only changes since
// the last product-code commit 2c5e28f). It pins the eight existing nations'
// data plus four seeded replay battles. Every later task in the Saxon
// Dominion plan is tested against this fixture to prove the existing eight
// nations' data and behavior stay byte-identical as a ninth nation is added.
//
// Do NOT regenerate this fixture on this branch. If a test below fails after
// a change on this branch, that change broke something in the existing eight
// nations, it did not just make the fixture stale.

import { describe, it, expect } from 'vitest';
import { dataSnapshot, replayDigest } from './eight-nations.js';
import fixture from './fixtures/eight-nations.json';

it('existing nation data is unchanged', () => {
  expect(dataSnapshot()).toEqual(fixture.data);
});

describe('seeded replays are unchanged', () => {
  it('replay gb-de-open-7 is unchanged', () => {
    expect(replayDigest('gb', 'de', 'open', 7, 120)).toEqual(fixture.replays['gb-de-open-7']);
  }, 120_000);

  it('replay aq-it-river-3 is unchanged', () => {
    expect(replayDigest('aq', 'it', 'river', 3, 120)).toEqual(fixture.replays['aq-it-river-3']);
  }, 120_000);

  it('replay ru-fr-plain-5 is unchanged', () => {
    expect(replayDigest('ru', 'fr', 'plain', 5, 120)).toEqual(fixture.replays['ru-fr-plain-5']);
  }, 120_000);

  it('replay us-ah-march-2 is unchanged', () => {
    expect(replayDigest('us', 'ah', 'march', 2, 120)).toEqual(fixture.replays['us-ah-march-2']);
  }, 120_000);
});
