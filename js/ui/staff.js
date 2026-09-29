// Notes drawn the way they look on the school's song sheet: treble clef, written pitch
// (MI on the bottom line), filled heads, a flag on eighths, stems down from SI up.

const INK = '#1d2b53';
const LETTERS = ['DO', 'RE', 'MI', 'FA', 'SOL', 'LA', 'SI'];
const H = 64;          // staff height in SVG units
const GAP = 8;         // distance between staff lines
const BOTTOM = 48;     // y of the bottom line (MI)
const LINES = [0, 1, 2, 3, 4].map((k) => BOTTOM - k * GAP);

// "FA#'" -> { letter: 'FA', acc: '#', step: 10 }: step counts lines and spaces up from DO.
export function parseNote(name) {
  const m = /^(DO|RE|MI|FA|SOL|LA|SI)(#|b)?([',]*)$/.exec(name);
  if (!m) return null;
  const octave = (m[3].match(/'/g) || []).length - (m[3].match(/,/g) || []).length;
  return { letter: m[1], acc: m[2] ?? '', step: LETTERS.indexOf(m[1]) + 7 * octave };
}

const yOf = (step) => BOTTOM - (step - 2) * (GAP / 2);

// Which accidental to print: none when the key signature already says it.
export function accidentalFor(name, keySignature = []) {
  const note = parseNote(name);
  if (!note) return '';
  const inKey = keySignature.map(parseNote).find((k) => k?.letter === note.letter);
  if (inKey) return inKey.acc === note.acc ? '' : note.acc || 'natural';
  return note.acc;
}

function sharp(x, y) {
  return `<g stroke="${INK}" stroke-linecap="round"><path d="M${x - 1.8} ${y - 7}v15M${x + 1.8} ${y - 8}v15" stroke-width="1.2"/>`
    + `<path d="M${x - 4} ${y - 1.5}l8 -2.5M${x - 4} ${y + 3.5}l8 -2.5" stroke-width="2.4"/></g>`;
}

function flat(x, y) {
  return `<path d="M${x - 2} ${y - 11}V${y + 4}c6 -2 7 -8 0 -7" fill="none" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/>`;
}

function natural(x, y) {
  return `<path d="M${x - 2} ${y - 9}v13l4 -1.5M${x + 2} ${y + 9}v-13l-4 1.5" fill="none" stroke="${INK}" stroke-width="1.5"/>`;
}

const ACCIDENTALS = { '#': sharp, b: flat, natural };

// The note itself (head, stem, flag, ledger lines, accidental), centred on x.
function noteMarks(x, name, duration, keySignature) {
  const note = parseNote(name);
  if (!note) return '';
  const y = yOf(note.step);
  let s = '';
  for (let st = 0; st >= note.step; st -= 2) s += `<path d="M${x - 9} ${yOf(st)}h18" stroke="${INK}" stroke-width="1.5"/>`;
  for (let st = 12; st <= note.step; st += 2) s += `<path d="M${x - 9} ${yOf(st)}h18" stroke="${INK}" stroke-width="1.5"/>`;
  const acc = accidentalFor(name, keySignature);
  if (acc) s += ACCIDENTALS[acc](x - 13, y);
  const hollow = duration >= 2;
  s += `<ellipse cx="${x}" cy="${y}" rx="5.4" ry="4" transform="rotate(-20 ${x} ${y})" fill="${hollow ? 'none' : INK}" stroke="${INK}" stroke-width="${hollow ? 2 : 1}"/>`;
  if (duration >= 4) return s;
  const up = note.step < 6;
  const sx = up ? x + 4.8 : x - 4.8;
  const end = up ? y - 26 : y + 26;
  s += `<path d="M${sx} ${y + (up ? -1 : 1)}V${end}" stroke="${INK}" stroke-width="1.5"/>`;
  if (duration <= 0.5) {
    s += up
      ? `<path d="M${sx} ${end}c1 6 9 8 6 17c4 -9 -2 -12 -6 -13z" fill="${INK}"/>`
      : `<path d="M${sx} ${end}c1 -6 9 -8 6 -17c4 9 -2 12 -6 13z" fill="${INK}"/>`;
  }
  return s;
}

const lines = (width) => LINES.map((y) => `<path d="M0 ${y}H${width}" stroke="${INK}" stroke-width="1.2" opacity=".75"/>`).join('');

// One note on its own bit of staff, `width` SVG units wide (units = px at the natural height).
export function staffSvg(name, duration, { keySignature = [], width = 60 } = {}) {
  return `<svg class="staff" viewBox="0 0 ${width} ${H}" width="${width}" height="${H}" aria-hidden="true">`
    + `${lines(width)}${noteMarks(width / 2 + 3, name, duration, keySignature)}</svg>`;
}

// A bar's worth of empty staff for a rest, with a quarter-rest squiggle.
export function restSvg(width) {
  const x = width / 2;
  return `<svg class="staff" viewBox="0 0 ${width} ${H}" width="${width}" height="${H}" aria-hidden="true">${lines(width)}`
    + `<path d="M${x - 2} 18l5 6-4 5 5 6c-4-2-7 0-3 5c-6-3-5-8 0-6l-5-6 4-5z" fill="${INK}"/></svg>`;
}

// Treble clef and key signature, drawn at the start of the lane like the start of a line on the sheet.
export function clefSvg(keySignature = []) {
  const sharps = keySignature.map(parseNote).filter(Boolean);
  const width = 40 + sharps.length * 10;
  let s = `<svg class="staff" viewBox="0 0 ${width} ${H}" width="${width}" height="${H}" aria-hidden="true">${lines(width)}`;
  s += `<text x="4" y="${BOTTOM + 7}" font-size="54" fill="${INK}" font-family="'Noto Music','Apple Symbols','Segoe UI Symbol',serif">𝄞</text>`;
  sharps.forEach((k, i) => {
    // key signature sits in the top octave of the staff (FA# on the top line)
    const step = k.step < 7 ? k.step + 7 : k.step;
    s += (ACCIDENTALS[k.acc] ?? sharp)(36 + i * 10, yOf(step));
  });
  return `${s}</svg>`;
}
