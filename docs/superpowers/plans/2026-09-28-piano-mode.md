# Piano Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a piano mode with a Synthesia-style falling-notes roll (spec: `docs/superpowers/specs/2026-09-27-piano-mode-design.md`).

**Architecture:** Instruments become data (`js/instruments/`). Pure logic (note naming with a shift, keyboard layout, roll motion) is unit-tested. The roll is a canvas view with the same interface as the flute play view.

**Tech Stack:** Vanilla ES modules, Canvas 2D, Web Audio, `node --test`.

## Global Constraints

- The song files don't change: `MI` = E4 on the piano, E5 on the recorder.
- Only the written octave counts on the piano; another octave → hint, no advance.
- Notes wait for the player; after a strike the roll flows at the tempo.
- Tempo keys: `easyFlute.tempo.<id>` (flute, unchanged), `easyFlute.tempo.piano.<id>`.
- No red, no penalties.

---

### Task 1: Note naming for instruments
- [ ] Tests: `freqToNote(329.63, 2).name === 'MI'`; `659.26 ×2 → "MI'"`; `164.81 ×2 → "MI,"`; `sameNoteOtherOctave("MI'", 'MI') === 'up'`, `("MI,", 'MI') === 'down'`, `('RE', 'MI') === null`.
- [ ] Implement in `js/music/noteName.js`.

### Task 2: Keyboard layout — `js/music/keyboard.js`
- [ ] Tests: `keyboardFor(['MI','RE#','SI'])` → from C4 to E5, 10 white keys, and RE# is black, sitting between RE and MI.
- [ ] Implement `keyboardFor(names) → { keys: [{name, midi, black, x, w}], whiteCount }`.

### Task 3: Roll motion — `js/game/roll.js`
- [ ] Tests: `advance(P, T, dt, beatSeconds)` never passes T; moves `dt / beatSeconds` beats; goes twice as fast when more than 1 beat behind.
- [ ] Implement.

### Task 4: Instruments + storage
- [ ] Tests: the piano tracker options complete a strike in under 0.2 s; SI SI needs two strikes; storage keeps the instrument and a per-instrument tempo; piano-like tones C4–E5 are detected within ±10 cents in the right octave.
- [ ] `js/instruments/{flute,piano,index}.js`; `storage.getInstrument/setInstrument`, and `getTempo(id, instrument)`.

### Task 5: Roll view — `js/ui/rollView.js`
- [ ] Canvas: lanes, notes, beat and bar lines, hit line, keyboard, target and heard keys.
- [ ] Same methods as playView: `setSong`, `showIndex`, `setHold`, `defaultHint`, `wrongHint`, `earlyHint`, `messageHint`, `setScore`, `setLevel`, `setTempo`, `setBeat`, `popup`; plus `setHeard(name)` and `tick(now)`.

### Task 6: App wiring
- [ ] Instrument screen; instrument on the songs screen; view switch; per-instrument pitch range, shift, tracker options, tempo and debug keys; octave hint; i18n; CSS.

### Task 7: Verify
- [ ] `npm test`; browser playthrough with the fake mic; layout stability; screenshots at 2560 and 1400; the flute still works.
