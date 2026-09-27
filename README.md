# Easy Flute 🎵

A free browser game that helps children practise the **soprano recorder** (flauta dulce / flauta dolça). It listens through the microphone, shows how to finger each note, and moves the song along like a conveyor belt while the child plays the right note.

**Try it:** <https://tudor23.github.io/easy-flute/>

Nothing to install, and no account. Everything runs in the browser and no sound is ever sent anywhere.

## How it works

1. Type the player's name and pick a song.
2. Tap **¡Empezar!** / **Start!** and allow the microphone.
3. Each note is a card on a belt. The card in the middle (**¡AHORA!** / **NOW!**) shows the recorder with the holes to cover: filled = covered, ring = open, half = half covered, and the thumb hole on the side.
4. Play the note and **hold it**. The belt moves while the right note sounds. Short notes (♪) need a short hold, long notes (♩) about twice as long.
5. A wrong note is never punished: the app says which note it heard and which holes to change, and waits.

Other things on the play screen:

- **Metronome**: starts at 55 BPM, learns the child's own speed from the first 4 notes, and remembers it for next time. **nuevo ritmo** / **new rhythm** makes it learn again. 🔊 mutes it.
- **Loop**: repeat 1–6 bars, starting at any bar. **Enter** starts the loop again.
- **Bar numbers**: on the rhythm lane at the top, on the belt, and on the first card of each bar.
- **Points**: +10 for a note right on the first try. Points are never taken away.

### Testing without a recorder

Open <https://tudor23.github.io/easy-flute/?debug=1>. It shows what the microphone hears (Hz, note, cents), and adds a **"play it for me"** button: hold it, or hold the **space bar**, and the app acts as if the current note is being played correctly. The keys `a s r d f v g h j k` also play DO RE RE# MI FA FA# SOL LA SI DO' through the speakers.

### Tips

- Use a recent **Chrome, Safari or Firefox**.
- The microphone only works over `https://` or on `localhost`, never from a file opened directly.
- A quiet room helps. Keep the recorder about 30–50 cm from the microphone.
- For repeated notes (SI SI), take a breath or tongue ("tu") between them, otherwise they count as one long note.

## Run it on your computer

There is no build step and no dependencies. You only need Python (for a tiny local web server) and Node.js 20+ (only for the tests).

```bash
git clone https://github.com/tudor23/easy-flute.git
cd easy-flute
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

To run the tests:

```bash
npm test
```

## Adding a song

Songs are small JavaScript files in [`js/songs/`](js/songs/). To add one:

1. Copy [`js/songs/limu-limu-lima.js`](js/songs/limu-limu-lima.js) to a new file, e.g. `js/songs/frere-jacques.js`.
2. Fill it in:

   ```js
   export default {
     id: 'frere-jacques',                 // unique, lowercase, used to remember the tempo
     title: 'Frère Jacques',
     subtitle: { es: 'Canción tradicional francesa', en: 'French traditional song' },
     timeSignature: [4, 4],               // beats per bar, beat unit
     video: 'https://www.youtube.com/…',  // optional: a recording to listen to
     measures: [
       [['DO', 1], ['RE', 1], ['MI', 1], ['DO', 1]],   // bar 1
       [['DO', 1], ['RE', 1], ['MI', 1], ['DO', 1]],   // bar 2
       [['MI', 1], ['FA', 1], ['SOL', 2]],             // bar 3
       // …
     ],
   };
   ```

   - Each bar is a list of `[note, length]`.
   - **Lengths are in beats (a quarter note ♩ = 1):** eighth ♪ = `0.5`, quarter ♩ = `1`, dotted quarter = `1.5`, half 𝅗𝅥 = `2`. Notes shorter than an eighth aren't supported. Whole notes (`4`) work, but their card is very wide.
   - Use `'rest'` for a rest, e.g. `['rest', 1]`.
   - The notes in each bar must add up to the time signature (4 beats in 4/4, 2 in 2/4…).

3. List it in [`js/songs/index.js`](js/songs/index.js):

   ```js
   import limu from './limu-limu-lima.js';
   import frereJacques from './frere-jacques.js';

   export const SONGS = [limu, frereJacques];
   ```

4. Run `npm test`. The tests check every song automatically: every bar adds up to its time signature, and every note name exists.

### Note names

Write notes as they appear on the sheet music, using the solfège names from the school chart:

| Octave | Note names |
| --- | --- |
| Low | `DO` `RE` `RE#` `MI` `FA` `FA#` `SOL` `LA` `SIb` `SI` |
| High | `DO'` `RE'` `MI'` `FA'` `SOL'` `LA'` |

Check the key signature: if the sheet has a ♯ on the F line at the start of each line (like Limu, Limu, Lima), **every** FA in the song is `FA#`.

The written note is enough. A soprano recorder sounds one octave higher than written, and the app accounts for that.

A note that isn't in the table yet (e.g. `DO#`) needs a line in [`js/music/notes.js`](js/music/notes.js) with its frequency and fingering. The fingerings there are the **German** system used on the school chart. If your school uses baroque fingering, FA and FA# are the ones to change.

## Adding a language

The app is in Spanish and English. Every piece of text lives in one file per language in [`js/i18n/`](js/i18n/).

1. Copy [`js/i18n/en.js`](js/i18n/en.js) to a new file named after the language code, e.g. `js/i18n/ca.js` for Catalan or `js/i18n/ro.js` for Romanian.
2. Change the top:

   ```js
   export default {
     code: 'ca',     // language code
     name: 'CA',     // label on the language button
     strings: {
       'welcome.askName': 'Com et dius?',
       // … translate every line
     },
   };
   ```

3. Translate the text on the right of each line. Keep the keys on the left unchanged, and keep anything in `{curly braces}` (e.g. `{name}`, `{note}`) exactly as it is: the app fills those in.
4. List it in [`js/i18n/index.js`](js/i18n/index.js):

   ```js
   import es from './es.js';
   import en from './en.js';
   import ca from './ca.js';

   export const LANGUAGES = [es, en, ca];
   ```

5. Optionally, add a `subtitle` in the new language to each song (`subtitle: { es: …, en: …, ca: … }`).
6. Run `npm test`. The tests fail if the new file is missing a line that Spanish has, or if a `{placeholder}` changed.

The app picks the language from the browser the first time. After that it remembers the one chosen with the buttons at the top.

## How it's built

Plain HTML, CSS and JavaScript modules, with no framework and no build step.

| Folder | What's in it |
| --- | --- |
| [`js/music/`](js/music/) | Pitch detection (YIN), note names, the note and fingering table |
| [`js/game/`](js/game/) | Following the song note by note, tempo, points, loops |
| [`js/audio/`](js/audio/) | Microphone and metronome |
| [`js/ui/`](js/ui/) | The recorder drawing, the curved belt, the play screen |
| [`js/songs/`](js/songs/), [`js/i18n/`](js/i18n/) | Songs and languages |
| [`tests/`](tests/) | Unit tests (`npm test`) |

The full design is in [`docs/superpowers/specs/`](docs/superpowers/specs/2026-09-27-flute-trainer-design.md).

## Contributing

New songs, languages and fixes are welcome. Open an issue or a pull request, and please run `npm test` first.
