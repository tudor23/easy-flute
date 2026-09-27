export const CALIBRATION_NOTES = 4;
export const DEFAULT_BPM = 55;  // until Vlad's own tempo is known
export const MIN_BPM = 40;
export const MAX_BPM = 120;

export const beatToBpm = (beatSeconds) => 60 / beatSeconds;
export const bpmToBeat = (bpm) => 60 / bpm;

function median(values) {
  const s = [...values].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

// onsets: [{ t: seconds, beat: written position in beats }] for the first notes Vlad played.
// Each gap between two onsets, divided by its written length, estimates one beat.
export function estimateBeatSeconds(onsets) {
  if (onsets.length < CALIBRATION_NOTES) return null;
  const first = onsets.slice(0, CALIBRATION_NOTES);
  const estimates = [];
  for (let k = 0; k < first.length - 1; k++) {
    const beats = first[k + 1].beat - first[k].beat;
    if (beats > 0) estimates.push((first[k + 1].t - first[k].t) / beats);
  }
  if (!estimates.length) return null;
  const beat = median(estimates);
  return Math.min(bpmToBeat(MIN_BPM), Math.max(bpmToBeat(MAX_BPM), beat));
}
