# Scoring: note points, length points, streak bonus, stars

Replaces "10 points for a first-try note". Agreed on 2026-09-29.

## Rules

Each note is judged twice.

1. **Found** (the belt moves on, as today): +10 if no wrong note was played before it.
2. **Ended** (the kid stops, moves to the next note, re-attacks the same note, or passes 150% of its length): +10 if the length was right, plus the streak bonus.

**Right length:** held between 70% and 150% of the written length at the current tempo. A note that was cut short (the "Almost! hold it longer" case) always has the wrong length.

**Streak bonus** (a running number, starting at 0, no cap):

| Note | Bonus | Streak 🔥 | Points at the end of the note |
|---|---|---|---|
| right note, right length | +10 | +1 | 10 + bonus |
| right note, wrong length | −10 (not below 0) | +1 | bonus |
| wrong note first | reset to 0 | reset to 0 | 10 if the length was right, else 0 |

- **Wrong note:** a different note that lasts at least 0.3 s. The "I hear X" hint still appears after 0.15 s, but anything shorter than 0.3 s doesn't break the streak (mic grace).
- **While the tempo is being learned**, and **on the piano**, the length always counts as right. Piano sound fades and the pedal stretches it, so the length can't be judged there.
- **Exam mode:** all points count double.
- Milestone pop-ups stay at streaks of 5, 10 and 20.

**Stars** on the end screen, from the share of notes with the right note and the right length:

- ★ for finishing the song
- ★★ at 60% or more
- ★★★ at 90% or more

The end screen also says "N of M notes perfect".

## Feedback

- When a note is found: "+10" floats up from the ⭐ pill (as today; "+20" in exam mode).
- When a note ends: e.g. "+10 ♪ +30 🔥". With the wrong length it adds "♪ a bit short" or "♪ a bit long". When a streak with a bonus is broken it shows "💔".

## Design

- `tracker.js` (pure) reports the facts:
  - `complete { index, rightNote }`
  - a new `released { index, held, lengthOk }` when the note's tail ends, or as soon as it runs past 150%
  - `done` comes after the last note's `released`
  - new options: `wrongStreakSec` 0.3, `lengthMin` 0.7, `lengthMax` 1.5
- `score.js` (pure):
  - `scoreFound(state, { rightNote, factor })`
  - `scoreEnded(state, { rightNote, lengthOk, factor })`
  - `starsFor(state)`
- `app.js` decides the factor (exam ×2) and forces `lengthOk` while calibrating or when the instrument has `judgeLength: false` (piano).
- Tests cover the bonus sequence, stars, the 0.3 s grace, cut short / too long / right length, and `done` after the last release.
