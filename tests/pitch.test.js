import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectPitch, rms } from '../js/music/pitch.js';
import { NOTES } from '../js/music/notes.js';

const SR = 48000;
const N = 2048;

function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32) * 2 - 1;
}

function tone(freq, { harmonics = [1], amp = 0.3, noise = 0, seed = 1 } = {}) {
  const r = rng(seed);
  const buf = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    let v = 0;
    harmonics.forEach((h, k) => { v += h * Math.sin(2 * Math.PI * freq * (k + 1) * i / SR + k); });
    buf[i] = amp * v + noise * r();
  }
  return buf;
}

const cents = (a, b) => 1200 * Math.log2(a / b);

test('sine tones for every note are detected within 10 cents', () => {
  for (const [name, n] of Object.entries(NOTES)) {
    const p = detectPitch(tone(n.freq), SR);
    assert.ok(p, `${name} not detected`);
    assert.ok(Math.abs(cents(p.freq, n.freq)) < 10, `${name}: ${p.freq}`);
  }
});

test('recorder-like tones with harmonics and noise are detected within 10 cents', () => {
  for (const [name, n] of Object.entries(NOTES)) {
    const p = detectPitch(tone(n.freq, { harmonics: [1, 0.45, 0.25, 0.1], noise: 0.03, seed: 7 }), SR);
    assert.ok(p, `${name} not detected`);
    assert.ok(Math.abs(cents(p.freq, n.freq)) < 10, `${name}: ${p.freq}`);
  }
});

test('works at 44.1 kHz too', () => {
  const buf = new Float32Array(N);
  for (let i = 0; i < N; i++) buf[i] = 0.3 * Math.sin(2 * Math.PI * NOTES.SOL.freq * i / 44100);
  const p = detectPitch(buf, 44100);
  assert.ok(Math.abs(cents(p.freq, NOTES.SOL.freq)) < 10);
});

test('silence returns null', () => {
  assert.equal(detectPitch(new Float32Array(N), SR), null);
});

test('quiet tone below the gate returns null', () => {
  assert.equal(detectPitch(tone(NOTES.MI.freq, { amp: 0.005 }), SR, { gate: 0.01 }), null);
});

test('white noise returns null', () => {
  const r = rng(42);
  const buf = new Float32Array(N).map(() => 0.3 * r());
  assert.equal(detectPitch(buf, SR), null);
});

test('rms of a full-scale sine is about 0.707', () => {
  const buf = new Float32Array(N).map((_, i) => Math.sin(2 * Math.PI * 1000 * i / SR));
  assert.ok(Math.abs(rms(buf) - Math.SQRT1_2) < 0.01);
});

import PIANO from '../js/instruments/piano.js';
import { freqToNote } from '../js/music/noteName.js';

test('piano-like tones C4-E5 are named in the right octave within 10 cents', () => {
  const notes = { DO: 261.63, RE: 293.66, 'RE#': 311.13, MI: 329.63, FA: 349.23, 'FA#': 369.99, SOL: 392.0, LA: 440.0, SIb: 466.16, SI: 493.88, "DO'": 523.25, "RE'": 587.33, "MI'": 659.26 };
  for (const [name, f] of Object.entries(notes)) {
    // strong harmonics, fading like a struck string
    const buf = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const decay = Math.exp(-i / (SR * 0.4));
      buf[i] = 0.3 * decay * (Math.sin(2 * Math.PI * f * i / SR) + 0.7 * Math.sin(4 * Math.PI * f * i / SR + 1) + 0.5 * Math.sin(6 * Math.PI * f * i / SR + 2) + 0.3 * Math.sin(8 * Math.PI * f * i / SR));
    }
    const p = detectPitch(buf, SR, PIANO.pitch);
    assert.ok(p, `${name} not detected`);
    const n = freqToNote(p.freq, PIANO.nameShift);
    assert.equal(n.name, name);
    assert.ok(Math.abs(n.cents) < 10, `${name}: ${n.cents}`);
  }
});
