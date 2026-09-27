# Easy Flute Trainer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A browser recorder trainer that listens to Vlad play *Limu, Limu, Lima*, shows fingerings, and moves note by note (spec: `docs/superpowers/specs/2026-09-27-flute-trainer-design.md`).

**Architecture:** Static ES modules with no build step. Pure logic (`js/music`, `js/game`, `js/storage.js`, `js/i18n`) is unit-tested with `node --test`. Browser glue (`js/app.js`, `js/audio`, `js/ui`) is tested manually and through `?debug=1`.

**Tech Stack:** HTML, CSS, vanilla JS (ES2022 modules), Web Audio API, Node 22 test runner.

> Plan kept lean at the user's request ("I wanna test it"). Each task lists files, interfaces and test cases; the code is written directly in the repo.

## Global Constraints

- No runtime dependencies, no build step; served as static files (`python3 -m http.server`, GitHub Pages).
- Soprano recorder sounds one octave above written: DO = 523.25 Hz … SI = 987.77 Hz.
- German fingerings from `docs/sample_notes.jpg`; array `[thumb, h1..h7]`, with 1 = covered, 0 = open, 0.5 = half.
- Recorder SVG: 3 holes · spacer (1.5× gap) · 3 holes · smaller hole 7 (bottom, left) · thumb on the side level with hole 2, on a cream background.
- No red and no penalties: wrong note = +0 and a soft blue hint.
- Tempo saved per song in `localStorage` key `easyFlute.tempo.<songId>`; name `easyFlute.name`; language `easyFlute.lang`.
- UI strings in Spanish and English; adding a language = one file plus one line.

---

### Task 1: Scaffold + music core
**Files:** `package.json`, `js/music/notes.js`, `js/music/noteName.js`, `js/music/pitch.js`, `tests/notes.test.js`, `tests/pitch.test.js`
**Produces:**
- `NOTES: Record<name, {freq, fingering:number[8]}>`
- `fingeringDiff(from, to) → {cover:[hole], lift:[hole], half:[hole]}` (hole = `'thumb'|1..7`)
- `freqToNote(freq) → {name, cents, midi}`
- `rms(buf)`
- `detectPitch(buf, sampleRate, {minFreq, maxFreq, threshold, gate}) → {freq, clarity, rms} | null`

**Tests:**
- every note's sine and "recorder-like" tone lands within ±10 cents
- silence and white noise return null
- ±50 cent boundaries
- FA vs FA#
- fingeringDiff LA→SI lifts hole 2

### Task 2: Song data + tempo + score
**Files:** `js/songs/limu-limu-lima.js`, `js/songs/index.js`, `js/game/song.js`, `js/game/tempo.js`, `js/game/score.js`, tests
**Produces:**
- `flattenSong(song) → [{name, duration, beat, measure}]`
- `estimateBeatSeconds([{t, beat}]) → seconds | null` (needs 4 onsets; median; clamped to 40–120 BPM)
- `bpmToBeat`, `beatToBpm`
- `createScore()`
- `scoreNote(state, firstTry) → {state, milestone}`

**Tests:**
- 34 notes plus a rest
- every bar sums to 2 beats
- every name is in NOTES
- median and clamping
- +10 / +0, streak reset, milestones at 5/10/20

### Task 3: Tracker
**Files:** `js/game/tracker.js`, `tests/tracker.test.js`
**Produces:** `createTracker(items, {beatSeconds})` with:
- `update({t, note, rms}) → events[]`, where events are `start{index,t}`, `complete{index,firstTry}`, `wrong{index,heard}`, `early{index}` and `done`
- `setBeatSeconds(s)`
- `state()` → `{index, progress, phase, heard, missed}`

**Tests:**
- correct hold
- early release
- wrong-then-right
- SI SI with and without a re-attack
- a <80 ms wobble
- tail of the previous note not counted as wrong
- the rest skipped
- done

### Task 4: Storage + i18n
**Files:** `js/storage.js`, `js/i18n/index.js`, `js/i18n/es.js`, `js/i18n/en.js`, tests
**Produces:**
- `createStorage(backend)` with `getName/setName/getLang/setLang/getTempo(id)/setTempo(id,bpm)/clearTempo(id)`
- `t(key, vars)`, `setLang(code)`, `getLang()`, `LANGUAGES`, `pickLang(saved, navigatorLang)`

**Tests:** key parity, interpolation, a throwing backend.

### Task 5: Audio (browser)
**Files:** `js/audio/mic.js`, `js/audio/metronome.js`
**Produces:**
- `openMic(ctx) → {analyser, stop()}`
- `createDebugSynth(ctx, analyser)`
- `createMetronome(ctx)` with `{start(bpm, beatsPerBar), stop(), setMuted(b), isSuppressed(t), beatInfo(t)}`

### Task 6: UI + app
**Files:** `index.html`, `css/style.css`, `js/ui/fingering.js`, `js/ui/playView.js`, `js/app.js`, `.nojekyll`
Screens: welcome, songs, play, finished, and mic-error. Game loop wiring, calibration, persistence, auto-pause, no-sound hint, debug panel.

### Task 7: Verify
- `npm test` passes.
- Load in the browser with `?debug=1` and play the song with the keyboard synth.
- Check phone-width layout.
- Hand over for testing with a real recorder.
