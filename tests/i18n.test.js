import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LANGUAGES, MENU, t, setLang, getLang, pickLang } from '../js/i18n/index.js';

const [base] = LANGUAGES;

test('Spanish is the base language', () => {
  assert.equal(base.code, 'es');
});

for (const lang of LANGUAGES) {
  test(`${lang.code} has exactly the same keys as ${base.code}`, () => {
    assert.deepEqual(Object.keys(lang.strings).sort(), Object.keys(base.strings).sort());
  });

  test(`${lang.code} keeps the same {placeholders}`, () => {
    const vars = (s) => (s.match(/\{\w+\}/g) || []).sort();
    for (const [k, v] of Object.entries(base.strings)) assert.deepEqual(vars(lang.strings[k]), vars(v), k);
  });
}

test('t() interpolates variables and follows setLang', () => {
  setLang('es');
  assert.equal(t('songs.hello', { name: 'Vlad' }), '¡Hola, Vlad!');
  setLang('en');
  assert.equal(getLang(), 'en');
  assert.equal(t('songs.hello', { name: 'Vlad' }), 'Hi, Vlad!');
  setLang('es');
});

test('language buttons read EN, ES, CA', () => {
  assert.deepEqual(MENU.map((l) => l.name), ['EN', 'ES', 'CA']);
});

test('Catalan is available', () => {
  setLang('ca');
  assert.equal(t('songs.hello', { name: 'Vlad' }), 'Hola, Vlad!');
  assert.equal(pickLang(null, 'ca-ES'), 'ca');
  setLang('es');
});

test('unknown keys come back as the key', () => {
  assert.equal(t('nope.missing'), 'nope.missing');
});

test('pickLang prefers the saved language, then the browser, then Spanish', () => {
  assert.equal(pickLang('en', 'es-ES'), 'en');
  assert.equal(pickLang(null, 'en-GB'), 'en');
  assert.equal(pickLang(null, 'ro-RO'), 'es');
  assert.equal(pickLang('xx', undefined), 'es');
});
