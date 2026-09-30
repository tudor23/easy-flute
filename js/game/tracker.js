import { isRest } from './song.js';

const DEFAULTS = {
  beatSeconds: 1,     // until the tempo is known
  stableSec: 0.06,    // a pitch must last this long to count as a note
  wrongSec: 0.15,     // a wrong note must last this long before we say anything
  wrongStreakSec: 0.3, // ...and this long before it counts against the note (mic grace)
  wobbleSec: 0.08,    // gaps shorter than this inside a note are ignored
  gapSec: 0.05,       // silence that separates two identical notes
  dipRatio: 0.4,      // ...or a volume dip below 40% of the note's peak
  riseRatio: 0.7,     //    followed by a rise back above 70%
  minHold: 0.2,
  holdFraction: 0.5,  // hold half the written length at the current tempo
  lengthMin: 0.7,     // the right length: 70%..150% of the written length
  lengthMax: 1.5,
};

// Follows the song note by note. Fed one frame at a time: { t: seconds, note: name|null, rms }.
// Pure: no DOM, no audio, no clock of its own.
// Events: start/resume, wrong, early, complete { rightNote } when the note is found and the
// song moves on, released { held, lengthOk } when that note stops sounding (or runs past
// lengthMax), and done after the last note has been released.
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
  let wrongNote = false;       // a wrong note (longer than wrongStreakSec) came first
  let cutShort = false;        // stopped before it was held long enough, then started again
  let heard = null;
  let tail = null;             // the note just completed, still sounding

  function nextPlayable(from) {
    for (let i = from + 1; i < items.length; i++) if (!isRest(items[i])) return i;
    return -1;
  }

  const required = () => Math.max(opt.minHold, opt.holdFraction * items[index].duration * beatSeconds);

  // Judges the length of the tail note once, when it ends at `end` (or runs too long).
  function release(end, events) {
    if (tail.judged) return;
    tail.judged = true;
    const held = end + tail.base;
    const written = items[tail.index].duration * beatSeconds;
    const short = tail.cutShort || held < opt.lengthMin * written;
    const long = !short && held > opt.lengthMax * written;
    const too = short ? 'short' : long ? 'long' : null;
    events.push({ type: 'released', index: tail.index, held, lengthOk: !too, too });
  }

  function updateTail({ t, note, rms }, events) {
    if (note === tail.note) {
      tail.gapStart = null;
      if (t + tail.base > opt.lengthMax * items[tail.index].duration * beatSeconds) release(t, events);
      if (rms < opt.dipRatio * tail.peak) {
        if (!tail.dipped) tail.dipT = t;
        tail.dipped = true;
      } else if (tail.dipped && rms > opt.riseRatio * tail.peak) {
        release(tail.dipT, events);
        tail = null;
        floor = t;
        return false;
      } else if (!tail.dipped) tail.peak = Math.max(tail.peak, rms);
      return true; // still the old note: ignore this frame
    }
    if (tail.gapStart === null) tail.gapStart = t;
    if (t - tail.gapStart >= opt.gapSec) {
      release(tail.gapStart, events);
      tail = null;
    }
    return false;
  }

  function complete(events) {
    events.push({ type: 'complete', index, rightNote: !wrongNote });
    tail = {
      index, note: items[index].name, peak, dipped: false, dipT: 0, gapStart: null,
      base: heldBefore - holdStart, cutShort, judged: false,
    };
    index = nextPlayable(index);
    wrongNote = false;
    cutShort = false;
    heard = null;
    progress = 0;
    heldBefore = 0;
    // after the last note, wait until it stops sounding so its length can be judged
    phase = index < 0 ? 'finishing' : 'waiting';
  }

  function update(frame) {
    if (phase === 'done') return [];
    const events = [];
    const { t, note, rms } = frame;

    if (note !== cand.note) cand = { note, since: t };
    const inTail = tail && updateTail(frame, events);
    if (phase === 'finishing') {
      if (!tail) {
        phase = 'done';
        events.push({ type: 'done' });
      }
      return events;
    }
    if (inTail) return events;

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
      } else if (stable && t - since >= opt.wrongSec) {
        if (heard !== stable) {
          heard = stable;
          events.push({ type: 'wrong', index, heard: stable });
        }
        if (t - since >= opt.wrongStreakSec) wrongNote = true;
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
        // Stopped too early: the length will count as wrong, but the progress so far is kept.
        heldBefore += lastTargetT - holdStart;
        phase = 'waiting';
        cutShort = true;
        events.push({ type: 'early', index });
      }
    }
    return events;
  }

  return {
    update,
    setBeatSeconds(s) { beatSeconds = s; },
    required: () => (index < 0 ? 0 : required()),
    state: () => ({ index, phase, progress, heard, wrongNote, cutShort }),
  };
}
