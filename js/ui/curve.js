// The belt is an oval seen from the centre of its round end. On screen that gives three
// fixed zones: the exit (left), the front (full size, in front of the viewer) and the entry
// (right). In the exit and entry the belt goes away into the distance and cards shrink
// (scale 1 / (1 + k·d)).
//
// w is a position along the belt in px, measured as if the belt were flat, so on the front
// x(w) = w. scale is the slope of x, so cards and the gaps between them shrink together.
export function createCurve({ width, exitAt = 0.2, entryAt = 0.6, falloffExit = 0.05, falloffEntry = 0.38 }) {
  const e = width * exitAt;
  const n = width * entryAt;
  const kl = 1 / (width * falloffExit);
  const kr = 1 / (width * falloffEntry);

  const scale = (w) => {
    if (w > n) return 1 / (1 + kr * (w - n));
    if (w < e) return 1 / (1 + kl * (e - w));
    return 1;
  };

  const x = (w) => {
    if (w > n) return n + Math.log1p(kr * (w - n)) / kr;
    if (w < e) return e - Math.log1p(kl * (e - w)) / kl;
    return w;
  };

  return { x, scale, exit: e, entry: n };
}
