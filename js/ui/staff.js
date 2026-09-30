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

// Head, ledger lines and accidental of a note centred on x; returns the head's y too.
function head(x, name, duration, keySignature) {
  const note = parseNote(name);
  const y = yOf(note.step);
  let s = '';
  for (let st = 0; st >= note.step; st -= 2) s += `<path d="M${x - 9} ${yOf(st)}h18" stroke="${INK}" stroke-width="1.5"/>`;
  for (let st = 12; st <= note.step; st += 2) s += `<path d="M${x - 9} ${yOf(st)}h18" stroke="${INK}" stroke-width="1.5"/>`;
  const acc = accidentalFor(name, keySignature);
  if (acc) s += ACCIDENTALS[acc](x - 13, y);
  const hollow = duration >= 2;
  s += `<ellipse cx="${x}" cy="${y}" rx="5.4" ry="4" transform="rotate(-20 ${x} ${y})" fill="${hollow ? 'none' : INK}" stroke="${INK}" stroke-width="${hollow ? 2 : 1}"/>`;
  return { svg: s, y, step: note.step };
}

const STEM = 26;
const stemX = (x, up) => (up ? x + 4.8 : x - 4.8);
const stem = (x, y, up, end) => `<path d="M${stemX(x, up)} ${y + (up ? -1 : 1)}V${end}" stroke="${INK}" stroke-width="1.5"/>`;

// A single note with its own stem and, for an eighth, a flag.
function noteMarks(x, name, duration, keySignature) {
  if (!parseNote(name)) return '';
  const h = head(x, name, duration, keySignature);
  if (duration >= 4) return h.svg;
  const up = h.step < 6;
  const end = up ? h.y - STEM : h.y + STEM;
  let s = h.svg + stem(x, h.y, up, end);
  if (duration <= 0.5) {
    const sx = stemX(x, up);
    s += up
      ? `<path d="M${sx} ${end}c1 6 9 8 6 17c4 -9 -2 -12 -6 -13z" fill="${INK}"/>`
      : `<path d="M${sx} ${end}c1 -6 9 -8 6 -17c4 9 -2 12 -6 13z" fill="${INK}"/>`;
  }
  return s;
}

// Eighth notes in the same beat are beamed together, as on the sheet. Returns groups of
// indexes into items (only groups of two or more).
export function beamGroups(items) {
  const groups = [];
  let group = [];
  const flush = () => { if (group.length > 1) groups.push(group); group = []; };
  items.forEach((item, i) => {
    const eighth = item.duration === 0.5 && parseNote(item.name);
    const prev = items[group[group.length - 1]];
    const sameBeat = prev && prev.measure === item.measure && prev.lap === item.lap
      && Math.floor(prev.beat + 1e-6) === Math.floor(item.beat + 1e-6);
    if (!eighth || !sameBeat) flush();
    if (eighth) group.push(i);
  });
  flush();
  return groups;
}

// Beamed eighths: stems all one way (away from the note furthest from the middle line),
// a slightly sloped beam that keeps every stem at least 22 units long.
function beamed(notes, keySignature) {
  const heads = notes.map((n) => head(n.x, n.name, n.duration, keySignature));
  const far = heads.reduce((a, b) => (Math.abs(b.step - 6) > Math.abs(a.step - 6) ? b : a));
  const up = far.step < 6;
  const xs = notes.map((n) => stemX(n.x, up));
  const first = heads[0].y + (up ? -STEM : STEM);
  const last = heads[heads.length - 1].y + (up ? -STEM : STEM);
  const span = xs[xs.length - 1] - xs[0] || 1;
  const slope = Math.max(-0.12, Math.min(0.12, (last - first) / span));
  let y0 = first;
  const at = (x) => y0 + slope * (x - xs[0]);
  heads.forEach((h, k) => {
    const room = up ? h.y - at(xs[k]) : at(xs[k]) - h.y;
    if (room < 22) y0 += up ? -(22 - room) : 22 - room;
  });
  let s = heads.map((h, k) => h.svg + stem(notes[k].x, h.y, up, at(xs[k]))).join('');
  const t = up ? 4.5 : -4.5;
  const x1 = xs[0] - 0.75;
  const x2 = xs[xs.length - 1] + 0.75;
  s += `<path d="M${x1} ${at(x1)}L${x2} ${at(x2)}L${x2} ${at(x2) + t}L${x1} ${at(x1) + t}z" fill="${INK}"/>`;
  return s;
}

const lines = (from, to) => LINES.map((y) => `<path d="M${from} ${y}H${to}" stroke="${INK}" stroke-width="1.2" opacity=".75"/>`).join('');

// One note on its own bit of staff, `width` SVG units wide (units = px at the natural height).
export function staffSvg(name, duration, { keySignature = [], width = 60 } = {}) {
  return `<svg class="staff" viewBox="0 0 ${width} ${H}" width="${width}" height="${H}" aria-hidden="true">`
    + `${lines(0, width)}${noteMarks(width / 2 + 3, name, duration, keySignature)}</svg>`;
}

function restMark(x) {
  return `<path d="M${x - 2} 18l5 6-4 5 5 6c-4-2-7 0-3 5c-6-3-5-8 0-6l-5-6 4-5z" fill="${INK}"/>`;
}

// Treble clef and key signature at x, like the start of a line on the sheet; returns its width too.
function clef(x, keySignature) {
  const sharps = keySignature.map(parseNote).filter(Boolean);
  let s = `<text x="${x + 4}" y="${BOTTOM + 7}" font-size="54" fill="${INK}" font-family="'Noto Music','Apple Symbols','Segoe UI Symbol',serif">𝄞</text>`;
  sharps.forEach((k, i) => {
    // key signature sits in the top octave of the staff (FA# on the top line)
    const step = k.step < 7 ? k.step + 7 : k.step;
    s += (ACCIDENTALS[k.acc] ?? sharp)(x + 36 + i * 10, yOf(step));
  });
  return s;
}

export const clefWidth = (keySignature = []) => 40 + keySignature.length * 10;

// A whole line of music: one staff across `width`, the clef at x = 0, and each note (or rest)
// at its x. Eighths in the same beat get a beam instead of flags. `items` are song items
// ({ name, duration, beat, measure, lap }), `xs` their centres in px.
export function sheetSvg(items, xs, { width, keySignature = [] }) {
  const inBeam = new Map();
  const groups = beamGroups(items);
  groups.forEach((g, k) => g.forEach((i) => inBeam.set(i, k)));
  let s = lines(0, width) + clef(0, keySignature);
  items.forEach((item, i) => {
    if (inBeam.has(i)) return;
    s += parseNote(item.name) ? noteMarks(xs[i] + 3, item.name, item.duration, keySignature) : restMark(xs[i]);
  });
  groups.forEach((g) => {
    s += beamed(g.map((i) => ({ x: xs[i] + 3, name: items[i].name, duration: items[i].duration })), keySignature);
  });
  return `<svg class="sheet" viewBox="0 0 ${width} ${H}" width="${width}" height="${H}" aria-hidden="true">${s}</svg>`;
}
