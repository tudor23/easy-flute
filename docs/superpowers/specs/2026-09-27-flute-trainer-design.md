# Easy Flute: recorder trainer — design

Date: 2026-09-27
Status: draft, awaiting review

## 1. Goal

A browser game that helps Vlad practise school songs on the soprano recorder (flauta dulce / flauta dolça). It listens through the microphone, shows which note to play and how to finger it, and moves on when he plays it.

The aim is **the right notes, in roughly the right rhythm**. A long note should sound clearly longer than a short one (about 2 : 1), but exact timing is not scored. Mistakes are never punished: a wrong note earns no points, and nothing else happens.

First song: *Limu, Limu, Lima* (Swedish traditional, 2/4, E minor).

### In scope

- Kid's name, remembered on the device.
- Spanish and English UI, with more languages addable as one file each.
- A song list (one song now), with songs defined as data files.
- Pitch detection, note-by-note progression, fingering diagrams, duration cues, a self-calibrating metronome whose tempo is remembered, and points and streaks.
- Works on laptop and tablet/phone browsers (Chrome, Safari, Firefox; latest versions).

### Out of scope (for now)

- Accounts, a server, or syncing between devices.
- High-score history and multiple player profiles.
- Free-play / single-note practice mode.
- Illustrated characters (emoji and SVG only).
- Upper-octave notes beyond what the song list needs. The fingering table still includes the full school chart.

## 2. Sources of truth

| What | Source | Notes |
|---|---|---|
| Song notes and durations | `docs/sample_song_notes.json`, checked against the printed staff in `docs/sample_song_sheet.jpg` and a clean score found online (`docs/limu-limu-lima-score.png`). Recording: https://www.youtube.com/watch?v=3w3x3lRLuIY&t=8s | Matches the staff bar by bar. The handwritten note list on `sample_song.jpg` and the `docs/specs.pdf` Gemini output are **wrong from bar 5 on** and must not be used. |
| Fingerings | `docs/sample_notes.jpg` (school chart "Les posicions a la flauta dolça") | **German fingering.** RE# is hand-drawn in pencil on the chart. |
| Look and feel | Approved mockup (`.superpowers/brainstorm/…/play-metronome.html`), inspired by `docs/Gemini_Generated_Image_n626pun626pun626.jpg` | Light background (not dark blue), so holes read clearly. |

## 3. Tech approach

Plain HTML, CSS and JavaScript ES modules, with no build step and no runtime dependencies.

