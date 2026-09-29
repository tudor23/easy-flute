import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freqToNote, nameWithSlack } from '../js/music/noteName.js';
import { NOTES } from '../js/music/notes.js';
import flute from '../js/instruments/flute.js';

const off = (freq, cents) => freq * 2 ** (cents / 1200);
const RE_SHARP = NOTES['RE#'].freq;

test('a RE# played 70 cents flat is normally heard as RE', () => {
  assert.equal(freqToNote(off(RE_SHARP, -70)).name, 'RE');
});

test('the flute lets RE# be up to 75 cents off when RE# is the target', () => {
  for (const cents of [-74, -60, 0, 60, 74]) {
    assert.equal(nameWithSlack(off(RE_SHARP, cents), 1, 'RE#', flute.slack), 'RE#', `${cents} cents`);
  }
});

test('beyond the slack, or with another target, notes are named as usual', () => {
  assert.equal(nameWithSlack(off(RE_SHARP, -85), 1, 'RE#', flute.slack), 'RE');
  assert.equal(nameWithSlack(off(RE_SHARP, -70), 1, 'MI', flute.slack), 'RE');
  assert.equal(nameWithSlack(NOTES.RE.freq, 1, 'RE', flute.slack), 'RE');
  assert.equal(nameWithSlack(off(RE_SHARP, -70), 1, 'RE#'), 'RE');
});

test('slack works on the piano naming too (shift 2)', () => {
  assert.equal(nameWithSlack(off(RE_SHARP / 2, -70), 2, 'RE#', { 'RE#': 75 }), 'RE#');
});
