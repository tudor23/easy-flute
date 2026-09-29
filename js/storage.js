const PREFIX = 'easyFlute.';

// The flute keeps its original key so tempos saved before piano mode still work.
const tempoKey = (songId, instrument) => (instrument === 'flute' ? `tempo.${songId}` : `tempo.${instrument}.${songId}`);

function defaultBackend() {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

// Remembers things on this device. If storage is blocked (private mode etc.) the app
// still works; it just forgets between visits.
export function createStorage(backend = defaultBackend()) {
  const get = (key) => {
    try {
      return backend?.getItem(PREFIX + key) ?? null;
    } catch {
      return null;
    }
  };
  const set = (key, value) => {
    try {
      if (value === null || value === undefined) backend?.removeItem(PREFIX + key);
      else backend?.setItem(PREFIX + key, String(value));
    } catch {
      // ignore: nothing we can do
    }
  };

  return {
    getName: () => get('name'),
    setName: (name) => set('name', name),
    getLang: () => get('lang'),
    setLang: (code) => set('lang', code),
    getExam: () => get('exam') === '1',
    setExam: (on) => set('exam', on ? '1' : null),
    getInstrument: () => get('instrument'),
    setInstrument: (id) => set('instrument', id),
    getTempo(songId, instrument = 'flute') {
      const bpm = Number(get(tempoKey(songId, instrument)));
      return Number.isFinite(bpm) && bpm > 0 ? bpm : null;
    },
    setTempo: (songId, bpm, instrument = 'flute') => set(tempoKey(songId, instrument), Math.round(bpm)),
    clearTempo: (songId, instrument = 'flute') => set(tempoKey(songId, instrument), null),
  };
}