- Served as static files. Development: `python3 -m http.server` (ES modules don't load from `file://`). Production: GitHub Pages (HTTPS is required for the microphone on tablets).
- Tests: Node's built-in `node --test`, with no npm packages. `package.json` only holds `"type": "module"` and a `test` script.
- One Google Font (Baloo 2), with a system-font fallback so the app works offline.

## 4. File layout

```
index.html                 single page; all screens are <section>s toggled by app.js
css/style.css
js/app.js                  boot, screen switching, wires modules together (DOM glue only)
js/storage.js              get/set name, language, tempo per song; every access in try/catch
js/i18n/index.js           t(key, vars), setLang(), list of languages
js/i18n/es.js              { langName: 'Español', strings: { … } }
js/i18n/en.js
js/music/notes.js          note table: sounding frequency + fingering per note
js/music/pitch.js          detectPitch(samples, sampleRate) → { freq, clarity } | null   (pure)
js/music/noteName.js       freqToNote(freq) → { note, cents } (nearest chromatic note)   (pure)
js/game/tracker.js         the per-note state machine (pure; fed frames with timestamps)
js/game/tempo.js           tempo calibration maths (pure)
js/game/score.js           points and streak rules (pure)
js/audio/mic.js            getUserMedia + AnalyserNode + frame loop → emits frames
js/audio/metronome.js      scheduled clicks on AudioContext time; exposes click times
js/ui/fingering.js         recorder SVG for a note (size, labels)
js/ui/playView.js          renders the play screen from game state
js/songs/index.js          list of songs [{ id, module }]
js/songs/limu-limu-lima.js
tests/*.test.js
```

The rule: everything under `music/` and `game/`, plus `storage.js` and `i18n/`, is pure or takes its dependencies (`localStorage`, clock) as parameters, so it can be tested in Node. DOM and Web Audio code stays in `app.js`, `audio/` and `ui/`.

## 5. Data formats

### 5.1 Song file

```js
// js/songs/limu-limu-lima.js
export default {
  id: 'limu-limu-lima',
  title: 'Limu, Limu, Lima',
  subtitle: { es: 'Canción tradicional sueca', en: 'Swedish traditional song' },
  timeSignature: [2, 4],
  beatUnit: 1,               // durations are in quarter-note beats
  measures: [
    [['MI', .5], ['SI', .5], ['SI', .5], ['LA', .5]],
    [['SI', 1], ['FA#', 1]],
    …
    [['MI', 1], ['rest', 1]],
  ],
};
```

Note names use the syllables on the school chart: `DO RE MI FA SOL LA SI`, with `#` or `b` suffixes, and `'` for the upper octave (`DO'`). The written octave is the low one (C4–B4). The app adds the recorder's octave transposition, so the note table holds **sounding** pitch. Rests appear in the rhythm lane but are never "played"; the game skips them automatically once the preceding note is done.

Limu, Limu, Lima: 12 bars, 34 notes plus a final rest, transcribed from `sample_song_notes.json`:

```
| MI SI SI LA | SI FA# | SOL MI SOL SOL | FA# MI |
| SOL LA SI | SOL FA# MI | SOL LA SI | SOL FA# MI |
| SOL LA SI | SOL FA# MI SOL | RE# FA# | MI (rest) |
```

(eighths are 0.5 and quarters are 1; see the JSON for per-note durations)

### 5.2 Note table (`notes.js`)

Soprano recorder, sounding one octave above written.

Fingering array: `[thumb, h1, h2, h3, h4, h5, h6, h7]`. `1` = covered, `0` = open, `0.5` = half. The layout follows the school chart: six holes on the body, plus a small seventh hole at the bottom.

| Note | Sounding | Hz | Fingering (German, from chart) |
|---|---|---|---|
| DO | C5 | 523.25 | 1 · 1 1 1 · 1 1 1 · 1 |
| RE | D5 | 587.33 | 1 · 1 1 1 · 1 1 1 · 0 |
| RE# | D#5 | 622.25 | 1 · 1 1 1 · 1 1 ½ · 0 *(pencil on chart; confirm with teacher)* |
| MI | E5 | 659.26 | 1 · 1 1 1 · 1 1 0 · 0 |
| FA | F5 | 698.46 | 1 · 1 1 1 · 1 0 0 · 0 |
| FA# | F#5 | 739.99 | 1 · 1 1 1 · 0 1 1 · 1 |
| SOL | G5 | 783.99 | 1 · 1 1 1 · 0 0 0 · 0 |
| LA | A5 | 880.00 | 1 · 1 1 0 · 0 0 0 · 0 |
| SIb | A#5 | 932.33 | 1 · 1 0 1 · 1 0 0 · 0 |
| SI | B5 | 987.77 | 1 · 1 0 0 · 0 0 0 · 0 |
| DO' | C6 | 1046.50 | 1 · 0 1 0 · 0 0 0 · 0 |
| RE' | D6 | 1174.66 | 0 · 0 1 0 · 0 0 0 · 0 |
| MI' | E6 | 1318.51 | ½ · 1 1 1 · 1 1 0 · 0 |
| FA' | F6 | 1396.91 | ½ · 1 1 1 · 1 0 0 · 0 |
| SOL' | G6 | 1567.98 | ½ · 1 1 1 · 0 0 0 · 0 |
| LA' | A6 | 1760.00 | ½ · 1 1 0 · 0 0 0 · 0 |

The implementation must re-check every row against the enlarged chart photo before shipping.

### 5.3 Language file

```js
// js/i18n/es.js
export default {
  code: 'es', name: 'Español',
  strings: {
    'welcome.askName': '¿Cómo te llamas?',
    'welcome.hello': '¡Hola, {name}!',
    'play.hear': 'Te oigo',
    …
  },
};
```

Adding a language means adding one file and one line in `i18n/index.js`. A test fails if any language is missing a key that `es.js` has. Default language: `navigator.language` if it's supported, otherwise Spanish. The choice is remembered.

## 6. Screens

All screens share a header with the app name and an ES | EN toggle.

1. **Welcome.** If no name is stored, it asks "¿Cómo te llamas?" (an input and a big button; empty names are rejected; names are trimmed and capped at 20 characters). If a name is stored, it greets them with "¡Hola, Vlad!" and goes straight to the song list.
2. **Songs.** Cards list title, subtitle and note count. A "¿No eres Vlad? Cambiar nombre" link at the bottom returns to Welcome.
3. **Play.** Detailed in §7.
4. **Finished.** "¡Muy bien, Vlad! 🎉", the score, notes hit first try (x / 34), and the "Otra vez" and "Canciones" buttons.

**Look.** Light sky-to-mint gradient background, chunky outlined pills and cards, a navy (`#1d2b53`) outline colour, orange for the current note and green for done. Sparkles and music-note emoji decorate the page. Buttons and hit targets are at least 48 px. The layout is responsive: cards wrap on narrow screens, the current card stays largest, and there's no horizontal scroll. Animations respect `prefers-reduced-motion`.

## 7. Play screen

Top to bottom:

- **Header:** Restart (↺) · song title · Pause (⏸).
- **HUD pills:**
  - 🎤 mic status with a live level meter
  - ⭐ points
  - 🔥 streak
  - 🥁 metronome, which shows either "Te escucho para coger tu ritmo…" with 3 progress dots, or "♩ = 72" with 2 pulsing beat dots and a 🔊/🔇 toggle, plus a small "🥁 nuevo ritmo" button
- **Progress bar:** notes done / total.
- **Rhythm lane (A):** a horizontal strip of blocks. A block's width is proportional to its duration (eighth = 1 unit, quarter = 2 units). There are bar lines every 2 beats, and rests appear as blank blocks. The current block fills in orange as the note is held. The lane scrolls so the current block stays in view.
- **Note belt (B), like an airport luggage belt.** Every note is a card (a suitcase), and a card's width is proportional to its duration. The belt only runs while the right note is sounding: its position is `current card + hold progress`. When the hold is complete the card has left the "play now" spot and the next one has arrived; stopping pauses the belt. Card size and opacity are interpolated by distance from the "play now" spot. The card states are:
  - **Done:** the last played note, small and green, "¡HECHO! ✓".
  - **Now:** large, orange, bobbing, "¡TOCA AHORA! 🎤". It shows the note name, a large recorder SVG, a beat block with "♪ corta" or "♩ larga", and a **hold meter**.
  - **Next:** "DESPUÉS", medium, with its recorder.
  - **After that:** "LUEGO", smaller, with its recorder.
  - A faded text trail of the next few notes follows (`→ SI ♩ → FA# ♩ → SOL ♪ …`).
- **Hint line:** "♪ SI corta — ¡respira y otra vez!" (repeated note), "Te oigo LA — busca SI…" (wrong note), and so on.
- **Legend:** filled = tapado (covered), ring = abierto (open), half = medio (half covered).

**Recorder SVG.** The drawing copies the school chart (`docs/sample_notes.jpg`) so Vlad sees the same picture as on paper. Vertical, mouthpiece at the top:

- Mouthpiece: a wider cream head with a short dark window line.
- Body: a straight cream tube.
- Holes 1, 2, 3: evenly spaced, same size.
- A **spacer** (a bigger gap, about 1.5× the normal spacing) between hole 3 and hole 4. This is where the left hand ends and the right hand starts.
- Holes 4, 5, 6: evenly spaced, same size as 1–3.
- Hole 7: **smaller** (about 60 % of the diameter), at the bottom of the body, placed off-centre towards the left edge as on the chart.
- Thumb hole: **outside the body, to the side, at the same height as hole 2**, as on the chart. It's the same size as the body holes, with a small "pulgar" / "thumb" label under it so it isn't mistaken for a front hole.

Covered holes are solid navy (`#1d2b53`), open holes are white with a navy ring, and half holes are half filled, with the bottom half navy. The card background is cream, never the page's blue, so the thumb hole's state is always readable. `fingering.js` produces this one shape at every size; only the scale changes.

**Mistakes.** No red backgrounds, shaking, buzzers or negative numbers. A wrong note switches the Now card's hint area to a calm blue dashed box saying "Te oigo **LA**. Busca **SI**", plus a fingering tip generated from the difference between the two fingerings (e.g. "levanta el dedo 2", lift finger 2).

## 8. Audio and detection

### 8.1 Microphone

`getUserMedia({ audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: false } })`.

- Noise suppression and automatic gain are off because they distort sustained tones.
- Echo cancellation is on to keep metronome clicks out of the input. This needs verifying on a real device; if it harms detection, turn it off and rely on §8.4.

`AnalyserNode` with `fftSize = 2048` is read every animation frame.

### 8.2 Pitch (`pitch.js`)

- YIN algorithm with threshold 0.15 and parabolic interpolation.
- Lag search limited to 450–1900 Hz, which covers DO to LA' with margin. That keeps it cheap (≈ 100 lags × 2048 samples).
- Returns `null` when the RMS level is below the noise gate or YIN finds no dip below the threshold.
- Noise gate: RMS 0.01 by default, auto-raised to 2 × the ambient RMS measured during the first 0.5 s after Start, while the screen says "Silencio un momento…".

### 8.3 Note naming (`noteName.js`)

The frequency maps to the nearest chromatic note (12-TET, A = 440), with `cents` offset. A reading within ±50 cents of a note counts as that note. This avoids the overlapping-range bug in the Gemini code; FA and FA# are simply different notes. A note is **stable** once the same name has been seen for ≥ 60 ms of consecutive frames.

### 8.4 Metronome clicks

Clicks are short, filtered noise bursts (≈ 15 ms), scheduled ahead on `AudioContext` time with a look-ahead scheduler. Beat 1 of each bar is louder. Pitch frames from 0–60 ms after each scheduled click are ignored.

## 9. Game rules (`tracker.js`, `score.js`)

The tracker receives frames `{ t, note | null, rms }` and holds the current index plus per-note state.

**Note on, note held.** The current note starts when the stable note equals the target. It completes when it has been held for:

```
required = max(0.20 s, 0.5 × duration × beatSeconds)
```

That is half of its written length, which is lenient on purpose (lowered from 60 % after testing showed choppy playing sat right at the threshold). Gaps under 80 ms inside a note (breath wobble) don't reset the hold. When the note completes, the card turns green, the lane moves on, and the next note becomes current. The player may keep holding; that's fine.

**Repeated notes (SI SI, SOL SOL).** After a note completes, the next note can only start after a **re-attack**: either ≥ 50 ms with no stable note, or the level dipping below 40 % of the previous note's peak RMS and rising again. Tonguing ("tu-tu") produces the dip. The hint says "¡respira y otra vez!".

**Wrong notes.** A stable note that isn't the target shows the soft hint and marks the current note as *missed first try*. The index does not move; the song waits.

**Stopped too early.** If the target note stops before `required`, the note is marked *missed first try* (no points), but the hold time so far is **kept**. Playing the note again continues from there (`resume` event), so the belt never moves backwards.

**Points (never subtracted).**

- +10 when a note completes without having been marked *missed first try*.
- +0 otherwise; the song still moves on once he gets it.
- 🔥 streak = consecutive +10 notes. A miss quietly resets it to 0 (no animation).
- There's a "¡GENIAL!" pop at streaks of 5, 10 and 20.
- No timing bonus: rhythm is guided by the hold rule, the metronome and the lane, not scored.

**Pause** stops the mic loop and the metronome. **Restart** resets the index, points and streak, but keeps the tempo. **Back** returns to Songs.

## 10. Tempo and metronome (`tempo.js`, `metronome.js`)

**Calibration.** Used when no tempo is saved for the song, or after "🥁 nuevo ritmo".

1. The metronome starts right away at the **default 55 BPM**, and the pill shows "♩ = 55 · Te escucho…" with 3 dots.
2. The start time of each of the first 4 completed notes is recorded as t₀…t₃, giving 3 gaps.
3. Each gap is divided by the written duration of the note it follows, giving one beat-length estimate per gap: `beat_k = (t_{k+1} − t_k) / duration_k`.
4. `beatSeconds = median(beat_1..3)`. It is then clamped to 40–120 BPM, i.e. 0.5–1.5 s per beat.
5. The tempo is saved and the metronome switches to it.

While calibrating, the hold rule uses the default tempo (55 BPM, about 1.09 s per beat). "🥁 nuevo ritmo" goes back to 55 and calibrates again.

**Persistence.** The tempo is stored per song in `localStorage` (`easyFlute.tempo.<songId>`, BPM). Next time the song opens, the saved tempo is used immediately: after a one-bar count-in (2 clicks) he starts playing, with no calibration. Restart keeps the tempo. "🥁 nuevo ritmo" deletes it and calibrates again on the next notes.

**Why the tempo matters without strict scoring.** It sets `beatSeconds`, which scales the hold time (so long notes need about twice the hold of short ones) and paces the clicks and beat dots. Starting exactly on a click is never required.

## 10b. Looping a section

- A loop bar sits under the progress bar with "🔁 Repetir", length buttons **Todo · 1 · 2 · 3 · 4 · 5 · 6** (bars) and "desde el compás [1–12]". "Todo" means the whole song once, no loop, and greys out the start picker.
- The loop is clamped to the song: start 12 with length 4 becomes bars 9–12.
- `buildRun(song, loop, laps)` lays the loop's bars out repeatedly (enough laps for about 200 notes). Items keep their real bar number and get a `lap`, and beats keep counting across laps so tempo calibration still works. The belt therefore brings bar 1 round again after bar 3 with no stop, and a "¡Vuelta N! 🔁" pop-up marks each lap.
- The progress bar shows progress within the current lap. Points keep adding up across laps.
- Changing the loop, pressing **Enter** or pressing Restart starts again from the top of the loop (or the song), keeping the tempo. Enter also starts the game from the start overlay and resumes from pause.
- The rhythm lane shows bar numbers.

## 11. Storage (`storage.js`)

| Key | Value |
|---|---|
| `easyFlute.name` | string |
| `easyFlute.lang` | `'es'` / `'en'` / … |
| `easyFlute.tempo.<songId>` | number (BPM) |

Every read and write is wrapped in try/catch. If storage is unavailable (private mode, blocked), the app still works and just forgets values between visits.

## 12. Errors and edge cases

| Situation | Behaviour |
|---|---|
| Mic permission denied | A friendly screen explains how to allow the mic (per browser), with a "Probar otra vez" (try again) button. No `alert()`. |
| No `getUserMedia` / not HTTPS | Message: open the app over HTTPS or from localhost. |
| No sound for 8 s while playing | Gentle hint: "¿Me oyes? Acerca la flauta al micrófono 🎤" ("Can you hear me? Bring the recorder closer to the mic"). |
| Tab hidden | Auto-pause. The Pause button resumes. |
| AudioContext suspended (iOS) | Created and resumed inside the Start tap. |
| Very high or low pitch (overblowing) | Treated as a wrong note: soft hint, no penalty. |

## 13. Testing

**Unit tests** (`node --test`):

- `pitch`: synthetic sines and "recorder-like" tones (fundamental plus decaying harmonics, plus noise) for every note in the table must land within ±10 cents. Silence and white noise must return `null`.
- `noteName`: boundaries at ±50 cents, and FA vs FA#.
- `tracker`: frame sequences for:
  - correct note held long enough
  - note released too early
  - wrong note then right note (+0)
  - SI SI with and without a re-attack
  - a breath wobble under 80 ms
  - a rest being skipped
  - song completion
- `tempo`: median, clamping, and eighth vs quarter normalisation.
- `score`: points, streak reset, milestone pops.
- `i18n`: every language has every key; `{name}` interpolation works.
- `storage`: works with a fake store and with a throwing store.
- Song data: every note name exists in the note table, and every bar sums to the time signature.

**Debug mode.** `?debug=1` adds a **fake mic**: a "Tocar por mí" (play it for me) button, or the space bar, which while held makes the app act as if the current note is being played correctly. It also shows the live Hz, note, cents, RMS and tracker state. It also adds keyboard keys that play a sine tone into the detector input instead of the mic: `a s d f g h j k` for DO…DO', plus `r` for RE# and `v` for FA#. This allows testing without a recorder, including with Chrome DevTools automation.

**Manual check before calling it done.** Play the whole song on a real soprano recorder on a laptop and a tablet. Confirm the SI SI and SOL SOL repeats, the calibrated tempo feeling natural, and the tempo being remembered after reloading.

## 14. Deployment

GitHub Pages from `main` (root), with an empty `.nojekyll` file. There's nothing to build.

## 15. Open questions

- RE# fingering is taken from the pencil drawing on the chart (hole 6 half, hole 7 open). Confirm with the teacher.
- Do echo cancellation settings help or hurt detection on Vlad's device? Decide during manual testing.
