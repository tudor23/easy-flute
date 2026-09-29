import { MENU, t, setLang, getLang, pickLang } from './i18n/index.js';
import { createStorage } from './storage.js';
import { SONGS } from './songs/index.js';
import { flattenSong, isRest, buildRun, clampLoop } from './game/song.js';
import { createTracker } from './game/tracker.js';
import { createScore, scoreNote } from './game/score.js';
import { estimateBeatSeconds, beatToBpm, bpmToBeat, CALIBRATION_NOTES, DEFAULT_BPM } from './game/tempo.js';
import { detectPitch, rms } from './music/pitch.js';
import { freqToNote, nameWithSlack } from './music/noteName.js';
import { NOTES } from './music/notes.js';
import { createAudioContext, createAnalyser, openMic, createDebugSynth } from './audio/mic.js';
import { createMetronome } from './audio/metronome.js';
import { createPlayView } from './ui/playView.js';
import { createRollView } from './ui/rollView.js';
import { INSTRUMENTS, instrumentById } from './instruments/index.js';

const DEBUG = new URLSearchParams(location.search).has('debug');
const NO_SOUND_SECONDS = 8;
const LOOP_NOTES = 200; // a loop is laid out as enough laps for about this many notes
const LOOP_LENGTHS = [1, 2, 3, 4, 5, 6];
const QUIET_SECONDS = 0.5;
const MIN_GATE = 0.01;
const DEFAULT_NAME = 'Ander'; // used until someone types their own name

const storage = createStorage();
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

let screen = 'welcome';
let name = storage.getName() || DEFAULT_NAME;
const views = { belt: createPlayView($('screen-play')), roll: createRollView($('screen-play')) };
let instrument = instrumentById(storage.getInstrument());
let view = views.belt;

function useInstrument(inst) {
  instrument = inst;
  storage.setInstrument(inst.id);
  view = views[inst.view];
  $('stage').classList.toggle('piano', inst.view === 'roll');
  $('btn-instrument').textContent = `${inst.emoji} ${t(`inst.${inst.id}`)} ⇄`;
  applyStaticText();
}
if (instrument) useInstrument(instrument);

// ---------- screens & language ----------

function show(id) {
  screen = id;
  document.querySelectorAll('.screen').forEach((s) => { s.hidden = s.id !== `screen-${id}`; });
  refresh();
}

function applyStaticText() {
  document.documentElement.lang = getLang();
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => { el.placeholder = t(el.dataset.i18nPlaceholder); });
  document.querySelectorAll('[data-i18n-title]').forEach((el) => { el.title = t(el.dataset.i18nTitle); });
  if (instrument) $('btn-instrument').textContent = `${instrument.emoji} ${t(`inst.${instrument.id}`)} ⇄`;
  $('brand').textContent = name ? t(`app.titleFor.${instrument?.id ?? 'flute'}`, { name }) : t('app.title');
  document.title = t('app.title');
  $('langs').innerHTML = MENU.map((l) => `<button data-lang="${l.code}" class="${l.code === getLang() ? 'on' : ''}">${l.name}</button>`).join('');
}

function refresh() {
  applyStaticText();
  if (screen === 'songs') renderSongs();
  if (screen === 'instrument') renderInstruments();
  if (screen === 'play' && game) {
    renderLoopBar();
    view.setSong(game.items);
    view.showIndex(game.tracker.state().index);
    updateTempoPill();
  }
  if (screen === 'done' && game) renderDone();
}

$('langs').addEventListener('click', (e) => {
  const code = e.target.closest('button')?.dataset.lang;
  if (!code) return;
  setLang(code);
  storage.setLang(code);
  refresh();
});

// ---------- welcome & songs ----------

$('name-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const value = $('name-input').value.trim().slice(0, 20);
  if (!value) {
    $('name-msg').textContent = t('welcome.nameMissing');
    return;
  }
  name = value;
  storage.setName(name);
  $('name-msg').textContent = '';
  show(instrument ? 'songs' : 'instrument');
});

// ---------- instrument ----------

