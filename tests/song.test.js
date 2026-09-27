import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SONGS } from '../js/songs/index.js';
import { flattenSong } from '../js/game/song.js';
import { NOTES } from '../js/music/notes.js';

const limu = SONGS.find((s) => s.id === 'limu-limu-lima');

test('Limu, Limu, Lima has 34 notes and a final rest', () => {
  const items = flattenSong(limu);
  assert.equal(items.filter((i) => i.name !== 'rest').length, 34);
  assert.equal(items.at(-1).name, 'rest');
});

test('Limu, Limu, Lima starts MI SI SI LA and ends RE# FA# MI', () => {
  const names = flattenSong(limu).map((i) => i.name);
  assert.deepEqual(names.slice(0, 4), ['MI', 'SI', 'SI', 'LA']);
  assert.deepEqual(names.slice(-4), ['RE#', 'FA#', 'MI', 'rest']);
});

for (const song of SONGS) {
  test(`${song.id}: every bar fills the time signature`, () => {
    const [beats] = song.timeSignature;
    song.measures.forEach((m, i) => {
      const sum = m.reduce((s, [, d]) => s + d, 0);
      assert.equal(sum, beats, `bar ${i + 1}`);
    });
  });

  test(`${song.id}: every note is in the note table`, () => {
    for (const item of flattenSong(song)) {
      if (item.name !== 'rest') assert.ok(NOTES[item.name], item.name);
    }
  });
}

test('flattenSong gives beat positions and bar numbers', () => {
  const items = flattenSong({ measures: [[['MI', 0.5], ['SI', 0.5], ['LA', 1]], [['SI', 2]]] });
  assert.deepEqual(items, [
    { name: 'MI', duration: 0.5, beat: 0, measure: 0 },
    { name: 'SI', duration: 0.5, beat: 0.5, measure: 0 },
    { name: 'LA', duration: 1, beat: 1, measure: 0 },
    { name: 'SI', duration: 2, beat: 2, measure: 1 },
  ]);
});

import { buildRun, clampLoop } from '../js/game/song.js';

const twoBars = { measures: [[['MI', 0.5], ['SI', 0.5], ['LA', 1]], [['SI', 2]], [['DO', 1], ['rest', 1]]] };

test('without a loop the run is the whole song, once', () => {
  const run = buildRun(twoBars, null);
  assert.deepEqual(run.items.map((i) => i.name), ['MI', 'SI', 'LA', 'SI', 'DO', 'rest']);
  assert.equal(run.lapNotes, 5);
});

test('a loop repeats only its bars, keeps real bar numbers, and beats keep counting', () => {
  const run = buildRun(twoBars, { start: 2, length: 1 }, 3);
  assert.deepEqual(run.items.map((i) => i.name), ['SI', 'SI', 'SI']);
  assert.deepEqual(run.items.map((i) => i.measure), [1, 1, 1]);
  assert.deepEqual(run.items.map((i) => i.lap), [0, 1, 2]);
  assert.deepEqual(run.items.map((i) => i.beat), [0, 2, 4]);
  assert.equal(run.lapNotes, 1);
});

test('a two-bar loop goes 1 2 1 2 ...', () => {
  const run = buildRun(twoBars, { start: 1, length: 2 }, 2);
  assert.deepEqual(run.items.map((i) => i.name), ['MI', 'SI', 'LA', 'SI', 'MI', 'SI', 'LA', 'SI']);
});

test('clampLoop keeps the loop inside the song', () => {
  assert.deepEqual(clampLoop({ start: 11, length: 4 }, 12), { start: 9, length: 4 });
  assert.deepEqual(clampLoop({ start: 0, length: 2 }, 12), { start: 1, length: 2 });
  assert.deepEqual(clampLoop({ start: 3, length: 20 }, 12), { start: 1, length: 12 });
  assert.equal(clampLoop(null, 12), null);
});
