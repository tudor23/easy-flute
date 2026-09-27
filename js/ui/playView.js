import { t } from '../i18n/index.js';
import { isRest } from '../game/song.js';
import { NOTES, fingeringDiff } from '../music/notes.js';
import { recorderSvg, holeIcon } from './fingering.js';
import { createCurve } from './curve.js';
import { createHud, esc, isLong, noteLabel } from './hud.js';

export { noteLabel };

const UNIT = 44;   // lane width of an eighth note, px
const GAP = 4;
const WINDOW_BEHIND = 12; // cards around the current one that can be on screen
const WINDOW_AHEAD = 24;
const MIN_UNIT = 96; // smallest short-note card on narrow screens, px
const LIFT = 70;     // how far (px) the belt rises towards the horizon as it goes away
const BAND = 22;     // belt thickness in front of the viewer, px

const lenLabel = (item) => t(isLong(item) ? 'play.long' : 'play.short');

// "Uncover hole 2" style tip for getting from the heard note to the target, or a
// "look at the picture" nudge when too many holes differ.
export function fingeringTip(heard, target) {
  if (!NOTES[heard] || !NOTES[target]) return t('tip.look');
  const d = fingeringDiff(NOTES[heard].fingering, NOTES[target].fingering);
  if (d.cover.length + d.lift.length + d.half.length > 2) return t('tip.look');
  const what = (holes) => holes.map((h) => (h === 'thumb' ? t('tip.thumb') : t('tip.hole', { n: h }))).join(t('tip.and'));
  const parts = [];
  if (d.lift.length) parts.push(t('tip.lift', { what: what(d.lift) }));
  if (d.cover.length) parts.push(t('tip.cover', { what: what(d.cover) }));
  if (d.half.length) parts.push(t('tip.half', { what: what(d.half) }));
  return `${parts.join(' · ')} 👍`;
}

const STATES = ['gone', 'done', 'now', 'next', 'later', 'far'];

const TAGS = { done: 'play.tagDone', now: 'play.tagNow', next: 'play.tagNext', later: 'play.tagLater' };

function stateFor(offset) {
  if (offset < -1) return 'gone';
  if (offset === -1) return 'done';
  if (offset === 0) return 'now';
  if (offset === 1) return 'next';
  if (offset === 2) return 'later';
  return 'far';
}

