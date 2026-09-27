import { test } from 'node:test';
import assert from 'node:assert/strict';
import { advance } from '../js/game/roll.js';

test('waits at the target', () => {
  assert.equal(advance(3, 3, 0.1, 1), 3);
});

test('flows at the tempo: one beat per beatSeconds', () => {
  assert.ok(Math.abs(advance(0, 1, 0.25, 0.5) - 0.5) < 1e-9);
});

test('never passes the target', () => {
  assert.equal(advance(0.9, 1, 0.5, 0.5), 1);
});

test('catches up twice as fast when more than a beat behind', () => {
  assert.ok(Math.abs(advance(0, 4, 0.25, 0.5) - 1) < 1e-9);
});

test('a target behind the position (restart) jumps back', () => {
  assert.equal(advance(5, 0, 0.1, 1), 0);
});
