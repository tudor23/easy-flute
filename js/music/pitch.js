export function rms(buf) {
  let sum = 0;
  for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
  return Math.sqrt(sum / buf.length);
}

// YIN pitch detection (de Cheveigné & Kawahara, 2002), with the lag search limited
// to the soprano recorder's range so it stays cheap enough to run every frame.
export function detectPitch(buf, sampleRate, { minFreq = 450, maxFreq = 1900, threshold = 0.15, gate = 0.01 } = {}) {
  const level = rms(buf);
  if (level < gate) return null;

  const tauMin = Math.max(2, Math.floor(sampleRate / maxFreq));
  const tauMax = Math.ceil(sampleRate / minFreq);
  const w = buf.length - tauMax - 1;
  if (w <= 0) return null;

  const cmnd = new Float32Array(tauMax + 2);
  cmnd[0] = 1;
  let running = 0;
  for (let tau = 1; tau <= tauMax + 1; tau++) {
    let d = 0;
    for (let j = 0; j < w; j++) {
      const diff = buf[j] - buf[j + tau];
      d += diff * diff;
    }
    running += d;
    cmnd[tau] = running === 0 ? 1 : (d * tau) / running;
  }

  let tau = -1;
  for (let t = tauMin; t <= tauMax; t++) {
    if (cmnd[t] < threshold) {
      while (t + 1 <= tauMax && cmnd[t + 1] < cmnd[t]) t++;
      tau = t;
      break;
    }
  }
  if (tau < 0) return null;

  const a = cmnd[tau - 1], b = cmnd[tau], c = cmnd[tau + 1];
  const denom = a - 2 * b + c;
  const shift = denom === 0 ? 0 : (a - c) / (2 * denom);
  return { freq: sampleRate / (tau + shift), clarity: 1 - b, rms: level };
}
