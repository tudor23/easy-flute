export function createAudioContext() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  return new Ctx();
}

export function createAnalyser(ctx) {
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 2048;
  return analyser;
}

// Noise suppression and auto gain distort long steady tones, so they're off.
// Echo cancellation stays on to keep the metronome clicks out of the input.
const CONSTRAINTS = { audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: false } };

export async function openMic(ctx, analyser) {
  if (!navigator.mediaDevices?.getUserMedia) {
    const err = new Error('getUserMedia unavailable');
    err.code = 'insecure';
    throw err;
  }
  const stream = await navigator.mediaDevices.getUserMedia(CONSTRAINTS);
  const source = ctx.createMediaStreamSource(stream);
  source.connect(analyser);
  return {
    stop() {
      source.disconnect();
      stream.getTracks().forEach((track) => track.stop());
    },
  };
}

// ?debug=1 only: a sine tone fed straight into the detector (and quietly to the speakers),
// so the game can be played from the keyboard without a recorder.
export function createDebugSynth(ctx, analyser) {
  let osc = null;
  return {
    play(freq) {
      this.stop();
      osc = ctx.createOscillator();
      osc.frequency.value = freq;
      const toDetector = ctx.createGain();
      toDetector.gain.value = 0.3;
      const toSpeakers = ctx.createGain();
      toSpeakers.gain.value = 0.04;
      osc.connect(toDetector).connect(analyser);
      osc.connect(toSpeakers).connect(ctx.destination);
      osc.start();
    },
    stop() {
      osc?.stop();
      osc = null;
    },
  };
}
