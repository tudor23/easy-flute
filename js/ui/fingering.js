import { NOTES } from '../music/notes.js';

const DARK = '#1d2b53';
const BODY = '#f4e3b2';

function hole(cx, cy, r, v) {
  const ring = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#fff" stroke="${DARK}" stroke-width="2.2"/>`;
  if (v === 1) return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${DARK}"/>`;
  if (v === 0) return ring;
  return `${ring}<path d="M${cx - r} ${cy} A${r} ${r} 0 0 0 ${cx + r} ${cy} Z" fill="${DARK}"/>`;
}

export function holeIcon(v, size = 22) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 22 22" aria-hidden="true">${hole(11, 11, 8, v)}</svg>`;
}

// Drawn like the school chart (docs/sample_notes.jpg): 3 holes, a spacer, 3 holes,
// a smaller 7th hole low and to the left, and the thumb hole on the side level with hole 2.
export function recorderSvg(noteName, { scale = 1, thumbLabel = 'pulgar' } = {}) {
  const fingering = NOTES[noteName]?.fingering;
  if (!fingering) return '';
  const cx = 40, gap = 22, r = 7.5;
  const top = [72, 72 + gap, 72 + 2 * gap];
  const y4 = top[2] + gap * 1.5;
  const ys = [...top, y4, y4 + gap, y4 + 2 * gap];
  const y7 = ys[5] + gap;
  const bodyBottom = y7 + 16;
  const w = 90, h = bodyBottom + 26;

  let s = `<svg class="recorder" width="${w * scale}" height="${h * scale}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${noteName}">`;
  s += `<rect x="24" y="44" width="32" height="${bodyBottom - 44}" fill="${BODY}" stroke="${DARK}" stroke-width="2"/>`;
  s += `<path d="M22 8 Q20 4 26 4 H54 Q60 4 58 8 L60 40 Q60 46 54 46 H26 Q20 46 20 40 Z" fill="${BODY}" stroke="${DARK}" stroke-width="2"/>`;
  s += `<rect x="34" y="15" width="12" height="3" rx="1.5" fill="${DARK}"/>`;
  for (let i = 0; i < 6; i++) s += hole(cx, ys[i], r, fingering[i + 1]);
  s += hole(30, y7, r * 0.6, fingering[7]);
  s += hole(73, ys[1], r, fingering[0]);
  s += `<text x="73" y="${ys[1] + 22}" text-anchor="middle" font-size="10" font-weight="800" fill="${DARK}">${thumbLabel}</text>`;
  return `${s}</svg>`;
}
