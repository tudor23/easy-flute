import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStorage } from '../js/storage.js';

function memoryBackend() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    map: m,
  };
}

test('stores name, language and tempo per song under easyFlute.*', () => {
  const b = memoryBackend();
  const s = createStorage(b);
  s.setName('Vlad');
  s.setLang('en');
  s.setTempo('limu-limu-lima', 72);
  assert.equal(s.getName(), 'Vlad');
  assert.equal(s.getLang(), 'en');
  assert.equal(s.getTempo('limu-limu-lima'), 72);
  assert.equal(s.getTempo('other'), null);
  assert.deepEqual([...b.map.keys()].sort(), ['easyFlute.lang', 'easyFlute.name', 'easyFlute.tempo.limu-limu-lima']);
});

test('clearTempo forgets the tempo', () => {
  const s = createStorage(memoryBackend());
  s.setTempo('x', 80);
  s.clearTempo('x');
  assert.equal(s.getTempo('x'), null);
});

test('a throwing backend never breaks the app', () => {
  const boom = () => { throw new Error('blocked'); };
  const s = createStorage({ getItem: boom, setItem: boom, removeItem: boom });
  s.setName('Vlad');
  assert.equal(s.getName(), null);
  assert.equal(s.getTempo('x'), null);
});

test('no backend at all is fine', () => {
  const s = createStorage(null);
  s.setName('Vlad');
  assert.equal(s.getName(), null);
});
