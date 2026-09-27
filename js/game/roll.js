// The piano roll's position P (in beats) chases the current note's beat T at the tempo,
// so after a note is played the music flows through its length and then waits again.
// More than a beat behind (he played ahead): twice as fast. A target behind P (restart): jump.
export function advance(P, T, dt, beatSeconds) {
  if (T <= P) return T;
  const rate = (T - P > 1 ? 2 : 1) / beatSeconds;
  return Math.min(T, P + rate * dt);
}