function renderInstruments() {
  $('instrument-list').innerHTML = INSTRUMENTS.map((inst) => `<button class="pick ${inst.id === instrument?.id ? 'on' : ''}" data-inst="${inst.id}">`
    + `<span class="pick-emoji">${inst.emoji}</span><b>${t(`inst.${inst.id}`)}</b><small>${t(`inst.${inst.id}Sub`)}</small></button>`).join('');
}

$('instrument-list').addEventListener('click', (e) => {
  const inst = instrumentById(e.target.closest('[data-inst]')?.dataset.inst);
  if (!inst) return;
  useInstrument(inst);
  // Came from the play screen: reopen the same song on the new instrument.
  if (returnToSong) openSong(returnToSong);
  else show('songs');
  returnToSong = null;
});

let returnToSong = null;
$('btn-instrument').addEventListener('click', () => {
  returnToSong = game?.song ?? null;
  stopGame();
  show('instrument');
});

function renderSongs() {
  $('songs-instrument').innerHTML = `${instrument.emoji} ${t(`inst.${instrument.id}`)} · <u>${t('inst.change')}</u>`;
  $('songs-hello').textContent = t('songs.hello', { name });
  $('not-you').textContent = t('songs.notYou', { name });
  $('song-list').innerHTML = SONGS.map((s) => {
    const count = flattenSong(s).filter((i) => !isRest(i)).length;
    const sub = s.subtitle?.[getLang()] ?? s.subtitle?.es ?? '';
    return `<button class="song-card" data-song="${s.id}"><span><b>${esc(s.title)}</b><small>${esc(sub)} · ${t('songs.notes', { count })}</small></span><span class="go">▶</span></button>`;
  }).join('');
}

$('song-list').addEventListener('click', (e) => {
  const id = e.target.closest('[data-song]')?.dataset.song;
  if (id) openSong(SONGS.find((s) => s.id === id));
});

$('songs-instrument').addEventListener('click', () => { returnToSong = null; show('instrument'); });

$('not-you').addEventListener('click', () => {
  $('name-input').value = name ?? '';
  show('welcome');
  $('name-input').focus();
});

// ---------- audio ----------

let ctx = null;
let analyser = null;
let mic = null;
let metronome = null;
let synth = null;

async function ensureAudio() {
  if (!ctx) {
    ctx = createAudioContext();
    analyser = createAnalyser(ctx);
    metronome = createMetronome(ctx);
    if (DEBUG) synth = createDebugSynth(ctx, analyser);
  }
  await ctx.resume();
  if (!mic) {
    try {
      mic = await openMic(ctx, analyser);
    } catch (err) {
      if (!DEBUG) throw err;
      console.warn('No microphone; debug keyboard only.', err);
    }
  }
}

function releaseMic() {
  mic?.stop();
  mic = null;
}

// ---------- game ----------

let game = null;
let raf = 0;
const buffer = new Float32Array(2048);

function openSong(song) {
  const savedBpm = storage.getTempo(song.id, instrument.id);
  game = {
    song,
    loop: null,
    loopStart: 1,
    items: [],
    lapNotes: 0,
    total: 0,
    bpm: savedBpm ?? DEFAULT_BPM,
    calibrating: !savedBpm,
    onsets: [],
    tracker: null,
    score: createScore(),
    gate: MIN_GATE,
    quietUntil: 0,
    quietLevels: [],
    lastSoundT: 0,
    lastFrame: { note: null, rms: 0 },
    running: false,
  };
  resetRun();
  renderLoopBar();
  $('play-title').textContent = song.title;
  $('start-overlay').hidden = false;
  $('pause-overlay').hidden = true;
  show('play');
}

function resetRun() {
  const { lapNotes } = buildRun(game.song, game.loop);
  const laps = game.loop ? Math.min(60, Math.max(3, Math.ceil(LOOP_NOTES / lapNotes))) : 1;
  const run = buildRun(game.song, game.loop, laps);
  game.items = run.items;
  game.lapNotes = run.lapNotes;
  game.total = run.lapNotes;
  game.tracker = createTracker(game.items, { beatSeconds: bpmToBeat(game.bpm), ...instrument.tracker });
  game.score = createScore();
  game.onsets = [];
  view.setSong(game.items);
  view.showIndex(game.tracker.state().index);
  view.setScore(game.score, 0);
  updateTempoPill();
}

