import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createScore, scoreNote } from '../js/game/score.js';

test('first-try notes are worth 10 and build the streak', () => {
  let s = createScore();
  ({ state: s } = scoreNote(s, true));
  ({ state: s } = scoreNote(s, true));
  assert.deepEqual(s, { points: 20, streak: 2, firstTry: 2, notes: 2 });
});

test('a missed note is worth 0, never negative, and resets the streak', () => {
  let s = createScore();
  ({ state: s } = scoreNote(s, true));
  ({ state: s } = scoreNote(s, false));
  assert.deepEqual(s, { points: 10, streak: 0, firstTry: 1, notes: 2 });
});

test('milestones at streaks of 5, 10 and 20', () => {
  let s = createScore();
  const hits = [];
  for (let i = 1; i <= 20; i++) {
    const r = scoreNote(s, true);
    s = r.state;
    if (r.milestone) hits.push(r.milestone);
  }
  assert.deepEqual(hits, [5, 10, 20]);
});
