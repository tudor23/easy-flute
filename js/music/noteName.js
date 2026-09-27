const PITCH_CLASSES = ['DO', 'DO#', 'RE', 'RE#', 'MI', 'FA', 'FA#', 'SOL', 'SOL#', 'LA', 'SIb', 'SI'];

// Sounding octave 5 (C5-B5) is the recorder's low octave and gets no marker,
// matching the school chart: DO..SI, then DO', RE'... above, and "," below.
function octaveMarker(octave) {
  if (octave >= 5) return "'".repeat(octave - 5);
  return ','.repeat(5 - octave);
}

export function freqToNote(freq) {
  const exact = 69 + 12 * Math.log2(freq / 440);
  const midi = Math.round(exact);
  const octave = Math.floor(midi / 12) - 1;
  return {
    name: PITCH_CLASSES[midi % 12] + octaveMarker(octave),
    cents: (exact - midi) * 100,
    midi,
  };
}
