import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTracker } from '../js/game/tracker.js';

const STEP = 0.01;

// Feeds frames every 10 ms and collects the events.
function player(tracker) {
  let t = 0;
  const events = [];
  const play = (note, seconds, rms = 0.2) => {
    const end = t + seconds - 1e-9;
    for (; t < end; t += STEP) events.push(...tracker.update({ t, note, rms }));
    return api;
  };
  const api = { play, rest: (s) => play(null, s, 0), events, types: () => events.map((e) => e.type) };
  return api;
}

const item = (name, duration = 0.5) => ({ name, duration });

test('a correct note held long enough completes on the first try', () => {
  const tr = createTracker([item('MI'), item('SI')]);
  const p = player(tr).play('MI', 0.45);
  assert.deepEqual(p.types(), ['start', 'complete']);
  assert.equal(p.events[1].firstTry, true);
  assert.equal(tr.state().index, 1);
});

test('the start event carries the onset time', () => {
  const tr = createTracker([item('MI'), item('SI')]);
  const p = player(tr).rest(0.2).play('MI', 0.45);
  assert.ok(Math.abs(p.events[0].t - 0.2) < 0.011);
});

test('hold progress grows while holding', () => {
  const tr = createTracker([item('MI'), item('SI')]);
  player(tr).play('MI', 0.12);
  const s = tr.state();
  assert.equal(s.phase, 'holding');
  assert.ok(s.progress > 0.4 && s.progress < 0.6, String(s.progress));
});

test('stopping too early is not a completion and costs the first try', () => {
  const tr = createTracker([item('MI'), item('SI')]);
  const p = player(tr).play('MI', 0.15).rest(0.2);
  assert.deepEqual(p.types(), ['start', 'early']);
  p.play('MI', 0.4);
  assert.equal(p.events.at(-1).type, 'complete');
  assert.equal(p.events.at(-1).firstTry, false);
});

test('stopping early keeps the progress, and playing again continues from there', () => {
  const tr = createTracker([item('MI'), item('SI')]); // needs 0.25 s
  const p = player(tr).play('MI', 0.15).rest(0.2);
  const kept = tr.state().progress;
  assert.ok(kept > 0.5 && kept < 0.6, String(kept));
  assert.equal(tr.state().phase, 'waiting');
  p.play('MI', 0.08);
  assert.deepEqual(p.types(), ['start', 'early', 'resume']);
  assert.ok(tr.state().progress > kept);
  p.play('MI', 0.1);
  assert.deepEqual(p.types(), ['start', 'early', 'resume', 'complete']);
  assert.equal(p.events.at(-1).firstTry, false);
});

test('a wrong note is reported once and the song waits', () => {
  const tr = createTracker([item('MI'), item('SI')]);
  const p = player(tr).play('LA', 0.4);
  assert.deepEqual(p.events, [{ type: 'wrong', index: 0, heard: 'LA' }]);
  assert.equal(tr.state().index, 0);
  assert.equal(tr.state().heard, 'LA');
  p.play('MI', 0.4);
  assert.deepEqual(p.types(), ['wrong', 'start', 'complete']);
  assert.equal(p.events.at(-1).firstTry, false);
});

test('a short glitch of another note is not a wrong note', () => {
  const tr = createTracker([item('MI'), item('SI')]);
  const p = player(tr).play('FA', 0.1).play('MI', 0.4);
  assert.deepEqual(p.types(), ['start', 'complete']);
  assert.equal(p.events[1].firstTry, true);
});

test('holding one SI does not play both SI SI', () => {
  const tr = createTracker([item('SI'), item('SI'), item('LA')]);
  const p = player(tr).play('SI', 1.5);
  assert.deepEqual(p.types(), ['start', 'complete']);
  assert.equal(tr.state().index, 1);
});

test('SI, short silence, SI plays both', () => {
  const tr = createTracker([item('SI'), item('SI'), item('LA')]);
  const p = player(tr).play('SI', 0.4).rest(0.1).play('SI', 0.4);
  assert.deepEqual(p.types(), ['start', 'complete', 'start', 'complete']);
  assert.equal(tr.state().index, 2);
});

test('SI, tongued dip in volume, SI plays both', () => {
  const tr = createTracker([item('SI'), item('SI'), item('LA')]);
  const p = player(tr).play('SI', 0.4, 0.2).play('SI', 0.05, 0.05).play('SI', 0.4, 0.2);
  assert.deepEqual(p.types(), ['start', 'complete', 'start', 'complete']);
});

test('a breath wobble under 80 ms does not break the note', () => {
  const tr = createTracker([item('MI'), item('SI')]);
  const p = player(tr).play('MI', 0.15).rest(0.05).play('MI', 0.25);
  assert.deepEqual(p.types(), ['start', 'complete']);
  assert.equal(p.events[1].firstTry, true);
});

test('still holding the previous note is not a wrong note', () => {
  const tr = createTracker([item('SI'), item('LA')]);
  const p = player(tr).play('SI', 0.9).play('LA', 0.4);
  assert.deepEqual(p.types(), ['start', 'complete', 'start', 'complete', 'done']);
  assert.equal(p.events[3].firstTry, true);
});

test('rests are skipped and the song finishes', () => {
  const tr = createTracker([item('MI', 1), item('rest', 1)]);
  const p = player(tr).play('MI', 0.7);
  assert.deepEqual(p.types(), ['start', 'complete', 'done']);
  assert.equal(tr.state().phase, 'done');
  assert.deepEqual(tr.update({ t: 5, note: 'MI', rms: 0.2 }), []);
});

test('a leading rest is skipped', () => {
  const tr = createTracker([item('rest', 1), item('MI')]);
  assert.equal(tr.state().index, 1);
});

test('hold time follows the tempo: half the note, at least 0.2 s', () => {
  const quarter = createTracker([item('MI', 1), item('SI')], { beatSeconds: 1 });
  assert.equal(quarter.required(), 0.5);
  quarter.setBeatSeconds(0.5);
  assert.ok(Math.abs(quarter.required() - 0.25) < 1e-9);
  const eighth = createTracker([item('MI', 0.5), item('SI')], { beatSeconds: 0.5 });
  assert.equal(eighth.required(), 0.2);
});

test('a quarter note needs about twice the hold of an eighth', () => {
  const tr = createTracker([item('MI', 1), item('SI')], { beatSeconds: 1 });
  const p = player(tr).play('MI', 0.45);
  assert.deepEqual(p.types(), ['start']);
  p.play('MI', 0.2);
  assert.deepEqual(p.types(), ['start', 'complete']);
});

import PIANO from '../js/instruments/piano.js';

test('piano: a note counts as soon as it is struck', () => {
  const tr = createTracker([item('MI', 1), item('SI', 1)], { beatSeconds: 1, ...PIANO.tracker });
  const p = player(tr).play('MI', 0.18);
  assert.deepEqual(p.types(), ['start', 'complete']);
});

test('piano: SI SI needs two strikes (a fading note, then a new strike)', () => {
  const tr = createTracker([item('SI'), item('SI'), item('LA')], { beatSeconds: 1, ...PIANO.tracker });
  const p = player(tr).play('SI', 0.2, 0.3).play('SI', 0.3, 0.1).play('SI', 0.3, 0.05);
  assert.deepEqual(p.types(), ['start', 'complete']);
  p.play('SI', 0.2, 0.3);
  assert.deepEqual(p.types(), ['start', 'complete', 'start', 'complete']);
});
