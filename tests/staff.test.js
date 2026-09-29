import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseNote, accidentalFor, staffSvg } from '../js/ui/staff.js';

test('notes sit where the song sheet has them (MI on the bottom line = step 2)', () => {
  assert.equal(parseNote('DO').step, 0);
  assert.equal(parseNote('MI').step, 2);
  assert.equal(parseNote('SI').step, 6);
  assert.equal(parseNote("RE'").step, 8);
  assert.equal(parseNote('LA,').step, -2);
  assert.equal(parseNote('rest'), null);
});

test('the key signature hides the sharp it already gives', () => {
  const key = ['FA#'];
  assert.equal(accidentalFor('FA#', key), '');
  assert.equal(accidentalFor("FA#'", key), '');
  assert.equal(accidentalFor('RE#', key), '#');
  assert.equal(accidentalFor('FA', key), 'natural');
  assert.equal(accidentalFor('SIb', []), 'b');
  assert.equal(accidentalFor('MI', key), '');
});

test('staffSvg draws a head, and a flag only for eighths', () => {
  const eighth = staffSvg('MI', 0.5);
  const quarter = staffSvg('MI', 1);
  assert.match(eighth, /<ellipse/);
  assert.ok(eighth.length > quarter.length);
});
