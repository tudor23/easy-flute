// Soprano recorder: sounds an octave above written, notes are held, belt view.
export default {
  id: 'flute',
  emoji: '🎵',
  view: 'belt',
  pitch: { minFreq: 450, maxFreq: 1900 },
  nameShift: 1,
  tracker: {},
  // debug keyboard synth: written note -> Hz to play
  synthShift: 1,
};
