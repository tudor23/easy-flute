// Turns a song's bars into one flat list, with each item's start position in beats.
export function flattenSong(song) {
  const items = [];
  let beat = 0;
  song.measures.forEach((measure, m) => {
    for (const [name, duration] of measure) {
      items.push({ name, duration, beat, measure: m });
      beat += duration;
    }
  });
  return items;
}

export const isRest = (item) => item.name === 'rest';

// Keeps a loop of whole bars inside the song (bars are numbered from 1).
export function clampLoop(loop, measureCount) {
  if (!loop) return null;
  const length = Math.max(1, Math.min(loop.length, measureCount));
  const start = Math.max(1, Math.min(loop.start, measureCount - length + 1));
  return { start, length };
}

// What gets played: the whole song once, or the loop's bars repeated `laps` times.
// Items keep their real bar number (for the lane), get a lap number, and beats keep
// counting across laps so the tempo maths still works.
export function buildRun(song, loop, laps = 1) {
  const items = flattenSong(song).map((item) => ({ ...item, lap: 0 }));
  const lapNotes = (list) => list.filter((i) => !isRest(i)).length;
  if (!loop) return { items, lapNotes: lapNotes(items) };

  const first = loop.start - 1;
  const bars = items.filter((i) => i.measure >= first && i.measure < first + loop.length);
  const lapBeats = bars.reduce((sum, i) => sum + i.duration, 0);
  const offset = bars[0].beat;
  const run = [];
  for (let lap = 0; lap < laps; lap++) {
    for (const item of bars) run.push({ ...item, lap, beat: item.beat - offset + lap * lapBeats });
  }
  return { items: run, lapNotes: lapNotes(bars) };
}
