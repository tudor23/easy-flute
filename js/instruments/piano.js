// Piano / keyboard: written pitch = sounding pitch (MI = E4), a note counts when struck,
// Synthesia-style falling-notes view.
export default {
  id: 'piano',
  emoji: '🎹',
  view: 'roll',
  pitch: { minFreq: 120, maxFreq: 1100 },
  nameShift: 2,
  tracker: { holdFraction: 0, minHold: 0.08 },
  synthShift: 0.5,
};
