import { isRest } from '../game/song.js';
import { advance } from '../game/roll.js';
import { keyboardFor } from '../music/keyboard.js';
import { sameNoteOtherOctave } from '../music/noteName.js';
import { createHud } from './hud.js';

// Synthesia-style piano screen: notes fall down lanes onto a drawn keyboard and wait at
// the line until the right key is played, then flow on at the tempo.

const INK = '#1d2b53';
const BEATS_SHOWN = 3.2;   // how many beats of music fit above the line
const KEYS_HEIGHT = 0.3;   // keyboard share of the canvas height
const COLORS = {
  short: '#5fa8d3', long: '#f4a259', now: '#ff9f1c', done: '#8ac926',
  laneA: '#172a57', laneB: '#13224a', laneBlack: '#0d1838',
  hit: '#ff006e', target: '#ffd166', heardRight: '#8ac926', heardWrong: '#9cc3ff',
};
const label = (name) => name.replace('#', '♯').replace(/b(?=[',]*$)/, '♭');

export function createRollView(root) {
  const $ = (id) => root.querySelector(`#${id}`);
  const canvas = $('roll-canvas');
  const ctx = canvas.getContext('2d');
  const hud = createHud(root);

  let items = [];
  let keyboard = { keys: [], whiteCount: 1 };
  let keyByName = {};
  let bars = [];        // [{ beat, number }] where bars start
  let index = 0;
  let P = 0;            // beat at the line
  let heard = null;
  let lastTick = 0;
  let size = { w: 0, h: 0 };

  const previous = (from) => {
    for (let i = from - 1; i >= 0; i--) if (!isRest(items[i])) return i;
    return -1;
  };

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || (w === size.w && h === size.h)) return;
    size = { w, h };
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, Math.min(r, h / 2, w / 2));
  }

  function draw() {
    resize();
    const { w, h } = size;
    if (!w) return;
    const kh = h * KEYS_HEIGHT;
    const hitY = h - kh;
    const ppb = hitY / BEATS_SHOWN;
    const wk = w / keyboard.whiteCount;
    const x = (key) => key.x * wk;
    const target = items[index]?.name;

    ctx.clearRect(0, 0, w, h);

    // lanes
    keyboard.keys.filter((k) => !k.black).forEach((k, i) => {
      ctx.fillStyle = i % 2 ? COLORS.laneB : COLORS.laneA;
      ctx.fillRect(x(k), 0, wk, hitY);
    });
    keyboard.keys.filter((k) => k.black).forEach((k) => {
      ctx.fillStyle = COLORS.laneBlack;
      ctx.fillRect(x(k), 0, k.w * wk, hitY);
    });

    // beat and bar lines
    const yOf = (beat) => hitY - (beat - P) * ppb;
    for (let b = Math.ceil((P - 0.01) * 2) / 2; yOf(b) > 0; b += 0.5) {
      ctx.fillStyle = Number.isInteger(b) ? '#ffffff30' : '#ffffff14';
      ctx.fillRect(0, yOf(b), w, 1);
    }
    ctx.font = '800 14px "Baloo 2", sans-serif';
    for (const bar of bars) {
      const y = yOf(bar.beat);
      if (y < 0 || y > hitY) continue;
      ctx.fillStyle = '#ffffffaa';
      ctx.fillRect(0, y - 1.5, w, 3);
      ctx.fillText(String(bar.number), 6, y - 6);
    }

    // notes
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, w, hitY + 2);
    ctx.clip();
    items.forEach((item, i) => {
      if (isRest(item)) return;
      const key = keyByName[item.name];
      if (!key) return;
      const bottom = yOf(item.beat);
      const top = bottom - item.duration * ppb;
      if (bottom < 0 || top > hitY + 2) return;
      const played = i < index;
      const now = i === index;
      const pad = key.black ? 2 : 5;
      ctx.globalAlpha = played ? Math.max(0.15, 1 - (bottom - hitY) / (ppb * 1.5)) : 1;
      ctx.fillStyle = played ? COLORS.done : now ? COLORS.now : item.duration >= 1 ? COLORS.long : COLORS.short;
      if (now) { ctx.shadowColor = COLORS.now; ctx.shadowBlur = 18; }
      roundRect(x(key) + pad, top + 3, key.w * wk - pad * 2, bottom - top - 6, 10);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.lineWidth = now ? 4 : 2;
      ctx.strokeStyle = now ? '#fff' : INK;
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.font = `900 ${key.black ? 13 : Math.min(22, wk * 0.28)}px "Baloo 2", sans-serif`;
      ctx.fillText(label(item.name), x(key) + (key.w * wk) / 2, bottom - 12);
      ctx.textAlign = 'left';
    });
    ctx.globalAlpha = 1;
    ctx.restore();

    // hit line
    ctx.fillStyle = COLORS.hit;
    ctx.fillRect(0, hitY - 3, w, 6);

    // keyboard
    const keyFill = (k, base) => {
      if (heard === k.name) return heard === target ? COLORS.heardRight : COLORS.heardWrong;
      if (target === k.name) return COLORS.target;
      return base;
    };
    ctx.textAlign = 'center';
    keyboard.keys.filter((k) => !k.black).forEach((k) => {
      ctx.fillStyle = keyFill(k, '#fffdf5');
      roundRect(x(k) + 1, hitY + 3, wk - 2, kh - 4, 6);
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = INK;
      ctx.stroke();
      ctx.fillStyle = INK;
      ctx.font = `900 ${Math.min(18, wk * 0.24)}px "Baloo 2", sans-serif`;
      ctx.fillText(label(k.name), x(k) + wk / 2, h - 12);
      if (k.midi === 60) {
        ctx.beginPath();
        ctx.arc(x(k) + wk / 2, h - 38, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    keyboard.keys.filter((k) => k.black).forEach((k) => {
      ctx.fillStyle = keyFill(k, INK);
      roundRect(x(k), hitY + 3, k.w * wk, kh * 0.6, 4);
      ctx.fill();
      ctx.fillStyle = heard === k.name || target === k.name ? INK : '#fff';
      ctx.font = `800 ${Math.min(12, wk * 0.16)}px "Baloo 2", sans-serif`;
      ctx.fillText(label(k.name), x(k) + (k.w * wk) / 2, hitY + kh * 0.6 - 8);
    });
    ctx.textAlign = 'left';
  }

  document.fonts?.ready.then(draw);
  window.addEventListener('resize', draw);

  return {
    setSong(songItems) {
      items = songItems;
      const names = [...new Set(items.filter((i) => !isRest(i)).map((i) => i.name))];
      keyboard = keyboardFor(names);
      keyByName = Object.fromEntries(keyboard.keys.map((k) => [k.name, k]));
      bars = [];
      items.forEach((item, i) => {
        const prev = items[i - 1];
        if (prev && (prev.measure !== item.measure || prev.lap !== item.lap)) bars.push({ beat: item.beat, number: item.measure + 1 });
      });
      heard = null;
      P = items.find((i) => !isRest(i))?.beat ?? 0;
      draw();
    },
    showIndex(i) {
      index = i;
      this.defaultHint();
      draw();
    },
    // called every frame: move the music towards the current note at the tempo
    tick(now, beatSeconds) {
      const dt = lastTick ? Math.min(0.1, (now - lastTick) / 1000) : 0;
      lastTick = now;
      const T = items[index]?.beat ?? P;
      P = advance(P, T, dt, beatSeconds);
      draw();
    },
    setHeard(name) {
      heard = name;
    },
    setHold() {},
    defaultHint() {
      const prev = previous(index);
      hud.defaultHint(items[index], prev >= 0 ? items[prev] : null);
    },
    wrongHint(heardName) {
      const target = items[index].name;
      const direction = sameNoteOtherOctave(heardName, target);
      if (direction) hud.octaveHint(heardName, target, direction);
      else hud.wrongHint(heardName, target);
    },
    earlyHint() {
      hud.earlyHint(items[index].name);
    },
    messageHint: hud.messageHint,
    setExam() {}, // exam mode is flute-only: the piano roll has no staff to read from
    setScore: hud.setScore,
    setLevel: hud.setLevel,
    setTempo: hud.setTempo,
    setBeat: hud.setBeat,
    popup: hud.popup,
  };
}