// Restart from the top of the loop (or the song), keeping the tempo and the metronome going.
function restartRun() {
  metronome?.stop();
  resetRun();
  if (game.running) metronome.start(game.bpm, game.song.timeSignature[0]);
}

function scoreProgress() {
  const { notes } = game.score;
  return game.loop ? (notes % game.lapNotes) / game.lapNotes : notes / game.lapNotes;
}

// ---------- loop bar ----------

function renderLoopBar() {
  if (!game) return;
  const bars = game.song.measures.length;
  const len = game.loop?.length ?? 0;
  $('loop-len').innerHTML = [0, ...LOOP_LENGTHS.filter((n) => n <= bars)]
    .map((n) => `<button data-len="${n}" class="${n === len ? 'on' : ''}">${n ? n : t('loop.all')}</button>`).join('');
  const select = $('loop-start');
  select.innerHTML = Array.from({ length: bars }, (_, i) => `<option value="${i + 1}">${i + 1}</option>`).join('');
  select.value = String(game.loopStart);
  select.disabled = !game.loop;
}

function setLoop(start, length) {
  game.loop = length ? clampLoop({ start, length }, game.song.measures.length) : null;
  game.loopStart = game.loop ? game.loop.start : start;
  renderLoopBar();
  restartRun();
}

$('loop-len').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-len]');
  if (btn) setLoop(game.loopStart, Number(btn.dataset.len));
});
$('loop-start').addEventListener('change', (e) => setLoop(Number(e.target.value), game.loop?.length ?? 0));

function updateTempoPill() {
  if (!game) return;
  view.setTempo({ bpm: game.bpm, listening: game.calibrating, count: Math.min(3, Math.max(0, game.onsets.length - 1)) });
  $('btn-mute').textContent = metronome?.isMuted() ? '🔇' : '🔊';
}

async function startPlaying() {
  try {
    await ensureAudio();
  } catch (err) {
    showMicError(err);
    return;
  }
  $('start-overlay').hidden = true;
  game.quietUntil = ctx.currentTime + QUIET_SECONDS;
  game.quietLevels = [];
  game.lastSoundT = ctx.currentTime;
  view.messageHint(t('play.quiet'));
  resume();
}

function resume() {
  $('pause-overlay').hidden = true;
  game.running = true;
  ctx.resume();
  metronome.start(game.bpm, game.song.timeSignature[0]);
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(loop);
}

function pause() {
  if (!game?.running) return;
  game.running = false;
  cancelAnimationFrame(raf);
  metronome?.stop();
  synth?.stop();
  ctx?.suspend();
  $('pause-overlay').hidden = false;
}

function stopGame() {
  if (game) game.running = false;
  cancelAnimationFrame(raf);
  metronome?.stop();
  synth?.stop();
  releaseMic();
}

