import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCurve } from '../js/ui/curve.js';

const W = 1000;
const curve = createCurve({ width: W }); // exit 0-200, front 200-600, entry 600-1000

test('the front (20%-60%) is flat: full size, positions unchanged', () => {
  for (const w of [200, 300, 450, 600]) {
    assert.equal(curve.scale(w), 1);
    assert.equal(curve.x(w), w);
  }
});

test('cards shrink in the exit (left) and entry (right) zones', () => {
  assert.ok(curve.scale(150) < 1 && curve.scale(150) > curve.scale(50));
  assert.ok(curve.scale(700) < 1 && curve.scale(700) > curve.scale(900));
});

test('the exit is fixed: whatever goes past 20% stays inside the left 20%', () => {
  for (const w of [199, 100, -500, -5000]) assert.ok(curve.x(w) < 200 && curve.x(w) > -W * 0.1, `w=${w}`);
  assert.ok(curve.scale(-400) < 0.12);
});

test('coming cards are still readable across the entry zone', () => {
  const edge = [...Array(3000).keys()].map((d) => 600 + d).find((w) => curve.x(w) >= W);
  const s = curve.scale(edge);
  assert.ok(s > 0.25 && s < 0.45, String(s));
});

test('position never jumps and never goes backwards', () => {
  let prev = curve.x(-4050);
  for (let w = -4000; w <= 4000; w += 50) {
    const x = curve.x(w);
    assert.ok(x > prev && x - prev <= 50 + 1e-9, `w=${w}`);
    prev = x;
  }
});

test('scale is the slope of x (widths shrink exactly as much as cards)', () => {
  for (const w of [-300, 120, 800, 1500]) {
    const slope = (curve.x(w + 0.01) - curve.x(w - 0.01)) / 0.02;
    assert.ok(Math.abs(slope - curve.scale(w)) < 1e-4, `w=${w}`);
  }
});
