// To add a language: copy es.js to <code>.js, translate the strings, and list it here.
import es from './es.js';
import en from './en.js';
import ca from './ca.js';

// The first one is the base: its keys are the full set, and it fills any gaps.
export const LANGUAGES = [es, en, ca];

const byCode = Object.fromEntries(LANGUAGES.map((l) => [l.code, l]));

// Order of the buttons at the top.
export const MENU = ['en', 'es', 'ca'].map((code) => byCode[code]);
let current = LANGUAGES[0];

export function setLang(code) {
  current = byCode[code] ?? LANGUAGES[0];
  return current.code;
}

export const getLang = () => current.code;

export function t(key, vars = {}) {
  const s = current.strings[key] ?? LANGUAGES[0].strings[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

export function pickLang(saved, navigatorLang = '') {
  if (byCode[saved]) return saved;
  const base = String(navigatorLang).slice(0, 2).toLowerCase();
  return byCode[base] ? base : LANGUAGES[0].code;
}
