import { isRest } from './song.js';

const DEFAULTS = {
  beatSeconds: 1,     // until the tempo is known
  stableSec: 0.06,    // a pitch must last this long to count as a note
  wrongSec: 0.15,     // a wrong note must last this long before we say anything
  wobbleSec: 0.08,    // gaps shorter than this inside a note are ignored
  gapSec: 0.05,       // silence that separates two identical notes
  dipRatio: 0.4,      // ...or a volume dip below 40% of the note's peak
  riseRatio: 0.7,     //    followed by a rise back above 70%
  minHold: 0.2,
  holdFraction: 0.5,  // hold half the written length at the current tempo
};

// Follows the song note by note. Fed one frame at a time: { t: seconds, note: name|null, rms }.
// Pure: no DOM, no audio, no clock of its own.
export function createTracker(items, options = {}) {
  const opt = { ...DEFAULTS, ...options };
  let beatSeconds = opt.beatSeconds;

  let index = nextPlayable(-1);
  let phase = index < 0 ? 'done' : 'waiting';
  let cand = { note: undefined, since: 0 };
  let floor = -Infinity;       // onsets can't be earlier than the last re-attack
  let holdStart = 0;           // start of the current stretch of the target note
  let heldBefore = 0;          // time already held in earlier stretches of this note
  let lastTargetT = 0;
  let peak = 0;
  let progress = 0;
  let missed = false;
  let heard = null;
  let tail = null;             // the note just completed, still sounding

  function nextPlayable(from) {
    for (let i = from + 1; i < items.length; i++) if (!isRest(items[i])) return i;
    return -1;
  }

  const required = () => Math.max(opt.minHold, opt.holdFraction * items[index].duration * beatSeconds);

  function updateTail({ t, note, rms }) {
    if (note === tail.note) {
      tail.gapStart = null;
      if (rms < opt.dipRatio * tail.peak) tail.dipped = true;
      else if (tail.dipped && rms > opt.riseRatio * tail.peak) {
        tail = null;
        floor = t;
        return false;
      } else if (!tail.dipped) tail.peak = Math.max(tail.peak, rms);
      return true; // still the old note: ignore this frame
    }
    if (tail.gapStart === null) tail.gapStart = t;
    if (t - tail.gapStart >= opt.gapSec) tail = null;
    return false;
  }

  function complete(events) {
    events.push({ type: 'complete', index, firstTry: !missed });
    tail = { note: items[index].name, peak, dipped: false, gapStart: null };
    index = nextPlayable(index);
    missed = false;
    heard = null;
    progress = 0;
    heldBefore = 0;
    if (index < 0) {
      phase = 'done';
      events.push({ type: 'done' });
    } else {
      phase = 'waiting';
    }
  }

  function update(frame) {
    if (phase === 'done') return [];
    const events = [];
    const { t, note, rms } = frame;

    if (note !== cand.note) cand = { note, since: t };
    if (tail && updateTail(frame)) return events;

    const since = Math.max(cand.since, floor);
    const stable = t - since >= opt.stableSec ? cand.note : undefined;
    const target = items[index].name;

    if (phase === 'waiting') {
      if (stable === target) {
        phase = 'holding';
        holdStart = since;
        lastTargetT = t;
        peak = Math.max(heldBefore ? peak : 0, rms);
        heard = null;
        events.push({ type: heldBefore ? 'resume' : 'start', index, t: since });
      } else if (stable && t - since >= opt.wrongSec && heard !== stable) {
        heard = stable;
        missed = true;
        events.push({ type: 'wrong', index, heard: stable });
      }
    }

    if (phase === 'holding') {
      if (note === target) {
        lastTargetT = t;
        peak = Math.max(peak, rms);
        const held = heldBefore + (t - holdStart);
        progress = Math.min(1, held / required());
        if (held >= required()) complete(events);
      } else if (t - lastTargetT > opt.wobbleSec) {
        // Stopped too early: no points for this note, but the progress so far is kept.
        heldBefore += lastTargetT - holdStart;
        phase = 'waiting';
        missed = true;
        events.push({ type: 'early', index });
      }
    }
    return events;
  }

  return {
    update,
    setBeatSeconds(s) { beatSeconds = s; },
    required: () => (index < 0 ? 0 : required()),
    state: () => ({ index, phase, progress, heard, missed }),
  };
}
