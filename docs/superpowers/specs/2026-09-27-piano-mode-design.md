# Easy Flute: piano mode — design

Date: 2026-09-27
Status: approved, implemented
Builds on: `2026-09-27-flute-trainer-design.md`

## 1. Goal

Let Vlad play the same songs, one note at a time, on a small electronic keyboard (RockJam RJ761, 61 keys), with a Synthesia / Guitar Hero style screen: notes fall down lanes onto a drawn keyboard.

Same spirit as the flute: the music only moves when he plays the right note, mistakes are never punished, and rhythm is shown rather than scored.

### Decisions (from brainstorming)

| Question | Decision |
|---|---|
| How does the app hear the piano? | **Microphone**, the same as the flute (no USB/MIDI). |
| Which octave counts? | **Only the written octave.** The song sits just above middle DO (C4–B4). Another octave gets a gentle hint and no advance. |
| What happens when a note reaches the keys? | **The notes wait** until the right key is played, then flow on at the metronome tempo. |
| Instrument choice | A new start step with two cards, 🎵 Flauta and 🎹 Piano; remembered; switchable from the song list. |

### Out of scope

- USB/MIDI input.
- Chords or two hands.
- Finger numbers.
- A play-along mode where notes don't wait (could come later as a toggle).

## 2. Instruments as data

A new folder `js/instruments/` holds one small file per instrument, so the rest of the app just asks "what does this instrument need?":

```js
// js/instruments/piano.js
export default {
  id: 'piano',
  emoji: '🎹',
  view: 'roll',                  // 'belt' (flute) or 'roll' (piano)
  pitch: { minFreq: 120, maxFreq: 1100 },
  nameShift: 2,                  // multiply Hz by this before naming the note
  tracker: { holdFraction: 0, minHold: 0.08 }, // counts when struck
};
```

**Naming notes.** `freqToNote` names sounding octave 5 as the plain names (DO…SI), because a soprano recorder sounds an octave above written, so the flute uses `nameShift: 1`. On the piano the written pitch *is* the sounding pitch (MI = E4, 329.6 Hz), so the piano uses `nameShift: 2`: E4 × 2 is named "MI". The song files don't change: `MI` means E4 on the piano and E5 on the recorder.

**Tracker.** It is reused as-is with different options. `holdFraction: 0, minHold: 0.08` means a note counts about 0.15 s after it's struck (60 ms to be sure of the pitch, plus 80 ms). Repeated notes (SI SI) still need a new strike. A piano note fades and a new strike jumps back up, which the existing volume dip-and-rise rule already detects.

**Tempo.** Saved separately per instrument: `easyFlute.tempo.<songId>` stays for the flute, and the piano uses `easyFlute.tempo.piano.<songId>`. Calibration is unchanged.

## 3. Flow

1. **Welcome** (name) → 2. **Instrument** (new: two big cards) → 3. **Songs** → 4. **Play**.

- The instrument is stored in `easyFlute.instrument`. Once chosen, later visits go straight to Songs.
- The Songs screen shows the current instrument with a "cambiar" (change) link.
- The debug keyboard synth plays the piano pitches (C4 octave) when the piano is selected.

## 4. Piano play screen

Shared with the flute: header, HUD (mic, points, streak, metronome), progress bar, loop bar, hint box, fake-mic button. Hidden for the piano: the rhythm lane and the belt (and the hole legend).

**The roll.** It is drawn on a `<canvas>` so it runs smoothly at 60 fps:

- **Lanes** run above each key; alternate white-key lanes are shaded. Black-key lanes are narrower and sit over the black keys.
- **Notes** are rounded bars in their key's lane, with the note name written near the bottom of the bar:
  - The bar is as tall as the note is long, at a fixed px per beat.
  - Blue = short (♪), orange = long (♩), matching the flute belt.
  - The current note is bright orange with a glow. Played notes turn green and keep falling below the line, fading out.
