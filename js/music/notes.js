// Soprano recorder, German fingering, copied from the school chart (docs/sample_notes.jpg).
// Frequencies are the sounding pitch: a soprano recorder sounds one octave above written.
// Fingering: [thumb, h1, h2, h3, h4, h5, h6, h7]; 1 = covered, 0 = open, 0.5 = half.
export const NOTES = {
  'DO':   { freq: 523.25,  fingering: [1, 1, 1, 1, 1, 1, 1, 1] },
  'RE':   { freq: 587.33,  fingering: [1, 1, 1, 1, 1, 1, 1, 0] },
  'RE#':  { freq: 622.25,  fingering: [1, 1, 1, 1, 1, 1, 0.5, 0] },
  'MI':   { freq: 659.26,  fingering: [1, 1, 1, 1, 1, 1, 0, 0] },
  'FA':   { freq: 698.46,  fingering: [1, 1, 1, 1, 1, 0, 0, 0] },
  'FA#':  { freq: 739.99,  fingering: [1, 1, 1, 1, 0, 1, 1, 1] },
  'SOL':  { freq: 783.99,  fingering: [1, 1, 1, 1, 0, 0, 0, 0] },
  'LA':   { freq: 880.00,  fingering: [1, 1, 1, 0, 0, 0, 0, 0] },
  'SIb':  { freq: 932.33,  fingering: [1, 1, 0, 1, 1, 0, 0, 0] },
  'SI':   { freq: 987.77,  fingering: [1, 1, 0, 0, 0, 0, 0, 0] },
  "DO'":  { freq: 1046.50, fingering: [1, 0, 1, 0, 0, 0, 0, 0] },
  "RE'":  { freq: 1174.66, fingering: [0, 0, 1, 0, 0, 0, 0, 0] },
  "MI'":  { freq: 1318.51, fingering: [0.5, 1, 1, 1, 1, 1, 0, 0] },
  "FA'":  { freq: 1396.91, fingering: [0.5, 1, 1, 1, 1, 0, 0, 0] },
  "SOL'": { freq: 1567.98, fingering: [0.5, 1, 1, 1, 0, 0, 0, 0] },
  "LA'":  { freq: 1760.00, fingering: [0.5, 1, 1, 0, 0, 0, 0, 0] },
};

const HOLE_LABELS = ['thumb', 1, 2, 3, 4, 5, 6, 7];

// What to change to get from one fingering to another.
export function fingeringDiff(from, to) {
  const diff = { cover: [], lift: [], half: [] };
  to.forEach((want, i) => {
    if (want === from[i]) return;
    const hole = HOLE_LABELS[i];
    if (want === 0.5) diff.half.push(hole);
    else if (want === 1) diff.cover.push(hole);
    else diff.lift.push(hole);
  });
  return diff;
}
