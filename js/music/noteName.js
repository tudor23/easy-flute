export const PITCH_CLASSES = ['DO', 'DO#', 'RE', 'RE#', 'MI', 'FA', 'FA#', 'SOL', 'SOL#', 'LA', 'SIb', 'SI'];

// Sounding octave 5 (C5-B5) is the recorder's low octave and gets no marker,
// matching the school chart: DO..SI, then DO', RE'... above, and "," below.
function octaveMarker(octave) {
  if (octave >= 5) return "'".repeat(octave - 5);
  return ','.repeat(5 - octave);
}

// shift: multiply the frequency before naming. The recorder sounds an octave above written
// (shift 1: E5 is "MI"); on the piano written = sounding (shift 2: E4 is "MI").
export function freqToNote(freq, shift = 1) {
  const exact = 69 + 12 * Math.log2((freq * shift) / 440);
  const midi = Math.round(exact);
  const octave = Math.floor(midi / 12) - 1;
  return {
    name: PITCH_CLASSES[midi % 12] + octaveMarker(octave),
    cents: (exact - midi) * 100,
    midi,
  };
}

const octaveOf = (name) => (name.match(/'/g) || []).length - (name.match(/,/g) || []).length;
const baseOf = (name) => name.replace(/[',]/g, '');

// Same note, different octave: 'up' if heard is higher than target, 'down' if lower.
export function sameNoteOtherOctave(heard, target) {
  if (!heard || !target || baseOf(heard) !== baseOf(target)) return null;
  const d = octaveOf(heard) - octaveOf(target);
  if (!d) return null;
  return d > 0 ? 'up' : 'down';
}