- **Beat and bar lines** go across the lanes (bar lines thicker, with the bar number), and they scroll with the notes.
- **The hit line** is a pink line just above the keys.
- **The keyboard** is drawn with solfège names on the white keys and small names on the black keys. Middle DO has a dot.
  - The current target key glows orange.
  - The key being heard lights up: green if it's right, blue if it's wrong.
- **Keyboard range.** It runs from the DO at or below the song's lowest note to the song's highest note plus two white keys, with at least 10 white keys. For Limu, Limu, Lima that's DO–MI' (C4–E5) with the black keys.

**Motion ("wait mode").**

- The roll has a position `P` in beats: the beat that is at the hit line.
- The target is `T`, the beat of the tracker's current note.
- `P` moves towards `T` at the tempo (1 beat per `beatSeconds`) and never passes it. So:
  - While waiting, `P = T`: the current note sits on the line.
  - When he plays it, the tracker moves on and `T` jumps to the next note's beat. `P` then flows through the played note's length at the tempo and stops at the next note.
  - Rests flow past the same way.
- If he plays ahead and `T − P` is more than one beat, `P` moves at double speed to catch up.

**Hints.**

- A wrong note: "Te oigo **RE**. Busca **MI**" (I hear RE, look for MI), and the heard key lights blue.
- The right note in the wrong octave: "Te oigo **MI**, pero más agudo: busca el MI marcado 👇" (I hear MI but higher, look for the marked MI), or "más grave" (lower). The octave is told apart by the name markers: `MI'` is higher, `MI,` is lower.

## 5. Files

| File | Change |
|---|---|
| `js/instruments/flute.js`, `piano.js`, `index.js` | new: instrument data |
| `js/music/keyboard.js` | new: key layout (which keys, their x position, white or black) for a range. Pure and tested. |
| `js/ui/rollView.js` | new: the canvas roll and keyboard; same interface as `playView` where it overlaps (showIndex, hints, setScore, setTempo, setLevel…) |
| `js/game/roll.js` | new: the wait-mode position maths (`advance(P, T, dt, beatSeconds)`). Pure and tested. |
| `js/music/noteName.js` | `freqToNote(freq, shift)`; plus `sameNoteOtherOctave(heard, target) → 'up' \| 'down' \| null` |
| `js/storage.js` | `getInstrument / setInstrument`; tempo key per instrument |
| `js/app.js` | instrument screen, pick view by instrument, pass pitch range, shift and tracker options |
| `index.html`, `css/style.css`, `i18n/*` | instrument screen, roll container, new strings |

## 6. Testing

**Unit tests:**
- `freqToNote` with a shift (E4 × 2 → "MI"; E5 → "MI'"; E3 → "MI,").
- `sameNoteOtherOctave`.
- The keyboard layout: the range for Limu is C4–E5, there are 10 white keys, and RE♯ is black and sits between RE and MI.
- Roll `advance`: waits at T, flows at tempo, catches up at double speed, never overshoots.
- Tracker with the piano options: a strike completes in about 0.15 s; SI SI needs two strikes.
- Pitch detection of piano-like tones (strong harmonics, fading) for C4–E5, within ±10 cents and the right octave.

**Browser:**
- A playthrough with the fake mic (space) and the debug keys.
- A layout-stability check.
- Screenshots at 2560 and 1400 wide.

**Real test:** Vlad on the RJ761 with the laptop microphone. Check that octaves are recognised correctly, that the keyboard's own speaker doesn't confuse the detection, and that the metronome doesn't either.

## 7. Risks

- **Octave errors on piano tones.** YIN can lock onto a harmonic. This is mitigated by the pitch range, and checked with piano-like test tones and the real keyboard. If needed, prefer the lower candidate when two YIN dips are close.
- **Electronic keyboard voices.** Some voices (organ, strings) don't fade, so a repeated note may not dip. Default to the keyboard's piano voice. The existing silence-gap rule also works if he lifts the key.
