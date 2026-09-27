import { test } from 'node:test';
import assert from 'node:assert/strict';
import { keyboardFor, writtenMidi } from '../js/music/keyboard.js';

test('written names map to piano keys: DO = middle C (60)', () => {
  assert.equal(writtenMidi('DO'), 60);
  assert.equal(writtenMidi('MI'), 64);
  assert.equal(writtenMidi('RE#'), 63);
  assert.equal(writtenMidi('SIb'), 70);
  assert.equal(writtenMidi("DO'"), 72);
  assert.equal(writtenMidi('SI,'), 59);
});

test('Limu, Limu, Lima gets DO to MI\' (C4-E5): 10 white keys', () => {
  const kb = keyboardFor(['MI', 'SI', 'LA', 'FA#', 'SOL', 'RE#']);
  const whites = kb.keys.filter((k) => !k.black);
  assert.equal(kb.whiteCount, 10);
  assert.equal(whites[0].name, 'DO');
  assert.equal(whites.at(-1).name, "MI'");
});

test('black keys sit between their white neighbours', () => {
  const kb = keyboardFor(['MI', 'RE#']);
  const byName = Object.fromEntries(kb.keys.map((k) => [k.name, k]));
  assert.equal(byName['RE#'].black, true);
  const re = byName.RE;
  const mi = byName.MI;
  const center = byName['RE#'].x + byName['RE#'].w / 2;
  assert.ok(Math.abs(center - (re.x + re.w)) < 1e-9);
  assert.ok(center < mi.x + 1e-9 && center > re.x);
  assert.ok(byName['RE#'].w < re.w);
});

test('positions are in white-key units starting at 0', () => {
  const kb = keyboardFor(['DO', 'RE']);
  const whites = kb.keys.filter((k) => !k.black);
  whites.forEach((k, i) => { assert.equal(k.x, i); assert.equal(k.w, 1); });
});

test('a high song extends the keyboard upwards', () => {
  const kb = keyboardFor(['SOL', "RE'", "SOL'"]);
  const whites = kb.keys.filter((k) => !k.black);
  assert.equal(whites[0].name, 'DO');
  assert.equal(whites.at(-1).name, "SI'");
});
