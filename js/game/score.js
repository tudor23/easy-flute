export const NOTE_POINTS = 10;    // the right note, with no wrong note before it
export const LENGTH_POINTS = 10;  // held for the right length
export const BONUS_STEP = 10;     // the streak bonus grows (or shrinks) by this much per note
const MILESTONES = [5, 10, 20];

export const createScore = () => ({ points: 0, streak: 0, bonus: 0, notes: 0, perfect: 0 });

// Step 1, when the note is found (the belt moves on).
export function scoreFound(state, { rightNote, factor = 1 }) {
  const gained = rightNote ? NOTE_POINTS * factor : 0;
  return { state: { ...state, points: state.points + gained }, gained };
}

// Step 2, when the note ends and its length is known. A wrong note before it resets the
// streak and the bonus; the wrong length only takes one step off the bonus.
// Points are only ever added.
export function scoreEnded(state, { rightNote, lengthOk, factor = 1 }) {
  let { bonus, streak } = state;
  if (!rightNote) {
    bonus = 0;
    streak = 0;
  } else {
    bonus = lengthOk ? bonus + BONUS_STEP : Math.max(0, bonus - BONUS_STEP);
    streak += 1;
  }
  const length = lengthOk ? LENGTH_POINTS : 0;
  const gained = (length + (rightNote ? bonus : 0)) * factor;
  return {
    state: {
      points: state.points + gained,
      streak,
      bonus,
      notes: state.notes + 1,
      perfect: state.perfect + (rightNote && lengthOk ? 1 : 0),
    },
    gained,
    length: length * factor,
    bonus: rightNote ? bonus * factor : 0,
    lostBonus: rightNote ? 0 : state.bonus,
    milestone: rightNote && MILESTONES.includes(streak) ? streak : null,
  };
}

// 1 star for finishing, 2 from 60% perfect notes, 3 from 90%.
export function starsFor({ perfect, notes }) {
  const share = notes ? perfect / notes : 0;
  if (share >= 0.9) return 3;
  if (share >= 0.6) return 2;
  return 1;
}