function loop() {
  if (!game?.running) return;
  raf = requestAnimationFrame(loop);
  analyser.getFloatTimeDomainData(buffer);
  const now = ctx.currentTime;
  const level = rms(buffer);
  view.setLevel(level);

  // First half second: measure the room so background noise doesn't count as notes.
  if (now < game.quietUntil) {
    game.quietLevels.push(level);
    return;
  }
  if (game.quietLevels.length) {
    const avg = game.quietLevels.reduce((a, b) => a + b, 0) / game.quietLevels.length;
    game.gate = Math.max(MIN_GATE, avg * 2);
    game.quietLevels = [];
    view.defaultHint();
  }

  let frame;
  if (fakeHeld) {
    // Fake mic (?debug=1): pretend the current note is being played perfectly.
    const target = game.items[game.tracker.state().index]?.name ?? null;
    frame = { t: now, note: target, rms: 0.2 };
    game.lastFrame = { note: target, rms: 0.2 };
  } else if (metronome.isSuppressed(now)) {
    // Right after a click: keep the last reading so the click is never heard as a note.
    frame = { t: now, ...game.lastFrame };
  } else {
    const pitch = detectPitch(buffer, ctx.sampleRate, { gate: game.gate, ...instrument.pitch });
    const target = game.items[game.tracker.state().index]?.name;
    const note = pitch ? nameWithSlack(pitch.freq, instrument.nameShift, target, instrument.slack) : null;
    frame = { t: now, note, rms: level };
    game.lastFrame = { note, rms: level };
    if (DEBUG) debugInfo(pitch, note, level);
  }

  if (DEBUG) debugLog(frame, metronome.isSuppressed(now));
  if (frame.note) game.lastSoundT = now;
  for (const ev of game.tracker.update(frame)) {
    if (DEBUG) frameLog.push({ ...frame, event: ev });
    handleEvent(ev, now);
  }
  if (!game.running) return;

  const st = game.tracker.state();
  view.setHold(st.progress, st.phase === 'holding');
  view.setHeard(frame.note);
  view.tick(performance.now(), bpmToBeat(game.bpm));
  const info = metronome.running() ? metronome.beatInfo(now) : null;
  view.setBeat(info && info.since < 0.15 ? info.beatInBar : -1);
  if (now - game.lastSoundT > NO_SOUND_SECONDS) {
    view.messageHint(t('play.noSound'));
    game.lastSoundT = now;
  }
}

function handleEvent(ev) {
  switch (ev.type) {
    case 'start':
      view.defaultHint();
      if (game.calibrating) calibrate(ev);
      break;
    case 'complete': {
      const { state, milestone } = scoreNote(game.score, ev.firstTry);
      game.score = state;
      view.setScore(state, scoreProgress());
      if (ev.firstTry) flashPlus();
      if (milestone) view.popup(`${t('play.great')} ${t('play.streak', { n: milestone })}`);
      const next = game.tracker.state().index;
      if (next >= 0) {
        view.showIndex(next);
        const lap = game.items[next].lap;
        if (lap > game.items[ev.index].lap) view.popup(t('loop.lap', { n: lap + 1 }));
      }
      break;
    }
    case 'resume':
      view.defaultHint();
      break;
    case 'wrong':
      view.wrongHint(ev.heard);
      break;
    case 'early':
      view.earlyHint();
      break;
    case 'done':
      finish();
      break;
    default:
  }
}

function calibrate(ev) {
  game.onsets.push({ t: ev.t, beat: game.items[ev.index].beat });
  updateTempoPill();
  if (game.onsets.length < CALIBRATION_NOTES) return;
  const beat = estimateBeatSeconds(game.onsets);
  game.bpm = beatToBpm(beat);
  game.calibrating = false;
  game.tracker.setBeatSeconds(beat);
  storage.setTempo(game.song.id, game.bpm, instrument.id);
  metronome.start(game.bpm, game.song.timeSignature[0]);
  updateTempoPill();
}

function flashPlus() {
  const el = $('plus');
  el.textContent = '+10';
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
}

function finish() {
  game.running = false;
  cancelAnimationFrame(raf);
  metronome.stop();
  synth?.stop();
  setTimeout(() => {
    releaseMic();
    show('done');
  }, 900);
}

function renderDone() {
  $('done-title').textContent = t('done.title', { name });
  $('done-played').textContent = t('done.played', { song: game.song.title });
  $('done-points').textContent = `⭐ ${t('done.points', { points: game.score.points })}`;
  $('done-first').textContent = t('done.firstTry', { n: game.score.firstTry, total: game.score.notes });
}

function showMicError(err) {
  const insecure = err?.code === 'insecure' || !window.isSecureContext;
  $('mic-msg').textContent = t(insecure ? 'mic.insecure' : 'mic.denied');
  show('mic');
}

// ---------- buttons ----------

$('btn-start').addEventListener('click', startPlaying);
$('btn-pause').addEventListener('click', pause);
$('btn-resume').addEventListener('click', resume);
$('btn-restart').addEventListener('click', restartRun);

