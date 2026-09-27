import { test } from 'node:test';
import assert from 'node:assert/strict';
import { estimateBeatSeconds, beatToBpm, bpmToBeat, CALIBRATION_NOTES } from '../js/game/tempo.js';

test('needs 4 onsets', () => {
  assert.equal(CALIBRATION_NOTES, 4);
  assert.equal(estimateBeatSeconds([{ t: 0, beat: 0 }, { t: 0.4, beat: 0.5 }, { t: 0.8, beat: 1 }]), null);
});

test('eighth notes played 0.4 s apart give 0.8 s per beat', () => {
  const on = [0, 0.4, 0.8, 1.2].map((t, i) => ({ t, beat: i * 0.5 }));
  assert.ok(Math.abs(estimateBeatSeconds(on) - 0.8) < 1e-9);
});

test('mixed eighths and quarters are normalised by written length', () => {
  const on = [{ t: 0, beat: 0 }, { t: 0.4, beat: 0.5 }, { t: 1.2, beat: 1.5 }, { t: 1.6, beat: 2 }];
  assert.ok(Math.abs(estimateBeatSeconds(on) - 0.8) < 1e-9);
});

test('median ignores one slow note', () => {
  const on = [{ t: 0, beat: 0 }, { t: 0.4, beat: 0.5 }, { t: 2.0, beat: 1 }, { t: 2.4, beat: 1.5 }];
  assert.ok(Math.abs(estimateBeatSeconds(on) - 0.8) < 1e-9);
});

test('clamped to 40-120 BPM', () => {
  const fast = [0, 0.05, 0.1, 0.15].map((t, i) => ({ t, beat: i * 0.5 }));
  const slow = [0, 2, 4, 6].map((t, i) => ({ t, beat: i * 0.5 }));
  assert.equal(estimateBeatSeconds(fast), 0.5);
  assert.equal(estimateBeatSeconds(slow), 1.5);
});

test('bpm conversions', () => {
  assert.equal(beatToBpm(0.8), 75);
  assert.equal(bpmToBeat(60), 1);
});
