import { PITCH_CLASSES } from './noteName.js';

const BLACK = new Set([1, 3, 6, 8, 10]);
const BLACK_WIDTH = 0.6; // in white-key widths
const MIN_WHITES = 10;
const EXTRA_WHITES = 2;  // white keys shown above the song's highest note

// Piano: the plain names are the octave starting at middle C (DO = 60), ' is one up, , one down.
export function writtenMidi(name) {
  const base = name.replace(/[',]/g, '');
  const up = (name.match(/'/g) || []).length - (name.match(/,/g) || []).length;
  return 60 + 12 * up + PITCH_CLASSES.indexOf(base);
}

function nameOf(midi) {
  const octave = Math.floor(midi / 12) - 5;
  return PITCH_CLASSES[midi % 12] + (octave >= 0 ? "'".repeat(octave) : ','.repeat(-octave));
}

// The keys to draw for a song: from the DO at or below its lowest note to two white keys past
// its highest, at least MIN_WHITES wide. x and w are in white-key widths.
export function keyboardFor(names) {
  const midis = names.map(writtenMidi);
  const lo = Math.min(...midis);
  const hi = Math.max(...midis);
  const keys = [];
  let whites = 0;
  let extra = 0;
  for (let m = lo - (lo % 12); ; m++) {
    const black = BLACK.has(m % 12);
    if (black) {
      keys.push({ name: nameOf(m), midi: m, black, x: whites - BLACK_WIDTH / 2, w: BLACK_WIDTH });
      continue;
    }
    keys.push({ name: nameOf(m), midi: m, black, x: whites, w: 1 });
    whites++;
    if (m > hi) extra++;
    if (m >= hi && extra >= EXTRA_WHITES && whites >= MIN_WHITES) break;
  }
  return { keys, whiteCount: whites };
}
