const LOOKAHEAD = 0.12;     // schedule clicks this far ahead (s)
const TICK_MS = 25;
const CLICK_SECONDS = 0.015;
// The mic hears a click a little after it is scheduled (output + input latency, plus the
// 2048-sample analysis window), so detection is ignored for a while after each one.
const SUPPRESS_SECONDS = 0.12;
const SUPPRESS_BEFORE = 0.05;  // start a little early so the last reading kept is from before the click

function makeClickBuffer(ctx) {
  const length = Math.floor(ctx.sampleRate * CLICK_SECONDS);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (length / 5));
  return buffer;
}

export function createMetronome(ctx) {
  const clickBuffer = makeClickBuffer(ctx);
  let timer = null;
  let beatSeconds = 1;
  let beatsPerBar = 2;
  let nextTime = 0;
  let beatIndex = 0;
  let muted = false;
  let clicks = [];

  function playClick(time, accent) {
    const src = ctx.createBufferSource();
    src.buffer = clickBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = accent ? 2400 : 1800;
    const gain = ctx.createGain();
    gain.gain.value = accent ? 0.9 : 0.45;
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start(time);
  }

  function schedule() {
    while (nextTime < ctx.currentTime + LOOKAHEAD) {
      if (!muted) playClick(nextTime, beatIndex % beatsPerBar === 0);
      clicks.push({ t: nextTime, n: beatIndex, audible: !muted });
      beatIndex++;
      nextTime += beatSeconds;
    }
    const cutoff = ctx.currentTime - 2;
    clicks = clicks.filter((c) => c.t > cutoff);
  }

  return {
    start(bpm, perBar = 2) {
      this.stop();
      beatSeconds = 60 / bpm;
      beatsPerBar = perBar;
      nextTime = ctx.currentTime + 0.1;
      beatIndex = 0;
      schedule();
      timer = setInterval(schedule, TICK_MS);
    },
    stop() {
      clearInterval(timer);
      timer = null;
      clicks = [];
    },
    running: () => timer !== null,
    setMuted(value) { muted = value; },
    isMuted: () => muted,
    isSuppressed: (t) => clicks.some((c) => c.audible && t >= c.t - SUPPRESS_BEFORE && t < c.t + SUPPRESS_SECONDS),
    // Which beat of the bar we're on at time t, and how long ago it sounded.
    beatInfo(t) {
      let last = null;
      for (const c of clicks) if (c.t <= t) last = c;
      return last && { beatInBar: last.n % beatsPerBar, beat: last.n, since: t - last.t };
    },
  };
}
