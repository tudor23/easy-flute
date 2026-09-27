// To add an instrument: create a file next to this one (see flute.js) and list it here.
import flute from './flute.js';
import piano from './piano.js';

export const INSTRUMENTS = [flute, piano];
export const instrumentById = (id) => INSTRUMENTS.find((i) => i.id === id) ?? null;