export function createPlayView(root) {
  const $ = (id) => root.querySelector(`#${id}`);
  const lane = $('lane');
  const strip = $('lane-strip');
  const belt = $('belt');
  const beltStrip = $('belt-strip');
  const hud = createHud(root);
  let items = [];
  let playable = [];   // item indexes that are notes (not rests), in order
  let slots = [];
  let index = 0;
  let pos = 0;
  let travelled = 0;   // 0..1: how far the current card has ridden towards the exit
  let lefts = [];      // each slot's position along the belt (its layout position), px
  let widths = [];
  let rights = [];
  let curve = null;

  const previous = (from) => {
    for (let i = from - 1; i >= 0; i--) if (!isRest(items[i])) return i;
    return -1;
  };

  // Every note of the song gets one card on the belt, built once, as wide as the note is long.
  // Moving along only changes classes (colours, labels); position and size come from placeBelt().
  function renderBelt() {
    beltStrip.innerHTML = playable.map((i) => {
      const item = items[i];
      const prev = items[i - 1];
      const barStart = !prev || prev.measure !== item.measure || prev.lap !== item.lap;
      const bar = item.measure + 1;
      const barClass = `${barStart ? 'bar-start' : ''} ${bar % 2 ? '' : 'even'}`;
      return `<div class="slot ${barClass}" style="--units:${item.duration * 2}"><div class="card"><div class="tag"></div>`
        + (barStart ? `<span class="bar-badge">${bar}</span>` : '')
        + `<div class="note">${noteLabel(item.name)}</div>`
        + `${recorderSvg(item.name, { thumbLabel: t('play.thumb') })}`
        + `<div class="beats"><span class="beat ${isLong(item) ? 'q' : 'e'}"></span><span class="beat-lbl">${lenLabel(item)}</span></div>`
        + '<div class="hold"><i></i></div><div class="status"></div></div>'
        + `<div class="seg ${isLong(item) ? 'q' : 'e'}">${barStart ? `<b class="bar-no">${bar}</b>` : ''}<span>${isLong(item) ? '♩' : '♪'}</span></div></div>`;
    }).join('');
    slots = [...beltStrip.children];
    curve = null;
  }

  // Card width comes from the screen: a short note is 1/10 of the belt, so the front
  // (20%-60%) always holds 4 short or 2 long cards. Phones get a minimum size instead.
  function measureBelt() {
    const w = belt.clientWidth;
    if (!w) return; // screen not visible yet: measure later
    belt.style.setProperty('--unit', `${Math.max(MIN_UNIT, w / 10)}px`);
    lefts = slots.map((slot) => slot.offsetLeft);
    widths = slots.map((slot) => slot.offsetWidth);
    rights = lefts.map((l, k) => l + widths[k]);
    curve = createCurve({ width: w });
    drawBed();
  }

  // The belt itself: a band that rises and thins out towards both edges.
  function drawBed() {
    const bed = $('belt-bed');
    const w = belt.clientWidth;
    const h = belt.clientHeight;
    const bottom = h - 6;
    const top = [];
    const low = [];
    for (let d = -8000; d <= 8000; d += 40) {
      const x = curve.x(d);
      if (x < -50 || x > w + 50) continue;
      const sc = curve.scale(d);
      if (sc < 0.12) continue;
      const y = bottom - LIFT * (1 - sc);
      low.push(`${x.toFixed(1)},${y.toFixed(1)}`);
      top.push(`${x.toFixed(1)},${(y - BAND * sc).toFixed(1)}`);
    }
    bed.setAttribute('viewBox', `0 0 ${w} ${h}`);
    bed.innerHTML = `<polygon points="${top.join(' ')} ${low.reverse().join(' ')}" />`;
  }

  // The belt runs only while the right note is being played. The current card starts with
  // its right edge at the front's right edge (60%); while it's held the belt moves left until
  // the next card has taken that place. Each card is then placed and scaled by where it is on
  // the curved belt, so size changes only with position on screen.
  function placeBelt() {
    if (!slots.length) return;
    if (!curve) measureBelt();
    if (!curve) return;
    const f = pos + travelled;
    const k = Math.min(Math.floor(f), rights.length - 1);
    const next = rights[k + 1] ?? rights[k] + widths[k];
    const here = rights[k] + (next - rights[k]) * (f - k);
    const shift = curve.entry - here;
    for (let i = Math.max(0, pos - WINDOW_BEHIND); i < Math.min(slots.length, pos + WINDOW_AHEAD); i++) {
      const slot = slots[i];
      const wl = lefts[i] + shift;
      const left = curve.x(wl);
      const scale = (curve.x(wl + widths[i]) - left) / widths[i];
      const opacity = Math.max(0, Math.min(1, (scale - 0.15) / 0.25));
      slot.style.visibility = opacity > 0 ? 'visible' : 'hidden';
      if (!opacity) continue;
      const lift = LIFT * (1 - scale);
      slot.style.transform = `translate(${(left - lefts[i]).toFixed(1)}px, ${(-lift).toFixed(1)}px) scale(${scale.toFixed(4)})`;
      slot.style.opacity = opacity.toFixed(3);
    }
  }

  function updateBelt() {
    slots.forEach((slot, k) => {
      const state = stateFor(k - pos);
      STATES.forEach((s) => slot.classList.toggle(s, s === state));
      slot.querySelector('.tag').textContent = TAGS[state] ? t(TAGS[state]) : '';
      if (state !== 'now') slot.querySelector('.hold i').style.width = '0%';
      if (k < pos - WINDOW_BEHIND || k >= pos + WINDOW_AHEAD) slot.style.visibility = 'hidden';
      slot.querySelector('.seg').style.setProperty('--p', k < pos ? '100%' : '0%');
    });
    const status = slots[pos]?.querySelector('.status');
    if (status) status.textContent = t('play.listening');
    placeBelt();
  }

  function renderLane() {
    let html = '';
    items.forEach((item, i) => {
      const prev = items[i - 1];
      if (!prev || item.measure !== prev.measure || item.lap !== prev.lap) {
        html += `<span class="bar ${prev ? '' : 'first'}"><b>${item.measure + 1}</b></span>`;
      }
      const units = item.duration * 2;
      const width = units * UNIT + (units - 1) * GAP;
      html += `<span class="blk ${isRest(item) ? 'rest' : ''}" data-i="${i}" style="width:${width}px">${isRest(item) ? '' : noteLabel(item.name)}</span>`;
    });
    strip.innerHTML = html;
  }

  function updateLane() {
    strip.querySelectorAll('.blk').forEach((el) => {
      const i = Number(el.dataset.i);
      el.classList.toggle('done', i < index);
      el.classList.toggle('now', i === index);
      if (i !== index) el.style.removeProperty('--p');
    });
    const cur = strip.querySelector(`.blk[data-i="${index}"]`);
    if (cur) {
      const x = Math.max(0, cur.offsetLeft - lane.clientWidth * 0.3);
      strip.style.transform = `translateX(${-x}px)`;
    }
  }

  // Card sizes depend on the web font; measure again once it has arrived.
  document.fonts?.ready.then(() => {
    if (slots.length) measureBelt();
    placeBelt();
  });

  window.addEventListener('resize', () => {
    if (slots.length) measureBelt();
    placeBelt();
    updateLane();
  });

  return {
    setSong(songItems) {
      items = songItems;
      playable = items.map((item, i) => (isRest(item) ? -1 : i)).filter((i) => i >= 0);
      renderLane();
      renderBelt();
      $('legend').innerHTML = [[1, 'play.legendCovered'], [0, 'play.legendOpen'], [0.5, 'play.legendHalf']]
        .map(([v, k]) => `<span>${holeIcon(v)}${t(k)}</span>`).join('');
    },
    showIndex(i) {
      index = i;
      pos = Math.max(0, playable.indexOf(i));
      travelled = 0;
      updateBelt();
      updateLane();
      this.defaultHint();
    },
    defaultHint() {
      const prev = previous(index);
      hud.defaultHint(items[index], prev >= 0 ? items[prev] : null);
    },
    wrongHint(heard) {
      const target = items[index].name;
      hud.wrongHint(heard, target, fingeringTip(heard, target));
    },
    earlyHint() {
      hud.earlyHint(items[index].name);
    },
    messageHint: hud.messageHint,
    setHold(progress, holding) {
      const slot = slots[pos];
      if (!slot) return;
      travelled = progress;
      placeBelt();
      slot.querySelector('.hold i').style.width = `${Math.round(progress * 100)}%`;
      slot.querySelector('.seg').style.setProperty('--p', `${Math.round(progress * 100)}%`);
      strip.querySelector(`.blk[data-i="${index}"]`)?.style.setProperty('--p', `${Math.round(progress * 100)}%`);
      const status = slot.querySelector('.status');
      const text = t(holding ? 'play.hold' : 'play.listening');
      if (status.textContent !== text) status.textContent = text;
    },
    setScore: hud.setScore,
    setLevel: hud.setLevel,
    setTempo: hud.setTempo,
    setBeat: hud.setBeat,
    popup: hud.popup,
    setHeard() {},
    tick() {},
  };
}
