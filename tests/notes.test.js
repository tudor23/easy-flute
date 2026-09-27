import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NOTES, fingeringDiff } from '../js/music/notes.js';
import { freqToNote } from '../js/music/noteName.js';

test('every note has a frequency and an 8-slot fingering', () => {
  for (const [name, n] of Object.entries(NOTES)) {
    assert.ok(n.freq > 500 && n.freq < 1800, name);
    assert.equal(n.fingering.length, 8, name);
  }
});

test('freqToNote names every table note exactly', () => {
  for (const [name, n] of Object.entries(NOTES)) {
    const r = freqToNote(n.freq);
    assert.equal(r.name, name);
    assert.ok(Math.abs(r.cents) < 1, `${name} cents ${r.cents}`);
  }
});

test('freqToNote splits at +/-50 cents', () => {
  const up = (f, c) => f * 2 ** (c / 1200);
  assert.equal(freqToNote(up(NOTES.MI.freq, 49)).name, 'MI');
  assert.equal(freqToNote(up(NOTES.MI.freq, 51)).name, 'FA');
  assert.equal(freqToNote(up(NOTES.MI.freq, -49)).name, 'MI');
  assert.equal(freqToNote(up(NOTES.MI.freq, -51)).name, 'RE#');
});

test('FA and FA# are different notes', () => {
  assert.equal(freqToNote(698.46).name, 'FA');
  assert.equal(freqToNote(739.99).name, 'FA#');
});

test('notes below the recorder range get a low-octave marker', () => {
  assert.equal(freqToNote(493.88).name, 'SI,');
});

test('fingeringDiff from LA to SI lifts hole 2', () => {
  assert.deepEqual(fingeringDiff(NOTES.LA.fingering, NOTES.SI.fingering), { cover: [], lift: [2], half: [] });
});

test('fingeringDiff from MI to RE# covers hole 6 half', () => {
  assert.deepEqual(fingeringDiff(NOTES.MI.fingering, NOTES['RE#'].fingering), { cover: [], lift: [], half: [6] });
});

test('fingeringDiff reports the thumb', () => {
  assert.deepEqual(fingeringDiff(NOTES["RE'"].fingering, NOTES["DO'"].fingering), { cover: ['thumb'], lift: [], half: [] });
});

import { sameNoteOtherOctave } from '../js/music/noteName.js';

test('piano naming: written pitch is sounding pitch (shift 2)', () => {
  assert.equal(freqToNote(329.63, 2).name, 'MI');
  assert.equal(freqToNote(261.63, 2).name, 'DO');
  assert.equal(freqToNote(311.13, 2).name, 'RE#');
  assert.equal(freqToNote(659.26, 2).name, "MI'");
  assert.equal(freqToNote(164.81, 2).name, 'MI,');
  assert.ok(Math.abs(freqToNote(329.63, 2).cents) < 1);
});

test('sameNoteOtherOctave says which way to go', () => {
  assert.equal(sameNoteOtherOctave("MI'", 'MI'), 'up');
  assert.equal(sameNoteOtherOctave('MI,', 'MI'), 'down');
  assert.equal(sameNoteOtherOctave('MI', "MI'"), 'down');
  assert.equal(sameNoteOtherOctave('RE', 'MI'), null);
  assert.equal(sameNoteOtherOctave('MI', 'MI'), null);
});