// Enter: start, or go back to the top of the loop (or the song).
window.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' || screen !== 'play' || !game || e.target.tagName === 'INPUT') return;
  e.preventDefault();
  if (!$('start-overlay').hidden) startPlaying();
  else if (!$('pause-overlay').hidden) resume();
  else restartRun();
});
$('btn-back').addEventListener('click', () => { stopGame(); show('songs'); });
$('btn-mute').addEventListener('click', () => {
  if (!metronome) return;
  metronome.setMuted(!metronome.isMuted());
  updateTempoPill();
});
$('btn-retempo').addEventListener('click', () => {
  storage.clearTempo(game.song.id, instrument.id);
  game.bpm = DEFAULT_BPM;
  game.calibrating = true;
  game.onsets = [];
  game.tracker.setBeatSeconds(bpmToBeat(DEFAULT_BPM));
  if (game.running) metronome.start(game.bpm, game.song.timeSignature[0]);
  updateTempoPill();
});
$('btn-again').addEventListener('click', () => openSong(game.song));
$('btn-songs').addEventListener('click', () => show('songs'));
$('btn-mic-retry').addEventListener('click', () => { if (game) openSong(game.song); });
$('btn-mic-back').addEventListener('click', () => show('songs'));

document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

// ---------- debug: ?debug=1 ----------

const frameLog = [];
function debugLog(frame, suppressed) {
  frameLog.push({ ...frame, suppressed, key: heldKey });
  if (frameLog.length > 4000) frameLog.shift();
}
if (DEBUG) window.__frames = frameLog;

let fakeHeld = false;
function setFake(on) {
  fakeHeld = on;
  $('btn-fake').classList.toggle('on', on);
}

const DEBUG_KEYS = { a: 'DO', s: 'RE', r: 'RE#', d: 'MI', f: 'FA', v: 'FA#', g: 'SOL', h: 'LA', j: 'SI', k: "DO'" };
let heldKey = null;

function debugInfo(pitch, note, level) {
  const st = game.tracker.state();
  const target = game.items[st.index]?.name;
  $('debug').textContent = [
    `Hz     ${pitch ? pitch.freq.toFixed(1) : '-'}`,
    `note   ${note ?? '-'}   cents ${pitch ? freqToNote(pitch.freq, instrument.nameShift).cents.toFixed(0) : '-'}`,
    `rms    ${level.toFixed(3)}  gate ${game.gate.toFixed(3)}`,
    `target ${target}  phase ${st.phase}  hold ${(st.progress * 100).toFixed(0)}%`,
    `tempo  ${game.bpm ? Math.round(game.bpm) : '?'}  need ${game.tracker.required().toFixed(2)}s`,
    'keys   a s r d f v g h j k = DO RE RE# MI FA FA# SOL LA SI DO\'',
  ].join('\n');
}

if (DEBUG) {
  const fakeBtn = $('btn-fake');
  fakeBtn.hidden = false;
  fakeBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); fakeBtn.setPointerCapture(e.pointerId); setFake(true); });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((type) => fakeBtn.addEventListener(type, () => setFake(false)));
  window.addEventListener('keydown', (e) => {
    if (e.code !== 'Space' || screen !== 'play') return;
    e.preventDefault();
    setFake(true);
  });
  window.addEventListener('keyup', (e) => {
    if (e.code !== 'Space' || screen !== 'play') return;
    e.preventDefault();
    setFake(false);
  });
  $('debug').hidden = false;
  $('debug').textContent = 'debug: start a song, then hold a s r d f v g h j k';
  window.addEventListener('keydown', (e) => {
    const note = DEBUG_KEYS[e.key];
    if (!note || !synth || e.repeat || heldKey) return;
    heldKey = e.key;
    synth.play(NOTES[note].freq * instrument.synthShift);
  });
  window.addEventListener('keyup', (e) => {
    if (e.key !== heldKey) return;
    heldKey = null;
    synth?.stop();
  });
}

// ---------- boot ----------

setLang(pickLang(storage.getLang(), navigator.language));
show(!name ? 'welcome' : instrument ? 'songs' : 'instrument');
