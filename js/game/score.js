export const POINTS_PER_NOTE = 10;
const MILESTONES = [5, 10, 20];

export const createScore = () => ({ points: 0, streak: 0, firstTry: 0, notes: 0 });

// Points are only ever added. A missed note simply earns nothing and quietly restarts the streak.
export function scoreNote(state, firstTry) {
  const streak = firstTry ? state.streak + 1 : 0;
  return {
    state: {
      points: state.points + (firstTry ? POINTS_PER_NOTE : 0),
      streak,
      firstTry: state.firstTry + (firstTry ? 1 : 0),
      notes: state.notes + 1,
    },
    milestone: firstTry && MILESTONES.includes(streak) ? streak : null,
  };
}
