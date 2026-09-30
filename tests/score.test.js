import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createScore, scoreFound, scoreEnded, starsFor } from '../js/game/score.js';

// Plays a list of notes through both steps; each is [rightNote, lengthOk].
function play(notes, factor = 1) {
  let s = createScore();
  const gains = [];
  for (const [rightNote, lengthOk] of notes) {
    const found = scoreFound(s, { rightNote, factor });
    const ended = scoreEnded(found.state, { rightNote, lengthOk, factor });
    s = ended.state;
    gains.push(found.gained + ended.gained);
  }
  return { s, gains };
}

test('a perfect note: 10 for the note, 10 for the length, and the bonus grows by 10', () => {
  const { s, gains } = play([[true, true], [true, true], [true, true]]);
  assert.deepEqual(gains, [30, 40, 50]);
  assert.equal(s.points, 120);
  assert.equal(s.streak, 3);
  assert.equal(s.bonus, 30);
});

test('the wrong length keeps the streak but takes 10 off the bonus', () => {
  const { s, gains } = play([[true, true], [true, true], [true, true], [true, false], [true, true]]);
  assert.deepEqual(gains, [30, 40, 50, 30, 50]);
  assert.equal(s.streak, 5);
  assert.equal(s.bonus, 30);
});

test('the bonus never goes below zero', () => {
  const { s, gains } = play([[true, true], [true, false], [true, false]]);
  assert.deepEqual(gains, [30, 10, 10]);
  assert.equal(s.bonus, 0);
});

test('a wrong note breaks the streak: no note points, no bonus, length still counts', () => {
  const { s, gains } = play([[true, true], [true, true], [false, true], [false, false], [true, true]]);
  assert.deepEqual(gains, [30, 40, 10, 0, 30]);
  assert.equal(s.streak, 1);
  assert.equal(s.bonus, 10);
});

test('the bonus has no cap', () => {
  const { s } = play(Array.from({ length: 30 }, () => [true, true]));
  assert.equal(s.bonus, 300);
});

test('exam mode counts everything double', () => {
  const { gains } = play([[true, true], [true, true]], 2);
  assert.deepEqual(gains, [60, 80]);
});

test('found reports whether a wrong-note streak break happened later, not now', () => {
  const { state, gained } = scoreFound(createScore(), { rightNote: false, factor: 1 });
  assert.equal(gained, 0);
  assert.equal(state.points, 0);
});

test('the end of a note tells how the bonus went, for the pop-up', () => {
  let s = play([[true, true], [true, true]]).s;
  const r = scoreEnded(s, { rightNote: false, lengthOk: true, factor: 1 });
  assert.equal(r.lostBonus, 20);
  assert.equal(r.bonus, 0);
  s = scoreEnded(createScore(), { rightNote: true, lengthOk: true, factor: 1 });
  assert.equal(s.bonus, 10);
  assert.equal(s.lostBonus, 0);
});

test('milestones at streaks of 5, 10 and 20', () => {
  let s = createScore();
  const hits = [];
  for (let i = 1; i <= 20; i++) {
    const r = scoreEnded(s, { rightNote: true, lengthOk: i % 3 !== 0, factor: 1 });
    s = r.state;
    if (r.milestone) hits.push(r.milestone);
  }
  assert.deepEqual(hits, [5, 10, 20]);
});

test('perfect notes are counted for the stars', () => {
  const { s } = play([[true, true], [true, false], [false, true], [true, true]]);
  assert.equal(s.notes, 4);
  assert.equal(s.perfect, 2);
});

test('stars: one for finishing, two from 60% perfect, three from 90%', () => {
  const with_ = (perfect, notes) => ({ ...createScore(), perfect, notes });
  assert.equal(starsFor(with_(0, 10)), 1);
  assert.equal(starsFor(with_(5, 10)), 1);
  assert.equal(starsFor(with_(6, 10)), 2);
  assert.equal(starsFor(with_(8, 10)), 2);
  assert.equal(starsFor(with_(9, 10)), 3);
  assert.equal(starsFor(with_(10, 10)), 3);
  assert.equal(starsFor(createScore()), 1);
});
