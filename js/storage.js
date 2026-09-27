const PREFIX = 'easyFlute.';

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
    getTempo(songId) {
      const bpm = Number(get(`tempo.${songId}`));
      return Number.isFinite(bpm) && bpm > 0 ? bpm : null;
    },
    setTempo: (songId, bpm) => set(`tempo.${songId}`, Math.round(bpm)),
    clearTempo: (songId) => set(`tempo.${songId}`, null),
  };
}
